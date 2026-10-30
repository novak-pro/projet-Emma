import path from "node:path";
import "dotenv/config";

export const env = {
  port: Number(process.env.PORT ?? 3000),
  host: process.env.HOST ?? "0.0.0.0",
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret",
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:5173",
  publicBaseUrl: process.env.PUBLIC_BASE_URL ?? "http://localhost:3000",
  analyticsUrl: process.env.ANALYTICS_URL ?? "http://localhost:8000",
  adminEmail: process.env.ADMIN_EMAIL ?? "admin@admin.cm",
  adminPassword: process.env.ADMIN_PASSWORD ?? "admin123",
  uploadDir: process.env.UPLOAD_DIR ?? path.resolve(process.cwd(), "uploads"),
};
