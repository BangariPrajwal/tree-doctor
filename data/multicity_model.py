"""Multi-city tree-cooling model for Tree Doctor.

Input: the multicity_<City>.csv files exported by earth_engine/e_multicity_sample.js
Output: per-city cooling per +10% tree canopy (standard errors clustered in ~1 km blocks,
because nearby streets are not independent), a pooled model with
city fixed effects, and a test of whether cooling depends on climate (heat and rainfall).

Usage: python multicity_model.py path/to/folder_with_csvs
"""
import glob
import os
import sys

import numpy as np
import pandas as pd
import statsmodels.formula.api as smf

folder = sys.argv[1] if len(sys.argv) > 1 else "."
TREE = sys.argv[2] if len(sys.argv) > 2 else "canopy_100m"   # which tree measure to use
files = sorted(f for f in glob.glob(os.path.join(folder, "multicity*_*.csv")) if "results" not in f)
if not files:
    sys.exit("No multicity_*.csv files found in " + folder)

df = pd.concat([pd.read_csv(f) for f in files], ignore_index=True)
df = df.drop(columns=["system:index", ".geo"], errors="ignore").dropna(subset=["heat", TREE])
df["tree10"] = df[TREE] * 10
df["bld10"] = df.building_100m * 10
df["bright_c"] = df.brightness_100m * 100
df["water10"] = df.water_300m * 10
df["logpop"] = np.log1p(df.pop_100m)
# ~1 km spatial blocks: nearby spots share conditions, so errors are clustered by block
df["block"] = (np.floor(df.latitude / 0.01).astype(int).astype(str) + "_" +
               np.floor(df.longitude / 0.01).astype(int).astype(str))

controls = "bld10 + bright_c + water10 + logpop + latitude + longitude"
rows = []
for city, d in df.groupby("city"):
    if len(d) < 200:
        print(f"{city}: only {len(d)} spots, skipped")
        continue
    m = smf.ols(f"heat ~ tree10 + {controls}", d).fit(
        cov_type="cluster", cov_kwds={"groups": pd.factorize(d.block)[0]})
    lo, hi = m.conf_int().loc["tree10"]
    rows.append({
        "city": city, "n": len(d),
        "cooling_per_10pct_C": round(-m.params["tree10"], 3),
        "ci_low": round(-hi, 3), "ci_high": round(-lo, 3),
        "p_value": float(f'{m.pvalues["tree10"]:.2g}'), "r2": round(m.rsquared, 3),
        "tree_cover_mean_pct": round(d[TREE].mean() * 100, 1),
        "clim_tmax_C": round(d.clim_tmax_C.iloc[0], 1),
        "clim_rain_mm": round(d.clim_rain_mm.iloc[0]),
    })
res = pd.DataFrame(rows).sort_values("cooling_per_10pct_C", ascending=False)
print("\nCooling per +10% tree cover, by city (positive = cooler):")
print(res.to_string(index=False))
res.to_csv(os.path.join(folder, "multicity_results.csv"), index=False)
print(f"Median across cities: {res.cooling_per_10pct_C.median():.2f}°C per +10% tree canopy")

# Pooled model: does the cooling effect change with climate?
# (city fixed effects absorb each city's overall temperature; the interactions test whether
#  trees cool more in hotter or drier cities)
df["tmax_c"] = df.clim_tmax_C - df.clim_tmax_C.mean()
df["rain_c"] = (df.clim_rain_mm - df.clim_rain_mm.mean()) / 1000
pooled = smf.ols(
    "heat ~ tree10 + tree10:tmax_c + tree10:rain_c + bld10 + bright_c + water10 + logpop + C(city)",
    df,
).fit(cov_type="cluster", cov_kwds={"groups": pd.factorize(df.city)[0]})
print("\nPooled model with city fixed effects (errors clustered by city):")
print(pooled.params.filter(like="tree10").to_string())
print(f"n = {len(df)} spots in {df.city.nunique()} cities, R^2 = {pooled.rsquared:.3f}")
