import { BookStatus } from "../generated/prisma/enums.js";
import { BookSearchSyncService } from "./book-search-sync.service.js";

describe("BookSearchSyncService", () => {
    const task = {
        bookId: 7,
        revision: "revision-1",
        attempts: 0,
        leaseToken: null as string | null,
    };
    const prisma = {
        bookSearchSync: {
            upsert: vi.fn(),
            findMany: vi.fn(),
            findUnique: vi.fn(),
            updateMany: vi.fn(),
            deleteMany: vi.fn(),
        },
        book: { findUnique: vi.fn() },
    };
    const search = { indexBook: vi.fn(), removeBookFromIndex: vi.fn() };
    let service: BookSearchSyncService;

    beforeEach(() => {
        vi.resetAllMocks();
        service = new BookSearchSyncService(prisma as never, search as never);
        prisma.bookSearchSync.updateMany.mockResolvedValue({ count: 1 });
        prisma.bookSearchSync.deleteMany.mockResolvedValue({ count: 1 });
        prisma.bookSearchSync.findUnique.mockImplementation(async () => ({
            ...task,
            leaseToken: prisma.bookSearchSync.updateMany.mock.calls[0][0].data.leaseToken,
        }));
        prisma.book.findUnique.mockResolvedValue({ id: 7, status: BookStatus.ACTIVE });
    });

    it("keeps a failed sync in PostgreSQL for retry", async () => {
        search.indexBook.mockRejectedValue(new Error("Meilisearch unavailable"));

        await service.syncNow(7);

        expect(prisma.bookSearchSync.deleteMany).not.toHaveBeenCalled();
        expect(prisma.bookSearchSync.updateMany).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({ bookId: 7, revision: task.revision }),
            data: expect.objectContaining({ attempts: 1, leaseUntil: null, leaseToken: null }),
        }));
    });

    it("removes a completed sync task and updates the active book", async () => {
        await service.syncNow(7);

        expect(search.indexBook).toHaveBeenCalledWith({ id: 7, status: BookStatus.ACTIVE });
        expect(prisma.bookSearchSync.deleteMany).toHaveBeenCalledWith({
            where: expect.objectContaining({ bookId: 7, revision: task.revision }),
        });
    });

    it("removes an inactive book from search", async () => {
        prisma.book.findUnique.mockResolvedValue({ id: 7, status: BookStatus.INACTIVE });

        await service.syncNow(7);

        expect(search.removeBookFromIndex).toHaveBeenCalledWith(7);
        expect(search.indexBook).not.toHaveBeenCalled();
    });

    it("keeps a newer revision pending when an old sync completes", async () => {
        prisma.bookSearchSync.deleteMany.mockResolvedValue({ count: 0 });

        await service.syncNow(7);

        expect(prisma.bookSearchSync.updateMany).toHaveBeenLastCalledWith({
            where: expect.objectContaining({ bookId: 7 }),
            data: expect.objectContaining({ leaseUntil: null, leaseToken: null }),
        });
    });
});
