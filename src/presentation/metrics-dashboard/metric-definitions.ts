export type MetricKey =
	| "wip"
	| "blocked"
	| "inReview"
	| "inTesting"
	| "inPublication"
	| "delivered"
	| "predictability"
	| "unplannedCount"
	| "reworkCount"
	| "leadTime"
	| "cycleTime"
	| "codeReviewTime"
	| "testingTime"
	| "blockedTime"
	| "awaitingPublicationTime";

export type MetricDefinition = {
	key: MetricKey;
	label: string;
	description: string;
};

export const METRIC_DEFINITIONS: MetricDefinition[] = [
	{
		key: "wip",
		label: "WIP",
		description:
			"Quantidade de cards em andamento agora (fora de Backlog e Concluído).",
	},
	{
		key: "blocked",
		label: "Bloqueados",
		description: "Cards em andamento marcados como bloqueados agora.",
	},
	{
		key: "inReview",
		label: "Em review",
		description: "Cards atualmente na coluna Revisão.",
	},
	{
		key: "inTesting",
		label: "Em testes",
		description: "Cards atualmente na coluna Testes.",
	},
	{
		key: "inPublication",
		label: "Publicação",
		description: "Cards atualmente na coluna Aguardando Publicação.",
	},
	{
		key: "delivered",
		label: "Entregues",
		description:
			"Cards com prazo neste período que foram concluídos até o prazo, sobre o total de cards com prazo no período.",
	},
	{
		key: "predictability",
		label: "Previsibilidade",
		description:
			"Percentual de cards com prazo neste período entregues até o prazo.",
	},
	{
		key: "unplannedCount",
		label: "Não planejados",
		description:
			"Cards concluídos neste período cujo prazo era de outro período.",
	},
	{
		key: "reworkCount",
		label: "Retrabalho",
		description:
			"Cards concluídos neste período que voltaram para desenvolvimento em algum momento.",
	},
	{
		key: "leadTime",
		label: "Lead time",
		description: "Média do tempo da entrada do card até a entrega.",
	},
	{
		key: "cycleTime",
		label: "Cycle time",
		description: "Média do tempo do início do desenvolvimento até a entrega.",
	},
	{
		key: "codeReviewTime",
		label: "Code review",
		description: "Média do tempo que o card esperou revisão de código.",
	},
	{
		key: "testingTime",
		label: "Testes",
		description: "Média do tempo que o card passou em testes.",
	},
	{
		key: "blockedTime",
		label: "Bloqueado",
		description: "Média do tempo que o card passou bloqueado por impedimentos.",
	},
	{
		key: "awaitingPublicationTime",
		label: "Aguardando publicação",
		description: "Média do tempo que o card esperou para ser publicado.",
	},
];
