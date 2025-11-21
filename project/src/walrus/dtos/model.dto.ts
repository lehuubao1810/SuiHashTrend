import { ApiPropertyOptional } from "@nestjs/swagger";
import {IsArray, IsOptional}  from "class-validator"
export class ModelDto{
    @ApiPropertyOptional()
    @IsOptional()
    @IsArray()
    txHash:any[]
}