# Perioperative Risk Clustering Demo

Interactive web application for exploring intraoperative physiological phenotypes identified through multivariate DTW clustering.

**Live demo**: https://kamowato.github.io/perioperative-risk-demo/

## Overview

This single-page application accompanies the research paper:

> **Intraoperative Vital Sign Trajectories and Acute Kidney Injury After Pancreaticoduodenectomy**

The study identified 4 physiological subtypes (SC1-SC4) from 16 intraoperative monitoring variables using PCA + Dynamic Time Warping + spectral clustering in 666 patients. SC2 (tachycardic/oliguria phenotype) showed higher odds of postoperative AKI (adjusted OR 2.70, P=.005).

## Features

- **16-variable trajectory visualization** grouped by category (hemodynamics, oxygenation, temperature, anesthesia management)
- **Direct curve manipulation** -- click/touch and drag to reshape trajectories
- **Real-time subcluster assignment** via z-score normalized DTW distance
- **SC1-SC4 preset buttons** to load each subcluster's mean trajectory
- **CSV upload** for custom patient data
- **PCA variable importance** displayed per chart
- **Mobile touch support**

## How It Works

1. Subcluster mean trajectories (100 normalized timepoints x 16 variables) are pre-computed from the study cohort
2. User edits curves or uploads CSV data
3. The app z-score normalizes the 16 variables and computes DTW distance to each subcluster centroid
4. The nearest centroid determines subcluster assignment

All computation runs locally in the browser. No data is transmitted to any server.

## Tech Stack

- Vanilla HTML/JS (no build step)
- D3.js v7 for visualization
- Standard DTW with Euclidean cost
- GitHub Pages for hosting

## Data

The `data/` directory contains pre-computed aggregate statistics only:

- `trajectories.json` -- Mean +/- SD trajectories per subcluster (no individual patient data)
- `centroids_pca.json` -- PCA-space centroid trajectories
- `pca_model.json` -- PCA loadings and variance explained
- `preprocessing_stats.json` -- Global mean/std for z-score normalization
- `metadata.json` -- Labels, colors, AKI rates, variable importance

**No individual patient data or identifiers are included.**

## Disclaimer

This application is a research demonstration. It is not validated for clinical decision-making.

## License

MIT
