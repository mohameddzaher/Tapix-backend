// ============================================
// Tapix API - New Database Seed Script
// ============================================
// Run with: npx ts-node src/scripts/seed-new-db.ts
// Or: npx tsx src/scripts/seed-new-db.ts

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const MONGODB_URI = 'mongodb+srv://mohamedzaherdev_db_user:jKAXHWRk0KUpqqI3@newtapix.jql3bck.mongodb.net/?appName=newTapix';

async function seed() {
  console.log('🌱 Starting database seed for new Tapix DB...');

  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  const db = mongoose.connection.db!;

  // ========================================
  // 1. USERS
  // ========================================
  console.log('\n👤 Creating users...');
  const hashedPassword = await bcrypt.hash('Admin@123', 12);
  const hashedUserPassword = await bcrypt.hash('User@123', 12);

  const usersCollection = db.collection('users');
  await usersCollection.deleteMany({});

  const users = await usersCollection.insertMany([
    {
      email: 'admin@tapix.com',
      password: hashedPassword,
      firstName: 'Mohamed',
      lastName: 'Zaher',
      phone: '+966500000001',
      role: 'super_admin',
      isActive: true,
      isEmailVerified: true,
      addresses: [],
      wishlist: [],
      recentlyViewed: [],
      refreshTokens: [],
      referralCode: 'MOHADMIN1',
      canRefer: true,
      referralCredits: 0,
      totalReferrals: 0,
      successfulReferrals: 0,
      loyaltyPoints: 0,
      totalPointsEarned: 0,
      totalPointsRedeemed: 0,
      pointsFrozen: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      email: 'staff@tapix.com',
      password: hashedPassword,
      firstName: 'Ahmed',
      lastName: 'Staff',
      phone: '+966500000002',
      role: 'staff',
      isActive: true,
      isEmailVerified: true,
      permissions: {
        orders: { read: true, write: true },
        products: { read: true, write: true },
        offers: { read: true, write: false },
        reviews: { moderate: true },
        analytics: { limited: true, full: false },
        staff: { read: false, write: false },
        cms: { read: true, write: false },
      },
      addresses: [],
      wishlist: [],
      recentlyViewed: [],
      refreshTokens: [],
      referralCode: 'AHMSTAFF',
      canRefer: true,
      referralCredits: 0,
      totalReferrals: 0,
      successfulReferrals: 0,
      loyaltyPoints: 0,
      totalPointsEarned: 0,
      totalPointsRedeemed: 0,
      pointsFrozen: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      email: 'customer1@test.com',
      password: hashedUserPassword,
      firstName: 'Khalid',
      lastName: 'Al-Saud',
      phone: '+966500000010',
      role: 'user',
      isActive: true,
      isEmailVerified: true,
      addresses: [{
        id: 'addr_1',
        label: 'Home',
        fullAddress: 'King Fahd Road, Al Olaya District',
        city: 'Riyadh',
        area: 'Al Olaya',
        building: '15',
        isDefault: true,
      }],
      wishlist: [],
      recentlyViewed: [],
      refreshTokens: [],
      referralCode: 'KHACUST1',
      canRefer: true,
      referralCredits: 0,
      totalReferrals: 0,
      successfulReferrals: 0,
      loyaltyPoints: 50,
      totalPointsEarned: 50,
      totalPointsRedeemed: 0,
      pointsFrozen: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      email: 'customer2@test.com',
      password: hashedUserPassword,
      firstName: 'Sara',
      lastName: 'Ahmed',
      phone: '+966500000011',
      role: 'user',
      isActive: true,
      isEmailVerified: true,
      addresses: [{
        id: 'addr_2',
        label: 'Home',
        fullAddress: 'Tahlia Street',
        city: 'Jeddah',
        area: 'Al Tahlia',
        isDefault: true,
      }],
      wishlist: [],
      recentlyViewed: [],
      refreshTokens: [],
      referralCode: 'SARCUST2',
      canRefer: true,
      referralCredits: 0,
      totalReferrals: 0,
      successfulReferrals: 0,
      loyaltyPoints: 30,
      totalPointsEarned: 30,
      totalPointsRedeemed: 0,
      pointsFrozen: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  const adminId = users.insertedIds[0];
  console.log(`  ✅ Created ${Object.keys(users.insertedIds).length} users`);

  // ========================================
  // 2. CATEGORIES
  // ========================================
  console.log('\n📂 Creating categories...');
  const categoriesCollection = db.collection('categories');
  await categoriesCollection.deleteMany({});

  const cats = await categoriesCollection.insertMany([
    { name: 'Electronics', nameAr: 'إلكترونيات', slug: 'electronics', isActive: true, order: 1, productCount: 0, createdAt: new Date(), updatedAt: new Date() },
    { name: 'Accessories', nameAr: 'اكسسوارات', slug: 'accessories', isActive: true, order: 2, productCount: 0, createdAt: new Date(), updatedAt: new Date() },
    { name: 'Home Appliances', nameAr: 'أجهزة منزلية', slug: 'home-appliances', isActive: true, order: 3, productCount: 0, createdAt: new Date(), updatedAt: new Date() },
    { name: 'Gaming', nameAr: 'ألعاب', slug: 'gaming', isActive: true, order: 4, productCount: 0, createdAt: new Date(), updatedAt: new Date() },
  ]);
  console.log(`  ✅ Created ${Object.keys(cats.insertedIds).length} categories`);

  // ========================================
  // 3. BRANDS
  // ========================================
  console.log('\n🏷️  Creating brands...');
  const brandsCollection = db.collection('brands');
  await brandsCollection.deleteMany({});

  await brandsCollection.insertMany([
    { name: 'Apple', slug: 'apple', description: 'Apple Inc.', isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { name: 'Samsung', slug: 'samsung', description: 'Samsung Electronics', isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { name: 'Sony', slug: 'sony', description: 'Sony Corporation', isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { name: 'JBL', slug: 'jbl', description: 'JBL Audio', isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { name: 'Anker', slug: 'anker', description: 'Anker Innovations', isActive: true, createdAt: new Date(), updatedAt: new Date() },
  ]);
  console.log('  ✅ Created 5 brands');

  // ========================================
  // 4. B2B SUPPLIERS
  // ========================================
  console.log('\n🚚 Creating B2B suppliers...');
  const suppliersCollection = db.collection('b2bsuppliers');
  await suppliersCollection.deleteMany({});

  const suppliers = await suppliersCollection.insertMany([
    {
      name: 'Tech Distributors SA',
      contactPerson: 'Omar Hassan',
      phone: '+966501234567',
      email: 'omar@techdist.sa',
      address: 'Industrial Area, Warehouse 15',
      city: 'Jeddah',
      country: 'Saudi Arabia',
      notes: 'Main electronics supplier. Good prices on bulk orders.',
      totalPurchases: 2,
      totalAmountPaid: 137500,
      isActive: true,
      createdBy: adminId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: 'Gulf Electronics Trading',
      contactPerson: 'Fahad Al-Qahtani',
      phone: '+966509876543',
      email: 'fahad@gulfelectronics.com',
      address: 'King Abdullah Economic City',
      city: 'Rabigh',
      country: 'Saudi Arabia',
      notes: 'Specializes in Samsung and Sony products.',
      totalPurchases: 1,
      totalAmountPaid: 76000,
      isActive: true,
      createdBy: adminId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: 'Shenzhen Direct Import',
      contactPerson: 'Li Wei',
      phone: '+8613800138000',
      email: 'liwei@szdirect.cn',
      address: 'Futian District',
      city: 'Shenzhen',
      country: 'China',
      notes: 'Direct from China. Good for accessories and cables. 2-3 weeks shipping.',
      totalPurchases: 2,
      totalAmountPaid: 19000,
      isActive: true,
      createdBy: adminId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  const supplier1Id = suppliers.insertedIds[0];
  const supplier2Id = suppliers.insertedIds[1];
  const supplier3Id = suppliers.insertedIds[2];
  console.log(`  ✅ Created 3 suppliers`);

  // ========================================
  // 5. B2B PRODUCTS
  // ========================================
  console.log('\n📦 Creating B2B products...');
  const b2bProductsCollection = db.collection('b2bproducts');
  await b2bProductsCollection.deleteMany({});

  const b2bProducts = await b2bProductsCollection.insertMany([
    {
      name: 'iPhone 15 Pro Max 256GB',
      sku: 'IPH15PM-256',
      description: 'Apple iPhone 15 Pro Max, 256GB, Natural Titanium',
      category: 'Smartphones',
      quantity: 22,
      costPerUnit: 4200,
      totalCost: 105000,
      onlinePrice: 5199,
      offlinePrice: 4999,
      specs: 'A17 Pro chip, 6.7" Super Retina XDR, 48MP camera, USB-C',
      supplierId: supplier1Id,
      isActive: true,
      createdBy: adminId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: 'Samsung Galaxy S24 Ultra 512GB',
      sku: 'SGS24U-512',
      description: 'Samsung Galaxy S24 Ultra, 512GB, Titanium Black',
      category: 'Smartphones',
      quantity: 20,
      costPerUnit: 3800,
      totalCost: 76000,
      onlinePrice: 4799,
      offlinePrice: 4599,
      specs: 'Snapdragon 8 Gen 3, 6.8" Dynamic AMOLED, 200MP camera, S Pen',
      supplierId: supplier2Id,
      isActive: true,
      createdBy: adminId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: 'AirPods Pro 2nd Gen',
      sku: 'APP2-USB',
      description: 'Apple AirPods Pro 2nd Generation with USB-C',
      category: 'Audio',
      quantity: 45,
      costPerUnit: 650,
      totalCost: 32500,
      onlinePrice: 949,
      offlinePrice: 899,
      specs: 'Active Noise Cancellation, Adaptive Audio, USB-C, MagSafe',
      supplierId: supplier1Id,
      isActive: true,
      createdBy: adminId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: 'JBL Charge 5 Bluetooth Speaker',
      sku: 'JBL-CHG5',
      description: 'JBL Charge 5 Portable Wireless Bluetooth Speaker',
      category: 'Audio',
      quantity: 30,
      costPerUnit: 350,
      totalCost: 10500,
      onlinePrice: 549,
      offlinePrice: 499,
      specs: 'IP67 Waterproof, 20 hours playtime, Powerbank feature, PartyBoost',
      supplierId: supplier3Id,
      isActive: true,
      createdBy: adminId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: 'Anker 65W USB-C Charger',
      sku: 'ANK-65W',
      description: 'Anker 735 Charger (Nano II 65W) 3-Port Fast Charger',
      category: 'Accessories',
      quantity: 90,
      costPerUnit: 85,
      totalCost: 8500,
      onlinePrice: 149,
      offlinePrice: 129,
      specs: '65W total output, 2x USB-C + 1x USB-A, GaN II technology, Foldable plug',
      supplierId: supplier3Id,
      isActive: true,
      createdBy: adminId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  const product1Id = b2bProducts.insertedIds[0];
  const product3Id = b2bProducts.insertedIds[2];
  const product5Id = b2bProducts.insertedIds[4];
  console.log(`  ✅ Created 5 B2B products`);

  // ========================================
  // 6. B2B CLIENTS
  // ========================================
  console.log('\n🤝 Creating B2B clients...');
  const clientsCollection = db.collection('b2bclients');
  await clientsCollection.deleteMany({});

  const clients = await clientsCollection.insertMany([
    {
      name: 'Ali Mohammed',
      companyName: 'Al-Noor Electronics',
      contactPerson: 'Ali Mohammed',
      phone: '+966551234567',
      email: 'ali@alnoor.sa',
      address: 'Palestine Street, Shop 42',
      city: 'Jeddah',
      country: 'Saudi Arabia',
      taxNumber: '300123456789003',
      notes: 'Regular wholesale client. Pays on time.',
      totalOrders: 1,
      totalSpent: 22415.8,
      isActive: true,
      createdBy: adminId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: 'Nasser Al-Harbi',
      companyName: 'Digital Zone',
      contactPerson: 'Nasser Al-Harbi',
      phone: '+966559876543',
      email: 'nasser@digitalzone.sa',
      address: 'Olaya Street, Mall Plaza, Level 2',
      city: 'Riyadh',
      country: 'Saudi Arabia',
      notes: 'New client. Started Q1 2026.',
      totalOrders: 1,
      totalSpent: 1483.5,
      isActive: true,
      createdBy: adminId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: 'Youssef Ibrahim',
      companyName: 'Smart Devices Co.',
      contactPerson: 'Youssef Ibrahim',
      phone: '+966555555555',
      email: 'youssef@smartdevices.sa',
      address: 'Prince Sultan Road',
      city: 'Jeddah',
      country: 'Saudi Arabia',
      taxNumber: '300987654321003',
      notes: 'Bulk buyer. Prefers offline pricing.',
      totalOrders: 0,
      totalSpent: 0,
      isActive: true,
      createdBy: adminId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  const client1Id = clients.insertedIds[0];
  const client2Id = clients.insertedIds[1];
  console.log(`  ✅ Created 3 B2B clients`);

  // ========================================
  // 7. B2B SALES
  // ========================================
  console.log('\n💰 Creating sample B2B sales...');
  const salesCollection = db.collection('b2bsales');
  await salesCollection.deleteMany({});

  // Sale 1
  const sale1Subtotal = 14997 + 4495;
  const sale1Tax = sale1Subtotal * 0.15;
  const sale1Total = sale1Subtotal + sale1Tax;
  const sale1TotalCost = (4200 * 3) + (650 * 5);

  await salesCollection.insertOne({
    invoiceNumber: 'INV-2603-0001',
    clientId: client1Id,
    items: [
      { productId: product1Id, productName: 'iPhone 15 Pro Max 256GB', quantity: 3, pricePerUnit: 4999, totalPrice: 14997, costPerUnit: 4200 },
      { productId: product3Id, productName: 'AirPods Pro 2nd Gen', quantity: 5, pricePerUnit: 899, totalPrice: 4495, costPerUnit: 650 },
    ],
    subtotal: sale1Subtotal,
    tax: sale1Tax,
    taxRate: 15,
    discount: 0,
    total: sale1Total,
    totalCost: sale1TotalCost,
    profit: sale1Total - sale1TotalCost - sale1Tax,
    paymentStatus: 'paid',
    paymentMethod: 'Bank Transfer',
    amountPaid: sale1Total,
    saleDate: new Date('2026-03-15'),
    createdBy: adminId,
    createdAt: new Date('2026-03-15'),
    updatedAt: new Date('2026-03-15'),
  });

  // Sale 2
  const sale2Subtotal = 1290;
  const sale2Tax = sale2Subtotal * 0.15;
  const sale2Total = sale2Subtotal + sale2Tax;
  const sale2TotalCost = 85 * 10;

  await salesCollection.insertOne({
    invoiceNumber: 'INV-2603-0002',
    clientId: client2Id,
    items: [
      { productId: product5Id, productName: 'Anker 65W USB-C Charger', quantity: 10, pricePerUnit: 129, totalPrice: 1290, costPerUnit: 85 },
    ],
    subtotal: sale2Subtotal,
    tax: sale2Tax,
    taxRate: 15,
    discount: 0,
    total: sale2Total,
    totalCost: sale2TotalCost,
    profit: sale2Total - sale2TotalCost - sale2Tax,
    paymentStatus: 'partial',
    paymentMethod: 'Cash',
    amountPaid: 1000,
    saleDate: new Date('2026-03-28'),
    createdBy: adminId,
    createdAt: new Date('2026-03-28'),
    updatedAt: new Date('2026-03-28'),
  });

  console.log('  ✅ Created 2 sample sales');

  // ========================================
  // 8. B2B EXPENSES
  // ========================================
  console.log('\n💸 Creating sample B2B expenses...');
  const expensesCollection = db.collection('b2bexpenses');
  await expensesCollection.deleteMany({});

  await expensesCollection.insertMany([
    {
      title: 'Employee Salary - March',
      amount: 3000,
      category: 'salaries',
      date: new Date('2026-03-01'),
      description: 'Monthly salary for store assistant',
      isRecurring: true,
      recurringFrequency: 'monthly',
      createdBy: adminId,
      createdAt: new Date('2026-03-01'),
      updatedAt: new Date('2026-03-01'),
    },
    {
      title: 'Shop Rent - March',
      amount: 5000,
      category: 'rent',
      date: new Date('2026-03-01'),
      description: 'Monthly rent for the warehouse',
      isRecurring: true,
      recurringFrequency: 'monthly',
      createdBy: adminId,
      createdAt: new Date('2026-03-01'),
      updatedAt: new Date('2026-03-01'),
    },
    {
      title: 'Shipping costs - DHL',
      amount: 450,
      category: 'shipping',
      date: new Date('2026-03-10'),
      description: 'Shipping for bulk order from China',
      isRecurring: false,
      createdBy: adminId,
      createdAt: new Date('2026-03-10'),
      updatedAt: new Date('2026-03-10'),
    },
    {
      title: 'Packaging Materials',
      amount: 200,
      category: 'packaging',
      date: new Date('2026-03-15'),
      description: 'Boxes, bubble wrap, tape',
      isRecurring: false,
      createdBy: adminId,
      createdAt: new Date('2026-03-15'),
      updatedAt: new Date('2026-03-15'),
    },
  ]);
  console.log('  ✅ Created 4 sample expenses');

  // ========================================
  // 9. SETTINGS
  // ========================================
  console.log('\n⚙️  Creating settings...');
  const settingsCollection = db.collection('settings');
  await settingsCollection.deleteMany({});

  await settingsCollection.insertOne({
    siteName: 'Tapix',
    siteNameAr: 'تابكس',
    siteEmail: 'contact@tapix.com',
    sitePhone: '+966500000000',
    currency: 'SAR',
    currencySymbol: 'SAR',
    taxRate: 15,
    shippingFlatRate: 25,
    freeShippingThreshold: 200,
    socialLinks: { instagram: '', twitter: '', facebook: '', tiktok: '' },
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log('  ✅ Created default settings');

  // ========================================
  // DONE
  // ========================================
  console.log('\n' + '='.repeat(50));
  console.log('🎉 Database seeded successfully!');
  console.log('='.repeat(50));
  console.log('\n📋 Summary:');
  console.log('  - 4 Users (1 super_admin, 1 staff, 2 customers)');
  console.log('  - 4 Categories');
  console.log('  - 5 Brands');
  console.log('  - 3 B2B Suppliers');
  console.log('  - 5 B2B Products');
  console.log('  - 3 B2B Clients');
  console.log('  - 2 B2B Sales (with invoices)');
  console.log('  - 4 B2B Expenses');
  console.log('  - Default Settings');
  console.log('\n🔐 Login Credentials:');
  console.log('  Super Admin: admin@tapix.com / Admin@123');
  console.log('  Staff:       staff@tapix.com / Admin@123');
  console.log('  Customer:    customer1@test.com / User@123');
  console.log('  Customer:    customer2@test.com / User@123');

  await mongoose.disconnect();
  console.log('\n✅ Done!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
