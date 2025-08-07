from fastapi import FastAPI
from routes.note import note

app = FastAPI()

app.include_router(note)