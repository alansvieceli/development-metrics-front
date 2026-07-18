# Design: Motor de métricas

Data: 2026-07-17
Sub-projeto 3 de 4 do produto Development Metrics (Times → Kanban/Tasks → **Motor de métricas** → Dashboard).

Depende das specs [2026-07-17-team-management-design.md](./2026-07-17-team-management-design.md) e [2026-07-17-kanban-tasks-design.md](./2026-07-17-kanban-tasks-design.md): lê o histórico de status e bloqueio gerado pelo Kanban.

## Contexto e objetivo

Calcular, sob demanda, as 8 métricas de fluxo de um time a partir do histórico de tasks (`TaskStatusChange`, `TaskBlockedPeriod`, `Task.dueDate`), para um período (semana ou mês). Não cobre a UI de dashboard nem os gráficos comparativos — isso é o sub-projeto 4, que consome os casos de uso definidos aqui.

## Períodos

- **Semana**: segunda-feira a domingo (semana ISO).
- **Mês**: mês de calendário.
- Todo cálculo recebe um `periodType` (`WEEK` | `MONTH`) e uma data de referência; o período efetivo é a semana/mês que contém essa data.

## Estratégia de cálculo

Calculado sob demanda (sem job/cron nem tabela de agregados pré-calculados), com **índices** nas tabelas de histórico para manter as consultas rápidas:

- `task_status_changes(task_id, changed_at)`, `task_status_changes(to_status, changed_at)`
- `task_blocked_periods(task_id, blocked_at)`
- `tasks(team_id, status)`, `tasks(team_id, due_date)`

## Definição de cada métrica

Todas as métricas são calculadas por time (`teamId`) + período, salvo WIP (sempre atual).

1. **Lead time** — por task concluída no período: `concluído_em − criado_em` (tempo corrido total). Métrica do período = **média e mediana**, ambas exibidas e identificadas.
2. **Cycle time** — por task concluída no período: `concluído_em − primeira_entrada_em_IN_DEVELOPMENT`. Métrica do período = **média e mediana**.
3. **Tempo bloqueado** — por task concluída no período: soma de `unblocked_at − blocked_at` de todos os `TaskBlockedPeriod` da task (períodos ainda abertos no momento do cálculo contam até "agora"). Métrica do período = **média e mediana**. É informativo: não é descontado do lead/cycle time.
4. **Tempo aguardando code review** — por task concluída no período: soma da duração de **todas** as passagens da task por `CODE_REVIEW` (entrada até a transição de saída seguinte), somando quando há retrabalho e mais de uma passagem. Métrica do período = **média e mediana**.
5. **Taxa de retrabalho** — `(tasks concluídas no período que tiveram ao menos 1 transição CODE_REVIEW→IN_DEVELOPMENT ou DONE→IN_DEVELOPMENT em algum momento da vida) ÷ (total de tasks concluídas no período)`, em percentual.
6. **Throughput** — contagem de tasks que tiveram uma transição `→ DONE` dentro do período.
7. **WIP** — contagem de tasks do time atualmente (no momento da consulta, não do período filtrado) com status `IN_DEVELOPMENT` ou `CODE_REVIEW`. Não varia com o filtro de semana/mês.
8. **Previsibilidade** — `(tasks com dueDate dentro do período E concluídas até o dueDate) ÷ (total de tasks com dueDate dentro do período)`, em percentual. Tasks sem `dueDate` não entram no cálculo.

## Arquitetura

Contexto de leitura, sem entidades de domínio com invariantes — apenas funções de agregação. Sem domínio rico; cabe como funções de `application` + port, conforme a seção "Quando simplificar" do architecture.md.

```text
application/metrics/use-cases/
  get-metrics-for-period.ts   # (teamId, periodType, referenceDate) → as 8 métricas
  get-metrics-series.ts       # (teamId, periodType, howManyPeriods) → métricas dos últimos N períodos, pros gráficos comparativos

application/metrics/ports/
  metrics-query-port.ts       # queries agregadas somente leitura sobre o histórico de tasks

infrastructure/metrics/
  drizzle-metrics-query-port.ts   # implementa as agregações (médias, medianas, contagens) em SQL
  migrations: índices citados acima
```

`MetricsQueryPort` é um port próprio do contexto de métricas, com acesso direto (somente leitura) às tabelas de histórico de `task` — não chama os casos de uso de `application/task` nem importa suas entidades. A justificativa é performance: agregações (média, mediana, contagem) são muito mais eficientes feitas em SQL do que trazendo tasks para a memória uma a uma.

## Edge cases

- **Nenhuma task concluída no período**: lead time, cycle time, tempo bloqueado, tempo de code review e taxa de retrabalho retornam vazio/zero (sem divisão por zero).
- **Nenhuma task com `dueDate` no período**: previsibilidade retorna vazio/indefinida (não zero, para não sugerir "0% de acerto" sem nada planejado).
- **Task concluída sem nunca ter passado por `IN_DEVELOPMENT`**: cycle time não é calculado para essa task (fica fora da média/mediana de cycle time, mas conta normalmente pro lead time e throughput).
- **Mediana com quantidade par de tasks**: média aritmética dos dois valores centrais (definição padrão de mediana).

## Testes

- Unitários em `application/metrics`: cada uma das 8 fórmulas isoladamente, com casos de borda (nenhuma task no período, task sem cycle time, task sem dueDate, retrabalho múltiplo, bloqueio ainda aberto no momento do cálculo).
- Teste de contrato de `get-metrics-series` garantindo que retorna a métrica correta alinhada a cada período da série.
