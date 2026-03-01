"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { TodoItem } from "@couple-os/shared";

interface ListSummary {
    id: string;
    name: string;
    emoji: string | null;
    totalItems: number;
    pendingItems: number;
}

const PRIORITY_CONFIG = {
    HIGH: { label: "High", color: "text-red-500", bg: "bg-red-50", dot: "bg-red-500" },
    MEDIUM: { label: "Med", color: "text-amber-500", bg: "bg-amber-50", dot: "bg-amber-500" },
    LOW: { label: "Low", color: "text-blue-500", bg: "bg-blue-50", dot: "bg-blue-500" },
};

const STATUS_CONFIG = {
    TODO: { label: "To Do", color: "text-gray-500", bg: "bg-gray-100" },
    IN_PROGRESS: { label: "In Progress", color: "text-violet-600", bg: "bg-violet-50" },
    DONE: { label: "Done", color: "text-emerald-600", bg: "bg-emerald-50" },
};

export default function TodoTab() {
    const [lists, setLists] = useState<ListSummary[]>([]);
    const [activeList, setActiveList] = useState<string | null>(null);
    const [items, setItems] = useState<TodoItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [itemsLoading, setItemsLoading] = useState(false);

    // New list form
    const [showNewList, setShowNewList] = useState(false);
    const [newListName, setNewListName] = useState("");
    const [newListEmoji, setNewListEmoji] = useState("📝");

    // New item form
    const [showNewItem, setShowNewItem] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newPriority, setNewPriority] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");

    const fetchLists = useCallback(async () => {
        try {
            const data = await api<{ lists: ListSummary[] }>("/todos");
            setLists(data.lists);
            if (!activeList && data.lists.length > 0) {
                setActiveList(data.lists[0].id);
            }
        } catch {
            //
        } finally {
            setLoading(false);
        }
    }, [activeList]);

    const fetchItems = useCallback(async (listId: string) => {
        setItemsLoading(true);
        try {
            const data = await api<{ items: TodoItem[] }>(`/todos/${listId}/items`);
            setItems(data.items);
        } catch {
            //
        } finally {
            setItemsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLists();
    }, [fetchLists]);

    useEffect(() => {
        if (activeList) fetchItems(activeList);
    }, [activeList, fetchItems]);

    const handleCreateList = async () => {
        if (!newListName.trim()) return;
        await api("/todos", {
            method: "POST",
            body: { name: newListName, emoji: newListEmoji || undefined },
        });
        setNewListName("");
        setShowNewList(false);
        fetchLists();
    };

    const handleDeleteList = async (listId: string) => {
        await api(`/todos/${listId}`, { method: "DELETE" });
        if (activeList === listId) setActiveList(null);
        fetchLists();
    };

    const handleCreateItem = async () => {
        if (!activeList || !newTitle.trim()) return;
        await api(`/todos/${activeList}/items`, {
            method: "POST",
            body: { title: newTitle, priority: newPriority },
        });
        setNewTitle("");
        setShowNewItem(false);
        fetchItems(activeList);
        fetchLists();
    };

    const handleToggleStatus = async (item: TodoItem) => {
        if (!activeList) return;
        const next =
            item.status === "TODO"
                ? "IN_PROGRESS"
                : item.status === "IN_PROGRESS"
                    ? "DONE"
                    : "TODO";
        await api(`/todos/${activeList}/items/${item.id}`, {
            method: "PATCH",
            body: { status: next },
        });
        fetchItems(activeList);
        fetchLists();
    };

    const handleDeleteItem = async (itemId: string) => {
        if (!activeList) return;
        await api(`/todos/${activeList}/items/${itemId}`, { method: "DELETE" });
        fetchItems(activeList);
        fetchLists();
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
                    <h2 className="text-xl font-semibold text-gray-900">To-Do Lists</h2>
                    <p className="text-sm text-gray-400 mt-0.5">
                        Stay organized together
                    </p>
                </div>
                <button
                    onClick={() => setShowNewList(!showNewList)}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-violet-500 text-white text-sm font-medium shadow-md shadow-rose-200/40 hover:shadow-lg transition-all"
                >
                    + New List
                </button>
            </div>

            {/* New List Form */}
            {showNewList && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex gap-3">
                    <input
                        type="text"
                        value={newListEmoji}
                        onChange={(e) => setNewListEmoji(e.target.value)}
                        className="w-12 text-center px-2 py-2 rounded-lg border border-gray-100 text-lg"
                        maxLength={4}
                    />
                    <input
                        type="text"
                        value={newListName}
                        onChange={(e) => setNewListName(e.target.value)}
                        placeholder="List name..."
                        className="flex-1 px-4 py-2 rounded-xl border border-gray-100 focus:border-rose-300 outline-none text-gray-900 placeholder-gray-300 bg-gray-50/50"
                        onKeyDown={(e) => e.key === "Enter" && handleCreateList()}
                    />
                    <button
                        onClick={handleCreateList}
                        className="px-4 py-2 rounded-xl bg-rose-500 text-white text-sm font-medium"
                    >
                        Create
                    </button>
                </div>
            )}

            {/* Lists Row */}
            {lists.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {lists.map((list) => (
                        <button
                            key={list.id}
                            onClick={() => setActiveList(list.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${activeList === list.id
                                    ? "bg-gradient-to-r from-rose-500 to-violet-500 text-white shadow-md shadow-rose-200/40"
                                    : "bg-white border border-gray-100 text-gray-700 hover:bg-gray-50"
                                }`}
                        >
                            <span>{list.emoji || "📝"}</span>
                            <span>{list.name}</span>
                            {list.pendingItems > 0 && (
                                <span
                                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeList === list.id
                                            ? "bg-white/25 text-white"
                                            : "bg-rose-100 text-rose-600"
                                        }`}
                                >
                                    {list.pendingItems}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {lists.length === 0 && !showNewList && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
                    <span className="text-5xl block mb-4">✅</span>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">
                        No lists yet
                    </h3>
                    <p className="text-sm text-gray-400">
                        Create your first shared to-do list!
                    </p>
                </div>
            )}

            {/* Items */}
            {activeList && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    {/* List Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">
                                {lists.find((l) => l.id === activeList)?.emoji || "📝"}
                            </span>
                            <h3 className="font-semibold text-gray-900">
                                {lists.find((l) => l.id === activeList)?.name}
                            </h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowNewItem(!showNewItem)}
                                className="text-sm text-rose-500 font-medium hover:text-rose-600"
                            >
                                + Add task
                            </button>
                            <button
                                onClick={() => handleDeleteList(activeList)}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors text-sm"
                                title="Delete list"
                            >
                                🗑️
                            </button>
                        </div>
                    </div>

                    {/* New Item Form */}
                    {showNewItem && (
                        <div className="px-5 py-3 border-b border-gray-50 flex gap-3 items-center">
                            <input
                                type="text"
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                placeholder="Task title..."
                                className="flex-1 px-3 py-2 rounded-lg border border-gray-100 text-sm focus:border-rose-300 outline-none text-gray-900 placeholder-gray-300"
                                onKeyDown={(e) => e.key === "Enter" && handleCreateItem()}
                            />
                            <select
                                value={newPriority}
                                onChange={(e) =>
                                    setNewPriority(e.target.value as "LOW" | "MEDIUM" | "HIGH")
                                }
                                className="px-2 py-2 rounded-lg border border-gray-100 text-xs text-gray-600"
                            >
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                            </select>
                            <button
                                onClick={handleCreateItem}
                                className="px-3 py-2 rounded-lg bg-rose-500 text-white text-xs font-medium"
                            >
                                Add
                            </button>
                        </div>
                    )}

                    {/* Items List */}
                    {itemsLoading ? (
                        <div className="p-8 flex justify-center">
                            <div className="w-5 h-5 border-2 border-gray-200 border-t-rose-500 rounded-full animate-spin" />
                        </div>
                    ) : items.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 text-sm">
                            No tasks yet — add one above!
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {items.map((item) => (
                                <div
                                    key={item.id}
                                    className={`flex items-center gap-3 px-5 py-3 hover:bg-gray-50/50 transition-colors ${item.status === "DONE" ? "opacity-50" : ""
                                        }`}
                                >
                                    {/* Status toggle */}
                                    <button
                                        onClick={() => handleToggleStatus(item)}
                                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${item.status === "DONE"
                                                ? "bg-emerald-500 border-emerald-500"
                                                : item.status === "IN_PROGRESS"
                                                    ? "border-violet-400 bg-violet-100"
                                                    : "border-gray-300 hover:border-gray-400"
                                            }`}
                                    >
                                        {item.status === "DONE" && (
                                            <span className="text-white text-[10px]">✓</span>
                                        )}
                                        {item.status === "IN_PROGRESS" && (
                                            <span className="text-violet-600 text-[8px]">●</span>
                                        )}
                                    </button>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div
                                            className={`text-sm font-medium ${item.status === "DONE"
                                                    ? "line-through text-gray-400"
                                                    : "text-gray-900"
                                                }`}
                                        >
                                            {item.title}
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            {item.assignee && (
                                                <span className="text-[10px] text-gray-400">
                                                    → {item.assignee.name}
                                                </span>
                                            )}
                                            {item.deadline && (
                                                <span className="text-[10px] text-gray-400">
                                                    📅{" "}
                                                    {new Date(item.deadline).toLocaleDateString("en-US", {
                                                        month: "short",
                                                        day: "numeric",
                                                    })}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Priority badge */}
                                    <span
                                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${PRIORITY_CONFIG[item.priority as keyof typeof PRIORITY_CONFIG].bg
                                            } ${PRIORITY_CONFIG[item.priority as keyof typeof PRIORITY_CONFIG].color
                                            }`}
                                    >
                                        {PRIORITY_CONFIG[item.priority as keyof typeof PRIORITY_CONFIG].label}
                                    </span>

                                    {/* Status badge */}
                                    <span
                                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG].bg
                                            } ${STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG].color
                                            }`}
                                    >
                                        {STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG].label}
                                    </span>

                                    {/* Delete */}
                                    <button
                                        onClick={() => handleDeleteItem(item.id)}
                                        className="p-1 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
