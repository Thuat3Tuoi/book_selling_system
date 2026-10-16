import {
    ArgumentsHost,
    Catch,
    HttpException,
    HttpStatus,
    type ExceptionFilter,
} from "@nestjs/common";
import type { Response } from "express";

@Catch()
export class ResponseEnvelopeExceptionFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost): void {
        const response = host.switchToHttp().getResponse<Response>();
        const statusCode =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;
        const exceptionResponse =
            exception instanceof HttpException ? exception.getResponse() : null;

        let message = "Internal server error";
        let details: string[] | undefined;

        if (typeof exceptionResponse === "string") {
            message = exceptionResponse;
        } else if (
            exceptionResponse &&
            typeof exceptionResponse === "object" &&
            "message" in exceptionResponse
        ) {
            if (Array.isArray(exceptionResponse.message)) {
                message = "Validation failed";
                details = exceptionResponse.message.filter(
                    (item): item is string => typeof item === "string"
                );
            } else if (typeof exceptionResponse.message === "string") {
                message = exceptionResponse.message;
            }
        }

        response.status(statusCode).json({
            success: false,
            error: {
                statusCode,
                message,
                ...(details ? { details } : {}),
            },
        });
    }
}
