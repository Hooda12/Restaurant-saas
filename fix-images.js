const fs = require('fs');

let html = fs.readFileSync('public/index.html', 'utf8');

// استبدال مصفوفة الصور العشوائية بصور من قاعدة البيانات
html = html.replace(
  /const foodImages = \[[\s\S]*?\];/,
  '// الصور هتيجي من قاعدة البيانات مباشرة'
);

// تعديل عرض الصور
html = html.replace(
  'const imageUrl = foodImages[(catIndex * 4 + itemIndex) % foodImages.length];',
  'const imageUrl = item.image_url || `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop`;'
);

fs.writeFileSync('public/index.html', html);
console.log('✅ تم تعديل الصفحة');
