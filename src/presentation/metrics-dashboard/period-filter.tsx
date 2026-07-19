"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { PeriodType } from "@/application/metrics/period";
import { Modal } from "@/presentation/shared/modal";
import { buildMetricsUrl } from "./build-metrics-url";
import { shiftReferenceDate } from "./shift-reference-date";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

type PeriodFilterProps = {
	periodType: PeriodType | "SPRINT";
	referenceDate: Date;
	sprintStart?: Date;
	sprintEnd?: Date;
};

function toDateParam(date: Date): string {
	return date.toISOString().slice(0, 10);
}

export function PeriodFilter({
	periodType,
	referenceDate,
	sprintStart,
	sprintEnd,
}: PeriodFilterProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [sprintModalOpen, setSprintModalOpen] = useState(false);

	function goTo(nextPeriodType: PeriodType, nextReferenceDate: Date) {
		router.push(
			buildMetricsUrl(pathname, new URLSearchParams(searchParams.toString()), {
				period:
					nextPeriodType === "MONTH"
						? "month"
						: nextPeriodType === "FORTNIGHT"
							? "fortnight"
							: "week",
				date: toDateParam(nextReferenceDate),
			}),
		);
	}

	function submitSprint(formData: FormData) {
		const start = String(formData.get("start") ?? "");
		const end = String(formData.get("end") ?? "");
		if (!start || !end) return;
		setSprintModalOpen(false);
		router.push(
			buildMetricsUrl(pathname, new URLSearchParams(searchParams.toString()), {
				period: "sprint",
				start,
				end,
			}),
		);
	}

	return (
		<div className="flex flex-wrap items-center gap-2">
			<div className="flex h-9 rounded-lg border border-(--border)">
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
				onClick={() => setSprintModalOpen(true)}
				aria-pressed={periodType === "SPRINT"}
				className={`flex h-9 cursor-pointer items-center rounded-lg border border-(--border) px-3 text-sm transition-colors ${
					periodType === "SPRINT"
						? "bg-(--accent) text-(--accent-fg)"
						: "hover:bg-white/10"
				}`}
			>
				Sprint
			</button>
			{periodType === "SPRINT" ? null : (
				<>
					<button
						type="button"
						onClick={() => goTo(periodType, new Date())}
						className="flex h-9 cursor-pointer items-center rounded-lg border border-(--border) px-3 text-sm transition-colors hover:bg-white/10"
					>
						Período atual
					</button>
					<button
						type="button"
						aria-label="Período anterior"
						onClick={() =>
							goTo(
								periodType,
								shiftReferenceDate(periodType, referenceDate, -1),
							)
						}
						className="flex h-9 w-10 cursor-pointer items-center justify-center rounded-lg border border-(--border) transition-colors hover:bg-white/10"
					>
						‹
					</button>
					<button
						type="button"
						aria-label="Próximo período"
						onClick={() =>
							goTo(periodType, shiftReferenceDate(periodType, referenceDate, 1))
						}
						className="flex h-9 w-10 cursor-pointer items-center justify-center rounded-lg border border-(--border) transition-colors hover:bg-white/10"
					>
						›
					</button>
				</>
			)}
			{sprintModalOpen ? (
				<Modal
					label="Selecionar sprint"
					onClose={() => setSprintModalOpen(false)}
				>
					<form action={submitSprint} className="flex flex-col gap-4">
						<div className="flex flex-col gap-2">
							<label htmlFor="sprint-start" className="text-sm opacity-70">
								Início
							</label>
							<input
								id="sprint-start"
								type="date"
								name="start"
								defaultValue={
									sprintStart ? toDateParam(sprintStart) : undefined
								}
								className="rounded-lg border border-(--border) px-3 py-2"
								required
							/>
						</div>
						<div className="flex flex-col gap-2">
							<label htmlFor="sprint-end" className="text-sm opacity-70">
								Fim
							</label>
							<input
								id="sprint-end"
								type="date"
								name="end"
								defaultValue={
									sprintEnd
										? toDateParam(new Date(sprintEnd.getTime() - MS_PER_DAY))
										: undefined
								}
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
