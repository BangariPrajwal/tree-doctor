// Tree Doctor - Script C: street-level sample for the tree-cooling model
var city = ee.Geometry.Rectangle([78.15, 17.10, 78.80, 17.70]);
var proj20 = ee.Projection('EPSG:32644').atScale(20);

function maskLandsatClouds(img) {
  var qa = img.select('QA_PIXEL');
  var clear = qa.bitwiseAnd(1 << 3).eq(0).and(qa.bitwiseAnd(1 << 4).eq(0));
  return img.updateMask(clear);
}
var heat = ee.ImageCollection('LANDSAT/LC09/C02/T1_L2')
  .merge(ee.ImageCollection('LANDSAT/LC08/C02/T1_L2'))
  .filterBounds(city).filterDate('2026-03-01', '2026-05-31').map(maskLandsatClouds)
  .map(function(img) {
    return img.select('ST_B10').multiply(0.00341802).add(149.0).subtract(273.15).rename('heat');
  }).median();

// Surface brightness (albedo) from Sentinel-2, same summer: dark/metal roofs = low, white roofs = high
function maskS2Clouds(img) {
  var scl = img.select('SCL');
  return img.updateMask(scl.neq(3).and(scl.neq(8)).and(scl.neq(9)).and(scl.neq(10)));
}
var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(city).filterDate('2026-03-01', '2026-05-31')
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30)).map(maskS2Clouds).median();
var albedo = s2.expression(
  '(0.356*B2 + 0.130*B4 + 0.373*B8 + 0.085*B11 + 0.072*B12) / 10000 - 0.0018',
  {B2: s2.select('B2'), B4: s2.select('B4'), B8: s2.select('B8'),
   B11: s2.select('B11'), B12: s2.select('B12')});

var landCover = ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1')
  .filterBounds(city).filterDate('2026-08-01', '2026-10-20').select('label').mode();
var trees = landCover.eq(1), water = landCover.eq(0), built = landCover.eq(6), bare = landCover.eq(7);
var hasBuildings = ee.ImageCollection('GOOGLE/Research/open-buildings-temporal/v1')
  .filterBounds(city).filterDate('2023-01-01', '2024-01-01')
  .select('building_presence').mosaic().gt(0.5);
var ghsl = ee.Image('JRC/GHSL/P2023A/GHS_BUILT_C/2018').select('built_characteristics');
var residential = ghsl.gte(11).and(ghsl.lte(15));
var anyBuilt = ghsl.gte(11);
var pop = ee.ImageCollection('WorldPop/GP/100m/pop')
  .filter(ee.Filter.eq('country', 'IND')).filter(ee.Filter.eq('year', 2020)).mosaic();

var nearBuilt20 = anyBuilt.focal_max({radius: 60, units: 'meters'}).reproject(proj20);
var pavedFar = built.or(bare).and(nearBuilt20.not()).reproject(proj20);
var bigPaved = pavedFar.selfMask().connectedPixelCount(256, true).gte(75).unmask(0).reproject(proj20);
var nearBigPaved = bigPaved.focal_max({radius: 60, units: 'meters'}).reproject(proj20);
var nearBuildings = hasBuildings.focal_mean({radius: 60, kernelType: 'circle', units: 'meters'}).gt(0.15);
var nearHomes = residential.focal_mean({radius: 50, kernelType: 'circle', units: 'meters'}).gt(0.1);
var livedIn = nearBuildings.and(nearHomes).and(pop.gt(10)).and(nearBigPaved.not());

var k = {radius: 100, kernelType: 'circle', units: 'meters'};
var features = ee.Image.cat([
  heat.rename('heat'),
  trees.focal_mean(k).rename('tree_100m'),
  hasBuildings.focal_mean(k).rename('building_100m'),
  albedo.focal_mean(k).rename('brightness_100m'),
  water.focal_mean({radius: 300, kernelType: 'circle', units: 'meters'}).rename('water_300m'),
  pop.rename('pop_100m'),
  ee.Image.pixelLonLat()
]).updateMask(livedIn);

var samples = features.sample({
  region: city, scale: 30, numPixels: 30000, seed: 42, geometries: false, tileScale: 8});
Export.table.toDrive({collection: samples, description: 'hyderabad_tree_cooling_sample_v2',
  folder: 'tree-doctor', fileFormat: 'CSV'});
