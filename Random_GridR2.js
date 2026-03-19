// Input root nutrient data with environmental variables
var sampledPoints_log = ee.FeatureCollection("users/kai86liang/Final_root_less/nullsDropped_rnm_log");

print(sampledPoints_log);
Map.addLayer(sampledPoints_log,{},'Sample Points',false);

//tune grid for hyperpara of numtrees and Split
var numtrees=ee.List([500])
var variablesPerSplit_pars=ee.List.sequence(2,10,2)

print(numtrees)
print(variablesPerSplit_pars)

var alltrees=numtrees.map(function(x){
  var variableSize=variablesPerSplit_pars.size()
  return ee.List.repeat(x,variableSize)
})

var Alltrees=alltrees.flatten()
print('Alltrees',Alltrees)
print('Alltrees_Size',Alltrees.size())

var treeSize=numtrees.size()
var Allvariables=ee.List.repeat(variablesPerSplit_pars,treeSize)
var Allvariables=Allvariables.flatten()
var Size=Alltrees.size().subtract(1)
print('Allvariables',Allvariables)

var listToMap=ee.List.sequence(0,Size,1)
print(listToMap.size())
var listToMaps=listToMap.getInfo()
print(listToMaps)
print(Allvariables.get(0))

// var ModelName=ee.String('rf_VPS').cat(ee.Number(Allvariables.get(0)).format('%02d')).cat('_Trees').cat(ee.Number(Alltrees.get(0)).format('%03d'))
// print(ModelName)

var ListModelName=function(x){
  var ModelName=ee.String('rf_VPS').cat(ee.Number(Allvariables.get(x)).format('%02d')).cat('_Trees').cat(ee.Number(Alltrees.get(x)).format('%03d')).cat('_less_VIF15_cover')
  return ModelName
}

var listOfModelNames=listToMap.map(ListModelName)
var listOfModelNames=listOfModelNames.getInfo()
print('listmodels',listOfModelNames)

// Instantiate a client side list of numbers, each representing the model
// that is being cross validated (starting at 0)
// var listToMap = [0, 1, 2, 3, 4, 5,6,7,8,9,10];
// print('listToMap',listToMap)


var covarsToUse =ee.List(["LPM","CEC_030","Global_Biomass_IPCC","Ks_030","Npp","PH_030",
"SLA","SN_030","TP_030","Tree_Density","slope","Biome","LandCoverClass_Barren","LandCoverClass_Deciduous_Broadleaf_Trees",           
"LandCoverClass_Shrubs","AM","Aridity_Index","Annual_Mean_Temperature","LNM","nfix"])

print('Covariates being used', covarsToUse);

// Identify the covariate of interest for all featur collections being modeled
var modelledVariable = 'rnm';


// Instantiate the names of the recpipient folder to hold all of the outputs for all feature collections being modeled
var nameOfFolder_BactFungRatio = 'users/kai86liang/GridTune';


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Perform K-Fold CV on the model to assess its rigor
var KFoldCVwManualFC = require('users/kai86liang/tool:KFoldCVManualFC.js');
var computeR2 = require('users/kai86liang/tool:Compute_R2_from_CV.js');
var k = 10;


// var mN=1
var ReportR2=function(modelledVariable){
  var computeR2 = require('users/kai86liang/tool:Compute_R2_from_CV.js');
 
  var ExportR2=ee.FeatureCollection(listToMaps.map(function(mN) {
  var classifierToUse =ee.Classifier.smileRandomForest({
    	numberOfTrees: Alltrees.get(mN),
    	variablesPerSplit: Allvariables.get(mN),
    	bagFraction: 0.632,
    	seed: 0
    }).setOutputMode('REGRESSION');;
  
  
  // Perform the cross validation on the dataset
  var kFoldCVResults = KFoldCVwManualFC.KFoldCVwManualFC(sampledPoints_log, k, classifierToUse, modelledVariable, covarsToUse);
  
  // print('Kfold',kFoldCVResults)
  var nameOfExport = listOfModelNames[mN];
  
  var finalR2 = computeR2.computeR2FromCVFC(kFoldCVResults, modelledVariable, 'PredictedValue', 'FoldNumber');
  // print('finalR2',finalR2)
  
  var residualsFC = kFoldCVResults.map(function(f) {
  			return f.set('AbsResidual', ee.Number(f.get('PredictedValue'))
  			                            .subtract(f.get(modelledVariable)).abs());
  		});
  
  // print('residualsFC',residualsFC)
  
  var finalFeature = ee.Feature(null).set(ee.Dictionary(finalR2).set('ModelName', nameOfExport))
  		                                   .set('ResidualsFC',residualsFC);
  kFoldCVResults = null             
  // var finalFeature = ee.Feature(null).set(ee.Dictionary(finalR2).set('ModelName', nameOfExport));
  		                                   
  // print('finalFeature',finalFeature)                         
  return(finalFeature)                           
}));  

return ExportR2
}
                        
var ExportR=ReportR2(modelledVariable).sort('mean', false).toList(1).get(0)

print('All R2 Results', ExportR);	     
print('Top Model Name', ee.Feature(ExportR).get('ModelName'));
print('Top Model Mean R^2', ee.Feature(ExportR).get('mean'));
 
 
 
 
 
var vibgYOR = ['330044', '220066', '1133cc', '33dd00', 'ffda21', 'ff6622', 'd10000'];
var residualsFC = ee.FeatureCollection(ee.Feature(ExportR).get('ResidualsFC')).sort('AbsResidual',false);
print('Residuals FC',residualsFC);
// print('Largest Absolute Residual - BFR',residualsFC_BactFungRatio.reduceColumns('max',['AbsResidual']))
var residualsImage= ee.Image().float().paint(residualsFC, 'AbsResidual').focal_mean(5);
Map.addLayer(residualsImage, {min: 0, max: 50, palette: vibgYOR}, 'CV residuals');
 
 
var outliersToRemove = ee.FeatureCollection(residualsFC.limit(2));
print('Outliers to Remove',outliersToRemove);
 
 
var outliersRemovedCollection = ee.Join.inverted().apply(
  sampledPoints_log,
  outliersToRemove,
  ee.Filter.intersects('.geo', null, '.geo'));
print('Collection with Outliers Removed',outliersRemovedCollection);

var residualsImage_Outliers = ee.Image().float().paint(outliersToRemove, 'AbsResidual').focal_mean(5);
Map.addLayer(residualsImage_Outliers, {min: 0, max: 50, palette: vibgYOR}, 'Outliers being removed');

Export.table.toAsset({
  collection: outliersRemovedCollection,
  description:'rnm_log_K10_out',
  assetId:'users/kai86liang/Final_root_less/rnm_log_K10_out'
});

