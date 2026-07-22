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
	| "awaitingPublicationTime"
	| "throughputTrend"
	| "plannedDeliveredTrend"
	| "leadCycleTimeTrend"
	| "flowComposition"
	| "cycleTimeOutliers"
	| "bugsOpenedTrend"
	| "bugsAssociated"
	| "bugsRanking";

export type MetricDefinition = {
	key: MetricKey;
	label: string;
	description: string;
	howToRead?: string;
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
		description: "Cards atualmente na coluna Publicação.",
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
	{
		key: "throughputTrend",
		label: "Throughput por período",
		description:
			"Cards entregues em cada um dos últimos 8 períodos (semanas, quinzenas ou meses).",
		howToRead:
			"Cada barra é um período; a altura é a quantidade de cards entregues nele.",
	},
	{
		key: "plannedDeliveredTrend",
		label: "Planejado x entregue",
		description:
			"Cards com prazo (planejado) e cards entregues até o prazo (entregue) em cada um dos últimos 8 períodos.",
		howToRead:
			"Duas barras por período: uma para o total planejado (prazo no período) e outra para o total entregue até o prazo.",
	},
	{
		key: "leadCycleTimeTrend",
		label: "Lead time x Cycle time",
		description:
			"Mediana do lead time e do cycle time em cada um dos últimos 8 períodos.",
		howToRead:
			"Duas linhas, uma por métrica. Um período sem card concluído fica sem ponto e quebra a linha, em vez de interpolar por cima da ausência de dado.",
	},
	{
		key: "flowComposition",
		label: "Composição do fluxo",
		description:
			"Média do tempo do card em cada etapa (desenvolvimento, code review, testes, bloqueado, aguardando publicação) em cada um dos últimos 8 períodos. Desenvolvimento é o tempo restante do cycle time depois de somar as outras etapas.",
		howToRead:
			"Uma barra empilhada por período; cada cor é uma etapa do fluxo e o eixo mostra a duração acumulada.",
	},
	{
		key: "cycleTimeOutliers",
		label: "Cards mais lentos",
		description:
			"As até 5 tasks concluídas no período atual com maior cycle time, do início do desenvolvimento até a entrega.",
		howToRead:
			"Lista ordenada da mais lenta para a mais rápida, só do período atual selecionado (não é uma série histórica).",
	},
	{
		key: "bugsOpenedTrend",
		label: "Bugs abertos por período",
		description:
			"Bugs abertos (tasks do tipo Bug) em cada um dos últimos 8 períodos (semanas, quinzenas ou meses).",
		howToRead:
			"Cada barra é um período; a altura é a quantidade de bugs abertos nele, concluídos ou não.",
	},
	{
		key: "bugsAssociated",
		label: "Bugs associados",
		description:
			"Bugs abertos no período vinculados às entregas do desenvolvedor.",
	},
	{
		key: "bugsRanking",
		label: "Ranking de bugs",
		description:
			"As até 5 tasks que mais geraram bugs no período atual, via o vínculo de task de origem.",
		howToRead:
			"Lista das tasks de origem com mais bugs vinculados, da maior para a menor contagem. Só aparece quando o bug foi criado com o vínculo de task de origem preenchido.",
	},
];
