import React, { useMemo } from "react";
import { useSelector } from "react-redux";

const REC_TO_SCORE = { STRONG_BUY: 2, BUY: 1, NEUTRAL: 0, SELL: -1, STRONG_SELL: -2 };
const recToScore = (rec) => REC_TO_SCORE[(rec || "").toUpperCase()] ?? 0;
const trendFromScore = (s) => (s > 0 ? "Bullish" : s < 0 ? "Bearish" : "Neutral");
const trendBadgeCls = (t) =>
  t === "Bullish" ? "bg-emerald-100 text-emerald-800" :
  t === "Bearish" ? "bg-rose-100 text-rose-800" :
  "bg-gray-100 text-gray-800";

const parseFxPair = (key) => {
  if (!key) return null;
  const idx = key.lastIndexOf(":");
  const raw = (idx >= 0 ? key.slice(idx + 1) : key).trim().toUpperCase();
  if (!/^[A-Z]{6}$/.test(raw)) return null;
  const base = raw.slice(0, 3), quote = raw.slice(3, 6);
  return { pair: `${base}/${quote}`, base, quote };
};

export default function ResultsTable() {
  const { technical_analysis, loading, error } = useSelector((s) => s.technicals);

  const rows = useMemo(() => {
    const out = [];
    for (const [key, payload] of Object.entries(technical_analysis || {})) {
      if (!payload) continue;
      const p = parseFxPair(key);
      if (!p) continue;
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
  }, [technical_analysis]);

  if (loading) return <p className="text-center text-indigo-600">Loading...</p>;
  if (error)   return <p className="text-center text-red-600">Error: {error}</p>;

  return (
    <div className="overflow-x-auto rounded-xl bg-white p-6 shadow">
      {rows.length === 0 ? (
        <p className="text-center text-gray-500">No FX pairs parsed.</p>
      ) : (
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider">Pair</th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider">Trend</th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider">Base Currency</th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider">Base Score</th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider">Quote Currency</th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider">Quote Score</th>
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
      )}
    </div>
  );
}
