import type { DurationStats } from "@/application/metrics/formulas/duration-metrics";
import type { PeriodMetrics } from "@/application/metrics/use-cases/get-metrics-for-period";
import type { MetricsSeriesEntry } from "@/application/metrics/use-cases/get-metrics-series";
import { formatDuration, formatPercent } from "./format-metric-value";
import type { MetricDefinition } from "./metric-definitions";
import { MetricTrendChart } from "./metric-trend-chart";
import { toTrendPoints } from "./to-trend-points";

type MetricCardProps = {
	definition: MetricDefinition;
	current: PeriodMetrics;
	weeklySeries: MetricsSeriesEntry[];
	monthlySeries: MetricsSeriesEntry[];
};

export function MetricCard({
	definition,
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
					formatValue={shapeToFormatter(definition.shape)}
				/>
			)}
		</div>
	);
}

function shapeToVariant(
	shape: MetricDefinition["shape"],
): "dual-line" | "single-line" | "bar" {
	if (shape === "duration-dual") {
		return "dual-line";
	}
	if (shape === "percent-single") {
		return "single-line";
	}
	return "bar";
}

function shapeToFormatter(
	shape: MetricDefinition["shape"],
): (value: number) => string {
	if (shape === "duration-dual") {
		return formatDuration;
	}
	if (shape === "percent-single") {
		return formatPercent;
	}
	return (value: number) => String(value);
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
			<p className="flex gap-4 text-lg font-semibold">
				<span>Média: {formatDuration(stats.averageMs)}</span>
				<span>Mediana: {formatDuration(stats.medianMs)}</span>
			</p>
		);
	}
	if (definition.shape === "percent-single") {
		const percent = value as number | null;
		if (percent === null) {
			return <p className="text-sm opacity-60">sem dados</p>;
		}
		return <p className="text-lg font-semibold">{formatPercent(percent)}</p>;
	}
	return <p className="text-lg font-semibold">{value as number}</p>;
}
