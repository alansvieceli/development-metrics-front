export type PeriodType = "WEEK" | "FORTNIGHT" | "MONTH";

export type PeriodRange = {
	start: Date;
	end: Date;
};

export function getPeriodRange(
	periodType: PeriodType,
	referenceDate: Date,
): PeriodRange {
	if (periodType === "WEEK") return getWeekRange(referenceDate);
	if (periodType === "FORTNIGHT") return getFortnightRange(referenceDate);
	return getMonthRange(referenceDate);
}

export function getPreviousPeriods(
	periodType: PeriodType,
	referenceDate: Date,
	count: number,
): PeriodRange[] {
	const ranges: PeriodRange[] = [];
	let cursor = referenceDate;
	for (let i = 0; i < count; i++) {
		const range = getPeriodRange(periodType, cursor);
		ranges.unshift(range);
		const dayBeforeStart = new Date(range.start);
		dayBeforeStart.setUTCDate(dayBeforeStart.getUTCDate() - 1);
		cursor = dayBeforeStart;
	}
	return ranges;
}

function getRollingRange(referenceDate: Date, days: number): PeriodRange {
	const end = new Date(
		Date.UTC(
			referenceDate.getUTCFullYear(),
			referenceDate.getUTCMonth(),
			referenceDate.getUTCDate() + 1,
		),
	);
	const start = new Date(end);
	start.setUTCDate(start.getUTCDate() - days);
	return { start, end };
}

function getWeekRange(referenceDate: Date): PeriodRange {
	return getRollingRange(referenceDate, 7);
}

function getFortnightRange(referenceDate: Date): PeriodRange {
	return getRollingRange(referenceDate, 15);
}

function getMonthRange(referenceDate: Date): PeriodRange {
	return getRollingRange(referenceDate, 30);
}
