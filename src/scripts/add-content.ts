// ============================================
// Tapix API - Add Blog Posts and Banners Script
// ============================================

import mongoose from 'mongoose';
import { config } from '../config';
import { User } from '../models/User';
import { Banner } from '../models/Banner';
import { BlogPost, BlogCategory } from '../models/Blog';

const blogImages = [
  'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800',
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
  'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800',
];

const bannerImages = [
  'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=1600',
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1600',
];

async function main(): Promise<void> {
  console.log('\n🌱 Adding Blog Posts and Banners\n');

  try {
    // Connect to database
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(config.mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Get super admin user for authorId
    const superAdmin = await User.findOne({ role: 'super_admin' });
    if (!superAdmin) {
      console.log('❌ No super admin found. Run the main seed script first.');
      process.exit(1);
    }

    // Delete existing banners
    console.log('🗑️  Deleting existing banners...');
    await Banner.deleteMany({});
    console.log('✅ Banners deleted');

    // Create new banners with hero_main position
    console.log('🖼️  Creating new banners...');
    const banners = await Banner.create([
      {
        title: 'Latest Smartphones & Gadgets',
        subtitle: 'Up to 30% Off Summer Tech Sale',
        image: bannerImages[0],
        link: '/products',
        linkText: 'Shop Now',
        position: 'hero_main',
        order: 1,
        isActive: true,
      },
      {
        title: 'Premium Audio & Wearables',
        subtitle: 'Top-Rated Headphones, Earbuds & Smart Watches',
        image: bannerImages[1],
        link: '/categories/audio-wearables',
        linkText: 'Explore Collection',
        position: 'hero_main',
        order: 2,
        isActive: true,
      },
    ]);
    console.log(`✅ Created ${banners.length} banners`);

    // Check existing blog posts
    const existingPosts = await BlogPost.countDocuments();
    console.log(`📝 Found ${existingPosts} existing blog posts`);

    if (existingPosts === 0) {
      // Create blog posts
      console.log('📝 Creating blog posts...');
      const posts = await BlogPost.create([
        {
          title: 'How to Choose the Perfect Smartphone in 2025',
          excerpt: 'A comprehensive guide to finding the right smartphone based on your budget, camera needs, battery life, and daily usage habits.',
          authorId: superAdmin._id,
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
          featuredImage: blogImages[0],
          tags: ['smartphones', 'buying-guide', 'mobile-phones'],
          isPublished: true,
          publishedAt: new Date(),
        },
        {
          title: 'Top 10 Must-Have Mobile Accessories',
          excerpt: 'From fast chargers to protective cases, these are the essential mobile accessories every smartphone owner should have.',
          authorId: superAdmin._id,
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
          featuredImage: blogImages[1],
          tags: ['accessories', 'mobile-accessories', 'buying-guide'],
          isPublished: true,
          publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      ]);
      console.log(`✅ Created ${posts.length} blog posts`);
    } else {
      console.log('ℹ️  Blog posts already exist, skipping creation');
    }

    console.log('\n================================');
    console.log('✅ Content added successfully!');
    console.log('================================\n');
  } catch (error) {
    console.error('❌ Failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

main();
