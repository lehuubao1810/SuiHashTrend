import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WsModule } from './ws-broadcast/ws.module';
import { OnchainModule } from './onchain/onchain.module';
import { WalrusModule } from './walrus/walrus.module';
import { SuiModule } from './sui/sui.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // WsModule,      // Import first as it's global
    WalrusModule,
    OnchainModule,
    SuiModule,     // Import last to avoid circular deps
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}