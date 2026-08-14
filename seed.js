const { Client } = require('pg');
const crypto = require('crypto');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'restaurant_saas',
  user: 'u0_a209'
});

function generateId() {
  return crypto.randomUUID();
}

async function seed() {
  await client.connect();
  
  // حذف البيانات القديمة
  await client.query('DELETE FROM order_items');
  await client.query('DELETE FROM orders');
  await client.query('DELETE FROM menu_items');
  await client.query('DELETE FROM categories');
  await client.query('DELETE FROM tables');
  await client.query('DELETE FROM restaurants');
  
  // إنشاء مطعم
  const restaurantId = generateId();
  await client.query(
    'INSERT INTO restaurants (id, name, slug, address, phone, email) VALUES ($1, $2, $3, $4, $5, $6)',
    [restaurantId, 'مطعم الذواقة', 'gourmet-restaurant', 'الرياض، المملكة العربية السعودية', '+966500000000', 'info@gourmet.com']
  );
  
  console.log('✅ تم إنشاء المطعم');
  console.log('📝 معرف المطعم:', restaurantId);
  
  // إنشاء أقسام
  const categories = [
    { name: 'المقبلات', order: 1 },
    { name: 'الأطباق الرئيسية', order: 2 },
    { name: 'الحلويات', order: 3 },
    { name: 'المشروبات', order: 4 }
  ];
  
  const categoryIds = {};
  
  for (const cat of categories) {
    const catId = generateId();
    categoryIds[cat.name] = catId;
    await client.query(
      'INSERT INTO categories (id, restaurant_id, name, display_order) VALUES ($1, $2, $3, $4)',
      [catId, restaurantId, cat.name, cat.order]
    );
  }
  
  console.log('✅ تم إنشاء الأقسام');
  
  // إنشاء الأصناف
  const menuItems = [
    { cat: 'المقبلات', name: 'حمص', desc: 'حمص مطحون مع زيت الزيتون', price: 15, time: 5 },
    { cat: 'المقبلات', name: 'متبل', desc: 'باذنجان مشوي مع الطحينة', price: 18, time: 7 },
    { cat: 'المقبلات', name: 'ورق عنب', desc: 'ورق عنب محشي بالأرز', price: 20, time: 10 },
    { cat: 'المقبلات', name: 'سلطة فتوش', desc: 'سلطة خضار طازجة مع خبز محمص', price: 16, time: 5 },
    { cat: 'الأطباق الرئيسية', name: 'كبسة لحم', desc: 'أرز مع لحم ضأن متبل', price: 45, time: 20 },
    { cat: 'الأطباق الرئيسية', name: 'مشاوي مشكلة', desc: 'تشكيلة مشاوي متنوعة', price: 65, time: 25 },
    { cat: 'الأطباق الرئيسية', name: 'شاورما عربي', desc: 'شاورما لحم مع صوص الثوم', price: 25, time: 10 },
    { cat: 'الأطباق الرئيسية', name: 'مندي دجاج', desc: 'دجاج مندي مع أرز', price: 38, time: 20 },
    { cat: 'الحلويات', name: 'كنافة', desc: 'كنافة بالقشطة والقطر', price: 20, time: 10 },
    { cat: 'الحلويات', name: 'أم علي', desc: 'حلوى أم علي بالمكسرات', price: 22, time: 12 },
    { cat: 'المشروبات', name: 'عصير برتقال', desc: 'عصير برتقال طبيعي', price: 12, time: 3 },
    { cat: 'المشروبات', name: 'قهوة عربية', desc: 'قهوة عربية بالهيل', price: 10, time: 5 }
  ];
  
  for (const item of menuItems) {
    const itemId = generateId();
    await client.query(
      'INSERT INTO menu_items (id, restaurant_id, category_id, name, description, price, preparation_time) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [itemId, restaurantId, categoryIds[item.cat], item.name, item.desc, item.price, item.time]
    );
  }
  
  console.log('✅ تم إنشاء الأصناف:', menuItems.length);
  
  // إنشاء طاولات
  for (let i = 1; i <= 5; i++) {
    const tableId = generateId();
    await client.query(
      'INSERT INTO tables (id, restaurant_id, table_number, qr_code) VALUES ($1, $2, $3, $4)',
      [tableId, restaurantId, `T${i}`, `QR-CODE-${i}`]
    );
  }
  
  console.log('✅ تم إنشاء 5 طاولات');
  console.log('✅ تم إدخال جميع البيانات بنجاح!');
  console.log('📝 معرف المطعم:', restaurantId);
  
  await client.end();
}

seed().catch(err => {
  console.error('❌ خطأ:', err.message);
  process.exit(1);
});
