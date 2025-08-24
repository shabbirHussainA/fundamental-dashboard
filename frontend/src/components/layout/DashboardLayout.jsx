import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getAnalysis, setQuery as setQueryAction } from "../../store/slicers/technicalSlice";
import { useLocation, useNavigate } from "react-router-dom";

const SCREENER_OPTIONS = [
  { v: "forex", label: "Forex" },
  { v: "crypto", label: "Crypto" },
  { v: "america", label: "US Stocks" },
];
const TF_OPTIONS = ["1m","5m","15m","30m","1h","2h","4h","1d","1W","1M"];

export default function DashboardLayout({ children }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const { query, loading } =
    useSelector((s) => s.technicals) ||
    { query: { symbols: "", screener: "forex", timeframe: "1d" }, loading: false };

  const [symbols, setSymbols]     = useState(query.symbols);
  const [screener, setScreener]   = useState(query.screener);
  const [timeframe, setTimeframe] = useState(query.timeframe);

  const onSubmit = (e) => {
    e.preventDefault();
    dispatch(setQueryAction({ symbols, screener, timeframe }));
    dispatch(getAnalysis({ symbols, screener, timeframe }));
  };

  const navBtn = (to, label) => {
    const active = pathname === to;
    return (
      <button
        key={to}
        onClick={() => navigate(to)}
        className={[
          "rounded-md px-3 py-2 text-sm font-medium transition-colors",
          active
            ? "bg-indigo-600 text-white shadow"
            : "text-gray-700 hover:bg-gray-100 hover:text-gray-100"
        ].join(" ")}
        aria-current={active ? "page" : undefined}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      {/* Sticky header */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur">
        {/* Top bar: brand + nav */}
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
              FX
            </div>
            <h1 className="text-lg font-semibold">Forex Trading Edge</h1>
          </div>

          <nav className="hidden gap-2 md:flex">
            {navBtn("/", "Home")}
            {navBtn("/score", "Currency Pulse")}
          </nav>
        </div>

        {/* Desktop form */}
        <div className="hidden border-t border-gray-200 md:block">
          <form onSubmit={onSubmit} className="mx-auto grid max-w-7xl grid-cols-12 gap-3 px-4 py-3">
            <div className="col-span-6 flex flex-col">
              <label className="mb-1 text-xs font-medium text-gray-600">Symbols</label>
              <input
                className="w-full rounded-md border border-gray-300 p-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={symbols}
                onChange={(e) => setSymbols(e.target.value)}
                placeholder="OANDA:USDCAD,OANDA:USDCHF,OANDA:USDJPY, ..."
              />
            </div>

            <div className="col-span-3 flex flex-col">
              <label className="mb-1 text-xs font-medium text-gray-600">Screener</label>
              <select
                className="rounded-md border border-gray-300 p-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={screener}
                onChange={(e) => setScreener(e.target.value)}
              >
                {SCREENER_OPTIONS.map((o) => (
                  <option key={o.v} value={o.v}>{o.label}</option>
                ))}
              </select>
            </div>

            <div className="col-span-2 flex flex-col">
              <label className="mb-1 text-xs font-medium text-gray-600">Timeframe</label>
              <select
                className="rounded-md border border-gray-300 p-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
              >
                {TF_OPTIONS.map((tf) => (
                  <option key={tf} value={tf}>{tf}</option>
                ))}
              </select>
            </div>

            <div className="col-span-1 flex items-end">
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow transition-colors hover:bg-indigo-700 disabled:opacity-60"
              >
                {loading ? "Fetching..." : "Run"}
              </button>
            </div>
          </form>
        </div>

        {/* Mobile nav buttons */}
        <div className="flex gap-2 border-t border-gray-200 px-4 pb-2 pt-2 md:hidden">
          {navBtn("/", "Home")}
          {navBtn("/score", "Currency Pulse")}
        </div>

        {/* Mobile form */}
        <div className="border-t border-gray-200 px-4 pb-3 md:hidden">
          <form onSubmit={onSubmit} className="grid grid-cols-1 gap-2">
            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium text-gray-600">Symbols</label>
              <input
                className="rounded-md border border-gray-300 p-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={symbols}
                onChange={(e) => setSymbols(e.target.value)}
                placeholder="OANDA:USDCAD,OANDA:USDCHF"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col">
                <label className="mb-1 text-xs font-medium text-gray-600">Screener</label>
                <select
                  className="rounded-md border border-gray-300 p-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  value={screener}
                  onChange={(e) => setScreener(e.target.value)}
                >
                  {SCREENER_OPTIONS.map((o) => (
                    <option key={o.v} value={o.v}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col">
                <label className="mb-1 text-xs font-medium text-gray-600">Timeframe</label>
                <select
                  className="rounded-md border border-gray-300 p-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value)}
                >
                  {TF_OPTIONS.map((tf) => (
                    <option key={tf} value={tf}>{tf}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow transition-colors hover:bg-indigo-700 disabled:opacity-60"
            >
              {loading ? "Fetching..." : "Run"}
            </button>
          </form>
        </div>
      </header>

      {/* Page content */}
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
