import {PrismaClient} from "@prisma/client";
import {PrismaBetterSqlite3} from "@prisma/adapter-better-sqlite3";

declare global {
    var __prisma: PrismaClient | undefined;
}

function createClient(): PrismaClient {
    const url = process.env.DATABASE_URL ?? "file:./data/umlautadaptarrex.db";
    const adapter = new PrismaBetterSqlite3({url});
    return new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
}

export const prisma: PrismaClient = globalThis.__prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
    globalThis.__prisma = prisma;
}
