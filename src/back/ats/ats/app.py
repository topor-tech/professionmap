from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

from ats.api import router as api_router
from ats.config import settings

# Initialize Sentry
sentry_sdk.init(
    dsn=settings.sentry_dsn,
    environment=settings.sentry_environment,
    integrations=[
        FastApiIntegration(),
        SqlalchemyIntegration(),
    ],
    traces_sample_rate=1.0 if settings.is_development else 0.1,
    send_default_pii=True,
)

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    openapi_url="/api/v1/ats/openapi.json",
    docs_url="/api/v1/ats/docs",
    redoc_url="/api/v1/ats/redoc",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_dev if settings.is_development else settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


@app.get("/")
async def root():
    return {"message": f"Hello from {settings.app_name}!"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.get("/test-sentry")
async def test_sentry():
    """Test endpoint to verify Sentry integration"""
    try:
        # This will raise an exception to test Sentry
        raise Exception("Test exception for Sentry integration")
    except Exception as e:
        # Capture the exception with Sentry
        sentry_sdk.capture_exception(e)
        return {"message": "Test exception sent to Sentry", "error": str(e)}


app.include_router(api_router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
