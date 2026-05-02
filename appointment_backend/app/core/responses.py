# Unified JSON response helpers matching the Express contract — exports ok_json, err_json.
from typing import Any, Optional

from fastapi.responses import JSONResponse


def ok_json(data: Any, message: str = "OK", status_code: int = 200) -> JSONResponse:
    return JSONResponse(
        {"success": True, "message": message, "data": data},
        status_code=status_code,
    )


def err_json(message: str, status_code: int = 400) -> JSONResponse:
    return JSONResponse({"success": False, "message": message}, status_code=status_code)
