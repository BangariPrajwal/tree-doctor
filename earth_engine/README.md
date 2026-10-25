# Earth Engine code

| File | What it is |
|---|---|
| `tree_doctor_app.js` | **The live global app.** Paste into the [Earth Engine Code Editor](https://code.earthengine.google.com) and press Run, or open the published version: https://tree-doctor-512018.projects.earthengine.app/view/tree-doctor |
| `hyderabad_study/a_calculator.js` | City-wide Hyderabad study, step 1: heavy satellite processing for every 1 km square (runs as a background Task). |
| `hyderabad_study/b_results.js` | Step 2: priority score, treatment and trees needed; exports the CSV used by the dashboard (`data/hyderabad.csv`). |
| `hyderabad_study/c_street_sample.js` | Step 3: samples street-level spots (100 m surroundings) for the tree-cooling model in `analysis/`. |
