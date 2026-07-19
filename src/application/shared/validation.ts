const UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
	return typeof value === "string" && UUID_PATTERN.test(value);
}

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseDateOnly(value: unknown): Date | null {
	if (typeof value !== "string") {
		return null;
	}
	const match = DATE_ONLY.exec(value);
	if (!match) {
		return null;
	}
	const parsed = new Date(`${value}T00:00:00Z`);
	return parsed.getUTCFullYear() === Number(match[1]) &&
		parsed.getUTCMonth() === Number(match[2]) - 1 &&
		parsed.getUTCDate() === Number(match[3])
		? parsed
		: null;
}
