
from typing import List, Dict
import MetaTrader5 as mt5
import pandas as pd
from schemas.candles import Candle
import os

# ─────────────────────────────────────────────────────────────────────────────
# Credentials (RECOMMENDED: set via environment variables)
#   setx EXN_LOGIN  "41247366"
#   setx EXN_PWD    "******"
#   setx EXN_SERVER "Exness-MT5Trial3"
#   (then restart the terminal)
LOGIN    = int(os.getenv("EXN_LOGIN", "0")) or 41247366     # fallback to your value
PASSWORD = os.getenv("EXN_PWD", "") or "v@]Ed(3c4$45"
SERVER   = os.getenv("EXN_SERVER", "") or "Exness-MT5Trial3"
# MT_PATH  = os.getenv("MT_PATH")  # optional path to terminal64.exe

if not mt5.initialize(  # add MT_PATH as first arg if you need a specific install
    login=LOGIN, password=PASSWORD, server=SERVER
):
    raise RuntimeError(f"MT5 init failed → {mt5.last_error()}")

# ─────────────────────────────────────────────────────────────────────────────
# class Candle(BaseModel):
#     t: int   # unix ms
#     o: float
#     h: float
#     l: float
#     c: float

# app = FastAPI()

TIMEFRAME: Dict[str, int] = {
    "M1":  mt5.TIMEFRAME_M1,
    "M5":  mt5.TIMEFRAME_M5,
    "M15": mt5.TIMEFRAME_M15,
    "M30": mt5.TIMEFRAME_M30,
    "H1":  mt5.TIMEFRAME_H1,
    "H4":  mt5.TIMEFRAME_H4,
    "D":   mt5.TIMEFRAME_D1,
}

# ─────────────────────────────────────────────────────────────────────────────
# Helpers
def fetch_candles(symbol: str, tf: str, count: int = 300) -> List[Candle]:
    """Fetch OHLC for one symbol + timeframe."""
    if tf not in TIMEFRAME:
        return []
    tf_enum = TIMEFRAME[tf]
    rates = mt5.copy_rates_from_pos(symbol, tf_enum, 1, count)
    if rates is None:
        return []
    df = pd.DataFrame(rates)
    return [
    Candle(t=int(row["time"]*1000), o=row["open"], h=row["high"],
           l=row["low"], c=row["close"],
           v=row.get("tick_volume") if "tick_volume" in row else None)
    for _, row in df.iterrows()
]

def fetch_all_tfs_for_symbol(symbol: str, tfs: List[str], count: int = 300) -> Dict[str, List[Candle]]:
    """Return a dict: { TF: [Candle, ...], ... } for one symbol."""
    out: Dict[str, List[Candle]] = {}
    for tf in tfs:
        if tf in TIMEFRAME:
            out[tf] = fetch_candles(symbol, tf, count)
    return out
