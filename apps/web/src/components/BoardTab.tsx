"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { Post } from "@couple-os/shared";

const EMOJI_OPTIONS = ["❤️", "😂", "👍", "🔥", "😢", "🎉"];

export default function BoardTab() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [composerOpen, setComposerOpen] = useState(false);
    const [newContent, setNewContent] = useState("");
    const [newTags, setNewTags] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState("");

    const fetchPosts = useCallback(async () => {
        try {
            const data = await api<{ posts: Post[] }>("/posts?limit=50");
            setPosts(data.posts);
        } catch {
            // user not in couple or not authenticated
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPosts();
    }, [fetchPosts]);

    const handleCreate = async () => {
        if (!newContent.trim()) return;
        setSubmitting(true);
        try {
            const tags = newTags
                .split(",")
                .map((t) => t.trim().replace(/^#/, ""))
                .filter(Boolean);

            await api("/posts", {
                method: "POST",
                body: { content: newContent, tags: tags.length ? tags : undefined },
            });
            setNewContent("");
            setNewTags("");
            setComposerOpen(false);
            fetchPosts();
        } catch {
            // handle error
        } finally {
            setSubmitting(false);
        }
    };

    const handleTogglePin = async (post: Post) => {
        await api(`/posts/${post.id}`, {
            method: "PATCH",
            body: { pinned: !post.pinned },
        });
        fetchPosts();
    };

    const handleReaction = async (postId: string, emoji: string) => {
        await api(`/posts/${postId}/reactions`, {
            method: "POST",
            body: { emoji },
        });
        fetchPosts();
    };

    const handleDelete = async (postId: string) => {
        await api(`/posts/${postId}`, { method: "DELETE" });
        fetchPosts();
    };

    const handleEdit = async (postId: string) => {
        if (!editContent.trim()) return;
        await api(`/posts/${postId}`, {
            method: "PATCH",
            body: { content: editContent },
        });
        setEditingId(null);
        fetchPosts();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-6 h-6 border-2 border-gray-200 border-t-rose-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">Message Board</h2>
                    <p className="text-sm text-gray-400 mt-0.5">
                        Your shared space for notes, ideas, and sweet nothings
                    </p>
                </div>
                <button
                    onClick={() => setComposerOpen(!composerOpen)}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-violet-500 text-white text-sm font-medium shadow-md shadow-rose-200/40 hover:shadow-lg transition-all"
                >
                    {composerOpen ? "Cancel" : "+ New Post"}
                </button>
            </div>

            {/* Composer */}
            {composerOpen && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                    <textarea
                        value={newContent}
                        onChange={(e) => setNewContent(e.target.value)}
                        placeholder="What's on your mind? 💭"
                        maxLength={500}
                        rows={3}
                        className="w-full px-4 py-3 rounded-xl border border-gray-100 focus:border-rose-300 focus:ring-0 outline-none resize-none text-gray-900 placeholder-gray-300 bg-gray-50/50"
                    />
                    <div className="flex items-center gap-3">
                        <input
                            type="text"
                            value={newTags}
                            onChange={(e) => setNewTags(e.target.value)}
                            placeholder="Tags: idea, important, sweet"
                            className="flex-1 px-3 py-2 rounded-lg border border-gray-100 text-sm focus:border-violet-300 focus:ring-0 outline-none text-gray-700 placeholder-gray-300 bg-gray-50/50"
                        />
                        <span className="text-xs text-gray-400">
                            {newContent.length}/500
                        </span>
                    </div>
                    <div className="flex justify-end">
                        <button
                            onClick={handleCreate}
                            disabled={submitting || !newContent.trim()}
                            className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-violet-500 text-white text-sm font-medium disabled:opacity-50 hover:shadow-md transition-all"
                        >
                            {submitting ? "Posting..." : "Post"}
                        </button>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {posts.length === 0 && !composerOpen && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
                    <span className="text-5xl block mb-4">📋</span>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">
                        No posts yet
                    </h3>
                    <p className="text-sm text-gray-400">
                        Start the conversation! Share a thought, a reminder, or something
                        sweet.
                    </p>
                </div>
            )}

            {/* Posts Feed */}
            <div className="space-y-4">
                {posts.map((post) => (
                    <div
                        key={post.id}
                        className={`bg-white rounded-2xl border shadow-sm p-5 transition-all hover:shadow-md ${post.pinned
                                ? "border-amber-200 bg-amber-50/30"
                                : "border-gray-100"
                            }`}
                    >
                        {/* Post Header */}
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-rose-400 to-violet-400 flex items-center justify-center text-white text-sm font-medium">
                                    {post.author?.name?.charAt(0) || "?"}
                                </div>
                                <div>
                                    <span className="font-medium text-gray-900 text-sm">
                                        {post.author?.name}
                                    </span>
                                    <span className="text-xs text-gray-400 ml-2">
                                        {new Date(post.createdAt).toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                {post.pinned && (
                                    <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full font-medium">
                                        📌 Pinned
                                    </span>
                                )}
                                <button
                                    onClick={() => handleTogglePin(post)}
                                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors text-sm"
                                    title={post.pinned ? "Unpin" : "Pin"}
                                >
                                    📌
                                </button>
                                <button
                                    onClick={() => {
                                        setEditingId(post.id);
                                        setEditContent(post.content);
                                    }}
                                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors text-sm"
                                    title="Edit"
                                >
                                    ✏️
                                </button>
                                <button
                                    onClick={() => handleDelete(post.id)}
                                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors text-sm"
                                    title="Delete"
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>

                        {/* Post Content */}
                        {editingId === post.id ? (
                            <div className="mb-3 space-y-2">
                                <textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    maxLength={500}
                                    rows={2}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-rose-300 outline-none resize-none"
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleEdit(post.id)}
                                        className="px-3 py-1 rounded-lg bg-rose-500 text-white text-xs font-medium"
                                    >
                                        Save
                                    </button>
                                    <button
                                        onClick={() => setEditingId(null)}
                                        className="px-3 py-1 rounded-lg text-gray-500 text-xs"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-gray-700 text-sm leading-relaxed mb-3 whitespace-pre-wrap">
                                {post.content}
                            </p>
                        )}

                        {/* Tags */}
                        {post.tags && post.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-3">
                                {post.tags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="text-xs px-2 py-0.5 rounded-full bg-violet-50 text-violet-500 font-medium"
                                    >
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Reactions */}
                        <div className="flex items-center gap-2 flex-wrap">
                            {(post.reactions || []).map((r) => (
                                <button
                                    key={r.emoji}
                                    onClick={() => handleReaction(post.id, r.emoji)}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${r.reacted
                                            ? "bg-rose-100 text-rose-600 border border-rose-200"
                                            : "bg-gray-50 text-gray-500 border border-gray-100 hover:bg-gray-100"
                                        }`}
                                >
                                    <span>{r.emoji}</span>
                                    <span>{r.count}</span>
                                </button>
                            ))}
                            {/* Quick reaction picker */}
                            <div className="flex gap-0.5 ml-1">
                                {EMOJI_OPTIONS.filter(
                                    (e) => !(post.reactions || []).find((r) => r.emoji === e)
                                )
                                    .slice(0, 3)
                                    .map((emoji) => (
                                        <button
                                            key={emoji}
                                            onClick={() => handleReaction(post.id, emoji)}
                                            className="p-1 rounded-full hover:bg-gray-100 text-sm opacity-40 hover:opacity-100 transition-all"
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
