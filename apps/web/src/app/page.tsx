import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-violet-50 flex items-center justify-center">
      <div className="text-center max-w-lg px-6">
        {/* Logo / Hero */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-400 to-violet-500 shadow-lg shadow-rose-200/50 mb-6">
            <span className="text-4xl">💕</span>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-rose-500 to-violet-600 bg-clip-text text-transparent">
            Couple OS
          </h1>
          <p className="mt-3 text-gray-500 text-lg">
            Your shared digital space for everything that matters.
          </p>
        </div>

        {/* CTA */}
        <Link
          href="/login"
          className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-rose-500 to-violet-500 text-white font-semibold text-lg shadow-lg shadow-rose-300/40 hover:shadow-xl hover:shadow-rose-300/50 transition-all duration-300 hover:-translate-y-0.5"
        >
          Get Started
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 7l5 5m0 0l-5 5m5-5H6"
            />
          </svg>
        </Link>

        {/* Features hint */}
        <div className="mt-16 grid grid-cols-3 gap-4 text-sm text-gray-400">
          <div className="flex flex-col items-center gap-2">
            <span className="text-2xl">📋</span>
            <span>Shared Lists</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="text-2xl">📅</span>
            <span>Calendar</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="text-2xl">💰</span>
            <span>Finances</span>
          </div>
        </div>
      </div>
    </div>
  );
}
