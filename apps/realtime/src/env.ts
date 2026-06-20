import { z } from "zod";

const DEFAULT_REDIS_URL = "redis://localhost:6379";

export const env = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    REALTIME_PORT: z.coerce.number().int().default(4001),
    REDIS_URL: z.string().default(DEFAULT_REDIS_URL)
  })
  .parse(process.env);

if (env.NODE_ENV === "production" && env.REDIS_URL === DEFAULT_REDIS_URL) {
  throw new Error("REDIS_URL must be set explicitly in production.");
}
