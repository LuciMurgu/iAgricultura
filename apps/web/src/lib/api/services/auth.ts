/**
 * Auth service — wraps the /api/v1/auth/* endpoints.
 * Gate: REAL (backend exists).
 *
 * Cookie management is handled by the browser automatically (withCredentials=true).
 * The service simply calls the endpoints and returns typed data.
 */
import { apiClient } from "@/lib/api/client";
import {
  LoginRequestSchema,
  LoginResponseSchema,
  UserSchema,
  type LoginRequest,
  type LoginResponse,
  type User,
} from "@/types/auth";

export const authService = {
  /**
   * POST /api/v1/auth/login
   * On success, the server sets a session cookie. Returns the logged-in user.
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    // Validate input before sending (fail fast)
    LoginRequestSchema.parse(credentials);

    const response = await apiClient.post<unknown>("/api/v1/auth/login", credentials);
    return LoginResponseSchema.parse(response.data);
  },

  /**
   * POST /api/v1/auth/logout
   * Server clears the session cookie.
   */
  async logout(): Promise<void> {
    await apiClient.post("/api/v1/auth/logout");
  },

  /**
   * GET /api/v1/auth/me
   * Returns the current user if the session cookie is valid.
   * Throws ApiError(401) if not authenticated.
   */
  async getMe(): Promise<User> {
    const response = await apiClient.get<unknown>("/api/v1/auth/me");
    // Backend wraps /me in {"user": {...}} same as /login
    const parsed = LoginResponseSchema.parse(response.data);
    return parsed.user;
  },
};
