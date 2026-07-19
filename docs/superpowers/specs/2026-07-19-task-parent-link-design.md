# Design: Vínculo de origem entre tasks (bug ↔ task-pai)

Data: 2026-07-19

## Contexto e objetivo

Bugs às vezes nascem de outra task (ex.: um bug encontrado durante o desenvolvimento de uma História). Hoje não existe nenhuma forma de registrar essa origem, nem visualizar no card quantos bugs (ou outros vínculos) uma task gerou.

"Bug" já existe no domínio, mas só como um `TaskType` dinâmico (seed, editável via CRUD de tipos) — não como uma entidade separada. Esta spec cobre a fundação de dados: o vínculo pai/filho entre tasks e a proteção do tipo Bug. Métricas de bugs (abertos por semana/mês/trimestre, ranking de tasks com mais bugs) ficam para uma spec futura, construída sobre esta fundação.

## Domínio e dados

`task_types` ganha uma coluna `is_bug boolean not null default false`. Só a linha seed "Bug" recebe `true` (`seed-task-types.ts`). É a fonte única de verdade para "isso é bug" — evita depender do nome do tipo, que pode ser editado.

`tasks` ganha `parent_task_id uuid`, nullable, auto-referenciada:

```ts
parentTaskId: uuid("parent_task_id").references(() => tasks.id, {
  onDelete: "set null",
}),
```

Indexada (`index("tasks_parent_task_id_idx").on(table.parentTaskId)`). `onDelete: "set null"` — excluir a task-pai não apaga os filhos, só os torna órfãos (o vínculo é metadado, não posse).

Domínio:

```ts
// task-type.ts
export type TaskType = { id: string; name: string; color: string; isBug: boolean };

// task.ts
export type Task = { ...; parentTaskId: string | null };
```

`TaskTypeWithUsage` (`list-task-types.ts`) herda `isBug` automaticamente via `TaskType`.

## Regras de negócio (application layer)

`validate-task-references.ts` ganha a validação do `parentTaskId` (usada por `create-task.ts` e `update-task.ts`, os dois pontos de entrada de escrita):

- se informado, a task-pai deve existir;
- deve ser do mesmo `teamId`;
- não pode ser a própria task (`parentTaskId !== id`, relevante só em `update-task`, já que em `create-task` o id ainda não existe).

Sem detecção de ciclo (A→B→A): o uso esperado é 1 nível (bug aponta pra origem, não uma cadeia). Corte deliberado — se aninhamento profundo aparecer como necessidade real, adiciona-se checagem de ancestralidade depois.

`delete-task-type.ts` passa a recusar exclusão quando `taskType.isBug`, com a mesma `ApplicationError` usada para "tipo em uso" (mensagem específica: "O tipo Bug não pode ser excluído"). `isBug` não entra no DTO de `update-task-type.ts` — não é editável por edição normal, só existe no seed.

`list-tasks-by-team.ts` (`listTasksByTeam`) passa a receber também o repositório de tipos (`typeRepository`) e enriquece cada task com:

```ts
export type TaskWithStatusSince = Task & {
  statusChangedAt: Date;
  bugChildCount: number;
  otherChildCount: number;
  parentTask: { id: string; externalId: string } | null;
};
```

Cálculo em memória a partir da lista de tasks do time já carregada (mesma chamada a `repository.listByTeam(teamId)` que já existe hoje) — sem query adicional: monta um mapa `parentTaskId → filhos[]`, separa por `taskType.isBug` (usando os `taskTypes` carregados), e resolve `parentTask` via `id → task` no mesmo array.

## Presentation

`task-form-modal.tsx`: campo novo "Task de origem (opcional)" — select com as outras tasks do time (exclui a própria task em modo edição), exibindo `externalId — description`. Recebe a lista de tasks do time como prop nova (já disponível na página do board).

`task-card.tsx`: dois badges, cada um só renderiza quando a contagem é > 0:

- `🐛 {bugChildCount}` — bugs originados desta task;
- `🔗 {otherChildCount}` — outros vínculos (tasks não-bug que apontam pra esta).

Se `task.parentTask` existir, uma linha discreta abaixo do `externalId`: `Origem: #{parentTask.externalId}`.

Sem clique-pra-expandir nesta versão — badge é só contador visual.

`task-type-list.tsx`: o botão de excluir (`Trash2`) passa a ficar desabilitado também quando `taskType.isBug` (mesmo padrão já usado para `taskType.inUse`), com `title="O tipo Bug não pode ser excluído"`.

## Edge cases

- **Task-pai excluída**: `parentTaskId` vira `null` via `onDelete: set null`; o badge de origem some do card do filho.
- **Tipo Bug sem nenhuma task usando ainda**: `delete-task-type` bloqueia mesmo assim, por `isBug`, não por uso (a checagem de uso continua existindo em paralelo, mas `isBug` bloqueia primeiro).
- **Vincular a uma task de outro time**: rejeitado por `validate-task-references` (task-pai deve ter o mesmo `teamId`).
- **Selecionar a própria task como origem (edição)**: rejeitado por `validate-task-references`.
- **Zero filhos**: nenhum badge renderiza (sem "🐛 0" poluindo o card).

## Testes

- `validate-task-references.test.ts`: casos novos — task-pai inexistente, de outro time, e auto-referência.
- `delete-task-type.test.ts`: caso novo — exclusão do tipo `isBug` é rejeitada mesmo sem uso.
- `list-tasks-by-team.test.ts`: caso novo — `bugChildCount`/`otherChildCount`/`parentTask` calculados corretamente a partir de um conjunto de tasks com vínculos mistos (bug e não-bug apontando pro mesmo pai).
- `tests/integration/kanban-board.spec.ts` (ou equivalente já existente): cenário de criar uma task vinculando a uma task-pai existente, e conferir os badges no card da task-pai.
