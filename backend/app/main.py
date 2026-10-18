from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from app.database import Base, engine
from app.models.user import User  # noqa: F401
from app.routers import auth, buddy, health, places, routes, status, watch


@asynccontextmanager
async def lifespan(_app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="PathWise API",
    version="0.1.0",
    lifespan=lifespan,
    description=(
        "Live PathWise server. Accounts use SQLAlchemy and return a JWT. "
        "Data status, place search, and routes read the UW cache. "
        "Google tokens are not verified with Google yet. "
        "There is no safety probability."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/", include_in_schema=False)
def root() -> RedirectResponse:
    return RedirectResponse(url="/docs")


app.include_router(auth.router)
app.include_router(health.router)
app.include_router(status.router)
app.include_router(places.router)
app.include_router(routes.router)
app.include_router(watch.router)
app.include_router(buddy.router)
