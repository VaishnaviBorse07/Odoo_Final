# JSON-friendly conversion for asyncpg rows — exports record_to_dict, records_to_dicts.
from datetime import date, datetime, time
from decimal import Decimal
from typing import Any, Mapping
from uuid import UUID


def _val(v: Any) -> Any:
    if v is None:
        return None
    if isinstance(v, datetime):
        return v.isoformat()
    if isinstance(v, date):
        return v.isoformat()
    if isinstance(v, time):
        return v.strftime("%H:%M:%S")
    if isinstance(v, Decimal):
        return float(v)
    if isinstance(v, UUID):
        return str(v)
    if isinstance(v, dict):
        return {k: _val(x) for k, x in v.items()}
    if isinstance(v, list):
        return [_val(x) for x in v]
    return v


def record_to_dict(row: Mapping[str, Any]) -> dict[str, Any]:
    return {k: _val(row[k]) for k in row.keys()}


def records_to_dicts(rows: list) -> list[dict[str, Any]]:
    return [record_to_dict(r) for r in rows]
