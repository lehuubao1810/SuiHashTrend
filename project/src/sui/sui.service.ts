import {
  Injectable,
  OnModuleDestroy,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { SuiClient } from '@mysten/sui/client';
import { WalrusService } from '../walrus/walrus.service';
import { OnchainService } from '../onchain/onchain.service';
import { WsGateway } from '../ws-broadcast/ws.gateway';
import * as fs from 'fs';
import * as path from 'path';

interface TxEvent {
  txDigest: string;
  type: string;
  sender: string;
  timestamp: string;
  raw: any;
}

@Injectable()
export class SuiRealtimeService implements OnModuleDestroy {
  private readonly logger = new Logger(SuiRealtimeService.name);
  private client: SuiClient;
  private buffer: TxEvent[] = [];
  private maxBuffer: number;
  private lastFlush = Date.now();
  private flushIntervalMs: number;
  private isFlushing = false;
  private lastCursor: string | null = null;
  private isPolling = false;
  private processedTxs = new Set<string>();

  constructor(
    @Inject(forwardRef(() => WalrusService))
    private walrusService: WalrusService,
    @Inject(forwardRef(() => OnchainService))
    private onchainService: OnchainService,
    @Inject(forwardRef(() => WsGateway))
    private wsGateway: WsGateway,
  ) {
    const suiRpc = process.env.SUI_RPC;
    this.client = new SuiClient({ url: suiRpc });

    this.maxBuffer = parseInt(process.env.BATCH_SIZE || '100');
    this.flushIntervalMs = parseInt(process.env.BATCH_TIME_MS || '600000');
  }

  async onModuleDestroy() {
    this.logger.log('🧹 Shutting down Sui Realtime Service...');
    if (this.buffer.length > 0) {
      this.logger.log('💾 Flushing remaining buffer before shutdown...');
      await this.flushBuffer();
    }
  }

  /** ======================= CORE METHODS ======================= **/

  async pollTransactionsOnce() {
    if (this.isPolling) return;
    this.isPolling = true;

    try {
      const response = await this.client.queryTransactionBlocks({
        limit: 20,
        cursor: this.lastCursor,
        order: 'descending',
        options: {
          showEffects: true,
          showInput: true,
          showEvents: true,
          showObjectChanges: true,
        },
      });

      if (response.data?.length > 0) {
        this.lastCursor = response.nextCursor || null;

        for (const tx of response.data) {
          if (this.processedTxs.has(tx.digest)) continue;

          this.processedTxs.add(tx.digest);

          // Clean old digests
          if (this.processedTxs.size > 10000) {
            const toDelete = Array.from(this.processedTxs).slice(0, 5000);
            toDelete.forEach((d) => this.processedTxs.delete(d));
          }

          if (this.isTargetTx(tx)) {
            const event: TxEvent = {
              txDigest: tx.digest,
              type: this.detectTxType(tx),
              sender: tx.transaction?.data?.sender || 'unknown',
              timestamp: new Date(
                parseInt(tx.timestampMs || Date.now().toString()),
              ).toISOString(),
              raw: tx,
            };

            this.buffer.push(event);

            if (this.buffer.length >= this.maxBuffer) {
              await this.flushBuffer();
            }
          }
        }

        this.logger.debug(
          `✅ Polled ${response.data.length} txs, buffer: ${this.buffer.length}/${this.maxBuffer}`,
        );
      }
    } catch (error) {
      this.logger.error('❌ Polling error:', error.message);
    } finally {
      this.isPolling = false;
    }
  }

  private async flushBuffer() {
    if (this.isFlushing || this.buffer.length === 0) return;

    this.isFlushing = true;
    const bufferToFlush = [...this.buffer];
    this.buffer = [];

    try {
      this.logger.log(`📤 Flushing ${bufferToFlush.length} transactions...`);
      for (const tx of bufferToFlush) {
        await this.saveTxToFile(tx);
      }

      const allFiles = this.listAllTransactionFiles();
      this.logger.log(`📂 Total transaction files: ${allFiles.length}`);
    } catch (error) {
      this.logger.error('❌ Flush error:', error);
      this.buffer.unshift(...bufferToFlush);
      this.logger.warn(`Re-added ${bufferToFlush.length} txs to buffer`);
    } finally {
      this.isFlushing = false;
      this.lastFlush = Date.now();
    }
  }

  async manualFlush() {
    this.logger.log('🔧 Manual flush triggered');
    await this.flushBuffer();
  }

  /** ======================= HELPERS ======================= **/

  private isTargetTx(txDetails: any): boolean {
    const types = ['swap', 'mint', 'buy', 'stake', 'nft', 'defi'];
    const s = JSON.stringify(txDetails).toLowerCase();
    return types.some((t) => s.includes(t));
  }

  private detectTxType(txDetails: any): string {
    const s = JSON.stringify(txDetails).toLowerCase();
    if (s.includes('swap')) return 'swap';
    if (s.includes('mint')) return 'mint_nft';
    if (s.includes('buy')) return 'buy_nft';
    if (s.includes('stake')) return 'stake';
    return 'other';
  }

  private async saveTxToFile(txDetails: any): Promise<void> {
    try {
      const txType = this.detectTxType(txDetails);
      const digest =
        txDetails?.digest || txDetails?.effects?.transactionDigest || 'unknown';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const dir = path.join(process.cwd(), 'transactions', txType);

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const filePath = path.join(dir, `${timestamp}-${digest}.json`);
      fs.writeFileSync(filePath, JSON.stringify(txDetails, null, 2), 'utf8');

      this.logger.log(`💾 Saved ${txType} tx → ${filePath}`);
    } catch (err) {
      this.logger.error('❌ Error saving tx to file:', err);
    }
  }

  private listAllTransactionFiles(
    baseDir = path.join(process.cwd(), 'transactions'),
  ): string[] {
    const results: string[] = [];

    function readDirRecursive(dir: string) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          readDirRecursive(fullPath);
        } else if (entry.isFile() && fullPath.endsWith('.json')) {
          results.push(fullPath.replace(/\\/g, '/'));
        }
      }
    }

    if (fs.existsSync(baseDir)) {
      readDirRecursive(baseDir);
    } else {
      this.logger.warn(`⚠️ Folder not found: ${baseDir}`);
    }

    return results;
  }

  /** ======================= STATUS ======================= **/

  getBufferStatus() {
    return {
      size: this.buffer.length,
      maxSize: this.maxBuffer,
      lastFlush: new Date(this.lastFlush).toISOString(),
      timeSinceLastFlush: Date.now() - this.lastFlush,
      isFlushing: this.isFlushing,
      processedCount: this.processedTxs.size,
    };
  }
  async getTxHashNewIn1Minute(): Promise<{
    processedTransactions: number;
    newEvents: TxEvent[];
    totalBufferSize: number;
    hasMore: boolean;
    duration: number;
  }> {
    const startTime = Date.now();
    const newEvents: TxEvent[] = [];
    const targetCount = 100; // Đích: 100 target transactions
    let transactionsProcessed = 0;
    let currentCursor = this.lastCursor;
  
    try {
      // Lặp cho đến khi có đủ 100 target transactions
      while (newEvents.length < targetCount) {
        const response = await this.client.queryTransactionBlocks({
          limit: 30,
          cursor: currentCursor,
          order: 'descending',
          options: {
            showEffects: true,
            showInput: true,
            showEvents: true,
            showObjectChanges: true,
          },
        });
  
        if (!response.data?.length) break;
  
        // Xử lý transactions
        for (const tx of response.data) {
          if (this.isTargetTx(tx)) {
            const event: TxEvent = {
              txDigest: tx.digest,
              type: this.detectTxType(tx),
              sender: tx.transaction?.data?.sender || 'unknown',
              timestamp: new Date(
                parseInt(tx.timestampMs || Date.now().toString()),
              ).toISOString(),
              raw: tx,
            };
            
            this.buffer.push(event);
            newEvents.push(event);
  
            // Dừng ngay khi đủ 100
            if (newEvents.length >= targetCount) break;
          }
        }
  
        transactionsProcessed += response.data.length;
        currentCursor = response.nextCursor || null;
  
        // Dừng nếu không còn cursor hoặc đã đủ 100
        if (!response.nextCursor || newEvents.length >= targetCount) break;
        
        // Delay giữa các lần fetch
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
  
      this.lastCursor = currentCursor;
  
      return {
        processedTransactions: transactionsProcessed,
        newEvents: newEvents,
        totalBufferSize: this.buffer.length,
        hasMore: currentCursor !== null,
        duration: Date.now() - startTime,
      };
  
    } catch (error) {
      this.logger.error('Error fetching transactions:', error);
      
      if (currentCursor) this.lastCursor = currentCursor;
  
      return {
        processedTransactions: transactionsProcessed,
        newEvents: newEvents,
        totalBufferSize: this.buffer.length,
        hasMore: currentCursor !== null,
        duration: Date.now() - startTime,
      };
    }
  }
}
