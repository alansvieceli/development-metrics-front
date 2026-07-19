# Design: Métricas de bugs no dashboard

Data: 2026-07-19

## Contexto e objetivo

Revisão da spec [2026-07-19-task-parent-link-design.md](./2026-07-19-task-parent-link-design.md), que deliberadamente deixou de fora as métricas de bugs: "Métricas de bugs (abertos por semana/mês/trimestre, ranking de tasks com mais bugs) ficam para uma spec futura, construída sobre esta fundação." Esta é essa spec.

Objetivo: mostrar no dashboard de métricas (1) quantos bugs foram abertos por período (semana/quinzena/mês — os mesmos períodos que o dashboard já usa, sem adicionar "trimestre") e (2) quais tasks mais geraram bugs no período selecionado.

## Motor de métricas (`application/metrics`)

`MetricsSnapshot` (`ports/metrics-query-port.ts`) ganha um array novo:

```ts
export type BugEvent = {
  taskId: string;
  createdAt: Date;
  parentTaskId: string | null;
  parentExternalId: string | null;
};
```

`parentExternalId` já vem resolvido na query (self-join de `tasks` com ela mesma via `parentTaskId`), para o ranking não precisar de um segundo lookup.

`drizzle-metrics-query-port.ts`: uma 4ª query paralela dentro de `loadSnapshot`, seguindo o mesmo formato das 3 já existentes — `SELECT tasks.id, tasks.createdAt, tasks.parentTaskId, parent.externalId FROM tasks INNER JOIN task_types ON task_types.id = tasks.type_id LEFT JOIN tasks AS parent ON parent.id = tasks.parent_task_id WHERE tasks.team_id = :teamId AND task_types.is_bug = true AND tasks.created_at >= :periodStart AND tasks.created_at < :periodEnd` (usa `alias()` do `drizzle-orm/pg-core` para o self-join — técnica nova neste arquivo, mas padrão do Drizzle). Mesma janela larga (8 períodos) que as outras queries do snapshot, sem round-trip adicional por período.

`formulas/bug-metrics.ts` (arquivo novo):

```ts
export type BugRankingEntry = { taskId: string; externalId: string; bugCount: number };

const BUG_RANKING_LIMIT = 5;

export function calculateBugsOpened(
  bugEvents: BugEvent[],
  periodStart: Date,
  periodEnd: Date,
): number;

export function calculateBugsRanking(
  bugEvents: BugEvent[],
  periodStart: Date,
  periodEnd: Date,
): BugRankingEntry[];
```

- `calculateBugsOpened`: conta bugs cujo `createdAt` cai no período, com ou sem vínculo de origem — mede volume, não depende do vínculo pai/filho.
- `calculateBugsRanking`: filtra bugs do período **com** `parentTaskId` (bugs órfãos não entram — não há a quem atribuir), agrupa por `parentTaskId`, soma, ordena decrescente por contagem, corta nos 5 primeiros (`BUG_RANKING_LIMIT`, mesma ideia do `HISTORY_LENGTH = 8` já usado em `get-metrics-dashboard.ts`). Empate: ordem estável de inserção, sem critério de desempate adicional — corte deliberado, não é uma decisão que precise ser determinística além disso.

`PeriodMetrics` (`use-cases/get-metrics-for-period.ts`) ganha `bugsOpened: number` e `bugsRanking: BugRankingEntry[]`. `getMetricsForRange` passa a chamar as duas fórmulas novas com `snapshot.bugEvents`, igual às fórmulas existentes. Como os dois campos entram em `PeriodMetrics` (não em `HistoricalPeriodMetrics` com omissão), ficam calculados para todo período do histórico — mesmo padrão de `leadTime`/`cycleTime`, que também são calculados para todos os 8 períodos mesmo quando só o gráfico de composição do fluxo usa `current`. `bugsOpened` alimenta o gráfico de tendência (8 períodos); `bugsRanking` só é consumido do período atual (`current.bugsRanking`), por decisão já validada com o usuário — o ranking não é uma série histórica.

## Presentation (`presentation/metrics-dashboard/`)

`metric-definitions.ts`: `MetricKey` ganha `bugsOpenedTrend` e `bugsRanking`. `METRIC_DEFINITIONS` ganha as 2 entradas (label + description, mesmo texto usado no tooltip do título e no modal do botão (i)). `metric-info-button.tsx`: o grupo `"Gráficos"` ganha as 2 chaves novas.

`charts/to-bugs-opened-series.ts`: função pura, mesmo formato de `to-throughput-series.ts` — mapeia `HistoricalPeriodMetrics[]` para `{ label, bugsOpened }[]`, usando `formatPeriodShortLabel`.

`charts/bugs-opened-chart.tsx` (`"use client"`): `BarChart` de série única, réplica de `throughput-chart.tsx` (mesma paleta, mesmo `ChartCard`).

`charts/bugs-ranking-list.tsx`: reaproveita o `ChartCard` existente como moldura (ele já aceita qualquer `children`, não é específico de gráfico) com `metricKey="bugsRanking"`. Dentro, uma lista ordenada (`<ol>`) com `#{externalId} — {bugCount} bugs`, no estilo visual dos chips de `board-summary.tsx` (borda, sem preenchimento sólido). Sem `bugsRanking`, mostra "sem dados" — mesmo texto usado pelos outros gráficos vazios.

`charts/charts-section.tsx`: os dois componentes novos entram no grid `xl:grid-cols-2`, ao lado dos 4 existentes.

Sem mudança em `metrics-dashboard.tsx` além de já receber `current`/`history` com os campos novos — a página não precisa saber do que se trata.

## Edge cases

- **Período sem bugs abertos**: `bugsOpened` é `0` (valor real, mesma barra zerada que throughput já mostra); `bugsRanking` vazio → "sem dados".
- **Bug sem task de origem**: conta em `bugsOpened`, não aparece em `bugsRanking`.
- **Task-pai excluída depois que o bug foi criado**: `parentTaskId` do bug vira `null` (via `onDelete: set null`, já implementado na spec anterior) — a partir daí esse bug some do ranking e passa a contar como órfão em `bugsOpened`. Comportamento honesto, não exige tratamento especial.
- **Time novo, sem histórico**: mesmo comportamento já existente nos outros gráficos de tendência — períodos anteriores à criação do time aparecem com `bugsOpened: 0`.

## Testes

- `formulas/bug-metrics.test.ts` (novo): `calculateBugsOpened` (com e sem vínculo, fora do período); `calculateBugsRanking` (agrupamento, ordenação, corte no top 5, exclusão de bugs sem `parentTaskId`, período sem bugs).
- `use-cases/get-metrics-for-period.test.ts`: casos novos cobrindo `bugsOpened`/`bugsRanking` no retorno de `getMetricsForRange`.
- `infrastructure/metrics/drizzle-metrics-query-port.test.ts`: caso novo criando tasks tipo Bug (com e sem `parentTaskId`) e conferindo `bugEvents` retornado por `loadSnapshot`, incluindo o `parentExternalId` resolvido pelo self-join.
- `charts/to-bugs-opened-series.test.ts` (novo): mapeamento de `HistoricalPeriodMetrics[]` para pontos do gráfico.
- `tests/integration/metrics-dashboard.spec.ts`: cenário novo — criar uma task, vincular 2 bugs a ela via o campo "Task de origem" do formulário, ir para `/metrics` e conferir que o gráfico de bugs abertos e o ranking mostram os valores esperados.
