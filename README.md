# 🌳 Tree Doctor: where should a town plant trees first to beat the heat?

**Tree Doctor finds the neighbourhoods in any town on Earth that are hottest, most crowded and least green, and tells you how many trees they need.**
It runs on free satellite data, shows the past, present and 2050 future, and speaks English, Telugu and Hindi, so a city planner, an NGO volunteer or a shopkeeper with a phone can all use it.

### ▶️ Live app (free, no login): https://tree-doctor-512018.projects.earthengine.app/view/tree-doctor

Tap **Hyderabad**, **Delhi**, **London** or **New York**, press **📍 Use my location**, or click anywhere on the map. Results take about a minute.

---

## What it tells you

For a 14 × 14 km area around the place you choose, Tree Doctor splits the town into 500 m neighbourhood squares and ranks them. It then groups the most urgent ones into **zones A–E** (each about one neighbourhood, up to 3 km²) and, for each zone, says in plain words:

> 👉 *This area is hot (roofs and roads reach 45°C on the hottest days) and has few trees, so it needs about 14,950 more trees.*

| Shown for every zone | How |
|---|---|
| How hot roofs and roads get on the hottest days | Landsat 8/9 surface temperature, 90th percentile of the last 2 years |
| Tree cover today, including small garden and street trees | Meta/WRI 1 m canopy-height map, minus trees cut since (Dynamic World) |
| Trees cut since 5 years ago (only near homes) | Dynamic World land cover: trees → buildings, roads or bare ground |
| People living there | WorldPop 100 m |
| Trees needed to reach 30% canopy (3-30-300 rule) | Canopy gap × area ÷ 50 m² per grown tree |
| What to do | Plant in open plots, or (in the most packed 25%) street trees + cool white roofs |
| **Past → now → 2050** | ERA5 weather records since 1990 + NASA NEX-GDDP-CMIP6 climate models (5 models, SSP2-4.5 and SSP5-8.5) |
| Cooling from planting | 0.33°C per +10% tree cover across the area (measured, see below), and 10–20°C cooler ground under the shade (US EPA) |

Other features: **one-tap example cities**, **use my location**, **shareable result links** (the link opens the same place and language), **a downloadable table** of every neighbourhood with Google Maps links for councils and NGOs, a **🔊 Listen** button that reads results aloud, and a phone layout.

## How a neighbourhood is ranked

```
priority = (heat above the local average) × (people ÷ most crowded square) × (1 − tree cover)
```

Hot **and** crowded **and** treeless ranks first. A hot empty field or a hot but leafy suburb does not.

## The science: does planting trees actually cool a street?

I measured it in Hyderabad. 2,451 street-level spots were sampled, and their surface temperature was regressed on tree cover within 100 m, controlling for buildings, surface brightness (albedo), nearby water and location (OLS with HC3 robust standard errors, `analysis/tree_cooling_model.py`).

| Result | Value |
|---|---|
| **Cooling per +10% tree cover** | **0.33°C** (95% CI 0.09–0.57, p = 0.008) |
| Brighter (more reflective) surfaces | significantly cooler (p = 0.006), which supports cool roofs where there is no room to plant |
| More buildings | +0.08°C per +10% |

## Validation: what checking against reality changed

Every version was checked against satellite imagery, Google Maps and local knowledge, and fixed when it was wrong:

1. **The airport mistake.** Version 1 ranked Begumpet Airport's runway as Hyderabad's top priority. Runways and big paved yards are now detected (large connected paved patches far from buildings) and excluded.
2. **Factories are not homes.** Industrial estates (Jeedimetla, Pashamylaram) ranked highly. Squares that are mostly non-residential buildings (EU GHSL) are now removed.
3. **A fix that made things worse.** One filter removed real Old City neighbourhoods. It was reverted and rebuilt at a consistent scale.
4. **Roads are not space for trees.** Open-space estimates now exclude roads.
5. **"Trees don't cool."** A coarse 1 km model showed only 0.1°C. Measuring street by street gave a clear 0.33°C per 10%.
6. **Small trees were invisible.** Ground-truthing in Guildford (UK) showed a zone marked "1% trees" actually had many small trees. Switching to a 1 m canopy map raised it to a realistic 10%.
7. **A lake shown as "trees cut".** Seasonal water and crop changes were wrongly counted as felling. Only trees → buildings/roads/bare ground now counts, and only near homes.
8. **A heatwave mistaken for a trend.** Comparing 2014–16 with the 2025 summer showed a fake +10°C rise in Guildford. The past is now estimated from 36 years of ERA5 weather records instead of one summer's satellite pictures.
9. **Zones too big to act on.** Hyderabad's Zone A covered 19 km² and 4 lakh people. Zones are now split into neighbourhood-sized pieces (≤ 3 km²).

Places checked on the ground or on imagery: **Hyderabad, Mahabubnagar (India), Guildford (UK)**, plus spot checks in Delhi, London and Dubai.

## Limitations (honest list)

- Satellites measure **surface** temperature (roofs, roads), not the air temperature people feel.
- The cooling estimate comes from one city (Hyderabad) and shows **association, not proven cause**. The model explains about 11% of street-level heat differences.
- Population (2020), building type (2018) and the 1 m canopy map (mostly 2018–2020) are a few years old. Very young saplings may be missed.
- 2050 values are estimates. They assume surface heat rises as fast as daily maximum air temperature, and (for "if nothing is done") that trees keep being cut at the recent rate.
- Zones are ranked **within each 14 km area**, not across a whole country.
- This is a planning guide: every site still needs checking on the ground.

## Repository

| Path | What |
|---|---|
| `earth_engine/tree_doctor_app.js` | The live global app (Google Earth Engine, JavaScript) |
| `earth_engine/hyderabad_study/` | City-wide Hyderabad study: processing, scoring and street sample scripts |
| `analysis/tree_cooling_model.py` | Street-level regression (statsmodels, robust standard errors) |
| `data/` | Hyderabad results table and model summary |
| `app.py` | Streamlit + pydeck dashboard of the city-wide Hyderabad study |

Run the Hyderabad dashboard locally:

```bash
pip install -r requirements.txt
streamlit run app.py
```

## Data sources

Landsat 8/9 Collection 2 (USGS/NASA) · ERA5-Land (ECMWF/Copernicus) · NASA NEX-GDDP-CMIP6 · Dynamic World (Google/WRI) · Meta & WRI 1 m Global Canopy Height · JRC GHSL built characteristics · WorldPop · FAO GAUL boundaries · Sentinel-2 (ESA). All processed in Google Earth Engine.

---

Built by **Bangari Prajwal**, MSc Data Science, University of Surrey · [LinkedIn](https://www.linkedin.com/in/prajwal-bangari-800434118) · MIT License
