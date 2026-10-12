
import { IsInt, Min } from "class-validator";

export class OrderItemCreationRequest {
  @IsInt()
  @Min(1)
  bookId!: number;

  @IsInt()
  @Min(1)
  quantity!: number;
}

