import React, { useMemo, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import DashboardLayout from "../components/layout/DashboardLayout";
import { getAnalysis } from "../store/slicers/technicalSlice";

/* ---------- helpers ---------- */
const REC_TO_SCORE = { STRONG_BUY: 2, BUY: 1, NEUTRAL: 0, SELL: -1, STRONG_SELL: -2 };
const recToScore = (rec) => REC_TO_SCORE[(rec || "").toUpperCase()] ?? 0;

const parseFxPair = (key) => {
  if (!key) return null;
  const idx = key.lastIndexOf(":");
  const raw = (idx >= 0 ? key.slice(idx + 1) : key).trim().toUpperCase(); // e.g. "OANDA:EURUSD" -> "EURUSD"
  if (!/^[A-Z]{6}$/.test(raw)) return null;
  const base = raw.slice(0, 3);
  const quote = raw.slice(3, 6);
  return { base, quote, pair: `${base}/${quote}` };
};

const scorePill = (n) =>
  n > 0
    ? "bg-emerald-100 text-emerald-800"
    : n < 0
    ? "bg-rose-100 text-rose-800"
    : "bg-gray-100 text-gray-800";

/* ---------- page ---------- */
export default function CurrencyPulse() {
  const dispatch = useDispatch();
  const technicals = useSelector((s) => s.technicals) 

  const { technical_analysis, loading, error, query } = technicals;

  // build cumulative currency scores from pair recommendations
  const currencyScores = useMemo(() => {
    const scores = {}; // { USD: 3, EUR: -1, ... }
    for (const [key, payload] of Object.entries(technical_analysis || {})) {
      const p = parseFxPair(key);
      if (!p || !payload) continue;
      const s = recToScore(payload.RECOMMENDATION);
      scores[p.base] = (scores[p.base] || 0) + s;  // base gets +score
      scores[p.quote] = (scores[p.quote] || 0) - s; // quote gets -score
    }
    return scores;
  }, [technical_analysis]);

  // summary table rows
  const summaryRows = useMemo(() => {
    return Object.entries(currencyScores)
      .map(([ccy, score]) => ({ ccy, score }))
      .sort((a, b) => b.score - a.score);
  }, [currencyScores]);

  // best pairs table derived from the ACTUAL pairs we received
  const bestPairs = useMemo(() => {
    const rows = [];
    for (const [key] of Object.entries(technical_analysis || {})) {
      const p = parseFxPair(key);
      if (!p) continue;
      const b = currencyScores[p.base] ?? 0;
      const q = currencyScores[p.quote] ?? 0;
      const diff = b - q;                   // signed difference
      const absDiff = Math.abs(diff);       // display as positive magnitude
      rows.push({
        pair: p.pair,
        diff,
        absDiff,
        trend: diff > 0 ? "Bullish" : "Bearish",
      });
    }
    // de-duplicate same pair keys if API returns duplicates
    const uniq = new Map();
    for (const r of rows) uniq.set(r.pair, r);
    return Array.from(uniq.values()).sort((a, b) => b.absDiff - a.absDiff);
  }, [technical_analysis, currencyScores]);

  // optional: limit rows shown
  const [topN, setTopN] = useState(15);
  const displayedBestPairs = bestPairs.slice(0, topN);

  return (
    <DashboardLayout>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Currency Pulse Analysis</h2>
        {/* <div className="flex items-center gap-3 text-sm text-gray-600">
          <span>Lookback: <strong>—</strong></span>
          <span>Interval: <strong>{query.timeframe}</strong></span>
          <button
            onClick={() => dispatch(getAnalysis(query))}
            disabled={loading}
            className="rounded-md bg-indigo-600 px-3 py-1.5 font-semibold text-white shadow hover:bg-indigo-700 disabled:opacity-60"
          >
            {loading ? "Running..." : "Run Analysis"}
          </button>
        </div> */}
      </div>

      {error && (
        <p className="mb-4 rounded-md bg-rose-50 p-3 text-rose-700">
          Error: <span className="font-semibold">{error}</span>
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Summary (left) */}
        <div className="rounded-xl bg-white p-5 shadow">
          <h3 className="mb-3 text-base font-semibold text-gray-900">Summary</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider">
                    Currency
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider">
                    Score
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {summaryRows.map((r) => (
                  <tr key={r.ccy} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm font-medium text-gray-900">{r.ccy}</td>
                    <td className="px-4 py-2 text-sm">
                      <span className={`inline-flex rounded-full px-2 py-1 font-semibold ${scorePill(r.score)}`}>
                        {r.score}
                      </span>
                    </td>
                  </tr>
                ))}
                {summaryRows.length === 0 && (
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-500" colSpan={2}>
                      No data yet. Click <em>Run Analysis</em>.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Best Pairs (right) */}
        <div className="rounded-xl bg-white p-5 shadow">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">Best Pairs</h3>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600">Top</span>
              <select
                className="rounded-md border p-1.5 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={topN}
                onChange={(e) => setTopN(parseInt(e.target.value, 10))}
              >
                {[10, 15, 20, 30, 50].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider">Pair</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider">Score Difference</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider">Trend Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayedBestPairs.map((r) => (
                  <tr key={r.pair} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm font-medium text-gray-900">{r.pair}</td>
                    <td className="px-4 py-2 text-sm font-semibold">{r.absDiff}</td>
                    <td className="px-4 py-2 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 font-semibold ${
                          r.trend === "Bullish"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {r.trend}
                      </span>
                    </td>
                  </tr>
                ))}
                {displayedBestPairs.length === 0 && (
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-500" colSpan={3}>
                      No pairs yet. Run analysis to populate.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs text-gray-500">
            *Score Difference = (Base currency cumulative score) − (Quote currency cumulative score).<br />
            We display its magnitude; Trend shows the direction (Bullish if Base &gt; Quote, else Bearish).
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
