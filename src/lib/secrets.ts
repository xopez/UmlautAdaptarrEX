// Node-free so it can be imported from client components; the sibling
// @/arr/prowlarr module pulls undici/node:net and must stay server-only.
export function isMaskedSecret(value: string): boolean {
    if (!value) return false;
    return /^[*•·.]+$/.test(value.trim());
}
