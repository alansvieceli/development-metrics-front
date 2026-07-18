# Design: Quadro Kanban e Tasks

Data: 2026-07-17
Sub-projeto 2 de 4 do produto Development Metrics (Times → **Kanban/Tasks** → Motor de métricas → Dashboard).

Depende da spec [2026-07-17-team-management-design.md](./2026-07-17-team-management-design.md): time selecionado e membros do time.

## Contexto e objetivo

Quadro Kanban para cadastrar e movimentar tasks do time selecionado, gerando o histórico de movimentação e bloqueio que o motor de métricas (sub-projeto 3) vai consumir. Não cobre cálculo de métricas nem dashboards.

## Modelo de dados (domain)

- **Task**: `id` (gerado), `externalId` (texto, único por time), `description`, `typeId` (referencia um `TaskType`), `assigneeId` (nullable, referencia um `Member` do time), `teamId`, `status` (`TODO` | `IN_DEVELOPMENT` | `CODE_REVIEW` | `DONE`), `blocked` (boolean), `dueDate` (nullable — data prevista de entrega), `createdAt` (data de início), `updatedAt`.
- **TaskType**: `id`, `name`, `color` (hex). Global para toda a aplicação, não por time. Vem com 3 registros padrão via seed/migração: **História**, **Tarefa Técnica**, **Bug** — todos editáveis e removíveis depois, e novos tipos podem ser cadastrados livremente.
- **TaskStatusChange** (histórico, append-only): `id`, `taskId`, `fromStatus` (nullable na criação), `toStatus`, `changedAt`. Alimenta lead time, cycle time, tempo em code review, retrabalho, throughput e WIP no sub-projeto 3.
- **TaskBlockedPeriod** (histórico, append-only): `id`, `taskId`, `blockedAt`, `unblockedAt` (nullable enquanto o bloqueio segue ativo). Alimenta a métrica de tempo bloqueado.

Regras:

- Movimentação entre colunas é livre — qualquer coluna para qualquer coluna, sem restrição de transição. Cada movimento grava uma entrada em `TaskStatusChange`.
- **Retrabalho** = transições `CODE_REVIEW → IN_DEVELOPMENT` ou `DONE → IN_DEVELOPMENT`.
- **Bloqueado** é uma flag independente da coluna: pode ser ativada/desativada em qualquer status. Tempo bloqueado é informativo — lead time e cycle time contam o tempo corrido total, sem descontar bloqueios.
- `Task.assigneeId` e `Task.typeId` referenciam apenas ids de outros agregados (sem importar entidades de `team` ou entre agregados), respeitando a regra de contextos não se acoplarem internamente.
- Não é possível excluir um `TaskType` que esteja em uso por alguma `Task` (bloqueia a exclusão com uma mensagem).

## Rotas e telas

- `/board` — **quadro Kanban** do time selecionado. 4 colunas lado a lado (A Fazer, Em Desenvolvimento, Code Review, Concluído) com uma linha divisória vertical entre elas. Cada card mostra id externo, descrição, responsável, uma tag/borda colorida conforme o tipo, e indicador "⛔ Bloqueado" quando aplicável. Cada card tem um seletor "mover para..." com as 4 colunas, e uma ação de editar. Botão "+ Nova task" no topo.
- **Modal de cadastro/edição de task**: aberto sobre `/board` (não é uma rota própria). Campos: id externo, descrição, tipo, responsável, data prevista de entrega (opcional). No cadastro, inclui também "coluna inicial" (a task pode nascer em qualquer coluna, não só "A Fazer"). Na edição, inclui o toggle "bloqueado" e a ação "excluir task" (tasks recém-criadas nunca nascem bloqueadas).
- `/task-types` — **gerenciar tipos de task**. Lista os tipos existentes (nome + cor, ações de editar/excluir — excluir desabilitado quando o tipo está em uso), e um formulário para adicionar tipo (nome + seletor de cor).
- **Header**: ganha um link "Tipos de task" (→ `/task-types`), além do que já existe da spec de Times.
- `/` (raiz) passa a redirecionar para `/board`, conforme atualizado na spec de Times.

## Arquitetura (camadas)

```text
domain/task/entities/task.ts
domain/task/entities/task-type.ts
domain/task/entities/task-status-change.ts
domain/task/entities/task-blocked-period.ts

application/task/use-cases/
  create-task.ts          # cria a task + grava o primeiro TaskStatusChange (fromStatus: null)
  update-task.ts          # edita descrição, tipo, responsável, id externo, data prevista
  delete-task.ts
  move-task.ts            # troca status + grava TaskStatusChange
  toggle-blocked.ts        # ativa/desativa a flag + abre/fecha um TaskBlockedPeriod
  list-tasks-by-team.ts    # agrupado por status, pro board
  create-task-type.ts
  update-task-type.ts
  delete-task-type.ts      # falha se o tipo estiver em uso
  list-task-types.ts

application/task/ports/
  task-repository.ts
  task-history-repository.ts   # TaskStatusChange + TaskBlockedPeriod (lido pelo motor de métricas)
  task-type-repository.ts

infrastructure/task/
  drizzle/schema.ts             # tasks, task_status_changes, task_blocked_periods, task_types
  drizzle/seed-task-types.ts     # migração/seed dos 3 tipos padrão
  drizzle-task-repository.ts
  drizzle-task-history-repository.ts
  drizzle-task-type-repository.ts

presentation/task/
  kanban-board.tsx         # colunas + cards (server component)
  task-card.tsx
  task-move-select.tsx     # client component (Server Action ao trocar)
  task-form-modal.tsx      # client component (modal de criar/editar, Server Action ao salvar)
  task-type-list.tsx
  task-type-form.tsx

composition/task.ts

app/board/page.tsx
app/task-types/page.tsx
```

`create-task` já usa `list-task-types` e (indiretamente) o contrato público de `application/team` para listar membros do time atual ao montar o formulário — sem acessar entidades internas de `team`.

## Edge cases

- **Excluir a task**: permitido a qualquer momento (uso interno, sem restrição).
- **Excluir tipo em uso**: bloqueado; mensagem indicando que há tasks vinculadas.
- **Id externo duplicado no mesmo time**: rejeitado na criação/edição.
- **Task sem responsável**: permitido (aparece como "sem responsável" no card).
- **Mover para a mesma coluna atual**: não gera `TaskStatusChange` (sem transição real).
- **Alternar bloqueado quando já bloqueado/desbloqueado**: idempotente — ligar quando já está ligado, ou desligar quando já está desligado, não abre/fecha um novo período.

## Testes

- Unitários em `application/task`: `move-task` (grava histórico, detecta retrabalho pelas transições definidas), `toggle-blocked` (abre e fecha `TaskBlockedPeriod` corretamente, idempotência), `delete-task-type` (falha quando em uso), unicidade de `externalId` por time.
- Integração para os fluxos críticos de `presentation`/`app`: criar task via modal aparece na coluna escolhida; mover task via select atualiza a coluna e o histórico; criar/editar tipo reflete na cor do card.
