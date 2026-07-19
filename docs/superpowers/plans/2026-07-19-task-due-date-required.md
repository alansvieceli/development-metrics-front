# Due Date Obrigatória Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `Task.dueDate` deixa de aceitar `null` — toda task passa a ter due date obrigatória, do domínio ao formulário, com backfill de dados existentes.

**Architecture:** Estreitamento de tipo (`string | null` → `string`) propagado de domain → application → infrastructure → presentation, mais uma migração de dados que faz backfill antes do `NOT NULL`.

**Tech Stack:** TypeScript, Next.js (Server Actions), Drizzle ORM/Kit, Postgres, Vitest.

## Global Constraints

- Commits seguem `docs/techdocs/guidelines.md`: `tipo(numero-do-card): descrição` ou `tipo(contexto)!: descrição` — sem card, usar `chore(metricas)!: ...` / `fix(metricas)!: ...` / `test(metricas)!: ...` conforme o tipo de mudança.
- Sem biblioteca de validação nova: seguir o padrão já usado (`ApplicationError`, `parseDateOnly`).
- `tsc --noEmit`, `biome ci .` e `vitest run` (arquivos afetados, depois suíte completa) devem passar antes de cada commit.

---

## Task 1: Domain — `Task.dueDate` obrigatório

**Files:**
- Modify: `src/domain/task/entities/task.ts:22`

**Interfaces:**
- Produces: `Task.dueDate: string` (era `string | null`) — usado por todas as tasks seguintes.

- [ ] **Step 1: Alterar o tipo**

Em `src/domain/task/entities/task.ts`, trocar:

```ts
	dueDate: string | null;
```

por:

```ts
	dueDate: string;
```

- [ ] **Step 2: Rodar typecheck para levantar todos os pontos quebrados**

Run: `npm run typecheck`
Expected: FAIL — lista de erros em `validate-task-references.ts`, `create-task.ts`, `update-task.ts`, `create-historical-task.ts`, `task-repository.ts`, `app/board/actions.ts`, `due-date-status.ts`, `task-card.tsx`, testes. Essa lista de erros guia as próximas tasks; não commitar ainda.

---

## Task 2: Application — validação obrigatória em `validate-task-references`

**Files:**
- Modify: `src/application/task/validate-task-references.ts`
- Modify: `src/application/task/use-cases/create-task.test.ts`
- Modify: `src/application/task/use-cases/update-task.test.ts`

**Interfaces:**
- Consumes: nenhuma mudança de assinatura em `validateTaskReferences` — o parâmetro `dueDate` do objeto de input muda de `string | null` para `string` (segue o tipo de `Task.dueDate` da Task 1).
- Produces: `validateTaskReferences` lança `ApplicationError("Data prevista é obrigatória")` quando `dueDate` é vazio, além do erro de formato já existente.

- [ ] **Step 1: Escrever o teste que falha (rejeita due date vazia em `createTask`)**

Em `src/application/task/use-cases/create-task.test.ts`, adicionar ao array `it.each` (perto do caso `"data inexistente"`):

```ts
		["data vazia", { dueDate: "" }, "Data prevista é obrigatória"],
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest run src/application/task/use-cases/create-task.test.ts`
Expected: FAIL no caso `"rejeita data vazia"` — hoje `dueDate: ""` cai no ramo `input.dueDate !== null && !parseDateOnly(input.dueDate)`, que já rejeita (mensagem `"Data prevista inválida"`), então o teste falha por mensagem diferente da esperada.

- [ ] **Step 3: Implementar a validação obrigatória**

Em `src/application/task/validate-task-references.ts`, trocar a assinatura do parâmetro `dueDate` e a validação:

```ts
	input: {
		teamId: string;
		typeId: string;
		assigneeId: string | null;
		dueDate: string;
		externalId: string;
	},
) {
	if (!(await teamAccess.teamExists(input.teamId))) {
		throw new ApplicationError("Time não encontrado");
	}
	if (!(await typeRepository.findById(input.typeId))) {
		throw new ApplicationError("Tipo de task não encontrado");
	}
	if (
		input.assigneeId &&
		!(await teamAccess.memberBelongsToTeam(input.assigneeId, input.teamId))
	) {
		throw new ApplicationError("Membro não pertence ao time");
	}
	if (!input.dueDate) {
		throw new ApplicationError("Data prevista é obrigatória");
	}
	if (!parseDateOnly(input.dueDate)) {
		throw new ApplicationError("Data prevista inválida");
	}
```

(mantém o restante da função — checagem de `externalId` duplicado — inalterado.)

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest run src/application/task/use-cases/create-task.test.ts`
Expected: PASS em todos os casos.

- [ ] **Step 5: Repetir para `updateTask` — adicionar teste**

Em `src/application/task/use-cases/update-task.test.ts`, adicionar ao array `it.each` (perto de `"data inexistente"`):

```ts
		["data vazia", "team-1", { dueDate: "" }, "Data prevista é obrigatória"],
```

- [ ] **Step 6: Atualizar `updateTask` para usar `validateTaskReferences`**

`update-task.ts` hoje reimplementa a validação de `dueDate` inline (`if (input.dueDate !== null && !parseDateOnly(input.dueDate))`) em vez de chamar `validateTaskReferences`. Para não duplicar a regra nova, trocar `UpdateTaskInput.dueDate` para `string` e substituir a validação inline pela mesma checagem usada em `validate-task-references.ts`:

Em `src/application/task/use-cases/update-task.ts`, trocar:

```ts
export type UpdateTaskInput = {
	externalId: string;
	description: string;
	typeId: string;
	assigneeId: string | null;
	dueDate: string | null;
};
```

por:

```ts
export type UpdateTaskInput = {
	externalId: string;
	description: string;
	typeId: string;
	assigneeId: string | null;
	dueDate: string;
};
```

e trocar:

```ts
	if (input.dueDate !== null && !parseDateOnly(input.dueDate)) {
		throw new ApplicationError("Data prevista inválida");
	}
```

por:

```ts
	if (!input.dueDate) {
		throw new ApplicationError("Data prevista é obrigatória");
	}
	if (!parseDateOnly(input.dueDate)) {
		throw new ApplicationError("Data prevista inválida");
	}
```

- [ ] **Step 7: Rodar os testes de `updateTask` e confirmar que passam**

Run: `npx vitest run src/application/task/use-cases/update-task.test.ts`
Expected: PASS em todos os casos.

- [ ] **Step 8: Commit**

```bash
git add src/domain/task/entities/task.ts src/application/task/validate-task-references.ts src/application/task/use-cases/update-task.ts src/application/task/use-cases/create-task.test.ts src/application/task/use-cases/update-task.test.ts
git commit -m "feat(metricas)!: torna a data prevista obrigatoria na validacao de tasks"
```

---

## Task 3: Application — propagar o tipo pelos demais casos de uso

**Files:**
- Modify: `src/application/task/use-cases/create-task.ts`
- Modify: `src/application/task/use-cases/create-historical-task.ts`
- Modify: `src/application/task/ports/task-repository.ts`
- Modify: `src/application/task/use-cases/create-historical-task.test.ts`

**Interfaces:**
- Consumes: `validateTaskReferences` da Task 2 (já aceita `dueDate: string`).
- Produces: `CreateTaskInput.dueDate: string`, `CreateHistoricalTaskInput.dueDate: string`, `CreateTaskData.dueDate: string`, `UpdateTaskData.dueDate: string` — usados pela Task 4 (Server Actions) e Task 5 (formulários).

- [ ] **Step 1: `CreateTaskInput`**

Em `src/application/task/use-cases/create-task.ts`, trocar:

```ts
	dueDate: string | null;
```

por:

```ts
	dueDate: string;
```

- [ ] **Step 2: `CreateHistoricalTaskInput`**

Em `src/application/task/use-cases/create-historical-task.ts`, trocar:

```ts
	dueDate: string | null;
```

por:

```ts
	dueDate: string;
```

- [ ] **Step 3: `CreateTaskData` e `UpdateTaskData` (port)**

Em `src/application/task/ports/task-repository.ts`, trocar as duas ocorrências de:

```ts
	dueDate: string | null;
```

por:

```ts
	dueDate: string;
```

(uma em `CreateTaskData`, outra em `UpdateTaskData`).

- [ ] **Step 4: Atualizar fixture de `create-historical-task.test.ts`**

Em `src/application/task/use-cases/create-historical-task.test.ts:12`, trocar:

```ts
	dueDate: null,
```

por:

```ts
	dueDate: "2026-07-01",
```

- [ ] **Step 5: Rodar os testes de `create-historical-task`**

Run: `npx vitest run src/application/task/use-cases/create-historical-task.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/application/task/use-cases/create-task.ts src/application/task/use-cases/create-historical-task.ts src/application/task/ports/task-repository.ts src/application/task/use-cases/create-historical-task.test.ts
git commit -m "refactor(metricas)!: propaga data prevista obrigatoria pelos casos de uso de task"
```

---

## Task 4: Server Actions — exigir `dueDate` na borda

**Files:**
- Modify: `src/app/board/actions.ts`

**Interfaces:**
- Consumes: `UpdateTaskInput`, `CreateTaskInput`, `CreateHistoricalTaskInput` da Task 3 (todos com `dueDate: string`).

- [ ] **Step 1: Trocar a validação em `validateInput` (usada por `updateTaskAction`)**

Em `src/app/board/actions.ts`, trocar:

```ts
	if (value.dueDate !== null && !parseDateOnly(value.dueDate))
		throw new ApplicationError("Data prevista inválida");
```

por:

```ts
	if (typeof value.dueDate !== "string" || !value.dueDate)
		throw new ApplicationError("Data prevista é obrigatória");
	if (!parseDateOnly(value.dueDate))
		throw new ApplicationError("Data prevista inválida");
```

- [ ] **Step 2: Trocar a validação em `createHistoricalTaskAction`**

Trocar:

```ts
		if (input.dueDate !== null && !parseDateOnly(input.dueDate))
			throw new ApplicationError("Data prevista inválida");
```

por:

```ts
		if (typeof input.dueDate !== "string" || !input.dueDate)
			throw new ApplicationError("Data prevista é obrigatória");
		if (!parseDateOnly(input.dueDate))
			throw new ApplicationError("Data prevista inválida");
```

- [ ] **Step 3: Atualizar os tipos de input das actions**

Trocar em `CreateHistoricalTaskActionInput`:

```ts
	dueDate: string | null;
```

por:

```ts
	dueDate: string;
```

(`createTaskAction` e `updateTaskAction` já usam `CreateTaskInput`/`UpdateTaskInput` da Task 3, que já têm o tipo correto — nenhuma mudança adicional de tipo nessas duas.)

- [ ] **Step 4: Rodar typecheck**

Run: `npm run typecheck`
Expected: os erros relacionados a `app/board/actions.ts` desaparecem; erros restantes ficam só em `task-form-modal.tsx`, `historical-task-form-modal.tsx`, `task-card.tsx`, `due-date-status.ts` e nos testes de infraestrutura (cobertos nas próximas tasks).

- [ ] **Step 5: Commit**

```bash
git add src/app/board/actions.ts
git commit -m "feat(metricas)!: exige data prevista nas server actions de task"
```

---

## Task 5: Presentation — formulários exigem due date

**Files:**
- Modify: `src/presentation/task/task-form-modal.tsx`
- Modify: `src/presentation/task/historical-task-form-modal.tsx`

**Interfaces:**
- Consumes: `CreateTaskInput`, `UpdateTaskInput`, `CreateHistoricalTaskActionInput` (Tasks 3–4), todos com `dueDate: string`.

- [ ] **Step 1: `task-form-modal.tsx` — input obrigatório**

Em `src/presentation/task/task-form-modal.tsx`, no campo de data (por volta da linha 233), adicionar `required`:

```tsx
							<input
								id="dueDate"
								type="date"
								name="dueDate"
								defaultValue={isEdit ? props.task.dueDate : ""}
								className="rounded-lg border border-(--border) px-3 py-2"
								required
							/>
```

(nota: `defaultValue` não usa mais `?? ""` porque `props.task.dueDate` já é sempre uma string.)

- [ ] **Step 2: `task-form-modal.tsx` — parar de converter vazio em `null`**

No `handleSubmit`, trocar:

```ts
		const dueDateValue = String(formData.get("dueDate") ?? "");
		const dueDate = dueDateValue === "" ? null : dueDateValue;
```

por:

```ts
		const dueDate = String(formData.get("dueDate") ?? "");
```

- [ ] **Step 3: `historical-task-form-modal.tsx` — input obrigatório**

No campo de data (por volta da linha 151), adicionar `required`:

```tsx
							<input
								id="hist-dueDate"
								type="date"
								name="dueDate"
								className="rounded-lg border border-(--border) px-3 py-2"
								required
							/>
```

- [ ] **Step 4: `historical-task-form-modal.tsx` — parar de converter vazio em `null`**

Trocar:

```ts
		const dueDateValue = String(formData.get("dueDate") ?? "");
		const dueDate = dueDateValue === "" ? null : dueDateValue;
```

por:

```ts
		const dueDate = String(formData.get("dueDate") ?? "");
```

- [ ] **Step 5: Rodar typecheck e lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS para os dois arquivos (os erros restantes, se houver, ficam em `task-card.tsx`/`due-date-status.ts`, cobertos na próxima task).

- [ ] **Step 6: Commit**

```bash
git add src/presentation/task/task-form-modal.tsx src/presentation/task/historical-task-form-modal.tsx
git commit -m "feat(metricas)!: exige data prevista nos formularios de task"
```

---

## Task 6: Presentation — simplificar exibição do prazo no card

**Files:**
- Modify: `src/presentation/task/due-date-status.ts`
- Modify: `src/presentation/task/task-card.tsx`

**Interfaces:**
- Consumes: `Task.dueDate: string` (Task 1) — `TaskWithStatusSince` (que estende `Task`) sempre tem `dueDate` presente.

- [ ] **Step 1: Simplificar `getDueDateStatus`**

Em `src/presentation/task/due-date-status.ts`, trocar:

```ts
export function getDueDateStatus(
	dueDate: string | null,
	status: TaskStatus,
	today: Date,
): DueDateStatus {
	if (!dueDate || status === "DONE") {
		return "none";
	}
```

por:

```ts
export function getDueDateStatus(
	dueDate: string,
	status: TaskStatus,
	today: Date,
): DueDateStatus {
	if (status === "DONE") {
		return "none";
	}
```

- [ ] **Step 2: Sempre exibir o prazo no card**

Em `src/presentation/task/task-card.tsx`, trocar:

```tsx
			{task.dueDate ? (
				<p
					className={`text-xs font-semibold ${dueDateClassName(
						getDueDateStatus(task.dueDate, task.status, new Date()),
					)}`}
				>
					Prazo: {formatDueDate(task.dueDate)}
				</p>
			) : null}
```

por:

```tsx
			<p
				className={`text-xs font-semibold ${dueDateClassName(
					getDueDateStatus(task.dueDate, task.status, new Date()),
				)}`}
			>
				Prazo: {formatDueDate(task.dueDate)}
			</p>
```

- [ ] **Step 3: Rodar typecheck e lint no projeto inteiro**

Run: `npm run typecheck && npm run lint`
Expected: PASS — nenhum erro relacionado a `dueDate` deve sobrar fora dos testes de infraestrutura (Task 7).

- [ ] **Step 4: Commit**

```bash
git add src/presentation/task/due-date-status.ts src/presentation/task/task-card.tsx
git commit -m "refactor(metricas)!: sempre exibe o prazo no card, ja que e obrigatorio"
```

---

## Task 7: Infraestrutura — schema, migração e testes de fixture

**Files:**
- Modify: `src/infrastructure/task/drizzle/schema.ts`
- Create: `drizzle/migrations/0006_task-due-date-required.sql` (gerado por `drizzle-kit`, depois editado)
- Modify: `src/infrastructure/task/drizzle-task-repository.test.ts`
- Modify: `src/infrastructure/task/drizzle-task-history-repository.test.ts`
- Modify: `src/infrastructure/metrics/drizzle-metrics-query-port.test.ts`
- Modify: `src/application/task/use-cases/delete-task-type.test.ts`
- Modify: `src/application/task/use-cases/delete-task.test.ts`
- Modify: `src/application/task/use-cases/list-task-types.test.ts`
- Modify: `src/application/task/use-cases/list-tasks-by-team.test.ts`
- Modify: `src/application/task/use-cases/move-task.test.ts`
- Modify: `src/application/task/use-cases/toggle-blocked.test.ts`

**Interfaces:**
- Consumes: nenhuma — esta task fecha a cadeia de tipos abrindo a coluna real do banco.

- [ ] **Step 1: Coluna `NOT NULL` no schema**

Em `src/infrastructure/task/drizzle/schema.ts`, trocar:

```ts
		dueDate: date("due_date"),
```

por:

```ts
		dueDate: date("due_date").notNull(),
```

- [ ] **Step 2: Gerar a migração**

Run: `npm run db:generate -- --name=task-due-date-required`
Expected: cria `drizzle/migrations/0006_task-due-date-required.sql` com `ALTER TABLE "tasks" ALTER COLUMN "due_date" SET NOT NULL;` (mais o snapshot em `drizzle/migrations/meta/`).

- [ ] **Step 3: Editar a migração gerada para fazer backfill antes do `NOT NULL`**

Abrir `drizzle/migrations/0006_task-due-date-required.sql` e adicionar o `UPDATE` de backfill **antes** da linha `ALTER COLUMN ... SET NOT NULL`, no formato:

```sql
UPDATE "tasks" t
SET "due_date" = COALESCE(
	(SELECT MIN(tsc."changed_at")::date FROM "task_status_changes" tsc WHERE tsc."task_id" = t."id" AND tsc."to_status" = 'DONE'),
	t."created_at"::date
)
WHERE t."due_date" IS NULL;--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "due_date" SET NOT NULL;
```

- [ ] **Step 4: Aplicar a migração no banco de dev local**

Run: `npm run db:migrate`
Expected: PASS, sem erro de `NOT NULL` violado (o `UPDATE` já preencheu qualquer linha nula antes do `ALTER`).

- [ ] **Step 5: Atualizar fixtures de teste — tabela de substituições**

Trocar `dueDate: null,` por `dueDate: "2026-07-01",` (ou a data já usada no teste, quando o teste referenciar uma data específica) nos seguintes pontos:

| Arquivo | Linha (antes de editar) | Contexto |
|---|---|---|
| `src/infrastructure/task/drizzle-task-repository.test.ts` | 47 | `baseData()` — default compartilhado por todos os testes do arquivo |
| `src/infrastructure/task/drizzle-task-history-repository.test.ts` | 29 | `db.insert(tasks).values({...})` único no arquivo |
| `src/infrastructure/metrics/drizzle-metrics-query-port.test.ts` | 50 | `insertTask()` — default compartilhado; testes que já passam `dueDate` explícito (ex. `"2026-07-10"`) continuam por override, não pelo default |
| `src/application/task/use-cases/delete-task-type.test.ts` | 26 | seed de task usada |
| `src/application/task/use-cases/delete-task.test.ts` | 15 e 30 | dois seeds distintos no arquivo |
| `src/application/task/use-cases/list-task-types.test.ts` | 20 e 29 | dois seeds distintos no arquivo |
| `src/application/task/use-cases/list-tasks-by-team.test.ts` | 11 | `baseTask` — default compartilhado |
| `src/application/task/use-cases/move-task.test.ts` | 12 | `baseInput` (ou seed equivalente) — default compartilhado |
| `src/application/task/use-cases/toggle-blocked.test.ts` | 12 | `baseInput` (ou seed equivalente) — default compartilhado |

Em cada um, a mudança é sempre a mesma linha:

```ts
			dueDate: null,
```
→
```ts
			dueDate: "2026-07-01",
```

(ajustar a indentação exata de cada arquivo conforme o contexto ao redor — a maioria está a uma tab a mais ou a menos dependendo se é objeto literal direto ou dentro de `baseData()`).

- [ ] **Step 6: Rodar a suíte de testes completa**

Run: `npm test`
Expected: PASS em todos os arquivos listados acima e em todo o restante da suíte (nenhum outro arquivo deveria depender de `dueDate: null`).

- [ ] **Step 7: Rodar typecheck, lint e knip no projeto inteiro**

Run: `npm run typecheck && npm run lint && npm run knip`
Expected: PASS. Se o Knip acusar algo (ex. `parseDateOnly` sem uso em algum arquivo após a simplificação), remover o import não utilizado.

- [ ] **Step 8: Commit**

```bash
git add src/infrastructure/task/drizzle/schema.ts drizzle/migrations src/infrastructure/task/drizzle-task-repository.test.ts src/infrastructure/task/drizzle-task-history-repository.test.ts src/infrastructure/metrics/drizzle-metrics-query-port.test.ts src/application/task/use-cases/delete-task-type.test.ts src/application/task/use-cases/delete-task.test.ts src/application/task/use-cases/list-task-types.test.ts src/application/task/use-cases/list-tasks-by-team.test.ts src/application/task/use-cases/move-task.test.ts src/application/task/use-cases/toggle-blocked.test.ts
git commit -m "feat(metricas)!: torna due_date obrigatoria no banco com backfill"
```

---

## Task 8: E2E — preencher a data prevista nos testes Playwright existentes

**Files:**
- Modify: `tests/integration/kanban-board.spec.ts`
- Modify: `tests/integration/task-types.spec.ts`
- Modify: `tests/integration/team-selection.spec.ts`

**Interfaces:**
- Consumes: o campo `required` do formulário adicionado na Task 5 — sem preencher `dueDate`, o navegador bloqueia o submit e o `page.getByRole("button", { name: "Salvar" }).click()` não dispara a Server Action, quebrando as asserções seguintes.

Esses três specs de Playwright criam tasks pelo modal (`TaskFormModal`/`HistoricalTaskFormModal`) sem preencher "Data prevista de entrega". Com o campo obrigatório, todo clique em "Salvar" precisa vir depois de um `.fill()` nesse campo.

- [ ] **Step 1: `kanban-board.spec.ts` — adicionar o preenchimento antes de cada "Salvar" que cria uma task nova**

Em cada um dos blocos abaixo, adicionar a linha `await page.getByLabel("Data prevista de entrega").fill("2026-12-31");` imediatamente antes do `await page.getByRole("button", { name: "Salvar" }).click();` correspondente (9 ocorrências, uma por bloco):

1. Teste `"criar uma task pelo modal a coloca na coluna escolhida"` (TASK-1, linha ~21).
2. Teste `"mover uma task pelo select atualiza a coluna"` (TASK-2, linha ~32).
3. Teste `"a cor do tipo aparece na borda do card"` (TASK-3, linha ~53).
4. Teste `"restaura o status quando a movimentação é rejeitada"` (TASK-INVALID-MOVE, linha ~91).
5. Teste `"a contagem da coluna reflete o número de cards"` — duas vezes (TASK-COUNT-1 linha ~117, TASK-COUNT-2 linha ~126).
6. Teste `"o chip de responsável mostra a contagem de cards ativos"` (TASK-ANA-1, linha ~153).
7. Teste `"o chip de bloqueados aparece e some conforme o card é bloqueado"` (TASK-BLOCK-1, linha ~165).

Exemplo da mudança no primeiro bloco — trocar:

```ts
	await page.getByLabel("Id externo").fill("TASK-1");
	await page.getByLabel("Descrição").fill("Corrigir bug de login");
	await page.getByLabel("Tipo").selectOption({ label: "Bug" });
	await page.getByLabel("Coluna inicial").selectOption({ label: "Revisão" });
	await page.getByRole("button", { name: "Salvar" }).click();
```

por:

```ts
	await page.getByLabel("Id externo").fill("TASK-1");
	await page.getByLabel("Descrição").fill("Corrigir bug de login");
	await page.getByLabel("Tipo").selectOption({ label: "Bug" });
	await page.getByLabel("Coluna inicial").selectOption({ label: "Revisão" });
	await page.getByLabel("Data prevista de entrega").fill("2026-12-31");
	await page.getByRole("button", { name: "Salvar" }).click();
```

E replicar o mesmo padrão (adicionar a linha do `fill` de "Data prevista de entrega" imediatamente antes do `click` em "Salvar") nos outros 8 pontos listados acima.

- [ ] **Step 2: `kanban-board.spec.ts` — teste de cadastro retroativo**

No teste `"cadastro retroativo cria o card já na coluna da última etapa"`, o modal é o `HistoricalTaskFormModal`, que também tem o campo "Data prevista de entrega" (além das datas de etapa). Trocar:

```ts
	await page.getByLabel("Status da etapa 2").selectOption({ label: "Revisão" });
	await page.getByLabel("Data da etapa 2").fill("2026-07-05");
	await page.getByRole("button", { name: "Salvar" }).click();
```

por:

```ts
	await page.getByLabel("Status da etapa 2").selectOption({ label: "Revisão" });
	await page.getByLabel("Data da etapa 2").fill("2026-07-05");
	await page.getByLabel("Data prevista de entrega").fill("2026-12-31");
	await page.getByRole("button", { name: "Salvar" }).click();
```

- [ ] **Step 3: `task-types.spec.ts`**

No teste `"não permite excluir um tipo em uso por uma task"`, trocar:

```ts
		await page.getByLabel("Tipo").selectOption({ label: "História" });
		await page.getByRole("button", { name: "Salvar" }).click();
```

por:

```ts
		await page.getByLabel("Tipo").selectOption({ label: "História" });
		await page.getByLabel("Data prevista de entrega").fill("2026-12-31");
		await page.getByRole("button", { name: "Salvar" }).click();
```

- [ ] **Step 4: `team-selection.spec.ts`**

No teste que cria "TASK-1" para "Ana", trocar:

```ts
	await page.getByLabel("Responsável").selectOption({ label: "Ana" });
	await page.getByRole("button", { name: "Salvar" }).click();
```

por:

```ts
	await page.getByLabel("Responsável").selectOption({ label: "Ana" });
	await page.getByLabel("Data prevista de entrega").fill("2026-12-31");
	await page.getByRole("button", { name: "Salvar" }).click();
```

- [ ] **Step 5: Rodar a suíte E2E**

Run: `npm run test:e2e`
Expected: PASS em `kanban-board.spec.ts`, `task-types.spec.ts` e `team-selection.spec.ts`. (`metrics-dashboard.spec.ts` é reescrito na spec do redesenho da página de métricas — pode falhar até lá; não é escopo desta task.)

- [ ] **Step 6: Commit**

```bash
git add tests/integration/kanban-board.spec.ts tests/integration/task-types.spec.ts tests/integration/team-selection.spec.ts
git commit -m "test(metricas)!: preenche data prevista obrigatoria nos testes e2e existentes"
```

---

## Self-Review Notes

- **Cobertura da spec:** migração com backfill (Task 7), validação obrigatória (Task 2), `CreateTaskInput`/`UpdateTaskInput`/`CreateHistoricalTaskInput` (Task 3), formulários com `required` (Task 5), card sempre mostra prazo (Task 6), ~12 arquivos de teste unitário (Task 7) — todos cobertos. Achado durante a auto-revisão, fora do escopo original da spec mas necessário para não quebrar a suíte: os specs E2E `kanban-board.spec.ts`, `task-types.spec.ts` e `team-selection.spec.ts` criam tasks pelo modal sem preencher due date — coberto pela Task 8, adicionada nesta revisão.
- **Sem placeholders:** cada step tem o código exato a escrever.
- **Consistência de tipos:** `dueDate: string` é o único tipo usado do domínio até a apresentação em todas as tasks; nenhuma task reintroduz `| null`.
