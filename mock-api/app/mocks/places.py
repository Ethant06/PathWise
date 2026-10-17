from app.schemas.places import PlaceHit

PLACES: list[PlaceHit] = [
    PlaceHit(
        name="Odegaard Undergraduate Library",
        lat=47.65647,
        lng=-122.31042,
        category="library",
        osm_id="way:26614445",
        opening_hours="Mo-Th 07:30-24:00; Fr 07:30-18:00; Sa 12:00-17:00; Su 12:00-24:00",
    ),
    PlaceHit(
        name="Suzzallo Library",
        lat=47.65581,
        lng=-122.30805,
        category="library",
        osm_id="way:26614390",
        opening_hours="Mo-Th 08:00-22:00; Fr 08:00-17:00; Sa-Su 12:00-18:00",
    ),
    PlaceHit(
        name="Husky Union Building",
        lat=47.65540,
        lng=-122.30520,
        category="university",
        osm_id="way:150001",
        opening_hours="Mo-Fr 07:00-22:00",
    ),
    PlaceHit(
        name="University Book Store",
        lat=47.66010,
        lng=-122.31340,
        category="books",
        osm_id="node:150002",
        opening_hours="Mo-Fr 09:00-18:00; Sa 10:00-17:00",
    ),
    PlaceHit(
        name="Cafe on the Ave",
        lat=47.66120,
        lng=-122.31310,
        category="cafe",
        osm_id="node:150003",
        opening_hours="Mo-Su 08:00-20:00",
    ),
]


def mock_places(query: str) -> list[PlaceHit]:
    q = query.strip().lower()
    hits = [
        place
        for place in PLACES
        if q in place.name.lower() or q in place.category.lower()
    ]
    return hits[:8]
