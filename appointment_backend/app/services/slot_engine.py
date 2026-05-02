# Weekly and flexible slot generation for booking UI — exports generate_weekly_slots, generate_flexible_slots.
from datetime import date, time
from typing import Any

import asyncpg


def time_str_to_minutes(t: time | str) -> int:
    if isinstance(t, time):
        return t.hour * 60 + t.minute
    parts = str(t).split(":")
    return int(parts[0]) * 60 + int(parts[1])


def minutes_to_time_str(m: int) -> str:
    h, mi = divmod(m, 60)
    return f"{h:02d}:{mi:02d}:00"


def times_overlap(s1: int, e1: int, s2: int, e2: int) -> bool:
    return s1 < e2 and e1 > s2


async def _bookings_for_day(
    conn: asyncpg.Connection, resource_id: int, d: date
) -> list[asyncpg.Record]:
    return await conn.fetch(
        """
        SELECT start_time, end_time, capacity_booked
        FROM bookings
        WHERE resource_id = $1 AND booking_date = $2 AND status <> 'cancelled'
        """,
        resource_id,
        d,
    )


async def generate_weekly_slots(
    conn: asyncpg.Connection,
    resource_id: int,
    d: date,
    duration_minutes: int,
    appointment_type_id: int,
) -> list[dict[str, Any]]:
    dow = d.weekday()
    # Python: Monday=0 .. Sunday=6; DB seed uses 0=Sunday .. 6=Saturday
    db_dow = (dow + 1) % 7
    wh = await conn.fetch(
        """
        SELECT start_time, end_time FROM working_hours
        WHERE resource_id = $1 AND day_of_week = $2 AND is_available = TRUE
        """,
        resource_id,
        db_dow,
    )
    if not wh:
        return []
    apt = await conn.fetchrow(
        "SELECT manage_capacity, max_capacity FROM appointment_types WHERE id = $1",
        appointment_type_id,
    )
    if not apt:
        return []
    manage_cap: bool = apt["manage_capacity"]
    max_cap: int = apt["max_capacity"] or 1
    bookings = await _bookings_for_day(conn, resource_id, d)
    bmins = [
        (
            time_str_to_minutes(r["start_time"]),
            time_str_to_minutes(r["end_time"]),
            int(r["capacity_booked"] or 1),
        )
        for r in bookings
    ]
    out: list[dict[str, Any]] = []
    for row in wh:
        start_min = time_str_to_minutes(row["start_time"])
        end_min = time_str_to_minutes(row["end_time"])
        slot_start = start_min
        while slot_start + duration_minutes <= end_min:
            slot_end = slot_start + duration_minutes
            if manage_cap:
                booked_cap = sum(
                    cap for (bs, be, cap) in bmins if times_overlap(slot_start, slot_end, bs, be)
                )
                spots = max_cap - booked_cap
                available = spots > 0
                out.append(
                    {
                        "start_time": minutes_to_time_str(slot_start),
                        "end_time": minutes_to_time_str(slot_end),
                        "available": available,
                        "spots_remaining": max(0, spots),
                    }
                )
            else:
                is_booked = any(times_overlap(slot_start, slot_end, bs, be) for (bs, be, _) in bmins)
                out.append(
                    {
                        "start_time": minutes_to_time_str(slot_start),
                        "end_time": minutes_to_time_str(slot_end),
                        "available": not is_booked,
                        "spots_remaining": 0 if is_booked else 1,
                    }
                )
            slot_start += duration_minutes
    return out


async def generate_flexible_slots(
    conn: asyncpg.Connection,
    resource_id: int,
    d: date,
    appointment_type_id: int,
) -> list[dict[str, Any]]:
    rows = await conn.fetch(
        """
        SELECT start_time, end_time FROM flexible_slots
        WHERE resource_id = $1 AND slot_date = $2 AND is_available = TRUE
        ORDER BY start_time
        """,
        resource_id,
        d,
    )
    if not rows:
        return []
    apt = await conn.fetchrow(
        "SELECT manage_capacity, max_capacity FROM appointment_types WHERE id = $1",
        appointment_type_id,
    )
    if not apt:
        return []
    manage_cap: bool = apt["manage_capacity"]
    max_cap: int = apt["max_capacity"] or 1
    bookings = await _bookings_for_day(conn, resource_id, d)
    bmins = [
        (
            time_str_to_minutes(r["start_time"]),
            time_str_to_minutes(r["end_time"]),
            int(r["capacity_booked"] or 1),
        )
        for r in bookings
    ]
    out: list[dict[str, Any]] = []
    for row in rows:
        s = time_str_to_minutes(row["start_time"])
        e = time_str_to_minutes(row["end_time"])
        if manage_cap:
            booked_cap = sum(cap for (bs, be, cap) in bmins if times_overlap(s, e, bs, be))
            spots = max_cap - booked_cap
            available = spots > 0
            out.append(
                {
                    "start_time": minutes_to_time_str(s),
                    "end_time": minutes_to_time_str(e),
                    "available": available,
                    "spots_remaining": max(0, spots),
                }
            )
        else:
            is_booked = any(times_overlap(s, e, bs, be) for (bs, be, _) in bmins)
            out.append(
                {
                    "start_time": minutes_to_time_str(s),
                    "end_time": minutes_to_time_str(e),
                    "available": not is_booked,
                    "spots_remaining": 0 if is_booked else 1,
                }
            )
    return out
