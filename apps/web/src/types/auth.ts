/**
 * Zod schemas for authentication.
 * Source of truth: DEC-0017 (cookie sessions), DEC-0018 (/api/v1 layer),
 * contracts/api_v1_models.py in the Python backend.
 */
import { z } from "zod";

// ── Request schemas ─────────────────────────────────────────────────────────

export const LoginRequestSchema = z.object({
  email: z.string().email("Adresă de email invalidă"),
  password: z.string().min(8, "Parola trebuie să aibă cel puțin 8 caractere"),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

// ── Response schemas ────────────────────────────────────────────────────────

/**
 * User as returned by GET /api/v1/auth/me.
 * Farm area in hectares, location as free text.
 */
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  farm_id: z.string().uuid(),
  farm_name: z.string(),
  // Optional fields — may not be present in all responses
  farm_area_ha: z.number().nullable().optional(),
  farm_location: z.string().nullable().optional(),
  role: z.enum(["owner", "member", "viewer"]).optional(),
});

export type User = z.infer<typeof UserSchema>;

/**
 * Login response — backend returns user on success.
 * Session cookie is set by the server (Starlette SessionMiddleware).
 * No JWT tokens — DEC-0017.
 */
export const LoginResponseSchema = z.object({
  user: UserSchema,
  message: z.string().optional(),
});

export type LoginResponse = z.infer<typeof LoginResponseSchema>;

// ── Error schema ─────────────────────────────────────────────────────────────

export const ApiErrorSchema = z.object({
  detail: z.string(),
});

export type ApiErrorBody = z.infer<typeof ApiErrorSchema>;
