import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import authRoutes from "./routes/auth.js";
import productsRoutes from "./routes/products.js";
import retailersRoutes from "./routes/retailers.js";
import pricingRoutes from "./routes/pricing.js";
import purchasesRoutes from "./routes/purchases.js";
import billingRoutes from "./routes/billing.js";
import inventoryRoutes from "./routes/inventory.js";
import collectionsRoutes from "./routes/collections.js";
import expensesRoutes from "./routes/expenses.js";
import dashboardRoutes from "./routes/dashboard.js";
import reportsRoutes from "./routes/reports.js";
import settingsRoutes from "./routes/settings.js";
import profileRoutes from "./routes/profile.js";
import { requireAuth } from "./middleware/auth.js";
import { authorize } from "./middleware/authorize.js";
import { distributorRoles } from "./constants/userRoles.js";
import { errorHandler, notFound } from "./middleware/error.js";
import { prisma } from "./db.js";

if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is required.");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const app = express();
const port = Number(process.env.PORT || 5000);
const allowedOrigins = String(
  process.env.CORS_ORIGIN || "http://localhost:5173",
)
  .split(",")
  .map((x) => x.trim());

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(
  cors({
    origin(origin, cb) {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error("Origin not allowed by CORS."));
    },
    credentials: false,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.get("/api/health", async (req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: "UP",
      service: "Distribution Management API",
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    next(e);
  }
});

app.use("/api/auth", authRoutes);
const distributorOnly = authorize(...distributorRoles);
app.use("/api/dashboard", requireAuth, distributorOnly, dashboardRoutes);
app.use("/api/products", requireAuth, distributorOnly, productsRoutes);
app.use("/api/retailers", requireAuth, distributorOnly, retailersRoutes);
app.use("/api/pricing", requireAuth, distributorOnly, pricingRoutes);
app.use("/api/purchases", requireAuth, distributorOnly, purchasesRoutes);
app.use("/api/invoices", requireAuth, distributorOnly, billingRoutes);
app.use("/api/inventory", requireAuth, distributorOnly, inventoryRoutes);
app.use("/api/collections", requireAuth, distributorOnly, collectionsRoutes);
app.use("/api/expenses", requireAuth, distributorOnly, expensesRoutes);
app.use("/api/reports", requireAuth, distributorOnly, reportsRoutes);
app.use("/api/settings", requireAuth, settingsRoutes);
app.use("/api/profile", requireAuth, profileRoutes);

app.use(notFound);
app.use(errorHandler);

const server = app.listen(port, () =>
  console.log(`API listening on port ${port}`),
);

async function shutdown() {
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
