from uuid import uuid4

from fastapi import APIRouter, HTTPException

from app.photon import line_label, send_alert
from app.schemas.watch import (
    WatchMessageOut,
    WatchResponse,
    WatchStartRequest,
    WatchTestResponse,
    WatchUpdateRequest,
)
from app.watch import get_watch, start_watch, update_watch

router = APIRouter(tags=["watch"])


def _deliver(session, created) -> None:
    for message in created:
        error = send_alert(
            message.text,
            f"pathwise-{session.id}-{message.kind}-{int(message.sent_at.timestamp())}",
        )
        message.delivered = error is None
        session.notice = error


def _response(session) -> WatchResponse:
    return WatchResponse(
        id=session.id,
        watcher_name=session.watcher_name,
        notice=session.notice,
        messages=[
            WatchMessageOut(
                kind=message.kind,
                text=message.text,
                sent_at=message.sent_at,
                delivered=message.delivered,
            )
            for message in session.messages
        ],
    )


@router.post("/api/watch/test", response_model=WatchTestResponse)
def test_watch() -> WatchTestResponse:
    text = "PathWise test. This iPhone gets the alert when you stop, leave the path, or arrive."
    error = send_alert(text, f"pathwise-test-{uuid4().hex}")
    return WatchTestResponse(line=line_label(), text=text, delivered=error is None, notice=error)


@router.post("/api/watch", response_model=WatchResponse)
def create_watch(body: WatchStartRequest) -> WatchResponse:
    session = start_watch(body.walker_name, body.watcher_name, body.destination_name)
    return _response(session)


@router.post("/api/watch/{watch_id}", response_model=WatchResponse)
def ping_watch(watch_id: str, body: WatchUpdateRequest) -> WatchResponse:
    session = get_watch(watch_id)
    if session is None:
        raise HTTPException(status_code=404, detail="That watch has ended.")
    created = update_watch(
        session,
        off_route=body.off_route,
        arrived=body.arrived,
        street=body.street,
        lat=body.lat,
        lng=body.lng,
    )
    _deliver(session, created)
    return _response(session)


@router.get("/api/watch/{watch_id}", response_model=WatchResponse)
def read_watch(watch_id: str) -> WatchResponse:
    session = get_watch(watch_id)
    if session is None:
        raise HTTPException(status_code=404, detail="That watch has ended.")
    return _response(session)
