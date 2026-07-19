# Design: Due date obrigatória

Data: 2026-07-19
Pré-requisito da spec [2026-07-19-metrics-summary-redesign-design.md](./2026-07-19-metrics-summary-redesign-design.md): o bloco "Resultado da semana" do novo dashboard só faz sentido com toda task tendo uma due date garantida.

## Contexto e objetivo

`Task.dueDate` é hoje opcional (`string | null`). Passa a ser obrigatório: toda task criada ou editada precisa de uma data prevista.

## Modelo de dados

`Task.dueDate` muda de `string | null` para `string` em `domain/task/entities/task.ts`.

Coluna `tasks.due_date` (`infrastructure/task/drizzle/schema.ts`) muda de `date("due_date")` para `date("due_date").notNull()`.

Migração nova (`drizzle/migrations/0006_task-due-date-required.sql`):

1. Backfill das linhas com `due_date IS NULL`: usa a data da primeira transição para `DONE` em `task_status_changes` (task já concluída); se a task nunca chegou a `DONE`, usa `tasks.created_at`.
2. `ALTER TABLE tasks ALTER COLUMN due_date SET NOT NULL`.

## Validação

`validate-task-references.ts` passa a exigir `dueDate`: remove o ramo que aceita `null` e passa a validar presença (mesmo padrão de erro dos outros campos obrigatórios, ex. `"Data prevista é obrigatória"`) antes de validar o formato com `parseDateOnly` (já existente).

`CreateTaskInput`, `UpdateTaskInput` e o input de `create-historical-task.ts` mudam `dueDate: string | null` para `dueDate: string`.

## UI

`task-form-modal.tsx` e `historical-task-form-modal.tsx`: o `<input type="date" name="dueDate">` ganha o atributo `required` (validação client-side; a validação real continua no servidor, por ser entrada não confiável).

`task-card.tsx` / `due-date-status.ts`: `dueDate` deixa de aceitar `null`. `getDueDateStatus` perde o ramo `!dueDate` (mantém só o de `status === "DONE"` retornando `"none"`); o card sempre exibe o badge de prazo.

`app/board/actions.ts`: repassa `dueDate` como `string`, sem fallback para `null`.

## Arquitetura (arquivos alterados)

```text
domain/task/entities/task.ts                         # dueDate: string
infrastructure/task/drizzle/schema.ts                 # coluna NOT NULL
drizzle/migrations/0006_task-due-date-required.sql    # backfill + constraint

application/task/validate-task-references.ts          # dueDate obrigatório
application/task/use-cases/create-task.ts              # CreateTaskInput.dueDate: string
application/task/use-cases/update-task.ts              # UpdateTaskInput.dueDate: string
application/task/use-cases/create-historical-task.ts   # input.dueDate: string

presentation/task/task-form-modal.tsx                  # input required
presentation/task/historical-task-form-modal.tsx       # input required
presentation/task/due-date-status.ts                   # remove ramo !dueDate
app/board/actions.ts                                    # sem fallback null
```

Nenhum arquivo novo: é um estreitamento de tipo existente, não uma entidade ou port novo.

## Edge cases

- Task antiga sem due date: coberta pelo backfill da migração, não exige edição manual.
- Formulário enviado com data vazia: bloqueado no client pelo `required`; se chegar mesmo assim (requisição direta ao Server Action), `validate-task-references` rejeita.
- Task histórica criada retroativamente sem due date informada: mesma regra — obrigatório também em `create-historical-task`.

## Testes

- Atualizar os ~12 arquivos de teste que hoje criam task com `dueDate: null` (`create-task.test.ts`, `update-task.test.ts`, `drizzle-task-repository.test.ts`, `list-tasks-by-team.test.ts`, `move-task.test.ts`, `toggle-blocked.test.ts`, `delete-task.test.ts`, `delete-task-type.test.ts`, `create-historical-task.test.ts`, `drizzle-task-history-repository.test.ts` e os que os exercitam via integração) para passar uma data válida.
- Caso novo em `validate-task-references`: rejeita `dueDate` vazio/ausente.
- Migração: verificação manual (ou teste de infra) de que linhas com `due_date IS NULL` recebem a data de conclusão ou criação, e que o `NOT NULL` passa a rejeitar inserts sem due date.
