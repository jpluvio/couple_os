"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { PantryItem, ShoppingItem, Recipe } from "@couple-os/shared";

const CATEGORIES = [
    { id: "ALL", label: "All", icon: "🏠" },
    { id: "FRIDGE", label: "Fridge", icon: "🧊" },
    { id: "FREEZER", label: "Freezer", icon: "❄️" },
    { id: "PANTRY", label: "Pantry", icon: "🫙" },
    { id: "BATHROOM", label: "Bathroom", icon: "🛁" },
    { id: "OTHER", label: "Other", icon: "📦" },
];

type SubTab = "pantry" | "shopping" | "cookbook";

export default function PantryTab() {
    const [subTab, setSubTab] = useState<SubTab>("pantry");

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-xl font-semibold text-gray-900">Pantry & Kitchen</h2>
                <p className="text-sm text-gray-400 mt-0.5">Manage your home inventory</p>
            </div>

            {/* SubTab Selector */}
            <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
                {[
                    { id: "pantry" as SubTab, label: "🫙 Pantry" },
                    { id: "shopping" as SubTab, label: "🛒 Shopping" },
                    { id: "cookbook" as SubTab, label: "📖 Recipes" },
                ].map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setSubTab(t.id)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${subTab === t.id
                            ? "bg-white shadow-sm text-gray-900"
                            : "text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {subTab === "pantry" && <PantrySection />}
            {subTab === "shopping" && <ShoppingSection />}
            {subTab === "cookbook" && <CookbookSection />}
        </div>
    );
}

// ======================== PANTRY ========================

function PantrySection() {
    const [items, setItems] = useState<PantryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("ALL");
    const [showAdd, setShowAdd] = useState(false);
    const [name, setName] = useState("");
    const [category, setCategory] = useState("PANTRY");
    const [qty, setQty] = useState("1");
    const [history, setHistory] = useState<string[]>([]);

    const fetchItems = useCallback(async () => {
        try {
            const url = filter === "ALL" ? "/pantry" : `/pantry?category=${filter}`;
            const data = await api<{ items: PantryItem[] }>(url);
            setItems(data.items);

            // Fetch autocomplete history
            const histData = await api<{ history: string[] }>("/pantry/history");
            setHistory(histData.history);
        } catch { /* */ } finally { setLoading(false); }
    }, [filter]);

    useEffect(() => { fetchItems(); }, [fetchItems]);

    const handleAdd = async () => {
        if (!name.trim()) return;
        await api("/pantry", { method: "POST", body: { name, category, quantity: parseInt(qty) || 1 } });
        setName(""); setShowAdd(false); fetchItems();
    };

    const handleToShopping = async (id: string) => {
        await api(`/pantry/${id}/to-shopping`, { method: "POST" });
    };

    const handleDelete = async (id: string) => {
        await api(`/pantry/${id}`, { method: "DELETE" }); fetchItems();
    };

    if (loading) return <Spinner />;

    return (
        <>
            {/* Category Filter */}
            <div className="flex gap-2 overflow-x-auto pb-1">
                {CATEGORIES.map((c) => (
                    <button
                        key={c.id}
                        onClick={() => setFilter(c.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${filter === c.id ? "bg-rose-500 text-white" : "bg-white border border-gray-100 text-gray-600 hover:bg-gray-50"
                            }`}
                    >
                        {c.icon} {c.label}
                    </button>
                ))}
            </div>

            {/* Add Button */}
            <button onClick={() => setShowAdd(!showAdd)} className="w-full py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-400 hover:border-rose-300 hover:text-rose-400 transition-all">
                + Add item
            </button>

            {showAdd && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex gap-2 items-end">
                    <div className="flex-1">
                        <label className="text-[10px] text-gray-500 block mb-1">Name</label>
                        <input list="pantry-suggestions" value={name} onChange={(e) => setName(e.target.value)} placeholder="Product name..." className="w-full px-3 py-2 rounded-lg border border-gray-100 text-sm focus:border-rose-300 outline-none" onKeyDown={(e) => e.key === "Enter" && handleAdd()} />
                        <datalist id="pantry-suggestions">
                            {history.map((h, i) => <option key={i} value={h} />)}
                        </datalist>
                    </div>
                    <div className="w-28">
                        <label className="text-[10px] text-gray-500 block mb-1">Category</label>
                        <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-2 py-2 rounded-lg border border-gray-100 text-xs">
                            {CATEGORIES.filter(c => c.id !== "ALL").map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                        </select>
                    </div>
                    <div className="w-16">
                        <label className="text-[10px] text-gray-500 block mb-1">Qty</label>
                        <input type="number" value={qty} onChange={(e) => setQty(e.target.value)} className="w-full px-2 py-2 rounded-lg border border-gray-100 text-sm text-center" min="0" />
                    </div>
                    <button onClick={handleAdd} className="px-4 py-2 rounded-lg bg-rose-500 text-white text-sm font-medium">Add</button>
                </div>
            )}

            {/* Items */}
            {items.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400">
                    <span className="text-4xl block mb-3">🫙</span>
                    <p className="text-sm">Your pantry is empty</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
                    {items.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50 transition-colors">
                            <span className="text-lg">{CATEGORIES.find(c => c.id === item.category)?.icon || "📦"}</span>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-900 truncate">{item.name}</div>
                                <div className="text-[10px] text-gray-400">
                                    Qty: {item.quantity}{item.unit ? ` ${item.unit}` : ""}
                                    {item.expiresAt && ` · Exp: ${new Date(item.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                                </div>
                            </div>
                            <button onClick={() => handleToShopping(item.id)} className="p-1.5 rounded-lg hover:bg-violet-50 text-gray-400 hover:text-violet-500 text-sm transition-colors" title="Add to shopping list">🛒</button>
                            <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 text-sm transition-colors">✕</button>
                        </div>
                    ))}
                </div>
            )}
        </>
    );
}

// ======================== SHOPPING ========================

function ShoppingSection() {
    const [items, setItems] = useState<ShoppingItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [name, setName] = useState("");
    const [history, setHistory] = useState<string[]>([]);

    const fetchItems = useCallback(async () => {
        try {
            const data = await api<{ items: ShoppingItem[] }>("/shopping");
            setItems(data.items);

            const histData = await api<{ history: string[] }>("/shopping/history");
            setHistory(histData.history);
        } catch { /* */ } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchItems(); }, [fetchItems]);

    const handleAdd = async () => {
        if (!name.trim()) return;
        await api("/shopping", { method: "POST", body: { name } });
        setName(""); fetchItems();
    };

    const handleToggle = async (item: ShoppingItem) => {
        await api(`/shopping/${item.id}`, { method: "PATCH", body: { checked: !item.checked } });
        fetchItems();
    };

    const handleDelete = async (id: string) => {
        await api(`/shopping/${id}`, { method: "DELETE" }); fetchItems();
    };

    const handleClearChecked = async () => {
        await api("/shopping/checked", { method: "DELETE" }); fetchItems();
    };

    const unchecked = items.filter(i => !i.checked);
    const checked = items.filter(i => i.checked);

    if (loading) return <Spinner />;

    return (
        <>
            {/* Quick Add */}
            <div className="flex gap-2">
                <input
                    list="shopping-suggestions"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Add item..."
                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-100 text-sm focus:border-rose-300 outline-none bg-white text-gray-900 placeholder-gray-300"
                    onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                />
                <datalist id="shopping-suggestions">
                    {history.map((h, i) => <option key={i} value={h} />)}
                </datalist>
                <button onClick={handleAdd} className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-violet-500 text-white text-sm font-medium">Add</button>
            </div>

            {/* Unchecked Items */}
            {unchecked.length === 0 && checked.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400">
                    <span className="text-4xl block mb-3">🛒</span>
                    <p className="text-sm">Shopping list is empty</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
                    {unchecked.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                            <button onClick={() => handleToggle(item)} className="w-5 h-5 rounded-full border-2 border-gray-300 hover:border-rose-400 transition-colors" />
                            <div className="flex-1">
                                <span className="text-sm text-gray-900">{item.name}</span>
                                {item.quantity > 1 && <span className="text-xs text-gray-400 ml-2">×{item.quantity}</span>}
                                {item.notes && <span className="text-xs text-gray-400 ml-2">· {item.notes}</span>}
                            </div>
                            <button onClick={() => handleDelete(item.id)} className="text-gray-300 hover:text-red-500 transition-colors">✕</button>
                        </div>
                    ))}

                    {/* Checked Section */}
                    {checked.length > 0 && (
                        <>
                            <div className="px-4 py-2 flex items-center justify-between bg-gray-50/50">
                                <span className="text-xs text-gray-400 font-medium">Checked ({checked.length})</span>
                                <button onClick={handleClearChecked} className="text-[10px] text-red-400 hover:text-red-600 font-medium">Clear all</button>
                            </div>
                            {checked.map((item) => (
                                <div key={item.id} className="flex items-center gap-3 px-4 py-2.5 opacity-50">
                                    <button onClick={() => handleToggle(item)} className="w-5 h-5 rounded-full bg-emerald-500 border-2 border-emerald-500 flex items-center justify-center">
                                        <span className="text-white text-[10px]">✓</span>
                                    </button>
                                    <span className="text-sm text-gray-500 line-through">{item.name}</span>
                                </div>
                            ))}
                        </>
                    )}
                </div>
            )}
        </>
    );
}

// ======================== COOKBOOK ========================

function CookbookSection() {
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [ingredients, setIngredients] = useState<{ name: string; quantity: string }[]>([{ name: "", quantity: "" }]);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const fetchRecipes = useCallback(async () => {
        try {
            const data = await api<{ recipes: Recipe[] }>("/recipes");
            setRecipes(data.recipes);
        } catch { /* */ } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchRecipes(); }, [fetchRecipes]);

    const handleAdd = async () => {
        if (!title.trim()) return;
        const validIngredients = ingredients.filter(i => i.name.trim());
        await api("/recipes", {
            method: "POST",
            body: {
                title,
                description: description || undefined,
                ingredients: validIngredients.length ? validIngredients.map(i => ({ name: i.name, quantity: i.quantity || undefined })) : undefined,
            },
        });
        setTitle(""); setDescription(""); setIngredients([{ name: "", quantity: "" }]); setShowAdd(false); fetchRecipes();
    };

    const handleDelete = async (id: string) => {
        await api(`/recipes/${id}`, { method: "DELETE" }); fetchRecipes();
    };

    const addIngredientRow = () => setIngredients([...ingredients, { name: "", quantity: "" }]);

    if (loading) return <Spinner />;

    return (
        <>
            <button onClick={() => setShowAdd(!showAdd)} className="w-full py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-400 hover:border-rose-300 hover:text-rose-400 transition-all">
                + New Recipe
            </button>

            {showAdd && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                    <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Recipe title..." className="w-full px-4 py-2.5 rounded-xl border border-gray-100 focus:border-rose-300 outline-none text-gray-900 placeholder-gray-300 bg-gray-50/50" />
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Preparation steps..." rows={3} className="w-full px-4 py-2.5 rounded-xl border border-gray-100 focus:border-rose-300 outline-none resize-none text-sm text-gray-900 placeholder-gray-300 bg-gray-50/50" />
                    <div>
                        <label className="text-xs text-gray-500 mb-2 block">Ingredients</label>
                        {ingredients.map((ing, i) => (
                            <div key={i} className="flex gap-2 mb-1.5">
                                <input value={ing.name} onChange={(e) => { const next = [...ingredients]; next[i].name = e.target.value; setIngredients(next); }} placeholder="Ingredient..." className="flex-1 px-3 py-1.5 rounded-lg border border-gray-100 text-sm focus:border-rose-300 outline-none" />
                                <input value={ing.quantity} onChange={(e) => { const next = [...ingredients]; next[i].quantity = e.target.value; setIngredients(next); }} placeholder="Qty" className="w-20 px-2 py-1.5 rounded-lg border border-gray-100 text-sm text-center focus:border-rose-300 outline-none" />
                            </div>
                        ))}
                        <button onClick={addIngredientRow} className="text-xs text-rose-500 font-medium mt-1">+ Add ingredient</button>
                    </div>
                    <button onClick={handleAdd} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-violet-500 text-white font-medium text-sm">Save Recipe</button>
                </div>
            )}

            {recipes.length === 0 && !showAdd ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400">
                    <span className="text-4xl block mb-3">📖</span>
                    <p className="text-sm">No recipes yet</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {recipes.map((recipe) => (
                        <div key={recipe.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <button onClick={() => setExpandedId(expandedId === recipe.id ? null : recipe.id)} className="w-full flex items-center justify-between px-5 py-4 text-left">
                                <div>
                                    <h4 className="font-medium text-gray-900 text-sm">{recipe.title}</h4>
                                    {recipe.ingredients && <span className="text-[10px] text-gray-400">{recipe.ingredients.length} ingredients</span>}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(recipe.id); }} className="p-1 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 text-sm transition-colors">🗑️</button>
                                    <span className="text-gray-400 text-xs">{expandedId === recipe.id ? "▲" : "▼"}</span>
                                </div>
                            </button>
                            {expandedId === recipe.id && (
                                <div className="px-5 pb-4 pt-0 border-t border-gray-50">
                                    {recipe.description && <p className="text-sm text-gray-600 mb-3 whitespace-pre-wrap">{recipe.description}</p>}
                                    {recipe.ingredients && recipe.ingredients.length > 0 && (
                                        <div>
                                            <h5 className="text-xs font-medium text-gray-500 mb-1.5">Ingredients</h5>
                                            <ul className="space-y-1">
                                                {recipe.ingredients.map((ing) => (
                                                    <li key={ing.id} className="text-sm text-gray-700 flex gap-2">
                                                        <span className="text-rose-400">•</span>
                                                        <span>{ing.name}{ing.quantity ? ` — ${ing.quantity}` : ""}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </>
    );
}

function Spinner() {
    return (
        <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-gray-200 border-t-rose-500 rounded-full animate-spin" />
        </div>
    );
}
