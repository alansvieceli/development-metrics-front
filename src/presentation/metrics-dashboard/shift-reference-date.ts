import type { PeriodType } from "@/application/metrics/period";

const WINDOW_DAYS: Record<PeriodType, number> = {
	WEEK: 7,
	FORTNIGHT: 15,
	MONTH: 30,
};

export function shiftReferenceDate(
	periodType: PeriodType,
	referenceDate: Date,
	direction: -1 | 1,
): Date {
	const shifted = new Date(referenceDate);
	shifted.setUTCDate(
		shifted.getUTCDate() + WINDOW_DAYS[periodType] * direction,
	);
	return shifted;
}
