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

  SMS_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),

  SMS_PROVIDER: z
    .enum(["stub", "twilio"])
    .default("stub"),

  SMS_MAX_ATTEMPTS: z.coerce
    .number()
    .int()
    .min(1)
    .max(10)
    .default(3),

  SMS_RETRY_BASE_DELAY_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(30000),

  SMS_WORKER_INTERVAL_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(15000),

  TWILIO_ACCOUNT_SID: z.string().min(1).optional(),
  TWILIO_AUTH_TOKEN: z.string().min(1).optional(),
  TWILIO_API_KEY: z.string().min(1).optional(),
  TWILIO_API_SECRET: z.string().min(1).optional(),
  TWILIO_FROM: z.string().min(1).optional(),
  TWILIO_MESSAGING_SERVICE_SID: z.string().min(1).optional(),
});

export const env = envSchema.parse(process.env);
