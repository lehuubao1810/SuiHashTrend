This is the front-end for the 📈 **Deep Dense Trend Prediction System**. It is a [Next.js](https://nextjs.org) single-page app (see `src/app/page.tsx`) that orchestrates model loading, trend prediction, auto-training, visualization, and interactions with Sui + Walrus.

## Getting Started

```bash
npm install
npm run dev
# or: yarn dev / pnpm dev / bun dev
```

Visit [http://localhost:3000](http://localhost:3000) to use the dashboard.

## Front-End Architecture

- **Framework & UI**: Next.js App Router with a single client component. Styling via Tailwind classes; charts rendered with `react-chartjs-2`.
- **State**: React hooks track Sui/Walrus clients, extracted files, loaded TensorFlow.js models, TX hashes, predictions, charts, loading flags, and training progress.
- **Blockchain & Storage**: Uses `@mysten/sui` for RPC + Move calls and `@mysten/walrus` for blob uploads. Hardcoded package/object IDs target the deployed `model_bundle` contract.
- **ML Runtime**: TensorFlow.js builds, trains, and executes Deep Dense neural nets entirely in the browser. Models are packaged with JSZip and uploaded to Walrus for persistence.

## Data & Control Flow

1. **Initialization**: `initializeWalrus()` creates Sui JSON-RPC clients and augments one with Walrus helpers.
2. **Model Sync**: `getBlobIdFromContract()` + `downloadZipFromWalrus()` + `extractZipFiles()` hydrate model artifacts, then `loadAllModels()` reconstructs Deep Dense models for each folder.
3. **Transaction Intake**: `getDataTxHash()` fetches live TX metadata from `localhost:5555`; `loadMoreTxHashes()` can append synthetic hashes for testing.
4. **Prediction Loop**: `predictTrends()` converts every hash into features, runs each loaded model, aggregates confidences, renders charts (`generateTrendChartData()`), and auto-triggers training.
5. **Training Loop**: `prepareTrendTrainingData()` builds MinMax-scaled feature sets enriched with previous model scores. `trainTrendModels()` (manual) and `autoTrainTrendModels()` (post-prediction) create new TensorFlow models via `createDeepDenseModel()`, zip them (`saveModelsAndCreateZip()`), upload to Walrus (`uploadModelsToWalrus()`), and update the Move contract.

## Key Front-End Functions

| Function | Purpose |
| --- | --- |
| `createDeepDenseModel(inputShape)` | Builds a multi-layer dense NN with dropout/batch-norm for binary sentiment predictions on different TX types. |
| `prepareTrendTrainingData(txHashes, models)` | Generates enhanced feature vectors by combining TX-derived features with existing model scores, applies MinMax scaling, and fabricates binary labels per TX type. |
| `trainTrendModels()` | Manual training entry point; validates prerequisites, fits TensorFlow models per TX type, uploads bundle to Walrus, and updates the on-chain blob reference. |
| `predictTrends()` | Runs inference for every loaded model against every TX hash, classifies per-model trends, derives overall sentiment, updates UI state, and produces chart inputs. |
| `generateTrendChartData(predictions)` | Produces datasets for doughnut/bar/line visualizations: market sentiment distribution, per-type UP/DOWN counts, timeline confidence, and average per-model scores. |
| `autoTrainTrendModels()` | Lightweight auto-training triggered after predictions; retrains on recent data, uploads, and refreshes bundled models without user input. |
| `loadMoreTxHashes()` | Adds 100 synthetic TX hashes (type + timestamp) to stress-test the pipeline and ensure UI components have data. |
| `txHashToFeatures(txHash, len)` | Deterministically converts a TX digest to normalized numeric features, padding/truncating to the required length for model inputs. |
| `saveModelsAndCreateZip(trainedModels)` | Serializes each TensorFlow model into `model.json` + `weights.bin` inside a JSZip archive. |
| `uploadModelsToWalrus(trainedModels)` | Calls the saver above, then uploads the resulting ZIP to Walrus with signing info derived from the embedded Ed25519 key. |
| `initializeWalrus()` | Lazily imports Sui/Walrus SDKs, configures endpoints (testnet), and stores both the vanilla Sui client and the Walrus-extended client in state. |
| `getBlobIdFromContract()` / `decodeBlobId()` | Executes a Move `devInspect` call to read the latest Walrus blob ID from `model_bundle::get_latest_blob`, then normalizes it into a usable string. |
| `downloadZipFromWalrus(blobId)` / `extractZipFiles(zip)` | Fetches the blob from the Walrus aggregator, then extracts file contents into memory for TensorFlow consumption. |
| `fetchAndExtractZip()` | Orchestrates the blob lookup + download + extraction flow, updates UI loading state, and feeds data into `loadAllModels()`. |
| `getDataTxHash()` | Fetches live TX hashes/events from the local backend (`localhost:5555/sui/getTxHash`) and pushes them into component state. |
| `loadAllModels()` | Iterates over extracted folders, constructs Deep Dense models with consistent architecture, and keeps metadata (`ModelInfo[]`) for inference. |
| UI helpers | `formatFileSize()` humanizes ZIP entries, `getTrendColor()` maps sentiment to Tailwind styles, `chartOptions` & `doughnutOptions` configure Chart.js behavior. |

## Dashboard UX

- **Status Panels**: highlight loaded models, TX volume, Walrus sync state, training and prediction progress, plus latest blob ID.
- **Actions**: buttons for loading synthetic TXs, running predictions, and manually training models (auto-training runs post-prediction).
- **Analytics**: four responsive charts (sentiment doughnut, per-type bar, confidence line, model-performance bar) powered by `chartData`.
- **Predictions Table**: scrollable matrix showing each TX digest, per-model trend tags, confidences, and aggregate sentiment.
- **Model Files**: list of every file extracted from the Walrus ZIP with human-readable sizes.

## Deploying

- Standard Next.js deployment paths apply (Vercel, self-hosted Node, etc.).
- Ensure backend endpoints (`localhost:5555`) and Walrus/Sui credentials are configured appropriately for the deployment environment before building.
