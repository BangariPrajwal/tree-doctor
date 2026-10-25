"""Street-level tree-cooling model for Tree Doctor.

Input: CSV exported by earth_engine/c_street_sample.js
Output: printed regression table. Robust (HC3) standard errors.
"""
import sys

import numpy as np
import pandas as pd
import statsmodels.formula.api as smf

path = sys.argv[1] if len(sys.argv) > 1 else "hyderabad_tree_cooling_sample_v2.csv"
s = pd.read_csv(path).drop(columns=["system:index", ".geo"], errors="ignore").dropna()
s["tree10"] = s.tree_100m * 10          # +1 = +10 percentage points of tree cover within 100 m
s["bld10"] = s.building_100m * 10       # +1 = +10 points of building cover within 100 m
s["bright_c"] = s.brightness_100m * 100 # +1 = +0.01 albedo
s["water10"] = s.water_300m * 10

model = smf.ols(
    "heat ~ tree10 + bld10 + bright_c + water10 + np.log1p(pop_100m) + latitude + longitude", s
).fit(cov_type="HC3")
print(f"n = {len(s)} spots")
print(model.summary().tables[1])
print(f"R^2 = {model.rsquared:.3f}")
