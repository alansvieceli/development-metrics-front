"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { PeriodType } from "@/application/metrics/period";
import type { MetricsPeriodPreference } from "@/application/metrics/ports/metrics-period-preference-store";
import { Modal } from "@/presentation/shared/modal";
import { buildMetricsUrl } from "./build-metrics-url";
import { shiftReferenceDate } from "./shift-reference-date";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

type PeriodFilterProps = {
	teamId: string;
	saveMetricsPeriodPreferenceAction: (
		teamId: string,
		preference: MetricsPeriodPreference,
	) => Promise<void>;
	periodType: PeriodType | "CUSTOM";
	referenceDate: Date;
	customStart?: Date;
	customEnd?: Date;
};

function toDateParam(date: Date): string {
	return date.toISOString().slice(0, 10);
}

export function PeriodFilter({
	teamId,
	saveMetricsPeriodPreferenceAction,
	periodType,
	referenceDate,
	customStart,
	customEnd,
}: PeriodFilterProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [customModalOpen, setCustomModalOpen] = useState(false);

	function goTo(nextPeriodType: PeriodType, nextReferenceDate: Date) {
		const periodParam =
			nextPeriodType === "MONTH"
				? "month"
				: nextPeriodType === "FORTNIGHT"
					? "fortnight"
					: "week";
		void saveMetricsPeriodPreferenceAction(teamId, { period: periodParam });
		router.push(
			buildMetricsUrl(pathname, new URLSearchParams(searchParams.toString()), {
				period: periodParam,
				date: toDateParam(nextReferenceDate),
			}),
		);
	}

	function submitCustom(formData: FormData) {
		const start = String(formData.get("start") ?? "");
		const end = String(formData.get("end") ?? "");
		if (!start || !end) return;
		setCustomModalOpen(false);
		void saveMetricsPeriodPreferenceAction(teamId, {
			period: "custom",
			start,
			end,
		});
		router.push(
			buildMetricsUrl(pathname, new URLSearchParams(searchParams.toString()), {
				period: "custom",
				start,
				end,
			}),
		);
	}

	return (
		<div className="flex flex-nowrap items-center gap-2">
			<div className="flex h-9 shrink-0 rounded-lg border border-(--border)">
				<button
					type="button"
					onClick={() => goTo("WEEK", referenceDate)}
					aria-pressed={periodType === "WEEK"}
					className={`cursor-pointer px-4 text-sm transition-colors ${
						periodType === "WEEK"
							? "bg-(--accent) text-(--accent-fg)"
							: "hover:bg-white/10"
					}`}
				>
					Semana
				</button>
				<button
					type="button"
					onClick={() => goTo("FORTNIGHT", referenceDate)}
					aria-pressed={periodType === "FORTNIGHT"}
					className={`cursor-pointer px-4 text-sm transition-colors ${
						periodType === "FORTNIGHT"
							? "bg-(--accent) text-(--accent-fg)"
							: "hover:bg-white/10"
					}`}
				>
					Quinzena
				</button>
				<button
					type="button"
					onClick={() => goTo("MONTH", referenceDate)}
					aria-pressed={periodType === "MONTH"}
					className={`cursor-pointer px-4 text-sm transition-colors ${
						periodType === "MONTH"
							? "bg-(--accent) text-(--accent-fg)"
							: "hover:bg-white/10"
					}`}
				>
					Mês
				</button>
			</div>
			<button
				type="button"
				onClick={() => setCustomModalOpen(true)}
				aria-pressed={periodType === "CUSTOM"}
				className={`flex h-9 shrink-0 cursor-pointer items-center rounded-lg border border-(--border) px-3 text-sm whitespace-nowrap transition-colors ${
					periodType === "CUSTOM"
						? "bg-(--accent) text-(--accent-fg)"
						: "hover:bg-white/10"
				}`}
			>
				Personalizado
			</button>
			<button
				type="button"
				disabled={periodType === "CUSTOM"}
				onClick={() => periodType !== "CUSTOM" && goTo(periodType, new Date())}
				className="flex h-9 shrink-0 cursor-pointer items-center rounded-lg border border-(--border) px-3 text-sm whitespace-nowrap transition-colors hover:bg-white/10 disabled:pointer-events-none disabled:opacity-40"
			>
				Período atual
			</button>
			<button
				type="button"
				aria-label="Período anterior"
				disabled={periodType === "CUSTOM"}
				onClick={() =>
					periodType !== "CUSTOM" &&
					goTo(periodType, shiftReferenceDate(periodType, referenceDate, -1))
				}
				className="flex h-9 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-(--border) transition-colors hover:bg-white/10 disabled:pointer-events-none disabled:opacity-40"
			>
				‹
			</button>
			<button
				type="button"
				aria-label="Próximo período"
				disabled={periodType === "CUSTOM"}
				onClick={() =>
					periodType !== "CUSTOM" &&
					goTo(periodType, shiftReferenceDate(periodType, referenceDate, 1))
				}
				className="flex h-9 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-(--border) transition-colors hover:bg-white/10 disabled:pointer-events-none disabled:opacity-40"
			>
				›
			</button>
			{customModalOpen ? (
				<Modal
					label="Selecionar período"
					onClose={() => setCustomModalOpen(false)}
				>
					<form action={submitCustom} className="flex flex-col gap-4">
						<div className="flex flex-col gap-2">
							<label htmlFor="custom-start" className="text-sm opacity-70">
								Início
							</label>
							<input
								id="custom-start"
								type="date"
								name="start"
								defaultValue={toDateParam(customStart ?? new Date())}
								className="rounded-lg border border-(--border) px-3 py-2"
								required
							/>
						</div>
						<div className="flex flex-col gap-2">
							<label htmlFor="custom-end" className="text-sm opacity-70">
								Fim
							</label>
							<input
								id="custom-end"
								type="date"
								name="end"
								defaultValue={toDateParam(
									customEnd
										? new Date(customEnd.getTime() - MS_PER_DAY)
										: new Date(),
								)}
								className="rounded-lg border border-(--border) px-3 py-2"
								required
							/>
						</div>
						<button
							type="submit"
							className="cursor-pointer rounded-lg bg-(--accent) px-4 py-2 text-(--accent-fg)"
						>
							Aplicar
						</button>
					</form>
				</Modal>
			) : null}
		</div>
	);
}
