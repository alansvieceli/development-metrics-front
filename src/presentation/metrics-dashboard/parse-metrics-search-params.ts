import type { PeriodType } from "@/application/metrics/period";
import { parseDateOnly } from "@/application/shared/validation";

export type MetricsSearchParams = {
	period?: string;
	date?: string;
	start?: string;
	end?: string;
	developer?: string;
};

export type MetricsFilter =
	| { periodType: PeriodType; referenceDate: Date }
	| { periodType: "SPRINT"; referenceDate: Date; start: Date; end: Date };

export function parseMetricsFilter(
	searchParams: MetricsSearchParams,
	now: Date = new Date(),
): MetricsFilter {
	if (searchParams.period === "sprint") {
		const start = parseDateOnly(searchParams.start);
		const endInput = parseDateOnly(searchParams.end);
		if (start && endInput && start <= endInput) {
			const end = new Date(endInput);
			end.setUTCDate(end.getUTCDate() + 1);
			return { periodType: "SPRINT", referenceDate: start, start, end };
		}
	}
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
