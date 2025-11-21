import { Module } from '@nestjs/common';
import { WalrusService } from './walrus.service';
import { OnchainModule } from 'src/onchain/onchain.module';
import { WalrusController } from './walrus.controller';
import { ModelService } from './mode.service';

@Module({
  imports: [OnchainModule],
  providers: [WalrusService,ModelService],
  exports: [WalrusService,ModelService],
  controllers:[WalrusController]
})
export class WalrusModule {}
