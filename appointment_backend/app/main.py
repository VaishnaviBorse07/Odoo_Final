# ZenFlow FastAPI entrypoint — CORS, /api routes, DB pool lifecycle, unified error JSON.
import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import admin, appointments, auth, bookings, payments_webhook, reports, resources, users
from app.core.config import get_settings
from app.db import close_pool, create_pool

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def _cleanup_expired_holds():
    """
    Background task: deletes expired slot_holds every 60 seconds.
    Keeps the table lean and ensures slots are freed promptly after timeout.
    """
    from app.db import pool as get_pool  # imported here to avoid circular at module load
    while True:
        try:
            await asyncio.sleep(60)
            async with get_pool().acquire() as conn:
                n = await conn.fetchval(
                    "DELETE FROM slot_holds WHERE expires_at <= NOW() RETURNING COUNT(*)"
                )
                if n:
                    logger.info("Cleaned up %s expired slot hold(s)", n)
        except asyncio.CancelledError:
            break
        except Exception as exc:  # noqa: BLE001
            logger.warning("Slot hold cleanup error: %s", exc)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    await create_pool(settings.database_url)
    cleanup_task = asyncio.create_task(_cleanup_expired_holds())
    try:
        yield
    finally:
        cleanup_task.cancel()
        await asyncio.gather(cleanup_task, return_exceptions=True)
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


@app.exception_handler(Exception)
async def unhandled_handler(request: Request, exc: Exception):
    logger.exception("Unhandled API error on %s %s", request.method, request.url.path)
    return JSONResponse({"success": False, "message": f"Unexpected server error: {str(exc)}"}, status_code=500)


@app.get("/health")
async def health():
    return {"ok": True}


api = "api"
app.include_router(auth.router, prefix=f"/{api}")
app.include_router(users.router, prefix=f"/{api}")
app.include_router(appointments.router, prefix=f"/{api}")
app.include_router(resources.router, prefix=f"/{api}")
app.include_router(bookings.router, prefix=f"/{api}")
app.include_router(payments_webhook.router, prefix=f"/{api}")
app.include_router(admin.router, prefix=f"/{api}")
app.include_router(reports.router, prefix=f"/{api}")
