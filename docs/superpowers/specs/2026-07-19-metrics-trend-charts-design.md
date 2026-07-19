# Design: Gráficos de tendência no dashboard de métricas

Data: 2026-07-19
Revisão da spec [2026-07-19-metrics-summary-redesign-design.md](./2026-07-19-metrics-summary-redesign-design.md), que retirou os gráficos de evolução do dashboard e deixou explícito: "ficam para uma revisão futura, quando o formato de resumo já estiver validado em uso". Esta é essa revisão.

## Contexto e objetivo

Os 3 blocos de números (Situação atual, Resultado da semana, Tempo do fluxo) respondem "quanto agora". Faltam poucos gráficos focados em tendência e comparação — não um gráfico por card, como era antes de 19/07 (spec de 17/07, removida em `28d3ece`/`91768da`).

Primeira versão: 4 gráficos.

1. **Throughput por período** — barras, série única: cards entregues por semana/mês.
2. **Planejado x entregue** — barras agrupadas, 2 séries: `planned`/`delivered` por período.
3. **Lead time x Cycle time** — linha, 2 séries: mediana por período.
4. **Composição do fluxo** — barra horizontal empilhada, 1 barra: desenvolvimento/review/testes/bloqueado/publicação do período atual selecionado.

WIP por etapa e retrabalho ao longo do tempo ficam fora desta entrega (mesma decomposição que o autor do pedido já sugeriu).

## Janela histórica

Os gráficos 1-3 seguem o filtro de período já existente no topo da página (semana/mês + ‹ ›): mostram os **últimos 8 períodos terminando no período selecionado**, sem controle próprio. Navegar ‹ › ou trocar semana/mês desloca a janela inteira — mesmo comportamento que os 3 blocos já têm hoje. Não há toggle independente por gráfico (existia na spec de 17/07; não repetido aqui).

O gráfico 4 não tem janela: é sempre o período atual selecionado (não uma série histórica).

## Motor de métricas (`application/metrics`)

`get-metrics-dashboard.ts`:

- Constante `HISTORY_LENGTH = 8`.
- `MetricsDashboardResult` ganha `history: HistoricalPeriodMetrics[]` (ordem cronológica, mais antigo → mais recente; cada item já traz `periodStart`/`periodEnd` de `getMetricsForRange`).
- Implementação: `getPreviousPeriods(periodType, referenceDate, HISTORY_LENGTH)` — função já existente em `period.ts`, hoje sem consumidor em produção (sobrou da era dos gráficos antigos) — gera os 8 intervalos. Uma única chamada a `port.loadSnapshot(teamId, periods[0].start, periods.at(-1).end)` busca tudo. `history = periods.map(range => getMetricsForRange(snapshot, range.start, range.end, now))`. `current = { ...history.at(-1), wip: snapshot.wip }` (a query de `wip` no port não filtra por data — é sempre "agora" — então o mesmo snapshot largo serve pros dois).
- Nenhuma mudança em `MetricsQueryPort`, `getMetricsForRange`, `drizzle-metrics-query-port.ts` ou nas fórmulas de `formulas/`. Continua **1 round-trip** ao banco por carregamento da página (hoje já é 1; só passa a cobrir uma janela maior de datas).

Gráfico 4 não introduz métrica nova: usa `current.cycleTime` / `codeReviewTime` / `testingTime` / `blockedTime` / `awaitingPublicationTime` (já existem, todos `DurationStats.averageMs`). "Desenvolvimento" = `cycleTime.averageMs − (codeReview + testing + blocked + awaitingPublication).averageMs`, com piso em 0 — cálculo de apresentação, não uma fórmula nova no motor. Como tempo bloqueado pode se sobrepor a outra etapa (um card pode ficar bloqueado durante code review, por exemplo), a barra é uma composição aproximada para leitura visual, não uma partição matematicamente exclusiva.

## Presentation (`presentation/metrics-dashboard/`)

Nova pasta `charts/`:

- `chart-card.tsx`: wrapper comum a todos — título com tooltip nativo (`title={definition.description}`, mesmo mecanismo dos tiles) + `children` do plot. Server-renderable; só os componentes Recharts internos precisam de `"use client"`.
- `throughput-chart.tsx` (`"use client"`) — `BarChart`, série única.
- `planned-delivered-chart.tsx` (`"use client"`) — `BarChart` agrupado, 2 séries (`predictabilityCounts.planned`/`delivered`). Sem 3ª barra de não planejados nesta versão — já existe como tile em "Resultado da semana".
- `lead-cycle-time-chart.tsx` (`"use client"`) — `LineChart`, 2 séries (mediana de `leadTime`/`cycleTime`). Período sem card concluído gera um vazio na linha (`connectNulls={false}`, padrão do Recharts), não um zero.
- `flow-composition-chart.tsx` (`"use client"`) — `BarChart` horizontal empilhado, 1 barra, 5 segmentos, a partir de `current`.
- Funções puras de shaping de dado (testáveis sem Recharts, um arquivo por gráfico): `to-throughput-series.ts`, `to-planned-delivered-series.ts`, `to-duration-trend-series.ts`, `to-flow-composition-series.ts`. Cada uma mapeia `HistoricalPeriodMetrics[]`/`PeriodMetrics` pro array que o gráfico consome, incluindo o rótulo curto do período no eixo X.

Alterados:

- `format-period-label.ts`: ganha `formatPeriodShortLabel(periodType, periodStart)`, reaproveitando o cálculo de número de semana ISO já existente no arquivo. O label longo atual (`formatPeriodLabel`) fica poluído demais como rótulo de eixo X com 8 barras.
- `metric-definitions.ts`: `MetricKey` ganha 4 chaves — `throughputTrend`, `plannedDeliveredTrend`, `leadCycleTimeTrend`, `flowComposition`. `METRIC_DEFINITIONS` ganha as 4 entradas (label = título do gráfico, description = o que mostra + como é calculado — mesmo texto do tooltip do título e do modal do botão (i)).
- `metric-info-button.tsx`: `GROUPS` ganha um grupo `"Gráficos"` com as 4 chaves novas.
- `metrics-dashboard.tsx`: nova seção abaixo de `FlowTimeSection`, grid 2 colunas — throughput + planejado×entregue na 1ª linha, lead/cycle time + composição do fluxo na 2ª — recebendo `history` e `current` do use case.

Dependência: `recharts` volta ao `package.json` — só saiu quando os gráficos saíram (`91768da`), não por problema técnico; já foi usada exatamente para este conjunto de tipos de gráfico (linha, barra, barra empilhada).

Cores: paleta de marca do app, ordem categórica fixa por gráfico, hexadecimais exatos validados com `validate_palette.js` (skill `dataviz`) durante a implementação — não nesta spec, mesmo padrão da spec de 17/07.

## Edge cases

- **Período sem card concluído dentro da janela**: throughput mostra `0` (valor real); lead/cycle time ficam com gap nesse ponto da linha; planejado×entregue mostra as barras que existirem.
- **Time mais novo que a janela de 8 períodos**: sem truncar a janela — períodos anteriores à criação do time aparecem com throughput `0` e linhas com gap. É um valor honesto, não exige tratamento especial (diferente da spec de 17/07, que truncava — lá a janela era maior, 8 semanas ou 6 meses fixos independente do filtro; aqui 8 períodos já é enxuto o bastante pra não justificar essa complexidade).
- **Navegar para período futuro**: mesmo comportamento de hoje propagado pra janela inteira — períodos futuros aparecem zerados/vazios.
- **Gráfico 4 sem nenhum card concluído no período atual**: todas as `DurationStats` são `null` → `chart-card` mostra "sem dados" no lugar da barra.

## Testes

- `get-metrics-dashboard.test.ts`: atualizar para asserir `history` (8 itens, valores por período) a partir de um snapshot cobrindo várias semanas; confirmar que só 1 `loadSnapshot` é chamado.
- Testes unitários novos por função de shaping: `to-throughput-series`, `to-planned-delivered-series`, `to-duration-trend-series` (inclui o caso do gap/null), `to-flow-composition-series` (inclui o piso em 0 e o caso "sem dados").
- `format-period-label.test.ts`: casos novos para `formatPeriodShortLabel` (semana e mês).
- `tests/integration/metrics-dashboard.spec.ts`: cenário com múltiplas semanas de dados, asserindo que os 4 gráficos renderizam (títulos/legendas visíveis) e que o tooltip nativo do título expõe a descrição.
