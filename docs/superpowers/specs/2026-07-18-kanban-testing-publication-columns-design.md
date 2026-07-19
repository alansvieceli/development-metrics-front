# Design: Colunas Testes e Aguardando Publicação

Data: 2026-07-18
Estende as specs [2026-07-17-kanban-tasks-design.md](./2026-07-17-kanban-tasks-design.md) e [2026-07-17-metrics-engine-design.md](./2026-07-17-metrics-engine-design.md), alterando pontos específicos delas conforme descrito abaixo.

## Contexto e objetivo

Adicionar duas etapas ao fluxo do quadro Kanban, entre Code Review e Concluído: **Testes** (`TESTING`) e **Aguardando Publicação** (`AWAITING_PUBLICATION`). Fluxo de referência passa a ser TODO → IN_DEVELOPMENT → CODE_REVIEW → TESTING → AWAITING_PUBLICATION → DONE, mantendo a regra existente de movimentação livre entre colunas (sem restrição de transição).

## Modelo de dados

Altera `Task.status` na spec de Kanban/Tasks: `TASK_STATUSES` passa a ser `TODO | IN_DEVELOPMENT | CODE_REVIEW | TESTING | AWAITING_PUBLICATION | DONE`, com `TESTING` e `AWAITING_PUBLICATION` nessa posição (entre `CODE_REVIEW` e `DONE`). Rótulos em pt-BR: "Testes" e "Aguardando Publicação".

Migração nova reescreve os três `CHECK` constraints existentes (`tasks_status_check`, `task_status_changes_from_status_check`, `task_status_changes_to_status_check`) para incluir os dois valores novos. Sem backfill: não há dados em produção ainda.

## Mudanças no motor de métricas

Altera três pontos da definição de métricas da spec do motor:

- **Retrabalho (métrica 5)**: generaliza a regra fixa "`CODE_REVIEW→IN_DEVELOPMENT` ou `DONE→IN_DEVELOPMENT`" para "**qualquer** transição `X → IN_DEVELOPMENT` onde `X` não é `TODO` nem `IN_DEVELOPMENT`". Cobre `CODE_REVIEW`, `TESTING`, `AWAITING_PUBLICATION` e `DONE` voltando para desenvolvimento.
- **WIP (métrica 7)**: generaliza "status `IN_DEVELOPMENT` ou `CODE_REVIEW`" para "**qualquer status diferente de `TODO` e `DONE`**". Sem essa mudança, tasks em Testes ou Aguardando Publicação sairiam do WIP silenciosamente — é uma correção de contagem, não só suporte às colunas novas.
- **Duas métricas novas**, mesma fórmula da métrica 4 (tempo aguardando code review — soma de todas as passagens pela coluna, entrada até a transição de saída seguinte, somando em caso de retrabalho): **Tempo em Testes** e **Tempo Aguardando Publicação**. O dashboard passa a ter 10 métricas em vez de 8.

## Quadro (Kanban)

6 colunas em vez de 4, mesmo layout de scroll horizontal com divisórias verticais. Como o card, o seletor "mover para" e o modal de criação (campo "coluna inicial") já são dirigidos pelos arrays `STATUS_ORDER`/`STATUS_LABELS`, as duas colunas novas aparecem nesses três lugares sem lógica de UI adicional. Nenhuma regra nova de quem pode mover um card para qual coluna — permanece livre, igual hoje.

## Arquitetura (arquivos alterados)

```text
domain/task/entities/task.ts                          # TASK_STATUSES
presentation/task/task-status-labels.ts                # STATUS_LABELS, STATUS_ORDER
application/task/use-cases/list-tasks-by-team.ts       # objeto `grouped` inicial
infrastructure/task/drizzle/schema.ts                  # CHECK constraints
drizzle/migrations/000X_task-status-testing-publication.sql

application/metrics/formulas/rate-metrics.ts           # calculateReworkRate generalizado
infrastructure/metrics/drizzle-metrics-query-port.ts   # query de WIP generalizada
application/metrics/formulas/duration-metrics.ts       # calculateCodeReviewTime → calculateTimeInStatus(tasks, status)
application/metrics/use-cases/get-metrics-for-period.ts # chama calculateTimeInStatus para CODE_REVIEW, TESTING e AWAITING_PUBLICATION
presentation/metrics-dashboard/metric-definitions.ts    # 2 entradas novas (mesmo shape "duration-dual")
```

Nenhum arquivo novo em `domain` ou `application/ports`: é extensão de um enum existente e generalização de fórmulas já existentes, sem entidade ou port novo.

## Edge cases

- Task criada diretamente em `TESTING` ou `AWAITING_PUBLICATION`: primeiro `TaskStatusChange` grava `fromStatus: null`, igual ao comportamento atual para qualquer coluna inicial.
- Card volta de `TESTING`/`AWAITING_PUBLICATION` para `CODE_REVIEW` (não para `IN_DEVELOPMENT`): não conta como retrabalho pela definição confirmada — só transições que pousam em `IN_DEVELOPMENT` contam.
- Task nunca passou por `TESTING` (ou por `AWAITING_PUBLICATION`): fica fora da média/mediana dessa métrica especificamente, igual ao comportamento já existente do cycle time para tasks que nunca passaram por `IN_DEVELOPMENT`.
- Task com múltiplas passagens por `TESTING` (retrabalho): soma a duração de todas as passagens, mesma regra da métrica 4.

## Testes

- Atualizar os testes que enumeram o conjunto de status explicitamente: `create-task.test.ts`, `move-task.test.ts`, `list-tasks-by-team.test.ts`, `duration-metrics.test.ts`, `rate-metrics.test.ts`, `drizzle-metrics-query-port.test.ts`, `kanban-board.spec.ts`, `metrics-dashboard.spec.ts`.
- Casos novos: `calculateTimeInStatus` genérica (aplicada a um status diferente de `CODE_REVIEW`), `calculateReworkRate` contando volta de `TESTING`/`AWAITING_PUBLICATION`/`DONE` para `IN_DEVELOPMENT` e não contando volta para `CODE_REVIEW`, WIP contando tasks em `TESTING`/`AWAITING_PUBLICATION`.
- Migração: teste (ou verificação manual) de que o `CHECK` constraint aceita os dois novos valores e continua rejeitando valores inválidos.
