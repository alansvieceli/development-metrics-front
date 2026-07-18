export type PeriodType = "WEEK" | "MONTH";

export type PeriodRange = {
	start: Date;
	end: Date;
};

export function getPeriodRange(
	periodType: PeriodType,
	referenceDate: Date,
): PeriodRange {
	return periodType === "WEEK"
		? getWeekRange(referenceDate)
		: getMonthRange(referenceDate);
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

function getWeekRange(referenceDate: Date): PeriodRange {
	const start = new Date(
		Date.UTC(
			referenceDate.getUTCFullYear(),
			referenceDate.getUTCMonth(),
			referenceDate.getUTCDate(),
		),
	);
	const dayOfWeek = start.getUTCDay();
	const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
	start.setUTCDate(start.getUTCDate() + diffToMonday);
	const end = new Date(start);
	end.setUTCDate(end.getUTCDate() + 7);
	return { start, end };
}

function getMonthRange(referenceDate: Date): PeriodRange {
	const start = new Date(
		Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), 1),
	);
	const end = new Date(
		Date.UTC(
			referenceDate.getUTCFullYear(),
			referenceDate.getUTCMonth() + 1,
			1,
		),
	);
	return { start, end };
}
