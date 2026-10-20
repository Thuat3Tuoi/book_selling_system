
import { IsInt, Min } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class OrderItemCreationRequest {
  @IsInt()
  @Min(1)
  @ApiProperty({ minimum: 1 })
  bookId!: number;

  @IsInt()
  @Min(1)
  @ApiProperty({ minimum: 1 })
  quantity!: number;
}

