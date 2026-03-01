"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, clearAccessToken, getAccessToken } from "@/lib/api";

interface UserData {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    coupleId: string | null;
    couple: {
        id: string;
        name: string | null;
        members: { id: string; name: string; avatarUrl: string | null }[];
    } | null;
}

const NAV_ITEMS = [
    { icon: "📋", label: "Board", id: "board" },
    { icon: "📅", label: "Calendar", id: "calendar" },
    { icon: "✅", label: "To-Do", id: "todo" },
    { icon: "🛒", label: "Pantry", id: "pantry" },
    { icon: "💰", label: "Finance", id: "finance" },
    { icon: "💬", label: "Check-in", id: "checkin" },
    { icon: "📸", label: "Memories", id: "memories" },
];

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<UserData | null>(null);
    const [activeTab, setActiveTab] = useState("board");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = getAccessToken();
        if (!token) {
            router.push("/login");
            return;
        }

        api<UserData>("/auth/me")
            .then(setUser)
            .catch(() => {
                clearAccessToken();
                router.push("/login");
            })
            .finally(() => setLoading(false));
    }, [router]);

    const handleLogout = async () => {
        await api("/auth/logout", { method: "POST" }).catch(() => { });
        clearAccessToken();
        router.push("/login");
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="w-8 h-8 border-3 border-gray-200 border-t-rose-500 rounded-full animate-spin" />
            </div>
        );
    }

    const partner = user?.couple?.members.find((m) => m.id !== user.id);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Top Bar */}
            <header className="bg-white/80 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-50">
                <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-400 to-violet-500 flex items-center justify-center">
                            <span className="text-sm">💕</span>
                        </div>
                        <h1 className="font-semibold text-gray-900">
                            {user?.couple?.name || "Couple OS"}
                        </h1>
                    </div>

                    <div className="flex items-center gap-4">
                        {partner && (
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <span>with</span>
                                <span className="font-medium text-gray-700">
                                    {partner.name}
                                </span>
                            </div>
                        )}
                        <button
                            onClick={handleLogout}
                            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            Sign out
                        </button>
                    </div>
                </div>
            </header>

            {/* Content Area */}
            <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 min-h-[400px] flex items-center justify-center">
                    <div className="text-center text-gray-400">
                        <span className="text-5xl block mb-4">
                            {NAV_ITEMS.find((n) => n.id === activeTab)?.icon}
                        </span>
                        <h2 className="text-xl font-semibold text-gray-700 mb-2">
                            {NAV_ITEMS.find((n) => n.id === activeTab)?.label}
                        </h2>
                        <p className="text-sm">Coming in Phase 1 ✨</p>
                    </div>
                </div>
            </main>

            {/* Bottom Navigation (mobile-first) */}
            <nav className="bg-white/80 backdrop-blur-xl border-t border-gray-100 sticky bottom-0 z-50 py-2 px-2">
                <div className="max-w-5xl mx-auto flex justify-around">
                    {NAV_ITEMS.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-all ${activeTab === item.id
                                    ? "text-rose-600 bg-rose-50"
                                    : "text-gray-400 hover:text-gray-600"
                                }`}
                        >
                            <span className="text-lg">{item.icon}</span>
                            <span className="text-[10px] font-medium">{item.label}</span>
                        </button>
                    ))}
                </div>
            </nav>
        </div>
    );
}
