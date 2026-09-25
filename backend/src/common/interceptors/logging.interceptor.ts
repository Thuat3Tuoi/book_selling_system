import { Injectable, Logger, type NestInterceptor } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common/interfaces/features/execution-context.interface.js";
import type { CallHandler } from "@nestjs/common/interfaces/features/nest-interceptor.interface.js";
import type { Observable } from "rxjs/internal/Observable";
import { randomUUID } from "node:crypto";
import { tap } from "rxjs/operators";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    private readonly logger = new Logger(LoggingInterceptor.name);

    intercept(context: ExecutionContext, next: CallHandler<any>): Observable<any> {
        const http = context.switchToHttp();

        const request = http.getRequest();
        const response = http.getResponse();

        // Tạo ID duy nhất cho request
        const requestId = randomUUID();

        // Trả request ID về client để hỗ trợ truy vết
        response.setHeader("X-Request-ID", requestId);

        const { method, path } = request;

        // Ghi nhận thời điểm bắt đầu
        const startTime = performance.now();

        this.logger.log(`[${requestId}] START ${method} ${path}`);

        // Chuyển request đến controller/service
        return next.handle().pipe(
            tap({
                next: () => {
                    const duration = performance.now() - startTime;

                    this.logger.log(
                        `[${requestId}] SUCCESS ${method} ${path} ` + `${duration.toFixed(2)}ms`
                    );
                },

                error: (error) => {
                    const duration = performance.now() - startTime;

                    this.logger.error(
                        `[${requestId}] FAILED ${method} ${path} ` +
                            `${duration.toFixed(2)}ms ` +
                            `status=${error.status ?? 500}`
                    );
                },
            })
        );
    }
}
