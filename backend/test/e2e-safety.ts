if (process.env.E2E_ISOLATED_DB !== "YES" || !process.env.DATABASE_URL) {
    throw new Error("E2E tests require E2E_ISOLATED_DB=YES and a dedicated DATABASE_URL");
}
