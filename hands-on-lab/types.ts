// Phần giao diện RmqContext/ConfirmChannel cần dùng trong bài học.
// Không kết nối broker và không phụ thuộc package NestJS để chạy lab.
export interface LabMessage {
    content: Buffer;
}

export interface LabConfirmChannel {
    ack(message: LabMessage): void;
    nack(message: LabMessage, allUpTo: boolean, requeue: boolean): void;
    assertQueue(queue: string, options: { durable: boolean }): Promise<unknown>;
    sendToQueue(
        queue: string,
        content: Buffer,
        options: { persistent: boolean },
        callback: (error: Error | null) => void,
    ): boolean;
}

export interface LabContext {
    getChannelRef(): LabConfirmChannel;
    getMessage(): LabMessage;
}
