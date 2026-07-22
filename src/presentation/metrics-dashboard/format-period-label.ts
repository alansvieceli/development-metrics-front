import type { PeriodType } from "@/application/metrics/period";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function formatDayMonth(date: Date): string {
	return date.toLocaleDateString("pt-BR", {
		day: "2-digit",
		month: "2-digit",
		timeZone: "UTC",
	});
}

export function formatPeriodRangeLabel(
	periodStart: Date,
	periodEnd: Date,
): string {
	const lastDay = new Date(periodEnd.getTime() - MS_PER_DAY);
	return `${formatDayMonth(periodStart)} – ${formatDayMonth(lastDay)}`;
}

export function formatPeriodShortLabel(
	_periodType: PeriodType,
	periodStart: Date,
): string {
	return formatDayMonth(periodStart);
}
