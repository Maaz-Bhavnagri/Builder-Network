from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import models
from database import engine
from routes import router as users_router
from matching import router as matching_router
from connections import router as connections_router
from chat import router as chat_router

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Clerk FastAPI Auth Backend")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], # Next.js default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users_router)
app.include_router(matching_router)
app.include_router(connections_router)
app.include_router(chat_router)

@app.get("/")
def read_root():
    return {"message": "Welcome to the API. Go to /docs for the Swagger UI."}
