"""
Tree Doctor - where would new trees protect the most people from urban heat?

Results are pre-computed with Google Earth Engine (see earth_engine/ scripts)
and loaded here from CSV, so the app needs no Earth Engine login.
"""
import json
from pathlib import Path

import pandas as pd
import pydeck as pdk
import streamlit as st

DATA_DIR = Path(__file__).parent / "data"
ZONES = ["Centre", "North", "East", "South", "West"]


@st.cache_data
def load(city: str):
    df = pd.read_csv(DATA_DIR / f"{city.lower()}.csv")
    model = json.loads((DATA_DIR / f"{city.lower()}_model.json").read_text())
    return df, model


def priority_colour(p: float) -> list[int]:
    """Pale yellow (low) -> dark red (high)."""
    stops = [(0, (255, 255, 204)), (25, (254, 217, 118)), (50, (253, 141, 60)),
             (75, (227, 26, 28)), (100, (128, 0, 38))]
    for (p0, c0), (p1, c1) in zip(stops, stops[1:]):
        if p <= p1:
            t = (p - p0) / (p1 - p0)
            return [int(a + (b - a) * t) for a, b in zip(c0, c1)] + [190]
    return list(stops[-1][1]) + [190]


st.set_page_config(page_title="Tree Doctor", page_icon="🌳", layout="wide")
st.title("🌳 Tree Doctor")
st.caption("Satellite data shows where new trees would protect the most people from extreme heat.")

city = st.selectbox("City", ["Hyderabad"], help="More cities coming: the same pipeline runs anywhere on Earth.")
df, model = load(city)

# ---------------------------------------------------------------- headline numbers
top = df[df.priority >= 50]
c1, c2, c3, c4 = st.columns(4)
c1.metric("Residential 1 km squares analysed", f"{len(df):,}")
c2.metric("Squares with under 5% tree cover", f"{(df.tree_cover_pct < 5).mean():.0%}")
c3.metric("People in high-priority squares", f"{top.people.sum():,.0f}")
c4.metric("Trees needed there (to reach 30%)", f"{top.trees_needed_for_30pct.sum():,.0f}")

st.info(
    f"**Finding:** in {city}, every +10% tree cover around a street goes with about "
    f"**{abs(model['slope_per_10pct']):.2f}°C cooler** summer surfaces "
    f"(95% range {abs(model['ci_high']):.2f}–{abs(model['ci_low']):.2f}°C, p = {model['p_value']}), "
    "after accounting for building density, roof brightness, water and location."
)

map_tab, list_tab, method_tab = st.tabs(["🗺️ Priority map", "📋 Where to plant first", "🔬 How it works"])

# ---------------------------------------------------------------- map
with map_tab:
    st.caption("Each square is 1 km². Darker = hotter, more crowded and fewer trees. Hover for details.")
    view = df.copy()
    view["colour"] = view.priority.apply(priority_colour)
    view["people_txt"] = view.people.map("{:,.0f}".format)
    layer = pdk.Layer(
        "GridCellLayer", data=view, get_position=["lon", "lat"], cell_size=950,
        get_fill_color="colour", extruded=False, pickable=True,
    )
    tooltip = {"html": "<b>Priority {priority}</b> · {zone}<br/>Summer surface {heat_C}°C<br/>"
                       "Tree cover {tree_cover_pct}%<br/>People ~{people_txt}<br/>{treatment}"}
    st.pydeck_chart(pdk.Deck(
        layers=[layer], tooltip=tooltip, map_style="light",
        initial_view_state=pdk.ViewState(latitude=df.lat.mean(), longitude=df.lon.mean(), zoom=9.6),
    ))

# ---------------------------------------------------------------- list
with list_tab:
    zone = st.radio("Part of the city", ["All"] + ZONES, horizontal=True)
    n = st.slider("How many neighbourhoods", 3, 30, 10)
    subset = df if zone == "All" else df[df.zone == zone]
    show = subset.sort_values("priority", ascending=False).head(n).copy()
    show["Google Maps"] = "https://www.google.com/maps?q=" + show.lat.astype(str) + "," + show.lon.astype(str)
    st.dataframe(
        show[["priority", "zone", "heat_C", "tree_cover_pct", "people", "treatment",
              "trees_needed_for_30pct", "est_cooling_C", "note", "Google Maps"]],
        hide_index=True, width="stretch",
        column_config={
            "priority": st.column_config.ProgressColumn("Priority", min_value=0, max_value=100, format="%d"),
            "heat_C": st.column_config.NumberColumn("Summer surface °C", format="%.1f"),
            "tree_cover_pct": st.column_config.NumberColumn("Tree cover %", format="%.1f"),
            "people": st.column_config.NumberColumn("People (est.)", format="%,d"),
            "treatment": "Recommended treatment",
            "trees_needed_for_30pct": st.column_config.NumberColumn("Trees to reach 30%", format="%,d"),
            "est_cooling_C": st.column_config.NumberColumn("Est. cooling °C", format="%.1f"),
            "note": "Note",
            "Google Maps": st.column_config.LinkColumn("Check on map", display_text="Open"),
        },
    )
    st.download_button("Download all results (CSV)", df.to_csv(index=False), f"tree_doctor_{city.lower()}.csv")

# ---------------------------------------------------------------- method
with method_tab:
    st.markdown(f"""
**Priority score** for every residential 1 km square:
`how much hotter than the city average × how many people live there × how few trees there are`

**Data (all free, global):**
- Summer surface temperature: {model['heat_period']}
- Live tree and land cover: {model['landcover_period']}
- Buildings: Google Open Buildings 2023 · Homes vs factories: EU GHSL 2018 · People: WorldPop 2020

**Checks that changed the method:**
1. The first version ranked **Begumpet Airport's runway** first. Heat next to runways and big paved yards is now ignored.
2. **Industrial estates** (e.g. Jeedimetla, Pashamylaram) ranked high. Squares that are mostly factories or offices are now removed.
3. Roads were counted as "space for trees". They are now excluded, and the most tightly packed 25% of neighbourhoods get *street trees + cool roofs* instead.
4. A 1 km model showed almost no cooling from trees. Re-measured street by street ({model['n_spots']:,} spots, 100 m around each), the effect is clear.

**Estimated cooling** = (30% − current tree cover) × {abs(model['slope_per_10pct'])}°C per 10%.
Trees needed assumes about 50 m² of canopy per grown tree.

**Limitations:** surface temperature is not air temperature; thin street trees are often invisible to
satellites, so the real benefit is probably larger; the model explains about {model['r2']:.0%} of
heat differences and shows association, not proof; population and land-use maps are a few years old.
Priority areas are a planning guide: every site needs checking on the ground.
""")

st.caption("Built by Bangari Prajwal · Code: github.com/BangariPrajwal/tree-doctor")
