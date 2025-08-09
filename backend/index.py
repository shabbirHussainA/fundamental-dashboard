from fastapi import FastAPI
from routes.candles import candle
from fastapi.middleware.cors import CORSMiddleware
from routes.ratings import rating
app = FastAPI()
# Allow CORS for your frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # or specify e.g. ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],  # GET, POST, PUT, DELETE, etc.
    allow_headers=["*"],  # e.g. "Content-Type", "Authorization"
)
app.include_router(candle)
app.include_router(rating)

