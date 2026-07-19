"use client";

import { useRouter } from "next/navigation";
import type { PeriodType } from "@/application/metrics/period";
import { shiftReferenceDate } from "./shift-reference-date";

type PeriodFilterProps = {
	periodType: PeriodType;
	referenceDate: Date;
};

function toDateParam(date: Date): string {
	return date.toISOString().slice(0, 10);
}

function buildMetricsUrl(periodType: PeriodType, referenceDate: Date): string {
	const params = new URLSearchParams({
		period: periodType === "MONTH" ? "month" : "week",
		date: toDateParam(referenceDate),
	});
	return `/metrics?${params.toString()}`;
}

export function PeriodFilter({ periodType, referenceDate }: PeriodFilterProps) {
	const router = useRouter();

	function goTo(nextPeriodType: PeriodType, nextReferenceDate: Date) {
		router.push(buildMetricsUrl(nextPeriodType, nextReferenceDate));
	}

	return (
		<div className="flex h-9 items-center gap-2">
			<div className="flex h-9 rounded-lg border border-(--border)">
				<button
					type="button"
					onClick={() => goTo("WEEK", referenceDate)}
					aria-pressed={periodType === "WEEK"}
					className={`px-4 text-sm ${
						periodType === "WEEK" ? "bg-(--accent) text-(--accent-fg)" : ""
					}`}
				>
					Semana
				</button>
				<button
					type="button"
					onClick={() => goTo("MONTH", referenceDate)}
					aria-pressed={periodType === "MONTH"}
					className={`px-4 text-sm ${
						periodType === "MONTH" ? "bg-(--accent) text-(--accent-fg)" : ""
					}`}
				>
					Mês
				</button>
			</div>
			<button
				type="button"
				onClick={() => goTo(periodType, new Date())}
				className="flex h-9 items-center rounded-lg border border-(--border) px-3 text-sm"
			>
				Período atual
			</button>
			<button
				type="button"
				aria-label="Período anterior"
				onClick={() =>
					goTo(periodType, shiftReferenceDate(periodType, referenceDate, -1))
				}
				className="flex h-9 w-10 items-center justify-center rounded-lg border border-(--border)"
			>
				‹
			</button>
			<button
				type="button"
				aria-label="Próximo período"
				onClick={() =>
					goTo(periodType, shiftReferenceDate(periodType, referenceDate, 1))
				}
				className="flex h-9 w-10 items-center justify-center rounded-lg border border-(--border)"
			>
				›
			</button>
		</div>
	);
}
