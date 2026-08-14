const fs = require('fs');

let serverCode = fs.readFileSync('server.js', 'utf8');

// تعديل استعلام جلب المنيو ليشمل الصور
serverCode = serverCode.replace(
  "SELECT id, name, description, price, preparation_time FROM menu_items",
  "SELECT id, name, description, price, preparation_time, image_url FROM menu_items"
);

fs.writeFileSync('server.js', serverCode);
console.log('✅ تم تعديل server.js');
