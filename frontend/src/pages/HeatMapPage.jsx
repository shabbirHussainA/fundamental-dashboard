// src/pages/HeatMapPage.jsx
import React, { useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import DashboardLayout from "../components/layout/DashboardLayout";
import { getHeatMap } from "../store/slicers/technicalSlice";

/** Column order */
const TF_ORDER = ["1m", "5m", "15m", "30m", "1h", "4h", "1d"];

/** recommendation → display label */
const REC_TO_SENTIMENT = {
  STRONG_BUY: "Strong Bullish",
  BUY: "Bullish",
  NEUTRAL: "Neutral",
  SELL: "Bearish",
  STRONG_SELL: "Strong Bearish",
};

const recClass = (rec) => {
  switch (rec) {
    case "STRONG_BUY":
      return "bg-emerald-600 text-white";
    case "BUY":
      return "bg-emerald-200 text-emerald-900";
    case "NEUTRAL":
      return "bg-gray-200 text-gray-800";
    case "SELL":
      return "bg-rose-200 text-rose-900";
    case "STRONG_SELL":
      return "bg-rose-600 text-white";
    default:
      return "bg-gray-100 text-gray-600";
  }
};

const shortPair = (k) => (k.includes(":") ? k.split(":").pop() : k);

function Legend() {
  const items = [
    ["STRONG_BUY", "Strong Bullish"],
    ["BUY", "Bullish"],
    ["NEUTRAL", "Neutral"],
    ["SELL", "Bearish"],
    ["STRONG_SELL", "Strong Bearish"],
  ];
  const dot = (k) =>
    ({
      STRONG_BUY: "bg-emerald-600",
      BUY: "bg-emerald-200",
      NEUTRAL: "bg-gray-300",
      SELL: "bg-rose-200",
      STRONG_SELL: "bg-rose-600",
    }[k]);
  return (
    <div className="hidden items-center gap-3 rounded-md bg-white/80 px-3 py-2 shadow md:flex">
      {items.map(([k, lbl]) => (
        <span key={k} className="flex items-center gap-1 text-xs text-gray-700">
          <span className={`inline-block h-3 w-3 rounded ${dot(k)}`} />
          {lbl}
        </span>
      ))}
    </div>
  );
}

export default function HeatMapPage() {
  const dispatch = useDispatch();
  const { Heat_map, loading, error } = useSelector((s) => s.technicals) || {};

  // API may return { heatmap_data: {...} }; fall back to object itself if already unwrapped
  const data = (Heat_map && Heat_map.heatmap_data) || Heat_map || {};

  const timeframes = useMemo(() => {
    const first = Object.values(data)[0];
    return first ? TF_ORDER.filter((tf) => tf in first) : TF_ORDER;
  }, [data]);

  const pairs = useMemo(() => Object.keys(data).sort(), [data]);

  const run = () => dispatch(getHeatMap());

  return (
    <DashboardLayout>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Technical Heat Map</h2>
        <div className="flex items-center gap-3">
          <Legend />
          <button
            onClick={run}
            disabled={loading}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow transition-colors hover:bg-indigo-700 disabled:opacity-60"
          >
            {loading ? "Fetching..." : "Run"}
          </button>
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-md bg-rose-50 p-3 text-rose-700">
          Error: <span className="font-semibold">{error}</span>
        </p>
      )}

      <div className="overflow-x-auto rounded-xl bg-white shadow">
        <table className="min-w-full border-separate border-spacing-0">
          <thead className="sticky top-0 bg-gray-50">
            <tr>
              <th className="sticky left-0 z-10 bg-gray-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider">
                Pair
              </th>
              {timeframes.map((tf) => (
                <th
                  key={tf}
                  className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wider"
                >
                  {tf}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {pairs.map((sym) => (
              <tr key={sym} className="even:bg-gray-50/30 hover:bg-gray-50">
                <td className="sticky left-0 z-10 bg-white px-3 py-2 text-sm font-medium text-gray-900">
                  {shortPair(sym)}
                </td>

                {timeframes.map((tf) => {
                  const cell = data[sym]?.[tf];
                  const rec = cell?.RECOMMENDATION;
                  const label = REC_TO_SENTIMENT[rec] || "-";
                  const tooltip = cell
                    ? `${label} — B:${cell.BUY}  S:${cell.SELL}  N:${cell.NEUTRAL}`
                    : "—";
                  return (
                    <td key={tf} className="px-1 py-1 text-center">
                      <div
                        className={`rounded-md px-2 py-1 text-xs font-semibold ${recClass(
                          rec
                        )}`}
                        title={tooltip}
                      >
                        {label}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}

            {pairs.length === 0 && (
              <tr>
                <td
                  colSpan={1 + timeframes.length}
                  className="px-4 py-6 text-center text-gray-500"
                >
                  No data yet. Click <em>Run</em> to load heatmap.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
