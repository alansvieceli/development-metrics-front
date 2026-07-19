import type { PeriodMetrics } from "@/application/metrics/use-cases/get-metrics-for-period";
import { formatPercent } from "./format-metric-value";
import { StatTile } from "./stat-tile";

type WeekResultSectionProps = {
	current: PeriodMetrics;
};

export function WeekResultSection({ current }: WeekResultSectionProps) {
	const counts = current.predictabilityCounts;
	const pending = counts
		? Math.max(0, counts.planned - counts.delivered)
		: null;
	const unplannedPercent =
		current.unplannedCount === null || current.throughput === 0
			? null
			: (current.unplannedCount / current.throughput) * 100;
	const withoutRework =
		current.reworkCount === null
			? null
			: Math.max(0, current.throughput - current.reworkCount);

	return (
		<section className="flex flex-col gap-4 rounded-2xl border border-(--border) bg-(--surface) p-4 shadow-[inset_0_3px_0_var(--accent)] sm:p-5">
			<div>
				<p className="mb-1 font-mono text-xs font-semibold tracking-[0.16em] text-(--accent) uppercase">
					Desempenho
				</p>
				<h2 className="text-lg font-semibold">Resultado da semana</h2>
			</div>
			<div className="grid flex-1 grid-cols-2 gap-3">
				<StatTile
					metricKey="delivered"
					value={
						counts ? (
							<>
								{counts.delivered}
								<span className="text-(--foreground-muted)">
									/{counts.planned}
								</span>
							</>
						) : (
							"sem dados"
						)
					}
					detail={
						pending === null ? "Sem planejamento" : `${pending} pendentes`
					}
					featured
				/>
				<StatTile
					metricKey="predictability"
					value={
						current.predictability === null ? (
							"sem dados"
						) : (
							<>
								{Math.round(current.predictability)}
								<span className="text-(--accent)">%</span>
							</>
						)
					}
					detail={
						counts
							? `${counts.delivered} de ${counts.planned} no prazo`
							: "Sem planejamento"
					}
					featured
				/>
				<StatTile
					metricKey="unplannedCount"
					value={
						current.unplannedCount === null
							? "sem dados"
							: String(current.unplannedCount)
					}
					detail={
						unplannedPercent === null
							? "Sem entregas no período"
							: `${formatPercent(unplannedPercent)} das entregas`
					}
				/>
				<StatTile
					metricKey="reworkCount"
					value={
						current.reworkCount === null ? (
							"sem dados"
						) : (
							<>
								{current.reworkCount} <span className="text-lg">cards</span>
							</>
						)
					}
					secondary={
						current.reworkRate === null
							? undefined
							: `(${formatPercent(current.reworkRate)})`
					}
					detail={
						withoutRework === null
							? "Sem entregas no período"
							: `${withoutRework} sem retrabalho`
					}
				/>
			</div>
		</section>
	);
}
