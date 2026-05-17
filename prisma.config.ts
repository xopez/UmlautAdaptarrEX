import {defineConfig} from "prisma/config";

export default defineConfig({
    schema: "./prisma/schema.prisma",
    datasource: {
        url: process.env.DATABASE_URL ?? "file:./data/umlautadaptarrex.db",
    },
    migrations: {
        path: "./prisma/migrations",
    },
});
