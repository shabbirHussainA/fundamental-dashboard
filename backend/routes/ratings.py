from typing import List, Dict, Optional
from fastapi import APIRouter
from controllers.candles import fetch_candles, TIMEFRAME
import pandas as pd
from controllers.ratings import compute_score_from_closes, rating_from_score,tv_rating_for_df

rating = APIRouter()

DEFAULT_TFS: List[str] = ["M1","M5","M15","M30","H1","H4","D"]

@rating.get("/ratings/all")
def ratings_all(
    symbols_csv: str,
    tfs_csv: Optional[str] = None,
    count: int = 300
):
    """
    Example:
      /ratings/all?symbols_csv=EURUSD,GBPUSD,XAUUSD&tfs_csv=M15,H1,H4&count=300
      /ratings/all?symbols_csv=EURUSD        # defaults to all TFs
    """
    symbols = [s.strip().upper() for s in symbols_csv.split(",") if s.strip()]
    tfs = [t.strip().upper() for t in (tfs_csv.split(",") if tfs_csv else DEFAULT_TFS) if t.strip().upper() in TIMEFRAME]

    if not symbols:
        return {"error": "At least one symbol required."}

    output: Dict[str, Dict[str, dict]] = {}

    for sym in symbols:
        tf_map: Dict[str, dict] = {}
        for tf in tfs:
            candles = fetch_candles(sym, tf, count)  # uses your existing function
            closes  = [c.c for c in candles]
            comp    = compute_score_from_closes(closes)
            tf_map[tf] = {
                "score": comp["score"],
                "rating": rating_from_score(comp["score"]),
                "components": {
                    "rsi14": comp["rsi"],
                    "macd_gt_signal": comp["macd_gt_signal"],
                    "above_sma200": comp["above_sma200"],
                    "sma20_slope_pos": comp["sma20_slope_pos"]
                },
                "bars_used": len(closes)
            }
        output[sym] = tf_map

    return output

@rating.get("/ratings/tv")
def ratings_tv(
    symbols_csv: str,
    tfs_csv: Optional[str] = None,
    count: int = 300,
    group: str = "All"   # "All" | "MAs" | "Oscillators"
):
    """
    Example:
      /ratings/tv?symbols_csv=EURUSD,GBPUSD&tfs_csv=M15,H1,H4&count=300&group=All
      /ratings/tv?symbols_csv=EURUSD   # defaults to all TFs
    """
    symbols = [s.strip().upper() for s in symbols_csv.split(",") if s.strip()]
    tfs = [t.strip().upper() for t in (tfs_csv.split(",") if tfs_csv else DEFAULT_TFS) if t.strip().upper() in TIMEFRAME]

    out: Dict[str, Dict[str, dict]] = {}
    for sym in symbols:
        tf_map: Dict[str, dict] = {}
        for tf in tfs:
            candles = fetch_candles(sym, tf, count)  # your existing fetcher
            if not candles:
                tf_map[tf] = {"score": 0.0, "rating": "Neutral", "ma_score": 0.0, "osc_score": 0.0, "votes": {"MAs": {}, "Oscillators": {}}}
                continue
            df = pd.DataFrame([c.dict() for c in candles])  # columns: t,o,h,l,c
            # Ensure numeric and sorted
            df = df.sort_values("t").reset_index(drop=True)
            tf_map[tf] = tv_rating_for_df(df, group=group)
        out[sym] = tf_map
    return {"success": "true", "data": out}
