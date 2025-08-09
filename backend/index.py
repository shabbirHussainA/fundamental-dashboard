from fastapi import FastAPI
from routes.candles import candle
from routes.ratings import rating
app = FastAPI()

app.include_router(candle)
app.include_router(rating)

