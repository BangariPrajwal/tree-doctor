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
| **Trees that actually fit** | 30% of open ground (not roofs or roads) at 50 m² per tree, plus one street tree every 10 m along half of the road edges |
| **A realistic plan** | 🌳 plant trees (most fit) · 🌳+⬜ plant what fits + cool white roofs · ⬜ cool roofs, terrace gardens, planters and tree pits (packed areas) |
| **Past → now → 2050** | ERA5 weather records since 1990 + NASA NEX-GDDP-CMIP6 climate models (5 models, SSP2-4.5 and SSP5-8.5) |
| Cooling from planting | 0.47–1.27°C per +10% tree canopy, using the rate measured in the nearest of 8 study cities (or the 8-city median, 0.85°C, elsewhere), plus 10–20°C cooler ground under the shade (US EPA) |

Other features: **one-tap example cities**, **use my location**, **shareable result links** (the link opens the same place and language), **a downloadable table** of every neighbourhood with Google Maps links for councils and NGOs, a **🔊 Listen** button that reads results aloud, and a phone layout.

## How a neighbourhood is ranked

```
priority = (heat above the local average) × (people ÷ most crowded square) × (1 − tree cover)
```

Hot **and** crowded **and** treeless ranks first. A hot empty field or a hot but leafy suburb does not.

## The science: how much do trees cool a street, and does it depend on the city?

I measured it on **93,282 lived-in street locations in 8 cities with very different climates**. For each spot, the surface temperature on the hottest days was regressed on the share of tree canopy within 100 m (1 m Meta/WRI canopy map), controlling for building cover, surface brightness (albedo), nearby water, population and location. Standard errors are clustered in ~1 km blocks, because neighbouring streets are not independent (`analysis/multicity_model.py`, results in `data/multicity_results.csv`).

| City | Climate | Streets | °C cooler per +10% tree canopy (95% CI) |
|---|---|---|---|
| Nairobi | mild highland | 11,637 | **1.27** (1.16–1.38) |
| Mumbai | tropical, humid | 10,420 | **1.17** (1.08–1.27) |
| Dubai | hot desert | 7,038 | **1.15** (0.86–1.43) |
| London | temperate oceanic | 14,586 | **0.88** (0.81–0.96) |
| New York | humid continental | 11,249 | **0.82** (0.74–0.91) |
| Delhi | hot semi-arid | 13,341 | **0.62** (0.55–0.68) |
| Singapore | tropical rainforest | 9,404 | **0.61** (0.46–0.76) |
| Hyderabad | hot semi-arid | 15,607 | **0.47** (0.40–0.54) |

**Findings**

- Trees cooled streets in **every** city (all p < 10⁻¹⁴). Median: **0.85°C cooler per +10% tree canopy**.
- The effect differs **up to 2.7×** between cities, so one city's number should not be applied everywhere. The app uses the nearest study city's own rate (within 150 km), and the 8-city median elsewhere.
- The differences do not follow a simple "hotter city = more cooling" rule. The two semi-arid Indian cities show the smallest effect, possibly because dry-season trees transpire less and dust lowers the contrast. With only 8 cities, this is a lead for future work, not a conclusion.

**How the study improved.** The first version measured trees in Hyderabad with a 10 m "tree / not tree" label and found 0.33°C per +10%. Repeating it in 8 cities exposed the problem: that label marked London and New York streets as almost treeless (5% and 1.6% of spots with any tree), because thin street trees rarely fill a 10 m pixel. Re-measuring with the 1 m canopy map gave realistic tree cover (London 12%, Mumbai 24%, Dubai 2.5%) and the results above. The original Hyderabad-only scripts are kept in `earth_engine/hyderabad_study/` for transparency.

## Validation: what checking against reality changed

Every version was checked against satellite imagery, Google Maps and local knowledge, and fixed when it was wrong:

1. **The airport mistake.** Version 1 ranked Begumpet Airport's runway as Hyderabad's top priority. Runways and big paved yards are now detected (large connected paved patches far from buildings) and excluded.
2. **Factories are not homes.** Industrial estates (Jeedimetla, Pashamylaram) ranked highly. Squares that are mostly non-residential buildings (EU GHSL) are now removed.
3. **A fix that made things worse.** One filter removed real Old City neighbourhoods. It was reverted and rebuilt at a consistent scale.
4. **Roads are not space for trees.** Open-space estimates now exclude roads.
5. **"Trees don't cool."** A coarse 1 km model showed only 0.1°C. Measuring street by street gave a clear effect (0.33°C per 10% at first, later refined by the 8-city study above).
6. **Small trees were invisible.** Ground-truthing in Guildford (UK) showed a zone marked "1% trees" actually had many small trees. Switching to a 1 m canopy map raised it to a realistic 10%.
7. **A lake shown as "trees cut".** Seasonal water and crop changes were wrongly counted as felling. Only trees → buildings/roads/bare ground now counts, and only near homes.
8. **A heatwave mistaken for a trend.** Comparing 2014–16 with the 2025 summer showed a fake +10°C rise in Guildford. The past is now estimated from 36 years of ERA5 weather records instead of one summer's satellite pictures.
9. **Zones too big to act on.** Hyderabad's Zone A covered 19 km² and 4 lakh people. Zones are now split into neighbourhood-sized pieces (≤ 3 km²).
10. **One city is not the world.** The cooling rate was first measured only in Hyderabad. An 8-city study showed it varies 2.7× between cities and that the original tree measure missed street trees; both were fixed (see above).
11. **Advice that could not be followed.** In packed concrete colonies there is no room for thousands of trees, so "plant 15,000 trees" was not a usable plan. Each zone now shows how many trees physically fit and recommends cool roofs, terrace gardens and planters for the rest; cooling and 2050 estimates only count trees that fit (Hyderabad's Zone A: 14,950 needed, room for about 4,050).

Places checked on the ground or on imagery: **Hyderabad, Mahabubnagar (India), Guildford (UK)**, plus spot checks in Delhi, London and Dubai. Cooling measured in 8 cities on 4 continents.

## Limitations (honest list)

- Satellites measure **surface** temperature (roofs, roads), not the air temperature people feel.
- The cooling rates show **association, not proven cause**: greener streets may differ in other ways the controls miss. They come from 8 cities; places far from all of them use the 8-city median.
- Population (2020), building type (2018) and the 1 m canopy map (mostly 2018–2020) are a few years old. Very young saplings may be missed.
- 2050 values are estimates. They assume surface heat rises as fast as daily maximum air temperature, and (for "if nothing is done") that trees keep being cut at the recent rate.
- Zones are ranked **within each 14 km area**, not across a whole country.
- "Trees that fit" is a cautious estimate of **physical** space: satellites cannot tell public land from private yards, so it shows what is possible, not what is permitted.
- This is a planning guide: every site still needs checking on the ground.

## Repository

| Path | What |
|---|---|
| `earth_engine/tree_doctor_app.js` | The live global app (Google Earth Engine, JavaScript) |
| `earth_engine/hyderabad_study/` | City-wide Hyderabad study: processing, scoring and street sample scripts |
| `earth_engine/multicity_sample.js` | 8-city street sample for the cooling study |
| `analysis/multicity_model.py` | 8-city cooling model (statsmodels, spatially clustered errors) |
| `data/multicity_results.csv` | Cooling per +10% tree canopy for each city |
| `analysis/tree_cooling_model.py` | Original Hyderabad-only model (first version) |
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
