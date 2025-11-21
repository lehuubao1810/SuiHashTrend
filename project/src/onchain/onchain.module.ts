import { Module } from '@nestjs/common';
import { OnchainService } from './onchain.service';
import { CoinManagerService } from './coin-manager.service';


@Module({
  providers: [OnchainService,CoinManagerService],
  exports: [OnchainService,CoinManagerService],
})
export class OnchainModule {}