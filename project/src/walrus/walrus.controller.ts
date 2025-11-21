import { Body, Controller, Get, Post } from '@nestjs/common';
import { WalrusService } from './walrus.service';
import { ApiTags } from '@nestjs/swagger';
import { ModelService } from './mode.service';
import { ModelDto } from './dtos/model.dto';

@Controller('walrus')
@ApiTags('Walrus')
export class WalrusController {
  constructor(
    private readonly walrusService: WalrusService,
    private readonly modelService: ModelService,
  ) {}

  @Post('upload')
  async uploadModel() {
    const blobId = await this.walrusService.uploadModelFolder();
    return { blobId };
  }
  @Get('getFileAndSave')
  async getFileAndSave(): Promise<any> {
    return await this.walrusService.fetchAndExtractZip();
  }
  @Post("predict")
  async predict(@Body() data:ModelDto): Promise<any>{
    return await this.modelService.predict(data.txHash)
  }
}
