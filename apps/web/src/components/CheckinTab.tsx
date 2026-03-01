"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { CheckIn } from "@couple-os/shared";
import { CHECK_IN_PROMPTS } from "@couple-os/shared";

const MOODS = ["😢", "😕", "😐", "🙂", "😍"];

export default function CheckinTab() {
    const [checkins, setCheckins] = useState<CheckIn[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [selectedPrompt, setSelectedPrompt] = useState<string>(CHECK_IN_PROMPTS[0]);
    const [periodType, setPeriodType] = useState<"weekly" | "monthly" | "yearly">("weekly");

    // Response form
    const [respondingId, setRespondingId] = useState<string | null>(null);
    const [mood, setMood] = useState(3);
    const [response, setResponse] = useState("");

    const fetchCheckins = useCallback(async () => {
        try {
            const data = await api<{ checkins: CheckIn[] }>("/checkins");
            setCheckins(data.checkins);
        } catch { /* */ } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchCheckins(); }, [fetchCheckins]);

    const handleCreate = async () => {
        await api("/checkins", { method: "POST", body: { prompt: selectedPrompt, periodType } });
        setShowCreate(false); fetchCheckins();
    };

    const handleRespond = async (id: string) => {
        if (!response.trim()) return;
        await api(`/checkins/${id}/respond`, { method: "POST", body: { mood, response } });
        setRespondingId(null); setResponse(""); setMood(3); fetchCheckins();
    };

    const handleDelete = async (id: string) => {
        await api(`/checkins/${id}`, { method: "DELETE" }); fetchCheckins();
    };

    if (loading) return <Spinner />;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">Check-in Space</h2>
                    <p className="text-sm text-gray-400 mt-0.5">Reflect on your relationship</p>
                </div>
                <button onClick={() => setShowCreate(!showCreate)} className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-violet-500 text-white text-sm font-medium shadow-md shadow-rose-200/40">+ New Check-in</button>
            </div>

            {/* Create Form */}
            {showCreate && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                    <div>
                        <label className="text-xs text-gray-500 block mb-2">Choose a prompt</label>
                        <div className="space-y-2">
                            {CHECK_IN_PROMPTS.map((p) => (
                                <button key={p} onClick={() => setSelectedPrompt(p)} className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all ${selectedPrompt === p ? "bg-rose-50 text-rose-600 border border-rose-200" : "bg-gray-50 text-gray-600 border border-transparent hover:bg-gray-100"}`}>
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex gap-2 items-center">
                        <label className="text-xs text-gray-500">Period:</label>
                        {(["weekly", "monthly", "yearly"] as const).map((p) => (
                            <button key={p} onClick={() => setPeriodType(p)} className={`px-3 py-1 rounded-full text-xs font-medium ${periodType === p ? "bg-violet-100 text-violet-600" : "bg-gray-100 text-gray-500"}`}>
                                {p}
                            </button>
                        ))}
                    </div>
                    <button onClick={handleCreate} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-violet-500 text-white font-medium text-sm">Create Check-in</button>
                </div>
            )}

            {/* Check-in List */}
            {checkins.length === 0 && !showCreate ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400">
                    <span className="text-4xl block mb-3">💬</span>
                    <p className="text-sm">No check-ins yet</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {checkins.map((c) => (
                        <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <div className="flex items-start justify-between">
                                <div>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${c.periodType === "weekly" ? "bg-blue-50 text-blue-600" : c.periodType === "monthly" ? "bg-violet-50 text-violet-600" : "bg-amber-50 text-amber-600"}`}>{c.periodType}</span>
                                    <p className="text-sm font-medium text-gray-900 mt-2">{c.prompt}</p>
                                    <p className="text-[10px] text-gray-400 mt-1">{new Date(c.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                                </div>
                                <button onClick={() => handleDelete(c.id)} className="text-gray-300 hover:text-red-500 transition-colors text-sm">🗑️</button>
                            </div>

                            {/* Responses */}
                            {c.revealed && (
                                <div className="mt-4 grid grid-cols-2 gap-3">
                                    {c.mood1 !== null && (
                                        <div className="bg-rose-50 rounded-xl p-3">
                                            <div className="text-2xl mb-1">{MOODS[(c.mood1 || 1) - 1]}</div>
                                            <p className="text-xs text-gray-700">{c.response1}</p>
                                        </div>
                                    )}
                                    {c.mood2 !== null && (
                                        <div className="bg-violet-50 rounded-xl p-3">
                                            <div className="text-2xl mb-1">{MOODS[(c.mood2 || 1) - 1]}</div>
                                            <p className="text-xs text-gray-700">{c.response2}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {!c.revealed && (
                                <div className="mt-3 text-xs text-gray-400">
                                    {c.mood1 !== null || c.mood2 !== null ? "⏳ Waiting for partner to respond..." : "No responses yet"}
                                </div>
                            )}

                            {/* Respond Button */}
                            {!c.revealed && respondingId !== c.id && (
                                <button onClick={() => setRespondingId(c.id)} className="mt-3 text-sm text-rose-500 font-medium hover:text-rose-600">
                                    ✍️ Respond
                                </button>
                            )}

                            {/* Response Form */}
                            {respondingId === c.id && (
                                <div className="mt-4 border-t border-gray-100 pt-4 space-y-3">
                                    <div>
                                        <label className="text-xs text-gray-500 block mb-2">How are you feeling?</label>
                                        <div className="flex gap-2">
                                            {MOODS.map((emoji, i) => (
                                                <button key={i} onClick={() => setMood(i + 1)} className={`text-2xl p-2 rounded-xl transition-all ${mood === i + 1 ? "bg-rose-100 scale-110" : "hover:bg-gray-100"}`}>
                                                    {emoji}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <textarea value={response} onChange={(e) => setResponse(e.target.value)} placeholder="Share your thoughts..." rows={3} className="w-full px-4 py-2.5 rounded-xl border border-gray-100 text-sm focus:border-rose-300 outline-none resize-none" />
                                    <div className="flex gap-2">
                                        <button onClick={() => handleRespond(c.id)} className="flex-1 py-2 rounded-xl bg-rose-500 text-white text-sm font-medium">Submit</button>
                                        <button onClick={() => setRespondingId(null)} className="px-4 py-2 rounded-xl bg-gray-100 text-gray-500 text-sm">Cancel</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function Spinner() {
    return (
        <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-gray-200 border-t-rose-500 rounded-full animate-spin" />
        </div>
    );
}
