// ============================================
// Tapix API - Cleanup Seed/Fake Data Script
// ============================================
// Removes all seeded data while preserving real user data.
// Keeps: admin accounts, categories, products, brands, banners, blog, CMS
// Removes: fake orders, reviews, seeded offers, fake users, stock movements, etc.

import mongoose from 'mongoose';
import { config } from '../config';
import { User } from '../models/User';
import { Order } from '../models/Order';
import { Review } from '../models/Review';
import { Offer } from '../models/Offer';
import { Product } from '../models/Product';
import { Notification } from '../models/Notification';
import { AuditLog } from '../models/AuditLog';

// Dynamic imports for models that may or may not exist
async function getModel(name: string) {
  try {
    return mongoose.model(name);
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  console.log('\n🧹 Tapix - Cleanup Seed/Fake Data\n');
  console.log('================================\n');

  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(config.mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // 1. Delete ALL orders (all 20 are seeded)
    const orderCount = await Order.countDocuments();
    await Order.deleteMany({});
    console.log(`🗑️  Deleted ${orderCount} orders`);

    // 2. Delete ALL reviews (all seeded with fake orderId references)
    const reviewCount = await Review.countDocuments();
    await Review.deleteMany({});
    console.log(`🗑️  Deleted ${reviewCount} reviews`);

    // 3. Delete seeded offers (keep user-created ones)
    const seededOfferCodes = ['WELCOME10', 'SUMMER200', 'WEEKEND15'];
    const offerResult = await Offer.deleteMany({ code: { $in: seededOfferCodes } });
    console.log(`🗑️  Deleted ${offerResult.deletedCount} seeded offers (WELCOME10, SUMMER200, WEEKEND15)`);

    // List remaining offers
    const remainingOffers = await Offer.find({}, 'title code type value').lean();
    if (remainingOffers.length > 0) {
      console.log(`   Remaining offers: ${remainingOffers.map(o => `${o.code} (${o.value}${o.type === 'percentage' ? '%' : ' SAR'})`).join(', ')}`);
    }

    // 4. Delete fake users (keep admin@tapix.com, staff@tapix.com, user@tapix.com)
    const fakeEmails = ['fatma@example.com', 'omar@example.com'];
    const userResult = await User.deleteMany({ email: { $in: fakeEmails } });
    console.log(`🗑️  Deleted ${userResult.deletedCount} fake users (fatma, omar)`);

    // List remaining users
    const remainingUsers = await User.find({}, 'email firstName lastName role').lean();
    console.log(`   Remaining users: ${remainingUsers.map(u => `${u.email} (${u.role})`).join(', ')}`);

    // 5. Clear all stock movements
    try {
      const StockMovement = mongoose.model('StockMovement');
      const smCount = await StockMovement.countDocuments();
      await StockMovement.deleteMany({});
      console.log(`🗑️  Deleted ${smCount} stock movements`);
    } catch {
      console.log('ℹ️  No StockMovement collection found');
    }

    // 6. Clear all transactions
    try {
      const Transaction = mongoose.model('Transaction');
      const txCount = await Transaction.countDocuments();
      await Transaction.deleteMany({});
      console.log(`🗑️  Deleted ${txCount} transactions`);
    } catch {
      console.log('ℹ️  No Transaction collection found');
    }

    // 7. Clear all expenses
    try {
      const Expense = mongoose.model('Expense');
      const expCount = await Expense.countDocuments();
      await Expense.deleteMany({});
      console.log(`🗑️  Deleted ${expCount} expenses`);
    } catch {
      console.log('ℹ️  No Expense collection found');
    }

    // 8. Clear notifications
    const notifCount = await Notification.countDocuments();
    await Notification.deleteMany({});
    console.log(`🗑️  Deleted ${notifCount} notifications`);

    // 9. Clear audit logs
    const auditCount = await AuditLog.countDocuments();
    await AuditLog.deleteMany({});
    console.log(`🗑️  Deleted ${auditCount} audit logs`);

    // 10. Clear all carts
    try {
      const Cart = mongoose.model('Cart');
      const cartCount = await Cart.countDocuments();
      await Cart.deleteMany({});
      console.log(`🗑️  Deleted ${cartCount} carts`);
    } catch {
      console.log('ℹ️  No Cart collection found');
    }

    // 11. Reset product stats to 0 (since all reviews and orders were fake)
    const productUpdateResult = await Product.updateMany(
      {},
      {
        $set: {
          averageRating: 0,
          reviewCount: 0,
          soldCount: 0,
          viewCount: 0,
        },
      }
    );
    console.log(`🔄 Reset stats for ${productUpdateResult.modifiedCount} products (rating, reviews, sold, views → 0)`);

    // 12. Reset user order/review counts
    await User.updateMany(
      {},
      {
        $set: {
          ordersCount: 0,
          wishlistCount: 0,
          reviewsCount: 0,
        },
      }
    );
    console.log('🔄 Reset user order/review/wishlist counts to 0');

    // Summary
    console.log('\n================================');
    console.log('✅ Cleanup complete!\n');
    console.log('What was KEPT:');
    console.log('  - Admin accounts (admin@tapix.com, staff@tapix.com)');
    console.log('  - User account (user@tapix.com)');
    console.log('  - All categories & subcategories');
    console.log('  - All products (stats reset to 0)');
    console.log('  - All brands');
    console.log('  - Banners');
    console.log('  - Blog posts');
    console.log('  - CMS content (about, policies, etc.)');
    console.log('  - User-created offers');
    console.log('\nWhat was REMOVED:');
    console.log('  - All orders');
    console.log('  - All reviews');
    console.log('  - Seeded offers (WELCOME10, SUMMER200, WEEKEND15)');
    console.log('  - Fake users (fatma, omar)');
    console.log('  - Stock movements, transactions, expenses');
    console.log('  - Notifications & audit logs');
    console.log('================================\n');
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

main();
