import type { PeriodType } from "@/application/metrics/period";
import { parseDateOnly } from "@/application/shared/validation";

export type MetricsSearchParams = { period?: string; date?: string };

export type MetricsFilter = { periodType: PeriodType; referenceDate: Date };

export function parseMetricsFilter(
	searchParams: MetricsSearchParams,
	now: Date = new Date(),
): MetricsFilter {
	const periodType: PeriodType =
		searchParams.period === "month"
			? "MONTH"
			: searchParams.period === "fortnight"
				? "FORTNIGHT"
				: "WEEK";
	return {
		periodType,
		referenceDate: parseDateOnly(searchParams.date) ?? now,
	};
}
