import { createHash, randomBytes } from "node:crypto";

export function generateRefreshToken(): string {
  return randomBytes(64).toString("hex");
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function parseRefreshTokenDuration(value: string): number {
  const match = value.match(/^(\d+)([smhd])$/);

  if (!match) {
    throw new Error(
      `Invalid JWT_REFRESH_EXPIRES_IN value: ${value}`
    );
  }

  const amount = Number(match[1]);
  const unit = match[2] as "s" | "m" | "h" | "d";

  const multipliers: Record<"s" | "m" | "h" | "d", number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return amount * multipliers[unit];
}