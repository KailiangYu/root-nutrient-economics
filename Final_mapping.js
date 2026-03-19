// Use best random forest model for mapping
var compositeOfInterest = ee.Image("users/kai86liang/Final_root_less/Composite_root"),
    sampled_log = ee.FeatureCollection("users/kai86liang/Final_root_less/lnm_log_K10_out");

print(sampled_log,'sampled_log')

Map.addLayer(sampled_log,{},'Raw Sampled Points',false);

print('compositeOfInterest',compositeOfInterest)

// Instantiate classifiers of interes
var randomForestClassifier_sampledBBRPoints = ee.Classifier.smileRandomForest({
	numberOfTrees: 500,
	variablesPerSplit: 2,
	bagFraction: 0.632,
	seed: 0
}).setOutputMode('REGRESSION');


// Make a list of covariates to use
var covarsToUse_Current = sampled_log.first().propertyNames().removeAll([
	'lnm',
	'system:index',
	'Pixel_Long',
	'Pixel_Lat',
]);
print('Covariates being used - Current Maps', covarsToUse_Current);


// Train the classifers with the sampled points
var trainedClassifier_sampledRootPoints = randomForestClassifier_sampledBBRPoints.train({
  features:sampled_log,
  classProperty:'lnm',
  inputProperties:covarsToUse_Current
});


// Apply the classifier to the composite to make the final map


var newImageBandName = 'lnm_c';
var finalMap = compositeOfInterest.classify(trainedClassifier_sampledRootPoints,newImageBandName);


print(finalMap,'finalMap')

// var finalMap1=finalMap.expression('1/ratio', {'ratio': finalMap.select('Root')});

var vibgYOR = ['330044','220066','1133cc','33dd00','ffda21','ff6622','d10000'];


//var finalMap1min=finalMap1.select('Root').min()

var vibgYOR = ['330044','220066','1133cc','33dd00','ffda21','ff6622','d10000'];
print ('finalMap',finalMap)

var finalMap1 = finalMap.exp();

Map.addLayer(finalMap1,{palette:vibgYOR,min:0.2,max:2},'Map of lnm');


//Training and testing

var predictedTraining = sampled_log.classify(trainedClassifier_sampledRootPoints,newImageBandName);


print('predictedTraining',predictedTraining)

var sampleTraining = predictedTraining.select(['lnm', 'lnm_c']);
print(sampleTraining)

// Create chart, print it
var chartTraining = ui.Chart.feature.byFeature(sampleTraining, 'lnm', 'lnm_c')
.setChartType('ScatterChart').setOptions({
title: 'Predicted vs Observed - Training data ',
hAxis: {'title': 'observed'},
vAxis: {'title': 'predicted'},
pointSize: 3,
trendlines: { 0: {showR2: true, visibleInLegend: true} ,
1: {showR2: true, visibleInLegend: true}}});
print(chartTraining);


// **** Compute RSME **** 
// Get array of observation and prediction values 
// pred=a*obs+b
var observationTraining = ee.Array(sampleTraining.aggregate_array('lnm'));
var predictionTraining = ee.Array(sampleTraining.aggregate_array('lnm_c'));
// Compute residuals
var residualsTraining = observationTraining.subtract(predictionTraining);
// Compute RMSE with equation, print it
var rmseTraining = residualsTraining.pow(2).reduce('mean', [0]).sqrt();
print('Training RMSE', rmseTraining);

///R2
var sampleTraining2 = sampleTraining.map(function(feature) {
  return feature.set('constant', 1);
});

print('sampleTraining2',sampleTraining2)

//doing linear regression fit
var linearRegression = ee.Dictionary(sampleTraining2.reduceColumns({
  reducer: ee.Reducer.linearRegression({
    numX: 2,
    numY: 1
  }),
  selectors: ['constant', 'lnm', 'lnm_c']
}));

// Convert the coefficients array to a list.
var coefList = ee.Array(linearRegression.get('coefficients')).toList();
// Extract the y-intercept and slope.
var yInt = ee.List(coefList.get(0)).get(0); // y-intercept
var slope = ee.List(coefList.get(1)).get(0); // slope
print(yInt,slope)
print(ee.List(observationTraining).getInfo())

var y2 = ee.Array(ee.List(observationTraining).getInfo().map(function(x) {
  var y = ee.Number(x).multiply(slope).add(yInt);
  return y;
}));
print('y2',y2)


var mainValueMean=ee.Number(predictionTraining.reduce(ee.Reducer.mean(), [0]).get([0]));
print("Obs",observationTraining)
print("mean",mainValueMean)

var totalSumofS=ee.Number(predictionTraining.subtract(mainValueMean).pow(2).reduce('sum',[0]).get([0]));
print('Total sum',totalSumofS)

var Residual=ee.Number(y2.subtract(predictionTraining).pow(2).reduce('sum',[0]).get([0]))
print('Residual',Residual)

var finalR2=ee.Number(1).subtract(Residual.divide(totalSumofS));
print('finalR2',finalR2)

// Create an unbounded geometry for export
var unboundedGeo = ee.Geometry.Polygon([-180, 88, 0, 88, 180, 88, 180, -88, 0, -88, -180, -88], null, false);

// Kai: Export the maps to driver and then plot in R and analyze 
Export.image.toDrive({
	image: finalMap1,
	description: 'map_lnmO_full_drive',
	region: unboundedGeo,
  crs:'EPSG:4326',
  crsTransform:[0.008333333333333333,0,-180,0,-0.008333333333333333,90],
	maxPixels: 1e13
});
