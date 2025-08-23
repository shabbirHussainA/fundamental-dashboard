import React, { useEffect, useMemo, useState } from "react";

// The following functions are helper utilities for the application's logic.
const REC_TO_SCORE = {
  STRONG_BUY: 2,
  BUY: 1,
  NEUTRAL: 0,
  SELL: -1,
  STRONG_SELL: -2,
};

// Maps a recommendation string (e.g., 'BUY') to a numerical score.
const recToScore = (rec) =>
  REC_TO_SCORE[(rec || "").toUpperCase()] ?? 0;

// Converts a numerical score into a trend string (Bullish, Bearish, or Neutral).
const trendFromScore = (s) =>
  s > 0 ? "Bullish" : s < 0 ? "Bearish" : "Neutral";

// Provides Tailwind CSS classes for a trend badge based on the trend string.
const trendBadgeCls = (t) =>
  t === "Bullish"
    ? "bg-emerald-100 text-emerald-800"
    : t === "Bearish"
    ? "bg-rose-100 text-rose-800"
    : "bg-gray-100 text-gray-800";

// Parses an FX pair key (e.g., 'OANDA:USDCAD') into its base and quote currencies.
const parseFxPair = (key) => {
const raw = key.includes(':') ? (key.split(':').pop() || '') : key;
  const m = raw.toUpperCase().match(/^[A-Z]{6}$/);
  if (!m) return null;
  const base = raw.slice(0, 3).toUpperCase();
  const quote = raw.slice(3, 6).toUpperCase();
  return { pair: `${base}/${quote}`, base, quote };
};

/* ───────── Main Application Component ───────── */
const App = () => {
  // State variables for data, loading, and errors.
  const [analysisData, setAnalysisData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // State variables for user inputs.
  const [symbols, setSymbols] = useState(
    "OANDA:USDCAD,OANDA:USDCHF,OANDA:USDJPY,OANDA:GBPUSD"
  );
  const [screener, setScreener] = useState("forex");
  const [timeframe, setTimeframe] = useState("1d");

  // Options for the screener and timeframe dropdowns.
  const SCREENER_OPTIONS = [
    { v: "forex", label: "Forex" },
    { v: "crypto", label: "Crypto" },
    { v: "america", label: "US Stocks" },
  ];
  const TF_OPTIONS = ["1m", "5m", "15m", "30m", "1h", "2h", "4h", "1d", "1W", "1M"];

  // Asynchronous function to fetch data from the API.
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Constructs the API URL with the user's selected parameters.
      const apiUrl = `http://127.0.0.1:8000/get_analysis?symbols=${encodeURIComponent(
        symbols
      )}&screener=${encodeURIComponent(
        screener
      )}&timeframe=${encodeURIComponent(timeframe)}`;
      const res = await fetch(apiUrl);
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.detail || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setAnalysisData(data.analysis_data || {});
    } catch (e) {
      setError(e.message || "API error");
      setAnalysisData({});
    } finally {
      setLoading(false);
    }
  };

  // Fetches data on initial component load.
  useEffect(() => {
    fetchData();
  }, []);

  // Transforms the fetched analysis data into a structured array for rendering.
  const rows = useMemo(() => {
    const out = [];

    for (const [key, payload] of Object.entries(analysisData)) {
      if (!payload) continue;
      const p = parseFxPair(key);
      if (!p) continue; // skip non-FX symbols
      const score = recToScore(payload.RECOMMENDATION);
      out.push({
        pair: p.pair,
        trend: trendFromScore(score),
        base: p.base,
        baseScore: score,
        quote: p.quote,
        quoteScore: -score,
      });
    }
    return out;
  }, [analysisData]);

  return (
    <div className="min-h-screen bg-gray-100 p-8 text-gray-800">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-6 text-center text-3xl font-extrabold text-gray-900">
          TradingView Technical Analysis — Detailed Results
        </h1>

        {/* controls */}
        <div className="mb-6 rounded-xl bg-white p-6 shadow">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Symbols (comma-separated)
              </label>
              <input
                className="w-full rounded-md border p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={symbols}
                onChange={(e) => setSymbols(e.target.value)}
                placeholder="OANDA:USDCAD,OANDA:USDCHF,OANDA:USDJPY"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Screener
              </label>
              <select
                className="w-full rounded-md border p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={screener}
                onChange={(e) => setScreener(e.target.value)}
              >
                {SCREENER_OPTIONS.map((o) => (
                  <option key={o.v} value={o.v}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Timeframe
              </label>
              <select
                className="w-full rounded-md border p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
              >
                {TF_OPTIONS.map((tf) => (
                  <option key={tf} value={tf}>
                    {tf}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-5 flex justify-center">
            <button
              onClick={fetchData}
              disabled={loading}
              className="rounded-full bg-indigo-600 px-6 py-2 font-semibold text-white shadow hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60"
            >
              {loading ? "Fetching..." : "Fetch Analysis"}
            </button>
          </div>
        </div>

        {/* status */}
        {loading && <p className="text-center text-indigo-600">Loading...</p>}
        {error && (
          <p className="text-center text-red-600">
            Error: <span className="font-semibold">{error}</span>
          </p>
        )}

        {/* table */}
        {rows.length > 0 && !loading && (
          <div className="overflow-x-auto rounded-xl bg-white p-6 shadow">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider">
                    Pair
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider">
                    Trend
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider">
                    Base Currency
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider">
                    Base Score
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider">
                    Quote Currency
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider">
                    Quote Score
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {rows.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm font-medium text-gray-900">{r.pair}</td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${trendBadgeCls(r.trend)}`}>
                        {r.trend}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm">{r.base}</td>
                    <td className="px-4 py-2 text-sm font-semibold">{r.baseScore}</td>
                    <td className="px-4 py-2 text-sm">{r.quote}</td>
                    <td className="px-4 py-2 text-sm font-semibold">{r.quoteScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && rows.length === 0 && (
          <p className="text-center text-gray-500">
            No FX pairs parsed from response. Use keys like <code>OANDA:USDCAD</code>.
          </p>
        )}
      </div>
    </div>
  );
};

export default App;
