from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.config import settings
from backend.app.database import init_db
from backend.app.routers.auth_router import router as auth_router
from backend.app.routers.transactions_router import router as transactions_router
from backend.app.routers.analytics_router import router as analytics_router
from backend.app.routers.reports_router import router as reports_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite database and schema on startup
    init_db()
    print("SpendSense SQLite Database initialized successfully.")
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="SpendSense — Personal Expense Anomaly Detector with AI (Isolation Forest), Data Cleaning, SQLite, S3 Archival, and JWT Security.",
    lifespan=lifespan
)

# Restrictive CORS configuration for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth_router)
app.include_router(transactions_router)
app.include_router(analytics_router)
app.include_router(reports_router)

@app.get("/health", tags=["Health"])
def health_check():
    """Health check endpoint for system monitoring and test validation."""
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "database": "sqlite_connected",
        "s3_configured": settings.is_s3_configured
    }

@app.get("/", tags=["Root"])
def root():
    """Root endpoint welcoming the user and directing to interactive API docs."""
    return {
        "message": f"Welcome to {settings.PROJECT_NAME} API",
        "version": settings.VERSION,
        "docs_url": "/docs",
        "redoc_url": "/redoc"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=True)
