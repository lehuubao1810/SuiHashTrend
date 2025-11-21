import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as tf from '@tensorflow/tfjs';
import path from 'path';
import fs from 'fs';

interface TransactionItem {
  txDigest: string;
  type: string;
  sender?: string;
  timestamp?: string;
  raw: any;
}

type ModelNames = 'mint' | 'swap' | 'stake' | 'buy' | 'total';

interface PredictionResult {
  txDigest: string;
  predictions: Record<ModelNames, number>;
  predictedType: string;
  confidence: number;
}

@Injectable()
export class ModelService implements OnModuleInit {
  private readonly logger = new Logger(ModelService.name);
  private models: Partial<Record<ModelNames, tf.LayersModel>> = {};
  private modelInputShapes: Partial<Record<ModelNames, number[]>> = {};

  async onModuleInit() {
    this.logger.log('🚀 Initializing ModelService...');
    // await this.loadAllModels();
  }

  // Load tất cả model từ thư mục
  async loadAllModels() {
    const modelList: ModelNames[] = ['mint', 'swap', 'stake', 'buy', 'total'];

    for (const name of modelList) {
      try {
        if (!this.models[name]) {
          const modelDir = path.resolve(process.cwd(), 'src', 'model', name);
          const modelJsonPath = path.join(modelDir, 'model.json');

          if (!fs.existsSync(modelJsonPath)) {
            this.logger.warn(`❌ Model file not found: ${modelJsonPath}`);
            continue;
          }

          // Đọc model.json
          const modelJSON = new File(
            [fs.readFileSync(modelJsonPath, 'utf8')],
            'model.json'
          );

          // Đọc tất cả file .bin weights
          const weightFiles = fs
            .readdirSync(modelDir)
            .filter(f => f.endsWith('.bin'))
            .map(f => new File([fs.readFileSync(path.join(modelDir, f)) as any], f));

          // Load model bằng browserFiles
          const model = await tf.loadLayersModel(tf.io.browserFiles([modelJSON, ...weightFiles]));
          this.models[name] = model;

          // Lưu input shape
          const inputShape = model.inputs[0].shape || [];
          this.modelInputShapes[name] = inputShape;

          this.logger.log(`✅ Loaded model: ${name} with input shape: [${inputShape}]`);
        }
      } catch (error) {
        console.log('🚀 ~ ModelService ~ loadAllModels ~ error:', error);
        this.logger.error(`❌ Failed to load model ${name}:`, error);
      }
    }

    const loadedCount = Object.keys(this.models).length;
    this.logger.log(`✅ Total models loaded: ${loadedCount}/${modelList.length}`);
  }

  // Extract features từ TX hash (convert hex to normalized numbers)
  private extractFeaturesFromTxHash(txDigest: string, requiredLength: number = 30): number[] {
    const hash = txDigest.replace('0x', '');
    const features: number[] = [];

    // Convert hex characters to normalized numbers [0, 1]
    for (let i = 0; i < hash.length && features.length < requiredLength; i += 2) {
      const byte = parseInt(hash.substr(i, 2), 16);
      features.push(byte / 255);
    }

    // Pad with zeros if needed
    while (features.length < requiredLength) {
      features.push(0);
    }

    return features.slice(0, requiredLength);
  }

  // Extract features từ transaction object
  private extractFeatures(tx: TransactionItem, modelName: ModelNames): number[][] {
    const inputShape = this.modelInputShapes[modelName];
    
    if (!inputShape) {
      throw new Error(`Input shape not found for model: ${modelName}`);
    }

    // LSTM models có shape: [null, timesteps, features]
    // Ví dụ: [null, 1, 30] → timesteps=1, features=30
    const timesteps = inputShape[1] || 1;
    const featureLength = inputShape[2] || 30;

    // Extract features từ TX hash
    const features = this.extractFeaturesFromTxHash(tx.txDigest, featureLength);

    // Reshape thành [timesteps, features]
    // Với timesteps=1, chỉ cần wrap features trong 1 array
    const reshapedFeatures: number[][] = [];
    for (let i = 0; i < timesteps; i++) {
      reshapedFeatures.push([...features]);
    }

    return reshapedFeatures;
  }

  // Dự đoán 1 transaction
  async predictSingle(tx: TransactionItem): Promise<PredictionResult> {
    const predictions: Partial<Record<ModelNames, number>> = {};
    let maxScore = 0;
    let predictedType = 'UNKNOWN';

    for (const [name, model] of Object.entries(this.models) as [ModelNames, tf.LayersModel][]) {
      try {
        // Extract features và reshape cho LSTM
        const features = this.extractFeatures(tx, name);
        
        // Create tensor với shape [1, timesteps, features]
        const inputTensor = tf.tensor3d([features]);

        // Predict
        const output = model.predict(inputTensor) as tf.Tensor;
        const score = (await output.data())[0];

        // Cleanup
        inputTensor.dispose();
        output.dispose();

        predictions[name] = score;

        // Track highest score
        if (score > maxScore) {
          maxScore = score;
          predictedType = name.toUpperCase();
        }

        this.logger.debug(`Model ${name} prediction for ${tx.txDigest.slice(0, 10)}...: ${(score * 100).toFixed(2)}%`);
      } catch (error) {
        this.logger.error(`Error predicting with model ${name}:`, error);
        predictions[name] = 0;
      }
    }

    // If confidence too low, mark as UNKNOWN
    if (maxScore < 0.5) {
      predictedType = 'UNKNOWN';
    }

    return {
      txDigest: tx.txDigest,
      predictions: predictions as Record<ModelNames, number>,
      predictedType,
      confidence: maxScore,
    };
  }

  // Dự đoán nhiều transactions
  async predict(txs: TransactionItem[]): Promise<PredictionResult[]> {
    if (Object.keys(this.models).length === 0) {
      throw new Error('No models loaded. Please load models first.');
    }

    this.logger.log(`🔮 Predicting ${txs.length} transactions...`);

    const results: PredictionResult[] = [];

    for (let i = 0; i < txs.length; i++) {
      try {
        const result = await this.predictSingle(txs[i]);
        results.push(result);

        // Log progress every 10 transactions
        if ((i + 1) % 10 === 0) {
          this.logger.log(`Progress: ${i + 1}/${txs.length} transactions predicted`);
        }
      } catch (error) {
        this.logger.error(`Failed to predict transaction ${txs[i].txDigest}:`, error);
        // Add failed result
        results.push({
          txDigest: txs[i].txDigest,
          predictions: {} as Record<ModelNames, number>,
          predictedType: 'ERROR',
          confidence: 0,
        });
      }
    }

    this.logger.log(`✅ Prediction completed: ${results.length} results`);

    return results;
  }

  // Dự đoán batch với parallel processing
  async predictBatch(txs: TransactionItem[], batchSize: number = 20): Promise<PredictionResult[]> {
    const results: PredictionResult[] = [];

    for (let i = 0; i < txs.length; i += batchSize) {
      const batch = txs.slice(i, i + batchSize);
      this.logger.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(txs.length / batchSize)}`);

      // Process batch in parallel
      const batchResults = await Promise.all(
        batch.map(tx => this.predictSingle(tx).catch(error => {
          this.logger.error(`Failed to predict ${tx.txDigest}:`, error);
          return {
            txDigest: tx.txDigest,
            predictions: {} as Record<ModelNames, number>,
            predictedType: 'ERROR',
            confidence: 0,
          };
        }))
      );

      results.push(...batchResults);
    }

    return results;
  }

  // Get summary statistics
  getSummary(results: PredictionResult[]) {
    const summary: Record<string, number> = {};

    for (const result of results) {
      summary[result.predictedType] = (summary[result.predictedType] || 0) + 1;
    }

    const avgConfidence = results.reduce((acc, r) => acc + r.confidence, 0) / results.length;

    return {
      total: results.length,
      distribution: summary,
      averageConfidence: avgConfidence,
    };
  }

  // Get model status
  getStatus() {
    return {
      loaded: Object.keys(this.models).length,
      models: Object.entries(this.models).map(([name, model]) => ({
        name,
        inputShape: this.modelInputShapes[name as ModelNames],
      })),
    };
  }

  // Reload tất cả models
  async reloadModels() {
    this.logger.log('🔄 Reloading all models...');
    
    // Dispose old models
    for (const model of Object.values(this.models)) {
      if (model) {
        model.dispose();
      }
    }
    
    this.models = {};
    this.modelInputShapes = {};
    
    await this.loadAllModels();
  }
}