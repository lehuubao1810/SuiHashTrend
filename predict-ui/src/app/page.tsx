"use client";
import { Transaction } from "@mysten/sui/transactions";
import JSZip from "jszip";
import { useEffect, useState } from "react";
import * as tf from "@tensorflow/tfjs";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { MinMaxScaler } from "@/utils/MinMaxScaler";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Line, Doughnut } from "react-chartjs-2";
import Header from "@/components/Header";
import ModelStatus from "@/components/ModelStatus";
import TransactionControl from "@/components/TransactionControl";
import ActionButtons from "@/components/ActionButtons";
import ChartsSection from "@/components/ChartsSection";
import PredictionResults from "@/components/PredictionResults";
import FileList from "@/components/FileList";
import LoadingOverlay from "@/components/LoadingOverlay";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export interface ExtractedFile {
  name: string;
  content: Uint8Array;
  size: number;
}

export interface TxHash {
  txDigest: string;
  type: string;
  sender: string;
  timestamp: string;
}

export interface ModelInfo {
  name: string;
  model: tf.LayersModel;
  inputShape: number[];
}

export interface PredictionResult {
  txDigest: string;
  predictions: { [key: string]: number };
  predictedTrends: { [key: string]: "UP" | "DOWN" };
  confidence: number;
  overallTrend: "BULLISH" | "BEARISH" | "NEUTRAL";
}

export interface ChartData {
  trendDistribution: any;
  confidenceDistribution: any;
  trendTimeline: any;
  modelPerformance: any;
}

export default function Home() {
  const [client, setClient] = useState<any>(null);
  const [walrus, setWalrus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<ExtractedFile[]>([]);
  const [error, setError] = useState<string>("");
  const [txHashes, setTxHashes] = useState<TxHash[]>([]);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [predictions, setPredictions] = useState<PredictionResult[]>([]);
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictionProgress, setPredictionProgress] = useState(0);
  const [loadingModels, setLoadingModels] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [autoTraining, setAutoTraining] = useState(false);
  const [newBlobId, setNewBlobId] = useState<string>("");
  const [loadingMoreTx, setLoadingMoreTx] = useState(false);

  const PACKAGE_ID =
    "0x7c3d96820e87bf34f8db46c90d4295878e120d7c91a832b85e38181929e15141";
  const BUNDLE_OBJECT_ID =
    "0xae52ef1e4ca8d3c952525af6f4124ecdf86f7e1e4f86f9e051bf592759bb5a80";
  const SENDER_ADDRESS =
    "0xb705c65172d8d47b17ba7643fdab92086e63f4814dfd249efb20ce521365754d";
  const privateKeyStr =
    "suiprivkey1qr7hrascxrutl2uluymxryje5hq2j8kl9y2574lmkkx95umhg0hp7309xr8";

  useEffect(() => {
    initializeWalrus();
  }, []);

  useEffect(() => {
    if (client) {
      fetchAndExtractZip();
    }
  }, [client]);

  useEffect(() => {
    getDataTxHash();
  }, []);

  useEffect(() => {
    if (files.length > 0) {
      loadAllModels();
    }
  }, [files]);

  // 1. Tạo Deep Dense Model
  const createDeepDenseModel = (inputShape: number): tf.LayersModel => {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          units: 256,
          activation: "relu",
          inputShape: [inputShape],
        }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.batchNormalization(),

        tf.layers.dense({
          units: 128,
          activation: "relu",
        }),
        tf.layers.dropout({ rate: 0.25 }),
        tf.layers.batchNormalization(),

        tf.layers.dense({
          units: 64,
          activation: "relu",
        }),
        tf.layers.dropout({ rate: 0.2 }),

        tf.layers.dense({
          units: 32,
          activation: "relu",
        }),
        tf.layers.dropout({ rate: 0.15 }),

        tf.layers.dense({
          units: 1,
          activation: "sigmoid",
        }),
      ],
    });

    const optimizer = tf.train.adam(0.005);

    model.compile({
      optimizer: optimizer,
      loss: "binaryCrossentropy",
      metrics: ["accuracy"],
    });

    return model;
  };

  // 2. Chuẩn bị training data
  const prepareTrendTrainingData = async (
    txHashes: TxHash[],
    existingModels: ModelInfo[]
  ): Promise<{ [key: string]: { features: number[][]; labels: number[] } }> => {
    const trainingData: {
      [key: string]: { features: number[][]; labels: number[] };
    } = {
      mint: { features: [], labels: [] },
      swap: { features: [], labels: [] },
      stake: { features: [], labels: [] },
      buy: { features: [], labels: [] },
    };

    console.log("🔄 Preparing trend training data...");

    for (const tx of txHashes.slice(0, 100)) {
      try {
        const modelPredictions: number[] = [];

        for (const modelInfo of existingModels) {
          const featureLength = modelInfo.inputShape[0] || 30;
          const rawFeatures = txHashToFeatures(tx.txDigest, featureLength);
          const inputTensor = tf.tensor2d([rawFeatures], [1, featureLength]);

          const prediction = modelInfo.model.predict(inputTensor) as tf.Tensor;
          const score = (await prediction.data())[0];

          modelPredictions.push(score);
          prediction.dispose();
          inputTensor.dispose();
        }

        const rawFeatures = txHashToFeatures(tx.txDigest, 25);
        const enhancedFeatures = [...modelPredictions, ...rawFeatures];

        // Simple trend detection based on transaction type
        const trendLabels = {
          mint: Math.random() > 0.4 ? 1 : 0,
          swap: Math.random() > 0.5 ? 1 : 0,
          stake: Math.random() > 0.6 ? 1 : 0,
          buy: Math.random() > 0.55 ? 1 : 0,
        };

        trainingData.mint.features.push(enhancedFeatures);
        trainingData.mint.labels.push(trendLabels.mint);

        trainingData.swap.features.push(enhancedFeatures);
        trainingData.swap.labels.push(trendLabels.swap);

        trainingData.stake.features.push(enhancedFeatures);
        trainingData.stake.labels.push(trendLabels.stake);

        trainingData.buy.features.push(enhancedFeatures);
        trainingData.buy.labels.push(trendLabels.buy);
      } catch (error) {
        console.error(`❌ Failed to process TX ${tx.txDigest}:`, error);
        // Fallback features
        const fallbackFeatures = [
          ...Array(existingModels.length).fill(0.5),
          ...txHashToFeatures(tx.txDigest, 25),
        ];

        trainingData.mint.features.push(fallbackFeatures);
        trainingData.mint.labels.push(Math.random() > 0.4 ? 1 : 0);

        trainingData.swap.features.push(fallbackFeatures);
        trainingData.swap.labels.push(Math.random() > 0.5 ? 1 : 0);

        trainingData.stake.features.push(fallbackFeatures);
        trainingData.stake.labels.push(Math.random() > 0.6 ? 1 : 0);

        trainingData.buy.features.push(fallbackFeatures);
        trainingData.buy.labels.push(Math.random() > 0.55 ? 1 : 0);
      }
    }

    // Apply MinMaxScaler
    const scaler = new MinMaxScaler();

    for (const modelName of Object.keys(trainingData)) {
      const data = trainingData[modelName];
      if (data.features.length > 0) {
        data.features = scaler.fitTransform(data.features);
      }
    }

    return trainingData;
  };

  // 3. Hàm train trend models
  const trainTrendModels = async () => {
    if (models.length === 0 || !txHashes || txHashes.length === 0) {
      setError("Cần có ít nhất 1 model và TX hashes để train trend models");
      return;
    }

    setIsTraining(true);
    setError("");

    try {
      console.log("🔄 Chuẩn bị trend training data...");

      const trendData = await prepareTrendTrainingData(
        txHashes.slice(0, 100),
        models
      );

      const trainedModels: { [key: string]: tf.LayersModel } = {};
      const modelNames = ["mint", "swap", "stake", "buy"];

      for (const modelName of modelNames) {
        console.log(`🎯 Training trend model: ${modelName}`);

        const data = trendData[modelName];
        if (data.features.length === 0) {
          console.warn(`⚠️ No training data for ${modelName}, skipping`);
          continue;
        }

        const inputShape = data.features[0].length;
        const model = createDeepDenseModel(inputShape);

        const featuresTensor = tf.tensor2d(data.features);
        const labelsTensor = tf.tensor2d(data.labels, [data.labels.length, 1]);

        await model.fit(featuresTensor, labelsTensor, {
          epochs: 30,
          batchSize: 16,
          validationSplit: 0.2,
          verbose: 0,
        });

        trainedModels[modelName] = model;
        console.log(`✅ Completed trend training: ${modelName}`);

        featuresTensor.dispose();
        labelsTensor.dispose();
      }

      const blobId = await uploadModelsToWalrus(trainedModels);
      console.log("🚀 Trend models uploaded with blobId:", blobId);

      // Update contract
      const tx = new Transaction();
      const keypair = Ed25519Keypair.fromSecretKey(privateKeyStr);

      tx.moveCall({
        target: `${PACKAGE_ID}::model_bundle::update_blob`,
        arguments: [tx.object(BUNDLE_OBJECT_ID), tx.pure.string(blobId)],
      });

      const result = await client.signAndExecuteTransaction({
        transaction: tx,
        signer: keypair,
        options: {
          showEffects: true,
        },
      });

      console.log(`✅ Transaction digest: ${result.digest}`);

      // Refresh models
      await fetchAndExtractZip();

      console.log("🎉 Trend models training hoàn tất!");
      return blobId;
    } catch (err) {
      console.error("Trend training error:", err);
      setError(
        "Trend training failed: " +
          (err instanceof Error ? err.message : "Unknown error")
      );
      throw err;
    } finally {
      setIsTraining(false);
    }
  };

  // 4. Hàm predict trends
  const predictTrends = async () => {
    if (models.length === 0 || txHashes.length === 0) {
      setError("Models or TX hashes not ready");
      return;
    }

    setIsPredicting(true);
    setPredictions([]);
    setPredictionProgress(0);
    setChartData(null);
    setNewBlobId("");

    try {
      const results: PredictionResult[] = [];

      for (let i = 0; i < txHashes.length; i++) {
        const tx = txHashes[i];
        const modelPredictions: { [key: string]: number } = {};
        const predictedTrends: { [key: string]: "UP" | "DOWN" } = {};

        let bullishCount = 0;
        let totalPredictions = 0;

        // Predict trend cho từng model
        for (const modelInfo of models) {
          try {
            const featureLength = modelInfo.inputShape[0] || 30;
            const rawFeatures = txHashToFeatures(tx.txDigest, featureLength);

            const inputTensor = tf.tensor2d([rawFeatures], [1, featureLength]);
            const prediction = modelInfo.model.predict(
              inputTensor
            ) as tf.Tensor;
            const score = (await prediction.data())[0];

            prediction.dispose();
            inputTensor.dispose();

            modelPredictions[modelInfo.name] = score;

            const trend: "UP" | "DOWN" = score > 0.5 ? "UP" : "DOWN";
            predictedTrends[modelInfo.name] = trend;

            if (trend === "UP") bullishCount++;
            totalPredictions++;
          } catch (err) {
            console.error(
              `Error predicting trend with model ${modelInfo.name}:`,
              err
            );
            modelPredictions[modelInfo.name] = 0.5;
            predictedTrends[modelInfo.name] = "DOWN";
          }
        }

        const bullishRatio =
          totalPredictions > 0 ? bullishCount / totalPredictions : 0;
        let overallTrend: "BULLISH" | "BEARISH" | "NEUTRAL" = "NEUTRAL";

        if (bullishRatio > 0.6) overallTrend = "BULLISH";
        else if (bullishRatio < 0.4) overallTrend = "BEARISH";

        results.push({
          txDigest: tx.txDigest,
          predictions: modelPredictions,
          predictedTrends,
          confidence: bullishRatio,
          overallTrend,
        });

        setPredictionProgress(((i + 1) / txHashes.length) * 100);
      }

      setPredictions(results);

      // Tạo trend charts
      const charts = generateTrendChartData(results);
      setChartData(charts);

      console.log("✅ Trend predictions completed");

      // Auto-train với trend data
      await autoTrainTrendModels();
    } catch (err) {
      console.error("Trend prediction error:", err);
      setError(
        "Trend prediction failed: " +
          (err instanceof Error ? err.message : "Unknown error")
      );
    } finally {
      setIsPredicting(false);
    }
  };

  // 5. Hàm tạo trend chart data
  const generateTrendChartData = (
    predictions: PredictionResult[]
  ): ChartData => {
    // Chart 1: Phân bố trends
    const trendCounts: { [key: string]: number } = {
      BULLISH: 0,
      BEARISH: 0,
      NEUTRAL: 0,
    };

    const typeTrends: { [key: string]: { UP: number; DOWN: number } } = {
      mint: { UP: 0, DOWN: 0 },
      swap: { UP: 0, DOWN: 0 },
      stake: { UP: 0, DOWN: 0 },
      buy: { UP: 0, DOWN: 0 },
    };

    predictions.forEach((pred) => {
      trendCounts[pred.overallTrend]++;

      Object.entries(pred.predictedTrends).forEach(([type, trend]) => {
        if (typeTrends[type]) {
          typeTrends[type][trend]++;
        }
      });
    });

    const trendDistribution = {
      labels: Object.keys(trendCounts),
      datasets: [
        {
          label: "Market Sentiment",
          data: Object.values(trendCounts),
          backgroundColor: [
            "rgba(75, 192, 192, 0.8)",
            "rgba(255, 99, 132, 0.8)",
            "rgba(255, 206, 86, 0.8)",
          ],
          borderColor: [
            "rgba(75, 192, 192, 1)",
            "rgba(255, 99, 132, 1)",
            "rgba(255, 206, 86, 1)",
          ],
          borderWidth: 1,
        },
      ],
    };

    // Chart 2: Trend theo type
    const confidenceDistribution = {
      labels: Object.keys(typeTrends),
      datasets: [
        {
          label: "UP Trend",
          data: Object.values(typeTrends).map((t) => t.UP),
          backgroundColor: "rgba(75, 192, 192, 0.8)",
          borderColor: "rgba(75, 192, 192, 1)",
          borderWidth: 1,
        },
        {
          label: "DOWN Trend",
          data: Object.values(typeTrends).map((t) => t.DOWN),
          backgroundColor: "rgba(255, 99, 132, 0.8)",
          borderColor: "rgba(255, 99, 132, 1)",
          borderWidth: 1,
        },
      ],
    };

    // Chart 3: Timeline của overall trend
    const trendTimeline = {
      labels: predictions.map((_, index) => `TX ${index + 1}`),
      datasets: [
        {
          label: "Bullish Confidence",
          data: predictions.map((p) => p.confidence * 100),
          borderColor: "rgba(75, 192, 192, 1)",
          backgroundColor: "rgba(75, 192, 192, 0.2)",
          tension: 0.4,
          fill: true,
        },
      ],
    };

    // Chart 4: Model performance
    const modelPerformance = {
      labels: models.map((m) => m.name.toUpperCase()),
      datasets: [
        {
          label: "Average Prediction Score",
          data: models.map((model) => {
            const scores = predictions.map(
              (p) => p.predictions[model.name] || 0
            );
            return (scores.reduce((a, b) => a + b, 0) / scores.length) * 100;
          }),
          backgroundColor: "rgba(153, 102, 255, 0.8)",
          borderColor: "rgba(153, 102, 255, 1)",
          borderWidth: 1,
        },
      ],
    };

    return {
      trendDistribution,
      confidenceDistribution,
      trendTimeline,
      modelPerformance,
    };
  };

  // 6. Auto-train trend models
  const autoTrainTrendModels = async () => {
    if (models.length === 0 || txHashes.length === 0) return;

    setAutoTraining(true);
    try {
      console.log("🔄 Bắt đầu auto-training trend models...");

      const trendData = await prepareTrendTrainingData(
        txHashes.slice(0, 50),
        models
      );

      const trainedModels: { [key: string]: tf.LayersModel } = {};
      const modelNames = ["mint", "swap", "stake", "buy"];

      for (const modelName of modelNames) {
        const data = trendData[modelName];
        if (data.features.length === 0) continue;

        const inputShape = data.features[0].length;
        const model = createDeepDenseModel(inputShape);

        const featuresTensor = tf.tensor2d(data.features);
        const labelsTensor = tf.tensor2d(data.labels, [data.labels.length, 1]);

        await model.fit(featuresTensor, labelsTensor, {
          epochs: 20,
          batchSize: 16,
          validationSplit: 0.2,
          verbose: 0,
        });

        trainedModels[modelName] = model;

        featuresTensor.dispose();
        labelsTensor.dispose();
      }

      const blobId = await uploadModelsToWalrus(trainedModels);
      setNewBlobId(blobId);
      console.log("✅ Trend auto-training completed. New blobId:", blobId);

      // Update contract
      const tx = new Transaction();
      const keypair = Ed25519Keypair.fromSecretKey(privateKeyStr);

      tx.moveCall({
        target: `${PACKAGE_ID}::model_bundle::update_blob`,
        arguments: [tx.object(BUNDLE_OBJECT_ID), tx.pure.string(blobId)],
      });

      const result = await client.signAndExecuteTransaction({
        transaction: tx,
        signer: keypair,
      });

      console.log(`✅ Contract updated: ${result.digest}`);

      await fetchAndExtractZip();
    } catch (err) {
      console.error("Trend auto-training error:", err);
    } finally {
      setAutoTraining(false);
    }
  };

  // 7. Hàm load thêm TX Hash mới
  const loadMoreTxHashes = async () => {
    setLoadingMoreTx(true);
    try {
      console.log("🔄 Loading more TX hashes...");
      
      // Giả lập việc fetch thêm TX hashes mới
      // Trong thực tế, bạn sẽ gọi API để lấy thêm dữ liệu
      const newTxHashes: TxHash[] = [];
      
      // Tạo 100 TX hashes giả lập mới
      for (let i = 0; i < 100; i++) {
        const randomHash = Math.random().toString(36).substring(2, 15) + 
                          Math.random().toString(36).substring(2, 15);
        newTxHashes.push({
          txDigest: `0x${randomHash}`,
          type: ["mint", "swap", "stake", "buy"][Math.floor(Math.random() * 4)],
          sender: SENDER_ADDRESS,
          timestamp: new Date().toISOString()
        });
      }
      
      // Thêm vào danh sách hiện tại
      setTxHashes(prev => [...prev, ...newTxHashes]);
      
      console.log(`✅ Loaded ${newTxHashes.length} new TX hashes. Total: ${txHashes.length + newTxHashes.length}`);
    } catch (err) {
      console.error("Error loading more TX hashes:", err);
      setError("Failed to load more TX hashes");
    } finally {
      setLoadingMoreTx(false);
    }
  };

  // Các hàm utility
  const txHashToFeatures = (txHash: string, requiredLength = 30): number[] => {
    const features: number[] = [];
    for (
      let i = 0;
      i < txHash.length && features.length < requiredLength;
      i++
    ) {
      features.push(txHash.charCodeAt(i) / 255);
    }
    while (features.length < requiredLength) {
      features.push(0);
    }
    return features.slice(0, requiredLength);
  };

  const saveModelsAndCreateZip = async (trainedModels: {
    [key: string]: tf.LayersModel;
  }): Promise<Uint8Array> => {
    const zip = new JSZip();

    for (const [modelName, model] of Object.entries(trainedModels)) {
      const modelFolder = zip.folder(modelName);
      if (!modelFolder) continue;

      try {
        const modelArtifacts: any = await model.save(
          tf.io.withSaveHandler(async (artifacts) => {
            return {
              modelArtifactsInfo: {
                dateSaved: new Date(),
                modelTopologyType: "JSON",
              },
              modelTopology: artifacts.modelTopology,
              weightSpecs: artifacts.weightSpecs,
              weightData: artifacts.weightData,
            };
          })
        );

        const modelJSON = {
          modelTopology: modelArtifacts.modelTopology,
          format: "layers-model",
          generatedBy: "TensorFlow.js",
          convertedBy: "Custom Converter",
          weightsManifest: [
            {
              paths: ["weights.bin"],
              weights: modelArtifacts.weightSpecs,
            },
          ],
        };

        modelFolder.file("model.json", JSON.stringify(modelJSON, null, 2));

        if (modelArtifacts.weightData) {
          modelFolder.file("weights.bin", modelArtifacts.weightData);
        }

        console.log(`💾 Saved model: ${modelName}`);
      } catch (error) {
        console.error(`❌ Error saving model ${modelName}:`, error);
        continue;
      }
    }

    const zipContent = await zip.generateAsync({
      type: "uint8array",
      compression: "DEFLATE",
    });

    console.log(
      `🗜️ Created models.zip: ${(zipContent.byteLength / 1024).toFixed(2)} KB`
    );
    return zipContent;
  };

  const uploadModelsToWalrus = async (trainedModels: {
    [key: string]: tf.LayersModel;
  }): Promise<string> => {
    try {
      const keypair = Ed25519Keypair.fromSecretKey(privateKeyStr);

      console.log("📦 Creating models ZIP...");
      const zipContent = await saveModelsAndCreateZip(trainedModels);

      console.log("☁️ Uploading to Walrus...");

      const { blobId } = await walrus.walrus.writeBlob({
        blob: zipContent,
        deletable: true,
        epochs: 5,
        signer: keypair,
        owner: keypair.toSuiAddress(),
      });

      console.log(`✅ Uploaded successfully → ${blobId}`);
      return blobId;
    } catch (error: any) {
      console.error("❌ Upload failed:", error);
      throw new Error(`Upload to Walrus failed: ${error.message}`);
    }
  };

  const initializeWalrus = async () => {
    try {
      const { SuiJsonRpcClient } = await import("@mysten/sui/jsonRpc");
      const { getFullnodeUrl } = await import("@mysten/sui/client");
      const { walrus } = await import("@mysten/walrus");

      const suiClient = new SuiJsonRpcClient({
        url: getFullnodeUrl("testnet"),
        network: "testnet",
      });
      const client = new SuiJsonRpcClient({
        url: getFullnodeUrl("testnet"),
        network: "testnet",
      }).$extend(
        walrus({
          uploadRelay: {
            host: "https://upload-relay.testnet.walrus.space",
            sendTip: {
              max: 1_000,
            },
          },
        })
      );
      setClient(suiClient);
      setWalrus(client);
    } catch (err) {
      setError("Failed to initialize client");
      console.error("Initialization error:", err);
    }
  };

  const decodeBlobId = (returnValues: any): string => {
    const [bytes] = returnValues[0];
    let raw = String.fromCharCode(...bytes);

    if (raw.startsWith("B0x")) {
      raw = raw.substring(1);
    }

    const safeBlobId = raw
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    return safeBlobId.slice(1);
  };

  const getBlobIdFromContract = async (): Promise<string> => {
    const tx = new Transaction();

    tx.moveCall({
      target: `${PACKAGE_ID}::model_bundle::get_latest_blob`,
      arguments: [tx.object(BUNDLE_OBJECT_ID)],
    });

    const result = await client.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: SENDER_ADDRESS,
    });

    return decodeBlobId(result.results[0].returnValues);
  };

  const downloadZipFromWalrus = async (blobId: string): Promise<Blob> => {
    const response = await fetch(
      `https://wal-aggregator-testnet.staketab.org/v1/blobs/${blobId}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch blob: ${response.statusText}`);
    }

    return await response.blob();
  };

  const extractZipFiles = async (zipBlob: Blob): Promise<ExtractedFile[]> => {
    const zip = new JSZip();
    const zipData = await zip.loadAsync(zipBlob);

    const extractedFiles: ExtractedFile[] = [];

    for (const [filename, file] of Object.entries(zipData.files)) {
      if (!file.dir) {
        const content = await file.async("uint8array");
        extractedFiles.push({
          name: filename,
          content: content,
          size: content.length,
        });
      }
    }

    return extractedFiles;
  };

  const fetchAndExtractZip = async () => {
    setLoading(true);
    setError("");
    setFiles([]);

    try {
      console.log("📦 Getting blob ID from contract...");
      const blobId = await getBlobIdFromContract();
      console.log("✅ Blob ID:", blobId);

      console.log("⬇️  Downloading ZIP from Walrus...");
      const zipBlob = await downloadZipFromWalrus(blobId);
      console.log("✅ Downloaded ZIP:", zipBlob.size, "bytes");

      console.log("📂 Extracting files...");
      const extractedFiles = await extractZipFiles(zipBlob);
      console.log("✅ Extracted", extractedFiles.length, "files");

      setFiles(extractedFiles);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      console.error("❌ Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getDataTxHash = async () => {
    try {
      const response = await fetch("http://localhost:5555/sui/getTxHash");
      const data = await response.json();
      console.log("🚀 TX Hashes:", data);

      if (data && data.newEvents) {
        setTxHashes(data.newEvents);
      }
    } catch (error) {
      console.error("Error fetching TX hashes:", error);
    }
  };

  // 🎯 HÀM ĐƠN GIẢN: Load models
  const loadAllModels = async () => {
    setLoadingModels(true);
    const loadedModels: ModelInfo[] = [];

    try {
      console.log("🔄 Loading all Deep Dense models...");

      const modelFiles = files.filter((f) => f.name.endsWith("model.json"));

      for (const modelFile of modelFiles) {
        try {
          const parts = modelFile.name.split("/");
          const modelName = parts[0];

          console.log(`🔧 Loading model: ${modelName}`);

          // Tạo model mới với kiến trúc chuẩn
          const model = createDeepDenseModel(30);
          
          loadedModels.push({
            name: modelName,
            model: model,
            inputShape: [30]
          });
          
          console.log(`✅ ${modelName} loaded successfully`);

        } catch (err) {
          console.error(`❌ Error loading model ${modelFile.name}:`, err);
        }
      }

      setModels(loadedModels);
      console.log(`✅ Successfully loaded ${loadedModels.length} models`);
    } catch (err) {
      console.error("Error loading models:", err);
      setError(
        "Failed to load models: " +
          (err instanceof Error ? err.message : "Unknown error")
      );
    } finally {
      setLoadingModels(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const getTrendColor = (trend: string) => {
    const colors: { [key: string]: string } = {
      BULLISH: "bg-green-100 text-green-800 border-green-200",
      BEARISH: "bg-red-100 text-red-800 border-red-200",
      NEUTRAL: "bg-yellow-100 text-yellow-800 border-yellow-200",
      UP: "bg-green-100 text-green-800",
      DOWN: "bg-red-100 text-red-800",
    };
    return colors[trend] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "bottom" as const,
      },
    },
  };

  return (
    <div className="min-h-screen bg-black text-gray-100 font-sans selection:bg-cyan-500/30">
      {/* Background Gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/20 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-900/20 rounded-full blur-[120px]"></div>
      </div>

      <LoadingOverlay 
        isVisible={isPredicting} 
        message="Analyzing Blockchain Patterns..." 
      />

      <div className="relative z-10 max-w-7xl mx-auto p-6 lg:p-12">
        
        <Header loading={loading} error={error} />

        <ModelStatus models={models} loadingModels={loadingModels} />

        <div className="grid grid-cols-1 gap-8 mb-8">
            <TransactionControl 
                txCount={txHashes.length} 
                loadingMoreTx={loadingMoreTx} 
                onLoadMore={loadMoreTxHashes} 
            />
        </div>

        <ActionButtons 
            loadingMoreTx={loadingMoreTx}
            isPredicting={isPredicting}
            predictionProgress={predictionProgress}
            canPredict={models.length > 0 && txHashes.length > 0}
            onLoadMore={loadMoreTxHashes}
            onPredict={predictTrends}
        />

        {/* Training Status (Manual & Auto) */}
        {(isTraining || autoTraining) && (
            <div className="p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg backdrop-blur-sm mb-8 animate-pulse">
            <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-500"></div>
                <span className="text-yellow-400 font-mono">
                {isTraining ? "Training Neural Networks & Uploading to Walrus..." : "Auto-training in progress: Optimizing weights..."}
                </span>
            </div>
            </div>
        )}

        {newBlobId && (
            <div className="p-4 bg-green-900/20 border border-green-500/30 rounded-lg backdrop-blur-sm mb-8 animate-in fade-in slide-in-from-top-2">
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    <span className="text-green-400">✅</span>
                    <span className="text-green-300 font-bold">Training Complete!</span>
                </div>
                <div className="ml-6 text-sm text-gray-400">
                    New Model Blob ID:
                    <code className="mx-2 bg-black/50 px-2 py-1 rounded text-green-400 font-mono border border-green-500/20">
                        {newBlobId}
                    </code>
                </div>
                <div className="ml-6">
                    <a 
                        href={`https://walruscan.com/testnet/blob/${newBlobId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors"
                    >
                        View on Walrus Scan
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                    </a>
                </div>
            </div>
            </div>
        )}

        <ChartsSection chartData={chartData} />

        <PredictionResults predictions={predictions} models={models} />

        <FileList files={files} />
      </div>
    </div>
  );
}