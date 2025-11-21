import { OnchainModule } from "src/onchain/onchain.module";
import { WalrusModule } from "src/walrus/walrus.module";
import { SuiRealtimeService } from "./sui.service";
import { Module } from "@nestjs/common";
import { WsModule } from "src/ws-broadcast/ws.module";
import { SuiController } from "./sui.controller";

@Module({
    imports: [
      WalrusModule,
      OnchainModule,
      WsModule
      // WsModule is global, no need to import
    ],
    providers: [SuiRealtimeService],
    exports: [SuiRealtimeService],
    controllers:[SuiController]
  })
  export class SuiModule {}
  