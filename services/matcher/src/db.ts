import "dotenv/config";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set — copy .env.example to .env and fill it in.");

// Matcher daemon only needs 1-2 pooled connections at most
export const sql = postgres(url, {
  ssl: "require",
  max: 2,
  idle_timeout: 15,
  connect_timeout: 10,
});
