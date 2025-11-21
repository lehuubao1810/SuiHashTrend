import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import JSZip from 'jszip';
import { CoinManagerService } from 'src/onchain/coin-manager.service';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { walrus } from '@mysten/walrus';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { Transaction } from '@mysten/sui/transactions';
interface ExtractedFile {
  name: string;
  content: Uint8Array;
  size: number;
}
@Injectable()
export class WalrusService implements OnModuleInit {
  private readonly logger = new Logger(WalrusService.name);
  private publisherUrl: string;
  private aggregatorUrl: string;
  private walrusClient: ReturnType<typeof walrus | any>;
  private client: SuiClient;
  private keypair: Ed25519Keypair;
  private privateKeyStr =
    'suiprivkey1qr7hrascxrutl2uluymxryje5hq2j8kl9y2574lmkkx95umhg0hp7309xr8';

  constructor(
    private configService: ConfigService,
    private coinManager: CoinManagerService,
  ) {
    const suiRpc = this.configService.get<string>('SUI_RPC');
    const privateKey = this.privateKeyStr;

    if (!suiRpc || !privateKey) {
      throw new Error('Missing SUI_RPC or private key');
    }

    this.keypair = Ed25519Keypair.fromSecretKey(privateKey);

    this.publisherUrl =
      this.configService.get<string>('WALRUS_PUBLISHER_URL') ||
      'https://publisher.walrus-testnet.walrus.space';
    this.aggregatorUrl =
      this.configService.get<string>('WALRUS_AGGREGATOR_URL') ||
      'https://aggregator.walrus-testnet.walrus.space';

    this.logger.log(`Walrus Publisher: ${this.publisherUrl}`);
    this.logger.log(`Walrus Aggregator: ${this.aggregatorUrl}`);

    this.client = new SuiClient({ url: getFullnodeUrl('testnet') });

    const baseClient = new SuiJsonRpcClient({
      url: getFullnodeUrl('testnet'),
      network: 'testnet',
    });

    this.walrusClient = baseClient.$extend(
      walrus({
        uploadRelay: {
          host: 'https://upload-relay.testnet.walrus.space',
          sendTip: { max: 1_000 },
        },
      }),
    );
  }
  async onModuleInit() {
    this.logger.log('🚀 Module initialized - starting model upload');

    // try {
    //   const blobId: string = await this.uploadModelFolder();
    //   this.logger.log(`📤 Blob ID: ${blobId}`);

    //   const packageId = '0x7c3d96820e87bf34f8db46c90d4295878e120d7c91a832b85e38181929e15141';
    //   const address = this.keypair.getPublicKey().toSuiAddress();
    //   console.log('Your address:', address);
    //   const tx = new Transaction();

    //   // ✅ Cách đúng với @mysten/sui mới nhất
    //   tx.moveCall({
    //     target: `${packageId}::model_bundle::create_bundle`,
    //     arguments: [
    //       tx.pure.string('MyAIModel-v1'),  // name
    //       tx.pure.string(blobId),          // initial_blob
    //     ],
    //   });
    //   const result = await this.client.signAndExecuteTransaction({
    //     transaction: tx,
    //     signer: this.keypair,
    //     options: {
    //       showEffects: true,
    //       showEvents: true,
    //       showObjectChanges: true,
    //     },
    //   });

    //   this.logger.log(`✅ Transaction digest: ${result.digest}`);

    //   // Check status
    //   if (result.effects?.status?.status !== 'success') {
    //     const errorMsg = result.effects?.status?.error || 'Unknown error';
    //     throw new Error(`Transaction failed: ${errorMsg}`);
    //   }

    //   // Lấy Bundle ID
    //   const createdObjects = result.objectChanges?.filter(
    //     (change) => change.type === 'created'
    //   );

    //   if (createdObjects && createdObjects.length > 0) {
    //     for (const obj of createdObjects) {
    //       if ('objectId' in obj && 'objectType' in obj) {
    //         this.logger.log(`Created object: ${obj.objectType}`);

    //         if (obj.objectType.includes('Bundle')) {
    //           this.logger.log(`✅ Bundle ID: ${obj.objectId}`);
    //           this.logger.log(`⚠️  Add to .env: BUNDLE_ID=${obj.objectId}`);

    //           return {
    //             bundleId: obj.objectId,
    //             blobId,
    //             digest: result.digest,
    //           };
    //         }
    //       }
    //     }
    //   }

    //   throw new Error('Bundle object not found in transaction');

    // } catch (err) {
    //   this.logger.error('❌ Create bundle failed:');
    //   this.logger.error('Message:', err.message);

    //   // Log chi tiết error nếu có
    //   if (err.cause) {
    //     this.logger.error('Cause:', err.cause);
    //   }

    //   throw err;
    // }
  }
  /**
   * 🧩 Upload toàn bộ folder model/ dưới dạng ZIP dùng JSZip
   */
  async uploadModelFolder(): Promise<string> {
    try {
      const folderPath = path.join(process.cwd(), 'model');
      if (!fs.existsSync(folderPath)) {
        throw new Error(`Folder not found: ${folderPath}`);
      }

      const zip = new JSZip();

      const addFilesRecursively = async (dir: string, zipFolder: JSZip) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            const folder = zipFolder.folder(entry.name);
            await addFilesRecursively(fullPath, folder!);
          } else if (entry.isFile()) {
            const data = fs.readFileSync(fullPath);
            zipFolder.file(entry.name, data);
          }
        }
      };

      await addFilesRecursively(folderPath, zip);

      const content = await zip.generateAsync({ type: 'uint8array' });
      this.logger.log(
        `🗜️ Folder 'model/' zipped: ${content.byteLength / 1024} KB`,
      );

      const { blobObject, blobId } = await this.walrusClient.walrus.writeBlob({
        blob: content,
        deletable: true,
        epochs: 3,
        signer: this.keypair,
        owner: this.keypair.toSuiAddress(),
      });

      // const blobId = blobObject?.blob_id;
      this.logger.log(`✅ Uploaded model.zip → ${blobId}`);

      return blobId;
    } catch (err) {
      this.logger.error('❌ uploadModelFolder failed:', err.message);
      throw err;
    }
  }

  async uploadJson(data: any): Promise<string> {
    try {
      const jsonData = JSON.stringify(data);
      const blob = new Uint8Array(Buffer.from(jsonData, 'utf8'));
      const { blobObject } = await this.walrusClient.walrus.writeBlob({
        blob,
        deletable: true,
        epochs: 3,
        signer: this.keypair,
        owner: this.keypair.toSuiAddress(),
      });

      const blobId = blobObject?.blob_id;
      this.logger.log(`✅ Uploaded JSON → ${blobId}`);
      return blobId;
    } catch (error: any) {
      this.logger.error(`❌ Upload failed: ${error.message}`);
      throw error;
    }
  }

  async downloadJson(blobId: string): Promise<any> {
    try {
      const response = await fetch(
        `https://wal-aggregator-testnet.staketab.org/v1/blobs/${blobId}`,
      );
      if (!response.ok)
        throw new Error(`Failed to fetch blob: ${response.statusText}`);

      // Node.js: convert to Uint8Array
      const arrayBuffer = await response.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    } catch (error) {
      this.logger.error('❌ Download failed:', error);
      throw error;
    }
  }

  getBlobUrl(blobId: string): string {
    return `${this.aggregatorUrl}/blobs/${blobId}`;
  }

  decodeBlobId(returnValues: any): string {
    const [bytes] = returnValues[0];
    let raw = String.fromCharCode(...bytes);

    if (raw.startsWith('B0x')) {
      raw = raw.substring(1);
    }

    const safeBlobId = raw
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    return safeBlobId.slice(1);
  }
  async getBlobIdFromContract(): Promise<string> {
    const tx = new Transaction();

    tx.moveCall({
      target: `0x7c3d96820e87bf34f8db46c90d4295878e120d7c91a832b85e38181929e15141::model_bundle::get_latest_blob`,
      arguments: [
        tx.object(
          '0xbe5b43f4354cce01811518baa68f405e5edee3edaf06e70a4edb0f9d1d0825b1',
        ),
      ],
    });

    const result = await this.client.devInspectTransactionBlock({
      transactionBlock: tx,
      sender:
        '0xb705c65172d8d47b17ba7643fdab92086e63f4814dfd249efb20ce521365754d',
    });

    return this.decodeBlobId(result.results[0].returnValues);
  }
  async extractZipFiles(zipBlob: Blob): Promise<ExtractedFile[]> {
    const zip = new JSZip();
    const zipData = await zip.loadAsync(zipBlob);

    const extractedFiles: ExtractedFile[] = [];

    for (const [filename, file] of Object.entries(zipData.files)) {
      if (!file.dir) {
        const content = await file.async('uint8array');
        extractedFiles.push({
          name: filename,
          content: content,
          size: content.length,
        });
      }
    }

    return extractedFiles;
  }
  async fetchAndExtractZip() {
    try {
      console.log('📦 Getting blob ID from contract...');
      const blobId = await this.getBlobIdFromContract();
      console.log('✅ Blob ID:', blobId);

      console.log('⬇️  Downloading ZIP from Walrus...');
      const zipBlob = await this.downloadJson(blobId);
      console.log('✅ Downloaded ZIP:', zipBlob.size, 'bytes');

      console.log('📂 Extracting files...');
      const extractedFiles = await this.extractZipFiles(zipBlob);
      console.log('✅ Extracted', extractedFiles.length, 'files');

      const modelDir = path.join(process.cwd(), 'src', 'model');
      await fs.promises.mkdir(modelDir, { recursive: true });

      // --- 2️⃣ Lưu từng file vào folder tương ứng ---
      for (const file of extractedFiles) {
        const filePath = path.join(modelDir, file.name);

        // Tạo thư mục con nếu cần
        await fs.promises.mkdir(path.dirname(filePath), { recursive: true });

        // Ghi file
        await fs.promises.writeFile(filePath, Buffer.from(file.content));
        console.log(`💾 Saved: ${file.name}`);
      }

      console.log(`🎯 All files saved to ${modelDir}`);
      return extractedFiles;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ Error:', err);
    }
  }
}
