import type { DurationStats } from "@/application/metrics/formulas/duration-metrics";
import type { PeriodType } from "@/application/metrics/period";
import type { MetricsSeriesEntry } from "@/application/metrics/use-cases/get-metrics-dashboard";
import type { PeriodMetrics } from "@/application/metrics/use-cases/get-metrics-for-period";
import { formatDuration, formatPercent } from "./format-metric-value";
import type { MetricDefinition } from "./metric-definitions";
import { MetricTrendChart } from "./metric-trend-chart";
import { toTrendPoints } from "./to-trend-points";

type MetricCardProps = {
	definition: MetricDefinition;
	periodType: PeriodType;
	current: PeriodMetrics;
	weeklySeries: MetricsSeriesEntry[];
	monthlySeries: MetricsSeriesEntry[];
};

export function MetricCard({
	definition,
	periodType,
	current,
	weeklySeries,
	monthlySeries,
}: MetricCardProps) {
	return (
		<div
			data-testid={`metric-card-${definition.key}`}
			className="flex flex-col gap-3 rounded-xl border border-(--border) bg-(--surface) p-4"
		>
			<h2 className="text-sm font-semibold opacity-70">{definition.label}</h2>
			<CurrentValue definition={definition} value={current[definition.key]} />
			{definition.shape === "number-only" ? null : (
				<MetricTrendChart
					variant={shapeToVariant(definition.shape)}
					granularity={periodType}
					weeklyPoints={toTrendPoints(
						weeklySeries,
						definition.key,
						definition.shape,
					)}
					monthlyPoints={toTrendPoints(
						monthlySeries,
						definition.key,
						definition.shape,
					)}
					format={shapeToFormat(definition.shape)}
					{...shapeToLabels(definition.shape)}
				/>
			)}
		</div>
	);
}

function shapeToVariant(
	shape: MetricDefinition["shape"],
): "dual-line" | "single-line" | "bar" {
	if (shape === "duration-dual" || shape === "predictability-dual") {
		return "dual-line";
	}
	if (shape === "percent-single") {
		return "single-line";
	}
	return "bar";
}

function shapeToFormat(
	shape: MetricDefinition["shape"],
): "duration" | "percent" | "count" {
	if (shape === "duration-dual") {
		return "duration";
	}
	if (shape === "percent-single") {
		return "percent";
	}
	return "count";
}

function shapeToLabels(shape: MetricDefinition["shape"]) {
	if (shape === "predictability-dual") {
		return { primaryLabel: "Planejado", secondaryLabel: "Entregue" };
	}
	return { primaryLabel: "Média", secondaryLabel: "Mediana" };
}

function CurrentValue({
	definition,
	value,
}: {
	definition: MetricDefinition;
	value: PeriodMetrics[keyof PeriodMetrics];
}) {
	if (definition.shape === "duration-dual") {
		const stats = value as DurationStats | null;
		if (!stats) {
			return <p className="text-sm opacity-60">sem dados</p>;
		}
		return (
			<p className="flex gap-4 font-mono text-lg font-semibold">
				<span>Média: {formatDuration(stats.averageMs)}</span>
				<span>Mediana: {formatDuration(stats.medianMs)}</span>
			</p>
		);
	}
	if (
		definition.shape === "percent-single" ||
		definition.shape === "predictability-dual"
	) {
		const percent = value as number | null;
		if (percent === null) {
			return <p className="text-sm opacity-60">sem dados</p>;
		}
		return (
			<p className="font-mono text-lg font-semibold">
				{formatPercent(percent)}
			</p>
		);
	}
	if (definition.shape === "count-bar") {
		return (
			<p className="font-mono text-lg font-semibold">{value as number} itens</p>
		);
	}
	return <p className="font-mono text-lg font-semibold">{value as number}</p>;
}
