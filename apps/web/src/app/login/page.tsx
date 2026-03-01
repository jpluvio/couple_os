"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, setAccessToken } from "@/lib/api";
import type { AuthResponse } from "@couple-os/shared";

export default function LoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError(null);

        try {
            // In production, this uses Google Sign-In SDK to get the idToken.
            // For development, we'll use a mock flow.
            if (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID === "your-google-client-id") {
                // DEV MODE: Call a dev-only endpoint that creates a test user
                const res = await api<AuthResponse>("/auth/google", {
                    method: "POST",
                    body: { idToken: "dev-mock-token" },
                });
                setAccessToken(res.accessToken);

                if (res.user.coupleId) {
                    router.push("/dashboard");
                } else {
                    router.push("/onboarding");
                }
                return;
            }

            // PRODUCTION: Use Google Identity Services
            // @ts-expect-error - google is loaded via script
            const { credential } = await new Promise((resolve, reject) => {
                // @ts-expect-error - google global
                google.accounts.id.initialize({
                    client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
                    callback: resolve,
                    auto_select: false,
                });
                // @ts-expect-error - google global
                google.accounts.id.prompt((notification: any) => {
                    if (notification.isNotDisplayed()) {
                        reject(new Error("Google Sign-In not available"));
                    }
                });
            });

            const res = await api<AuthResponse>("/auth/google", {
                method: "POST",
                body: { idToken: credential },
            });

            setAccessToken(res.accessToken);

            if (res.user.coupleId) {
                router.push("/dashboard");
            } else {
                router.push("/onboarding");
            }
        } catch (err: any) {
            setError(err.message || "Login failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-violet-50 flex items-center justify-center">
            <div className="w-full max-w-md px-6">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-400 to-violet-500 shadow-lg shadow-rose-200/50 mb-5">
                        <span className="text-3xl">💕</span>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">Welcome back</h1>
                    <p className="mt-2 text-gray-500">
                        Sign in to your shared space
                    </p>
                </div>

                {/* Login Card */}
                <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl shadow-gray-200/50 border border-white/60 p-8">
                    {error && (
                        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-white border-2 border-gray-100 text-gray-700 font-medium hover:border-gray-200 hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-gray-300 border-t-rose-500 rounded-full animate-spin" />
                        ) : (
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path
                                    fill="#4285F4"
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                                />
                                <path
                                    fill="#34A853"
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                />
                                <path
                                    fill="#FBBC05"
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                />
                                <path
                                    fill="#EA4335"
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                />
                            </svg>
                        )}
                        {loading ? "Signing in..." : "Continue with Google"}
                    </button>

                    <p className="mt-6 text-center text-xs text-gray-400">
                        By continuing, you agree to our Terms of Service and Privacy Policy.
                    </p>
                </div>
            </div>

            {/* Google Identity Services Script (production) */}
            {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID !== "your-google-client-id" && (
                <script src="https://accounts.google.com/gsi/client" async defer />
            )}
        </div>
    );
}
