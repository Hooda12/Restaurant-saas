const { Client } = require('pg');
const crypto = require('crypto');

const client = new Client({
  host: 'localhost', port: 5432, database: 'restaurant_saas', user: 'u0_a209'
});

function generateId() { return crypto.randomUUID(); }

async function updateMenu() {
  await client.connect();
  
  const restaurantId = 'd9c7b322-9971-43d9-93a0-93b852206aa3';
  
  // تحديث اسم المطعم
  await client.query("UPDATE restaurants SET name = 'أكلات ماما' WHERE id = $1", [restaurantId]);
  
  // حذف الأصناف القديمة
  await client.query('DELETE FROM order_items');
  await client.query('DELETE FROM orders');
  await client.query('DELETE FROM menu_items');
  await client.query('DELETE FROM categories');
  
  // إنشاء أقسام جديدة
  const categories = [
    { name: '🍳 فطار ماما', order: 1 },
    { name: '🥗 مقبلات', order: 2 },
    { name: '🍖 أطباق رئيسية', order: 3 },
    { name: '🍰 حلويات', order: 4 },
    { name: '🥤 مشروبات', order: 5 },
    { name: '👶 وجبات أطفال', order: 6 }
  ];
  
  const catIds = {};
  for (const cat of categories) {
    const id = generateId();
    catIds[cat.name] = id;
    await client.query('INSERT INTO categories (id, restaurant_id, name, display_order) VALUES ($1, $2, $3, $4)',
      [id, restaurantId, cat.name, cat.order]);
  }
  
  // أصناف كثيرة
  const items = [
    // فطار
    { cat: '🍳 فطار ماما', name: 'طبق فول ماما', desc: 'فول مدمس بزيت الزيتون والليمون', price: 12, time: 5 },
    { cat: '🍳 فطار ماما', name: 'بيض بالبسطرمة', desc: 'بيض مقلي مع بسطرمة وجبنة', price: 18, time: 10 },
    { cat: '🍳 فطار ماما', name: 'جبنة بالطماطم', desc: 'جبنة بيضاء مع طماطم وخيار', price: 10, time: 3 },
    { cat: '🍳 فطار ماما', name: 'عسل بالطحينة', desc: 'طحينة بالعسل الأسود', price: 8, time: 2 },
    // مقبلات
    { cat: '🥗 مقبلات', name: 'حمص باللحمة', desc: 'حمص مع قطع لحم مقلية', price: 22, time: 8 },
    { cat: '🥗 مقبلات', name: 'متبل باذنجان', desc: 'باذنجان مشوي مع طحينة', price: 15, time: 7 },
    { cat: '🥗 مقبلات', name: 'ورق عنب', desc: 'ورق عنب محشي بالأرز', price: 20, time: 12 },
    { cat: '🥗 مقبلات', name: 'سلطة فتوش', desc: 'خضار طازجة مع خبز محمص', price: 14, time: 5 },
    { cat: '🥗 مقبلات', name: 'كبة مقلية', desc: 'كبة لحم مع صنوبر', price: 24, time: 15 },
    { cat: '🥗 مقبلات', name: 'سمبوسك', desc: 'سمبوسك بالجبنة أو اللحم', price: 16, time: 10 },
    // أطباق رئيسية
    { cat: '🍖 أطباق رئيسية', name: 'كبسة لحم', desc: 'أرز كبسة مع لحم ضأن', price: 45, time: 25 },
    { cat: '🍖 أطباق رئيسية', name: 'مندي دجاج', desc: 'دجاج مندي مع أرز', price: 38, time: 22 },
    { cat: '🍖 أطباق رئيسية', name: 'مشاوي مشكلة', desc: 'تشكيلة لحوم مشوية', price: 65, time: 28 },
    { cat: '🍖 أطباق رئيسية', name: 'شاورما عربي', desc: 'شاورما لحم مع ثومية', price: 25, time: 10 },
    { cat: '🍖 أطباق رئيسية', name: 'مكرونة بشاميل', desc: 'مكرونة بالبشاميل واللحمة', price: 30, time: 18 },
    { cat: '🍖 أطباق رئيسية', name: 'ملوخية بالدجاج', desc: 'ملوخية خضراء مع دجاج', price: 28, time: 15 },
    // حلويات
    { cat: '🍰 حلويات', name: 'كنافة ماما', desc: 'كنافة بالقشطة والقطر', price: 20, time: 10 },
    { cat: '🍰 حلويات', name: 'أم علي', desc: 'أم علي بالمكسرات', price: 22, time: 12 },
    { cat: '🍰 حلويات', name: 'تشيز كيك', desc: 'تشيز كيك بالتوت', price: 24, time: 8 },
    { cat: '🍰 حلويات', name: 'بقلاوة', desc: 'بقلاوة بالفستق', price: 18, time: 5 },
    { cat: '🍰 حلويات', name: 'رز بلبن', desc: 'أرز باللبن والقرفة', price: 15, time: 6 },
    // مشروبات
    { cat: '🥤 مشروبات', name: 'عصير برتقال', desc: 'برتقال طازج 100%', price: 12, time: 3 },
    { cat: '🥤 مشروبات', name: 'عصير مانجو', desc: 'مانجو طازج', price: 14, time: 3 },
    { cat: '🥤 مشروبات', name: 'قهوة عربية', desc: 'قهوة بالهيل', price: 10, time: 5 },
    { cat: '🥤 مشروبات', name: 'شاي بالنعناع', desc: 'شاي طازج بالنعناع', price: 8, time: 3 },
    { cat: '🥤 مشروبات', name: 'موهيتو', desc: 'موهيتو ليمون', price: 15, time: 5 },
    // أطفال
    { cat: '👶 وجبات أطفال', name: 'برجر أطفال', desc: 'برجر صغير مع بطاطس', price: 20, time: 10 },
    { cat: '👶 وجبات أطفال', name: 'ناجتس', desc: 'قطع دجاج مع صوص', price: 18, time: 8 },
    { cat: '👶 وجبات أطفال', name: 'باستا أطفال', desc: 'مكرونة بصوص الطماطم', price: 16, time: 10 },
  ];
  
  for (const item of items) {
    await client.query(
      'INSERT INTO menu_items (id, restaurant_id, category_id, name, description, price, preparation_time) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [generateId(), restaurantId, catIds[item.cat], item.name, item.desc, item.price, item.time]
    );
  }
  
  console.log('✅ تم تحديث المنيو بنجاح!');
  console.log('✅ عدد الأصناف:', items.length);
  
  await client.end();
}

updateMenu().catch(e => { console.error(e); process.exit(1); });
