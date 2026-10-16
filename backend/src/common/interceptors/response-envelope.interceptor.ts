import {
    Injectable,
    type CallHandler,
    type ExecutionContext,
    type NestInterceptor,
} from "@nestjs/common";
import { map, type Observable } from "rxjs";

export interface ResponseEnvelope<T> {
    success: true;
    data: T;
    meta?: unknown;
}

@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<ResponseEnvelope<unknown>> {
        if (context.getType() !== "http") {
            return next.handle();
        }

        return next.handle().pipe(
            map((value: unknown) => {
                if (
                    value !== null &&
                    typeof value === "object" &&
                    "data" in value &&
                    "meta" in value &&
                    Array.isArray(value.data)
                ) {
                    return { success: true as const, data: value.data, meta: value.meta };
                }

                return { success: true as const, data: value ?? null };
            })
        );
    }
}
