import { z } from "zod";

const DEFAULT_AUTH_SECRET = "dev-secret-change-me";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().default(4000),
  AUTH_SECRET: z.string().min(16).default(DEFAULT_AUTH_SECRET),
  PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  UPLOAD_ROOT: z.string().default("./uploads"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional()
});

export const env = envSchema.parse(process.env);

if (env.NODE_ENV === "production" && env.AUTH_SECRET === DEFAULT_AUTH_SECRET) {
  throw new Error("AUTH_SECRET must be set to a unique production secret.");
}
