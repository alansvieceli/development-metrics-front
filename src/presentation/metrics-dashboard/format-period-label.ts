import type { PeriodType } from "@/application/metrics/period";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const PERIOD_LABEL: Record<PeriodType, string> = {
	WEEK: "Semana",
	FORTNIGHT: "15 dias",
	MONTH: "Mês",
};

function formatDayMonth(date: Date): string {
	return date.toLocaleDateString("pt-BR", {
		day: "2-digit",
		month: "2-digit",
		timeZone: "UTC",
	});
}

export function formatPeriodLabel(
	periodType: PeriodType,
	periodStart: Date,
	periodEnd: Date,
): string {
	const lastDay = new Date(periodEnd.getTime() - MS_PER_DAY);
	return `${PERIOD_LABEL[periodType]} · ${formatDayMonth(periodStart)} – ${formatDayMonth(lastDay)}`;
}

export function formatSprintLabel(periodStart: Date, periodEnd: Date): string {
	const lastDay = new Date(periodEnd.getTime() - MS_PER_DAY);
	return `Sprint · ${formatDayMonth(periodStart)} – ${formatDayMonth(lastDay)}`;
}

export function formatPeriodShortLabel(
	_periodType: PeriodType,
	periodStart: Date,
): string {
	return formatDayMonth(periodStart);
}
