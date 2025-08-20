# ─── Add near the top with imports ───────────────────────────────────────────
from typing import List, Dict, Optional, Tuple, Any
import numpy as np
from ta.trend import SMAIndicator, EMAIndicator, IchimokuIndicator, ADXIndicator, MACD
from ta.momentum import RSIIndicator, StochasticOscillator, StochRSIIndicator, AwesomeOscillatorIndicator, WilliamsRIndicator, ROCIndicator
import pandas as pd


# ─── Indicator helpers (pure pandas / no extra deps) ─────────────────────────
def sma(series: pd.Series, period: int) -> pd.Series:
    return series.rolling(window=period, min_periods=period).mean()

def rsi_wilder(series: pd.Series, period: int = 14) -> pd.Series:
    delta = series.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)

    # Wilder's smoothing via exponential moving average with alpha=1/period
    avg_gain = gain.ewm(alpha=1/period, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1/period, adjust=False).mean()

    rs = avg_gain / (avg_loss.replace(0, np.nan))
    rsi = 100 - (100 / (1 + rs))
    return rsi.fillna(50.0)  # neutral early values

def ema(series: pd.Series, period: int) -> pd.Series:
    return series.ewm(span=period, adjust=False).mean()

def macd_line(series: pd.Series, fast: int = 12, slow: int = 26) -> pd.Series:
    return ema(series, fast) - ema(series, slow)

def macd_signal(series: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9) -> Tuple[pd.Series, pd.Series, pd.Series]:
    macd = macd_line(series, fast, slow)
    sig  = ema(macd, signal)
    hist = macd - sig
    return macd, sig, hist

# ─── Score → Rating mapping (exact thresholds you gave) ──────────────────────
def rating_from_score(score: float) -> str:
    if score > 0.5:
        return "Strong Buy"
    if score > 0.1 and score <= 0.5:
        return "Buy"
    if -0.1 <= score <= 0.1:
        return "Neutral"
    if score < -0.1 and score >= -0.5:
        return "Sell"
    return "Strong Sell"

# ─── Scoring recipe (bounded to [-1, +1]) ────────────────────────────────────
def compute_score_from_closes(closes: List[float]) -> Dict[str, float | bool]:

    """Return dict with score + components. Input: list of close prices (old→new)."""
    if len(closes) < 200:
        # Not enough data for SMA200 → neutral
        return {"score": 0.0, "rsi": 50.0, "macd_gt_signal": False, "above_sma200": False, "sma20_slope_pos": False}

    s = pd.Series(closes, dtype=float)

    sma200 = sma(s, 200)
    sma50  = sma(s, 50)
    sma20  = sma(s, 20)

    rsi14  = rsi_wilder(s, 14)
    macd, sig, hist = macd_signal(s, 12, 26, 9)

    last_close = s.iloc[-1]
    last_sma200 = float(sma200.iloc[-1]) if not np.isnan(sma200.iloc[-1]) else last_close
    last_rsi    = float(rsi14.iloc[-1])
    macd_gt     = bool(macd.iloc[-1] > sig.iloc[-1])

    # Simple slope of SMA20 over last 5 bars
    if len(sma20.dropna()) >= 6:
        slope20 = float(sma20.iloc[-1] - sma20.iloc[-6])
    else:
        slope20 = 0.0
    slope_pos = slope20 > 0

    # ── Combine into score (bounded) ──
    score = 0.0
    # Trend bias (SMA200)
    score += 0.20 if last_close > last_sma200 else -0.20
    # Momentum via RSI: centered at 50, scaled to ±0.5 → divide by 100
    score += (last_rsi - 50.0) / 100.0
    # MACD agreement
    score += 0.10 if macd_gt else -0.10
    # Short-term slope (SMA20 up/down)
    score += 0.10 if slope_pos else -0.10

    # Clamp
    score = max(-1.0, min(1.0, score))

    return {
        "score": round(float(score), 4),
        "rsi": round(last_rsi, 2),
        "macd_gt_signal": bool(macd_gt),
        "above_sma200": bool(last_close > last_sma200),
        "sma20_slope_pos": bool(slope_pos),
    }



# using TA 
# -------------------------------------------------------------------------

# ─── Helpers: safe mean ignoring Nones ───────────────────────────────────────
# ==== Ichimoku (TV style) ====
def rolling_high(s: pd.Series, n: int) -> pd.Series:
    return s.rolling(n, min_periods=n).max()

def rolling_low(s: pd.Series, n: int) -> pd.Series:
    return s.rolling(n, min_periods=n).min()

def ichimoku_core(high: pd.Series, low: pd.Series):
    tenkan = (rolling_high(high, 9)  + rolling_low(low, 9))  / 2.0
    kijun  = (rolling_high(high, 26) + rolling_low(low, 26)) / 2.0
    # Spans are shifted +26 forward for plotting; for baseline vote we only need kijun.
    span_a_raw = (tenkan + kijun) / 2.0
    span_b_raw = (rolling_high(high, 52) + rolling_low(low, 52)) / 2.0
    span_a_vis = span_a_raw.shift(26)
    span_b_vis = span_b_raw.shift(26)
    return tenkan, kijun, span_a_vis, span_b_vis

# ==== Awesome Oscillator 'Saucer' rules (per TV help) ====
def ao_saucer_signal(ao: pd.Series) -> int:
    if len(ao.dropna()) < 3:
        return 0
    a3, a2, a1 = float(ao.iloc[-3]), float(ao.iloc[-2]), float(ao.iloc[-1])
    # Bullish saucer: AO above zero, two red (decreasing), then green (increase)
    if a1 > 0 and a3 > 0 and a2 > 0 and (a3 > a2) and (a1 > a2):
        return +1
    # Bearish saucer: AO below zero, two green (increasing), then red (decrease)
    if a1 < 0 and a3 < 0 and a2 < 0 and (a3 < a2) and (a1 < a2):
        return -1
    return 0

def wma(s: pd.Series, n: int) -> pd.Series:
    w = np.arange(1, n+1)
    return s.rolling(n, min_periods=n).apply(lambda x: np.dot(x, w)/w.sum(), raw=True)

def hma(s: pd.Series, n: int) -> pd.Series:
    n1 = max(1, n//2)
    n2 = n
    n3 = max(1, int(np.sqrt(n)))
    return wma(2 * wma(s, n1) - wma(s, n2), n3)

def vwma(close: pd.Series, vol: pd.Series, n: int) -> pd.Series:
    num = (close * vol).rolling(n, min_periods=n).sum()
    den = vol.rolling(n, min_periods=n).sum()
    return num / den

def _avg(vals: List[Optional[int]]) -> float:
    arr = [v for v in vals if v is not None]
    return float(np.mean(arr)) if arr else 0.0

# ─── Ultimate Oscillator (manual; TA lib variant names differ) ───────────────
def ultimate_oscillator(high: pd.Series, low: pd.Series, close: pd.Series,
                        s1: int = 7, s2: int = 14, s3: int = 28) -> pd.Series:
    prev_close = close.shift(1)
    bp = close - pd.concat([low, prev_close], axis=1).min(axis=1)
    tr = pd.concat([high, prev_close], axis=1).max(axis=1) - pd.concat([low, prev_close], axis=1).min(axis=1)
    avg1 = bp.rolling(s1).sum() / tr.rolling(s1).sum()
    avg2 = bp.rolling(s2).sum() / tr.rolling(s2).sum()
    avg3 = bp.rolling(s3).sum() / tr.rolling(s3).sum()
    uo = 100 * (4*avg1 + 2*avg2 + 1*avg3) / 7
    return uo

# ─── Rating text mapping (exact bands) ───────────────────────────────────────
def tv_rating_text(score: float) -> str:
    if score > 0.5: return "Strong Buy"
    if score > 0.1 and score <= 0.5: return "Buy"
    if -0.1 <= score <= 0.1: return "Neutral"
    if score < -0.1 and score >= -0.5: return "Sell"
    return "Strong Sell"

# ─── Build indicator votes for ONE symbol+TF ─────────────────────────────────
# def tv_indicator_votes(df: pd.DataFrame) -> Dict[str, Dict[str, int]]:
#     """
#     Returns:
#       {
#         "MAs": { "SMA10": 1, "EMA10": 1, ..., "Cloud": 0, "TenkanKijun": 1 },
#         "Oscillators": { "RSI": 0, "Stoch": 1, ... }
#       }
#     Each value ∈ {+1,0,-1}. If not enough data → indicator omitted from group avg.
#     """
#     votes_ma: Dict[str, int] = {}
#     votes_osc: Dict[str, int] = {}

#     close, high, low = df["c"], df["h"], df["l"]

#     # ── Moving Averages (TradingView set) ────────────────────────────────────
#     # SMA: 10,20,30,50,100,200
#     # EMA: 10,20,30,50,100,200
#     # Ichimoku Base (9,26,52, displacement 26 → base itself is NOT shifted)
#     # VWMA(20)  (requires volume)
#     # HMA(9)

#     # --- SMAs & EMAs
#     for n in [10, 20, 30, 50, 100, 200]:
#         sma_n = SMAIndicator(close=close, window=n).sma_indicator()
#         if not np.isnan(sma_n.iloc[-1]):
#             votes_ma[f"SMA{n}"] = (
#                 +1 if close.iloc[-1] > sma_n.iloc[-1] else
#                 -1 if close.iloc[-1] < sma_n.iloc[-1] else 0
#             )
#         ema_n = EMAIndicator(close=close, window=n).ema_indicator()
#         if not np.isnan(ema_n.iloc[-1]):
#             votes_ma[f"EMA{n}"] = (
#                 +1 if close.iloc[-1] > ema_n.iloc[-1] else
#                 -1 if close.iloc[-1] < ema_n.iloc[-1] else 0
#             )

#     # --- Ichimoku Base line (Kijun-sen), params (9,26,52, shift 26)
#     try:
#         ichi = IchimokuIndicator(high=high, low=low, window1=9, window2=26, window3=52, visual=False)
#         base = ichi.ichimoku_base_line()  # Kijun, not shifted
#         if not np.isnan(base.iloc[-1]):
#             votes_ma["IchimokuBase"] = (
#                 +1 if close.iloc[-1] > base.iloc[-1] else
#                 -1 if close.iloc[-1] < base.iloc[-1] else 0
#             )
#     except Exception:
#         pass

#     # --- VWMA(20)  (skip if volume missing)
#     if "v" in df.columns and df["v"].notna().any():
#         vwma20 = vwma(close, df["v"].fillna(0), 20)
#         if not np.isnan(vwma20.iloc[-1]):
#             votes_ma["VWMA20"] = (
#                 +1 if close.iloc[-1] > vwma20.iloc[-1] else
#                 -1 if close.iloc[-1] < vwma20.iloc[-1] else 0
#             )

#     # --- HMA(9)
#     hma9 = hma(close, 9)
#     if not np.isnan(hma9.iloc[-1]):
#         votes_ma["HMA9"] = (
#             +1 if close.iloc[-1] > hma9.iloc[-1] else
#             -1 if close.iloc[-1] < hma9.iloc[-1] else 0
#         )

#     # ---- Oscillators & Others ----

#     # RSI(14): Buy if <30 and rising; Sell if >70 and falling
#     rsi = RSIIndicator(close=close, window=14).rsi()
#     if len(rsi.dropna()) >= 2:
#         rising = rsi.iloc[-1] > rsi.iloc[-2]
#         falling = rsi.iloc[-1] < rsi.iloc[-2]
#         if rsi.iloc[-1] < 30 and rising:
#             votes_osc["RSI"] = +1
#         elif rsi.iloc[-1] > 70 and falling:
#             votes_osc["RSI"] = -1
#         else:
#             votes_osc["RSI"] = 0

#     # Stochastic %K, %D
#     stoch = StochasticOscillator(high=high, low=low, close=close, window=14, smooth_window=3)
#     k, d = stoch.stoch(), stoch.stoch_signal()
#     if len(k.dropna()) >= 1 and len(d.dropna()) >= 1:
#         k1, d1 = k.iloc[-1], d.iloc[-1]
#         if k1 < 20 and d1 < 20 and k1 > d1:
#             votes_osc["Stoch"] = +1
#         elif k1 > 80 and d1 > 80 and k1 < d1:
#             votes_osc["Stoch"] = -1
#         else:
#             votes_osc["Stoch"] = 0

#     # CCI(20): Buy below -100 and rising; Sell above +100 and falling
#     tp = (high + low + close) / 3.0
#     cci = (tp - tp.rolling(20).mean()) / (0.015 * tp.rolling(20).apply(lambda x: np.mean(np.abs(x - np.mean(x))), raw=True))
#     if len(cci.dropna()) >= 2:
#         rising = cci.iloc[-1] > cci.iloc[-2]
#         falling = cci.iloc[-1] < cci.iloc[-2]
#         if cci.iloc[-1] < -100 and rising:
#             votes_osc["CCI"] = +1
#         elif cci.iloc[-1] > +100 and falling:
#             votes_osc["CCI"] = -1
#         else:
#             votes_osc["CCI"] = 0

#     # ADX (+DI/-DI) > 20 and rising
#     adx_obj = ADXIndicator(high=high, low=low, close=close, window=14)
#     adx, di_pos, di_neg = adx_obj.adx(), adx_obj.adx_pos(), adx_obj.adx_neg()
#     if len(adx.dropna()) >= 2:
#         strong = (adx.iloc[-1] > 20) and (adx.iloc[-1] > adx.iloc[-2])
#         if strong and di_pos.iloc[-1] > di_neg.iloc[-1]:
#             votes_osc["ADX"] = +1
#         elif strong and di_neg.iloc[-1] > di_pos.iloc[-1]:
#             votes_osc["ADX"] = -1
#         else:
#             votes_osc["ADX"] = 0

#     # Awesome Oscillator: crossing / above-zero rising vs below-zero falling
#     try:
#         ao = AwesomeOscillatorIndicator(high=high, low=low, window1=5, window2=34).awesome_oscillator()
#         if len(ao.dropna()) >= 2:
#             if ao.iloc[-1] > 0 and ao.iloc[-2] <= 0:
#                 votes_osc["AO"] = +1
#             elif ao.iloc[-1] < 0 and ao.iloc[-2] >= 0:
#                 votes_osc["AO"] = -1
#             else:
#                 # slope fallback
#                 votes_osc["AO"] = +1 if (ao.iloc[-1] > ao.iloc[-2] and ao.iloc[-1] > 0) else (-1 if (ao.iloc[-1] < ao.iloc[-2] and ao.iloc[-1] < 0) else 0)
#     except Exception:
#         pass

#     # Momentum(10): >0 and rising = Buy; <0 and falling = Sell
#     mom = ROCIndicator(close=close, window=10).roc() * 100.0  # %ROC
#     if len(mom.dropna()) >= 2:
#         rising = mom.iloc[-1] > mom.iloc[-2]
#         falling = mom.iloc[-1] < mom.iloc[-2]
#         if mom.iloc[-1] > 0 and rising:
#             votes_osc["Momentum"] = +1
#         elif mom.iloc[-1] < 0 and falling:
#             votes_osc["Momentum"] = -1
#         else:
#             votes_osc["Momentum"] = 0

#     # MACD: line > signal → Buy; < → Sell
#     macd_obj = MACD(close=close, window_fast=12, window_slow=26, window_sign=9)
#     macd_line, macd_signal = macd_obj.macd(), macd_obj.macd_signal()
#     if not np.isnan(macd_line.iloc[-1]) and not np.isnan(macd_signal.iloc[-1]):
#         votes_osc["MACD"] = +1 if macd_line.iloc[-1] > macd_signal.iloc[-1] else -1

#     # Stochastic RSI: both <20 and K>D → Buy; both >80 and K<D → Sell
#     try:
#         st_rsi = StochRSIIndicator(close=close, window=14, smooth1=3, smooth2=3)
#         k2, d2 = st_rsi.stochrsi_k()*100.0, st_rsi.stochrsi_d()*100.0
#         if len(k2.dropna()) >= 1 and len(d2.dropna()) >= 1:
#             k1, d1 = k2.iloc[-1], d2.iloc[-1]
#             if k1 < 20 and d1 < 20 and k1 > d1:
#                 votes_osc["StochRSI"] = +1
#             elif k1 > 80 and d1 > 80 and k1 < d1:
#                 votes_osc["StochRSI"] = -1
#             else:
#                 votes_osc["StochRSI"] = 0
#     except Exception:
#         pass

#     # Williams %R: < -80 and rising → Buy; > -20 and falling → Sell
#     willr = WilliamsRIndicator(high=high, low=low, close=close, lbp=14).williams_r()
#     if len(willr.dropna()) >= 2:
#         rising = willr.iloc[-1] > willr.iloc[-2]  # less negative
#         falling = willr.iloc[-1] < willr.iloc[-2]
#         if willr.iloc[-1] < -80 and rising:
#             votes_osc["WilliamsR"] = +1
#         elif willr.iloc[-1] > -20 and falling:
#             votes_osc["WilliamsR"] = -1
#         else:
#             votes_osc["WilliamsR"] = 0

#     # Bulls/Bears Power: Bear<0 and rising in uptrend → Buy; Bull>0 and falling in downtrend → Sell
#     ema13 = EMAIndicator(close=close, window=13).ema_indicator()
#     bull = high - ema13
#     bear = low - ema13
#     # trend proxy: close vs ema13 & ema13 slope
#     if len(ema13.dropna()) >= 2:
#         uptrend = (close.iloc[-1] > ema13.iloc[-1]) and (ema13.iloc[-1] > ema13.iloc[-2])
#         downtrend = (close.iloc[-1] < ema13.iloc[-1]) and (ema13.iloc[-1] < ema13.iloc[-2])
#         if uptrend and (bear.iloc[-1] < 0) and (bear.iloc[-1] > bear.iloc[-2]):
#             votes_osc["BullsBears"] = +1
#         elif downtrend and (bull.iloc[-1] > 0) and (bull.iloc[-1] < bull.iloc[-2]):
#             votes_osc["BullsBears"] = -1
#         else:
#             votes_osc["BullsBears"] = 0

#     # Ultimate Oscillator: >70 Buy; <30 Sell
#     uo = ultimate_oscillator(high, low, close)
#     if not np.isnan(uo.iloc[-1]):
#         if uo.iloc[-1] > 70:
#             votes_osc["Ultimate"] = +1
#         elif uo.iloc[-1] < 30:
#             votes_osc["Ultimate"] = -1
#         else:
#             votes_osc["Ultimate"] = 0

#     return {"MAs": votes_ma, "Oscillators": votes_osc}

def tv_indicator_votes(df: pd.DataFrame, trace: bool = False) -> Tuple[Dict[str, Dict[str, int]], Dict[str, Dict[str, Any]]]:
    votes_ma: Dict[str, int] = {}
    votes_osc: Dict[str, int] = {}
    raw_ma: Dict[str, Any] = {"close": float(df["c"].iloc[-1])}
    raw_osc: Dict[str, Any] = {}

    close, high, low = df["c"], df["h"], df["l"]

    # ── MAs: SMA/EMA (10,20,30,50,100,200), Ichimoku Kijun, VWMA(20), HMA(9)
    for n in [10, 20, 30, 50, 100, 200]:
        sma_n = SMAIndicator(close=close, window=n).sma_indicator()
        ema_n = EMAIndicator(close=close, window=n).ema_indicator()
        sv = float(sma_n.iloc[-1]) if not np.isnan(sma_n.iloc[-1]) else None
        ev = float(ema_n.iloc[-1]) if not np.isnan(ema_n.iloc[-1]) else None
        raw_ma[f"SMA{n}"] = sv; raw_ma[f"EMA{n}"] = ev
        if sv is not None:
            votes_ma[f"SMA{n}"] = 1 if close.iloc[-1] > sv else -1 if close.iloc[-1] < sv else 0
        if ev is not None:
            votes_ma[f"EMA{n}"] = 1 if close.iloc[-1] > ev else -1 if close.iloc[-1] < ev else 0

    # Ichimoku baseline (Kijun)
    tenkan, kijun, span_a_vis, span_b_vis = ichimoku_core(high, low)
    kv = float(kijun.iloc[-1]) if not np.isnan(kijun.iloc[-1]) else None
    raw_ma["IchimokuBase"] = kv
    if kv is not None:
        eps = max(1e-8, 1e-6 * float(close.iloc[-1]))
        votes_ma["IchimokuBase"] = 1 if close.iloc[-1] > kv + eps else -1 if close.iloc[-1] < kv - eps else 0

    # VWMA(20)
    if "v" in df.columns and df["v"].notna().any():
        vw = vwma(close, df["v"].fillna(0), 20)
        vv = float(vw.iloc[-1]) if not np.isnan(vw.iloc[-1]) else None
        raw_ma["VWMA20"] = vv
        if vv is not None:
            votes_ma["VWMA20"] = 1 if close.iloc[-1] > vv else -1 if close.iloc[-1] < vv else 0

    # HMA(9)
    h = hma(close, 9)
    hv = float(h.iloc[-1]) if not np.isnan(h.iloc[-1]) else None
    raw_ma["HMA9"] = hv
    if hv is not None:
        votes_ma["HMA9"] = 1 if close.iloc[-1] > hv else -1 if close.iloc[-1] < hv else 0

    # ── Oscillators (same rules you have, but we log last/prev)
    rsi = RSIIndicator(close=close, window=14).rsi()
    if len(rsi.dropna()) >= 2:
        r_last, r_prev = float(rsi.iloc[-1]), float(rsi.iloc[-2])
        raw_osc["RSI"] = {"last": r_last, "prev": r_prev}
        votes_osc["RSI"] = 1 if (r_last < 30 and r_last > r_prev) else -1 if (r_last > 70 and r_last < r_prev) else 0

    stoch = StochasticOscillator(high=high, low=low, close=close, window=14, smooth_window=3)
    k, d = stoch.stoch(), stoch.stoch_signal()
    if len(k.dropna()) >= 1 and len(d.dropna()) >= 1:
        k1, d1 = float(k.iloc[-1]), float(d.iloc[-1])
        raw_osc["Stoch"] = {"k": k1, "d": d1}
        votes_osc["Stoch"] = 1 if (k1 < 20 and d1 < 20 and k1 > d1) else -1 if (k1 > 80 and d1 > 80 and k1 < d1) else 0

    tp = (high + low + close) / 3.0
    cci = (tp - tp.rolling(20).mean()) / (0.015 * tp.rolling(20).apply(lambda x: np.mean(np.abs(x - np.mean(x))), raw=True))
    if len(cci.dropna()) >= 2:
        c_last, c_prev = float(cci.iloc[-1]), float(cci.iloc[-2])
        raw_osc["CCI"] = {"last": c_last, "prev": c_prev}
        votes_osc["CCI"] = 1 if (c_last < -100 and c_last > c_prev) else -1 if (c_last > 100 and c_last < c_prev) else 0

    adx_obj = ADXIndicator(high=high, low=low, close=close, window=14)
    adx, di_pos, di_neg = adx_obj.adx(), adx_obj.adx_pos(), adx_obj.adx_neg()
    if len(adx.dropna()) >= 2:
        a_last, a_prev = float(adx.iloc[-1]), float(adx.iloc[-2])
        dip, din = float(di_pos.iloc[-1]), float(di_neg.iloc[-1])
        raw_osc["ADX"] = {"adx": a_last, "prev": a_prev, "+di": dip, "-di": din}
        strong = (a_last > 20) and (a_last > a_prev)
        votes_osc["ADX"] = 1 if (strong and dip > din) else -1 if (strong and din > dip) else 0

    try:
        ao = AwesomeOscillatorIndicator(high=high, low=low, window1=5, window2=34).awesome_oscillator()
        if len(ao.dropna()) >= 2:
            ao_last, ao_prev = float(ao.iloc[-1]), float(ao.iloc[-2])
            raw_osc["AO"] = {"last": ao_last, "prev": ao_prev}
            votes_osc["AO"] = 1 if (ao_last > 0 and ao_prev <= 0) else -1 if (ao_last < 0 and ao_prev >= 0) else (1 if (ao_last>ao_prev and ao_last>0) else (-1 if (ao_last<ao_prev and ao_last<0) else 0))
    except Exception:
        pass

    mom = ROCIndicator(close=close, window=10).roc() * 100.0
    if len(mom.dropna()) >= 2:
        m_last, m_prev = float(mom.iloc[-1]), float(mom.iloc[-2])
        raw_osc["Momentum"] = {"last": m_last, "prev": m_prev}
        votes_osc["Momentum"] = 1 if (m_last > 0 and m_last > m_prev) else -1 if (m_last < 0 and m_last < m_prev) else 0

    macd_obj = MACD(close=close, window_fast=12, window_slow=26, window_sign=9)
    ml, ms = macd_obj.macd(), macd_obj.macd_signal()
    if not np.isnan(ml.iloc[-1]) and not np.isnan(ms.iloc[-1]):
        ml1, ms1 = float(ml.iloc[-1]), float(ms.iloc[-1])
        raw_osc["MACD"] = {"line": ml1, "signal": ms1}
        votes_osc["MACD"] = 1 if ml1 > ms1 else -1

    try:
        st_rsi = StochRSIIndicator(close=close, window=14, smooth1=3, smooth2=3)
        k2, d2 = st_rsi.stochrsi_k()*100.0, st_rsi.stochrsi_d()*100.0
        if len(k2.dropna()) >= 1 and len(d2.dropna()) >= 1:
            kk, dd = float(k2.iloc[-1]), float(d2.iloc[-1])
            raw_osc["StochRSI"] = {"k": kk, "d": dd}
            votes_osc["StochRSI"] = 1 if (kk < 20 and dd < 20 and kk > dd) else -1 if (kk > 80 and dd > 80 and kk < dd) else 0
    except Exception:
        pass

    willr = WilliamsRIndicator(high=high, low=low, close=close, lbp=14).williams_r()
    if len(willr.dropna()) >= 2:
        w_last, w_prev = float(willr.iloc[-1]), float(willr.iloc[-2])
        raw_osc["WilliamsR"] = {"last": w_last, "prev": w_prev}
        votes_osc["WilliamsR"] = 1 if (w_last < -80 and w_last > w_prev) else -1 if (w_last > -20 and w_last < w_prev) else 0

    ema13 = EMAIndicator(close=close, window=13).ema_indicator()
    if len(ema13.dropna()) >= 2:
        e_last, e_prev = float(ema13.iloc[-1]), float(ema13.iloc[-2])
        bull = float(df["h"].iloc[-1] - e_last)
        bear = float(df["l"].iloc[-1] - e_last)
        raw_osc["BullsBears"] = {"ema13": e_last, "ema_prev": e_prev, "bull": bull, "bear": bear}
        uptrend = (close.iloc[-1] > e_last) and (e_last > e_prev)
        downtrend = (close.iloc[-1] < e_last) and (e_last < e_prev)
        votes_osc["BullsBears"] = 1 if (uptrend and bear < 0 and bear > (df["l"].iloc[-2] - e_prev)) else (-1 if (downtrend and bull > 0 and bull < (df["h"].iloc[-2] - e_prev)) else 0)

    uo = ultimate_oscillator(high, low, close)
    if not np.isnan(uo.iloc[-1]):
        u_last = float(uo.iloc[-1])
        raw_osc["Ultimate"] = {"last": u_last}
        votes_osc["Ultimate"] = 1 if u_last > 70 else -1 if u_last < 30 else 0

    votes = {"MAs": votes_ma, "Oscillators": votes_osc}
    raw   = {"MAs": raw_ma,  "Oscillators": raw_osc}
    return votes, raw

# ─── Core TV rating calculator for one symbol+TF ─────────────────────────────
# def tv_rating_for_df(df: pd.DataFrame, group: str = "All") -> Dict[str, float | str | Dict]:
#     votes = tv_indicator_votes(df)
#     ma_score = _avg(list(votes["MAs"].values()))
#     osc_score = _avg(list(votes["Oscillators"].values()))
#     if group == "MAs":
#         overall = ma_score
#     elif group == "Oscillators":
#         overall = osc_score
#     else:
#         overall = (ma_score + osc_score) / 2.0
#     return {
#         "ma_score": round(ma_score, 4),
#         "osc_score": round(osc_score, 4),
#         "score": round(overall, 4),
#         "rating": tv_rating_text(overall),
#         "votes": votes  # -1/0/+1 per indicator (useful for debugging UI)
#     }

# use_closed=True drops the forming bar; trace=True returns raw numbers
def tv_rating_for_df(df: pd.DataFrame, group: str = "All", *, trace: bool = False) -> Dict[str, Any]:
    votes, raw = tv_indicator_votes(df, trace=trace)  # << return (votes, raw)
    ma_score  = _avg(list(votes["MAs"].values()))
    osc_score = _avg(list(votes["Oscillators"].values()))
    overall   = ma_score if group=="MAs" else osc_score if group=="Oscillators" else (ma_score+osc_score)/2
    out: Dict[str, Any] = {
        "ma_score": round(ma_score, 4),
        "osc_score": round(osc_score, 4),
        "score": round(overall, 4),
        "rating": tv_rating_text(overall),
        "votes": votes
    }
    if trace: out["raw"] = raw
    return out




# --------------------------------------------------------------------------------------------

