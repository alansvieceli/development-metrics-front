export function normalizeForMatch(value: string): string {
	return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

export function matchesEitherWay(a: string, b: string): boolean {
	const normalizedA = normalizeForMatch(a);
	const normalizedB = normalizeForMatch(b);
	if (!normalizedA || !normalizedB) return false;
	return normalizedA.includes(normalizedB) || normalizedB.includes(normalizedA);
}
