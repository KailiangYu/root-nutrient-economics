// Bootstrapping of mapping by biome
var compositeToUse = ee.Image("users/kai86liang/Final_root_less/Composite_root"),
    sampledPoints = ee.FeatureCollection("users/kai86liang/Final_root_less/rnm_log_K10_out");

var wwfBiomes = compositeToUse.select(['Biome']);

print('Sample size', sampledPoints);

print('compositeToUse',compositeToUse)

var compositeToBootstrap = compositeToUse;

var wwfBiomesSampled = wwfBiomes.sampleRegions(sampledPoints);
var collToBootsrap = wwfBiomesSampled;

// !! Instantiate the classifier of interest, exactly as you have modelled it elsewhere
var randomForestClassifier = ee.Classifier.smileRandomForest({
	numberOfTrees: 500,
	variablesPerSplit: 4,
	bagFraction: 0.632,
	seed: 0
}).setOutputMode('REGRESSION');

// !! Make a list of covariates to use for modelling
var covarsToUse = sampledPoints.first().propertyNames().removeAll([
	'rnm',
	'system:index',
	'Pixel_Long',
	'Pixel_Lat',
]);

print('Covariates being used', covarsToUse);

// !! Input the name of the property being modelled
var propToModel = 'rnm';

// !! Input the name of the stratification variable
var stratVariable = 'Biome';

// Make a list of seeds to use for the bootstrapping
function JSsequence(i) {return i ? JSsequence(i - 1).concat(i) : []}
// !! Input the number of bootstraps that you would like to perform
var numberOfBootstrapIterations = 100;
var seedsForBootstrapping = JSsequence(numberOfBootstrapIterations);

// Create an unbounded geometry for exports
var unboundedGeo = ee.Geometry.Polygon([-180, 88, 0, 88, 180, 88, 180, -88, 0, -88, -180, -88], null, false);

// Boostrap the collection before training the classififers, then apply the classifier to create
// the bootstrapped images

// !! Input a base image name for exporting and organizational purposes
var bootstrapFileName = 'rnm_C';

// !! Input the recipient image collection path; note: this image collection should be created before this
// !! script is run to ensure the bootstrapped images will be loaded into them.
// !! Always make sure to adjust the paths of your assets
var recipientImageCollectionPath = 'users/kai86liang/Final_root_less';

// Load the bootstrap function
var bootStrap = require('users/kai86liang/tool:Stratified_Bootstrap_FeatureCollection.js');

// Make a function to pad numbers with leading zeroes for formatting purposes
function pad(num, size) {
    var s = num+"";
    while (s.length < size) s = "0" + s;
    return s;
}

// !! When first running the script, uncomment and run this initial section below; then, comment it out and run the
// !! remainder of the script.

// ~~~~ This section should be run first ~~~~

var Mapcollections=seedsForBootstrapping.map(function(seedToUse) {

	var boostrapSampleForTraining = bootStrap.makeStratBootStrapFeatureCollection(collToBootsrap,stratVariable, 100, seedToUse);

// print(boostrapSampleForTraining,'test')

	// Train the classifers with the sampled points
	var trainedBootstrapClassifier = randomForestClassifier.train({
		features: boostrapSampleForTraining,
		classProperty: propToModel,
		inputProperties: covarsToUse
	});

  var bootstrapFileName = 'rnm_C';
	// Apply the classifier to the composite to make the final map
	var bootstrapImage = compositeToBootstrap.classify(trainedBootstrapClassifier,bootstrapFileName);

	// Export the image
// 	Export.image.toAsset({
// 		image: bootstrapImage,
// 		description: bootstrapFileName + pad(seedToUse,3),
// 		assetId: recipientImageCollectionPath + '/' + bootstrapFileName + pad(seedToUse,3),
// 		region: unboundedGeo,
// 		crs: 'EPSG:4326',
// 		crsTransform: [0.008333333333333333, 0, -180, 0, -0.008333333333333333, 90],
// 		maxPixels: 1e13
// 	});

var bootstrapImage=bootstrapImage.exp()
return bootstrapImage;
});

print(Mapcollections)

var Mapcollectionsall=ee.ImageCollection(Mapcollections)
print(Mapcollectionsall.first())

var Mean_Map = Mapcollectionsall.mean()
print(Mean_Map)

// var Mean_Map1 = Mean_Map.exp();

var vibgYOR = ['330044','1133cc','33dd00','ffda21','ff6622','d10000'];
Map.addLayer(Mean_Map,{palette:vibgYOR,min:2,max:18},'Map of rnm boot biome');


var reducer1 = ee.Reducer.mean();
var reducers = reducer1.combine({reducer2: ee.Reducer.median(), sharedInputs: true})
                       .combine({reducer2: ee.Reducer.max(), sharedInputs: true})
                       .combine({reducer2: ee.Reducer.min(), sharedInputs: true})
                       .combine({reducer2: ee.Reducer.stdDev(), sharedInputs: true});


var results =Mapcollectionsall.reduce(reducers)
print('Mean and SD',results)


var CV= results.select('rnm_C_stdDev').divide(results.select('rnm_C_mean'))
print(CV)
Map.addLayer(CV, {palette:vibgYOR,min:0,max:0.1},'CV')

// Export the maps to Ass
Export.image.toAsset({
	image: Mean_Map,
	description: 'Boot_biome_mean_rnm',
	assetId: 'users/kai86liang/Final_root_less/Boot_biome_mean_rnm',
	region: unboundedGeo,
  crs:'EPSG:4326',
  crsTransform:[0.008333333333333333,0,-180,0,-0.008333333333333333,90],
	maxPixels: 1e13
});

// Export the maps to Ass
Export.image.toAsset({
	image: CV,
	description: 'Boot_biome_CV_rnm',
	assetId: 'users/kai86liang/Final_root_less/Boot_biome_CV_rnm',
	region: unboundedGeo,
  crs:'EPSG:4326',
  crsTransform:[0.008333333333333333,0,-180,0,-0.008333333333333333,90],
	maxPixels: 1e13
});

// Export the maps of RF CV and then plot in R and analyze 
Export.image.toDrive({
	image: Mean_Map,
	description: 'Boot_biome_mean_rnm_drive',
	region: unboundedGeo,
  crs:'EPSG:4326',
  crsTransform:[0.008333333333333333,0,-180,0,-0.008333333333333333,90],
	maxPixels: 1e13
});
