require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const { Server } = require('socket.io');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();
const server = http.createServer(app);

// إعداد Socket.io
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PATCH", "DELETE"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// ============ Socket.io Logic ============
io.on('connection', (socket) => {
  console.log(`🔌 عميل متصل: ${socket.id}`);

  socket.on('join-restaurant', (data) => {
    const { restaurantId, role } = data;
    if (!restaurantId) return;
    
    const roomName = `restaurant:${restaurantId}`;
    socket.join(roomName);
    socket.data.restaurantId = restaurantId;
    socket.data.role = role;
    
    console.log(`👤 العميل ${socket.id} انضم للغرفة ${roomName} كـ ${role}`);
    socket.emit('joined-room', { 
      restaurantId, 
      message: 'تم الانضمام بنجاح' 
    });
  });

  socket.on('call-waiter', (data) => {
    const { restaurantId, tableId, message } = data;
    const roomName = `restaurant:${restaurantId}`;
    
    io.to(roomName).emit('waiter-called', {
      tableId,
      message: message || 'طلب مساعدة',
      timestamp: new Date(),
      socketId: socket.id
    });
  });

  socket.on('disconnect', () => {
    console.log(`🔌 عميل منفصل: ${socket.id}`);
  });
});

// دالة إرسال الطلبات
function emitNewOrder(restaurantId, order) {
  const roomName = `restaurant:${restaurantId}`;
  io.to(roomName).emit('order-received', {
    order,
    timestamp: new Date()
  });
}

// دالة تحديث حالة الطلب
function emitOrderStatusUpdate(restaurantId, orderId, status) {
  const roomName = `restaurant:${restaurantId}`;
  io.to(roomName).emit('order-status-updated', {
    orderId,
    status,
    updatedAt: new Date()
  });
}

// ============ API Routes ============

// الصفحة الرئيسية
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// فحص الصحة
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// الحصول على قائمة المطاعم
app.get('/api/restaurants', async (req, res) => {
  try {
    const restaurants = await prisma.restaurant.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        address: true,
        phone: true
      }
    });
    res.json({ success: true, data: restaurants });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// جلب المنيو
app.get('/api/menu/restaurant/:restaurantId', async (req, res) => {
  try {
    const { restaurantId } = req.params;
    
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      include: {
        categories: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
          include: {
            menuItems: {
              where: { isAvailable: true },
              select: {
                id: true,
                name: true,
                description: true,
                price: true,
                preparationTime: true
              }
            }
          }
        }
      }
    });

    if (!restaurant) {
      return res.status(404).json({ 
        success: false, 
        message: 'المطعم غير موجود' 
      });
    }

    res.json({ success: true, data: restaurant });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// جلب المنيو عبر QR
app.get('/api/menu/qr/:qrCode', async (req, res) => {
  try {
    const { qrCode } = req.params;
    
    const table = await prisma.table.findUnique({
      where: { qrCode },
      include: {
        restaurant: {
          include: {
            categories: {
              where: { isActive: true },
              include: {
                menuItems: {
                  where: { isAvailable: true }
                }
              }
            }
          }
        }
      }
    });

    if (!table) {
      return res.status(404).json({ 
        success: false, 
        message: 'QR code غير صالح' 
      });
    }

    res.json({ success: true, data: table });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// إنشاء طلب
app.post('/api/orders', async (req, res) => {
  try {
    const { restaurantId, tableId, items, customerNote } = req.body;

    if (!restaurantId) {
      return res.status(400).json({ 
        success: false, 
        message: 'معرف المطعم مطلوب' 
      });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'يجب إضافة أصناف للطلب' 
      });
    }

    // حساب الإجمالي
    let totalAmount = 0;
    const orderItemsData = [];

    for (const item of items) {
      const menuItem = await prisma.menuItem.findFirst({
        where: { 
          id: item.menuItemId, 
          restaurantId,
          isAvailable: true 
        }
      });

      if (!menuItem) {
        return res.status(400).json({ 
          success: false, 
          message: `الصنف ${item.menuItemId} غير متوفر` 
        });
      }

      totalAmount += menuItem.price * item.quantity;
      orderItemsData.push({
        menuItemId: menuItem.id,
        quantity: item.quantity,
        price: menuItem.price,
        notes: item.notes || null
      });
    }

    // رقم الطلب
    const lastOrder = await prisma.order.findFirst({
      where: { restaurantId },
      orderBy: { orderNumber: 'desc' }
    });

    const orderNumber = lastOrder ? lastOrder.orderNumber + 1 : 1;

    // إنشاء الطلب
    const order = await prisma.order.create({
      data: {
        restaurantId,
        tableId: tableId || null,
        orderNumber,
        customerNote: customerNote || null,
        totalAmount,
        status: 'PENDING',
        orderItems: { create: orderItemsData }
      },
      include: {
        orderItems: {
          include: {
            menuItem: { select: { name: true } }
          }
        },
        table: { select: { tableNumber: true } }
      }
    });

    // إرسال عبر Socket.io
    emitNewOrder(restaurantId, order);

    res.status(201).json({ 
      success: true, 
      data: order,
      message: `تم إرسال الطلب #${orderNumber} بنجاح` 
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// تحديث حالة الطلب
app.patch('/api/orders/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, restaurantId } = req.body;

    const validStatuses = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'حالة الطلب غير صالحة' 
      });
    }

    const order = await prisma.order.update({
      where: { id: orderId },
      data: { status }
    });

    // إرسال التحديث عبر Socket.io
    if (restaurantId) {
      emitOrderStatusUpdate(restaurantId, orderId, status);
    }

    res.json({ 
      success: true, 
      data: order,
      message: 'تم تحديث حالة الطلب' 
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// جلب الطلبات النشطة
app.get('/api/orders/active/:restaurantId', async (req, res) => {
  try {
    const { restaurantId } = req.params;
    
    const orders = await prisma.order.findMany({
      where: {
        restaurantId,
        status: { in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'] }
      },
      include: {
        orderItems: {
          include: {
            menuItem: { select: { name: true } }
          }
        },
        table: { select: { tableNumber: true } }
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// جلب جميع الطلبات
app.get('/api/orders/all/:restaurantId', async (req, res) => {
  try {
    const { restaurantId } = req.params;
    
    const orders = await prisma.order.findMany({
      where: { restaurantId },
      include: {
        orderItems: {
          include: {
            menuItem: { select: { name: true } }
          }
        },
        table: { select: { tableNumber: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// إنشاء طاولة
app.post('/api/tables', async (req, res) => {
  try {
    const { restaurantId, tableNumber } = req.body;
    
    if (!restaurantId || !tableNumber) {
      return res.status(400).json({ 
        success: false, 
        message: 'معرف المطعم ورقم الطاولة مطلوبان' 
      });
    }

    const qrCode = `QR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const table = await prisma.table.create({
      data: { restaurantId, tableNumber, qrCode }
    });

    res.status(201).json({ success: true, data: table });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, async () => {
  console.log(`🚀 الخادم يعمل على المنفذ ${PORT}`);
  
  try {
    await prisma.$connect();
    console.log('✅ تم الاتصال بقاعدة البيانات');
  } catch (error) {
    console.error('❌ فشل الاتصال بقاعدة البيانات:', error);
  }
});
