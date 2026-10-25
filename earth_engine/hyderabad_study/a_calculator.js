// Tree Doctor - Script A: CALCULATOR (heavy work, runs once as a background Task)
var city = ee.Geometry.Rectangle([78.15, 17.10, 78.80, 17.70]);
var cityName = 'Hyderabad';
var centreLon = 78.4747, centreLat = 17.3616;   // Charminar = city centre
var proj20 = ee.Projection('EPSG:32644').atScale(20);

// 1. HEAT: Landsat 8/9 surface temperature, summer 2026
function maskLandsatClouds(img) {
  var qa = img.select('QA_PIXEL');
  var clear = qa.bitwiseAnd(1 << 3).eq(0).and(qa.bitwiseAnd(1 << 4).eq(0));
  return img.updateMask(clear);
}
var landsat = ee.ImageCollection('LANDSAT/LC09/C02/T1_L2')
  .merge(ee.ImageCollection('LANDSAT/LC08/C02/T1_L2'))
  .filterBounds(city).filterDate('2026-03-01', '2026-05-31').map(maskLandsatClouds);
var heat = landsat.map(function(img) {
  return img.select('ST_B10').multiply(0.00341802).add(149.0).subtract(273.15).rename('heat');
}).median().clip(city);

// 2. LAND COVER: live (Dynamic World)
var landCover = ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1')
  .filterBounds(city).filterDate('2026-08-01', '2026-10-20').select('label').mode().clip(city);
var trees = landCover.eq(1).rename('trees');
var built = landCover.eq(6).rename('built');
var water = landCover.eq(0).rename('water');
var bare = landCover.eq(7);

// 3. PEOPLE: WorldPop 2020
var pop = ee.ImageCollection('WorldPop/GP/100m/pop')
  .filter(ee.Filter.eq('country', 'IND')).filter(ee.Filter.eq('year', 2020)).mosaic().rename('pop');

// 4. BUILDINGS: Google Open Buildings 2023
var hasBuildings = ee.ImageCollection('GOOGLE/Research/open-buildings-temporal/v1')
  .filterBounds(city).filterDate('2023-01-01', '2024-01-01')
  .select('building_presence').mosaic().gt(0.5);

// 5. HOMES vs FACTORIES (GHSL 2018, 10 m)
var ghsl = ee.Image('JRC/GHSL/P2023A/GHS_BUILT_C/2018').select('built_characteristics');
var residential = ghsl.gte(11).and(ghsl.lte(15));
var nonResidential = ghsl.gte(21).and(ghsl.lte(25));
var anyBuilt = ghsl.gte(11);
var roads = ghsl.eq(5);

// 6. RUNWAYS / BIG PAVED YARDS: paved/bare land >60 m from buildings, in patches of 3 ha or more
var nearBuilt20 = anyBuilt.focal_max({radius: 60, units: 'meters'}).reproject(proj20);
var pavedFar = built.or(bare).and(nearBuilt20.not()).reproject(proj20);
var bigPaved = pavedFar.selfMask().connectedPixelCount(256, true).gte(75).unmask(0).reproject(proj20);
var nearBigPaved = bigPaved.focal_max({radius: 60, units: 'meters'}).reproject(proj20);

// 7. WHERE PEOPLE LIVE
var nearBuildings = hasBuildings.focal_mean({radius: 60, kernelType: 'circle', units: 'meters'}).gt(0.15);
var nearHomes = residential.focal_mean({radius: 50, kernelType: 'circle', units: 'meters'}).gt(0.1);
var livedIn = nearBuildings.and(nearHomes).and(pop.gt(10)).and(nearBigPaved.not());
var neighbourhoodHeat = heat.updateMask(livedIn).rename('heat');
var openSpace = hasBuildings.not().and(roads.not()).updateMask(livedIn).rename('open_space');

// 8. 1 km SQUARES
var grid = city.coveringGrid(ee.Projection('EPSG:32644'), 1000);
var cells = ee.Image.cat([neighbourhoodHeat, trees, built, water]).reduceRegions({
  collection: grid, reducer: ee.Reducer.mean(), scale: 30});
cells = ee.Image.cat([residential.rename('res'), nonResidential.rename('nonres')]).reduceRegions({
  collection: cells, reducer: ee.Reducer.mean(), scale: 10});
cells = bigPaved.rename('big_paved').reduceRegions({
  collection: cells, reducer: ee.Reducer.mean().setOutputs(['big_paved']), scale: 20});
cells = openSpace.reduceRegions({
  collection: cells, reducer: ee.Reducer.mean().setOutputs(['open_space']), scale: 10});
cells = pop.reduceRegions({
  collection: cells, reducer: ee.Reducer.sum().setOutputs(['pop']), scale: 100});

// 9. CITY SQUARES + LAND USE + ZONE + LOCATION
var squares = cells
  .filter(ee.Filter.notNull(['heat', 'open_space', 'res', 'nonres', 'big_paved']))
  .filter(ee.Filter.gt('built', 0.3)).filter(ee.Filter.lt('water', 0.5))
  .map(function(f) {
    var res = ee.Number(f.get('res')), nonres = ee.Number(f.get('nonres'));
    var resShare = res.divide(res.add(nonres).max(0.000001));
    var c = f.geometry().transform('EPSG:4326', 1).centroid(1).coordinates();
    var lon = ee.Number(c.get(0)), lat = ee.Number(c.get(1));
    var dxKm = lon.subtract(centreLon).multiply(106);
    var dyKm = lat.subtract(centreLat).multiply(111);
    var distKm = dxKm.pow(2).add(dyKm.pow(2)).sqrt();
    var angle = dxKm.atan2(dyKm).multiply(180 / Math.PI);   // 0 = east, 90 = north
    var zone = ee.Algorithms.If(distKm.lt(5), 'Centre',
      ee.Algorithms.If(angle.gte(45).and(angle.lt(135)), 'North',
      ee.Algorithms.If(angle.gte(-45).and(angle.lt(45)), 'East',
      ee.Algorithms.If(angle.gte(-135).and(angle.lt(-45)), 'South', 'West'))));
    return f.set({
      city: cityName, res_share: resShare,
      land_use: ee.Algorithms.If(resShare.lt(0.6), 'Mostly factories/offices', 'Homes'),
      zone: zone,
      lat: lat.multiply(10000).round().divide(10000),
      lon: lon.multiply(10000).round().divide(10000)
    }).select(['city', 'heat', 'trees', 'built', 'open_space', 'res_share', 'big_paved',
               'pop', 'land_use', 'zone', 'lat', 'lon']);
  });

// 10. SAVE (Tasks tab)
Export.table.toAsset({collection: squares, description: 'hyderabad_squares_to_asset',
  assetId: 'projects/tree-doctor-512018/assets/hyderabad_squares'});
Export.table.toDrive({collection: squares, description: 'hyderabad_squares_to_drive',
  folder: 'tree-doctor', fileFormat: 'CSV'});
