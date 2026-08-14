require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const { Server } = require('socket.io');
const { Client } = require('pg');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);

// إعداد قاعدة البيانات
const db = new Client({
  host: 'localhost',
  port: 5432,
  database: 'restaurant_saas',
  user: 'u0_a209'
});

db.connect().catch(err => console.error('DB Error:', err));

// إعداد Socket.io
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST", "PATCH"] }
});

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

io.on('connection', (socket) => {
  console.log(`عميل متصل: ${socket.id}`);
  
  socket.on('join-restaurant', (data) => {
    const { restaurantId, role } = data;
    if (!restaurantId) return;
    const roomName = `restaurant:${restaurantId}`;
    socket.join(roomName);
    socket.emit('joined-room', { restaurantId, message: 'تم الانضمام بنجاح' });
  });
  
  socket.on('disconnect', () => {
    console.log(`عميل منفصل: ${socket.id}`);
  });
});

function emitNewOrder(restaurantId, order) {
  io.to(`restaurant:${restaurantId}`).emit('order-received', { order, timestamp: new Date() });
}

function emitOrderStatusUpdate(restaurantId, orderId, status) {
  io.to(`restaurant:${restaurantId}`).emit('order-status-updated', { orderId, status });
}

// الصفحة الرئيسية
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// فحص الصحة
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// جلب المنيو
app.get('/api/menu/restaurant/:restaurantId', async (req, res) => {
  try {
    const { restaurantId } = req.params;
    
    const restaurant = await db.query('SELECT * FROM restaurants WHERE id = $1', [restaurantId]);
    if (restaurant.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'المطعم غير موجود' });
    }
    
    const categories = await db.query(
      'SELECT * FROM categories WHERE restaurant_id = $1 AND is_active = true ORDER BY display_order',
      [restaurantId]
    );
    
    const menu = [];
    for (const cat of categories.rows) {
      const items = await db.query(
        'SELECT id, name, description, price, preparation_time, image_url FROM menu_items WHERE category_id = $1 AND is_available = true',
        [cat.id]
      );
      menu.push({
        ...cat,
        menuItems: items.rows
      });
    }
    
    res.json({ success: true, data: { ...restaurant.rows[0], categories: menu } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// إنشاء طلب
app.post('/api/orders', async (req, res) => {
  try {
    const { restaurantId, tableId, items, customerNote } = req.body;
    
    if (!restaurantId) return res.status(400).json({ success: false, message: 'معرف المطعم مطلوب' });
    if (!items || items.length === 0) return res.status(400).json({ success: false, message: 'يجب إضافة أصناف' });
    
    let totalAmount = 0;
    const orderItemsData = [];
    
    for (const item of items) {
      const menuItem = await db.query(
        'SELECT * FROM menu_items WHERE id = $1 AND restaurant_id = $2 AND is_available = true',
        [item.menuItemId, restaurantId]
      );
      if (menuItem.rows.length === 0) {
        return res.status(400).json({ success: false, message: 'الصنف غير متوفر' });
      }
      totalAmount += menuItem.rows[0].price * item.quantity;
      orderItemsData.push({ ...menuItem.rows[0], quantity: item.quantity, notes: item.notes });
    }
    
    const lastOrder = await db.query(
      'SELECT order_number FROM orders WHERE restaurant_id = $1 ORDER BY order_number DESC LIMIT 1',
      [restaurantId]
    );
    const orderNumber = lastOrder.rows.length > 0 ? lastOrder.rows[0].order_number + 1 : 1;
    
    const orderId = crypto.randomUUID();
    await db.query(
      'INSERT INTO orders (id, restaurant_id, table_id, order_number, status, customer_note, total_amount) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [orderId, restaurantId, tableId, orderNumber, 'PENDING', customerNote, totalAmount]
    );
    
    for (const item of orderItemsData) {
      await db.query(
        'INSERT INTO order_items (id, order_id, menu_item_id, quantity, price, notes) VALUES ($1, $2, $3, $4, $5, $6)',
        [crypto.randomUUID(), orderId, item.id, item.quantity, item.price, item.notes]
      );
    }
    
    const order = { id: orderId, restaurantId, tableId, orderNumber, status: 'PENDING', customerNote, totalAmount };
    emitNewOrder(restaurantId, order);
    
    res.status(201).json({ success: true, data: order, message: `تم إرسال الطلب #${orderNumber} بنجاح` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// جلب الطلبات النشطة
app.get('/api/orders/active/:restaurantId', async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const orders = await db.query(
      "SELECT * FROM orders WHERE restaurant_id = $1 AND status IN ('PENDING', 'CONFIRMED', 'PREPARING', 'READY') ORDER BY created_at",
      [restaurantId]
    );
    
    for (const order of orders.rows) {
      const items = await db.query(
        'SELECT oi.*, mi.name as item_name FROM order_items oi JOIN menu_items mi ON oi.menu_item_id = mi.id WHERE oi.order_id = $1',
        [order.id]
      );
      order.items = items.rows;
    }
    
    res.json({ success: true, data: orders.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// تحديث حالة الطلب
app.patch('/api/orders/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, restaurantId } = req.body;
    
    await db.query('UPDATE orders SET status = $1 WHERE id = $2', [status, orderId]);
    
    if (restaurantId) {
      emitOrderStatusUpdate(restaurantId, orderId, status);
    }
    
    res.json({ success: true, message: 'تم تحديث حالة الطلب' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


// ============ Admin API ============

// تسجيل الدخول
app.post('/api/admin/login', async (req, res) => {
  try {
    const { restaurantId, username, password } = req.body;
    const result = await db.query('SELECT * FROM staff WHERE restaurant_id = $1 AND username = $2 AND password = $3', [restaurantId, username, password]);
    if (result.rows.length > 0) {
      res.json({ success: true, data: result.rows[0] });
    } else {
      res.status(401).json({ success: false, message: 'بيانات خاطئة' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// إحصائيات
app.get('/api/admin/stats/:restaurantId', async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const totalOrders = await db.query('SELECT COUNT(*) FROM orders WHERE restaurant_id = $1', [restaurantId]);
    const activeOrders = await db.query("SELECT COUNT(*) FROM orders WHERE restaurant_id = $1 AND status IN ('PENDING','PREPARING','READY')", [restaurantId]);
    const revenue = await db.query("SELECT COALESCE(SUM(total_amount),0) FROM orders WHERE restaurant_id = $1 AND status = 'DELIVERED'", [restaurantId]);
    const items = await db.query('SELECT COUNT(*) FROM menu_items WHERE restaurant_id = $1', [restaurantId]);
    
    res.json({ success: true, data: {
      totalOrders: totalOrders.rows[0].count,
      activeOrders: activeOrders.rows[0].count,
      totalRevenue: revenue.rows[0].sum,
      totalItems: items.rows[0].count
    }});
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// إضافة صنف
app.post('/api/admin/menu-items', async (req, res) => {
  try {
    const { restaurantId, categoryId, name, desc, price, time } = req.body;
    const crypto = require('crypto');
    const id = crypto.randomUUID();
    await db.query('INSERT INTO menu_items (id, restaurant_id, category_id, name, description, price, preparation_time) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [id, restaurantId, categoryId, name, desc, price, time]);
    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// حذف صنف
app.delete('/api/admin/menu-items/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM menu_items WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// جلب الطاولات
app.get('/api/admin/tables/:restaurantId', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM tables WHERE restaurant_id = $1', [req.params.restaurantId]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// إضافة طاولة
app.post('/api/admin/tables', async (req, res) => {
  try {
    const { restaurantId, tableNumber } = req.body;
    const crypto = require('crypto');
    const id = crypto.randomUUID();
    const qrCode = crypto.randomUUID();
    await db.query('INSERT INTO tables (id, restaurant_id, table_number, qr_code) VALUES ($1,$2,$3,$4)',
      [id, restaurantId, tableNumber, qrCode]);
    res.json({ success: true, data: { id, qrCode } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// جلب جميع الطلبات
app.get('/api/orders/all/:restaurantId', async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const orders = await db.query('SELECT * FROM orders WHERE restaurant_id = $1 ORDER BY created_at DESC', [restaurantId]);
    for (const order of orders.rows) {
      const items = await db.query('SELECT oi.*, mi.name as item_name FROM order_items oi JOIN menu_items mi ON oi.menu_item_id = mi.id WHERE oi.order_id = $1', [order.id]);
      order.items = items.rows;
    }
    res.json({ success: true, data: orders.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 الخادم يعمل على http://localhost:${PORT}`);
});
