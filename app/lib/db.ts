import postgres from "postgres";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_V9cSEtYBbu0v@ep-tiny-thunder-ao4aj3qp-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

export const sql = postgres(DATABASE_URL);
