"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { Memory } from "@couple-os/shared";

export default function MemoriesTab() {
    const [memories, setMemories] = useState<Memory[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [content, setContent] = useState("");
    const [tagInput, setTagInput] = useState("");
    const [tags, setTags] = useState<string[]>([]);

    const fetchMemories = useCallback(async () => {
        try {
            const data = await api<{ memories: Memory[] }>("/memories");
            setMemories(data.memories);
        } catch { /* */ } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchMemories(); }, [fetchMemories]);

    const handleAddTag = () => {
        const tag = tagInput.trim().replace(/^#/, "");
        if (tag && !tags.includes(tag)) {
            setTags([...tags, tag]);
        }
        setTagInput("");
    };

    const handleCreate = async () => {
        if (!content.trim()) return;
        await api("/memories", {
            method: "POST",
            body: { content, tags: tags.length ? tags : undefined },
        });
        setContent(""); setTags([]); setShowCreate(false); fetchMemories();
    };

    const handleDelete = async (id: string) => {
        await api(`/memories/${id}`, { method: "DELETE" }); fetchMemories();
    };

    if (loading) return <Spinner />;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">Memory Box</h2>
                    <p className="text-sm text-gray-400 mt-0.5">Your couple&apos;s journal</p>
                </div>
                <button onClick={() => setShowCreate(!showCreate)} className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-violet-500 text-white text-sm font-medium shadow-md shadow-rose-200/40">+ New Memory</button>
            </div>

            {/* Create Form */}
            {showCreate && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Write about a special moment..."
                        rows={4}
                        className="w-full px-4 py-3 rounded-xl border border-gray-100 text-sm focus:border-rose-300 outline-none resize-none text-gray-900 placeholder-gray-300 bg-gray-50/50"
                    />
                    <div>
                        <label className="text-xs text-gray-500 block mb-1.5">Tags</label>
                        <div className="flex gap-2 flex-wrap mb-2">
                            {tags.map((t) => (
                                <span key={t} className="px-2 py-1 rounded-full bg-rose-50 text-rose-600 text-xs flex items-center gap-1">
                                    #{t}
                                    <button onClick={() => setTags(tags.filter(x => x !== t))} className="text-rose-400 hover:text-rose-600">✕</button>
                                </span>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                placeholder="#trip, #anniversary..."
                                className="flex-1 px-3 py-1.5 rounded-lg border border-gray-100 text-sm focus:border-rose-300 outline-none"
                                onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); handleAddTag(); } }}
                            />
                            <button onClick={handleAddTag} className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 text-xs font-medium">Add</button>
                        </div>
                    </div>
                    <button onClick={handleCreate} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-violet-500 text-white font-medium text-sm">Save Memory</button>
                </div>
            )}

            {/* Timeline */}
            {memories.length === 0 && !showCreate ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400">
                    <span className="text-4xl block mb-3">📸</span>
                    <p className="text-sm">No memories yet. Start writing!</p>
                </div>
            ) : (
                <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-5 top-0 bottom-0 w-px bg-gradient-to-b from-rose-200 via-violet-200 to-transparent" />

                    <div className="space-y-4">
                        {memories.map((m) => (
                            <div key={m.id} className="relative pl-12">
                                {/* Timeline dot */}
                                <div className="absolute left-[14px] top-5 w-3 h-3 rounded-full bg-gradient-to-r from-rose-400 to-violet-400 ring-4 ring-white" />

                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2 text-[10px] text-gray-400">
                                            {m.author && (
                                                <span className="font-medium text-gray-600">{m.author.name}</span>
                                            )}
                                            <span>
                                                {new Date(m.date).toLocaleDateString("en-US", {
                                                    weekday: "short",
                                                    month: "short",
                                                    day: "numeric",
                                                    year: "numeric",
                                                })}
                                            </span>
                                        </div>
                                        <button onClick={() => handleDelete(m.id)} className="text-gray-300 hover:text-red-500 transition-colors text-sm">✕</button>
                                    </div>
                                    <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap leading-relaxed">
                                        {m.content}
                                    </p>
                                    {m.tags.length > 0 && (
                                        <div className="flex gap-1.5 mt-3 flex-wrap">
                                            {m.tags.map((t) => (
                                                <span key={t} className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px]">
                                                    #{t}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
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
