from typing import List, Dict, Optional
from fastapi import Query, HTTPException, APIRouter
from controllers.candles import fetch_all_tfs_for_symbol, fetch_candles
from schemas.candles import Candle
candle = APIRouter()
DEFAULT_TFS: List[str] = ["M1","M5","M15","M30","H1","H4","D"]

@candle.get("/candles/{symbol}/all")
def candles_all_tfs_for_symbol(
    symbol: str,
    count: int = 300,
    tfs: Optional[List[str]] = Query(
        None, description="Repeat param e.g. tfs=M1&tfs=H1; defaults to all"
    ),
):
    use_tfs = tfs or DEFAULT_TFS
    return {
        "symbol": symbol,
        "timeframes": { tf: [c.dict() for c in candles]
                        for tf, candles in fetch_all_tfs_for_symbol(symbol, use_tfs, count).items() }
    }

@candle.get("/candles/{symbol}/{tf}", response_model=List[Candle])
def get_candles(symbol: str, tf: str, count: int = 300):
    return fetch_candles(symbol, tf, count)

@candle.get("/candles/all")
def candles_all(
    symbols: Optional[List[str]] = Query(
        None, description="Repeat param: symbols=EURUSD&symbols=GBPUSD"
    ),
    symbols_csv: Optional[str] = None,
    count: int = 300,
    tfs: Optional[List[str]] = Query(
        None, description="Repeat param: tfs=M15&tfs=H1; defaults to all"
    ),
):
    syms: List[str] = symbols or []
    if symbols_csv:
        syms.extend([s.strip() for s in symbols_csv.split(",") if s.strip()])
    syms = [s.upper() for s in syms]

    if not syms:
        raise HTTPException(status_code=400, detail="At least one symbol is required.")

    use_tfs = tfs or DEFAULT_TFS

    result: Dict[str, Dict[str, List[dict]]] = {}
    for sym in syms:
        tf_map = fetch_all_tfs_for_symbol(sym, use_tfs, count)
        result[sym] = { tf: [c.dict() for c in candles] for tf, candles in tf_map.items() }

    return result
