const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/restaurant_saas'
});

client.connect()
  .then(() => console.log('✅ تم الاتصال بقاعدة البيانات'))
  .catch(err => console.error('❌ فشل الاتصال:', err));

module.exports = client;
