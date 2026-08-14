const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 بدء إدخال البيانات التجريبية...');

  // حذف البيانات القديمة
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.category.deleteMany();
  await prisma.table.deleteMany();
  await prisma.restaurant.deleteMany();

  // إنشاء مطعم
  const restaurant = await prisma.restaurant.create({
    data: {
      name: 'مطعم الذواقة',
      slug: 'gourmet-restaurant',
      address: 'الرياض، المملكة العربية السعودية',
      phone: '+966500000000',
      email: 'info@gourmet.com',
    },
  });

  console.log('✅ تم إنشاء المطعم:', restaurant.id);
  console.log('📝 احفظ هذا المعرف لاستخدامه في التطبيق:', restaurant.id);

  // إنشاء أقسام
  const appetizers = await prisma.category.create({
    data: {
      restaurantId: restaurant.id,
      name: 'المقبلات',
      description: 'مقبلات شهية',
      displayOrder: 1,
    },
  });

  const mainDishes = await prisma.category.create({
    data: {
      restaurantId: restaurant.id,
      name: 'الأطباق الرئيسية',
      description: 'أطباق رئيسية متنوعة',
      displayOrder: 2,
    },
  });

  const desserts = await prisma.category.create({
    data: {
      restaurantId: restaurant.id,
      name: 'الحلويات',
      description: 'حلويات شرقية وغربية',
      displayOrder: 3,
    },
  });

  const drinks = await prisma.category.create({
    data: {
      restaurantId: restaurant.id,
      name: 'المشروبات',
      description: 'مشروبات باردة وساخنة',
      displayOrder: 4,
    },
  });

  // إنشاء أصناف
  const menuItems = [
    // مقبلات
    { restaurantId: restaurant.id, categoryId: appetizers.id, name: 'حمص', description: 'حمص مطحون مع زيت الزيتون', price: 15, preparationTime: 5 },
    { restaurantId: restaurant.id, categoryId: appetizers.id, name: 'متبل', description: 'باذنجان مشوي مع الطحينة', price: 18, preparationTime: 7 },
    { restaurantId: restaurant.id, categoryId: appetizers.id, name: 'ورق عنب', description: 'ورق عنب محشي بالأرز', price: 20, preparationTime: 10 },
    { restaurantId: restaurant.id, categoryId: appetizers.id, name: 'سلطة فتوش', description: 'سلطة خضار طازجة مع خبز محمص', price: 16, preparationTime: 5 },
    { restaurantId: restaurant.id, categoryId: appetizers.id, name: 'كبة مقلية', description: 'كبة لحم مقلية', price: 22, preparationTime: 15 },
    
    // أطباق رئيسية
    { restaurantId: restaurant.id, categoryId: mainDishes.id, name: 'كبسة لحم', description: 'أرز مع لحم ضأن متبل', price: 45, preparationTime: 20 },
    { restaurantId: restaurant.id, categoryId: mainDishes.id, name: 'مشاوي مشكلة', description: 'تشكيلة مشاوي متنوعة', price: 65, preparationTime: 25 },
    { restaurantId: restaurant.id, categoryId: mainDishes.id, name: 'شاورما عربي', description: 'شاورما لحم مع صوص الثوم', price: 25, preparationTime: 10 },
    { restaurantId: restaurant.id, categoryId: mainDishes.id, name: 'مندي دجاج', description: 'دجاج مندي مع أرز', price: 38, preparationTime: 20 },
    { restaurantId: restaurant.id, categoryId: mainDishes.id, name: 'مكرونة باستا', description: 'باستا بصوص الطماطم والريحان', price: 32, preparationTime: 15 },
    { restaurantId: restaurant.id, categoryId: mainDishes.id, name: 'برياني دجاج', description: 'أرز برياني مع دجاج متبل', price: 42, preparationTime: 25 },
    
    // حلويات
    { restaurantId: restaurant.id, categoryId: desserts.id, name: 'كنافة', description: 'كنافة بالقشطة والقطر', price: 20, preparationTime: 10 },
    { restaurantId: restaurant.id, categoryId: desserts.id, name: 'أم علي', description: 'حلوى أم علي بالمكسرات', price: 22, preparationTime: 12 },
    { restaurantId: restaurant.id, categoryId: desserts.id, name: 'تشيز كيك', description: 'تشيز كيك بالتوت', price: 24, preparationTime: 8 },
    { restaurantId: restaurant.id, categoryId: desserts.id, name: 'بقلاوة', description: 'بقلاوة بالفستق', price: 18, preparationTime: 5 },
    
    // مشروبات
    { restaurantId: restaurant.id, categoryId: drinks.id, name: 'عصير برتقال طازج', description: 'عصير برتقال طبيعي', price: 12, preparationTime: 3 },
    { restaurantId: restaurant.id, categoryId: drinks.id, name: 'قهوة عربية', description: 'قهوة عربية بالهيل', price: 10, preparationTime: 5 },
    { restaurantId: restaurant.id, categoryId: drinks.id, name: 'شاي بالنعناع', description: 'شاي طازج بالنعناع', price: 8, preparationTime: 3 },
    { restaurantId: restaurant.id, categoryId: drinks.id, name: 'موهيتو', description: 'موهيتو ليمون بالنعناع', price: 15, preparationTime: 5 },
    { restaurantId: restaurant.id, categoryId: drinks.id, name: 'عصير مانجو', description: 'عصير مانجو طازج', price: 14, preparationTime: 3 },
  ];

  for (const item of menuItems) {
    await prisma.menuItem.create({ data: item });
  }

  console.log('✅ تم إنشاء الأصناف:', menuItems.length);

  // إنشاء طاولات
  const tables = [];
  for (let i = 1; i <= 10; i++) {
    const table = await prisma.table.create({
      data: {
        restaurantId: restaurant.id,
        tableNumber: `T${i}`,
        qrCode: `QR-CODE-${i}`,
      },
    });
    tables.push(table);
  }

  console.log('✅ تم إنشاء الطاولات:', tables.length);
  console.log('✅ تم إدخال جميع البيانات بنجاح!');
  console.log('📝 معرف المطعم:', restaurant.id);
  console.log('📝 أول طاولة QR:', tables[0].qrCode);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
