// Tree Doctor – Script E v2: MULTI-CITY street sample for the tree-cooling model
// v2: tree cover is now measured with the 1 m Meta/WRI canopy map (sees street & garden trees),
//     plus the Dynamic World tree likelihood, instead of the coarse 10 m 'tree' label.
// Same street-level measurements in 8 cities with very different climates, so we can test
// whether "how much trees cool a street" changes with climate.
// HOW TO RUN: paste into a NEW script, press Run, then open the Tasks tab and press RUN on each
// of the 8 tasks (one per city). Each saves a CSV to Google Drive, folder "tree-doctor".

// [name, latitude, longitude] of a dense, lived-in part of each city, and its climate type
var CITIES = [
  ['Hyderabad', 17.3616, 78.4747],   // hot semi-arid (India)
  ['Delhi',     28.6500, 77.2200],   // hot semi-arid / monsoon (India)
  ['Mumbai',    19.0600, 72.8600],   // tropical wet-dry, humid (India)
  ['Dubai',     25.2700, 55.3100],   // hot desert (UAE)
  ['Singapore',  1.3500, 103.8500],  // tropical rainforest, humid
  ['Nairobi',   -1.2800, 36.8200],   // subtropical highland (Kenya)
  ['London',    51.5150, -0.0500],   // temperate oceanic (UK)
  ['NewYork',   40.7300, -73.9300]   // humid continental (USA)
];
var SIZE_KM = 14;          // same area size as the app
var POINTS = 20000;        // pixels tried per city (many are dropped because nobody lives there)

var now = ee.Date(Date.now());
var start = now.advance(-2, 'year');

CITIES.forEach(function(c) {
  var name = c[0], lat = c[1], lon = c[2];
  var pt = ee.Geometry.Point([lon, lat]);
  var area = pt.buffer(SIZE_KM * 500).bounds();
  var utm = 'EPSG:' + ((lat >= 0 ? 32600 : 32700) + Math.floor((lon + 180) / 6) + 1);
  var proj20 = ee.Projection(utm).atScale(20);

  // 1. HEAT: hottest 10% of clear Landsat 8/9 views in the last 2 years (same as the app)
  var heat = ee.ImageCollection('LANDSAT/LC09/C02/T1_L2')
    .merge(ee.ImageCollection('LANDSAT/LC08/C02/T1_L2'))
    .filterBounds(area).filterDate(start, now)
    .filter(ee.Filter.lt('CLOUD_COVER', 60))
    .map(function(img) {
      var qa = img.select('QA_PIXEL');
      var clear = qa.bitwiseAnd(1 << 3).eq(0).and(qa.bitwiseAnd(1 << 4).eq(0));
      return img.select('ST_B10').multiply(0.00341802).add(149.0).subtract(273.15)
        .rename('heat').updateMask(clear);
    })
    .reduce(ee.Reducer.percentile([90])).rename('heat');

  // 2. SURFACE BRIGHTNESS (albedo) from Sentinel-2
  var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(area).filterDate(now.advance(-1, 'year'), now)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30))
    .map(function(img) {
      var scl = img.select('SCL');
      return img.updateMask(scl.neq(3).and(scl.neq(8)).and(scl.neq(9)).and(scl.neq(10)));
    }).median();
  var albedo = s2.expression(
    '(0.356*B2 + 0.130*B4 + 0.373*B8 + 0.085*B11 + 0.072*B12) / 10000 - 0.0018',
    {B2: s2.select('B2'), B4: s2.select('B4'), B8: s2.select('B8'),
     B11: s2.select('B11'), B12: s2.select('B12')});

  // 3. LAND COVER (Dynamic World, last 12 months): trees, water, built, bare
  var lc = ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1').filterBounds(area)
    .filterDate(now.advance(-1, 'year'), now).select('label').mode();
  var trees = lc.eq(1), water = lc.eq(0), built = lc.eq(6), bare = lc.eq(7);
  var treeProb = ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1').filterBounds(area)
    .filterDate(now.advance(-1, 'year'), now).select('trees').mean();

  // 3b. TREE CANOPY from the 1 m Meta/WRI canopy-height map (tree = 3 m or taller),
  //     averaged to a 10 m grid so it can be summarised over 100 m around each spot
  var canopyTiles = ee.ImageCollection('projects/sat-io/open-datasets/facebook/meta-canopy-height')
    .filterBounds(area);
  var canopy1m = canopyTiles.mosaic().select(0)
    .setDefaultProjection(ee.Image(canopyTiles.first()).select(0).projection()).gte(3);
  var canopy10 = canopy1m.reduceResolution({reducer: ee.Reducer.mean(), maxPixels: 1024})
    .reproject(ee.Projection(utm).atScale(10));

  // 4. BUILDINGS: homes vs factories (GHSL, global) and PEOPLE (WorldPop, global)
  var ghsl = ee.Image('JRC/GHSL/P2023A/GHS_BUILT_C/2018').select('built_characteristics');
  var residential = ghsl.gte(11).and(ghsl.lte(15));
  var anyBuilt = ghsl.gte(11);
  var pop = ee.ImageCollection('WorldPop/GP/100m/pop').filterBounds(area)
    .filter(ee.Filter.eq('year', 2020)).mosaic();

  // 5. Ignore runways / big paved yards; keep only where people live (same rules as the app)
  var nearBuilt20 = anyBuilt.focal_max({radius: 60, units: 'meters'}).reproject(proj20);
  var pavedFar = built.or(bare).and(nearBuilt20.not()).reproject(proj20);
  var bigPaved = pavedFar.selfMask().connectedPixelCount(256, true).gte(75).unmask(0).reproject(proj20);
  var nearBigPaved = bigPaved.focal_max({radius: 60, units: 'meters'}).reproject(proj20);
  var nearBuildings = anyBuilt.focal_mean({radius: 60, kernelType: 'circle', units: 'meters'}).gt(0.15);
  var nearHomes = residential.focal_mean({radius: 50, kernelType: 'circle', units: 'meters'}).gt(0.1);
  var livedIn = nearBuildings.and(nearHomes).and(pop.gt(5)).and(nearBigPaved.not());

  // 6. What surrounds each spot (100 m), exactly as in the Hyderabad study
  var k = {radius: 100, kernelType: 'circle', units: 'meters'};
  var features = ee.Image.cat([
    heat,
    canopy10.focal_mean(k).rename('canopy_100m'),
    treeProb.focal_mean(k).rename('treeprob_100m'),
    trees.focal_mean(k).rename('tree_100m'),
    anyBuilt.focal_mean(k).rename('building_100m'),
    albedo.focal_mean(k).rename('brightness_100m'),
    water.focal_mean({radius: 300, kernelType: 'circle', units: 'meters'}).rename('water_300m'),
    pop.rename('pop_100m'),
    ee.Image.pixelLonLat()
  ]).updateMask(livedIn);

  // 7. City climate (ERA5-Land 1991–2020): average daily high (°C) and yearly rainfall (mm)
  var era = ee.ImageCollection('ECMWF/ERA5_LAND/MONTHLY_AGGR').filterDate('1991-01-01', '2021-01-01');
  var climate = ee.Image.cat([
    era.select('temperature_2m_max').mean().subtract(273.15).rename('clim_tmax_C'),
    era.select('total_precipitation_sum').mean().multiply(12 * 1000).rename('clim_rain_mm')
  ]).reduceRegion({reducer: ee.Reducer.mean(), geometry: pt, scale: 11132});

  var samples = features.sample({region: area, scale: 30, numPixels: POINTS, seed: 42,
      geometries: false, tileScale: 8})
    .map(function(f) {
      return f.set({city: name, clim_tmax_C: climate.get('clim_tmax_C'),
                    clim_rain_mm: climate.get('clim_rain_mm')});
    });

  Export.table.toDrive({collection: samples, description: 'multicity2_' + name,
    folder: 'tree-doctor', fileFormat: 'CSV'});
});

print('Ready: open the Tasks tab (top right) and press RUN on each of the 8 tasks.');
