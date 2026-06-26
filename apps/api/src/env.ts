import { z } from "zod";

const DEFAULT_AUTH_SECRET = "dev-secret-change-me";
const DEFAULT_REDIS_URL = "redis://localhost:6379";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().default(4000),
  AUTH_SECRET: z.string().min(16).default(DEFAULT_AUTH_SECRET),
  PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  REDIS_URL: z.string().default(DEFAULT_REDIS_URL),
  DEPLOYED_IMAGE_TAG: z.string().default("local")
});

export const env = envSchema.parse(process.env);

if (env.NODE_ENV === "production" && env.AUTH_SECRET === DEFAULT_AUTH_SECRET) {
  throw new Error("AUTH_SECRET must be set to a unique production secret.");
}

if (env.NODE_ENV === "production" && env.REDIS_URL === DEFAULT_REDIS_URL) {
  throw new Error("REDIS_URL must be set explicitly in production.");
}
