import { getPeriodRange, type PeriodType } from "@/application/metrics/period";

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
	if (periodType === "FORTNIGHT") {
		const range = getPeriodRange(periodType, referenceDate);
		if (direction === 1) return range.end;
		const previous = new Date(range.start);
		previous.setUTCDate(previous.getUTCDate() - 1);
		return previous;
	}
	shifted.setUTCMonth(shifted.getUTCMonth() + direction);
	return shifted;
}
