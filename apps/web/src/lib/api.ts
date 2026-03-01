const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface RequestOptions {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
}

/**
 * API client for communicating with the Couple OS backend.
 */
export async function api<T = unknown>(
    path: string,
    options: RequestOptions = {}
): Promise<T> {
    const { method = "GET", body, headers = {} } = options;

    const token =
        typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

    const res = await fetch(`${API_URL}${path}`, {
        method,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        credentials: "include", // send cookies for refresh token
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(error.error || `API error: ${res.status}`);
    }

    return res.json();
}

/**
 * Store access token in localStorage.
 */
export function setAccessToken(token: string) {
    if (typeof window !== "undefined") {
        localStorage.setItem("accessToken", token);
    }
}

/**
 * Remove access token from localStorage.
 */
export function clearAccessToken() {
    if (typeof window !== "undefined") {
        localStorage.removeItem("accessToken");
    }
}

/**
 * Get stored access token.
 */
export function getAccessToken(): string | null {
    if (typeof window !== "undefined") {
        return localStorage.getItem("accessToken");
    }
    return null;
}
