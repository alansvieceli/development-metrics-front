import type { PeriodType } from "@/application/metrics/period";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function getIsoWeekNumber(monday: Date): number {
	const thursday = new Date(monday);
	thursday.setUTCDate(thursday.getUTCDate() + 3);
	const isoYear = thursday.getUTCFullYear();
	const jan4 = new Date(Date.UTC(isoYear, 0, 4));
	const jan4DayNr = (jan4.getUTCDay() + 6) % 7;
	const firstThursday = new Date(jan4);
	firstThursday.setUTCDate(jan4.getUTCDate() - jan4DayNr + 3);
	return (
		1 +
		Math.round(
			(thursday.getTime() - firstThursday.getTime()) / (7 * MS_PER_DAY),
		)
	);
}

function formatDayMonth(date: Date): string {
	return date.toLocaleDateString("pt-BR", {
		day: "2-digit",
		month: "2-digit",
		timeZone: "UTC",
	});
}

function capitalize(value: string): string {
	return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatPeriodLabel(
	periodType: PeriodType,
	periodStart: Date,
	periodEnd: Date,
): string {
	if (periodType === "MONTH") {
		const month = capitalize(
			periodStart.toLocaleDateString("pt-BR", {
				month: "long",
				timeZone: "UTC",
			}),
		);
		return `${month} de ${periodStart.getUTCFullYear()}`;
	}
	if (periodType === "FORTNIGHT") {
		const lastDay = new Date(periodEnd.getTime() - MS_PER_DAY);
		return `${periodStart.getUTCDate() === 1 ? "1ª" : "2ª"} quinzena · ${formatDayMonth(periodStart)} – ${formatDayMonth(lastDay)}`;
	}
	const week = getIsoWeekNumber(periodStart);
	const lastDay = new Date(periodEnd.getTime() - MS_PER_DAY);
	return `Semana ${week} · ${formatDayMonth(periodStart)} – ${formatDayMonth(lastDay)}`;
}

export function formatSprintLabel(periodStart: Date, periodEnd: Date): string {
	const lastDay = new Date(periodEnd.getTime() - MS_PER_DAY);
	return `Sprint · ${formatDayMonth(periodStart)} – ${formatDayMonth(lastDay)}`;
}

export function formatPeriodShortLabel(
	periodType: PeriodType,
	periodStart: Date,
): string {
	if (periodType === "WEEK") {
		return formatDayMonth(periodStart);
	}
	const monthAbbrev = periodStart
		.toLocaleDateString("pt-BR", { month: "short", timeZone: "UTC" })
		.replace(".", "");
	const yearShort = String(periodStart.getUTCFullYear()).slice(-2);
	const monthLabel = `${capitalize(monthAbbrev)}/${yearShort}`;
	return periodType === "FORTNIGHT"
		? `${periodStart.getUTCDate() === 1 ? "1ª" : "2ª"} ${monthLabel}`
		: monthLabel;
}
