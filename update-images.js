const { Client } = require('pg');

const client = new Client({
  host: 'localhost', port: 5432, database: 'restaurant_saas', user: 'u0_a209'
});

// صور حقيقية لكل صنف
const foodImages = {
  'طبق فول ماما': 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&h=300&fit=crop',
  'بيض بالبسطرمة': 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&h=300&fit=crop',
  'جبنة بالطماطم': 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400&h=300&fit=crop',
  'عسل بالطحينة': 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&h=300&fit=crop',
  'حمص باللحمة': 'https://images.unsplash.com/photo-1577805947697-89e18249d767?w=400&h=300&fit=crop',
  'متبل باذنجان': 'https://images.unsplash.com/photo-1590868309235-ea34bed7bd7f?w=400&h=300&fit=crop',
  'ورق عنب': 'https://images.unsplash.com/photo-1562007908-17c67e878c88?w=400&h=300&fit=crop',
  'سلطة فتوش': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop',
  'كبة مقلية': 'https://images.unsplash.com/photo-1590412200988-a436970781fa?w=400&h=300&fit=crop',
  'سمبوسك': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&h=300&fit=crop',
  'كبسة لحم': 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&h=300&fit=crop',
  'مندي دجاج': 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400&h=300&fit=crop',
  'مشاوي مشكلة': 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop',
  'شاورما عربي': 'https://images.unsplash.com/photo-1561651823-34feb02250e4?w=400&h=300&fit=crop',
  'مكرونة بشاميل': 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=400&h=300&fit=crop',
  'ملوخية بالدجاج': 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=400&h=300&fit=crop',
  'كنافة ماما': 'https://images.unsplash.com/photo-1577996275483-7f1bcd6c6b4b?w=400&h=300&fit=crop',
  'أم علي': 'https://images.unsplash.com/photo-1542124948-dc391252a940?w=400&h=300&fit=crop',
  'تشيز كيك': 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=400&h=300&fit=crop',
  'بقلاوة': 'https://images.unsplash.com/photo-1519676867240-f03562e64548?w=400&h=300&fit=crop',
  'رز بلبن': 'https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?w=400&h=300&fit=crop',
  'عصير برتقال': 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&h=300&fit=crop',
  'عصير مانجو': 'https://images.unsplash.com/photo-1546173159-315724a31696?w=400&h=300&fit=crop',
  'قهوة عربية': 'https://images.unsplash.com/photo-1504630083234-14187a9df0f5?w=400&h=300&fit=crop',
  'شاي بالنعناع': 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=400&h=300&fit=crop',
  'موهيتو': 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=400&h=300&fit=crop',
  'برجر أطفال': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop',
  'ناجتس': 'https://images.unsplash.com/photo-1562967914-608f82629710?w=400&h=300&fit=crop',
  'باستا أطفال': 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=400&h=300&fit=crop'
};

async function updateImages() {
  await client.connect();
  
  for (const [itemName, imageUrl] of Object.entries(foodImages)) {
    await client.query(
      'UPDATE menu_items SET image_url = $1 WHERE name = $2',
      [imageUrl, itemName]
    );
  }
  
  console.log('✅ تم تحديث صور الأصناف!');
  await client.end();
}

updateImages().catch(e => { console.error(e); process.exit(1); });
