import type { MetricsSearchParams } from "./parse-metrics-search-params";

const FILTER_KEYS = ["period", "date", "start", "end"] as const;

export function buildMetricsUrl(
	pathname: string,
	currentSearch: URLSearchParams,
	filter: MetricsSearchParams,
): string {
	const params = new URLSearchParams(currentSearch);
	for (const key of FILTER_KEYS) params.delete(key);
	for (const [key, value] of Object.entries(filter)) {
		if (value) params.set(key, value);
	}
	return `${pathname}?${params.toString()}`;
}
