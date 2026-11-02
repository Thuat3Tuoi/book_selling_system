import { ApiProperty } from "@nestjs/swagger";
import { HealthStatus } from "../health-status.enum.js";

export class HealthResponseDto {
    @ApiProperty({ enum: HealthStatus, example: HealthStatus.OK })
    status!: HealthStatus;
}
