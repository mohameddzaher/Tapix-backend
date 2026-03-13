// ============================================
// Tapix API - Database Seed Script
// ============================================

import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { User } from '../models/User';
import { Category } from '../models/Category';
import { Product } from '../models/Product';
import { Review } from '../models/Review';
import { Order } from '../models/Order';
import { Offer } from '../models/Offer';
import { Banner } from '../models/Banner';
import { BlogPost, BlogCategory } from '../models/Blog';
import { CMSContent, PolicyPage, FAQ } from '../models/CMS';
import { Notification } from '../models/Notification';

// Unsplash image URLs for realistic product images
const productImages = {
  smartphones: [
    'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800',
    'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800',
  ],
  tablets: [
    'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800',
    'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=800',
  ],
  smartwatches: [
    'https://images.unsplash.com/photo-1546868871-af0de0ae72be?w=800',
    'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800',
  ],
  headphones: [
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
    'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800',
  ],
  powerbanks: [
    'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=800',
    'https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=800',
  ],
  earbuds: [
    'https://images.unsplash.com/photo-1590658268037-6bf12f032f55?w=800',
    'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=800',
  ],
  chargers: [
    'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800',
    'https://images.unsplash.com/photo-1618438051762-c3680b4b4aac?w=800',
  ],
  gaming: [
    'https://images.unsplash.com/photo-1592840496694-26d035b52b48?w=800',
    'https://images.unsplash.com/photo-1600080972464-8e5f35f63d08?w=800',
  ],
  speakers: [
    'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800',
    'https://images.unsplash.com/photo-1589003077984-894e133dabab?w=800',
  ],
  cases: [
    'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=800',
    'https://images.unsplash.com/photo-1567721913486-6585f069b332?w=800',
  ],
};

const bannerImages = [
  'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=1600',
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1600',
  'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=1600',
];

const blogImages = [
  'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800',
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
  'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800',
];

async function clearDatabase(): Promise<void> {
  console.log('🗑️  Clearing existing data...');
  await Promise.all([
    User.deleteMany({}),
    Category.deleteMany({}),
    Product.deleteMany({}),
    Review.deleteMany({}),
    Order.deleteMany({}),
    Offer.deleteMany({}),
    Banner.deleteMany({}),
    BlogPost.deleteMany({}),
    BlogCategory.deleteMany({}),
    CMSContent.deleteMany({}),
    PolicyPage.deleteMany({}),
    FAQ.deleteMany({}),
    Notification.deleteMany({}),
  ]);
  console.log('✅ Database cleared');
}

async function seedUsers(): Promise<{
  superAdmin: any;
  admin: any;
  users: any[];
}> {
  console.log('👤 Seeding users...');

  const superAdmin = await User.create({
    email: 'admin@tapix.com',
    password: 'admin123',
    firstName: 'Super',
    lastName: 'Admin',
    phone: '+201234567890',
    role: 'super_admin',
    isActive: true,
    isEmailVerified: true,
    addresses: [
      {
        id: uuidv4(),
        label: 'Office',
        fullAddress: '123 Business Tower, Downtown Cairo',
        city: 'Cairo',
        area: 'Downtown',
        building: 'Tower A',
        floor: '15',
        isDefault: true,
      },
    ],
  });

  const admin = await User.create({
    email: 'staff@tapix.com',
    password: 'staff123',
    firstName: 'Staff',
    lastName: 'Member',
    phone: '+201234567891',
    role: 'admin',
    isActive: true,
    isEmailVerified: true,
    createdBy: superAdmin._id,
    permissions: {
      orders: { read: true, write: true },
      products: { read: true, write: true },
      offers: { read: true, write: true },
      reviews: { moderate: true },
      analytics: { limited: true, full: false },
      staff: { read: false, write: false },
      cms: { read: true, write: true },
    },
  });

  const regularUsers = await User.create([
    {
      email: 'user@tapix.com',
      password: 'user123',
      firstName: 'Ahmed',
      lastName: 'Hassan',
      phone: '+201234567892',
      role: 'user',
      isActive: true,
      isEmailVerified: true,
      addresses: [
        {
          id: uuidv4(),
          label: 'Home',
          fullAddress: '45 Nile Corniche, Maadi',
          city: 'Cairo',
          area: 'Maadi',
          building: '12',
          floor: '3',
          apartment: '5',
          isDefault: true,
        },
      ],
    },
    {
      email: 'fatma@example.com',
      password: 'password123',
      firstName: 'Fatma',
      lastName: 'Ali',
      phone: '+201234567893',
      role: 'user',
      isActive: true,
      isEmailVerified: true,
      addresses: [
        {
          id: uuidv4(),
          label: 'Home',
          fullAddress: '78 October Street, 6th of October',
          city: 'Giza',
          area: '6th of October',
          isDefault: true,
        },
      ],
    },
    {
      email: 'omar@example.com',
      password: 'password123',
      firstName: 'Omar',
      lastName: 'Mohamed',
      phone: '+201234567894',
      role: 'user',
      isActive: true,
      isEmailVerified: false,
    },
  ]);

  console.log(`✅ Created ${3 + regularUsers.length} users`);
  return { superAdmin, admin, users: regularUsers };
}

async function seedCategories(): Promise<any[]> {
  console.log('📁 Seeding categories...');

  const categories = await Category.create([
    {
      name: 'Smartphones & Tablets',
      description: 'Latest smartphones, tablets, and mobile devices from top brands',
      image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400',
      icon: 'smartphone',
      order: 1,
      isActive: true,
    },
    {
      name: 'Audio & Wearables',
      description: 'Premium headphones, earbuds, smart watches, and wearable tech',
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
      icon: 'headphones',
      order: 2,
      isActive: true,
    },
    {
      name: 'Charging & Power',
      description: 'Fast chargers, power banks, cables, and charging accessories',
      image: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=400',
      icon: 'battery-charging',
      order: 3,
      isActive: true,
    },
    {
      name: 'Cases & Protection',
      description: 'Phone cases, screen protectors, and device protection accessories',
      image: 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=400',
      icon: 'shield',
      order: 4,
      isActive: true,
    },
    {
      name: 'Gaming & Accessories',
      description: 'Gaming controllers, laptop accessories, and smart gadgets',
      image: 'https://images.unsplash.com/photo-1592840496694-26d035b52b48?w=400',
      icon: 'gamepad',
      order: 5,
      isActive: true,
    },
  ]);

  // Create subcategories
  const subcategories = await Category.create([
    {
      name: 'Smartphones',
      description: 'Flagship and mid-range smartphones from Apple, Samsung, Xiaomi, and more',
      parentId: categories[0]._id,
      icon: 'smartphone',
      order: 1,
      isActive: true,
    },
    {
      name: 'Tablets',
      description: 'iPads, Android tablets, and drawing tablets for work and entertainment',
      parentId: categories[0]._id,
      icon: 'tablet',
      order: 2,
      isActive: true,
    },
    {
      name: 'Smart Watches',
      description: 'Apple Watch, Samsung Galaxy Watch, and fitness trackers',
      parentId: categories[0]._id,
      icon: 'watch',
      order: 3,
      isActive: true,
    },
    {
      name: 'Wireless Earbuds',
      description: 'True wireless earbuds with active noise cancellation and premium sound',
      parentId: categories[0]._id,
      icon: 'music',
      order: 4,
      isActive: true,
    },
    {
      name: 'Headphones',
      description: 'Over-ear and on-ear headphones for music, gaming, and studio use',
      parentId: categories[1]._id,
      icon: 'headphones',
      order: 1,
      isActive: true,
    },
    {
      name: 'Chargers & Cables',
      description: 'USB-C fast chargers, wireless chargers, Lightning cables, and adapters',
      parentId: categories[1]._id,
      icon: 'zap',
      order: 2,
      isActive: true,
    },
    {
      name: 'Power Banks',
      description: 'Portable power banks from 5000mAh to 30000mAh for on-the-go charging',
      parentId: categories[1]._id,
      icon: 'battery',
      order: 3,
      isActive: true,
    },
    {
      name: 'Phone Cases',
      description: 'Protective cases, clear cases, and designer cases for all phone models',
      parentId: categories[2]._id,
      icon: 'smartphone',
      order: 1,
      isActive: true,
    },
    {
      name: 'Gaming Controllers',
      description: 'Wireless gaming controllers for Xbox, PlayStation, PC, and mobile gaming',
      parentId: categories[3]._id,
      icon: 'gamepad',
      order: 1,
      isActive: true,
    },
    {
      name: 'Laptop Accessories',
      description: 'Laptop stands, cooling pads, docking stations, and USB hubs',
      parentId: categories[4]._id,
      icon: 'monitor',
      order: 1,
      isActive: true,
    },
  ]);

  console.log(`✅ Created ${categories.length} categories and ${subcategories.length} subcategories`);
  return [...categories, ...subcategories];
}

async function seedProducts(categories: any[]): Promise<any[]> {
  console.log('📦 Seeding products...');

  const smartphonesCat = categories.find((c) => c.name === 'Smartphones');
  const tabletsCat = categories.find((c) => c.name === 'Tablets');
  const smartWatchesCat = categories.find((c) => c.name === 'Smart Watches');
  const wirelessEarbudsCat = categories.find((c) => c.name === 'Wireless Earbuds');
  const headphonesCat = categories.find((c) => c.name === 'Headphones');
  const chargersAndCablesCat = categories.find((c) => c.name === 'Chargers & Cables');
  const powerBanksCat = categories.find((c) => c.name === 'Power Banks');
  const phoneCasesCat = categories.find((c) => c.name === 'Phone Cases');
  const gamingControllersCat = categories.find((c) => c.name === 'Gaming Controllers');
  const laptopAccessoriesCat = categories.find((c) => c.name === 'Laptop Accessories');
  const smartphonesAndTabletsCat = categories.find((c) => c.name === 'Smartphones & Tablets');
  const audioAndWearablesCat = categories.find((c) => c.name === 'Audio & Wearables');
  const chargingAndPowerCat = categories.find((c) => c.name === 'Charging & Power');
  const casesAndProtectionCat = categories.find((c) => c.name === 'Cases & Protection');
  const gamingAndAccessoriesCat = categories.find((c) => c.name === 'Gaming & Accessories');

  const products = await Product.create([
    // iPhone 15 Pro Max
    {
      title: 'iPhone 15 Pro Max 256GB',
      brand: 'Apple',
      sku: 'TPX-IPH-001',
      description: 'The most powerful iPhone ever. Featuring the A17 Pro chip, a 48MP main camera with 5x optical zoom, titanium design, and the all-new Action Button. The 6.7-inch Super Retina XDR display with ProMotion delivers stunning visuals. USB-C connectivity, up to 29 hours of video playback, and advanced safety features including Crash Detection and Emergency SOS via satellite.',
      shortDescription: 'Apple iPhone 15 Pro Max with A17 Pro chip, 48MP camera, titanium design, and USB-C.',
      specs: [
        { name: 'Storage', value: '256GB', group: 'Memory' },
        { name: 'Display', value: '6.7" Super Retina XDR', group: 'Display' },
        { name: 'Chip', value: 'A17 Pro', group: 'Performance' },
        { name: 'Camera', value: '48MP Main + 12MP Ultra Wide + 12MP Telephoto', group: 'Camera' },
        { name: 'Battery', value: 'Up to 29 hours video playback', group: 'Battery' },
        { name: 'Connectivity', value: '5G, Wi-Fi 6E, Bluetooth 5.3, USB-C', group: 'Connectivity' },
        { name: 'Weight', value: '221g', group: 'Physical' },
        { name: 'Water Resistance', value: 'IP68 (6 meters, 30 minutes)', group: 'Durability' },
      ],
      warranty: '1 Year Apple Manufacturer Warranty',
      deliveryNotes: 'Ships within 1-2 business days. Delivered in original sealed packaging.',
      price: 5499,
      compareAtPrice: 5999,
      discount: 8,
      stockQuantity: 25,
      lowStockThreshold: 5,
      images: [
        { id: uuidv4(), url: productImages.smartphones[0], alt: 'iPhone 15 Pro Max Natural Titanium', isPrimary: true, order: 0 },
        { id: uuidv4(), url: productImages.smartphones[1], alt: 'iPhone 15 Pro Max Camera Close-up', isPrimary: false, order: 1 },
      ],
      categoryId: smartphonesAndTabletsCat._id,
      subcategoryId: smartphonesCat?._id,
      tags: ['iphone', 'apple', 'smartphone', '5g', 'pro-max', 'titanium'],
      faqs: [
        { id: uuidv4(), question: 'Does it come with a charger?', answer: 'The iPhone 15 Pro Max comes with a USB-C to USB-C cable. A charging adapter is sold separately. We recommend the Apple 20W USB-C adapter or any compatible fast charger.', order: 0 },
        { id: uuidv4(), question: 'Is the device unlocked?', answer: 'Yes, all iPhones sold at Tapix are factory unlocked and compatible with all major carriers in Egypt and worldwide.', order: 1 },
      ],
      isActive: true,
      isFeatured: true,
      averageRating: 4.5,
      reviewCount: 128,
      soldCount: 245,
      viewCount: 3420,
    },
    // Samsung Galaxy S24 Ultra
    {
      title: 'Samsung Galaxy S24 Ultra',
      brand: 'Samsung',
      sku: 'TPX-SGS-001',
      description: 'Meet the Galaxy S24 Ultra, Samsung\'s most powerful smartphone. Powered by the Snapdragon 8 Gen 3 for Galaxy, it features a 200MP main camera, built-in S Pen, and Galaxy AI for intelligent photo editing, live translation, and note summarization. The 6.8-inch QHD+ Dynamic AMOLED 2X display delivers brilliant colors with 2600 nits peak brightness. Titanium frame with Gorilla Armor glass for ultimate durability.',
      shortDescription: 'Samsung Galaxy S24 Ultra with 200MP camera, S Pen, Galaxy AI, and titanium frame.',
      specs: [
        { name: 'Storage', value: '256GB', group: 'Memory' },
        { name: 'RAM', value: '12GB', group: 'Memory' },
        { name: 'Display', value: '6.8" QHD+ Dynamic AMOLED 2X, 120Hz', group: 'Display' },
        { name: 'Processor', value: 'Snapdragon 8 Gen 3 for Galaxy', group: 'Performance' },
        { name: 'Camera', value: '200MP Main + 50MP Telephoto + 10MP Telephoto + 12MP Ultra Wide', group: 'Camera' },
        { name: 'Battery', value: '5000mAh, up to 30 hours video playback', group: 'Battery' },
        { name: 'Connectivity', value: '5G, Wi-Fi 7, Bluetooth 5.3, USB-C 3.2', group: 'Connectivity' },
        { name: 'Weight', value: '232g', group: 'Physical' },
      ],
      warranty: '1 Year Samsung Manufacturer Warranty',
      price: 4999,
      stockQuantity: 15,
      lowStockThreshold: 3,
      images: [
        { id: uuidv4(), url: productImages.tablets[0], alt: 'Samsung Galaxy S24 Ultra Titanium Gray', isPrimary: true, order: 0 },
      ],
      categoryId: smartphonesAndTabletsCat._id,
      subcategoryId: smartphonesCat?._id,
      tags: ['samsung', 'galaxy', 'smartphone', '5g', 's-pen', 'galaxy-ai'],
      isActive: true,
      isFeatured: true,
      averageRating: 4.7,
      reviewCount: 89,
      soldCount: 156,
      viewCount: 2100,
    },
    // Apple Watch Series 9
    {
      title: 'Apple Watch Series 9',
      brand: 'Apple',
      sku: 'TPX-AW9-001',
      description: 'The Apple Watch Series 9 features the all-new S9 SiP chip for faster performance and a magical new Double Tap gesture. The always-on Retina display is now up to 2000 nits bright. Advanced health features include blood oxygen monitoring, ECG, temperature sensing, and Crash Detection. Water resistant to 50 meters with swimproof design. Available in 41mm and 45mm sizes with aluminum or stainless steel cases.',
      shortDescription: 'Apple Watch Series 9 with S9 chip, Double Tap gesture, and advanced health monitoring.',
      specs: [
        { name: 'Case Size', value: '45mm', group: 'Physical' },
        { name: 'Display', value: 'Always-On Retina LTPO OLED, 2000 nits', group: 'Display' },
        { name: 'Chip', value: 'S9 SiP', group: 'Performance' },
        { name: 'Health Sensors', value: 'Blood Oxygen, ECG, Temperature, Heart Rate', group: 'Health' },
        { name: 'Battery', value: 'Up to 18 hours (36 hours Low Power Mode)', group: 'Battery' },
        { name: 'Water Resistance', value: 'WR50 (50 meters)', group: 'Durability' },
        { name: 'Connectivity', value: 'Wi-Fi, Bluetooth 5.3, GPS', group: 'Connectivity' },
        { name: 'Weight', value: '38.7g (aluminum)', group: 'Physical' },
      ],
      warranty: '1 Year Apple Manufacturer Warranty',
      installationNotes: 'Pair with your iPhone via Bluetooth. Quick setup guide included in the box.',
      price: 1899,
      compareAtPrice: 2099,
      discount: 10,
      stockQuantity: 30,
      lowStockThreshold: 5,
      images: [
        { id: uuidv4(), url: productImages.smartwatches[0], alt: 'Apple Watch Series 9 Midnight Aluminum', isPrimary: true, order: 0 },
        { id: uuidv4(), url: productImages.smartwatches[1], alt: 'Apple Watch Series 9 on Wrist', isPrimary: false, order: 1 },
      ],
      categoryId: audioAndWearablesCat._id,
      subcategoryId: smartWatchesCat?._id,
      tags: ['apple-watch', 'smartwatch', 'wearable', 'health-tracking', 'fitness'],
      faqs: [
        { id: uuidv4(), question: 'Is it compatible with Android phones?', answer: 'No, the Apple Watch requires an iPhone 11 or later running iOS 17 or later for pairing and full functionality.', order: 0 },
      ],
      isActive: true,
      isFeatured: true,
      averageRating: 4.8,
      reviewCount: 256,
      soldCount: 412,
      viewCount: 5200,
    },
    // Sony WH-1000XM5
    {
      title: 'Sony WH-1000XM5 Headphones',
      brand: 'Sony',
      sku: 'TPX-SNY-001',
      description: 'Industry-leading noise cancellation meets exceptional sound quality. The Sony WH-1000XM5 features two processors controlling eight microphones for unprecedented noise cancellation. The newly designed 30mm driver unit delivers crystal-clear audio across all frequencies. With Multipoint Connection, seamlessly switch between two Bluetooth devices. Up to 30 hours of battery life with quick charging — 3 minutes of charge gives 3 hours of playback.',
      shortDescription: 'Sony WH-1000XM5 with industry-leading noise cancellation, 30mm drivers, and 30-hour battery.',
      specs: [
        { name: 'Driver', value: '30mm, dome type', group: 'Audio' },
        { name: 'Noise Cancellation', value: 'Auto NC Optimizer, 8 microphones', group: 'Audio' },
        { name: 'Battery', value: 'Up to 30 hours (NC on)', group: 'Battery' },
        { name: 'Quick Charge', value: '3 min charge = 3 hours playback', group: 'Battery' },
        { name: 'Connectivity', value: 'Bluetooth 5.2, Multipoint, 3.5mm jack', group: 'Connectivity' },
        { name: 'Weight', value: '250g', group: 'Physical' },
        { name: 'Codecs', value: 'LDAC, AAC, SBC', group: 'Audio' },
        { name: 'Color', value: 'Black', group: 'Physical' },
      ],
      warranty: '1 Year Sony Manufacturer Warranty',
      installationNotes: 'Download the Sony Headphones Connect app for personalized sound settings and firmware updates.',
      price: 1599,
      stockQuantity: 45,
      lowStockThreshold: 10,
      images: [
        { id: uuidv4(), url: productImages.headphones[0], alt: 'Sony WH-1000XM5 Black Headphones', isPrimary: true, order: 0 },
      ],
      categoryId: audioAndWearablesCat._id,
      subcategoryId: headphonesCat?._id,
      tags: ['sony', 'headphones', 'noise-cancelling', 'wireless', 'bluetooth'],
      isActive: true,
      isFeatured: true,
      averageRating: 4.6,
      reviewCount: 342,
      soldCount: 567,
      viewCount: 8900,
    },
    // Anker 737 Power Bank
    {
      title: 'Anker 737 Power Bank 24000mAh',
      brand: 'Anker',
      sku: 'TPX-ANK-001',
      description: 'Power your devices on the go with the Anker 737 PowerCore 24K. Featuring a massive 24,000mAh capacity and 140W bidirectional USB-C output, it can charge a MacBook Pro at full speed. Smart digital display shows real-time power output, remaining capacity, and estimated recharge time. Three ports (2x USB-C + 1x USB-A) let you charge multiple devices simultaneously. ActiveShield 2.0 monitors temperature over 3 million times daily for safe charging.',
      shortDescription: 'Anker 737 Power Bank with 24000mAh capacity, 140W USB-C output, and smart display.',
      specs: [
        { name: 'Capacity', value: '24,000mAh / 86.4Wh', group: 'Power' },
        { name: 'Output', value: '140W max USB-C', group: 'Power' },
        { name: 'Ports', value: '2x USB-C, 1x USB-A', group: 'Connectivity' },
        { name: 'Input', value: '140W USB-C', group: 'Power' },
        { name: 'Display', value: 'Smart Digital Display', group: 'Features' },
        { name: 'Weight', value: '632g', group: 'Physical' },
        { name: 'Dimensions', value: '15.6 x 5.5 x 4.9 cm', group: 'Physical' },
        { name: 'Safety', value: 'ActiveShield 2.0 Temperature Monitoring', group: 'Safety' },
      ],
      warranty: '1 Year Anker Manufacturer Warranty',
      price: 499,
      compareAtPrice: 599,
      discount: 17,
      stockQuantity: 12,
      lowStockThreshold: 3,
      images: [
        { id: uuidv4(), url: productImages.powerbanks[0], alt: 'Anker 737 Power Bank 24000mAh', isPrimary: true, order: 0 },
        { id: uuidv4(), url: productImages.powerbanks[1], alt: 'Anker 737 Power Bank Charging Laptop', isPrimary: false, order: 1 },
      ],
      categoryId: chargingAndPowerCat._id,
      subcategoryId: powerBanksCat?._id,
      tags: ['anker', 'power-bank', 'portable-charger', '140w', 'usb-c'],
      isActive: true,
      isFeatured: true,
      averageRating: 4.9,
      reviewCount: 567,
      soldCount: 234,
      viewCount: 12500,
    },
    // Samsung Galaxy Buds2 Pro
    {
      title: 'Samsung Galaxy Buds2 Pro',
      brand: 'Samsung',
      sku: 'TPX-SGB-001',
      description: 'Immerse yourself in Hi-Fi 360 Audio with the Samsung Galaxy Buds2 Pro. Featuring 24-bit audio processing and intelligent Active Noise Cancellation that adapts to your surroundings. The compact, ergonomic design with soft silicone ear tips ensures a comfortable fit for all-day wear. IPX7 water resistance for workouts and rain. Up to 5 hours of playback (18 hours with case) and seamless switching between Samsung Galaxy devices.',
      shortDescription: 'Samsung Galaxy Buds2 Pro with Hi-Fi 360 Audio, intelligent ANC, and IPX7 water resistance.',
      specs: [
        { name: 'Driver', value: '10mm Woofer + 5.3mm Tweeter', group: 'Audio' },
        { name: 'Audio', value: '24-bit Hi-Fi, 360 Audio', group: 'Audio' },
        { name: 'ANC', value: 'Intelligent Active Noise Cancellation', group: 'Audio' },
        { name: 'Battery', value: '5 hours (18 hours with case)', group: 'Battery' },
        { name: 'Connectivity', value: 'Bluetooth 5.3', group: 'Connectivity' },
        { name: 'Water Resistance', value: 'IPX7 (earbuds), IPX4 (case)', group: 'Durability' },
        { name: 'Weight', value: '5.5g per earbud', group: 'Physical' },
        { name: 'Color', value: 'Graphite', group: 'Physical' },
      ],
      warranty: '1 Year Samsung Manufacturer Warranty',
      price: 899,
      stockQuantity: 20,
      lowStockThreshold: 5,
      images: [
        { id: uuidv4(), url: productImages.earbuds[0], alt: 'Samsung Galaxy Buds2 Pro Graphite', isPrimary: true, order: 0 },
      ],
      categoryId: audioAndWearablesCat._id,
      subcategoryId: wirelessEarbudsCat?._id,
      tags: ['samsung', 'earbuds', 'wireless', 'anc', 'bluetooth', 'hi-fi'],
      isActive: true,
      isFeatured: false,
      averageRating: 4.8,
      reviewCount: 189,
      soldCount: 345,
      viewCount: 4200,
    },
    // Baseus 65W GaN Charger
    {
      title: 'Baseus 65W GaN Charger',
      brand: 'Baseus',
      sku: 'TPX-BSS-001',
      description: 'Ultra-compact yet incredibly powerful. The Baseus 65W GaN5 charger uses Gallium Nitride technology to deliver laptop-grade power in a pocket-sized form factor. With 3 ports (2x USB-C + 1x USB-A), charge your phone, tablet, and laptop simultaneously. Smart power distribution automatically allocates optimal charging speed to each device. Compatible with iPhone, Samsung, MacBook, iPad, and more. Foldable plug design makes it perfect for travel.',
      shortDescription: 'Baseus 65W GaN charger with 3 ports, foldable plug, and smart power distribution.',
      specs: [
        { name: 'Output', value: '65W max (single port)', group: 'Power' },
        { name: 'Ports', value: '2x USB-C + 1x USB-A', group: 'Connectivity' },
        { name: 'Technology', value: 'GaN5 (Gallium Nitride)', group: 'Technology' },
        { name: 'Input', value: '100-240V, 50/60Hz', group: 'Power' },
        { name: 'Weight', value: '120g', group: 'Physical' },
        { name: 'Dimensions', value: '3.5 x 3.5 x 4.0 cm', group: 'Physical' },
        { name: 'Plug', value: 'Foldable Prongs', group: 'Physical' },
        { name: 'Safety', value: 'Over-current, Over-voltage, Short-circuit Protection', group: 'Safety' },
      ],
      warranty: '1 Year Baseus Manufacturer Warranty',
      price: 199,
      compareAtPrice: 249,
      discount: 20,
      stockQuantity: 18,
      lowStockThreshold: 4,
      images: [
        { id: uuidv4(), url: productImages.chargers[0], alt: 'Baseus 65W GaN Charger White', isPrimary: true, order: 0 },
      ],
      categoryId: chargingAndPowerCat._id,
      subcategoryId: chargersAndCablesCat?._id,
      tags: ['baseus', 'charger', 'gan', '65w', 'usb-c', 'fast-charging', 'travel'],
      isActive: true,
      isFeatured: true,
      averageRating: 4.7,
      reviewCount: 234,
      soldCount: 189,
      viewCount: 5600,
    },
    // Xbox Elite Controller Series 2
    {
      title: 'Xbox Elite Controller Series 2',
      brand: 'Microsoft',
      sku: 'TPX-XBX-001',
      description: 'Designed for competitive gamers. The Xbox Elite Wireless Controller Series 2 features adjustable-tension thumbsticks, shorter hair trigger locks, and a wrap-around rubberized grip. Includes 6 interchangeable thumbstick and paddle configurations. Up to 40 hours of rechargeable battery life. Compatible with Xbox Series X|S, Xbox One, Windows PC, and mobile via Bluetooth. Save up to 3 custom profiles and switch between them on the fly.',
      shortDescription: 'Xbox Elite Controller Series 2 with adjustable thumbsticks, 40-hour battery, and custom profiles.',
      specs: [
        { name: 'Connectivity', value: 'Xbox Wireless, Bluetooth, USB-C', group: 'Connectivity' },
        { name: 'Battery', value: 'Up to 40 hours rechargeable', group: 'Battery' },
        { name: 'Compatibility', value: 'Xbox Series X|S, Xbox One, PC, Mobile', group: 'Compatibility' },
        { name: 'Thumbstick Options', value: '6 interchangeable components', group: 'Features' },
        { name: 'Trigger Locks', value: '3-step hair trigger locks', group: 'Features' },
        { name: 'Profiles', value: '3 custom profiles + 1 default', group: 'Features' },
        { name: 'Weight', value: '345g', group: 'Physical' },
        { name: 'Color', value: 'Black', group: 'Physical' },
      ],
      warranty: '6 Months Microsoft Manufacturer Warranty',
      price: 749,
      stockQuantity: 22,
      lowStockThreshold: 5,
      images: [
        { id: uuidv4(), url: productImages.gaming[0], alt: 'Xbox Elite Controller Series 2 Black', isPrimary: true, order: 0 },
      ],
      categoryId: gamingAndAccessoriesCat._id,
      subcategoryId: gamingControllersCat?._id,
      tags: ['xbox', 'controller', 'gaming', 'elite', 'wireless', 'pc-gaming'],
      isActive: true,
      isFeatured: true,
      averageRating: 4.9,
      reviewCount: 456,
      soldCount: 678,
      viewCount: 9800,
    },
    // JBL Flip 6
    {
      title: 'JBL Flip 6 Bluetooth Speaker',
      brand: 'JBL',
      sku: 'TPX-JBL-001',
      description: 'Bold sound for every adventure. The JBL Flip 6 delivers powerful JBL Original Pro Sound with an optimized racetrack-shaped driver and dual passive radiators for deep bass. IP67 waterproof and dustproof rating means you can take it to the pool, beach, or anywhere outdoors. 12 hours of playtime on a single charge. PartyBoost feature lets you pair two JBL PartyBoost-compatible speakers for stereo sound or link multiple speakers for an even bigger sound experience.',
      shortDescription: 'JBL Flip 6 portable Bluetooth speaker with IP67 waterproof rating and 12-hour battery.',
      specs: [
        { name: 'Driver', value: 'Racetrack-shaped driver + dual passive radiators', group: 'Audio' },
        { name: 'Output', value: '30W', group: 'Audio' },
        { name: 'Battery', value: '12 hours playtime', group: 'Battery' },
        { name: 'Waterproof', value: 'IP67 (waterproof & dustproof)', group: 'Durability' },
        { name: 'Connectivity', value: 'Bluetooth 5.1', group: 'Connectivity' },
        { name: 'Feature', value: 'JBL PartyBoost for multi-speaker pairing', group: 'Features' },
        { name: 'Weight', value: '550g', group: 'Physical' },
        { name: 'Dimensions', value: '17.8 x 6.8 x 7.2 cm', group: 'Physical' },
      ],
      warranty: '1 Year JBL Manufacturer Warranty',
      price: 449,
      compareAtPrice: 549,
      discount: 18,
      stockQuantity: 35,
      lowStockThreshold: 8,
      images: [
        { id: uuidv4(), url: productImages.speakers[0], alt: 'JBL Flip 6 Bluetooth Speaker Blue', isPrimary: true, order: 0 },
      ],
      categoryId: audioAndWearablesCat._id,
      subcategoryId: headphonesCat?._id,
      tags: ['jbl', 'speaker', 'bluetooth', 'portable', 'waterproof', 'outdoor'],
      isActive: true,
      isFeatured: false,
      averageRating: 4.5,
      reviewCount: 167,
      soldCount: 289,
      viewCount: 3400,
    },
    // Xiaomi Pad 6 Pro
    {
      title: 'Xiaomi Pad 6 Pro',
      brand: 'Xiaomi',
      sku: 'TPX-XMI-001',
      description: 'A premium tablet experience at an unbeatable price. The Xiaomi Pad 6 Pro features a stunning 11-inch 2.8K IPS display with 144Hz refresh rate and Dolby Vision for cinematic viewing. Powered by the Snapdragon 8+ Gen 1 processor with 8GB RAM for blazing-fast performance. Quad speakers with Dolby Atmos deliver immersive surround sound. The 8,600mAh battery with 67W fast charging keeps you going all day. Supports Xiaomi Smart Pen (2nd gen) and keyboard accessories.',
      shortDescription: 'Xiaomi Pad 6 Pro with 11" 2.8K 144Hz display, Snapdragon 8+ Gen 1, and 8600mAh battery.',
      specs: [
        { name: 'Display', value: '11" 2.8K IPS, 144Hz, Dolby Vision', group: 'Display' },
        { name: 'Processor', value: 'Snapdragon 8+ Gen 1', group: 'Performance' },
        { name: 'RAM', value: '8GB', group: 'Memory' },
        { name: 'Storage', value: '256GB', group: 'Memory' },
        { name: 'Battery', value: '8,600mAh with 67W fast charging', group: 'Battery' },
        { name: 'Speakers', value: 'Quad speakers, Dolby Atmos', group: 'Audio' },
        { name: 'Camera', value: '50MP rear + 20MP front', group: 'Camera' },
        { name: 'Weight', value: '490g', group: 'Physical' },
      ],
      warranty: '1 Year Xiaomi Manufacturer Warranty',
      price: 1799,
      stockQuantity: 8,
      lowStockThreshold: 2,
      images: [
        { id: uuidv4(), url: productImages.tablets[1], alt: 'Xiaomi Pad 6 Pro with Keyboard', isPrimary: true, order: 0 },
      ],
      categoryId: smartphonesAndTabletsCat._id,
      subcategoryId: tabletsCat?._id,
      tags: ['xiaomi', 'tablet', 'pad', '144hz', 'snapdragon', 'dolby-atmos'],
      isActive: true,
      isFeatured: true,
      averageRating: 4.6,
      reviewCount: 78,
      soldCount: 45,
      viewCount: 2100,
    },
  ]);

  console.log(`✅ Created ${products.length} products`);
  return products;
}

async function seedReviews(products: any[], users: any[]): Promise<void> {
  console.log('⭐ Seeding reviews...');

  const reviewsData = [];
  const comments = [
    'Great phone! The camera quality is outstanding.',
    'Battery lasts all day, even with heavy use. Highly recommend.',
    'Amazing sound quality. Best headphones I have ever owned.',
    'Fast charging is a game changer. Fully charged in under an hour.',
    'Perfect fit and premium feel. Worth every penny.',
    'Excellent build quality. Does exactly what it is supposed to do.',
    'Very happy with this purchase. Will buy more from Tapix.',
    'Great value for money. Delivery was fast and packaging was perfect.',
  ];

  for (const product of products) {
    const reviewCount = Math.floor(Math.random() * 5) + 2;
    for (let i = 0; i < reviewCount; i++) {
      const user = users[Math.floor(Math.random() * users.length)];
      reviewsData.push({
        productId: product._id,
        userId: user._id,
        userName: `${user.firstName} ${user.lastName}`,
        orderId: new mongoose.Types.ObjectId(), // Placeholder order ID for seeding
        rating: Math.floor(Math.random() * 2) + 4,
        comment: comments[Math.floor(Math.random() * comments.length)],
        status: 'approved',
        isVerifiedPurchase: Math.random() > 0.3,
        helpfulCount: Math.floor(Math.random() * 20),
      });
    }
  }

  await Review.create(reviewsData);
  console.log(`✅ Created ${reviewsData.length} reviews`);
}

async function seedOrders(products: any[], users: any[], admins: { admin: any; superAdmin: any }): Promise<void> {
  console.log('📋 Seeding orders...');

  const statuses: Array<'new' | 'accepted' | 'in_progress' | 'out_for_delivery' | 'delivered' | 'cancelled'> = [
    'new',
    'accepted',
    'in_progress',
    'out_for_delivery',
    'delivered',
    'cancelled',
  ];

  const ordersData = [];

  for (let i = 0; i < 20; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const itemCount = Math.floor(Math.random() * 3) + 1;
    const selectedProducts = products.sort(() => 0.5 - Math.random()).slice(0, itemCount);

    const items = selectedProducts.map((product: any) => ({
      productId: product._id,
      title: product.title,
      sku: product.sku,
      price: product.price,
      quantity: Math.floor(Math.random() * 2) + 1,
      image: product.images[0]?.url,
    }));

    const subtotal = items.reduce((acc: number, item: any) => acc + item.price * item.quantity, 0);
    const shippingCost = subtotal > 2000 ? 0 : 50;
    const discount = Math.random() > 0.7 ? Math.floor(subtotal * 0.1) : 0;
    const total = subtotal + shippingCost - discount;

    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const statusHistory: Array<{
      status: 'new' | 'accepted' | 'in_progress' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'failed';
      timestamp: Date;
      updatedBy: any;
      note?: string;
    }> = [
      {
        status: 'new',
        timestamp: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)),
        updatedBy: user._id,
      },
    ];

    if (status !== 'new') {
      const statusOrder = ['accepted', 'in_progress', 'out_for_delivery', 'delivered'];
      const cancelledIndex = statusOrder.indexOf(status);

      for (let j = 0; j <= cancelledIndex && j < statusOrder.length; j++) {
        if (status === 'cancelled' && j === cancelledIndex) {
          statusHistory.push({
            status: 'cancelled' as const,
            timestamp: new Date(Date.now() - Math.floor(Math.random() * 3 * 24 * 60 * 60 * 1000)),
            updatedBy: admins.admin._id,
          });
        } else if (statusOrder[j]) {
          statusHistory.push({
            status: statusOrder[j] as any,
            timestamp: new Date(Date.now() - Math.floor(Math.random() * (7 - j) * 24 * 60 * 60 * 1000)),
            updatedBy: admins.admin._id,
          });
        }
      }
    }

    ordersData.push({
      userId: user._id,
      items,
      subtotal,
      shippingCost,
      discount,
      discountCode: discount > 0 ? 'WELCOME10' : undefined,
      total,
      status,
      statusHistory,
      paymentMethod: Math.random() > 0.5 ? 'cash_on_delivery' : 'card',
      paymentStatus: status === 'delivered' ? 'paid' : status === 'cancelled' ? 'refunded' : 'pending',
      shippingAddress: {
        fullName: `${user.firstName} ${user.lastName}`,
        phone: user.phone || '+201234567890',
        email: user.email,
        fullAddress: user.addresses?.[0]?.fullAddress || '123 Sample Street',
        city: user.addresses?.[0]?.city || 'Cairo',
        area: user.addresses?.[0]?.area || 'Maadi',
      },
      estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      deliveredAt: status === 'delivered' ? new Date() : undefined,
      cancelledAt: status === 'cancelled' ? new Date() : undefined,
      cancelReason: status === 'cancelled' ? 'Customer requested cancellation' : undefined,
    });
  }

  await Order.create(ordersData);
  console.log(`✅ Created ${ordersData.length} orders`);
}

async function seedOffers(): Promise<void> {
  console.log('🏷️  Seeding offers...');

  const offers = await Offer.create([
    {
      title: 'Welcome Discount',
      description: 'Get 10% off your first order',
      code: 'WELCOME10',
      type: 'percentage',
      value: 10,
      maxDiscount: 500,
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      isActive: true,
    },
    {
      title: 'Summer Tech Sale',
      description: 'Flat SAR 200 off on orders above SAR 5000',
      code: 'SUMMER200',
      type: 'fixed',
      value: 200,
      minOrderAmount: 5000,
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isActive: true,
    },
    {
      title: 'Accessories Bundle Deal',
      description: '15% off when you buy 2 or more accessories',
      code: 'BUNDLE15',
      type: 'percentage',
      value: 15,
      maxDiscount: 1000,
      usageLimit: 100,
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isActive: true,
    },
  ]);

  console.log(`✅ Created ${offers.length} offers`);
}

async function seedBanners(): Promise<void> {
  console.log('🖼️  Seeding banners...');

  const banners = await Banner.create([
    {
      title: 'Latest Smartphones - Up to 30% Off',
      subtitle: 'Upgrade to the newest iPhone and Samsung Galaxy devices',
      image: bannerImages[0],
      link: '/products?category=smartphones-tablets',
      position: 'hero_main',
      order: 1,
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isActive: true,
    },
    {
      title: 'Premium Audio Gear',
      subtitle: 'Discover top-rated headphones, earbuds, and speakers',
      image: bannerImages[1],
      link: '/products?sort=newest',
      position: 'hero_secondary',
      order: 2,
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      isActive: true,
    },
    {
      title: 'Power Up Your Devices',
      subtitle: 'Free shipping on orders over SAR 2000',
      image: bannerImages[2],
      link: '/products',
      position: 'home_middle',
      order: 1,
      isActive: true,
    },
  ]);

  console.log(`✅ Created ${banners.length} banners`);
}

async function seedBlog(authorId: mongoose.Types.ObjectId): Promise<void> {
  console.log('📝 Seeding blog posts...');

  const posts = await BlogPost.create([
    {
      title: 'How to Choose the Perfect Smartphone in 2025',
      slug: 'how-to-choose-perfect-smartphone-2025',
      excerpt: 'A comprehensive guide to finding the right smartphone based on your budget, camera needs, battery life, and daily usage habits.',
      authorId,
      content: `
# How to Choose the Perfect Smartphone in 2025

With hundreds of smartphones on the market, picking the right one can be overwhelming. Here's everything you need to consider before making your purchase:

## 1. Set Your Budget
Smartphones range from budget-friendly to premium flagship models. Define your price range first to narrow down your options. Great devices exist at every price point.

## 2. Camera Quality
- **Flagship**: 200MP sensors, 5x optical zoom, pro-grade video (Samsung S24 Ultra, iPhone 15 Pro Max)
- **Mid-range**: 108MP sensors, good low-light performance (Samsung A55, Xiaomi 14)
- **Budget**: 50MP sensors, decent daylight photography (Redmi Note 13, Samsung A25)

## 3. Battery Life
Look for at least 4,500mAh for all-day usage. Fast charging support (65W+) is a game changer — you can go from 0 to 50% in under 20 minutes.

## 4. Performance
- **For gamers & power users**: Snapdragon 8 Gen 3, Apple A17 Pro
- **For everyday use**: Snapdragon 7 series, MediaTek Dimensity 8000+
- **For light users**: Snapdragon 6 series, MediaTek Helio

## 5. Display Quality
AMOLED displays offer better contrast and deeper blacks. Look for 120Hz refresh rate for smooth scrolling and gaming. Brightness of 1000+ nits ensures outdoor visibility.

## Key Takeaway
The best smartphone is the one that fits YOUR specific needs. Don't overspend on features you won't use, but don't skimp on what matters most to you.
      `,
      image: blogImages[0],
      author: 'Tapix Team',
      tags: ['smartphones', 'buying-guide', 'mobile-phones'],
      status: 'published',
      publishedAt: new Date(),
    },
    {
      title: 'Top 10 Must-Have Mobile Accessories',
      slug: 'top-10-must-have-mobile-accessories',
      excerpt: 'From fast chargers to protective cases, these are the essential mobile accessories every smartphone owner should have.',
      authorId,
      content: `
# Top 10 Must-Have Mobile Accessories

Your smartphone is only as good as its accessories. Here are the 10 accessories that will enhance your mobile experience:

## 1. Fast Charger (65W+)
Stop waiting hours for your phone to charge. A 65W GaN charger can fully charge most phones in under 45 minutes and is compact enough for travel.

## 2. Quality Phone Case
A good case protects your investment. Look for MagSafe-compatible cases for iPhones or reinforced corner protection for drop safety.

## 3. Wireless Earbuds
True wireless earbuds with ANC (Active Noise Cancellation) are essential for commuting, calls, and music. Top picks: AirPods Pro, Galaxy Buds2 Pro.

## 4. Screen Protector
Tempered glass screen protectors prevent scratches and cracks. Apply one on day one — it's the cheapest insurance for your phone.

## 5. Power Bank (20,000mAh+)
For travelers and heavy users, a power bank with at least 20,000mAh and fast charging support is a lifesaver.

## 6. Car Phone Mount
A magnetic or MagSafe car mount keeps your phone secure for navigation while driving safely.

## 7. USB-C Hub or Adapter
Connect your phone to monitors, USB drives, and SD cards with a compact USB-C hub.

## 8. Bluetooth Speaker
A portable Bluetooth speaker transforms your phone into a party system. Look for IP67 waterproof ratings.

## 9. Smartwatch
Pair your phone with a smartwatch for health tracking, notifications, and quick replies without reaching for your phone.

## 10. Portable Stand or Grip
A PopSocket or phone stand makes video calls, watching content, and one-handed use much more comfortable.
      `,
      image: blogImages[1],
      author: 'Tapix Team',
      tags: ['accessories', 'mobile-accessories', 'buying-guide'],
      status: 'published',
      publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    },
    {
      title: 'Smart Watches vs Fitness Trackers: Which One to Buy?',
      slug: 'smart-watches-vs-fitness-trackers-which-one-to-buy',
      excerpt: 'Understanding the key differences between smart watches and fitness trackers to help you make the right choice for your lifestyle.',
      authorId,
      content: `
# Smart Watches vs Fitness Trackers: Which One to Buy?

Both devices sit on your wrist, but they serve very different purposes. Here's a detailed comparison to help you decide:

## Smart Watches

### Pros
- Full app ecosystem (maps, music, payments)
- Reply to messages and take calls from your wrist
- Customizable watch faces and premium design
- Advanced health features (ECG, blood oxygen, temperature)

### Cons
- Higher price (SAR 1,500 - 5,000+)
- Shorter battery life (1-2 days typically)
- Requires a compatible smartphone

### Best For
People who want a mini smartphone on their wrist. Ideal for professionals, tech enthusiasts, and those who want premium health monitoring.

## Fitness Trackers

### Pros
- Excellent battery life (7-14 days)
- Lightweight and comfortable for 24/7 wear
- Focused on health and fitness metrics
- More affordable (SAR 300 - 1,500)

### Cons
- Limited app support
- Smaller, simpler displays
- Fewer smart features

### Best For
Fitness-focused individuals who primarily want step counting, sleep tracking, and workout monitoring without the bulk of a smartwatch.

## Our Recommendation

If you want the best of both worlds, the **Apple Watch Series 9** or **Samsung Galaxy Watch 6** offer comprehensive health tracking WITH smart features. If budget and battery life are priorities, a **Xiaomi Smart Band 8** or **Fitbit Charge 6** will serve you well.
      `,
      image: blogImages[2],
      author: 'Tapix Team',
      tags: ['smartwatch', 'fitness-tracker', 'wearables', 'buying-guide'],
      status: 'published',
      publishedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    },
  ]);

  console.log(`✅ Created ${posts.length} blog posts`);
}

async function seedCMS(updatedBy: mongoose.Types.ObjectId): Promise<void> {
  console.log('📄 Seeding CMS content...');

  const cms = await CMSContent.create([
    {
      key: 'about',
      type: 'html',
      updatedBy,
      value: `
# About Tapix

**Tapix** is a leading online electronics store offering premium smartphones, smart accessories, and cutting-edge gadgets. Founded with a vision to make the latest technology accessible to everyone, we've grown to become a trusted destination for tech enthusiasts and everyday users alike.

## Our Mission

To provide customers with access to the best electronics and smart accessories, backed by exceptional customer service and expert guidance.

## Our Values

- **Quality First**: We only sell genuine, brand-new products from authorized distributors
- **Customer Focus**: Your satisfaction is our priority
- **Expert Guidance**: Our team helps you choose the right product for your needs
- **Reliable Service**: From fast shipping to hassle-free returns

## Why Choose Tapix?

- Curated selection of premium electronics and accessories
- Competitive pricing with regular deals and offers
- Free shipping on orders over SAR 2000
- 1-year manufacturer warranty on all products
- Easy returns within 14 days
- Dedicated customer support team

Browse our store online to find the perfect gadget for your lifestyle.
      `,
    },
    {
      key: 'privacy-policy',
      type: 'html',
      updatedBy,
      value: `
# Privacy Policy

Last updated: ${new Date().toLocaleDateString()}

## Information We Collect

We collect information you provide directly, including:
- Name, email, phone number
- Shipping and billing addresses
- Payment information
- Order history

## How We Use Your Information

We use your information to:
- Process and fulfill orders
- Send order confirmations and shipping updates
- Provide customer support
- Send marketing communications (with your consent)
- Improve our services

## Data Security

We implement industry-standard security measures to protect your data. Payment information is processed securely through our payment partners.

## Your Rights

You have the right to:
- Access your personal data
- Correct inaccurate data
- Request deletion of your data
- Opt-out of marketing communications

## Contact Us

For privacy-related inquiries, contact us at privacy@tapix.com
      `,
    },
    {
      key: 'terms-conditions',
      type: 'html',
      updatedBy,
      value: `
# Terms & Conditions

## General

By using Tapix's website and services, you agree to these terms and conditions.

## Orders

- All orders are subject to availability
- Prices are in Saudi Riyals (SAR) and include VAT
- We reserve the right to cancel orders due to pricing errors

## Shipping and Delivery

- Standard shipping: 2-5 business days
- Express shipping available for select items
- Free shipping on orders over SAR 2000

## Returns and Refunds

- 14-day return policy on all products
- Items must be in original packaging and unused condition
- Defective products will be replaced or refunded

## Warranty

- All products come with manufacturer warranty
- Extended warranty plans available at checkout
- Warranty claims handled through our support team

## Limitation of Liability

Tapix is not liable for indirect, incidental, or consequential damages arising from the use of our products or services.
      `,
    },
    {
      key: 'return-policy',
      type: 'html',
      updatedBy,
      value: `
# Returns & Exchanges

## Return Window

You have 14 days from delivery to return or exchange any product.

## Eligibility

Products must be:
- In original, unopened packaging, OR
- Defective or not matching the product description

## Non-Returnable Items

- Products with broken seals (earbuds, headphones opened from sealed packaging)
- Products with physical damage caused by the customer
- Items purchased on final sale or clearance

## How to Request a Return

1. Contact our support team to initiate a return
2. Receive a return authorization number
3. Ship the product back in its original packaging
4. Our team will inspect and process your return within 2 business days

## Refunds

- Refunds processed within 7-10 business days
- Original shipping fees are non-refundable
- Refund issued to original payment method
      `,
    },
    {
      key: 'shipping-info',
      type: 'html',
      updatedBy,
      value: `
# Shipping & Delivery

## Delivery Areas

We deliver across Egypt and internationally:
- Cairo & Giza (1-2 business days)
- Alexandria & Delta cities (2-3 business days)
- Upper Egypt (3-5 business days)
- International shipping (5-10 business days)

## Shipping Fees

- Orders over SAR 2,000: FREE shipping
- Orders under SAR 2,000: SAR 50 flat shipping fee

## Order Processing

- Orders placed before 2:00 PM are shipped the same business day
- Orders placed after 2:00 PM or on weekends are shipped the next business day
- You will receive a tracking number via email once your order ships

## Package Handling

All electronics are carefully packaged with:
- Original manufacturer box
- Bubble wrap and protective padding
- Sealed shipping box with tamper-evident tape

## Tracking Your Order

Track your order status:
- In your account dashboard
- Via the tracking link in your shipping email
- By contacting our support team
      `,
    },
  ]);

  console.log(`✅ Created ${cms.length} CMS pages`);
}

async function main(): Promise<void> {
  console.log('\n🌱 Tapix Database Seed Script\n');
  console.log('================================\n');

  try {
    // Connect to database
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(config.mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Clear existing data
    await clearDatabase();

    // Seed data
    const { superAdmin, admin, users } = await seedUsers();
    const categories = await seedCategories();
    const products = await seedProducts(categories);
    await seedReviews(products, users);
    await seedOrders(products, users, { admin, superAdmin });
    await seedOffers();
    await seedBanners();
    await seedBlog(superAdmin._id);
    await seedCMS(superAdmin._id);

    console.log('\n================================');
    console.log('✅ Database seeded successfully!\n');
    console.log('Demo Accounts:');
    console.log('--------------------------------');
    console.log('Super Admin: admin@tapix.com / admin123');
    console.log('Admin: staff@tapix.com / staff123');
    console.log('User: user@tapix.com / user123');
    console.log('================================\n');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

main();
