import type { PeriodType } from "@/application/metrics/period";

export type MetricsSearchParams = { period?: string; date?: string };

export type MetricsFilter = { periodType: PeriodType; referenceDate: Date };

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function parseMetricsFilter(
	searchParams: MetricsSearchParams,
	now: Date = new Date(),
): MetricsFilter {
	const periodType: PeriodType =
		searchParams.period === "month" ? "MONTH" : "WEEK";
	return {
		periodType,
		referenceDate: parseReferenceDate(searchParams.date) ?? now,
	};
}

function parseReferenceDate(date: string | undefined): Date | null {
	if (!date || !DATE_ONLY_PATTERN.test(date)) {
		return null;
	}
	const parsed = new Date(`${date}T00:00:00Z`);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
}
