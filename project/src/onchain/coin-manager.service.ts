import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

@Injectable()
export class CoinManagerService {
  private readonly logger = new Logger(CoinManagerService.name);
  private client: SuiClient;
  private keypair: Ed25519Keypair;
  private walCoinType: string;

  constructor(private configService: ConfigService) {
    const suiRpc = this.configService.get<string>('SUI_RPC');
    const privateKeyHex = this.configService.get<string>('PRIVATE_KEY_HEX');
    this.walCoinType = this.configService.get<string>('WAL_COIN_TYPE') || '';

    if (!suiRpc || !privateKeyHex) {
      throw new Error('Missing SUI_RPC or PRIVATE_KEY_HEX');
    }

    this.client = new SuiClient({ url: suiRpc });
    this.keypair = Ed25519Keypair.fromSecretKey(
      privateKeyHex
    );
  }

  getAddress(): string {
    return this.keypair.getPublicKey().toSuiAddress();
  }

  async getWalCoins(minBalance: bigint = BigInt(1000000)): Promise<string[]> {
    try {
      const address = this.getAddress();

      if (!this.walCoinType) {
        throw new Error('WAL_COIN_TYPE not configured in .env');
      }

      this.logger.debug(`Fetching WAL coins for ${address}`);

      const coins = await this.client.getCoins({
        owner: address,
        coinType: this.walCoinType,
      });

      // Filter coins with sufficient balance
      const validCoins = coins.data
        .filter((coin) => BigInt(coin.balance) >= minBalance)
        .map((coin) => coin.coinObjectId);

      this.logger.debug(`Found ${validCoins.length} WAL coins with sufficient balance`);

      return validCoins;
    } catch (error: any) {
      this.logger.error('Failed to get WAL coins:', error.message);
      throw error;
    }
  }

  async getWalBalance(): Promise<string> {
    try {
      const address = this.getAddress();

      if (!this.walCoinType) {
        return '0';
      }

      const balance = await this.client.getBalance({
        owner: address,
        coinType: this.walCoinType,
      });

      return balance.totalBalance;
    } catch (error) {
      return '0';
    }
  }

  async getSuiBalance(): Promise<string> {
    try {
      const address = this.getAddress();
      const balance = await this.client.getBalance({ owner: address });
      return balance.totalBalance;
    } catch (error) {
      return '0';
    }
  }
}