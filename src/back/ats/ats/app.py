from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from ats.api import router as api_router
from ats.config import settings

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
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"message": f"Hello from {settings.app_name}!"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


app.include_router(api_router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
