# root-nutrient-economics
This repository is generated for the projected ‘root nutrient economics'. It mainly describes the codes of machine learning used to generate global maps of root nutrient concentration.
The codes of machine learning were adapted from https://github.com/KailiangYu/Biogeography-of-soil-microbes and https://github.com/KailiangYu/Mortality-constraint

The data files include: 1) 'root_location_submission.csv' used for main text data analysis; 
2) 'Supplementary Table2_final.xlsx' describing the full list of environmental variables and reduced complexity model using VIF<5 used for mapping

The code files used for mapping root nutrients include: 1) 'Random_GridR2.js' used for the random forest final best global model selection via adjusting hyperparameters and
10-fold cross validation; 
2) 'Final_mapping.js' used for mapping root nutrients via the selected best random forest models; 
3) 'Final_mapping_boot_biome.js' used for bootstrapping
(100 iterations) in which each vegetation biome was represented proportionally in each model sample; 
4) 'Final_mapping_boot_sample.js' used for bootstrapping
(100 iterations) in which 90% of observations was replaced by randomly drawn values.
