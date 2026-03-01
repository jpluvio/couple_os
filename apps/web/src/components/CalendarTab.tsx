"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { Event } from "@couple-os/shared";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

interface EventForm {
    title: string;
    description: string;
    location: string;
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
    allDay: boolean;
    color: string;
}

const DEFAULT_FORM: EventForm = {
    title: "",
    description: "",
    location: "",
    startDate: "",
    startTime: "09:00",
    endDate: "",
    endTime: "10:00",
    allDay: false,
    color: "#E11D48",
};

const COLOR_OPTIONS = [
    "#E11D48", // rose
    "#7C3AED", // violet
    "#2563EB", // blue
    "#059669", // emerald
    "#D97706", // amber
    "#DC2626", // red
];

export default function CalendarTab() {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState<EventForm>(DEFAULT_FORM);
    const [submitting, setSubmitting] = useState(false);
    const [view, setView] = useState<"month" | "list">("month");

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const fetchEvents = useCallback(async () => {
        try {
            const from = new Date(year, month, 1).toISOString();
            const to = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
            const data = await api<{ events: Event[] }>(
                `/events?from=${from}&to=${to}`
            );
            setEvents(data.events);
        } catch {
            // not in couple or not authenticated
        } finally {
            setLoading(false);
        }
    }, [year, month]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    const prevMonth = () =>
        setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () =>
        setCurrentDate(new Date(year, month + 1, 1));

    const handleSelectDate = (date: Date) => {
        setSelectedDate(date);
        const iso = date.toISOString().split("T")[0];
        setForm({
            ...DEFAULT_FORM,
            startDate: iso,
            endDate: iso,
        });
    };

    const handleCreateEvent = async () => {
        if (!form.title.trim()) return;
        setSubmitting(true);
        try {
            const startAt = form.allDay
                ? `${form.startDate}T00:00:00.000Z`
                : `${form.startDate}T${form.startTime}:00.000Z`;
            const endAt = form.allDay
                ? `${form.endDate}T23:59:59.000Z`
                : `${form.endDate}T${form.endTime}:00.000Z`;

            await api("/events", {
                method: "POST",
                body: {
                    title: form.title,
                    description: form.description || undefined,
                    location: form.location || undefined,
                    startAt,
                    endAt,
                    allDay: form.allDay,
                    color: form.color,
                },
            });
            setShowForm(false);
            setForm(DEFAULT_FORM);
            fetchEvents();
        } catch {
            // error
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteEvent = async (id: string) => {
        await api(`/events/${id}`, { method: "DELETE" });
        fetchEvents();
    };

    // Calendar grid helpers
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    const getEventsForDay = (day: number) => {
        const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        return events.filter((e) => {
            const start = e.startAt.split("T")[0];
            const end = e.endAt.split("T")[0];
            return dateStr >= start && dateStr <= end;
        });
    };

    const selectedDateEvents = selectedDate
        ? getEventsForDay(selectedDate.getDate())
        : [];

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
                    <h2 className="text-xl font-semibold text-gray-900">Calendar</h2>
                    <p className="text-sm text-gray-400 mt-0.5">
                        Your shared schedule, side by side
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setView(view === "month" ? "list" : "month")}
                        className="px-3 py-2 rounded-xl text-sm font-medium text-gray-500 bg-white border border-gray-100 hover:bg-gray-50 transition-all"
                    >
                        {view === "month" ? "📋 List" : "📅 Grid"}
                    </button>
                    <button
                        onClick={() => {
                            setShowForm(true);
                            const tod = new Date().toISOString().split("T")[0];
                            setForm({ ...DEFAULT_FORM, startDate: tod, endDate: tod });
                        }}
                        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-violet-500 text-white text-sm font-medium shadow-md shadow-rose-200/40 hover:shadow-lg transition-all"
                    >
                        + New Event
                    </button>
                </div>
            </div>

            {/* Month Navigation */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                    <button
                        onClick={prevMonth}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                    >
                        ←
                    </button>
                    <h3 className="font-semibold text-gray-900">
                        {MONTHS[month]} {year}
                    </h3>
                    <button
                        onClick={nextMonth}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                    >
                        →
                    </button>
                </div>

                {view === "month" ? (
                    <>
                        {/* Day Headers */}
                        <div className="grid grid-cols-7 border-b border-gray-50">
                            {DAYS.map((d) => (
                                <div
                                    key={d}
                                    className="text-center text-xs font-medium text-gray-400 py-3"
                                >
                                    {d}
                                </div>
                            ))}
                        </div>

                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7">
                            {/* Empty cells before first day */}
                            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                                <div key={`empty-${i}`} className="h-24 border-r border-b border-gray-50" />
                            ))}

                            {/* Month days */}
                            {Array.from({ length: daysInMonth }).map((_, i) => {
                                const day = i + 1;
                                const isToday =
                                    day === today.getDate() &&
                                    month === today.getMonth() &&
                                    year === today.getFullYear();
                                const dayEvents = getEventsForDay(day);
                                const isSelected =
                                    selectedDate?.getDate() === day &&
                                    selectedDate?.getMonth() === month;

                                return (
                                    <button
                                        key={day}
                                        onClick={() =>
                                            handleSelectDate(new Date(year, month, day))
                                        }
                                        className={`h-24 border-r border-b border-gray-50 p-1.5 text-left hover:bg-gray-50/50 transition-colors ${isSelected ? "bg-rose-50/50" : ""
                                            }`}
                                    >
                                        <span
                                            className={`inline-flex items-center justify-center w-7 h-7 text-sm rounded-full ${isToday
                                                    ? "bg-rose-500 text-white font-bold"
                                                    : "text-gray-700"
                                                }`}
                                        >
                                            {day}
                                        </span>
                                        <div className="mt-1 space-y-0.5">
                                            {dayEvents.slice(0, 2).map((e) => (
                                                <div
                                                    key={e.id}
                                                    className="text-[10px] px-1.5 py-0.5 rounded truncate font-medium"
                                                    style={{
                                                        backgroundColor: `${e.color || "#E11D48"}20`,
                                                        color: e.color || "#E11D48",
                                                    }}
                                                >
                                                    {e.title}
                                                </div>
                                            ))}
                                            {dayEvents.length > 2 && (
                                                <span className="text-[10px] text-gray-400 px-1.5">
                                                    +{dayEvents.length - 2} more
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </>
                ) : (
                    /* List View */
                    <div className="divide-y divide-gray-50">
                        {events.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 text-sm">
                                No events this month
                            </div>
                        ) : (
                            events.map((event) => (
                                <div
                                    key={event.id}
                                    className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50/50 transition-colors"
                                >
                                    <div
                                        className="w-1 h-10 rounded-full"
                                        style={{ backgroundColor: event.color || "#E11D48" }}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm text-gray-900 truncate">
                                            {event.title}
                                        </div>
                                        <div className="text-xs text-gray-400">
                                            {new Date(event.startAt).toLocaleDateString("en-US", {
                                                month: "short",
                                                day: "numeric",
                                            })}
                                            {!event.allDay &&
                                                ` · ${new Date(event.startAt).toLocaleTimeString("en-US", {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}`}
                                            {event.location && ` · 📍 ${event.location}`}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteEvent(event.id)}
                                        className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors text-sm"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Selected Date Detail */}
            {selectedDate && view === "month" && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-900">
                            {selectedDate.toLocaleDateString("en-US", {
                                weekday: "long",
                                month: "long",
                                day: "numeric",
                            })}
                        </h3>
                        <button
                            onClick={() => {
                                setShowForm(true);
                                const iso = selectedDate.toISOString().split("T")[0];
                                setForm({ ...DEFAULT_FORM, startDate: iso, endDate: iso });
                            }}
                            className="text-sm text-rose-500 font-medium hover:text-rose-600"
                        >
                            + Add event
                        </button>
                    </div>

                    {selectedDateEvents.length === 0 ? (
                        <p className="text-sm text-gray-400">No events on this day</p>
                    ) : (
                        <div className="space-y-2">
                            {selectedDateEvents.map((event) => (
                                <div
                                    key={event.id}
                                    className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/50"
                                >
                                    <div
                                        className="w-1 h-8 rounded-full"
                                        style={{ backgroundColor: event.color || "#E11D48" }}
                                    />
                                    <div className="flex-1">
                                        <div className="font-medium text-sm text-gray-900">
                                            {event.title}
                                        </div>
                                        <div className="text-xs text-gray-400">
                                            {event.allDay
                                                ? "All day"
                                                : `${new Date(event.startAt).toLocaleTimeString("en-US", {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })} - ${new Date(event.endAt).toLocaleTimeString("en-US", {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}`}
                                            {event.location && ` · 📍 ${event.location}`}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteEvent(event.id)}
                                        className="text-gray-400 hover:text-red-500 transition-colors text-sm"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Create Event Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900">
                                New Event
                            </h3>
                            <button
                                onClick={() => setShowForm(false)}
                                className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"
                            >
                                ✕
                            </button>
                        </div>

                        <input
                            type="text"
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                            placeholder="Event title"
                            className="w-full px-4 py-3 rounded-xl border border-gray-100 focus:border-rose-300 outline-none text-gray-900 placeholder-gray-300 bg-gray-50/50"
                        />

                        <div className="flex items-center gap-3">
                            <label className="flex items-center gap-2 text-sm text-gray-600">
                                <input
                                    type="checkbox"
                                    checked={form.allDay}
                                    onChange={(e) =>
                                        setForm({ ...form, allDay: e.target.checked })
                                    }
                                    className="rounded border-gray-300"
                                />
                                All day
                            </label>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">
                                    Start date
                                </label>
                                <input
                                    type="date"
                                    value={form.startDate}
                                    onChange={(e) =>
                                        setForm({ ...form, startDate: e.target.value })
                                    }
                                    className="w-full px-3 py-2 rounded-lg border border-gray-100 text-sm focus:border-rose-300 outline-none"
                                />
                            </div>
                            {!form.allDay && (
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">
                                        Start time
                                    </label>
                                    <input
                                        type="time"
                                        value={form.startTime}
                                        onChange={(e) =>
                                            setForm({ ...form, startTime: e.target.value })
                                        }
                                        className="w-full px-3 py-2 rounded-lg border border-gray-100 text-sm focus:border-rose-300 outline-none"
                                    />
                                </div>
                            )}
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">
                                    End date
                                </label>
                                <input
                                    type="date"
                                    value={form.endDate}
                                    onChange={(e) =>
                                        setForm({ ...form, endDate: e.target.value })
                                    }
                                    className="w-full px-3 py-2 rounded-lg border border-gray-100 text-sm focus:border-rose-300 outline-none"
                                />
                            </div>
                            {!form.allDay && (
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">
                                        End time
                                    </label>
                                    <input
                                        type="time"
                                        value={form.endTime}
                                        onChange={(e) =>
                                            setForm({ ...form, endTime: e.target.value })
                                        }
                                        className="w-full px-3 py-2 rounded-lg border border-gray-100 text-sm focus:border-rose-300 outline-none"
                                    />
                                </div>
                            )}
                        </div>

                        <input
                            type="text"
                            value={form.location}
                            onChange={(e) => setForm({ ...form, location: e.target.value })}
                            placeholder="📍 Location (optional)"
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-100 focus:border-rose-300 outline-none text-sm text-gray-900 placeholder-gray-300 bg-gray-50/50"
                        />

                        <textarea
                            value={form.description}
                            onChange={(e) =>
                                setForm({ ...form, description: e.target.value })
                            }
                            placeholder="Notes (optional)"
                            rows={2}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-100 focus:border-rose-300 outline-none resize-none text-sm text-gray-900 placeholder-gray-300 bg-gray-50/50"
                        />

                        {/* Color picker */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">Color:</span>
                            {COLOR_OPTIONS.map((c) => (
                                <button
                                    key={c}
                                    onClick={() => setForm({ ...form, color: c })}
                                    className={`w-6 h-6 rounded-full transition-all ${form.color === c
                                            ? "ring-2 ring-offset-2 ring-gray-300 scale-110"
                                            : "hover:scale-110"
                                        }`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>

                        <button
                            onClick={handleCreateEvent}
                            disabled={submitting || !form.title.trim()}
                            className="w-full py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-violet-500 text-white font-semibold shadow-lg shadow-rose-200/40 hover:shadow-xl transition-all disabled:opacity-50"
                        >
                            {submitting ? "Creating..." : "Create Event"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
