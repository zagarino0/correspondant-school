import "dotenv/config";

import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  PORT: z.coerce
    .number()
    .int()
    .positive()
    .default(4000),

  HOST: z
    .string()
    .default("0.0.0.0"),

  DATABASE_URL: z
    .string()
    .min(1),

  JWT_SECRET: z
    .string()
    .min(32),

  JWT_ACCESS_EXPIRES_IN: z
    .string()
    .default("15m"),

  JWT_REFRESH_EXPIRES_IN: z
    .string()
    .default("30d"),

  CORS_ORIGIN: z
    .string()
    .default("*"),

  LOG_LEVEL: z
    .string()
    .default("info"),

  LLM_PROVIDER: z
    .enum(["stub", "openai"])
    .default("stub"),

  LLM_API_KEY: z
    .string()
    .min(1)
    .optional(),

  LLM_MODEL: z
    .string()
    .min(1)
    .optional(),

  LLM_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(30000),
});

export const env = envSchema.parse(process.env);
