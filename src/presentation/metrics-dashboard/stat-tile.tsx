import { METRIC_DEFINITIONS, type MetricKey } from "./metric-definitions";

type StatTileProps = {
	metricKey: MetricKey;
	value: string;
	secondary?: string;
};

export function StatTile({ metricKey, value, secondary }: StatTileProps) {
	const definition = METRIC_DEFINITIONS.find((item) => item.key === metricKey);

	return (
		<div
			data-testid={`metric-tile-${metricKey}`}
			className="flex flex-col gap-1 rounded-xl border border-(--border) bg-(--surface) p-4"
		>
			<h3
				title={definition?.description}
				className="text-sm font-semibold opacity-70"
			>
				{definition?.label ?? metricKey}
			</h3>
			<p className="font-mono text-lg font-semibold">
				{value}
				{secondary ? (
					<span className="ml-2 text-sm font-normal opacity-70">
						{secondary}
					</span>
				) : null}
			</p>
		</div>
	);
}
