import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { SuiRealtimeService } from "./sui.service";

@Controller('sui')
@ApiTags("Sui")
export class SuiController{
    constructor(
        private readonly suiService:SuiRealtimeService
    ){}

    @Get("getTxHash")
    async getTxHash():Promise<any>{
        return await this.suiService.getTxHashNewIn1Minute()
    }

}