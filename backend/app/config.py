from pathlib import Path
from zoneinfo import ZoneInfo

from pydantic_settings import BaseSettings, SettingsConfigDict

PACIFIC_TZ = ZoneInfo("America/Los_Angeles")
WALK_SPEED_MPS = 1.35
MAX_SAFETY_DETOUR = 0.30
NEAREST_NODE_MAX_M = 250.0
LAMBDA_MAX = 4.0
W_LIGHTS = 0.40
W_PLACES = 0.30
W_SIDEWALKS = 0.20
W_CROSSWALKS = 0.10

# Same UW envelope the mock contract and the prototype use.
UW_CENTER_LAT = 47.6553
UW_CENTER_LNG = -122.3035
BBOX = (-122.332, 47.645, -122.280, 47.672)

BACKEND_DIR = Path(__file__).resolve().parent.parent
CACHE_DIR = BACKEND_DIR / "data" / "cache"
MANIFEST_PATH = CACHE_DIR / "manifest.json"
GRAPH_PATH = CACHE_DIR / "walk_graph.pkl"
POIS_PATH = CACHE_DIR / "pois.geojson"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./pathwise.db"
    jwt_secret: str = "dev-only-change-me"
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 60 * 24 * 7


settings = Settings()
