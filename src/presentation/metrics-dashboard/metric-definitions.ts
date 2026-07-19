export type MetricKey =
	| "leadTime"
	| "cycleTime"
	| "blockedTime"
	| "codeReviewTime"
	| "testingTime"
	| "awaitingPublicationTime"
	| "reworkRate"
	| "throughput"
	| "wip"
	| "predictability";

export type MetricShape =
	| "duration-dual"
	| "percent-single"
	| "predictability-dual"
	| "count-bar"
	| "number-only";

export type MetricDefinition = {
	key: MetricKey;
	label: string;
	shape: MetricShape;
	description: string;
};

// Ordenado por prioridade de leitura: primeiro o que sinaliza sobrecarga e
// entrega (WIP, throughput, cycle/lead time), depois o detalhamento por
// etapa do fluxo, por fim os indicadores de qualidade/previsibilidade.
export const METRIC_DEFINITIONS: MetricDefinition[] = [
	{
		key: "wip",
		label: "WIP",
		shape: "number-only",
		description: "Quantidade de trabalhos simultâneos em andamento.",
	},
	{
		key: "throughput",
		label: "Throughput",
		shape: "count-bar",
		description: "Quantidade de itens concluídos por semana.",
	},
	{
		key: "cycleTime",
		label: "Cycle time",
		shape: "duration-dual",
		description: "Do início do desenvolvimento até a entrega.",
	},
	{
		key: "leadTime",
		label: "Lead time",
		shape: "duration-dual",
		description: "Da entrada do card até a entrega.",
	},
	{
		key: "blockedTime",
		label: "Tempo bloqueado",
		shape: "duration-dual",
		description: "Tempo que o card passou bloqueado por impedimentos.",
	},
	{
		key: "codeReviewTime",
		label: "Tempo aguardando code review",
		shape: "duration-dual",
		description: "Tempo que o card esperou revisão de código.",
	},
	{
		key: "testingTime",
		label: "Tempo em testes",
		shape: "duration-dual",
		description: "Tempo que o card passou em testes.",
	},
	{
		key: "awaitingPublicationTime",
		label: "Tempo aguardando publicação",
		shape: "duration-dual",
		description: "Tempo que o card esperou para ser publicado.",
	},
	{
		key: "reworkRate",
		label: "Taxa de retrabalho",
		shape: "percent-single",
		description: "Cards que voltaram para desenvolvimento.",
	},
	{
		key: "predictability",
		label: "Previsibilidade",
		shape: "predictability-dual",
		description: "Planejado versus entregue.",
	},
];
