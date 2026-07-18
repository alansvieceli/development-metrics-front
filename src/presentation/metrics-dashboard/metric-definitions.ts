export type MetricKey =
	| "leadTime"
	| "cycleTime"
	| "blockedTime"
	| "codeReviewTime"
	| "reworkRate"
	| "throughput"
	| "wip"
	| "predictability";

export type MetricShape =
	| "duration-dual"
	| "percent-single"
	| "count-bar"
	| "number-only";

export type MetricDefinition = {
	key: MetricKey;
	label: string;
	shape: MetricShape;
};

export const METRIC_DEFINITIONS: MetricDefinition[] = [
	{ key: "leadTime", label: "Lead time", shape: "duration-dual" },
	{ key: "cycleTime", label: "Cycle time", shape: "duration-dual" },
	{ key: "blockedTime", label: "Tempo bloqueado", shape: "duration-dual" },
	{
		key: "codeReviewTime",
		label: "Tempo aguardando code review",
		shape: "duration-dual",
	},
	{ key: "reworkRate", label: "Taxa de retrabalho", shape: "percent-single" },
	{ key: "throughput", label: "Throughput", shape: "count-bar" },
	{ key: "wip", label: "WIP", shape: "number-only" },
	{
		key: "predictability",
		label: "Previsibilidade",
		shape: "percent-single",
	},
];
