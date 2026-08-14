const { Client } = require('pg');
const crypto = require('crypto');

const client = new Client({
  host: 'localhost', port: 5432, database: 'restaurant_saas', user: 'u0_a209'
});

async function updateDB() {
  await client.connect();
  
  // إضافة جدول الموظفين
  await client.query(`
    CREATE TABLE IF NOT EXISTS staff (
      id TEXT PRIMARY KEY,
      restaurant_id TEXT REFERENCES restaurants(id) ON DELETE CASCADE,
      username TEXT NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'staff',
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(restaurant_id, username)
    )
  `);
  
  // إضافة جدول الإعدادات
  await client.query(`
    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      restaurant_id TEXT REFERENCES restaurants(id) ON DELETE CASCADE,
      key TEXT NOT NULL,
      value TEXT,
      UNIQUE(restaurant_id, key)
    )
  `);
  
  // إضافة موظف تجريبي
  const restaurantId = 'd9c7b322-9971-43d9-93a0-93b852206aa3';
  await client.query(
    'INSERT INTO staff (id, restaurant_id, username, password, role) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING',
    [crypto.randomUUID(), restaurantId, 'admin', '123456', 'admin']
  );
  
  console.log('✅ تم تحديث قاعدة البيانات');
  console.log('👤 موظف تجريبي: admin / 123456');
  
  await client.end();
}

updateDB().catch(e => { console.error(e); process.exit(1); });
