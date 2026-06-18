/**
 * Axios HTTP client for the Farm Copilot API.
 *
 * Architecture decisions (DECISIONS.md):
 * - DEC-0018: /api/v1 JSON layer, session-cookie auth, CORS with allow_credentials=True
 * - DEC-0017: Cookie-based sessions (not JWT). withCredentials=true sends cookies automatically.
 *
 * Failure modes handled:
 * - Network unreachable: axios throws NetworkError, caught and translated to ApiError
 * - 401 Unauthenticated: triggers redirect to /login via window.location
 * - 500 Server error: surface message, don't crash the app
 * - Slow connection: axios default timeout + loading state handled in hooks
 */
import axios, { AxiosError, type AxiosInstance } from "axios";

/** Typed API error for consistent error handling throughout the app. */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly detail?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Network-level error (offline, DNS failure, etc.) */
export class NetworkError extends ApiError {
  constructor() {
    super("Conexiune indisponibilă. Verificați rețeaua.", 0);
    this.name = "NetworkError";
  }
}

function createApiClient(): AxiosInstance {
  const baseURL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

  const client = axios.create({
    baseURL,
    withCredentials: true, // Required for cookie-based session auth (DEC-0017)
    timeout: 15_000,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  // Response interceptor — translate axios errors into ApiError
  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      if (!error.response) {
        // No response at all — network failure, timeout, offline
        return Promise.reject(new NetworkError());
      }

      const { status, data } = error.response;
      const detail =
        typeof data === "object" &&
        data !== null &&
        "detail" in data &&
        typeof (data as Record<string, unknown>).detail === "string"
          ? (data as { detail: string }).detail
          : undefined;

      if (status === 401) {
        // Session expired or unauthenticated — redirect handled by auth store
        return Promise.reject(
          new ApiError("Sesiune expirată. Vă rugăm să vă autentificați.", 401, detail),
        );
      }

      if (status === 422) {
        // Pydantic validation error from FastAPI
        return Promise.reject(
          new ApiError("Date invalide trimise către server.", 422, detail),
        );
      }

      if (status >= 500) {
        return Promise.reject(
          new ApiError("Eroare internă de server. Încercați din nou.", status, detail),
        );
      }

      // All other 4xx — surface the FastAPI detail field
      return Promise.reject(
        new ApiError(
          detail ?? `Cerere eșuată (${status}).`,
          status,
          detail,
        ),
      );
    },
  );

  return client;
}

export const apiClient = createApiClient();
