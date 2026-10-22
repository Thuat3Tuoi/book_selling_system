
import {
  IsArray,
  IsNotEmpty,
  IsString,
  MinLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";
import { OrderItemCreationRequest } from "../../order-items/dtos/order-item-creation-request.dto.js";

export class OrderCreaterRequest {
  @IsString()
  @IsNotEmpty({ message: "Địa chỉ không được để trống." })
  @MinLength(10, {
    message: "Địa chỉ phải ít nhất 10 ký tự.",
  })
  @ApiProperty({ minLength: 10 })
  shippingAddress!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemCreationRequest)
  @ApiProperty({ type: () => [OrderItemCreationRequest] })
  orderItems!: OrderItemCreationRequest[];
}

