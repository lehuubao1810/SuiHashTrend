import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';

@Injectable()
export class OnchainService {
  private readonly logger = new Logger(OnchainService.name);
  private client: SuiClient;
  private keypair: Ed25519Keypair;
  private privateKeyStr =
    'suiprivkey1qr7hrascxrutl2uluymxryje5hq2j8kl9y2574lmkkx95umhg0hp7309xr8';
  constructor(private configService: ConfigService) {
    const suiRpc = this.configService.get<string>('SUI_RPC');
    const privateKey = this.privateKeyStr;
    if (!suiRpc || !privateKey) {
      throw new Error('Missing SUI_RPC or MNEMONIC in environment');
    }

    // Remove 0x prefix and whitespace
    // const cleanHex = privateKeyHex.replace(/^0x/, '').trim();

    this.keypair = Ed25519Keypair.fromSecretKey(privateKey);
    console.log('🚀 ~ OnchainService ~ constructor ~ keypair:', this.keypair);

    this.client = new SuiClient({ url: suiRpc });

    this.logger.log(
      `Initialized OnchainService with address: ${this.getAddress()}`,
    );
  }

  getAddress(): string {
    return this.keypair.getPublicKey().toSuiAddress();
  }

  // onchain.service.ts
  async updateCid(manifestCid: string): Promise<string> {
    const packageId = this.configService.get<string>('PACKAGE_ID');
    const registryObjectId =
      this.configService.get<string>('REGISTRY_OBJECT_ID');

    if (!packageId || !registryObjectId) {
      throw new Error('PACKAGE_ID or REGISTRY_OBJECT_ID not set');
    }

    try {
      this.logger.log(
        `Updating manifest CID onchain: ${manifestCid.substring(0, 20)}...`,
      );

      const tx = new Transaction();

      tx.moveCall({
        target: `${packageId}::registry::update_cid`,
        arguments: [tx.object(registryObjectId), tx.pure.string(manifestCid)],
      });

      tx.setGasBudget(10000000);

      const result = await this.client.signAndExecuteTransaction({
        signer: this.keypair,
        transaction: tx,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      });

      this.logger.log(`✅ Transaction successful: ${result.digest}`);
      return result.digest;
    } catch (error) {
      this.logger.error('Failed to update CID onchain:', error);
      throw error;
    }
  }

  async getBalance(): Promise<string> {
    const balance = await this.client.getBalance({
      owner: this.getAddress(),
    });
    return balance.totalBalance;
  }
}
