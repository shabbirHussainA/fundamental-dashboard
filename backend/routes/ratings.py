from typing import List, Dict, Optional
from fastapi import APIRouter,Query, HTTPException
from controllers.candles import fetch_candles, TIMEFRAME
import pandas as pd
from controllers.ratings import compute_score_from_closes, rating_from_score,tv_rating_for_df
from tradingview_ta import TA_Handler, Interval, Exchange, get_multiple_analysis
rating = APIRouter()

DEFAULT_TFS: List[str] = ["M1","M5","M15","M30","H1","H4","D"]

# @rating.get("/ratings/all")
# def ratings_all(
#     symbols_csv: str,
#     tfs_csv: Optional[str] = None,
#     count: int = 300
# ):
#     """
#     Example:
#       /ratings/all?symbols_csv=EURUSD,GBPUSD,XAUUSD&tfs_csv=M15,H1,H4&count=300
#       /ratings/all?symbols_csv=EURUSD        # defaults to all TFs
#     """
#     symbols = [s.strip().upper() for s in symbols_csv.split(",") if s.strip()]
#     tfs = [t.strip().upper() for t in (tfs_csv.split(",") if tfs_csv else DEFAULT_TFS) if t.strip().upper() in TIMEFRAME]

#     if not symbols:
#         return {"error": "At least one symbol required."}

#     output: Dict[str, Dict[str, dict]] = {}

#     for sym in symbols:
#         tf_map: Dict[str, dict] = {}
#         for tf in tfs:
#             candles = fetch_candles(sym, tf, count)  # uses your existing function
#             closes  = [c.c for c in candles]
#             comp    = compute_score_from_closes(closes)
#             tf_map[tf] = {
#                 "score": comp["score"],
#                 "rating": rating_from_score(comp["score"]),
#                 "components": {
#                     "rsi14": comp["rsi"],
#                     "macd_gt_signal": comp["macd_gt_signal"],
#                     "above_sma200": comp["above_sma200"],
#                     "sma20_slope_pos": comp["sma20_slope_pos"]
#                 },
#                 "bars_used": len(closes)
#             }
#         output[sym] = tf_map

#     return output

# @rating.get("/ratings/tv")
# def ratings_tv(
#     symbols_csv: str,
#     tfs_csv: Optional[str] = None,
#     count: int = 300,
#     group: str = "All"   # "All" | "MAs" | "Oscillators"
# ):
#     """
#     Example:
#       /ratings/tv?symbols_csv=EURUSD,GBPUSD&tfs_csv=M15,H1,H4&count=300&group=All
#       /ratings/tv?symbols_csv=EURUSD   # defaults to all TFs
#     """
#     symbols = [s.strip().upper() for s in symbols_csv.split(",") if s.strip()]
#     tfs = [t.strip().upper() for t in (tfs_csv.split(",") if tfs_csv else DEFAULT_TFS) if t.strip().upper() in TIMEFRAME]

#     out: Dict[str, Dict[str, dict]] = {}
#     for sym in symbols:
#         tf_map: Dict[str, dict] = {}
#         for tf in tfs:
#             candles = fetch_candles(sym, tf, count)  # your existing fetcher
#             if not candles:
#                 tf_map[tf] = {"score": 0.0, "rating": "Neutral", "ma_score": 0.0, "osc_score": 0.0, "votes": {"MAs": {}, "Oscillators": {}}}
#                 continue
#             df = pd.DataFrame([c.dict() for c in candles])  # columns: t,o,h,l,c
#             # Ensure numeric and sorted
#             df = df.sort_values("t").reset_index(drop=True)
#             tf_map[tf] = tv_rating_for_df(df, group=group)
#         out[sym] = tf_map
#     # Transform `out` into your desired format
#     formatted_data = []
#     for pair, durations in out.items():
#         formatted_data.append({
#             "pair": pair,
#             "duration": {
#                 tf: {
#                     "score": round(details["score"], 4),
#                     "rating": details["rating"]
#                 }
#                 for tf, details in durations.items()
#             }
#         })
#     return {"success": "true", "data": out}


# ----------------------------------------------------------------------------------------

# Define the default list of currency pairs
# The list has been processed to be a list of strings
DEFAULT_PAIRS_FOREX = [
    "oanda:USDCAD", "oanda:USDCHF", "oanda:USDJPY", "oanda:GBPUSD", "oanda:GBPAUD", 
    "oanda:GBPCHF", "oanda:GBPNZD", "oanda:GBPJPY", "oanda:GBPCAD", "oanda:EURUSD", 
    "oanda:EURCAD", "oanda:EURJPY", "oanda:EURAUD", "oanda:EURNZD", "oanda:EURCHF", 
    "oanda:EURGBP", "oanda:AUDCAD", "oanda:AUDCHF", "oanda:AUDNZD", "oanda:AUDUSD", 
    "oanda:AUDJPY", "oanda:CADCHF", "oanda:CADJPY", "oanda:CHFJPY", "oanda:NZDUSD", 
    "oanda:NZDJPY", "oanda:NZDCHF", "oanda:NZDCAD"
]

# A mapping from string timeframes to the Interval enum
TIMEFRAME_MAP = {
    "1m": Interval.INTERVAL_1_MINUTE,
    "5m": Interval.INTERVAL_5_MINUTES,
    "15m": Interval.INTERVAL_15_MINUTES,
    "30m": Interval.INTERVAL_30_MINUTES,
    "1h": Interval.INTERVAL_1_HOUR,
    # "2h": Interval.INTERVAL_2_HOURS,
    "4h": Interval.INTERVAL_4_HOURS,
    "1d": Interval.INTERVAL_1_DAY,
    # "1w": Interval.INTERVAL_1_WEEK,
    # "1M": Interval.INTERVAL_1_MONTH,
}
@rating.get("/get_analysis")
async def get_analysis(
    # Use Query to define the query parameters.
    # The default value is None, and the list of pairs is handled below.
    symbols: Optional[str] = Query(None, description="Comma-separated list of symbols (e.g., 'oanda:EURUSD,nasdaq:TSLA')"),
    screener: str = Query("forex", description="The screener to use (e.g., 'forex', 'america', 'crypto')"),
    timeframe: str = Query("1d", description="Timeframe for the analysis (e.g., '1h', '1d', '1w')")
):
    """
    Fetches technical analysis summary for a given list of symbols and timeframe.
    """
    # Determine which symbols to use, either from the request or the default list.
    if symbols:
        # Split the comma-separated string into a list of strings and convert to uppercase.
        target_symbols = [s.strip().upper() for s in symbols.split(",")]
    else:
        # Use the default Forex pairs if no symbols are provided.
        target_symbols = DEFAULT_PAIRS_FOREX

    # Convert the requested timeframe string to the Interval enum.
    # If the timeframe is not found, return an error.
    try:
        interval_enum = TIMEFRAME_MAP[timeframe.lower()]
    except KeyError:
        raise HTTPException(status_code=400, detail=f"Invalid timeframe: '{timeframe}'. Please use one of: {', '.join(TIMEFRAME_MAP.keys())}")

    try:
        # Use get_multiple_analysis to fetch data for all symbols in a single request.
        # This is much more efficient and less likely to hit a rate limit.
        analysis = get_multiple_analysis(
            screener=screener.lower(),
            interval=interval_enum,
            symbols=target_symbols
        )
    except Exception as e:
        # If an error occurs during the bulk request, raise an HTTPException.
        raise HTTPException(status_code=500, detail=f"Failed to get data from TradingView: {e}")

    results = {}
    # Iterate through the returned analysis and format the data
    for symbol, analysis_object in analysis.items():
        if analysis_object:
            results[symbol] = analysis_object.summary
        else:
            # Handle cases where no analysis was found for a specific symbol.
            results[symbol] = {"error": "Could not find data for this symbol on the specified screener."}
    
    return {"analysis_data": results}

@rating.get("/get_heatmap")
async def get_heatmap():
    """
    Fetches technical analysis summary for all default forex pairs 
    across all available timeframes.
    Makes exactly 1 API call per timeframe (batched symbols).
    """
    heatmap_data = {symbol: {} for symbol in DEFAULT_PAIRS_FOREX}

    for tf_str, interval_enum in TIMEFRAME_MAP.items():
        try:
            analysis = get_multiple_analysis(
                screener="forex",
                interval=interval_enum,
                symbols=DEFAULT_PAIRS_FOREX
            )
            for symbol, analysis_object in analysis.items():
                heatmap_data[symbol][tf_str] = (
                    analysis_object.summary if analysis_object
                    else {"error": f"No data for {symbol} on {tf_str}"}
                )
        except Exception as e:
            for symbol in DEFAULT_PAIRS_FOREX:
                heatmap_data[symbol][tf_str] = {
                    "error": f"Failed to get data on {tf_str}: {e}"
                }

    return {"heatmap_data": heatmap_data}
