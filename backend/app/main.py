from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, meta, banks, transactions, unverified, imports, analytics, budgets, activity, export, categories, modes
from app.config import settings

app = FastAPI(title="Why So Broke", version="1.0.0")

allowed_origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}


app.include_router(auth.router, prefix="/api/v1")
app.include_router(meta.router, prefix="/api/v1")
app.include_router(banks.router, prefix="/api/v1")
app.include_router(transactions.router, prefix="/api/v1")
app.include_router(unverified.router, prefix="/api/v1")
app.include_router(imports.router, prefix="/api/v1")
app.include_router(analytics.router, prefix="/api/v1")
app.include_router(budgets.router, prefix="/api/v1")
app.include_router(activity.router, prefix="/api/v1")
app.include_router(export.router, prefix="/api/v1")
app.include_router(categories.router, prefix="/api/v1")
app.include_router(modes.router, prefix="/api/v1")
