// Tree Doctor - Script B: RESULTS (reads the saved table from Script A, runs in seconds)
var TARGET_TREE_COVER = 0.30;   // 3-30-300 rule
var CANOPY_PER_TREE_M2 = 50;    // shade area of one grown tree (assumption)
var COOLING_PER_10PCT = 0.33;   // °C, from the street-level model (analysis/tree_cooling_model.py)

var squares = ee.FeatureCollection('projects/tree-doctor-512018/assets/hyderabad_squares');
var homes = squares.filter(ee.Filter.eq('land_use', 'Homes'));

// Fair "space for trees" rule: the 25% most tightly packed neighbourhoods
var packedLimit = ee.Number(homes.reduceColumns(ee.Reducer.percentile([25]), ['open_space']).get('p25'));
var avgHeat = ee.Number(homes.aggregate_mean('heat'));
var maxPop = ee.Number(homes.aggregate_max('pop'));
function round1(x) { return ee.Number(x).multiply(10).round().divide(10); }

homes = homes.map(function(f) {
  var h = ee.Number(f.get('heat'));
  var t = ee.Number(f.get('trees'));
  var open = ee.Number(f.get('open_space'));
  var heatAbove = h.subtract(avgHeat).max(0);
  var popShare = ee.Number(f.get('pop')).divide(maxPop);
  var gap = ee.Number(TARGET_TREE_COVER).subtract(t).max(0);
  return f.set({
    heat_C: round1(h),
    hotter_than_avg_C: round1(heatAbove),
    tree_cover_pct: round1(t.multiply(100)),
    open_space_pct: round1(open.multiply(100)),
    homes_pct: round1(ee.Number(f.get('res_share')).multiply(100)),
    people: ee.Number(f.get('pop')).round(),
    treatment: ee.Algorithms.If(open.lte(packedLimit),
      'Very packed: street trees + cool roofs', 'Plant trees in open plots and streets'),
    trees_needed_for_30pct: gap.multiply(1e6).divide(CANOPY_PER_TREE_M2).divide(100).round().multiply(100),
    est_cooling_C: round1(gap.multiply(10).multiply(COOLING_PER_10PCT)),
    note: ee.Algorithms.If(ee.Number(f.get('big_paved')).gt(0.05),
      'Near airport/large yard - check on the ground', ''),
    score: heatAbove.multiply(popShare).multiply(ee.Number(1).subtract(t))
  });
});
var maxScore = ee.Number(homes.aggregate_max('score'));
homes = homes.map(function(f) {
  return f.set('priority', ee.Number(f.get('score')).divide(maxScore).multiply(100).round());
});

Map.centerObject(squares, 10);
Map.addLayer(ee.Image().float().paint(homes, 'priority'), {min: 0, max: 60,
  palette: ['#ffffcc', '#fed976', '#fd8d3c', '#e31a1c', '#800026']}, 'Priority score');

Export.table.toDrive({
  collection: homes.select(['city', 'zone', 'priority', 'heat_C', 'hotter_than_avg_C',
    'tree_cover_pct', 'open_space_pct', 'homes_pct', 'people', 'treatment',
    'trees_needed_for_30pct', 'est_cooling_C', 'note', 'lat', 'lon'], null, false),
  description: 'tree_doctor_hyderabad_results', folder: 'tree-doctor', fileFormat: 'CSV'
});
