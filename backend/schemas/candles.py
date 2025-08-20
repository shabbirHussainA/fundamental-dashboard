from pydantic import BaseModel
class Candle(BaseModel):
    t: int   # unix ms
    o: float
    h: float
    l: float
    c: float
    v: float | int | None = None  # << add volume


