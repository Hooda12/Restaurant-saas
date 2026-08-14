const fs = require('fs');

const adminRoutes = `
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
`;

// قراءة server.js وإضافة المسارات قبل السطر الأخير
let serverCode = fs.readFileSync('server.js', 'utf8');
serverCode = serverCode.replace('const PORT = process.env.PORT || 3000;', adminRoutes + '\nconst PORT = process.env.PORT || 3000;');
fs.writeFileSync('server.js', serverCode);
console.log('✅ تم تحديث server.js');
