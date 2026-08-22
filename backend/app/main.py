from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import tasks, auth, atrd, packages

app = FastAPI(
    title="Aether Automate API",
    description="API for automated test generation and management",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"],
    expose_headers=["Content-Length", "X-Total-Count"],
    max_age=3600,
)

# Include routers
app.include_router(auth.router)
app.include_router(tasks.router)
app.include_router(atrd.router)
app.include_router(packages.router)

@app.get("/")
async def root():
    return {
        "message": "Welcome to Aether Automate API",
        "docs": "/docs",
        "redoc": "/redoc",
        "health": "/health"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "version": "1.0.0"
    }

@app.get("/api/health")
async def api_health_check():
    return {
        "status": "healthy",
        "version": "1.0.0"
    }
