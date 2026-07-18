import type { PeriodType } from "@/application/metrics/period";

export function shiftReferenceDate(
	periodType: PeriodType,
	referenceDate: Date,
	direction: -1 | 1,
): Date {
	const shifted = new Date(referenceDate);
	if (periodType === "WEEK") {
		shifted.setUTCDate(shifted.getUTCDate() + 7 * direction);
		return shifted;
	}
	shifted.setUTCMonth(shifted.getUTCMonth() + direction);
	return shifted;
}
