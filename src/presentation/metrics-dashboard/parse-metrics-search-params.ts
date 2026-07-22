import type { PeriodType } from "@/application/metrics/period";
import type { MetricsPeriodPreference } from "@/application/metrics/ports/metrics-period-preference-store";
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
	| { periodType: "CUSTOM"; referenceDate: Date; start: Date; end: Date };

export function parseMetricsFilter(
	searchParams: MetricsSearchParams,
	now: Date = new Date(),
	preference?: MetricsPeriodPreference | null,
): MetricsFilter {
	const effective: MetricsSearchParams =
		searchParams.period === undefined && preference ? preference : searchParams;

	if (effective.period === "custom") {
		const start = parseDateOnly(effective.start);
		const endInput = parseDateOnly(effective.end);
		if (start && endInput && start <= endInput) {
			const end = new Date(endInput);
			end.setUTCDate(end.getUTCDate() + 1);
			return { periodType: "CUSTOM", referenceDate: start, start, end };
		}
	}
	const periodType: PeriodType =
		effective.period === "month"
			? "MONTH"
			: effective.period === "fortnight"
				? "FORTNIGHT"
				: "WEEK";
	return {
		periodType,
		referenceDate: parseDateOnly(effective.date) ?? now,
	};
}
