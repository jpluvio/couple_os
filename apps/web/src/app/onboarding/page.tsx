"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

type Mode = "choose" | "create" | "join";

export default function OnboardingPage() {
    const router = useRouter();
    const [mode, setMode] = useState<Mode>("choose");
    const [coupleName, setCoupleName] = useState("");
    const [inviteCode, setInviteCode] = useState("");
    const [generatedCode, setGeneratedCode] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleCreate = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api<{ inviteCode: string }>("/couples", {
                method: "POST",
                body: { name: coupleName || undefined },
            });
            setGeneratedCode(res.inviteCode);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleJoin = async () => {
        setLoading(true);
        setError(null);
        try {
            await api("/couples/join", {
                method: "POST",
                body: { inviteCode: inviteCode.toUpperCase() },
            });
            router.push("/dashboard");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-violet-50 flex items-center justify-center">
            <div className="w-full max-w-md px-6">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">
                        {mode === "choose" && "Set up your couple"}
                        {mode === "create" && "Create your space"}
                        {mode === "join" && "Join your partner"}
                    </h1>
                    <p className="mt-2 text-gray-500">
                        {mode === "choose" && "Start fresh or join your partner's space."}
                        {mode === "create" && "Your partner will use the code to join."}
                        {mode === "join" && "Enter the code your partner shared with you."}
                    </p>
                </div>

                <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl shadow-gray-200/50 border border-white/60 p-8">
                    {error && (
                        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Choose Mode */}
                    {mode === "choose" && (
                        <div className="space-y-4">
                            <button
                                onClick={() => setMode("create")}
                                className="w-full p-5 rounded-2xl border-2 border-gray-100 hover:border-rose-200 hover:bg-rose-50/50 transition-all text-left group"
                            >
                                <div className="flex items-center gap-4">
                                    <span className="text-3xl">🏠</span>
                                    <div>
                                        <div className="font-semibold text-gray-900 group-hover:text-rose-600 transition-colors">
                                            Create a couple
                                        </div>
                                        <div className="text-sm text-gray-400">
                                            Get an invite code for your partner
                                        </div>
                                    </div>
                                </div>
                            </button>

                            <button
                                onClick={() => setMode("join")}
                                className="w-full p-5 rounded-2xl border-2 border-gray-100 hover:border-violet-200 hover:bg-violet-50/50 transition-all text-left group"
                            >
                                <div className="flex items-center gap-4">
                                    <span className="text-3xl">🔗</span>
                                    <div>
                                        <div className="font-semibold text-gray-900 group-hover:text-violet-600 transition-colors">
                                            Join a couple
                                        </div>
                                        <div className="text-sm text-gray-400">
                                            Enter the code your partner shared
                                        </div>
                                    </div>
                                </div>
                            </button>
                        </div>
                    )}

                    {/* Create Couple */}
                    {mode === "create" && !generatedCode && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Couple name (optional)
                                </label>
                                <input
                                    type="text"
                                    value={coupleName}
                                    onChange={(e) => setCoupleName(e.target.value)}
                                    placeholder="e.g. Team Us 💛"
                                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-rose-300 focus:ring-0 outline-none transition-colors bg-white text-gray-900 placeholder-gray-300"
                                />
                            </div>
                            <button
                                onClick={handleCreate}
                                disabled={loading}
                                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 to-violet-500 text-white font-semibold shadow-lg shadow-rose-200/40 hover:shadow-xl transition-all disabled:opacity-50"
                            >
                                {loading ? "Creating..." : "Create couple"}
                            </button>
                            <button
                                onClick={() => setMode("choose")}
                                className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                ← Back
                            </button>
                        </div>
                    )}

                    {/* Show Invite Code */}
                    {mode === "create" && generatedCode && (
                        <div className="text-center space-y-6">
                            <div className="text-5xl">🎉</div>
                            <p className="text-gray-600">
                                Share this code with your partner:
                            </p>
                            <div className="bg-gray-50 rounded-2xl py-6 px-4">
                                <span className="text-4xl font-mono font-bold tracking-[0.3em] text-gray-900">
                                    {generatedCode}
                                </span>
                            </div>
                            <p className="text-xs text-gray-400">Expires in 48 hours</p>
                            <button
                                onClick={() => router.push("/dashboard")}
                                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 to-violet-500 text-white font-semibold shadow-lg shadow-rose-200/40 hover:shadow-xl transition-all"
                            >
                                Go to Dashboard
                            </button>
                        </div>
                    )}

                    {/* Join Couple */}
                    {mode === "join" && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Invite code
                                </label>
                                <input
                                    type="text"
                                    value={inviteCode}
                                    onChange={(e) =>
                                        setInviteCode(e.target.value.toUpperCase().slice(0, 6))
                                    }
                                    placeholder="ABC123"
                                    maxLength={6}
                                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-violet-300 focus:ring-0 outline-none transition-colors bg-white text-gray-900 placeholder-gray-300 text-center text-2xl font-mono tracking-[0.3em]"
                                />
                            </div>
                            <button
                                onClick={handleJoin}
                                disabled={loading || inviteCode.length !== 6}
                                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-violet-500 to-rose-500 text-white font-semibold shadow-lg shadow-violet-200/40 hover:shadow-xl transition-all disabled:opacity-50"
                            >
                                {loading ? "Joining..." : "Join couple"}
                            </button>
                            <button
                                onClick={() => setMode("choose")}
                                className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                ← Back
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
