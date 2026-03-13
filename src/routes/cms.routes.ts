// ============================================
// Tapix API - CMS Routes
// ============================================

import { Router, Response } from 'express';
import mongoose from 'mongoose';
import {
  updateCMSContentSchema,
  updatePolicyPageSchema,
  createFAQSchema,
  updateFAQSchema,
  subscribeNewsletterSchema,
  createContactMessageSchema,
} from '@tapix/shared';
import { CMSContent, PolicyPage, FAQ } from '../models/CMS';
import { Newsletter } from '../models/Newsletter';
import { ContactMessage } from '../models/Contact';
import { authenticate, requireAdmin, requireSuperAdmin, requirePermission, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler, NotFoundError, BadRequestError } from '../middleware/errorHandler';
import {
  forwardContactMessage,
  sendNewsletterConfirmation,
  notifyNewSubscriber,
} from '../services/email.service';

const router = Router();

// ========== DEFAULT CONTENT ==========

const defaultPolicies: Record<string, { title: string; content: string }> = {
  privacy: {
    title: 'Privacy Policy',
    content: `
<h2>Introduction</h2>
<p>At Tapix, we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or make a purchase.</p>

<h2>Information We Collect</h2>
<h3>Personal Information</h3>
<p>When you create an account, place an order, or contact us, we may collect:</p>
<ul>
<li>Full name, email address, and phone number</li>
<li>Shipping and billing addresses</li>
<li>Payment information (processed securely through our payment providers)</li>
<li>Order history and preferences</li>
</ul>

<h3>Automatically Collected Information</h3>
<p>When you browse our website, we may automatically collect:</p>
<ul>
<li>IP address and browser type</li>
<li>Device information and operating system</li>
<li>Pages visited and time spent on our site</li>
<li>Referring website addresses</li>
</ul>

<h2>How We Use Your Information</h2>
<p>We use the information we collect to:</p>
<ul>
<li>Process and fulfill your orders</li>
<li>Send order confirmations and shipping updates</li>
<li>Provide customer support and respond to inquiries</li>
<li>Personalize your shopping experience</li>
<li>Send promotional offers and newsletters (with your consent)</li>
<li>Improve our website, products, and services</li>
<li>Prevent fraud and ensure security</li>
</ul>

<h2>Information Sharing</h2>
<p>We do not sell, trade, or rent your personal information to third parties. We may share your information with:</p>
<ul>
<li><strong>Shipping carriers</strong> to deliver your orders</li>
<li><strong>Payment processors</strong> to securely handle transactions</li>
<li><strong>Service providers</strong> who assist in operating our website</li>
<li><strong>Legal authorities</strong> when required by law</li>
</ul>

<h2>Data Security</h2>
<p>We implement industry-standard security measures to protect your personal information, including SSL encryption, secure data storage, and regular security audits. However, no method of transmission over the Internet is 100% secure.</p>

<h2>Cookies</h2>
<p>We use cookies and similar technologies to enhance your browsing experience, remember your preferences, and analyze website traffic. You can manage cookie preferences through your browser settings.</p>

<h2>Your Rights</h2>
<p>You have the right to:</p>
<ul>
<li>Access, update, or delete your personal information</li>
<li>Opt out of marketing communications</li>
<li>Request a copy of the data we hold about you</li>
<li>Lodge a complaint with a data protection authority</li>
</ul>

<h2>Contact Us</h2>
<p>If you have questions about this Privacy Policy or your personal data, please contact us at <a href="mailto:privacy@tapix.com">privacy@tapix.com</a> or through our Contact page.</p>

<p><em>Last updated: February 2026</em></p>
`,
  },
  terms: {
    title: 'Terms of Service',
    content: `
<h2>Agreement to Terms</h2>
<p>By accessing and using the Tapix website, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, please do not use our website.</p>

<h2>Account Registration</h2>
<p>To place orders, you may need to create an account. You are responsible for:</p>
<ul>
<li>Providing accurate and complete registration information</li>
<li>Maintaining the security of your account credentials</li>
<li>All activities that occur under your account</li>
<li>Notifying us immediately of any unauthorized use</li>
</ul>

<h2>Products and Pricing</h2>
<ul>
<li>All product descriptions and images are as accurate as possible, but we do not guarantee that colors or details displayed on your screen are exact.</li>
<li>Prices are listed in SAR and are subject to change without notice.</li>
<li>We reserve the right to limit quantities and refuse any order.</li>
<li>Promotional offers and discounts may have specific terms and expiration dates.</li>
</ul>

<h2>Orders and Payment</h2>
<ul>
<li>By placing an order, you are making an offer to purchase the selected products.</li>
<li>We reserve the right to accept or decline any order.</li>
<li>Payment must be completed at the time of order or upon delivery (for Cash on Delivery).</li>
<li>All payment information is processed securely through trusted payment providers.</li>
</ul>

<h2>Shipping and Delivery</h2>
<p>Shipping and delivery times are estimates and may vary depending on your location and product availability. Please refer to our <a href="/shipping">Shipping & Delivery</a> page for detailed policies.</p>

<h2>Returns and Refunds</h2>
<p>We want you to be completely satisfied with your purchase. If you are not, please review our <a href="/returns">Returns & Exchanges</a> policy for information on how to return products or request refunds.</p>

<h2>Intellectual Property</h2>
<p>All content on the Tapix website, including text, graphics, logos, images, and software, is the property of Tapix or its content suppliers and is protected by intellectual property laws. You may not reproduce, distribute, or use any content without our written permission.</p>

<h2>Limitation of Liability</h2>
<p>Tapix shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of our website or products. Our total liability shall not exceed the amount paid for the product in question.</p>

<h2>User Conduct</h2>
<p>You agree not to:</p>
<ul>
<li>Use the website for any unlawful purpose</li>
<li>Attempt to gain unauthorized access to any part of the website</li>
<li>Interfere with the proper functioning of the website</li>
<li>Submit false or misleading information</li>
<li>Use automated tools to access or scrape the website</li>
</ul>

<h2>Changes to Terms</h2>
<p>We reserve the right to update these Terms of Service at any time. Changes will be effective immediately upon posting. Your continued use of the website constitutes acceptance of the updated terms.</p>

<h2>Governing Law</h2>
<p>These terms are governed by the laws of the Arab Republic of Egypt. Any disputes shall be resolved in the competent courts of Egypt.</p>

<h2>Contact Us</h2>
<p>For questions about these Terms of Service, please contact us at <a href="mailto:legal@tapix.com">legal@tapix.com</a> or through our Contact page.</p>

<p><em>Last updated: February 2026</em></p>
`,
  },
  shipping: {
    title: 'Shipping & Delivery',
    content: `
<h2>Delivery Areas</h2>
<p>Tapix delivers across Egypt and internationally:</p>
<ul>
<li><strong>Cairo & Giza</strong> - 1-2 business days</li>
<li><strong>Alexandria</strong> - 2-3 business days</li>
<li><strong>Delta cities</strong> - 2-3 business days</li>
<li><strong>Upper Egypt</strong> - 3-5 business days</li>
<li><strong>Other cities</strong> - 3-5 business days</li>
<li><strong>International shipping</strong> - 5-10 business days</li>
</ul>

<h2>Shipping Fees</h2>
<table>
<thead>
<tr><th>Order Value</th><th>Shipping Fee</th></tr>
</thead>
<tbody>
<tr><td>Orders above SAR 2,000</td><td><strong>FREE</strong></td></tr>
<tr><td>Orders below SAR 2,000</td><td>SAR 50 flat rate</td></tr>
<tr><td>Express shipping (next day)</td><td>SAR 100</td></tr>
</tbody>
</table>

<h2>Order Processing</h2>
<ul>
<li>Orders placed before <strong>2:00 PM</strong> are shipped the same business day.</li>
<li>Orders placed after 2:00 PM or on weekends/holidays are shipped the next business day.</li>
<li>You will receive a tracking number via email once your order has been shipped.</li>
</ul>

<h2>Package Tracking</h2>
<p>Once your order has shipped, you can track it by:</p>
<ul>
<li>Using the <a href="/track-order">Track Order</a> page with your order number</li>
<li>Checking your order status in <a href="/account/orders">My Orders</a></li>
<li>Clicking the tracking link in your shipping confirmation email</li>
</ul>

<h2>Package Handling</h2>
<ul>
<li>All electronics are shipped in their original manufacturer packaging.</li>
<li>Products are protected with bubble wrap and cushioning materials.</li>
<li>Packages are sealed with tamper-evident tape for security.</li>
<li>You can add delivery instructions when placing your order.</li>
</ul>

<h2>Delivery Issues</h2>
<p>If you experience any issues with your delivery:</p>
<ul>
<li>Contact us within 24 hours of the expected delivery date</li>
<li>Report any damaged or missing items immediately upon receipt</li>
<li>Reach out to our support team at <a href="mailto:support@tapix.com">support@tapix.com</a> or call us</li>
</ul>

<h2>International Shipping</h2>
<p>We ship internationally via trusted carriers. International orders may be subject to customs duties and import taxes, which are the responsibility of the buyer. Contact us for international shipping quotes and estimated delivery times.</p>
`,
  },
  returns: {
    title: 'Returns & Exchanges',
    content: `
<h2>Returns & Exchanges Overview</h2>
<p>At Tapix, we want you to be completely satisfied with your purchase. If you're not happy with your product, we offer a hassle-free return and exchange process.</p>

<h2>Return Eligibility</h2>
<ul>
<li>Return requests can be submitted within <strong>14 days</strong> of delivery.</li>
<li>Products must be in their original, unopened packaging and unused condition.</li>
<li>All original accessories, manuals, and warranty cards must be included.</li>
<li>The product must not show signs of physical damage or misuse.</li>
</ul>

<h2>Non-Returnable Items</h2>
<p>The following items cannot be returned:</p>
<ul>
<li>Products with broken or opened seals (earbuds, headphones removed from sealed packaging)</li>
<li>Products with physical damage caused by the customer</li>
<li>Screen protectors and tempered glass once applied</li>
<li>Items purchased on final sale or clearance pricing</li>
<li>Gift cards and digital products</li>
</ul>

<h2>How to Request a Return</h2>
<ol>
<li><strong>Initiate your request</strong> by contacting our support team or through your account under <a href="/account/orders">My Orders</a>.</li>
<li><strong>Receive a return authorization</strong> number and return shipping instructions.</li>
<li><strong>Pack the product</strong> securely in its original packaging with all accessories.</li>
<li><strong>Ship the product</strong> back to our warehouse using the provided shipping label or your preferred carrier.</li>
<li><strong>Inspection and refund</strong> will be processed within 2-3 business days of receiving the return.</li>
</ol>

<h2>Refund Process</h2>
<ul>
<li><strong>Original payment method</strong>: Refund will be credited back to your original payment method within 7-10 business days.</li>
<li><strong>Cash on Delivery orders</strong>: Refund will be processed via bank transfer. Please provide your bank details.</li>
<li><strong>Shipping fees</strong>: Original shipping fees are non-refundable unless the return is due to our error.</li>
</ul>

<h2>Exchanges</h2>
<p>Want a different product? You can exchange your purchase for another item:</p>
<ul>
<li>If the new product costs more, you'll pay the difference.</li>
<li>If the new product costs less, we'll refund the difference.</li>
<li>Exchange availability is subject to current stock.</li>
</ul>

<h2>Defective Products</h2>
<p>If you received a defective or damaged product:</p>
<ul>
<li>Contact us within <strong>48 hours</strong> of delivery with photos of the damage.</li>
<li>We will arrange a free return pickup and send a replacement at no additional cost.</li>
<li>Please keep all packaging materials until the issue is resolved.</li>
</ul>

<h2>Contact Us</h2>
<p>For return and exchange inquiries, contact our support team at <a href="mailto:returns@tapix.com">returns@tapix.com</a> or call us. We're here to help!</p>
`,
  },
  warranty: {
    title: 'Warranty Policy',
    content: `
<h2>Warranty Coverage</h2>
<p>All products sold by Tapix come with a manufacturer warranty. The warranty period varies by product category:</p>

<table>
<thead>
<tr><th>Product Category</th><th>Warranty Period</th></tr>
</thead>
<tbody>
<tr><td>Smartphones (Apple, Samsung, Xiaomi, etc.)</td><td>1 year manufacturer warranty</td></tr>
<tr><td>Audio Devices (Headphones, Earbuds, Speakers)</td><td>1 year manufacturer warranty</td></tr>
<tr><td>Smart Watches & Wearables</td><td>1 year manufacturer warranty</td></tr>
<tr><td>Power Banks & Chargers</td><td>1 year manufacturer warranty</td></tr>
<tr><td>Accessories (Cases, Cables, Adapters)</td><td>6 months warranty</td></tr>
<tr><td>Gaming Controllers & Peripherals</td><td>6 months manufacturer warranty</td></tr>
</tbody>
</table>

<h2>What's Covered</h2>
<ul>
<li>Manufacturing defects and hardware malfunctions</li>
<li>Battery defects (significant capacity loss within warranty period)</li>
<li>Display or screen defects not caused by physical damage</li>
</ul>

<h2>What's NOT Covered</h2>
<ul>
<li>Physical damage from drops, impacts, or liquid exposure</li>
<li>Normal wear and tear (scratches, fading, battery degradation)</li>
<li>Damage caused by unauthorized repairs or modifications</li>
<li>Issues from use with incompatible accessories or chargers</li>
<li>Software issues that can be resolved with a factory reset</li>
<li>Products with removed or tampered warranty seals</li>
</ul>

<h2>How to Make a Warranty Claim</h2>
<ol>
<li><strong>Contact our support team</strong> at <a href="mailto:support@tapix.com">support@tapix.com</a> with your order number and a description of the issue.</li>
<li><strong>Provide proof of purchase</strong> - your Tapix order confirmation or invoice.</li>
<li><strong>Describe the issue</strong> with photos or videos showing the defect.</li>
<li><strong>Our team will assess</strong> whether the issue is covered under warranty within 2-3 business days.</li>
<li><strong>If covered</strong>, we will arrange a repair, replacement, or refund depending on the product and issue.</li>
</ol>

<h2>Warranty Service Options</h2>
<ul>
<li><strong>Repair</strong>: For repairable defects, the product will be sent to an authorized service center. Typical turnaround: 7-14 business days.</li>
<li><strong>Replacement</strong>: If the defect cannot be repaired, we will provide a replacement unit of the same model (subject to availability).</li>
<li><strong>Refund</strong>: If a replacement is not available, we will issue a full refund.</li>
</ul>

<h2>Extended Warranty</h2>
<p>For select products, we offer extended warranty plans that provide additional coverage beyond the standard manufacturer warranty. Check the product page for extended warranty options at the time of purchase.</p>

<h2>Brand-Specific Warranty Centers</h2>
<p>For major brands (Apple, Samsung, Sony), warranty claims may also be processed through the manufacturer's authorized service centers. Our team will guide you to the appropriate service channel.</p>

<h2>Contact Us</h2>
<p>For warranty questions, reach out to <a href="mailto:support@tapix.com">support@tapix.com</a> or contact our customer support team.</p>
`,
  },
};

const defaultFaqs = [
  { question: 'How do I place an order?', answer: 'Simply browse our products, add items to your cart, and proceed to checkout. You can pay using credit/debit card, Apple Pay, or Cash on Delivery.', order: 1 },
  { question: 'What payment methods do you accept?', answer: 'We accept Visa, Mastercard, Apple Pay, and Cash on Delivery (COD). All online payments are processed securely through our encrypted payment gateway.', order: 2 },
  { question: 'How long does shipping take?', answer: 'Shipping times vary by location. Cairo & Giza: 1-2 business days. Alexandria & Delta: 2-3 business days. Upper Egypt: 3-5 business days. Orders above SAR 2,000 qualify for free shipping.', order: 3 },
  { question: 'Can I track my order?', answer: 'Yes! Once your order ships, you will receive a tracking number via email. You can also track your order anytime on our Track Order page or in your account under My Orders.', order: 4 },
  { question: 'What is your return policy?', answer: 'We offer a 14-day return policy. Products must be in their original, unopened packaging and unused condition. Contact our support team to initiate a return and we will guide you through the process.', order: 5 },
  { question: 'Do your products come with warranty?', answer: 'Yes, all our products come with a manufacturer warranty. Smartphones and audio devices: 1 year. Accessories: 6 months. Check the product page or our Warranty Policy page for specific details.', order: 6 },
  { question: 'How do I contact customer support?', answer: 'You can reach us via email at support@tapix.com, through our Contact page, or by phone. Our support team is available Saturday through Thursday, 9 AM to 9 PM.', order: 7 },
  { question: 'Can I change or cancel my order?', answer: 'You can modify or cancel your order before it has been shipped. Once the order is out for delivery, changes cannot be made. Contact our support team as soon as possible for order modifications.', order: 8 },
  { question: 'Are the products genuine and brand new?', answer: 'Absolutely! All products sold at Tapix are 100% genuine, brand new, and sourced from authorized distributors. Every item comes in its original sealed manufacturer packaging.', order: 9 },
  { question: 'What accessories are compatible with my device?', answer: 'Each product page lists compatible accessories. You can also use our search and filter features to find accessories by brand and device model. Our support team is happy to help with compatibility questions.', order: 10 },
];

const defaultContent: Record<string, { value: string; type: string }> = {
  homepage_features: {
    type: 'json',
    value: JSON.stringify([
      { icon: '🚚', title: 'Free Shipping', description: 'Free shipping on orders over SAR 2,000' },
      { icon: '🛡️', title: '1 Year Warranty', description: 'Manufacturer warranty on all products' },
      { icon: '↩️', title: 'Easy Returns', description: '14-day hassle-free return policy' },
      { icon: '💬', title: '24/7 Support', description: 'Expert assistance available around the clock' },
    ]),
  },
  homepage_why_choose_us: {
    type: 'json',
    value: JSON.stringify({
      badge: 'Why Choose Tapix',
      title: 'The Tapix Difference',
      description: 'We are committed to providing you with the best electronics and smart accessories at competitive prices.',
      reasons: [
        { icon: '✅', title: 'Genuine Products', description: '100% authentic products sourced from authorized distributors. Every item comes in original sealed packaging.' },
        { icon: '💰', title: 'Best Price Guarantee', description: 'Competitive pricing with regular deals and offers. Plus, enjoy exclusive discounts and bundle deals.' },
        { icon: '🚚', title: 'Free Shipping', description: 'Free shipping on orders over SAR 2,000. Express next-day delivery available for Cairo and Giza.' },
        { icon: '🛡️', title: '1 Year Warranty', description: 'All products come with manufacturer warranty. Extended warranty plans available for added peace of mind.' },
        { icon: '↩️', title: 'Easy Returns', description: '14-day return policy. Not satisfied? Return it in original packaging for a full refund, no questions asked.' },
        { icon: '💬', title: '24/7 Customer Support', description: 'Our dedicated support team is available around the clock to help you with any questions or concerns.' },
      ],
      cta: {
        title: 'Still Have Questions?',
        description: 'Our customer support team is here to help. Contact us anytime via phone, email, or live chat.',
        phone: '+20 123 456 789',
        buttonText: 'Send a Message',
        buttonLink: '/contact',
      },
    }),
  },
  homepage_newsletter: {
    type: 'json',
    value: JSON.stringify({
      badge: 'Newsletter',
      title: 'Get 10% Off Your First Order',
      description: 'Subscribe to our newsletter and receive exclusive deals, new product launches, and tech tips delivered to your inbox.',
      benefits: [
        { icon: '🎁', title: 'Exclusive Offers', description: 'Get special discounts' },
        { icon: '⚡', title: 'Early Access', description: 'New products first' },
        { icon: '🔔', title: 'Flash Deals', description: 'Never miss a deal' },
      ],
      formTitle: 'Join Our Community',
      subscriberText: 'Over 10,000+ subscribers already',
      buttonText: 'Subscribe & Get 10% Off',
    }),
  },
  homepage_hero_badges: {
    type: 'json',
    value: JSON.stringify([
      { icon: '🚚', title: 'Free Shipping', subtitle: 'On orders over SAR 2,000' },
      { icon: '🛡️', title: '1 Year Warranty', subtitle: 'On all products' },
      { icon: '🔒', title: 'Secure Payment', subtitle: 'Multiple options' },
      { icon: '💬', title: '24/7 Support', subtitle: 'Expert assistance' },
    ]),
  },
  homepage_hero_categories: {
    type: 'json',
    value: JSON.stringify([
      { emoji: '📱', label: 'Smartphones', href: '/categories/smartphones-tablets' },
      { emoji: '🎧', label: 'Audio', href: '/categories/audio-wearables' },
      { emoji: '🔌', label: 'Accessories', href: '/categories/charging-power' },
      { emoji: '⌚', label: 'Smart Gadgets', href: '/categories/cases-protection' },
    ]),
  },
  homepage_hero_promos: {
    type: 'json',
    value: JSON.stringify([
      { emoji: '🔥', title: 'Flash Deals', subtitle: 'Up to 50% off', href: '/deals', color: 'from-red-500 to-orange-500' },
      { emoji: '✨', title: 'New Arrivals', subtitle: 'Latest products', href: '/products?new=true', color: 'from-blue-500 to-purple-500' },
      { emoji: '📦', title: 'All Categories', subtitle: 'Browse collection', href: '/categories', color: 'from-green-500 to-teal-500' },
      { emoji: '⭐', title: 'Best Sellers', subtitle: 'Top rated items', href: '/products?featured=true', color: 'from-yellow-500 to-amber-500' },
    ]),
  },
  careers: {
    type: 'html',
    value: `
<h2>Why Work at Tapix?</h2>
<p>Tapix is a fast-growing online electronics retailer bringing the latest smartphones, gadgets, and accessories to customers across Egypt. We're building the best online shopping experience for tech lovers, and we need talented, passionate people to join our journey.</p>

<h3>Our Culture</h3>
<ul>
<li><strong>Customer First</strong> - Everything we do starts with the customer experience</li>
<li><strong>Move Fast</strong> - We embrace speed and efficiency in everything we do</li>
<li><strong>Growth Mindset</strong> - We invest in our team's personal and professional development</li>
<li><strong>Collaboration</strong> - We believe great things happen when we work together</li>
</ul>

<h3>Benefits</h3>
<ul>
<li>Competitive salary and performance bonuses</li>
<li>Health insurance for you and your family</li>
<li>Professional development budget</li>
<li>Flexible working arrangements</li>
<li>Employee discounts on all products</li>
<li>Team events and company outings</li>
</ul>

<h3>Open Positions</h3>

<h4>E-commerce Manager</h4>
<p><strong>Location:</strong> Cairo | <strong>Type:</strong> Full-time</p>
<p>We're looking for an experienced e-commerce manager to oversee our online store operations, optimize conversion rates, and drive revenue growth. Experience with e-commerce platforms and digital marketing is required.</p>

<h4>Product Specialist</h4>
<p><strong>Location:</strong> Cairo | <strong>Type:</strong> Full-time</p>
<p>Join our product team to manage our electronics catalog, write compelling product descriptions, and ensure accurate specifications. Deep knowledge of consumer electronics required.</p>

<h4>Warehouse Coordinator</h4>
<p><strong>Location:</strong> Cairo | <strong>Type:</strong> Full-time</p>
<p>Help us manage our growing inventory and ensure fast, accurate order fulfillment. Experience in warehouse operations and inventory management is preferred.</p>

<h4>Customer Support Agent</h4>
<p><strong>Location:</strong> Cairo (Remote OK) | <strong>Type:</strong> Full-time</p>
<p>Provide exceptional support to our customers via phone, email, and live chat. Help with order tracking, returns, product questions, and warranty claims.</p>

<h4>Digital Marketing Specialist</h4>
<p><strong>Location:</strong> Cairo | <strong>Type:</strong> Full-time</p>
<p>Drive traffic and sales through SEO, social media, email marketing, and paid advertising campaigns. Experience with Google Ads and Meta Ads is a plus.</p>

<hr />
<p>Don't see a role that fits? We're always looking for talented people. Send your resume to <a href="mailto:careers@tapix.com">careers@tapix.com</a> and tell us how you can contribute to Tapix's growth.</p>
`,
  },
  press: {
    type: 'html',
    value: `
<h2>About Tapix</h2>
<p>Tapix is a leading online electronics retailer in Egypt. We offer a curated selection of premium smartphones, smart accessories, and cutting-edge gadgets, providing customers with genuine products, competitive pricing, and exceptional service.</p>

<h3>Key Facts</h3>
<ul>
<li><strong>Founded:</strong> 2024</li>
<li><strong>Headquarters:</strong> Cairo, Egypt</li>
<li><strong>Products:</strong> 500+ electronics and accessories from top brands</li>
<li><strong>Brands:</strong> Apple, Samsung, Sony, Xiaomi, Anker, JBL, and more</li>
<li><strong>Delivery:</strong> Nationwide shipping with free delivery on orders over SAR 2,000</li>
</ul>

<h3>Our Mission</h3>
<p>To make premium electronics and smart accessories accessible to everyone in Egypt through a seamless online shopping experience backed by genuine products and reliable customer service.</p>

<h3>Press Releases</h3>

<h4>Tapix Launches Online Electronics Store</h4>
<p><em>Cairo, 2024</em> — Tapix officially launched its online electronics store, offering a curated selection of smartphones, audio devices, wearables, and accessories from top global brands. The platform features free shipping, 1-year warranty, and a hassle-free return policy.</p>

<h4>Tapix Expands Product Range with New Brand Partnerships</h4>
<p><em>Cairo, 2025</em> — Tapix announced partnerships with leading electronics brands including Apple, Samsung, Sony, and Anker, expanding its catalog to over 500 products across smartphones, audio, gaming, and accessories categories.</p>

<hr />

<h3>Media Inquiries</h3>
<p>For press inquiries, interviews, or media resources, please contact our communications team:</p>
<p>Email: <a href="mailto:press@tapix.com">press@tapix.com</a></p>

<h3>Brand Assets</h3>
<p>For approved Tapix logos, brand guidelines, and media kit, please contact our press team.</p>
`,
  },
};

// Helper: seed default policy if not found
async function getOrCreatePolicy(slug: string): Promise<any> {
  const page = await PolicyPage.findOne({ slug }).lean();
  if (page) return page;
  if (!defaultPolicies[slug]) return null;
  const created = await PolicyPage.create({
    slug,
    title: defaultPolicies[slug].title,
    content: defaultPolicies[slug].content,
    isActive: true,
  });
  return created.toObject();
}

// Helper: seed default FAQs if none exist
async function getOrCreateFaqs(query: any) {
  let faqs = await FAQ.find(query).sort({ order: 1 }).lean();
  if (faqs.length === 0 && !query.categoryId) {
    await FAQ.insertMany(defaultFaqs.map(f => ({ ...f, isActive: true })));
    faqs = await FAQ.find(query).sort({ order: 1 }).lean();
  }
  return faqs;
}

// Helper: seed default CMS content if not found
async function getOrCreateContent(key: string): Promise<any> {
  const content = await CMSContent.findOne({ key }).lean();
  if (content) return content;
  if (!defaultContent[key]) return null;
  const created = await CMSContent.create({
    key,
    value: defaultContent[key].value,
    type: defaultContent[key].type,
  });
  return created.toObject();
}

// ========== CMS CONTENT ==========

// Get CMS content by key (public)
router.get(
  '/content/:key',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { key } = req.params;

    const content = await getOrCreateContent(key);

    res.json({
      success: true,
      data: content || null,
    });
  })
);

// Get multiple CMS contents (public)
router.get(
  '/content',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { keys } = req.query;

    if (!keys) {
      res.json({
        success: true,
        data: [],
      });
      return;
    }

    const keyList = (keys as string).split(',');

    // Fetch existing and create defaults for missing keys
    const results = await Promise.all(keyList.map((k) => getOrCreateContent(k.trim())));
    const result = results.reduce((acc: any, content) => {
      if (content) acc[content.key] = content;
      return acc;
    }, {});

    res.json({
      success: true,
      data: result,
    });
  })
);

// Update CMS content (admin)
router.put(
  '/content/:key',
  authenticate,
  requireSuperAdmin,
  validate(updateCMSContentSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { key } = req.params;
    const { value } = req.body;

    const content = await CMSContent.findOneAndUpdate(
      { key },
      {
        key,
        value,
        type: typeof value === 'object' ? 'json' : 'text',
        updatedBy: req.userId,
      },
      { new: true, upsert: true }
    );

    res.json({
      success: true,
      data: content,
    });
  })
);

// ========== POLICY PAGES ==========

// Get policy page by slug (public)
router.get(
  '/policies/:slug',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { slug } = req.params;

    const page = await getOrCreatePolicy(slug);

    if (!page) {
      throw new NotFoundError('Page');
    }

    // Only return active pages to public
    if (!(page as any).isActive) {
      throw new NotFoundError('Page');
    }

    res.json({
      success: true,
      data: page,
    });
  })
);

// Get all policy pages (admin) - auto-seeds defaults if none exist
router.get(
  '/policies',
  authenticate,
  requireAdmin,
  requirePermission('cms', 'read'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    let pages = await PolicyPage.find().sort({ slug: 1 }).lean();

    // Auto-seed all default policies if none exist
    if (pages.length === 0) {
      const slugs = Object.keys(defaultPolicies);
      for (const slug of slugs) {
        await getOrCreatePolicy(slug);
      }
      pages = await PolicyPage.find().sort({ slug: 1 }).lean();
    }

    res.json({
      success: true,
      data: pages,
    });
  })
);

// Update policy page (admin)
router.put(
  '/policies/:slug',
  authenticate,
  requireSuperAdmin,
  validate(updatePolicyPageSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { slug } = req.params;
    const data = req.body;

    const page = await PolicyPage.findOneAndUpdate(
      { slug },
      {
        ...data,
        slug,
        updatedBy: req.userId,
      },
      { new: true, upsert: true }
    );

    res.json({
      success: true,
      data: page,
    });
  })
);

// ========== FAQs ==========

// Get FAQs (public)
router.get(
  '/faqs',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { categoryId } = req.query;

    const query: any = { isActive: true };
    if (categoryId) {
      query.categoryId = categoryId;
    }

    const faqs = await getOrCreateFaqs(query);

    res.json({
      success: true,
      data: faqs,
    });
  })
);

// Get FAQ by ID (admin)
router.get(
  '/faqs/:id',
  authenticate,
  requireAdmin,
  requirePermission('cms', 'read'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid FAQ ID');
    }

    const faq = await FAQ.findById(id).lean();

    if (!faq) {
      throw new NotFoundError('FAQ');
    }

    res.json({
      success: true,
      data: faq,
    });
  })
);

// Create FAQ (admin)
router.post(
  '/faqs',
  authenticate,
  requireAdmin,
  requirePermission('cms', 'write'),
  validate(createFAQSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const faq = await FAQ.create(req.body);

    res.status(201).json({
      success: true,
      data: faq,
    });
  })
);

// Update FAQ (admin)
router.patch(
  '/faqs/:id',
  authenticate,
  requireAdmin,
  requirePermission('cms', 'write'),
  validate(updateFAQSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid FAQ ID');
    }

    const faq = await FAQ.findByIdAndUpdate(id, req.body, { new: true });

    if (!faq) {
      throw new NotFoundError('FAQ');
    }

    res.json({
      success: true,
      data: faq,
    });
  })
);

// Delete FAQ (admin)
router.delete(
  '/faqs/:id',
  authenticate,
  requireAdmin,
  requirePermission('cms', 'write'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid FAQ ID');
    }

    const faq = await FAQ.findByIdAndDelete(id);

    if (!faq) {
      throw new NotFoundError('FAQ');
    }

    res.json({
      success: true,
      message: 'FAQ deleted',
    });
  })
);

// ========== NEWSLETTER ==========

// Subscribe to newsletter (public)
router.post(
  '/newsletter/subscribe',
  validate(subscribeNewsletterSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { email } = req.body;

    // Check if already subscribed
    const existing = await Newsletter.findOne({ email });

    if (existing) {
      if (existing.isActive) {
        res.json({
          success: true,
          message: 'Already subscribed',
        });
        return;
      }

      // Reactivate subscription
      existing.isActive = true;
      existing.subscribedAt = new Date();
      existing.unsubscribedAt = undefined;
      await existing.save();
    } else {
      await Newsletter.create({ email });
    }

    // Send confirmation email
    sendNewsletterConfirmation(email).catch(console.error);

    // Notify company
    notifyNewSubscriber(email).catch(console.error);

    res.json({
      success: true,
      message: 'Successfully subscribed',
    });
  })
);

// Unsubscribe from newsletter
router.post(
  '/newsletter/unsubscribe',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { email } = req.body;

    if (!email) {
      throw new BadRequestError('Email required');
    }

    await Newsletter.findOneAndUpdate(
      { email },
      { isActive: false, unsubscribedAt: new Date() }
    );

    res.json({
      success: true,
      message: 'Successfully unsubscribed',
    });
  })
);

// Get newsletter subscribers (admin)
router.get(
  '/newsletter/subscribers',
  authenticate,
  requireSuperAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page = 1, limit = 50, active } = req.query as any;
    const skip = (Number(page) - 1) * Number(limit);

    const query: any = {};
    if (active === 'true') query.isActive = true;
    if (active === 'false') query.isActive = false;

    const [subscribers, total] = await Promise.all([
      Newsletter.find(query)
        .sort({ subscribedAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Newsletter.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: subscribers,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  })
);

// ========== CONTACT ==========

// Submit contact form (public)
router.post(
  '/contact',
  validate(createContactMessageSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { name, email, phone, subject, message } = req.body;

    // Save to database
    await ContactMessage.create({ name, email, phone, subject, message });

    // Forward to company email
    forwardContactMessage(name, email, phone, subject, message).catch(console.error);

    res.json({
      success: true,
      message: 'Message sent successfully',
    });
  })
);

// Get contact messages (admin)
router.get(
  '/contact/messages',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page = 1, limit = 20, status } = req.query as any;
    const skip = (Number(page) - 1) * Number(limit);

    const query: any = {};
    if (status) query.status = status;

    const [messages, total] = await Promise.all([
      ContactMessage.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      ContactMessage.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: messages,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  })
);

// Update contact message status (admin)
router.patch(
  '/contact/messages/:id',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { status, notes, assignedTo } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid message ID');
    }

    const message = await ContactMessage.findByIdAndUpdate(
      id,
      { status, notes, assignedTo },
      { new: true }
    );

    if (!message) {
      throw new NotFoundError('Message');
    }

    res.json({
      success: true,
      data: message,
    });
  })
);

export default router;
