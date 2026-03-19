// Bootstrapping of mapping by random sampling
var compositeOfInterest = ee.Image("users/kai86liang/Final_root_less/Composite_root"),
    sampled_log = ee.FeatureCollection("users/kai86liang/Final_root_less/rnm_log_K10_out");

Map.addLayer(sampled_log,{},'Raw Sampled Points',false);

var seedForBootstrapping=ee.List.sequence(1,100,1).getInfo();
print(seedForBootstrapping)
// var seedToUse=1

// var outname=ee.String('rnm_seed_').cat(ee.Number(seedToUse).format('%03d'))
// print(outname)
// var outdir='users/kai86liang/Test'
// var combine=ee.String('users/kai86liang/Test/rnm_seed_').cat(ee.Number(seedToUse).format('%03d'))
// print(combin

var Mapcollections=seedForBootstrapping.map(function(seedToUse){

  var sampledBactFungRatioPoint = sampled_log.randomColumn('random',seedToUse);
  var sampledBactFungRatioPoints = sampledBactFungRatioPoint.filter(ee.Filter.lt('random', 0.9));
  
  // Print info on the sampled potential carbon points
  // print('Bacterial Fungal Ratio Points',sampledBactFungRatioPoints);
  // Map.addLayer(sampledBactFungRatioPoints,{},'final_SWe',false);
   
  // Instantiate classifiers of interest
  var randomForestClassifier_sampledBBRPoints = ee.Classifier.smileRandomForest({
  	numberOfTrees: 500,
  	variablesPerSplit: 2,
  	bagFraction: 0.632,
  	seed: 0
  }).setOutputMode('REGRESSION');
 
  // Train the classifers with the sampled points
  var trainedClassifier_sampledBactFungRatioPoints = randomForestClassifier_sampledBBRPoints.train({
    features:sampledBactFungRatioPoints,
    classProperty:'rnm',
    inputProperties:compositeOfInterest.bandNames()
  });
  
  // Apply the classifier to the composite to make the final map
  // var compositeOfInterestBandsAdded = compositeOfInter;
  var compositeOfInterestBandsAdded = compositeOfInterest;
  
  var newImageBandName = 'rnm_c';
  var finalMap = compositeOfInterestBandsAdded.classify(trainedClassifier_sampledBactFungRatioPoints,newImageBandName);
  
  //var finalMap1min=finalMap1.select('BactFungRatio').min()
  
  var vibgYOR = ['330044','220066','1133cc','33dd00','ffda21','ff6622','d10000'];
  // print ('finalMap',finalMap)
  
  var finalMap1 = finalMap.exp();
  
  // Create an unbounded geometry for export
  var unboundedGeo = ee.Geometry.Polygon([-180, 88, 0, 88, 180, 88, 180, -88, 0, -88, -180, -88], null, false);
  var outname='rnm_full_seed_'+ seedToUse;
  var outdir='users/kai86liang/Final_root_less/rnm_full_seed_'+seedToUse;
  // Export the maps to Ass
  Export.image.toAsset({
  	image: finalMap1,
  	description: outname,
  	assetId: outdir,
  	region: unboundedGeo,
    crs:'EPSG:4326',
    crsTransform:[0.008333333333333333,0,-180,0,-0.008333333333333333,90],
  	maxPixels: 1e13
  });
  
  // Map.addLayer(finalMap1,{palette:vibgYOR,min:2,max:18},'Map of rnm');
  return finalMap1;
})
  
  
print(Mapcollections)

var Mapcollectionsall=ee.ImageCollection(Mapcollections)
print(Mapcollectionsall.first())

var Mean_Map = Mapcollectionsall.mean()
print('Mean_Map',Mean_Map)

var vibgYOR = ['330044','1133cc','33dd00','ffda21','ff6622','d10000'];
Map.addLayer(Mean_Map,{palette:vibgYOR,min:0.2,max:2},'Map of rnm');

var reducer1 = ee.Reducer.mean();
var reducers = reducer1.combine({reducer2: ee.Reducer.median(), sharedInputs: true})
                       .combine({reducer2: ee.Reducer.max(), sharedInputs: true})
                       .combine({reducer2: ee.Reducer.min(), sharedInputs: true})
                       .combine({reducer2: ee.Reducer.stdDev(), sharedInputs: true});

var results =Mapcollectionsall.reduce(reducers)
print('Mean and SD',results)

var CV= results.select('rnm_c_stdDev').divide(results.select('rnm_c_mean'))
print(CV)
Map.addLayer(CV, {palette:['yellow','green','blue'],min:0,max:0.1},'CV')

var unboundedGeo = ee.Geometry.Polygon([-180, 88, 0, 88, 180, 88, 180, -88, 0, -88, -180, -88], null, false);
// Export the maps to Ass
Export.image.toAsset({
	image: Mean_Map,
	description: 'Boot_sample_mean_rnm',
	assetId: 'users/kai86liang/Final_root_less/Boot_sample_mean_rnm',
	region: unboundedGeo,
  crs:'EPSG:4326',
  crsTransform:[0.008333333333333333,0,-180,0,-0.008333333333333333,90],
	maxPixels: 1e13
});

// Export the maps of RF CV and then plot in R and analyze 
Export.image.toDrive({
	image: Mean_Map,
	description: 'Boot_sample_mean_rnm_drive',
	region: unboundedGeo,
  crs:'EPSG:4326',
  crsTransform:[0.008333333333333333,0,-180,0,-0.008333333333333333,90],
	maxPixels: 1e13
});

// Export the maps to Ass
Export.image.toAsset({
	image: CV,
	description: 'Boot_sample_CV_rnm',
	assetId: 'users/kai86liang/Final_root/Boot_sample_CV_rnm',
	region: unboundedGeo,
  crs:'EPSG:4326',
  crsTransform:[0.008333333333333333,0,-180,0,-0.008333333333333333,90],
	maxPixels: 1e13
});


// Export the maps of RF CV and then plot in R and analyze 
Export.image.toDrive({
	image: CV,
	description: 'Boot_sample_CV_rnm_drive',
	region: unboundedGeo,
  crs:'EPSG:4326',
  crsTransform:[0.008333333333333333,0,-180,0,-0.008333333333333333,90],
	maxPixels: 1e13
});

//Training and testing
var Mapcollections_Points=seedForBootstrapping.map(function(seedToUse){

  var sampledBactFungRatioPoint = sampled_log.randomColumn('random',seedToUse);
  var sampledBactFungRatioPoints = sampledBactFungRatioPoint.filter(ee.Filter.lt('random', 0.9));
  
 
  // Instantiate classifiers of interest
  var randomForestClassifier_sampledBBRPoints = ee.Classifier.smileRandomForest({
  	numberOfTrees: 500,
  	variablesPerSplit: 2,
  	bagFraction: 0.632,
  	seed: 0
  }).setOutputMode('REGRESSION');
  // Kai: top model is rfVPS5; thus change variablesPerSplit: 5
  
  
  // Train the classifers with the sampled points
  var trainedClassifier_sampledBactFungRatioPoints = randomForestClassifier_sampledBBRPoints.train({
    features:sampledBactFungRatioPoints,
    classProperty:'rnm',
    inputProperties:compositeOfInterest.bandNames()
  });
  
  // var compositeOfInterestBandsAdded = compositeOfInter;
  var compositeOfInterestBandsAdded = compositeOfInterest;
  
  var newImageBandName = 'rnm_c';
  var predictedTraining = sampled_log.classify(trainedClassifier_sampledBactFungRatioPoints,newImageBandName);
  
  var sampleTraining = predictedTraining.select(['rnm', 'rnm_c']);
  
  var observationTraining = ee.Array(sampleTraining.aggregate_array('rnm'));
  var predictionTraining = ee.Array(sampleTraining.aggregate_array('rnm_c'));
  // Compute residuals
  var residualsTraining = observationTraining.subtract(predictionTraining);
  // Compute RMSE with equation, print it
  var rmseTraining = residualsTraining.pow(2).reduce('mean', [0]).sqrt();
  
  ///R2
  var sampleTraining2 = sampleTraining.map(function(feature) {
    return feature.set('constant', 1);
  });
  
  
  //doing linear regression fit
  var linearRegression = ee.Dictionary(sampleTraining2.reduceColumns({
    reducer: ee.Reducer.linearRegression({
      numX: 2,
      numY: 1
    }),
    selectors: ['constant', 'rnm', 'rnm_c']
  }));
  
  // Convert the coefficients array to a list.
  var coefList = ee.Array(linearRegression.get('coefficients')).toList();
  // Extract the y-intercept and slope.
  var yInt = ee.List(coefList.get(0)).get(0); // y-intercept
  var slope = ee.List(coefList.get(1)).get(0); // slope
  
  var y2 = ee.Array(ee.List(observationTraining).getInfo().map(function(x) {
    var y = ee.Number(x).multiply(slope).add(yInt);
    return y;
  }));
  
  
  var mainValueMean=ee.Number(predictionTraining.reduce(ee.Reducer.mean(), [0]).get([0]));
  
  var totalSumofS=ee.Number(predictionTraining.subtract(mainValueMean).pow(2).reduce('sum',[0]).get([0]));
  
  var Residual=ee.Number(y2.subtract(predictionTraining).pow(2).reduce('sum',[0]).get([0]))
  
  var finalR2=ee.Number(1).subtract(Residual.divide(totalSumofS));

  return finalR2;
})

print(Mapcollections_Points)
var finalR2=ee.Number(ee.Array(Mapcollections_Points).reduce('mean', [0]))
print('finalR2',finalR2)

