import {prisma} from "@/lib/db";
import {BUILTIN_PLUGINS} from "@/domain/plugins";

// Ensure every built-in plugin has a row in `Plugin`. Existing rows keep
// whatever the user toggled them to. Plugins removed from the registry are
// left in DB untouched (cheap and forward-compatible if they are reintroduced).
export async function seedPlugins(): Promise<void> {
    for (const plugin of BUILTIN_PLUGINS) {
        await prisma.plugin.upsert({
            where: {id: plugin.id},
            create: {id: plugin.id, enabled: plugin.defaultEnabled},
            update: {},
        });
    }
}

export async function loadActivePlugins(): Promise<string[]> {
    const rows = await prisma.plugin.findMany({where: {enabled: true}});
    return rows.map((r) => r.id);
}
