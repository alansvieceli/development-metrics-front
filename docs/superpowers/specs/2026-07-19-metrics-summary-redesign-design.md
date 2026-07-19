# Design: Redesenho da página de métricas (resumo em 3 blocos)

Data: 2026-07-19
Substitui o layout da spec [2026-07-17-metrics-dashboard-design.md](./2026-07-17-metrics-dashboard-design.md): sai a grade de 8-10 cards com gráfico de evolução, entra um resumo em 3 blocos de números. Depende da spec [2026-07-19-task-due-date-required-design.md](./2026-07-19-task-due-date-required-design.md) (due date sempre presente).

## Contexto e objetivo

O layout atual (grade de cards + gráfico Recharts por métrica) não atende mais à necessidade: o pedido é um resumo direto, agrupado por tipo de leitura, como o mockup abaixo (dados de exemplo):

```text
Métricas | Semana 29 — 13/07 a 19/07

Situação atual
WIP 6 · Bloqueados 2 · Em review 3 · Em testes 1 · Publicação 4

Resultado da semana
Entregues 12/15 · Previsibilidade 80% · Não planejados 3 · Retrabalho 2 cards

Tempo do fluxo
Lead time 9 dias · Cycle time 6 dias · Code review 8 horas · Testes 1,2 dia
Bloqueado 1,5 dia · Aguardando publicação 2 dias
```

Os gráficos de evolução por métrica saem de cena por ora (fora de escopo desta entrega) — ficam para uma revisão futura, quando o formato de "resumo" já estiver validado em uso.

## Layout

Header mantém: título "Métricas" + "|" + label do período (`formatPeriodLabel`, inalterado) + botão (i) de definições + `PeriodFilter` (semana/mês + ‹ ›). Sai o badge solto de WIP no header — o número mora agora no bloco "Situação atual".

Três seções, cada uma um grupo de tiles (label + valor, sem gráfico):

1. **Situação atual** — não depende do filtro de período, é sempre o estado agora (mesmo princípio que o WIP já seguia na spec anterior: "sempre agora, não varia com o filtro"). Tiles: **WIP**, **Bloqueados**, **Em review**, **Em testes**, **Publicação**. São contagens independentes que podem se sobrepor (um card bloqueado também conta em WIP; WIP exclui só `TODO` e `DONE`).
2. **Resultado da semana** — respeita o filtro de período da URL. Tiles: **Entregues** (`delivered/planned`), **Previsibilidade** (%), **Não planejados** (contagem), **Retrabalho** (contagem + %, ex. "2 cards (17%)").
3. **Tempo do fluxo** — respeita o filtro de período. Tiles: **Lead time**, **Cycle time**, **Code review**, **Testes**, **Bloqueado**, **Aguardando publicação** — todos mostrando a **média** (mediana fica de fora por ora, mesmo motivo dos gráficos).

Cada título de tile tem o atributo HTML `title` nativo com a descrição da métrica (mesmo texto usado no modal do botão (i)) — tooltip ao passar o mouse, sem componente novo.

## Definição de cada métrica nova ou alterada

- **WIP / Bloqueados / Em review / Em testes / Publicação**: contagens "agora" por `teamId`. WIP = status ∉ {`TODO`, `DONE`}. Bloqueados = `blocked = true` (qualquer status em WIP). Em review/testes/publicação = status igual a `CODE_REVIEW`/`TESTING`/`AWAITING_PUBLICATION`, independente de bloqueado ou não.
- **Entregues / Previsibilidade**: inalterados — já vêm de `calculatePredictabilityCounts`/`calculatePredictability` (tasks com due date dentro do período, `delivered` = concluída até a due date).
- **Não planejados**: tasks concluídas dentro do período (mesmo conjunto do throughput) cuja `dueDate` **não** cai dentro do período — ou seja, due date era de outra semana/mês, mas o card foi entregue nesta. Só é bem definido porque due date agora é sempre presente.
- **Retrabalho**: mesma regra de hoje (transição `X → IN_DEVELOPMENT` com `X` ≠ `TODO`/`IN_DEVELOPMENT`), mas passa a expor a contagem absoluta além da taxa.

## Motor de métricas (`application/metrics`, `infrastructure/metrics`)

- `MetricsQueryPort.loadSnapshot`: o campo `wip: number` vira `wip: WipBreakdown`, com `{ total, blocked, inReview, inTesting, inPublication }`. A implementação Drizzle troca a query de contagem única por uma query com `count(*) filter (where ...)` por status/blocked (1 round-trip, sem N+1).
- `CompletedTaskMetrics` ganha `dueDate: string` — o `SELECT` de `completionEvents` já faz `join` com `tasks`; só adiciona a coluna.
- `rate-metrics.ts`: `calculateReworkRate` é acompanhada por `calculateReworkCount` (mesmo filtro, reaproveitado — extrai o filtro para uma função compartilhada e cada uma deriva seu resultado dele).
- Nova função `calculateUnplannedCount(completedTasks, periodStart, periodEnd)` em `rate-metrics.ts`: conta tasks cuja `dueDate` cai fora de `[periodStart, periodEnd)`.
- `get-metrics-for-period.ts`: `PeriodMetrics` ganha `reworkCount: number | null` e `unplannedCount: number`.
- `get-metrics-dashboard.ts`: perde `weeklySeries`/`monthlySeries` e `WEEKLY_SERIES_LENGTH`/`MONTHLY_SERIES_LENGTH` — sem consumidor depois que os gráficos saem. `MetricsDashboardResult` vira só `{ current: PeriodMetrics }` (função pode inclusive deixar de existir e a página chamar `getMetricsForRange` direto, mas mantém o nome se ainda fizer sentido como ponto único de composição do `wip`).

## Presentation (`presentation/metrics-dashboard`)

Removidos (sem uso depois que os gráficos saem): `metric-card.tsx`, `metric-trend-chart.tsx`, `to-trend-points.ts` (+ teste).

Novos:

- `stat-tile.tsx`: tile genérico — label (com `title` da descrição), valor formatado, texto secundário opcional (ex. retrabalho: "2 cards" + "(17%)"; entregues: "12/15").
- `current-status-section.tsx`, `week-result-section.tsx`, `flow-time-section.tsx`: cada um monta seus tiles a partir de `current: PeriodMetrics` (e do novo `wip: WipBreakdown` para a primeira seção).

Alterados:

- `metric-definitions.ts`: perde o campo `shape` (não existe mais variação de gráfico); ganha entradas para as chaves novas (`blocked`, `inReview`, `inTesting`, `inPublication`, `delivered`/`planned`, `unplannedCount`, `reworkCount`) e mantém `label`/`description` para tooltip e modal do botão (i).
- `metrics-dashboard.tsx`: monta header + as 3 seções, sem grid genérico por `shape`.
- `format-metric-value.ts`: `formatDurationCompact` provavelmente fica sem uso (era usado pelo eixo do gráfico) — remover se o Knip confirmar.

## Edge cases

- Nenhuma task concluída no período: "Entregues", "Não planejados", "Retrabalho" mostram "sem dados" (mesmo padrão já usado hoje), sem quebrar layout.
- Período futuro: mesmo comportamento atual — "sem dados".
- Time sem nenhuma task em andamento: "Situação atual" mostra todos os tiles zerados (não é "sem dados", é 0 mesmo).
- Retrabalho/Não planejados quando `throughput = 0`: `reworkCount`/`unplannedCount` ficam `null` (segue o padrão de `reworkRate` hoje) em vez de `0`, pra distinguir "não houve dado" de "não houve retrabalho".

## Testes

- Atualizar `tests/integration/metrics-dashboard.spec.ts` para os 3 blocos.
- Unitários novos: `calculateUnplannedCount` (due date dentro/fora do período), `calculateReworkCount`, query de `wip` estruturado no `drizzle-metrics-query-port.test.ts`.
- Remover `to-trend-points.test.ts` (arquivo deletado).
