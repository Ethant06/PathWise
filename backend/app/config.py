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

# Campus plus the University District and nearby north Seattle:
# Roosevelt, Wallingford, Fremont, Eastlake, Montlake, Ravenna, U-Village.
UW_CENTER_LAT = 47.6553
UW_CENTER_LNG = -122.3035
BBOX = (-122.365, 47.620, -122.270, 47.700)

LIGHT_BUFFER_M = 28.0
SIDEWALK_BUFFER_M = 18.0
CROSSWALK_BUFFER_M = 22.0
PLACE_BUFFER_M = 80.0

ARCGIS_STREETLIGHTS = (
    "https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services/"
    "Seattle_City_Light_Poles/FeatureServer/0"
)
ARCGIS_SIDEWALKS = (
    "https://services.arcgis.com/ZOyb2t4B0UYuYNYH/ArcGIS/rest/services/"
    "Sidewalks_CDL/FeatureServer/0"
)
ARCGIS_CROSSWALKS = (
    "https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services/"
    "Marked_Crosswalks_CDL/FeatureServer/0"
)

PUBLIC_PLACE_AMENITIES = {
    "cafe",
    "restaurant",
    "fast_food",
    "library",
    "university",
    "college",
    "pharmacy",
    "hospital",
    "clinic",
    "doctors",
    "dentist",
    "bank",
    "atm",
    "theatre",
    "cinema",
    "community_centre",
    "arts_centre",
    "marketplace",
    "police",
    "fire_station",
    "post_office",
    "fuel",
    "bar",
    "pub",
    "ice_cream",
    "convenience",
    "supermarket",
    "bookstore",
    "bicycle_rental",
    "toilets",
    "fountain",
    "school",
    "kindergarten",
    "place_of_worship",
    "social_facility",
    "bus_station",
    "ferry_terminal",
    "food_court",
}
PUBLIC_TOURISM = {"museum", "hotel", "attraction", "gallery", "hostel", "apartment"}
# Named buildings people search for, such as The Standard at Seattle.
NAMED_BUILDINGS = {
    "apartments",
    "dormitory",
    "residential",
    "university",
    "college",
    "office",
    "commercial",
    "hotel",
    "retail",
    "public",
    "civic",
    "train_station",
    "transportation",
    "stadium",
    "hospital",
    "school",
    "kindergarten",
}
NAMED_LEISURE = {"park", "stadium", "sports_centre", "fitness_centre", "garden", "nature_reserve"}
NAMED_RAIL = {"station", "halt", "subway_entrance"}

BACKEND_DIR = Path(__file__).resolve().parent.parent
CACHE_DIR = BACKEND_DIR / "data" / "cache"
MANIFEST_PATH = CACHE_DIR / "manifest.json"
GRAPH_PATH = CACHE_DIR / "walk_graph.pkl"
POIS_PATH = CACHE_DIR / "pois.geojson"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./pathwise.db"
    jwt_secret: str = "dev-only-pathwise-local-signing-key"
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 60 * 24 * 7
    # Comma-separated OAuth client IDs. An ID token must be issued for one of these.
    google_client_ids: str = ""


settings = Settings()
