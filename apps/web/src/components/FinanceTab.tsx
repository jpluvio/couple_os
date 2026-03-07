"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { Expense, FinancialGoal } from "@couple-os/shared";
import { EXPENSE_CATEGORIES } from "@couple-os/shared";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";

type SubTab = "expenses" | "goals" | "analytics";

export default function FinanceTab() {
    const [subTab, setSubTab] = useState<SubTab>("expenses");

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-xl font-semibold text-gray-900">Finance Tracker</h2>
                <p className="text-sm text-gray-400 mt-0.5">Manage your shared expenses and goals</p>
            </div>

            {/* SubTab Selector */}
            <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
                {[
                    { id: "expenses" as SubTab, label: "💸 Expenses" },
                    { id: "analytics" as SubTab, label: "📊 Analytics" },
                    { id: "goals" as SubTab, label: "🎯 Goals" },
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

            {subTab === "expenses" && <ExpensesSection />}
            {subTab === "analytics" && <AnalyticsSection />}
            {subTab === "goals" && <GoalsSection />}
        </div>
    );
}

function ExpensesSection() {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [amount, setAmount] = useState("");
    const [category, setCategory] = useState("Groceries");
    const [note, setNote] = useState("");

    const fetchExpenses = useCallback(async () => {
        try {
            const data = await api<{ expenses: Expense[] }>("/finance/expenses");
            setExpenses(data.expenses);
        } catch { /* */ } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

    const handleAdd = async () => {
        const amt = parseFloat(amount);
        if (!amt || amt <= 0) return;
        await api("/finance/expenses", { method: "POST", body: { amount: amt, category, note: note || undefined } });
        setAmount(""); setNote(""); setShowAdd(false); fetchExpenses();
    };

    const handleDelete = async (id: string) => {
        await api(`/finance/expenses/${id}`, { method: "DELETE" }); fetchExpenses();
    };

    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    const byCategory = expenses.reduce((acc, e) => { acc[e.category] = (acc[e.category] || 0) + e.amount; return acc; }, {} as Record<string, number>);

    if (loading) return <Spinner />;

    return (
        <>
            {/* Summary */}
            <div className="bg-gradient-to-r from-rose-500 to-violet-500 rounded-2xl p-5 text-white">
                <p className="text-sm opacity-80">Total This Month</p>
                <p className="text-3xl font-bold mt-1">€{total.toFixed(2)}</p>
                <div className="flex gap-3 mt-3 flex-wrap">
                    {Object.entries(byCategory).sort(([, a], [, b]) => b - a).slice(0, 3).map(([cat, amt]) => (
                        <span key={cat} className="text-xs bg-white/20 px-2 py-1 rounded-full">{cat}: €{amt.toFixed(0)}</span>
                    ))}
                </div>
            </div>

            {/* Add Button */}
            <button onClick={() => setShowAdd(!showAdd)} className="w-full py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-400 hover:border-rose-300 hover:text-rose-400 transition-all">+ Add Expense</button>

            {showAdd && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <label className="text-[10px] text-gray-500 block mb-1">Amount (€)</label>
                            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="w-full px-3 py-2 rounded-lg border border-gray-100 text-sm focus:border-rose-300 outline-none" step="0.01" onKeyDown={(e) => e.key === "Enter" && handleAdd()} />
                        </div>
                        <div className="w-36">
                            <label className="text-[10px] text-gray-500 block mb-1">Category</label>
                            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-2 py-2 rounded-lg border border-gray-100 text-xs">
                                {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>
                    <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className="w-full px-3 py-2 rounded-lg border border-gray-100 text-sm focus:border-rose-300 outline-none" />
                    <button onClick={handleAdd} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-violet-500 text-white font-medium text-sm">Add Expense</button>
                </div>
            )}

            {/* Expenses List */}
            {expenses.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400">
                    <span className="text-4xl block mb-3">💸</span>
                    <p className="text-sm">No expenses this month</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
                    {expenses.map((e) => (
                        <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                            <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm">
                                {e.category === "Groceries" ? "🛒" : e.category === "Dining" ? "🍽️" : e.category === "Transport" ? "🚗" : e.category === "Health" ? "💊" : e.category === "Bills" ? "📄" : e.category === "Rent" ? "🏠" : e.category === "Entertainment" ? "🎬" : "📦"}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-900">{e.category}</div>
                                <div className="text-[10px] text-gray-400">
                                    {e.note && `${e.note} · `}
                                    {new Date(e.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                    {e.paidBy && ` · ${e.paidBy.name}`}
                                </div>
                            </div>
                            <span className="text-sm font-semibold text-gray-900">€{e.amount.toFixed(2)}</span>
                            <button onClick={() => handleDelete(e.id)} className="text-gray-300 hover:text-red-500 transition-colors">✕</button>
                        </div>
                    ))}
                </div>
            )}
        </>
    );
}

// ======================== ANALYTICS ========================

const COLORS = ['#f43f5e', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#6366f1', '#ec4899', '#14b8a6'];

function AnalyticsSection() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchAnalytics = useCallback(async () => {
        try {
            const res = await api<any>("/finance/analytics");
            setData(res);
        } catch { /* */ } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

    if (loading) return <Spinner />;
    if (!data) return null;

    // Transform dictionaries to arrays for Recharts
    const lineData = Object.entries(data.monthlyTotals).map(([month, amount]) => ({ month, amount: amount as number }));
    const donutData = Object.entries(data.categoryTotals).map(([name, value]) => ({ name, value: value as number }));

    return (
        <div className="space-y-6">
            {/* Split Balances */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Recommended Adjustments</h3>
                {data.balances.length === 0 ? (
                    <p className="text-sm text-gray-500">Not enough data to calculate splits.</p>
                ) : (
                    <div className="space-y-4">
                        {data.balances.map((b: any) => (
                            <div key={b.userId} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl">
                                <div>
                                    <div className="font-medium text-sm text-gray-900">{b.name}</div>
                                    <div className="text-[10px] text-gray-500">Paid: ${b.paid.toFixed(2)} / Should pay: ${b.shouldHavePaid.toFixed(2)}</div>
                                </div>
                                <div className={`font-semibold text-sm ${b.balance > 0 ? "text-emerald-500" : b.balance < 0 ? "text-red-500" : "text-gray-900"}`}>
                                    {b.balance > 0 ? `+ $${b.balance.toFixed(2)}` : b.balance < 0 ? `- $${Math.abs(b.balance).toFixed(2)}` : "Settled"}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Monthly Trend (Line Chart) */}
            {lineData.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 pt-5">
                    <h3 className="text-sm font-semibold text-gray-900 mb-6">6-Month Trend</h3>
                    <div className="h-48 w-full -ml-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={lineData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9ca3af" }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9ca3af" }} tickFormatter={(val) => `$${val}`} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Line type="monotone" dataKey="amount" stroke="#f43f5e" strokeWidth={3} dot={{ strokeWidth: 2, r: 4, fill: "#fff" }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Category Breakdown (Donut Chart) */}
            {donutData.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Spending by Category</h3>
                    <div className="h-56 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={donutData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                    {donutData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip formatter={(value: number | undefined) => `$${value ? value.toFixed(2) : '0.00'}`} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    {/* Legend underneath */}
                    <div className="flex flex-wrap gap-3 justify-center mt-2">
                        {donutData.map((d, i) => (
                            <div key={d.name} className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                <span className="text-[10px] text-gray-500 font-medium">{d.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ======================== GOALS ========================

function GoalsSection() {
    const [goals, setGoals] = useState<FinancialGoal[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [title, setTitle] = useState("");
    const [target, setTarget] = useState("");

    const fetchGoals = useCallback(async () => {
        try {
            const data = await api<{ goals: FinancialGoal[] }>("/finance/goals");
            setGoals(data.goals);
        } catch { /* */ } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchGoals(); }, [fetchGoals]);

    const handleAdd = async () => {
        const t = parseFloat(target);
        if (!title.trim() || !t || t <= 0) return;
        await api("/finance/goals", { method: "POST", body: { title, targetAmount: t } });
        setTitle(""); setTarget(""); setShowAdd(false); fetchGoals();
    };

    const handleAddSaved = async (goal: FinancialGoal) => {
        const addStr = prompt("How much to add? (€)");
        if (!addStr) return;
        const add = parseFloat(addStr);
        if (!add || add <= 0) return;
        await api(`/finance/goals/${goal.id}`, { method: "PATCH", body: { savedAmount: goal.savedAmount + add } });
        fetchGoals();
    };

    const handleDelete = async (id: string) => {
        await api(`/finance/goals/${id}`, { method: "DELETE" }); fetchGoals();
    };

    if (loading) return <Spinner />;

    return (
        <>
            <button onClick={() => setShowAdd(!showAdd)} className="w-full py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-400 hover:border-rose-300 hover:text-rose-400 transition-all">+ New Goal</button>

            {showAdd && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex gap-2 items-end">
                    <div className="flex-1">
                        <label className="text-[10px] text-gray-500 block mb-1">Goal</label>
                        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Vacation fund" className="w-full px-3 py-2 rounded-lg border border-gray-100 text-sm focus:border-rose-300 outline-none" />
                    </div>
                    <div className="w-28">
                        <label className="text-[10px] text-gray-500 block mb-1">Target (€)</label>
                        <input type="number" value={target} onChange={(e) => setTarget(e.target.value)} className="w-full px-2 py-2 rounded-lg border border-gray-100 text-sm outline-none" step="100" />
                    </div>
                    <button onClick={handleAdd} className="px-4 py-2 rounded-lg bg-rose-500 text-white text-sm font-medium">Create</button>
                </div>
            )}

            {goals.length === 0 && !showAdd ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400">
                    <span className="text-4xl block mb-3">🎯</span>
                    <p className="text-sm">No financial goals yet</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {goals.map((g) => {
                        const pct = Math.min((g.savedAmount / g.targetAmount) * 100, 100);
                        return (
                            <div key={g.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-medium text-gray-900 text-sm">{g.title}</h4>
                                        <p className="text-xs text-gray-400 mt-0.5">€{g.savedAmount.toFixed(0)} / €{g.targetAmount.toFixed(0)}</p>
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => handleAddSaved(g)} className="px-2 py-1 rounded-lg text-xs bg-emerald-50 text-emerald-600 font-medium hover:bg-emerald-100 transition-colors">+ Add</button>
                                        <button onClick={() => handleDelete(g.id)} className="p-1 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 text-sm transition-colors">✕</button>
                                    </div>
                                </div>
                                <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-rose-500 to-violet-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                </div>
                                <p className="text-[10px] text-right text-gray-400 mt-1">{pct.toFixed(0)}%</p>
                            </div>
                        );
                    })}
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
