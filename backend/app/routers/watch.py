from fastapi import APIRouter, HTTPException

from app.photon import find_watcher, line_label, list_watchers, send_alert
from app.schemas.watch import (
    WatcherOut,
    WatchersResponse,
    WatchMessageOut,
    WatchResponse,
    WatchStartRequest,
    WatchUpdateRequest,
)
from app.watch import get_watch, start_watch, update_watch

router = APIRouter(tags=["watch"])


def _deliver(session, created) -> None:
    for message in created:
        error = send_alert(
            message.text,
            f"pathwise-{session.id}-{message.kind}-{int(message.sent_at.timestamp())}",
            session.watcher_handle,
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


@router.get("/api/watch/watchers", response_model=WatchersResponse)
def read_watchers() -> WatchersResponse:
    watchers, problem = list_watchers()
    if problem:
        raise HTTPException(status_code=503, detail=problem)
    return WatchersResponse(
        line=line_label(),
        watchers=[WatcherOut(name=item["name"], handle=item["handle"], phone=item["phone"]) for item in watchers],
    )


@router.post("/api/watch", response_model=WatchResponse)
def create_watch(body: WatchStartRequest) -> WatchResponse:
    watcher, problem = find_watcher(body.watcher_handle)
    if problem:
        raise HTTPException(status_code=503, detail=problem)
    if watcher is None:
        raise HTTPException(status_code=400, detail=f"That person has not texted {line_label()} yet.")
    session = start_watch(body.walker_name, watcher["name"], watcher["handle"], body.destination_name)
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
