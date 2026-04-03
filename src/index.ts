// ============================================
// Tapix API - Main Entry Point
// ============================================

import express, { Express, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import path from "path";

import { config, validateConfig } from "./config";
import { connectDatabase } from "./config/database";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { sanitize } from "./middleware/validate";

// Import routes
import authRoutes from "./routes/auth.routes";
import productsRoutes from "./routes/products.routes";
import categoriesRoutes from "./routes/categories.routes";
import cartRoutes from "./routes/cart.routes";
import ordersRoutes from "./routes/orders.routes";
import reviewsRoutes from "./routes/reviews.routes";
import usersRoutes from "./routes/users.routes";
import adminRoutes from "./routes/admin.routes";
import notificationsRoutes from "./routes/notifications.routes";
import offersRoutes from "./routes/offers.routes";
import bannersRoutes from "./routes/banners.routes";
import cmsRoutes from "./routes/cms.routes";
import blogRoutes from "./routes/blog.routes";
import testimonialsRoutes from "./routes/testimonials.routes";
import referralsRoutes from "./routes/referrals.routes";
import brandsRoutes from "./routes/brands.routes";
import loyaltyRoutes from "./routes/loyalty.routes";
import settingsRoutes from "./routes/settings.routes";
import inventoryRoutes from "./routes/inventory.routes";
import accountingRoutes from "./routes/accounting.routes";
import seoRoutes from "./routes/seo.routes";
import b2bRoutes from "./routes/b2b.routes";

// Validate configuration
validateConfig();

// Create Express app
const app: Express = express();

// Trust proxy (for rate limiting behind reverse proxy)
app.set("trust proxy", 1);

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: config.isDev ? false : undefined,
  }),
);

// CORS configuration
app.use(
  cors({
    origin: config.cors.origin,
    credentials: config.cors.credentials,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }),
);

// Request parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Input sanitization
app.use(sanitize);

// Compression
app.use(compression());

// Logging
if (config.isDev) {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    success: false,
    error: "Too many requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to API routes
app.use("/api", limiter);

// Static files for uploads
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Health check endpoint
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    success: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: config.env,
  });
});

// API routes
const API_PREFIX = `/api/${config.apiVersion}`;

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/products`, productsRoutes);
app.use(`${API_PREFIX}/categories`, categoriesRoutes);
app.use(`${API_PREFIX}/cart`, cartRoutes);
app.use(`${API_PREFIX}/orders`, ordersRoutes);
app.use(`${API_PREFIX}/reviews`, reviewsRoutes);
app.use(`${API_PREFIX}/users`, usersRoutes);
app.use(`${API_PREFIX}/admin`, adminRoutes);
app.use(`${API_PREFIX}/notifications`, notificationsRoutes);
app.use(`${API_PREFIX}/offers`, offersRoutes);
app.use(`${API_PREFIX}/banners`, bannersRoutes);
app.use(`${API_PREFIX}/cms`, cmsRoutes);
app.use(`${API_PREFIX}/blog`, blogRoutes);
app.use(`${API_PREFIX}/testimonials`, testimonialsRoutes);
app.use(`${API_PREFIX}/referrals`, referralsRoutes);
app.use(`${API_PREFIX}/brands`, brandsRoutes);
app.use(`${API_PREFIX}/loyalty`, loyaltyRoutes);
app.use(`${API_PREFIX}/settings`, settingsRoutes);
app.use(`${API_PREFIX}/admin/inventory`, inventoryRoutes);
app.use(`${API_PREFIX}/admin/accounting`, accountingRoutes);
app.use(`${API_PREFIX}/admin/seo`, seoRoutes);
app.use(`${API_PREFIX}/admin/b2b`, b2bRoutes);

// API info endpoint
app.get(`${API_PREFIX}`, (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: "Tapix API",
    version: config.apiVersion,
    environment: config.env,
    endpoints: {
      auth: `${API_PREFIX}/auth`,
      products: `${API_PREFIX}/products`,
      categories: `${API_PREFIX}/categories`,
      cart: `${API_PREFIX}/cart`,
      orders: `${API_PREFIX}/orders`,
      reviews: `${API_PREFIX}/reviews`,
      users: `${API_PREFIX}/users`,
      admin: `${API_PREFIX}/admin`,
      notifications: `${API_PREFIX}/notifications`,
      offers: `${API_PREFIX}/offers`,
      banners: `${API_PREFIX}/banners`,
      cms: `${API_PREFIX}/cms`,
      blog: `${API_PREFIX}/blog`,
      testimonials: `${API_PREFIX}/testimonials`,
      referrals: `${API_PREFIX}/referrals`,
      brands: `${API_PREFIX}/brands`,
    },
  });
});

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Database connection and server start
const startServer = async (): Promise<void> => {
  try {
    // Connect to MongoDB
    await connectDatabase();

    // Start server
    app.listen(config.port, () => {
      console.log(`
╔═══════════════════════════════════════════════╗
║                                               ║
║   🚀 Tapix API Server Started                  ║
║                                               ║
║   Environment: ${config.env.padEnd(27)}  ║
║   Port: ${String(config.port).padEnd(34)}  ║
║   API URL: http://localhost:${config.port}${API_PREFIX.padEnd(13)}  ║
║                                               ║
╚═══════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on("uncaughtException", (error: Error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason: unknown) => {
  console.error("Unhandled Rejection:", reason);
  process.exit(1);
});

// Handle graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("SIGINT received. Shutting down gracefully...");
  process.exit(0);
});

// Start the server
startServer();

export default app;
