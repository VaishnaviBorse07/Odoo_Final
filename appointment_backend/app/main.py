# ZenFlow FastAPI entrypoint — CORS, /api routes, DB pool lifecycle, unified error JSON.
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import admin, appointments, auth, bookings, reports, resources, users
from app.core.config import get_settings
from app.db import close_pool, create_pool

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    await create_pool(settings.database_url)
    yield
    await close_pool()


app = FastAPI(title="ZenFlow API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_handler(request: Request, exc: HTTPException):
    msg = exc.detail if isinstance(exc.detail, str) else str(exc.detail)
    return JSONResponse({"success": False, "message": msg}, status_code=exc.status_code)


@app.exception_handler(RequestValidationError)
async def validation_handler(request: Request, exc: RequestValidationError):
    errs = exc.errors()
    msg = errs[0].get("msg", "Invalid request") if errs else "Invalid request"
    return JSONResponse({"success": False, "message": msg}, status_code=422)


@app.get("/health")
async def health():
    return {"ok": True}


api = "api"
app.include_router(auth.router, prefix=f"/{api}")
app.include_router(users.router, prefix=f"/{api}")
app.include_router(appointments.router, prefix=f"/{api}")
app.include_router(resources.router, prefix=f"/{api}")
app.include_router(bookings.router, prefix=f"/{api}")
app.include_router(admin.router, prefix=f"/{api}")
app.include_router(reports.router, prefix=f"/{api}")
