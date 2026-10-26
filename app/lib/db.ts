import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;

// Neon Free Tier Optimization:
// 1. max: 5 (prevent hitting Neon 10-20 connection limit)
// 2. idle_timeout: 10s (release connection immediately after request)
// 3. connect_timeout: 10s
export const sql = DATABASE_URL
  ? postgres(DATABASE_URL, {
      ssl: "require",
      max: 5,
      idle_timeout: 10,
      connect_timeout: 10,
    })
  : ((() => {
      const dummy = async () => [];
      return dummy;
    })() as unknown as ReturnType<typeof postgres>);

