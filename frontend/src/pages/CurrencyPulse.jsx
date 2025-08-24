import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import DashboardLayout from "../components/layout/DashboardLayout";

/* ---------- helpers (unchanged) ---------- */
const REC_TO_SCORE = { STRONG_BUY: 2, BUY: 1, NEUTRAL: 0, SELL: -1, STRONG_SELL: -2 };
const recToScore = (rec) => REC_TO_SCORE[(rec || "").toUpperCase()] ?? 0;

const parseFxPair = (key) => {
  if (!key) return null;
  const idx = key.lastIndexOf(":");
  const raw = (idx >= 0 ? key.slice(idx + 1) : key).trim().toUpperCase();
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

/* ---------- NEW: quantiles + label/class helpers ---------- */
const quantile = (arr, q) => {
  if (!arr.length) return 0;
  const a = [...arr].sort((x, y) => x - y);
  const pos = (a.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (a[base + 1] !== undefined) return a[base] + rest * (a[base + 1] - a[base]);
  return a[base];
};

const trendLabelFromDiff = (diff, absDiff, q1, q3) => {
  if (absDiff <= q1) return "Neutral";
  if (absDiff >= q3) return diff > 0 ? "Strong Bullish" : diff < 0 ? "Strong Bearish" : "Neutral";
  return diff > 0 ? "Bullish" : diff < 0 ? "Bearish" : "Neutral";
};

const trendBadgeCls = (label) => {
  switch (label) {
    case "Strong Bullish":
      return "bg-emerald-600 text-white";
    case "Bullish":
      return "bg-emerald-100 text-emerald-800";
    case "Neutral":
      return "bg-gray-100 text-gray-800";
    case "Strong Bearish":
      return "bg-rose-600 text-white";
    case "Bearish":
    default:
      return "bg-rose-100 text-rose-800";
  }
};

/* ---------- page ---------- */
export default function CurrencyPulse() {
  const technicals = useSelector((s) => s.technicals);
  const { technical_analysis, loading, error } = technicals;

  // cumulative currency scores
  const currencyScores = useMemo(() => {
    const scores = {};
    for (const [key, payload] of Object.entries(technical_analysis || {})) {
      const p = parseFxPair(key);
      if (!p || !payload) continue;
      const s = recToScore(payload.RECOMMENDATION);
      scores[p.base] = (scores[p.base] || 0) + s;
      scores[p.quote] = (scores[p.quote] || 0) - s;
    }
    return scores;
  }, [technical_analysis]);

  // summary rows
  const summaryRows = useMemo(
    () =>
      Object.entries(currencyScores)
        .map(([ccy, score]) => ({ ccy, score }))
        .sort((a, b) => b.score - a.score),
    [currencyScores]
  );

  // base bestPairs (diff only)
  const basePairs = useMemo(() => {
    const rows = [];
    for (const [key] of Object.entries(technical_analysis || {})) {
      const p = parseFxPair(key);
      if (!p) continue;
      const b = currencyScores[p.base] ?? 0;
      const q = currencyScores[p.quote] ?? 0;
      const diff = b - q;
      const absDiff = Math.abs(diff);
      rows.push({ pair: p.pair, diff, absDiff });
    }
    // de-dup by pair
    const uniq = new Map();
    for (const r of rows) uniq.set(r.pair, r);
    return Array.from(uniq.values());
  }, [technical_analysis, currencyScores]);

  // compute distribution thresholds (Q1, Q3) and classify
  const bestPairs = useMemo(() => {
    const magnitudes = basePairs.map((r) => r.absDiff);
    const q1 = quantile(magnitudes, 0.25);
    const q3 = quantile(magnitudes, 0.75);

    const enriched = basePairs.map((r) => {
      const label = trendLabelFromDiff(r.diff, r.absDiff, q1, q3);
      return { ...r, trend: label };
    });

    // sort by magnitude desc
    return enriched.sort((a, b) => b.absDiff - a.absDiff);
  }, [basePairs]);

  const [topN, setTopN] = useState(15);
  const displayedBestPairs = bestPairs.slice(0, topN);

  return (
    <DashboardLayout showForm={true}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Currency Pulse Analysis</h2>
      </div>

      {error && (
        <p className="mb-4 rounded-md bg-rose-50 p-3 text-rose-700">
          Error: <span className="font-semibold">{error}</span>
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Summary */}
        <div className="rounded-xl bg-white p-5 shadow">
          <h3 className="mb-3 text-base font-semibold text-gray-900">Summary</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider">Currency</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider">Score</th>
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

        {/* Best Pairs */}
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
                      <span className={`inline-flex rounded-full px-2 py-1 font-semibold ${trendBadgeCls(r.trend)}`}>
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
            We classify pairs by the distribution of score differences: ≤ 25th percentile → Neutral, ≥ 75th percentile → Strong.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
