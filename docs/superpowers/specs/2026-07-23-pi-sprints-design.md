# PIs e Sprints no quadro e nas métricas

## Contexto

Hoje o quadro (`/board`) trabalha só com o conceito de status da task (TODO →
... → DONE), sem noção de tempo/ciclo. O time quer planejar o trabalho em
**Program Increments (PI)** de ~3 meses, divididos em **Sprints** de ~2
semanas (datas ajustáveis em ambos os casos). O objetivo é:

- Cadastrar PIs e Sprints por time.
- No quadro, iniciar/finalizar sprints manualmente; ao finalizar, o que não
  foi concluído transborda automaticamente para a próxima sprint.
- Atribuir cards a sprints manualmente.
- Consultar sprints passadas (histórico) mesmo que as tasks tenham mudado
  desde então.
- Filtrar a tela de métricas por sprint, mantendo o filtro de período atual
  (WEEK/FORTNIGHT/MONTH) funcionando.
- No quadro, alternar entre a visão atual (todas as tasks do time) e uma
  visão filtrada por sprint.

## Escopo

Por time — mesmo modelo do board atual, que já é escopado por `teamId` via
`getCurrentTeam()`. Cada time tem seu próprio calendário de PIs e sprints,
independente dos demais times.

## Modelo de domínio (novo contexto `sprint`)

### ProgramIncrement (PI)

`id`, `teamId`, `name`, `startDate`, `endDate`.

Só agrupa sprints; não tem lifecycle próprio (sem status) — o estado
relevante vive nas sprints.

### Sprint

`id`, `piId`, `teamId` (denormalizado do PI para facilitar queries por
time), `name`, `startDate`, `endDate`, `status` (`PLANNED` | `ACTIVE` |
`CLOSED`).

Regra: no máximo **uma sprint `ACTIVE` por time** por vez. Uma sprint só
pode ser iniciada se não houver outra ativa no mesmo time. Ordem entre
sprints é dada por `startDate`.

### Vínculo card ↔ sprint

Campo `sprintId` (nullable, sem FK) direto na tabela `tasks`, seguindo o
padrão já usado por `teamId` (contextos não se acoplam por schema).
Atribuição manual, uma sprint por vez, feita no modal do card.

Descartei uma tabela de vínculo N:N com histórico de todas as atribuições:
a necessidade de histórico já é coberta pelo snapshot de fechamento
(abaixo), então uma tabela extra seria redundância sem função real (YAGNI).

### Histórico congelado no fechamento

Ao finalizar uma sprint, dois registros imutáveis são gravados:

- **`sprint_task_snapshots`**: uma linha por task que estava na sprint no
  momento do fechamento, com os campos relevantes **copiados** (não
  referenciados) — `externalId`, `description`, `typeId`, `assigneeId`,
  `statusAtFreeze` — mais `carriedOver: boolean`. Cópia em vez de
  referência é necessária porque a task viva pode ser editada ou movida
  depois, e o histórico não pode mudar retroativamente.
- **`sprint_metrics_snapshot`**: um blob `jsonb` com o mesmo formato de
  métricas já calculado hoje (`HistoricalPeriodMetrics`), reaproveitando
  `rate-metrics.ts`/`duration-metrics.ts` sobre o range de datas da
  sprint.

## Regra de finalização (overflow)

Ao clicar em "Finalizar sprint":

1. Calcula e grava o snapshot de métricas (range = `startDate`–`endDate`
   da sprint).
2. Para cada task com `sprintId` = sprint atual: grava snapshot da task com
   o status atual e `carriedOver = status !== DONE`.
3. Tasks com `status === DONE` mantêm o `sprintId` como está.
4. Tasks não concluídas: procura a próxima sprint `PLANNED` do mesmo time
   com `startDate` mais próxima.
   - Se existir: `task.sprintId` = próxima sprint (transbordo real).
   - Se não existir: `task.sprintId = null` (fica "sem sprint" até
     alguém atribuir manualmente).
5. Sprint muda para `status = CLOSED`.

"Iniciar sprint" só está disponível para sprints `PLANNED` quando não há
outra `ACTIVE` no time.

## Board

- **Controle de sprint** no topo do quadro (visível quando o time tem
  PI/sprint cadastrada): mostra a sprint `ACTIVE` atual (nome + datas) com
  botão **Finalizar sprint**; quando não há sprint ativa, mostra **Iniciar
  sprint**, que ativa a sprint `PLANNED` de `startDate` mais próxima
  (a mesma ordem usada no overflow).
- **Seletor de visão**: `Atual` (comportamento de hoje — todas as tasks do
  time, sem filtro de sprint) | `Por sprint` (dropdown de sprints do time;
  mesmas colunas de status, cards filtrados por `sprintId`).
  - Sprints `CLOSED` aparecem no dropdown em modo leitura, renderizando a
    partir do `sprint_task_snapshots` (não da tabela `tasks` viva) — para
    ver "como foi" mesmo que as tasks tenham mudado depois.
  - Cards transbordados (`carriedOver = true`) exibem um indicador visual
    ("veio da sprint X").
- **Modal do card**: novo campo "Sprint" (dropdown com as sprints não
  fechadas do time), opcional.
- **Cadastro de PI/Sprint**: tela em modal, seguindo o padrão já usado por
  `/teams` e `/teams/[teamId]`. Rota: `/board/sprints`.
  - Lista PIs do time; criar PI (nome, início/fim, sugestão de 3 meses).
  - Dentro de um PI, criar sprints (nome, início/fim, sugestão de 2
    semanas), editável em ambos os níveis.

## Métricas

- Novo filtro "Sprint" na tela de métricas, **mutuamente exclusivo** com o
  filtro de período atual. Um toggle "Período | Sprint" acima do
  `period-filter.tsx` existente; ao escolher "Sprint", o filtro de período
  fica desabilitado e aparece um dropdown de sprints do time.
- Sprint `ACTIVE` ou `PLANNED`: métricas calculadas ao vivo, reaproveitando
  `get-metrics-for-period` sobre o range de datas da sprint.
- Sprint `CLOSED`: lê diretamente do `sprint_metrics_snapshot` gravado na
  finalização — números não mudam mesmo que as tasks sejam editadas depois.

## Persistência

Novas tabelas em `infrastructure/sprint/drizzle/schema.ts`:

- `program_increments`: `id`, `team_id`, `name`, `start_date`, `end_date`.
- `sprints`: `id`, `pi_id` (FK → `program_increments`), `team_id`, `name`,
  `start_date`, `end_date`, `status`.
- `sprint_task_snapshots`: `id`, `sprint_id` (FK → `sprints`), `task_id`
  (sem FK — referência cross-context), `external_id`, `description`,
  `type_id`, `assignee_id`, `status_at_freeze`, `carried_over`.
- `sprint_metrics_snapshot`: `id`, `sprint_id` (FK → `sprints`, único),
  `metrics` (`jsonb`).

Alteração em `tasks` (contexto `task`, `infrastructure/task/drizzle/schema.ts`):

- nova coluna `sprint_id uuid` (nullable, sem FK, indexada por
  `(team_id, sprint_id)`).

## Fora de escopo

- Múltiplas sprints ativas simultâneas no mesmo time.
- Atribuição de card a múltiplas sprints (histórico de reatribuições).
- Edição/reabertura de sprint já `CLOSED`.
