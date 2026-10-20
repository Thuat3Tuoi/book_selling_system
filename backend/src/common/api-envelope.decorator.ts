import { applyDecorators, type Type } from "@nestjs/common";
import { ApiExtraModels, ApiResponse, getSchemaPath } from "@nestjs/swagger";

export function ApiEnvelopeResponse(status: number, model: Type<unknown>, options?: { array?: boolean; paginated?: boolean }) {
    return applyDecorators(
        ApiExtraModels(model),
        ApiResponse({
            status,
            schema: {
                type: "object",
                required: ["success", "data"],
                properties: {
                    success: { type: "boolean", example: true },
                    data: options?.array || options?.paginated
                        ? { type: "array", items: { $ref: getSchemaPath(model) } }
                        : { $ref: getSchemaPath(model) },
                    ...(options?.paginated ? { meta: { type: "object", additionalProperties: true } } : {}),
                },
            },
        }),
    );
}
