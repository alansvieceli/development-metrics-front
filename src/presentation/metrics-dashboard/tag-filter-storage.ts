export function serializeTagIds(ids: string[]): string | null {
	return ids.length > 0 ? ids.join(",") : null;
}

export function parseStoredTagIds(raw: string | null): string[] {
	if (!raw) return [];
	return raw.split(",").filter(Boolean);
}
