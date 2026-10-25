// Tree Doctor – App v19 (phones: simple list ⇄ full-screen map switch; only the newest check is drawn; big zones split into neighbourhood-size pieces): past → now → 2050 (Landsat + ERA5 weather records + NASA climate models), plain-language zones,
//                         one-tap examples, use-my-location, share link, download table, phone layout,
//                         hotspot zones, Telugu/Hindi/English + listen, town search, tree-loss alert
var SIZE_KM = 14;              // analysed area around the chosen place (km)
var CELL_M = 500;              // size of each neighbourhood square (m)
var TARGET = 0.30;             // 30% tree cover target (3-30-300 rule)
var CANOPY_M2 = 50;            // shade area of one grown tree (assumption)
var COOLING_PER_10PCT = 0.33;  // °C per +10% tree cover (Hyderabad street-level study)
var YEARS_BACK = 5;            // tree-loss comparison period
var MAX_ZONES = 5;             // hotspot zones shown (A–E)
var MAX_ZONE_KM2 = 3;          // a zone bigger than this is split into neighbourhood-size pieces
var KEY_SECONDS = 3;           // colour key hides itself after this many seconds (0 = stay until tapped again)
var TREE_MIN_HEIGHT_M = 3;     // in the 1 m canopy map, anything 3 m or taller counts as a tree
var FUTURE_YEAR = 2050;        // the future year shown in "Past, now and future"
var PAST_START = 2014;         // first full year of Landsat 8 heat data
var CLIMATE_SINCE = 1990;      // ERA5 weather records: warming trend measured from this year
// NASA NEX-GDDP-CMIP6 climate models used for the future (a mix of low, middle and high warming models)
var CLIMATE_MODELS = ['ACCESS-CM2', 'GFDL-ESM4', 'MPI-ESM1-2-HR', 'MRI-ESM2-0', 'UKESM1-0-LL'];
var text = require('users/gena/packages:text');   // draws letters on the map
var GITHUB_URL = 'https://github.com/BangariPrajwal/tree-doctor';
var LINKEDIN_URL = 'https://www.linkedin.com/in/prajwal-bangari-800434118';
// One-tap examples: [name, latitude, longitude] of a dense, lived-in part of each city
var EXAMPLES = [['Hyderabad', 17.3616, 78.4747], ['Delhi', 28.6500, 77.2200], ['London', 51.5150, -0.0500],
                ['Guildford', 51.2360, -0.5700], ['New York', 40.8400, -73.8900], ['Dubai', 25.2700, 55.3100]];

// ================================================================ LANGUAGES
var LANG = 'en';
var THEN_YEAR = new Date().getFullYear() - YEARS_BACK;
var T = {
  en: {
    title: '🌳 Tree Doctor',
    tagline: 'Find the places in your town that most need trees to stay cool.',
    tryTitle: 'See an example (one tap):',
    useMe: '📍 Use my location',
    locating: '📍 Finding your location…',
    noLoc: 'Could not find your location. Please allow location in your browser, or click on the map.',
    share: '🔗 To share this result: copy the link in your browser\'s address bar. It opens this same place.',
    download: '⬇️ Download the full table (for councils and NGOs)',
    fPlan: function(n, p) { return '• Planting about ' + n + ' trees in these zones would shade and cool about ' + p + ' people.'; },
    credit: 'Built by Bangari Prajwal',
    showMapBtn: '🗺️ Show map',
    backList: '📋 Back to list',
    heatS: ['very hot', 'hot', 'warm', 'mild'],
    treeS: ['almost no trees', 'few trees', 'some trees', 'many trees'],
    story: function(hs, c, ts, n) { return 'This area is ' + hs + ' (roofs and roads reach ' + c + '°C on the hottest days) and has ' + ts +
      ', so it needs about ' + n + ' more trees.'; },
    storyOk: 'This area already has enough trees. Please protect them.',
    timeTitle: 'Past, now and future',
    past: function(c) { return '📅 ' + PAST_START + '–' + (PAST_START + 2) + ': about ' + c + '°C'; },
    nowT: function(c) { return '📍 Now: about ' + c + '°C'; },
    treeDiff: function(d) { return '🌳 Planting these trees makes ' + FUTURE_YEAR + ' about ' + d + '°C cooler across the whole area, and 10–20°C cooler under the shade.'; },
    futNo: function(c) { return '🔥 ' + FUTURE_YEAR + ', if nothing is done: about ' + c + '°C'; },
    futYes: function(c) { return '🌳 ' + FUTURE_YEAR + ', if these trees are planted: about ' + c + '°C'; },
    tLoading: '⏳ Working out the past and the future (about 1 more minute)…',
    fClimate: function(x) { return '• Since ' + CLIMATE_SINCE + ', the hottest part of each day here has been getting warmer by about ' + x + '°C every 10 years (ERA5 weather records).'; },
    fClimateFlat: '• Since ' + CLIMATE_SINCE + ', daytime highs here have stayed about the same (ERA5 weather records).',
    fFuture: function(a, b) { return '• NASA climate models expect the hottest days here to be about ' + a + '°C hotter by ' + FUTURE_YEAR + ' (up to ' + b + '°C if pollution keeps rising).'; },
    code: 'How it works (code & method)',
    howTitle: 'How to use',
    how: '1. Type a city or district name (in English) and press Search.\n' +
         '   For a smaller town or village: click it on the map, or paste its coordinates (see below).\n' +
         '2. Wait about 1 minute. The white dashed box shows the area checked.\n' +
         '3. Read the list: Zone A needs trees the most.\n' +
         '4. Tap "See area name" to check each place on Google Maps.\n' +
         '5. Tap "Listen" to hear it read aloud.',
    searchPh: 'City or district name, e.g. Mahabubnagar',
    searchBtn: '🔍 Search',
    coordPh: 'Or latitude, longitude, e.g. 16.74, 78.00',
    coordBtn: 'Check these coordinates',
    searching: '🔍 Searching…',
    choose: 'Choose your town:',
    noTown: 'No city or district found with that name. For a town or village, click on the map or paste its coordinates.',
    coordHelp: 'For a village or small town: open Google Maps, right-click (computer) or press and hold (phone) on your village. Two numbers appear (e.g. 16.7631, 78.1384). Copy them and paste them here.',
    short: 'Please type at least 4 letters of the town name.',
    badCoord: 'Please type two numbers: latitude, longitude, e.g. 16.74, 78.00',
    working: function(s, p) { return '⏳ Working… ' + s + ' seconds\nReading satellite images for ' + p +
      '.\nThis usually takes about 1 minute. Please wait.'; },
    done: '✅ Done! The list below shows where trees are needed most.',
    err: '⚠️ Sorry, this place could not be checked. Please try again, or choose another spot.',
    none: 'No housing areas found here. Please choose the built-up part of a town or city.',
    found: 'What we found',
    fHeat: function(c) { return '• On the hottest days, roofs and roads where people live reach about ' + c + '°C (the air is cooler).'; },
    fTrees: function(n) { return '• ' + n + ' out of every 100 neighbourhoods have almost no trees.'; },
    fLoss: function(h) { return '• Since ' + THEN_YEAR + ', trees on about ' + h + ' hectares where people live were cut (replaced by buildings, roads or bare ground).'; },
    zonesTitle: 'Where to plant trees first',
    zonesHint: 'Hot neighbourhoods next to each other are grouped into one zone.',
    zone: function(L, i) { return 'Zone ' + L + (i === 0 ? ' – Plant here first' : ''); },
    heatLine: function(w, c) { return w + ' roofs & roads (' + c + '°C)'; },
    people: function(n) { return 'About ' + n + ' people live here'; },
    size: function(k) { return 'Size: about ' + k + ' km²'; },
    lost: function(h) { return '⚠️ About ' + h + ' hectares of trees cut here since ' + THEN_YEAR; },
    doPacked: 'What to do: plant trees along streets and paint roofs white (little open space)',
    doOpen: 'What to do: plant trees in open plots and along streets',
    needed: function(n, c) { return 'About ' + n + ' trees → whole area about ' + c + '°C cooler; under their shade the ground is 10–20°C cooler'; },
    showMap: '📍 Show on map',
    gmaps: '🔎 See area name',
    listen: '🔊 Listen',
    keyBtn: 'ℹ️ Colour key',
    legendTitle: 'Need for trees',
    levels: ['Very urgent – plant first', 'Urgent', 'High', 'Medium', 'Lower'],
    legendNote: 'Letter in a box = its zone (A plant first) · boxes without a letter are not in the top 5 zones · red = trees cut since ' + THEN_YEAR,
    heatW: ['Very hot', 'Hot', 'Warm', 'Mild'],
    treeW: ['Almost no trees', 'Few trees', 'Some trees', 'Many trees'],
    about: 'About the data: free satellite images (Landsat, Sentinel-2) and global maps of buildings and ' +
      'people. "Ground temperature" is how hot the ground and roofs get on the hottest days, not the air ' +
      'temperature. Trees are counted with a detailed 1-metre tree map (Meta/WRI, mostly 2018–2020) that includes ' +
      'small garden and street trees, updated with live satellite images to remove trees cut since. Very young ' +
      'saplings may still be missed. The cooling estimate comes from a ' +
      'study of Hyderabad; shade cooling of 10–20°C on the ground is from the US EPA. Past: today\'s heat minus the warming trend measured by ERA5 ' +
      'weather records (' + CLIMATE_SINCE + '–now) and minus the effect of trees cut since. ' +
      'Future: hottest days (90th percentile) in NASA NEX-GDDP-CMIP6 climate models ' +
      '(5 models); the ' + FUTURE_YEAR + ' numbers are estimates that assume the ground warms as much as the air and that, ' +
      'if nothing is done, trees keep being cut at the recent rate. ' +
      'This is a planning guide: always check each place in person. Built by Bangari Prajwal.'
  },
  te: {
    title: '🌳 ట్రీ డాక్టర్',
    tagline: 'మీ ఊరిలో చల్లగా ఉండటానికి ఎక్కడ ఎక్కువ చెట్లు అవసరమో తెలుసుకోండి.',
    tryTitle: 'ఉదాహరణ చూడండి (ఒక్క నొక్కు):',
    useMe: '📍 నా ప్రదేశం వాడండి',
    locating: '📍 మీ ప్రదేశాన్ని కనుగొంటున్నాం…',
    noLoc: 'మీ ప్రదేశం దొరకలేదు. బ్రౌజర్‌లో లొకేషన్ అనుమతి ఇవ్వండి, లేదా మ్యాప్‌పై క్లిక్ చేయండి.',
    share: '🔗 ఈ ఫలితాన్ని పంచుకోవడానికి: బ్రౌజర్ పై భాగంలోని లింక్‌ను కాపీ చేసి పంపండి. అది ఇదే ప్రదేశాన్ని తెరుస్తుంది.',
    download: '⬇️ పూర్తి పట్టికను డౌన్‌లోడ్ చేయండి (పురపాలక సంస్థలు, NGOల కోసం)',
    fPlan: function(n, p) { return '• ఈ జోన్లలో సుమారు ' + n + ' చెట్లు నాటితే, సుమారు ' + p + ' మందికి నీడ, చల్లదనం అందుతుంది.'; },
    credit: 'రూపొందించినది: బంగారి ప్రజ్వల్',
    showMapBtn: '🗺️ మ్యాప్ చూపించు',
    backList: '📋 జాబితాకు తిరిగి',
    heatS: ['చాలా వేడిగా ఉంది', 'వేడిగా ఉంది', 'కొంచెం వేడిగా ఉంది', 'మామూలుగా ఉంది'],
    treeS: ['దాదాపు చెట్లు లేవు', 'చెట్లు తక్కువగా ఉన్నాయి', 'కొన్ని చెట్లు ఉన్నాయి', 'చాలా చెట్లు ఉన్నాయి'],
    story: function(hs, c, ts, n) { return 'ఈ ప్రాంతం ' + hs + ' (అత్యంత వేడి రోజుల్లో పైకప్పులు, రోడ్లు ' + c + '°C వరకు వేడెక్కుతాయి), ఇక్కడ ' + ts +
      '. అందుకే సుమారు ' + n + ' చెట్లు ఇంకా నాటాలి.'; },
    storyOk: 'ఈ ప్రాంతంలో ఇప్పటికే తగినన్ని చెట్లు ఉన్నాయి. వాటిని కాపాడండి.',
    timeTitle: 'గతం, ఇప్పుడు, భవిష్యత్తు',
    past: function(c) { return '📅 ' + PAST_START + '–' + (PAST_START + 2) + ': సుమారు ' + c + '°C'; },
    nowT: function(c) { return '📍 ఇప్పుడు: సుమారు ' + c + '°C'; },
    treeDiff: function(d) { return '🌳 ఈ చెట్లు నాటితే ' + FUTURE_YEAR + 'లో ప్రాంతం మొత్తం సుమారు ' + d + '°C చల్లగా ఉంటుంది, నీడలో 10–20°C చల్లగా ఉంటుంది.'; },
    futNo: function(c) { return '🔥 ' + FUTURE_YEAR + 'లో, ఏమీ చేయకపోతే: సుమారు ' + c + '°C'; },
    futYes: function(c) { return '🌳 ' + FUTURE_YEAR + 'లో, ఈ చెట్లు నాటితే: సుమారు ' + c + '°C'; },
    tLoading: '⏳ గతం మరియు భవిష్యత్తు లెక్కిస్తున్నాం (ఇంకా సుమారు 1 నిమిషం)…',
    fClimate: function(x) { return '• ' + CLIMATE_SINCE + ' నుండి, ఇక్కడ పగటి గరిష్ఠ ఉష్ణోగ్రత ప్రతి 10 సంవత్సరాలకు సుమారు ' + x + '°C పెరుగుతోంది (ERA5 వాతావరణ రికార్డులు).'; },
    fClimateFlat: '• ' + CLIMATE_SINCE + ' నుండి, ఇక్కడ పగటి గరిష్ఠ ఉష్ణోగ్రత దాదాపు మారలేదు (ERA5 వాతావరణ రికార్డులు).',
    fFuture: function(a, b) { return '• NASA వాతావరణ నమూనాల ప్రకారం ' + FUTURE_YEAR + ' నాటికి ఇక్కడ అత్యంత వేడి రోజులు సుమారు ' + a + '°C ఎక్కువ వేడిగా ఉంటాయి (కాలుష్యం పెరుగుతూ ఉంటే ' + b + '°C వరకు).'; },
    code: 'ఇది ఎలా పనిచేస్తుంది (కోడ్ & పద్ధతి)',
    howTitle: 'ఎలా వాడాలి',
    how: '1. నగరం లేదా జిల్లా పేరును ఇంగ్లీష్‌లో టైప్ చేసి "వెతకండి" నొక్కండి.\n' +
         '   చిన్న ఊరు లేదా గ్రామం కోసం: మ్యాప్‌లో దానిపై క్లిక్ చేయండి, లేదా దాని అక్షాంశ-రేఖాంశాలను క్రింద పేస్ట్ చేయండి.\n' +
         '2. సుమారు 1 నిమిషం వేచి ఉండండి. తెల్లని గీతల పెట్టె పరిశీలించిన ప్రాంతాన్ని చూపిస్తుంది.\n' +
         '3. జాబితా చదవండి: జోన్ A కు చెట్లు అత్యంత అవసరం.\n' +
         '4. ప్రతి ప్రదేశాన్ని Google Maps లో చూడటానికి "ప్రాంతం పేరు చూడండి" నొక్కండి.\n' +
         '5. గట్టిగా చదివి వినిపించడానికి "వినండి" నొక్కండి.',
    searchPh: 'నగరం లేదా జిల్లా పేరు (ఇంగ్లీష్‌లో), ఉదా: Mahabubnagar',
    searchBtn: '🔍 వెతకండి',
    coordPh: 'లేదా అక్షాంశం, రేఖాంశం, ఉదా: 16.74, 78.00',
    coordBtn: 'ఈ ప్రదేశాన్ని పరిశీలించండి',
    searching: '🔍 వెతుకుతున్నాం…',
    choose: 'మీ ఊరిని ఎంచుకోండి:',
    noTown: 'ఈ పేరుతో నగరం లేదా జిల్లా దొరకలేదు. ఊరు లేదా గ్రామం కోసం, మ్యాప్‌పై క్లిక్ చేయండి లేదా అక్షాంశ-రేఖాంశాలను పేస్ట్ చేయండి.',
    coordHelp: 'గ్రామం లేదా చిన్న ఊరి కోసం: Google Maps తెరవండి, మీ గ్రామంపై రైట్-క్లిక్ చేయండి (కంప్యూటర్) లేదా నొక్కి పట్టుకోండి (ఫోన్). రెండు సంఖ్యలు కనిపిస్తాయి (ఉదా: 16.7631, 78.1384). వాటిని కాపీ చేసి ఇక్కడ పేస్ట్ చేయండి.',
    short: 'దయచేసి ఊరి పేరులో కనీసం 4 అక్షరాలు టైప్ చేయండి.',
    badCoord: 'దయచేసి రెండు సంఖ్యలు టైప్ చేయండి: అక్షాంశం, రేఖాంశం, ఉదా: 16.74, 78.00',
    working: function(s, p) { return '⏳ పని జరుగుతోంది… ' + s + ' సెకన్లు\n' + p +
      ' కోసం ఉపగ్రహ చిత్రాలను చదువుతున్నాం.\nసుమారు 1 నిమిషం పడుతుంది. దయచేసి వేచి ఉండండి.'; },
    done: '✅ పూర్తయింది! చెట్లు ఎక్కువగా అవసరమైన ప్రాంతాలు క్రింద ఉన్నాయి.',
    err: '⚠️ క్షమించండి, ఈ ప్రదేశాన్ని పరిశీలించలేకపోయాం. మళ్ళీ ప్రయత్నించండి, లేదా వేరే చోటు ఎంచుకోండి.',
    none: 'ఇక్కడ నివాస ప్రాంతాలు కనిపించలేదు. ఊరిలో ఇళ్ళు ఉన్న భాగాన్ని ఎంచుకోండి.',
    found: 'మేము కనుగొన్నది',
    fHeat: function(c) { return '• అత్యంత వేడి రోజుల్లో, ప్రజలు నివసించే చోట పైకప్పులు, రోడ్లు సుమారు ' + c + '°C వరకు వేడెక్కుతాయి (గాలి కొంచెం చల్లగా ఉంటుంది).'; },
    fTrees: function(n) { return '• ప్రతి 100 ప్రాంతాల్లో ' + n + ' ప్రాంతాల్లో దాదాపు చెట్లు లేవు.'; },
    fLoss: function(h) { return '• ' + THEN_YEAR + ' నుండి, ప్రజలు నివసించే చోట సుమారు ' + h + ' హెక్టార్లలో చెట్లు నరికివేయబడ్డాయి (భవనాలు, రోడ్లు లేదా ఖాళీ నేలగా మారాయి).'; },
    zonesTitle: 'ముందుగా చెట్లు నాటాల్సిన ప్రాంతాలు',
    zonesHint: 'పక్కపక్కనే ఉన్న వేడి ప్రాంతాలను ఒకే జోన్‌గా చూపించాం.',
    zone: function(L, i) { return 'జోన్ ' + L + (i === 0 ? ' – ముందుగా ఇక్కడ నాటండి' : ''); },
    heatLine: function(w, c) { return w + ' పైకప్పులు, రోడ్లు (' + c + '°C)'; },
    people: function(n) { return 'సుమారు ' + n + ' మంది ఇక్కడ నివసిస్తున్నారు'; },
    size: function(k) { return 'విస్తీర్ణం: సుమారు ' + k + ' చ.కి.మీ.'; },
    lost: function(h) { return '⚠️ ' + THEN_YEAR + ' నుండి ఇక్కడ సుమారు ' + h + ' హెక్టార్ల చెట్లు నరికివేయబడ్డాయి'; },
    doPacked: 'ఏమి చేయాలి: వీధుల వెంట చెట్లు నాటండి, పైకప్పులకు తెల్ల రంగు వేయండి (ఖాళీ స్థలం తక్కువ)',
    doOpen: 'ఏమి చేయాలి: ఖాళీ స్థలాల్లో మరియు వీధుల వెంట చెట్లు నాటండి',
    needed: function(n, c) { return 'సుమారు ' + n + ' చెట్లు → ప్రాంతం మొత్తం సుమారు ' + c + '°C చల్లబడుతుంది; చెట్ల నీడలో నేల 10–20°C చల్లగా ఉంటుంది'; },
    showMap: '📍 మ్యాప్‌లో చూపించు',
    gmaps: '🔎 ప్రాంతం పేరు చూడండి',
    listen: '🔊 వినండి',
    keyBtn: 'ℹ️ రంగుల అర్థం',
    legendTitle: 'చెట్ల అవసరం',
    levels: ['అత్యవసరం – ముందుగా నాటండి', 'అవసరం', 'ఎక్కువ', 'మధ్యస్థం', 'తక్కువ'],
    legendNote: 'పెట్టెలోని అక్షరం = దాని జోన్ (A ముందుగా) · అక్షరం లేని పెట్టెలు టాప్ 5 జోన్లలో లేవు · ఎరుపు = ' + THEN_YEAR + ' నుండి నరికిన చెట్లు',
    heatW: ['చాలా వేడి', 'వేడి', 'వెచ్చని', 'సాధారణ'],
    treeW: ['దాదాపు చెట్లు లేవు', 'తక్కువ చెట్లు', 'కొన్ని చెట్లు', 'చాలా చెట్లు'],
    about: 'డేటా గురించి: ఉచిత ఉపగ్రహ చిత్రాలు (Landsat, Sentinel-2), భవనాలు మరియు జనాభా ప్రపంచ పటాలు. ' +
      '"నేల ఉష్ణోగ్రత" అంటే అత్యంత వేడి రోజుల్లో నేల మరియు పైకప్పులు ఎంత వేడెక్కుతాయో, గాలి ఉష్ణోగ్రత కాదు. ' +
      'చెట్లను 1-మీటర్ వివరమైన చెట్ల పటం (Meta/WRI, ఎక్కువగా 2018–2020) తో లెక్కిస్తాం, ఇందులో ఇంటి తోటల మరియు వీధుల్లోని చిన్న చెట్లు కూడా ఉంటాయి; ఆ తర్వాత నరికిన చెట్లను తాజా ఉపగ్రహ చిత్రాలతో తీసివేస్తాం. చాలా లేత మొక్కలు కనిపించకపోవచ్చు. ' +
      'చల్లదనం అంచనా హైదరాబాద్ అధ్యయనం నుండి తీసుకున్నది. ' +
      'చెట్ల నీడలో నేల 10–20°C చల్లబడటం US EPA సమాచారం. గతం: ఇప్పటి వేడి నుండి, ERA5 వాతావరణ రికార్డులు (' + CLIMATE_SINCE + '–ఇప్పటి వరకు) చూపిన వేడి పెరుగుదలను, ఆ తర్వాత నరికిన చెట్ల ప్రభావాన్ని తీసివేసి లెక్కించాం. భవిష్యత్తు: NASA NEX-GDDP-CMIP6 వాతావరణ నమూనాలు (5 నమూనాలు); ' +
      FUTURE_YEAR + ' సంఖ్యలు అంచనాలు మాత్రమే: గాలి వేడెక్కినంతగా నేల కూడా వేడెక్కుతుందని, ఏమీ చేయకపోతే ఇటీవలి వేగంతో చెట్ల నరికివేత కొనసాగుతుందని భావించాం. ' +
      'ఇది ప్రణాళిక కోసం మార్గదర్శి మాత్రమే: ప్రతి ప్రదేశాన్ని స్వయంగా పరిశీలించండి. రూపొందించినది: బంగారి ప్రజ్వల్.'
  },
  hi: {
    title: '🌳 ट्री डॉक्टर',
    tagline: 'जानिए आपके शहर में ठंडक के लिए सबसे ज़्यादा पेड़ कहाँ चाहिए।',
    tryTitle: 'एक उदाहरण देखें (एक टैप में):',
    useMe: '📍 मेरी जगह इस्तेमाल करें',
    locating: '📍 आपकी जगह ढूँढ रहे हैं…',
    noLoc: 'आपकी जगह नहीं मिली। ब्राउज़र में लोकेशन की अनुमति दें, या नक्शे पर क्लिक करें।',
    share: '🔗 यह नतीजा भेजने के लिए: ब्राउज़र के ऊपर वाला लिंक कॉपी करके भेजें। वह यही जगह खोलेगा।',
    download: '⬇️ पूरी तालिका डाउनलोड करें (नगर निगम और NGO के लिए)',
    fPlan: function(n, p) { return '• इन क्षेत्रों में लगभग ' + n + ' पेड़ लगाने से लगभग ' + p + ' लोगों को छाया और ठंडक मिलेगी।'; },
    credit: 'बनाया: बंगारी प्रज्वल',
    showMapBtn: '🗺️ नक्शा दिखाएँ',
    backList: '📋 सूची पर वापस',
    heatS: ['बहुत गर्म है', 'गर्म है', 'थोड़ा गर्म है', 'सामान्य है'],
    treeS: ['लगभग कोई पेड़ नहीं है', 'पेड़ कम हैं', 'कुछ पेड़ हैं', 'बहुत पेड़ हैं'],
    story: function(hs, c, ts, n) { return 'यह इलाका ' + hs + ' (सबसे गर्म दिनों में छतें और सड़कें ' + c + '°C तक गर्म होती हैं) और यहाँ ' + ts +
      '। इसलिए लगभग ' + n + ' और पेड़ लगाने चाहिए।'; },
    storyOk: 'इस इलाके में पहले से काफ़ी पेड़ हैं। उन्हें बचाइए।',
    timeTitle: 'पहले, अब और आगे',
    past: function(c) { return '📅 ' + PAST_START + '–' + (PAST_START + 2) + ': लगभग ' + c + '°C'; },
    nowT: function(c) { return '📍 अब: लगभग ' + c + '°C'; },
    treeDiff: function(d) { return '🌳 ये पेड़ लगाने से ' + FUTURE_YEAR + ' में पूरा इलाका लगभग ' + d + '°C ठंडा रहेगा, और छाया में 10–20°C ठंडा।'; },
    futNo: function(c) { return '🔥 ' + FUTURE_YEAR + ' में, अगर कुछ नहीं किया: लगभग ' + c + '°C'; },
    futYes: function(c) { return '🌳 ' + FUTURE_YEAR + ' में, अगर ये पेड़ लगाए: लगभग ' + c + '°C'; },
    tLoading: '⏳ पहले और आगे का हिसाब लगा रहे हैं (लगभग 1 मिनट और)…',
    fClimate: function(x) { return '• ' + CLIMATE_SINCE + ' से, यहाँ दिन का सबसे ज़्यादा तापमान हर 10 साल में लगभग ' + x + '°C बढ़ रहा है (ERA5 मौसम रिकॉर्ड)।'; },
    fClimateFlat: '• ' + CLIMATE_SINCE + ' से, यहाँ दिन का सबसे ज़्यादा तापमान लगभग वैसा ही है (ERA5 मौसम रिकॉर्ड)।',
    fFuture: function(a, b) { return '• NASA के जलवायु मॉडल के अनुसार ' + FUTURE_YEAR + ' तक यहाँ सबसे गर्म दिन लगभग ' + a + '°C और गर्म होंगे (प्रदूषण बढ़ता रहा तो ' + b + '°C तक)।'; },
    code: 'यह कैसे काम करता है (कोड और तरीका)',
    howTitle: 'कैसे इस्तेमाल करें',
    how: '1. शहर या ज़िले का नाम अंग्रेज़ी में लिखें और "खोजें" दबाएँ।\n' +
         '   छोटे शहर या गाँव के लिए: नक्शे पर उस पर क्लिक करें, या उसके अक्षांश-देशांतर नीचे पेस्ट करें।\n' +
         '2. लगभग 1 मिनट इंतज़ार करें। सफ़ेद धारीदार डिब्बा जाँचा गया इलाका दिखाता है।\n' +
         '3. सूची पढ़ें: क्षेत्र A को पेड़ों की सबसे ज़्यादा ज़रूरत है।\n' +
         '4. हर जगह को Google Maps पर देखने के लिए "इलाके का नाम देखें" दबाएँ।\n' +
         '5. सुनने के लिए "सुनें" दबाएँ।',
    searchPh: 'शहर या ज़िले का नाम (अंग्रेज़ी में), जैसे Mahabubnagar',
    searchBtn: '🔍 खोजें',
    coordPh: 'या अक्षांश, देशांतर, जैसे 16.74, 78.00',
    coordBtn: 'इस जगह की जाँच करें',
    searching: '🔍 खोज रहे हैं…',
    choose: 'अपना शहर चुनें:',
    noTown: 'इस नाम से कोई शहर या ज़िला नहीं मिला। छोटे शहर या गाँव के लिए, नक्शे पर क्लिक करें या अक्षांश-देशांतर पेस्ट करें।',
    coordHelp: 'गाँव या छोटे शहर के लिए: Google Maps खोलें, अपने गाँव पर राइट-क्लिक करें (कंप्यूटर) या दबाकर रखें (फ़ोन)। दो संख्याएँ दिखेंगी (जैसे 16.7631, 78.1384)। उन्हें कॉपी करके यहाँ पेस्ट करें।',
    short: 'कृपया शहर के नाम के कम से कम 4 अक्षर लिखें।',
    badCoord: 'कृपया दो संख्याएँ लिखें: अक्षांश, देशांतर, जैसे 16.74, 78.00',
    working: function(s, p) { return '⏳ काम चल रहा है… ' + s + ' सेकंड\n' + p +
      ' के उपग्रह चित्र पढ़े जा रहे हैं।\nलगभग 1 मिनट लगता है। कृपया इंतज़ार करें।'; },
    done: '✅ हो गया! नीचे वे इलाके हैं जहाँ पेड़ों की सबसे ज़्यादा ज़रूरत है।',
    err: '⚠️ माफ़ कीजिए, इस जगह की जाँच नहीं हो सकी। फिर से कोशिश करें, या कोई दूसरी जगह चुनें।',
    none: 'यहाँ कोई रिहायशी इलाका नहीं मिला। शहर का वह हिस्सा चुनें जहाँ घर हों।',
    found: 'हमें क्या मिला',
    fHeat: function(c) { return '• सबसे गर्म दिनों में, जहाँ लोग रहते हैं वहाँ छतें और सड़कें लगभग ' + c + '°C तक गर्म हो जाती हैं (हवा थोड़ी ठंडी रहती है)।'; },
    fTrees: function(n) { return '• हर 100 में से ' + n + ' इलाकों में लगभग कोई पेड़ नहीं है।'; },
    fLoss: function(h) { return '• ' + THEN_YEAR + ' से, जहाँ लोग रहते हैं वहाँ लगभग ' + h + ' हेक्टेयर में पेड़ काटे गए (इमारतें, सड़कें या खाली ज़मीन बन गई)।'; },
    zonesTitle: 'पहले पेड़ कहाँ लगाएँ',
    zonesHint: 'पास-पास के गर्म इलाकों को एक क्षेत्र के रूप में दिखाया गया है।',
    zone: function(L, i) { return 'क्षेत्र ' + L + (i === 0 ? ' – पहले यहाँ लगाएँ' : ''); },
    heatLine: function(w, c) { return w + ' छतें और सड़कें (' + c + '°C)'; },
    people: function(n) { return 'लगभग ' + n + ' लोग यहाँ रहते हैं'; },
    size: function(k) { return 'आकार: लगभग ' + k + ' वर्ग कि.मी.'; },
    lost: function(h) { return '⚠️ ' + THEN_YEAR + ' से यहाँ लगभग ' + h + ' हेक्टेयर पेड़ काटे गए'; },
    doPacked: 'क्या करें: सड़कों के किनारे पेड़ लगाएँ और छतों को सफ़ेद रंगें (खुली जगह कम है)',
    doOpen: 'क्या करें: खुली ज़मीन पर और सड़कों के किनारे पेड़ लगाएँ',
    needed: function(n, c) { return 'लगभग ' + n + ' पेड़ → पूरा इलाका लगभग ' + c + '°C ठंडा; पेड़ों की छाया में ज़मीन 10–20°C ठंडी'; },
    showMap: '📍 नक्शे पर दिखाएँ',
    gmaps: '🔎 इलाके का नाम देखें',
    listen: '🔊 सुनें',
    keyBtn: 'ℹ️ रंगों का मतलब',
    legendTitle: 'पेड़ों की ज़रूरत',
    levels: ['बहुत ज़रूरी – पहले लगाएँ', 'ज़रूरी', 'ज़्यादा', 'मध्यम', 'कम'],
    legendNote: 'डिब्बे में अक्षर = उसका क्षेत्र (A पहले) · बिना अक्षर वाले डिब्बे शीर्ष 5 क्षेत्रों में नहीं हैं · लाल = ' + THEN_YEAR + ' से कटे हुए पेड़',
    heatW: ['बहुत गर्म', 'गर्म', 'हल्की गर्म', 'सामान्य'],
    treeW: ['लगभग कोई पेड़ नहीं', 'कम पेड़', 'कुछ पेड़', 'बहुत पेड़'],
    about: 'डेटा के बारे में: मुफ़्त उपग्रह चित्र (Landsat, Sentinel-2) और इमारतों व आबादी के वैश्विक नक्शे। ' +
      '"ज़मीन का तापमान" यानी सबसे गर्म दिनों में ज़मीन और छतें कितनी गर्म होती हैं, हवा का तापमान नहीं। ' +
      'पेड़ों की गिनती 1-मीटर विस्तृत पेड़ नक्शे (Meta/WRI, ज़्यादातर 2018–2020) से होती है, जिसमें घरों के बगीचों और सड़कों के छोटे पेड़ भी शामिल हैं; फिर ताज़ा उपग्रह चित्रों से कटे हुए पेड़ हटाए जाते हैं। बहुत छोटे पौधे शायद न दिखें। ' +
      'ठंडक का अनुमान हैदराबाद के अध्ययन पर आधारित है। ' +
      'छाया में ज़मीन 10–20°C ठंडी होने की जानकारी US EPA से। पहले का अनुमान: आज की गर्मी में से ERA5 मौसम रिकॉर्ड (' + CLIMATE_SINCE + '–अब) में मापी गई बढ़ोतरी और तब से कटे पेड़ों का असर घटाया गया। आगे का अनुमान: NASA NEX-GDDP-CMIP6 जलवायु मॉडल (5 मॉडल); ' +
      FUTURE_YEAR + ' के आँकड़े केवल अनुमान हैं: मान लिया है कि ज़मीन हवा जितनी गर्म होगी, और कुछ न करने पर पेड़ हाल की रफ़्तार से कटते रहेंगे। ' +
      'यह केवल योजना के लिए मार्गदर्शक है: हर जगह की खुद जाँच करें। बनाया: बंगारी प्रज्वल।'
  }
};
function t(k) { return T[LANG][k]; }
var SPEECH = {en: 'en', te: 'te', hi: 'hi'};

// ================================================================ LAYOUT
// Language can come from a shared link (…#lang=te)
var LANG_NAMES = {en: 'English', te: 'తెలుగు', hi: 'हिंदी'};
var urlLang = String(ui.url.get('lang', 'en'));
if (T[urlLang]) { LANG = urlLang; }

ui.root.clear();
var map = ui.Map();
map.setOptions('HYBRID');
map.style().set('cursor', 'crosshair');
var panel = ui.Panel({style: {width: '450px', padding: '10px'}});
ui.root.add(ui.SplitPanel(panel, map));
// Phones: side-by-side is too narrow, so show EITHER the list OR the full-screen map,
// with a button to switch between them.
var isPhone = false;
var showMapBtn = ui.Button({style: {stretch: 'horizontal', margin: '4px 0', shown: false},
  onClick: function() { showMapView(); }});
var backListBtn = ui.Button({onClick: function() { showListView(); }});
var backListPanel = ui.Panel([backListBtn], null, {position: 'top-center', shown: false, padding: '0'});
map.add(backListPanel);
function showMapView() { if (isPhone) { ui.root.widgets().reset([map]); } }
function showListView() { if (isPhone) { ui.root.widgets().reset([panel]); } }
ui.root.onResize(function(device) {
  if (device.is_mobile && !isPhone) {
    isPhone = true;
    panel.style().set({width: '100%', stretch: 'both'});
    map.style().set({stretch: 'both'});
    showMapBtn.style().set('shown', true);
    backListPanel.style().set('shown', true);
    showListView();
  }
});

var H = {fontSize: '15px', fontWeight: 'bold', margin: '12px 0 4px 0'};
var P = {fontSize: '14px', whiteSpace: 'pre-wrap', margin: '2px 0'};
var CLEAR = '00000000';

var langSelect = ui.Select({items: ['English', 'తెలుగు', 'हिंदी'], value: LANG_NAMES[LANG],
  onChange: function(v) {
    LANG = {'English': 'en', 'తెలుగు': 'te', 'हिंदी': 'hi'}[v];
    ui.url.set('lang', LANG);
    refreshText();
  }});
var titleL = ui.Label('', {fontSize: '26px', fontWeight: 'bold'});
var taglineL = ui.Label('', P);
var tryT = ui.Label('', H);
var exampleBtns = EXAMPLES.map(function(e) {
  return ui.Button({label: e[0], style: {margin: '2px'}, onClick: function() { analyse(e[2], e[1], e[0]); }});
});
var examplesPanel = ui.Panel(exampleBtns, ui.Panel.Layout.flow('horizontal', true));
var useMeBtn = ui.Button({style: {stretch: 'horizontal', margin: '6px 0'}, onClick: useMyLocation});
var howT = ui.Label('', H);
var howL = ui.Label('', P);
var townBox = ui.Textbox({style: {stretch: 'horizontal'}});
var townBtn = ui.Button({style: {stretch: 'horizontal'}});
var townList = ui.Panel();
var coordBox = ui.Textbox({style: {stretch: 'horizontal'}});
var coordBtn = ui.Button({style: {stretch: 'horizontal'}});
var coordHelpL = ui.Label('', {fontSize: '12px', color: 'gray', whiteSpace: 'pre-wrap', margin: '0 8px 6px 8px'});
var status = ui.Label('', {fontSize: '15px', fontWeight: 'bold', padding: '8px', shown: false,
  stretch: 'horizontal', whiteSpace: 'pre-wrap'});
var results = ui.Panel();
var aboutL = ui.Label('', {fontSize: '11px', color: 'gray', whiteSpace: 'pre-wrap', margin: '14px 0 0 0'});
var creditL = ui.Label('', {fontSize: '12px', fontWeight: 'bold', margin: '8px 8px 0 8px'});
var codeL = ui.Label({value: '', targetUrl: GITHUB_URL, style: {fontSize: '12px', margin: '8px 8px 0 8px'}});
var linkedinL = ui.Label({value: 'LinkedIn', targetUrl: LINKEDIN_URL, style: {fontSize: '12px', margin: '8px 8px 0 8px'}});
var creditPanel = ui.Panel([creditL, codeL, linkedinL], ui.Panel.Layout.flow('horizontal', true));
panel.add(ui.Panel([ui.Label('🌐'), langSelect], ui.Panel.Layout.flow('horizontal')));
panel.add(showMapBtn);
[titleL, taglineL, tryT, examplesPanel, useMeBtn, howT, howL, townBox, townBtn, townList, coordBox, coordHelpL,
 coordBtn, status, results, aboutL, creditPanel]
  .forEach(function(w) { panel.add(w); });

// Colour key: hidden so it never blocks the map; the small button pops it up for KEY_SECONDS
var legend = ui.Panel({style: {padding: '8px', shown: false}});
var keyTimer = null;
function hideKey() {
  legend.style().set('shown', false);
  if (keyTimer !== null) { ui.util.clear(keyTimer); keyTimer = null; }
}
var keyBtn = ui.Button({onClick: function() {
  if (legend.style().get('shown')) { hideKey(); return; }   // tap again = close at once
  legend.style().set('shown', true);
  if (KEY_SECONDS > 0) { keyTimer = ui.util.setTimeout(hideKey, KEY_SECONDS * 1000); }
}});
var keyPanel = ui.Panel([legend, keyBtn], ui.Panel.Layout.flow('vertical'),
  {position: 'bottom-left', padding: '0', backgroundColor: '00000000', shown: false});
map.add(keyPanel);
map.setCenter(78.0, 17.0, 6);

var lastResult = null;
function buildLegend() {
  keyBtn.setLabel(t('keyBtn'));
  legend.clear();
  legend.add(ui.Label(t('legendTitle'), {fontWeight: 'bold'}));
  ['#800026', '#e31a1c', '#fd8d3c', '#fed976', '#ffffcc'].forEach(function(c, i) {
    legend.add(ui.Panel([
      ui.Label('', {backgroundColor: c, padding: '8px', margin: '2px 6px 2px 0', border: '1px solid #999'}),
      ui.Label(t('levels')[i], {margin: '4px 0'})
    ], ui.Panel.Layout.flow('horizontal')));
  });
  legend.add(ui.Label(t('legendNote'), {fontSize: '12px'}));
}
function refreshText() {
  titleL.setValue(t('title'));
  taglineL.setValue(t('tagline'));
  showMapBtn.setLabel(t('showMapBtn'));
  backListBtn.setLabel(t('backList'));
  tryT.setValue(t('tryTitle'));
  useMeBtn.setLabel(t('useMe'));
  creditL.setValue(t('credit'));
  codeL.setValue(t('code'));
  howT.setValue(t('howTitle'));
  howL.setValue(t('how'));
  townBox.setPlaceholder(t('searchPh'));
  townBtn.setLabel(t('searchBtn'));
  coordBox.setPlaceholder(t('coordPh'));
  coordBtn.setLabel(t('coordBtn'));
  coordHelpL.setValue(t('coordHelp'));
  aboutL.setValue(t('about'));
  buildLegend();
  if (lastResult) { showResults(lastResult); }
}
refreshText();

// ================================================================ LOADING TIMER
var timerId = null, seconds = 0;
function setBusy(busy) {
  townBtn.setDisabled(busy); coordBtn.setDisabled(busy); useMeBtn.setDisabled(busy);
  exampleBtns.forEach(function(b) { b.setDisabled(busy); });
}
function startLoading(place) {
  seconds = 0;
  setBusy(true);
  status.style().set({shown: true, backgroundColor: '#fff3b0'});
  var tick = function() { status.setValue(t('working')(seconds, place)); seconds += 1; };
  tick();
  timerId = ui.util.setInterval(tick, 1000);
}
function stopLoading(message, ok) {
  if (timerId !== null) { ui.util.clear(timerId); timerId = null; }
  setBusy(false);
  status.style().set({shown: true, backgroundColor: ok ? '#d9f2d9' : '#ffd6d6'});
  status.setValue(message);
}
function say(message, colour) {
  status.style().set({shown: true, backgroundColor: colour || '#ffd6d6'});
  status.setValue(message);
}

// ================================================================ C. SEARCH BY TOWN NAME
// Fuzzy match on the consonants of the name, so "Mahabubnagar" also finds "Mahbubnagar".
function skeleton(s) { return s.toLowerCase().replace(/[^a-z]/g, '').replace(/[aeiou]/g, ''); }
// Search names only (no boundaries) so it is fast; load the boundary only after a town is chosen.
var GAUL2 = ee.FeatureCollection('FAO/GAUL/2015/level2');
var GAUL1 = ee.FeatureCollection('FAO/GAUL/2015/level1');
function namesOnly(fc, nameProp, codeProp, labelProps) {
  return fc.select([nameProp, codeProp].concat(labelProps), null, false).map(function(f) {
    var label = ee.String(f.get(nameProp));
    labelProps.forEach(function(p) { label = label.cat(', ').cat(ee.String(f.get(p))); });
    return f.set({
      k: ee.String(f.get(nameProp)).toLowerCase().replace('[^a-z]', '', 'g').replace('[aeiou]', '', 'g'),
      label: label, code: f.get(codeProp), level: codeProp
    });
  });
}
function searchTown() {
  townList.clear();
  var q = skeleton(townBox.getValue() || '');
  if (q.length < 3) { say(t('short')); return; }
  say(t('searching'), '#fff3b0');
  setBusy(true);
  var l2 = namesOnly(GAUL2, 'ADM2_NAME', 'ADM2_CODE', ['ADM1_NAME', 'ADM0_NAME']);
  var l1 = namesOnly(GAUL1, 'ADM1_NAME', 'ADM1_CODE', ['ADM0_NAME']);
  var found = l2.merge(l1).filter(ee.Filter.stringContains('k', q)).limit(6);
  found.reduceColumns(ee.Reducer.toList(3), ['label', 'code', 'level']).get('list')
    .evaluate(function(rows, err) {
      setBusy(false);
      if (err) { say(t('err') + '\n(' + err + ')'); return; }
      if (!rows || rows.length === 0) { say(t('noTown')); return; }
      status.style().set('shown', false);
      townList.add(ui.Label(t('choose'), {fontWeight: 'bold'}));
      rows.forEach(function(row) {
        townList.add(ui.Button({label: row[0], style: {stretch: 'horizontal'}, onClick: function() {
          townList.clear();
          var src = row[2] === 'ADM2_CODE' ? GAUL2 : GAUL1;
          goToDensestPart(src.filter(ee.Filter.eq(row[2], row[1])).geometry(), row[0]);
        }}));
      });
    });
}
// Inside the chosen district, jump to its most built-up spot (the main town)
function goToDensestPart(geom, label) {
  say(t('searching'), '#fff3b0');
  var ticket = runId;
  var built = ee.Image('JRC/GHSL/P2023A/GHS_BUILT_S/2020').select('built_surface')
    .focal_mean({radius: 1000, units: 'meters'});
  var best = built.addBands(ee.Image.pixelLonLat()).reduceRegion({
    reducer: ee.Reducer.max(3), geometry: geom, scale: 200, maxPixels: 1e9, bestEffort: true});
  best.evaluate(function(b, err) {
    if (ticket !== runId) { return; }
    if (err || !b || b.max1 === null) { say(t('err') + (err ? '\n(' + err + ')' : '')); return; }
    analyse(b.max1, b.max2, label);
  });
}

// ================================================================ HEAT FROM LANDSAT (any period)
// Hottest 10% of clear Landsat 8/9 views between start and end, in °C
function landsatHeat(start, end, area) {
  return ee.ImageCollection('LANDSAT/LC09/C02/T1_L2')
    .merge(ee.ImageCollection('LANDSAT/LC08/C02/T1_L2'))
    .filterBounds(area).filterDate(start, end)
    .filter(ee.Filter.lt('CLOUD_COVER', 60))
    .map(function(img) {
      var qa = img.select('QA_PIXEL');
      var clear = qa.bitwiseAnd(1 << 3).eq(0).and(qa.bitwiseAnd(1 << 4).eq(0));
      return img.select('ST_B10').multiply(0.00341802).add(149.0).subtract(273.15)
        .rename('heat').updateMask(clear);
    })
    .reduce(ee.Reducer.percentile([90])).rename('heat').clip(area);
}

// ================================================================ USE MY LOCATION
function useMyLocation() {
  say(t('locating'), '#fff3b0');
  ui.util.getCurrentPosition(function(point) {
    ee.Geometry(point).coordinates().evaluate(function(c, err) {
      if (err || !c) { say(t('noLoc')); return; }
      analyse(c[0], c[1]);
    });
  }, function() { say(t('noLoc')); });
}

// ================================================================ ANALYSIS
var selectedLayer = null;
var runId = 0;   // every check gets a ticket number; late answers from older checks are ignored
function analyse(lon, lat, placeName) {
  var myRun = ++runId;
  results.clear();
  townList.clear();
  lastResult = null;
  keyPanel.style().set('shown', false);
  selectedLayer = null;
  var layers = map.layers();
  while (layers.length() > 0) { layers.remove(layers.get(0)); }
  startLoading(placeName || (lat.toFixed(3) + ', ' + lon.toFixed(3)));
  showListView();   // on phones, show the progress and results list
  ui.url.set('lat', lat.toFixed(4));
  ui.url.set('lon', lon.toFixed(4));
  ui.url.set('place', placeName || '');
  ui.url.set('lang', LANG);

  var pt = ee.Geometry.Point([lon, lat]);
  var area = pt.buffer(SIZE_KM * 500).bounds();
  var utm = 'EPSG:' + ((lat >= 0 ? 32600 : 32700) + Math.floor((lon + 180) / 6) + 1);
  var proj20 = ee.Projection(utm).atScale(20);
  var now = ee.Date(Date.now());
  map.centerObject(area, 12);
  map.addLayer(ee.FeatureCollection([ee.Feature(area)]).style(
    {color: 'ffffff', fillColor: '00000000', width: 2, lineType: 'dashed'}), {}, 'Area checked (white dashed box)');

  // Heat: hottest 10% of clear Landsat views in the last 2 years (any climate)
  var heat = landsatHeat(now.advance(-2, 'year'), now, area);

  // Live land cover (last 6 months) and the same months YEARS_BACK years ago (D. tree loss)
  function landCover(end) {
    return ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1').filterBounds(area)
      .filterDate(end.advance(-6, 'month'), end).select('label').mode().clip(area);
  }
  var lc = landCover(now);
  var lcThen = landCover(now.advance(-YEARS_BACK, 'year'));
  // Real tree loss only: trees then -> buildings/roads (built) or bare ground now.
  // Trees -> water, crops or grass is ignored (seasonal plants, lakes filling up, label noise).
  var treesCut = lcThen.eq(1).and(lc.eq(6).or(lc.eq(7))).rename('cut');

  // TREES NOW = detailed 1 m canopy map (Meta/WRI, sees small garden and street trees)
  //             minus anything the live satellite says was cut since, with the live
  //             Dynamic World tree probability filling gaps where the 1 m map has no data.
  var canopyTiles = ee.ImageCollection('projects/sat-io/open-datasets/facebook/meta-canopy-height')
    .filterBounds(area);
  // mosaic() forgets the 1 m grid, so give it back the grid of the original tiles
  var canopyHeight = canopyTiles.mosaic().select(0)
    .setDefaultProjection(ee.Image(canopyTiles.first()).select(0).projection());
  var canopy1m = canopyHeight.gte(TREE_MIN_HEIGHT_M);
  var treeProbLive = ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1').filterBounds(area)
    .filterDate(now.advance(-6, 'month'), now).select('trees').mean();   // live tree likelihood 0–1
  var built = lc.eq(6).rename('built');
  var water = lc.eq(0).rename('water');
  var bare = lc.eq(7);

  // Global buildings: homes vs factories vs roads (EU GHSL, 10 m)
  var ghsl = ee.Image('JRC/GHSL/P2023A/GHS_BUILT_C/2018').select('built_characteristics');
  var residential = ghsl.gte(11).and(ghsl.lte(15));
  var nonResidential = ghsl.gte(21).and(ghsl.lte(25));
  var anyBuilt = ghsl.gte(11);
  var roads = ghsl.eq(5);

  // People (WorldPop, global)
  var pop = ee.ImageCollection('WorldPop/GP/100m/pop')
    .filterBounds(area).filter(ee.Filter.eq('year', 2020)).mosaic().rename('pop');

  // Ignore heat next to runways / big paved yards
  var nearBuilt20 = anyBuilt.focal_max({radius: 60, units: 'meters'}).reproject(proj20);
  var pavedFar = built.or(bare).and(nearBuilt20.not()).reproject(proj20);
  var bigPaved = pavedFar.selfMask().connectedPixelCount(256, true).gte(75).unmask(0).reproject(proj20);
  var nearBigPaved = bigPaved.focal_max({radius: 60, units: 'meters'}).reproject(proj20);

  // Where people live
  var nearBuildings = anyBuilt.focal_mean({radius: 60, kernelType: 'circle', units: 'meters'}).gt(0.15);
  var nearHomes = residential.focal_mean({radius: 50, kernelType: 'circle', units: 'meters'}).gt(0.1);
  var livedIn = nearBuildings.and(nearHomes).and(pop.gt(5)).and(nearBigPaved.not());
  var homeHeat = heat.updateMask(livedIn);
  var openSpace = anyBuilt.not().and(roads.not()).updateMask(livedIn).rename('open_space');

  // Neighbourhood squares
  var grid = area.coveringGrid(ee.Projection(utm), CELL_M);
  var cells = ee.Image.cat([homeHeat, treeProbLive.rename('treeprob'), treesCut, built, water]).reduceRegions({
    collection: grid, reducer: ee.Reducer.mean(), scale: 30, tileScale: 4});
  // Share of each square under tree canopy, read from the 1 m map at a 5 m sampling step
  // (about 10,000 sample points per square: accurate, and light enough to run quickly)
  cells = canopy1m.rename('canopy').reduceRegions({collection: cells,
    reducer: ee.Reducer.mean().setOutputs(['canopy']), scale: 5, tileScale: 4});
  cells = ee.Image.cat([residential.rename('res'), nonResidential.rename('nonres'),
                        anyBuilt.rename('bdens')]).reduceRegions({
    collection: cells, reducer: ee.Reducer.mean(), scale: 10, tileScale: 4});
  cells = openSpace.reduceRegions({collection: cells,
    reducer: ee.Reducer.mean().setOutputs(['open_space']), scale: 10, tileScale: 4});
  cells = pop.reduceRegions({collection: cells,
    reducer: ee.Reducer.sum().setOutputs(['pop']), scale: 100, tileScale: 4});

  var homes = cells
    .filter(ee.Filter.notNull(['heat', 'open_space', 'res', 'nonres', 'bdens', 'cut']))
    .filter(ee.Filter.gte('bdens', 0.2))
    .filter(ee.Filter.lt('water', 0.5))
    .map(function(f) {
      var res = ee.Number(f.get('res')), nonres = ee.Number(f.get('nonres'));
      return f.set('res_share', res.divide(res.add(nonres).max(0.000001)));
    })
    .filter(ee.Filter.gte('res_share', 0.6));

  var n = homes.size();
  var avgHeat = ee.Number(ee.Algorithms.If(n.gt(0), homes.aggregate_mean('heat'), 0));
  var maxPop = ee.Number(ee.Algorithms.If(n.gt(0), homes.aggregate_max('pop'), 1)).max(1);
  var packed = ee.Number(ee.Algorithms.If(n.gt(0),
    homes.reduceColumns(ee.Reducer.percentile([25]), ['open_space']).get('p25'), 0));

  homes = homes.map(function(f) {
    var h = ee.Number(f.get('heat'));
    // trees now = 1 m canopy share (live tree likelihood where the 1 m map has no data) minus trees cut since
    var canopyShare = ee.Algorithms.If(ee.Algorithms.IsEqual(f.get('canopy'), null),
      f.get('treeprob'), f.get('canopy'));
    var tr = ee.Number(canopyShare).subtract(ee.Number(f.get('cut'))).max(0);
    var gap = ee.Number(TARGET).subtract(tr).max(0);
    var c = f.geometry().transform('EPSG:4326', 1).centroid(1).coordinates();
    return f.set({
      score: h.subtract(avgHeat).max(0).multiply(ee.Number(f.get('pop')).divide(maxPop))
        .multiply(ee.Number(1).subtract(tr)),
      heat: h, trees: tr, cutHa: ee.Number(f.get('cut')).multiply(CELL_M * CELL_M / 10000), people: f.get('pop'),
      packed: ee.Number(f.get('open_space')).lte(packed),
      need: gap.multiply(CELL_M * CELL_M).divide(CANOPY_M2),
      lon: c.get(0), lat: c.get(1)
    });
  });
  var maxScore = ee.Number(ee.Algorithms.If(n.gt(0), homes.aggregate_max('score'), 1)).max(0.000001);
  homes = homes.map(function(f) {
    return f.set('priority', ee.Number(f.get('score')).divide(maxScore).multiply(100));
  });
  var props = ['priority', 'score', 'heat', 'trees', 'cutHa', 'people', 'packed', 'need', 'lat', 'lon'];
  var summary = ee.Dictionary({
    n: n,
    avgHeat: avgHeat,
    under5: homes.filter(ee.Filter.lt('trees', 0.05)).size(),
    cutHa: ee.Algorithms.If(n.gt(0), homes.aggregate_sum('cutHa'), 0),
    all: homes.toList(2000).map(function(f) { return ee.Feature(f).toDictionary(props); })
  });

  summary.evaluate(function(r, err) {
    if (myRun !== runId) { return; }   // the user already started a newer check
    if (err) { stopLoading(t('err') + '\n(' + err + ')', false); return; }
    if (!r.n) { stopLoading(t('none'), false); return; }
    r.zones = makeZones(r.all);
    lastResult = r;
    stopLoading(t('done'), true);
    drawMap(r, heat, canopy1m, treesCut.updateMask(livedIn));
    showResults(r);
    runTimeline(r, area, livedIn, heat, pt);   // past and future arrive about a minute later
  });
}

// ================================================================ PAST → NOW → FUTURE
// Past: Landsat heat in 2014–2016 vs now, keeping only the LOCAL change (weather removed), plus ERA5 climate change.
// Future: NASA NEX-GDDP-CMIP6 warming from the 2020s to the 2050s (middle path SSP2-4.5; high path SSP5-8.5),
// plus extra heat from trees that keep being cut at the recent rate if nothing is done.
function climateMean(scenario, y0, y1) {
  return ee.ImageCollection('NASA/GDDP-CMIP6')
    .filter(ee.Filter.inList('model', CLIMATE_MODELS))
    .filter(ee.Filter.eq('scenario', scenario))
    .filterDate(y0 + '-01-01', y1 + '-01-01')
    .filter(ee.Filter.calendarRange(15, 15, 'day_of_month'))   // one day per month keeps it fast
    .select('tasmax').reduce(ee.Reducer.percentile([90])).rename('tasmax');   // the hottest days, like our heat map
}
// ERA5-Land: monthly average of each day's highest air temperature (°C differences only)
var ERA5 = ee.ImageCollection('ECMWF/ERA5_LAND/MONTHLY_AGGR').select('temperature_2m_max');

function runTimeline(r, area, livedIn, heatNow, pt) {
  var thisYear = new Date().getFullYear();
  var nowD = ee.Date(Date.now());
  var pastStart = ee.Date.fromYMD(PAST_START, 1, 1), pastEnd = ee.Date.fromYMD(PAST_START + 3, 1, 1);
  var eraAt = function(img) {
    return ee.Image(img).reduceRegion({reducer: ee.Reducer.mean(), geometry: pt, scale: 11132})
      .get('temperature_2m_max');
  };
  // 1. Long-term warming trend since 1990 (°C per year), fitted to every month of ERA5.
  //    Warming between 2014–2016 and now = this trend × years passed (one unusual year cannot distort it).
  var t0 = ee.Date.fromYMD(CLIMATE_SINCE, 1, 1);
  var trend = eraAt(ERA5.filterDate(t0, nowD).map(function(img) {
    var years = ee.Date(img.get('system:time_start')).difference(t0, 'year');
    return ee.Image.constant(years).float().rename('x').addBands(img.rename('y'));
  }).reduce(ee.Reducer.linearFit()).select('scale').rename('temperature_2m_max'));
  // 2. Future: how much hotter the hottest days get by FUTURE_YEAR (NASA climate models)
  var warming = function(scenario) {
    return climateMean(scenario, FUTURE_YEAR - 5, FUTURE_YEAR + 5)
      .subtract(climateMean(scenario, thisYear - 5, thisYear + 5))
      .reduceRegion({reducer: ee.Reducer.mean(), geometry: pt, scale: 27830}).get('tasmax');
  };
  ee.Dictionary({slope: trend, w245: warming('ssp245'), w585: warming('ssp585')})
    .evaluate(function(res, err) {
      if (lastResult !== r) { return; }          // the user already moved to another place
      if (err || !res) { r.timeline = {failed: true}; showResults(r); return; }
      var ok = function(x) { return x !== null && x !== undefined && !isNaN(x); };
      var yearsBack = thisYear - (PAST_START + 1);                       // from the middle of 2014–2016 to now
      var climate = ok(res.slope) ? Math.max(0, res.slope) * yearsBack : 0;
      var w = ok(res.w245) ? res.w245 : null;
      var yearsLeft = FUTURE_YEAR - thisYear;
      r.zones.forEach(function(z) {
        // share of the zone losing trees each year, from the trees cut in the last YEARS_BACK years
        var lossPerYear = (z.cutHa / (z.km2 * 100)) / YEARS_BACK;
        var lostSince = Math.min(0.3, lossPerYear * yearsBack);
        z.past = z.heat - climate - lostSince * 10 * COOLING_PER_10PCT;
        if (w !== null) {
          var moreLoss = Math.min(z.trees, lossPerYear * yearsLeft);
          z.futNo = z.heat + w + moreLoss * 10 * COOLING_PER_10PCT;
          z.futYes = z.heat + w - z.cooling;
        }
      });
      r.timeline = {slope: ok(res.slope) ? res.slope : null, w245: w, w585: ok(res.w585) ? res.w585 : null};
      showResults(r);
    });
}

// ================================================================ A. HOTSPOT ZONES
// Join neighbouring high-priority squares into zones, then rank zones by total need.
function makeZones(all) {
  var cand = all.filter(function(d) { return d.priority >= 30; });
  if (cand.length === 0) {
    cand = all.slice().sort(function(a, b) { return b.score - a.score; }).slice(0, MAX_ZONES);
  }
  var parent = cand.map(function(d, i) { return i; });
  function find(i) { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; }
  for (var i = 0; i < cand.length; i++) {
    for (var j = i + 1; j < cand.length; j++) {
      var dy = (cand[i].lat - cand[j].lat) * 111320;
      var dx = (cand[i].lon - cand[j].lon) * 111320 * Math.cos(cand[i].lat * Math.PI / 180);
      if (Math.sqrt(dx * dx + dy * dy) <= CELL_M * 1.5) { parent[find(i)] = find(j); }
    }
  }
  var groups = {};
  cand.forEach(function(d, k) { var g = find(k); (groups[g] = groups[g] || []).push(d); });
  // Split very big groups into compact pieces of at most MAX_ZONE_KM2: start from the most
  // urgent square and grow outwards to the nearest touching squares, then repeat.
  var maxCells = Math.max(1, Math.round(MAX_ZONE_KM2 * 1e6 / (CELL_M * CELL_M)));
  var distM = function(a, b) {
    var dy = (a.lat - b.lat) * 111320;
    var dx = (a.lon - b.lon) * 111320 * Math.cos(a.lat * Math.PI / 180);
    return Math.sqrt(dx * dx + dy * dy);
  };
  var pieces = [];
  Object.keys(groups).forEach(function(g) {
    var left = groups[g].slice().sort(function(a, b) { return b.score - a.score; });
    while (left.length > 0) {
      var seed = left.shift();
      var piece = [seed];
      while (piece.length < maxCells) {
        var best = -1, bestD = Infinity;
        for (var k = 0; k < left.length; k++) {
          var touches = piece.some(function(p) { return distM(p, left[k]) <= CELL_M * 1.5; });
          if (!touches) { continue; }
          var dd = distM(seed, left[k]);
          if (dd < bestD) { bestD = dd; best = k; }
        }
        if (best < 0) { break; }
        piece.push(left.splice(best, 1)[0]);
      }
      pieces.push(piece);
    }
  });
  var zones = pieces.map(function(cs) {
    var sum = function(f) { return cs.reduce(function(s, d) { return s + f(d); }, 0); };
    var people = sum(function(d) { return d.people; });
    var w = people > 0 ? people : cs.length;
    var wavg = function(f) { return sum(function(d) { return f(d) * (people > 0 ? d.people : 1); }) / w; };
    var top = cs.slice().sort(function(a, b) { return b.score - a.score; })[0];
    var treesNow = wavg(function(d) { return d.trees; });
    return {
      cells: cs, top: top, score: sum(function(d) { return d.score; }),
      people: people, heat: wavg(function(d) { return d.heat; }),
      trees: treesNow, cutHa: sum(function(d) { return d.cutHa; }),
      need: sum(function(d) { return d.need; }),
      cooling: Math.max(0, TARGET - treesNow) * 10 * COOLING_PER_10PCT,
      packed: sum(function(d) { return d.packed ? 1 : 0; }) * 2 >= cs.length,
      km2: cs.length * CELL_M * CELL_M / 1e6
    };
  });
  zones.sort(function(a, b) { return b.score - a.score; });
  return zones.slice(0, MAX_ZONES);
}

// ================================================================ MAP DRAWING
var LETTERS = ['A', 'B', 'C', 'D', 'E'];
var ZONE_COLOURS = ['ff00ff', '00e5ff', 'ffa500', '7cff00', 'ffffff'];   // A pink, B cyan, C orange, D green, E white
function square(d) {
  var dLat = (CELL_M / 2) / 111320;
  var dLon = dLat / Math.cos(d.lat * Math.PI / 180);
  return ee.Feature(ee.Geometry.Rectangle([d.lon - dLon, d.lat - dLat, d.lon + dLon, d.lat + dLat]),
    {priority: Math.round(d.priority)});
}
function drawMap(r, heat, canopy1m, treesCut) {
  map.addLayer(heat, {min: 25, max: 55, palette: ['blue', 'cyan', 'green', 'yellow', 'orange', 'red']},
    'Ground temperature (hottest days)', false);
  map.addLayer(canopy1m.selfMask(), {palette: ['00ff00']}, 'Trees (1 m map, incl. small trees)', false);
  map.addLayer(ee.Image().float().paint(ee.FeatureCollection(r.all.map(square)), 'priority'),
    {min: 0, max: 60, palette: ['#ffffcc', '#fed976', '#fd8d3c', '#e31a1c', '#800026'], opacity: 0.7},
    'Need for trees (colours)');
  map.addLayer(treesCut.selfMask(), {palette: ['ff0000']},
    'Trees cut since ' + THEN_YEAR + ' near homes (red)');
  // Every square of a zone gets its own colour outline AND its zone letter, so no square is ambiguous.
  r.zones.forEach(function(z, i) {
    map.addLayer(ee.FeatureCollection(z.cells.map(square)).style(
      {color: ZONE_COLOURS[i], fillColor: '00000000', width: 3}), {}, 'Zone ' + LETTERS[i] + ' (outline)');
  });
  var labels = [];
  r.zones.forEach(function(z, i) {
    z.cells.forEach(function(d) {
      labels.push(text.draw(LETTERS[i], ee.Geometry.Point([d.lon, d.lat]), 15,
        {fontSize: d === z.top ? 32 : 24, textColor: 'ffffff', outlineColor: '000000',
         outlineWidth: 3, outlineOpacity: 0.9}));
    });
  });
  map.addLayer(ee.ImageCollection(labels).mosaic(), {}, 'Zone letters in every square');
  keyPanel.style().set('shown', true);
}
function highlight(z) {
  if (selectedLayer) { map.layers().remove(selectedLayer); }
  selectedLayer = ui.Map.Layer(ee.FeatureCollection(z.cells.map(square)).style(
    {color: 'ffff00', fillColor: 'ffff0033', width: 4}), {}, 'Selected zone');
  map.layers().add(selectedLayer);
  map.setCenter(z.top.lon, z.top.lat, 15);
  showMapView();   // on phones, jump to the map
}

// ================================================================ RESULTS (cards)
function heatIdx(c) { return c >= 45 ? 0 : c >= 40 ? 1 : c >= 35 ? 2 : 3; }
function treeIdx(p) { return p < 5 ? 0 : p < 15 ? 1 : p < 30 ? 2 : 3; }
function heatWord(c) { return t('heatW')[heatIdx(c)]; }
function treeWord(p) { return t('treeW')[treeIdx(p)]; }
function plus(x) { return (x >= 0 ? '+' : '') + x.toFixed(1); }
function roundTo(x, k) { return Math.round(x / k) * k; }
function nice(x) { return Number(x).toLocaleString(); }

function showResults(r) {
  results.clear();
  var zoneNeed = r.zones.reduce(function(s, z) { return s + z.need; }, 0);
  var zonePeople = r.zones.reduce(function(s, z) { return s + z.people; }, 0);
  var findings = t('fHeat')(Math.round(r.avgHeat)) + '\n' + t('fTrees')(Math.round(100 * r.under5 / r.n)) +
    (r.cutHa >= 0.5 ? '\n' + t('fLoss')(r.cutHa.toFixed(1)) : '') +
    (zoneNeed > 0 ? '\n' + t('fPlan')(nice(roundTo(zoneNeed, 100)), nice(roundTo(zonePeople, 100))) : '');
  var tl = r.timeline;
  if (!tl) {
    findings += '\n' + t('tLoading');
  } else if (!tl.failed) {
    if (tl.slope !== null && tl.slope !== undefined) {
      findings += '\n' + (tl.slope * 10 >= 0.1 ? t('fClimate')(plus(tl.slope * 10)) : t('fClimateFlat'));
    }
    if (tl.w245 !== null && tl.w245 !== undefined) {
      findings += '\n' + t('fFuture')(plus(tl.w245), plus(Math.max(tl.w585 || tl.w245, tl.w245)));
    }
  }
  results.add(ui.Label(t('found'), H));
  results.add(ui.Label(findings, P));
  results.add(listenLink(t('found') + '. ' + findings.replace(/•/g, '')));
  results.add(ui.Label(t('zonesTitle'), H));
  results.add(ui.Label(t('zonesHint'), {fontSize: '12px', color: 'gray'}));

  r.zones.forEach(function(z, i) {
    var treePct = Math.round(z.trees * 100);
    var lines = [
      t('heatLine')(heatWord(z.heat), Math.round(z.heat)) + ' · ' + treeWord(treePct) + ' (' + treePct + '%)',
      t('people')(nice(roundTo(z.people, 10))),
      t('size')(z.km2.toFixed(z.km2 < 1 ? 2 : 1))
    ];
    if (z.cutHa >= 0.5) { lines.push(t('lost')(z.cutHa.toFixed(1))); }
    lines.push(z.packed ? t('doPacked') : t('doOpen'));
    lines.push(t('needed')(nice(roundTo(z.need, 50)), z.cooling.toFixed(1)));
    var title = (['🥇', '🥈', '🥉'][i] || '📍') + ' ' + t('zone')(LETTERS[i], i);

    var needRounded = roundTo(z.need, 50);
    var story = needRounded >= 50
      ? t('story')(t('heatS')[heatIdx(z.heat)], Math.round(z.heat), t('treeS')[treeIdx(treePct)], nice(needRounded))
      : t('storyOk');
    var card = ui.Panel({style: {border: '1px solid #ccc', padding: '8px', margin: '6px 0',
      backgroundColor: i === 0 ? '#fff4f4' : 'white'}});
    card.add(ui.Label(title, {fontSize: '16px', fontWeight: 'bold', margin: '0 0 4px 0', backgroundColor: CLEAR}));
    card.add(ui.Label('👉 ' + story, {fontSize: '15px', fontWeight: 'bold', whiteSpace: 'pre-wrap',
      margin: '0 0 6px 0', color: '#7a0019', backgroundColor: CLEAR}));
    card.add(ui.Label(lines.join('\n'), {fontSize: '13px', whiteSpace: 'pre-wrap', margin: '0', backgroundColor: CLEAR}));
    var timeLines = [];
    var dec = function(x) { return x.toFixed(1); };
    if (z.past !== undefined && z.past !== null) { timeLines.push(t('past')(dec(z.past))); }
    if (r.timeline && !r.timeline.failed) { timeLines.push(t('nowT')(dec(z.heat))); }
    if (z.futNo !== undefined) { timeLines.push(t('futNo')(dec(z.futNo)), t('futYes')(dec(z.futYes))); }
    if (timeLines.length > 1) {
      card.add(ui.Panel([
        ui.Label(t('timeTitle'), {fontSize: '13px', fontWeight: 'bold', margin: '0 0 2px 0', backgroundColor: CLEAR}),
        ui.Label(timeLines.join('\n'), {fontSize: '13px', whiteSpace: 'pre-wrap', margin: '0', backgroundColor: CLEAR})
      ], null, {backgroundColor: '#eef4ff', padding: '6px', margin: '6px 0 0 0'}));
      if (z.futNo !== undefined) {
        card.add(ui.Label(t('treeDiff')(dec(z.futNo - z.futYes)), {fontSize: '14px', fontWeight: 'bold',
          color: '#1b6e20', whiteSpace: 'pre-wrap', margin: '6px 0 0 0', backgroundColor: CLEAR}));
      }
    }
    var gmaps = ui.Label({value: t('gmaps'),
      targetUrl: 'https://www.google.com/maps/search/?api=1&query=' + z.top.lat.toFixed(5) + ',' + z.top.lon.toFixed(5),
      style: {fontSize: '13px', margin: '12px 0 0 8px', backgroundColor: CLEAR}});
    card.add(ui.Panel([
      ui.Button({label: t('showMap'), onClick: function() { highlight(z); }}),
      gmaps,
      listenLink(title + '. ' + story + ' ' + timeLines.join('. '))
    ], ui.Panel.Layout.flow('horizontal'), {backgroundColor: CLEAR}));
    results.add(card);
  });
  results.add(ui.Label(t('share'), {fontSize: '12px', color: '#555', whiteSpace: 'pre-wrap', margin: '10px 8px 0 8px'}));
  results.add(downloadLink(r));
}

// Download: every neighbourhood square as a table (zone, priority, heat, trees, people, trees needed, map link)
function downloadLink(r) {
  var dl = ui.Label({value: t('download'), style: {fontSize: '13px', fontWeight: 'bold', margin: '8px', shown: false}});
  if (r.csvUrl) { dl.setUrl(r.csvUrl); dl.style().set('shown', true); return dl; }
  var zoneOf = {};
  r.zones.forEach(function(z, i) { z.cells.forEach(function(d) { zoneOf[d.lat + ',' + d.lon] = LETTERS[i]; }); });
  var rows = r.all.slice().sort(function(a, b) { return b.priority - a.priority; }).map(function(d, k) {
    var row = {
      rank: k + 1,
      zone: zoneOf[d.lat + ',' + d.lon] || '',
      priority_0_100: Math.round(d.priority),
      ground_temp_C: Math.round(d.heat * 10) / 10,
      tree_cover_pct: Math.round(d.trees * 1000) / 10,
      people: Math.round(d.people),
      trees_needed_for_30pct: roundTo(d.need, 10),
      treatment: d.packed ? 'street trees + cool roofs' : 'plant trees in open plots and streets',
      lat: Math.round(d.lat * 1e5) / 1e5,
      lon: Math.round(d.lon * 1e5) / 1e5,
      google_maps: 'https://www.google.com/maps/search/?api=1&query=' + d.lat.toFixed(5) + ',' + d.lon.toFixed(5)
    };
    row['trees_cut_since_' + THEN_YEAR + '_ha'] = Math.round(d.cutHa * 10) / 10;
    return ee.Feature(null, row);
  });
  var cols = ['rank', 'zone', 'priority_0_100', 'ground_temp_C', 'tree_cover_pct', 'people',
              'trees_needed_for_30pct', 'treatment', 'trees_cut_since_' + THEN_YEAR + '_ha', 'lat', 'lon', 'google_maps'];
  ee.FeatureCollection(rows).getDownloadURL('CSV', cols, 'tree_doctor_results', function(url, err) {
    if (err || !url) { return; }
    r.csvUrl = url;
    dl.setUrl(url);
    dl.style().set('shown', true);
  });
  return dl;
}
// B. Listen: opens Google Translate with the text in the chosen language; press its speaker button
function listenLink(textToRead) {
  var lang = SPEECH[LANG];
  return ui.Label({value: t('listen'),
    targetUrl: 'https://translate.google.com/?sl=' + lang + '&tl=' + (lang === 'en' ? 'hi' : 'en') +
      '&op=translate&text=' + encodeURIComponent(textToRead),
    style: {fontSize: '13px', margin: '12px 0 0 8px', backgroundColor: CLEAR}});
}

// ================================================================ INPUTS
map.onClick(function(c) { analyse(c.lon, c.lat); });
townBtn.onClick(searchTown);
coordBtn.onClick(function() {
  var p = (coordBox.getValue() || '').split(',');
  var lat = parseFloat(p[0]), lon = parseFloat(p[1]);
  if (isNaN(lat) || isNaN(lon)) { say(t('badCoord')); return; }
  analyse(lon, lat);
});

// If the app was opened from a shared link (…#lat=..&lon=..), show that place straight away
var startLat = parseFloat(String(ui.url.get('lat', '')));
var startLon = parseFloat(String(ui.url.get('lon', '')));
if (!isNaN(startLat) && !isNaN(startLon)) {
  analyse(startLon, startLat, String(ui.url.get('place', '')) || undefined);
}
