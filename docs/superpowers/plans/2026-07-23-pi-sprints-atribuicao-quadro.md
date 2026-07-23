# PIs e Sprints — Atribuição de card e visão por sprint no quadro Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir atribuir manualmente um card a uma sprint (campo no modal do card) e adicionar ao quadro uma visão "Por sprint" que filtra os cards pela sprint selecionada, mantendo a visão "Atual" (comportamento de hoje) intacta.

**Architecture:** `tasks.sprint_id` como referência cross-context sem FK (mesmo padrão de `tasks.team_id`), validada por um contrato estreito `SprintAccess` (mesmo padrão de `TeamAccess`) consumido pelos use-cases existentes `createTask`/`updateTask`. A visão "por sprint" é resolvida no server via query string (`?sprintId=`), seguindo o padrão já usado pelo filtro de período em `/metrics`. Nenhuma tabela de snapshot ainda — sprints só podem estar `PLANNED`/`ACTIVE` neste ponto (o fechamento de sprint é o próximo plano), então a visão "por sprint" sempre lê a tabela `tasks` ao vivo.

**Tech Stack:** Next.js App Router (Server Components + Server Actions + query string), TypeScript estrito, Drizzle ORM, Vitest, Biome, Tailwind.

## Global Constraints

- Todas as do plano anterior (`docs/superpowers/plans/2026-07-23-pi-sprints-fundacao.md`) continuam valendo: `kebab-case`, `ApplicationError` para erros de negócio, `parseDateOnly` para datas, fakes in-memory em testes de `application`, testes de `infrastructure` contra Postgres real, commits `tipo(sprints)!: descrição`.
- `tasks.sprint_id` é nullable e sem FK — contextos `task` e `sprint` não se acoplam a nível de schema.
- Este plano assume a fundação do plano anterior já implementada (`ProgramIncrement`, `Sprint`, `SprintRepository`, `drizzleSprintRepository`, `createSprintUseCases()`).
- Fora de escopo: iniciar/finalizar sprint, overflow, snapshots, visão histórica read-only de sprint fechada, filtro de sprint nas métricas. Uma sprint nunca está `CLOSED` neste ponto — não há necessidade de tratar esse caso na UI ainda.

---

## File Structure

```
src/domain/task/entities/task.ts                              (modificado)

src/application/sprint/contracts/sprint-access.ts              (novo)
src/application/sprint/use-cases/list-sprints-by-team.ts       (novo)
src/application/sprint/use-cases/list-sprints-by-team.test.ts  (novo)

src/application/task/validate-sprint-id.ts                     (novo)
src/application/task/validate-sprint-id.test.ts                (novo)
src/application/task/ports/task-repository.ts                  (modificado)
src/application/task/use-cases/create-task.ts                  (modificado)
src/application/task/use-cases/create-task.test.ts              (modificado)
src/application/task/use-cases/update-task.ts                  (modificado)
src/application/task/use-cases/update-task.test.ts              (modificado)
src/application/task/use-cases/test-helpers/create-fake-task-repository.ts  (modificado)

src/infrastructure/task/drizzle/schema.ts                      (modificado)
src/infrastructure/task/drizzle-task-repository.test.ts        (modificado)

src/composition/task.ts                                        (modificado)
src/composition/sprint.ts                                      (modificado)

src/app/board/actions.ts                                       (modificado)
src/app/board/page.tsx                                         (modificado)

src/presentation/task/filter-tasks-by-sprint.ts                (novo)
src/presentation/task/filter-tasks-by-sprint.test.ts            (novo)
src/presentation/task/sprint-board-filter.tsx                  (novo)
src/presentation/task/task-form-modal.tsx                      (modificado)
src/presentation/task/task-card.tsx                             (modificado)
src/presentation/task/kanban-board.tsx                          (modificado)
```

---

### Task 1: Campo `sprintId` na entidade `Task`

**Files:**
- Modify: `src/domain/task/entities/task.ts`

**Interfaces:**
- Produces: `Task.sprintId: string | null`.

- [ ] **Step 1: Adicionar o campo**

```ts
// src/domain/task/entities/task.ts
export type Task = {
	id: string;
	externalId: string;
	description: string;
	typeId: string;
	assigneeId: string | null;
	teamId: string;
	status: TaskStatus;
	blocked: boolean;
	dueDate: string;
	parentTaskId: string | null;
	sprintId: string | null;
	createdAt: Date;
	updatedAt: Date;
};
```

- [ ] **Step 2: Verificar que compila (erros esperados nos consumidores até os próximos tasks)**

Run: `npx tsc --noEmit 2>&1 | head -40`
Expected: erros em `create-fake-task-repository.ts` e possivelmente `drizzle-task-repository.ts` reclamando de `sprintId` ausente — esperado, corrigido nos próximos tasks. Não commitar ainda; siga para o Task 2 antes do primeiro commit.

---

### Task 2: Coluna `sprint_id` em `tasks`

**Files:**
- Modify: `src/infrastructure/task/drizzle/schema.ts`

**Interfaces:**
- Produces: coluna `sprint_id uuid` nullable na tabela `tasks`, indexada por `(team_id, sprint_id)`.

- [ ] **Step 1: Adicionar a coluna e o índice**

Editar a definição de `tasks` em `src/infrastructure/task/drizzle/schema.ts`, adicionando o campo `sprintId` logo após `parentTaskId` e um novo índice:

```ts
// dentro de pgTable("tasks", { ... }) — adicionar ao objeto de colunas:
		// sprintId sem FK: contextos não se acoplam a nível de schema (mesmo
		// padrão de teamId). Sprint pode não existir ainda (feature opcional).
		sprintId: uuid("sprint_id"),
```

```ts
// dentro do array de (table) => [ ... ] — adicionar:
		index("tasks_team_id_sprint_id_idx").on(table.teamId, table.sprintId),
```

- [ ] **Step 2: Gerar e aplicar a migration**

Run: `npm run db:generate`
Expected: novo arquivo em `drizzle/migrations/` com `ALTER TABLE "tasks" ADD COLUMN "sprint_id" uuid;` e `CREATE INDEX "tasks_team_id_sprint_id_idx" ...`.

Run: `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/development_metrics_test" npm run db:migrate`
Expected: `migrations applied successfully!`.

- [ ] **Step 3: Verificar que o projeto ainda compila com o erro esperado restante**

Run: `npx tsc --noEmit 2>&1 | head -40`
Expected: só restam erros em `create-fake-task-repository.ts` (Task 5 corrige).

- [ ] **Step 4: Commit**

```bash
git add src/domain/task/entities/task.ts src/infrastructure/task/drizzle/schema.ts drizzle/migrations
git commit -m "feat(sprints)!: adiciona sprint_id a tasks"
```

---

### Task 3: Contrato `SprintAccess`

**Files:**
- Create: `src/application/sprint/contracts/sprint-access.ts`

**Interfaces:**
- Consumes: `Sprint` de `src/domain/sprint/entities/sprint.ts`.
- Produces: `SprintAccess = { findById(sprintId: string): Promise<Sprint | null> }`. Satisfeito estruturalmente por `SprintRepository` (mesmo truque de `TeamAccess` ser um subconjunto de `TeamRepository`) — `drizzleSprintRepository` pode ser passado diretamente onde `SprintAccess` for esperado.

- [ ] **Step 1: Criar o contrato**

```ts
// src/application/sprint/contracts/sprint-access.ts
import type { Sprint } from "@/domain/sprint/entities/sprint";

export type SprintAccess = {
	findById(sprintId: string): Promise<Sprint | null>;
};
```

- [ ] **Step 2: Verificar que compila**

Run: `npx tsc --noEmit 2>&1 | head -10`
Expected: nenhum novo erro relacionado a este arquivo.

- [ ] **Step 3: Commit**

```bash
git add src/application/sprint/contracts/sprint-access.ts
git commit -m "feat(sprints)!: adiciona contrato sprintaccess"
```

---

### Task 4: `validateSprintId`

**Files:**
- Create: `src/application/task/validate-sprint-id.ts`
- Create: `src/application/task/validate-sprint-id.test.ts`

**Interfaces:**
- Consumes: `SprintAccess` (Task 3).
- Produces: `validateSprintId(access: SprintAccess, sprintId: string, teamId: string): Promise<void>` — lança `ApplicationError("Sprint não encontrada")` se a sprint não existir ou pertencer a outro time.

- [ ] **Step 1: Escrever os testes**

```ts
// src/application/task/validate-sprint-id.test.ts
import { describe, expect, it } from "vitest";
import type { SprintAccess } from "@/application/sprint/contracts/sprint-access";
import type { Sprint } from "@/domain/sprint/entities/sprint";
import { validateSprintId } from "./validate-sprint-id";

const sprint: Sprint = {
	id: "sprint-1",
	piId: "pi-1",
	teamId: "team-1",
	name: "Sprint 1",
	startDate: "2026-07-01",
	endDate: "2026-07-14",
	status: "PLANNED",
};

function fakeAccess(sprints: Sprint[]): SprintAccess {
	return {
		async findById(sprintId) {
			return sprints.find((item) => item.id === sprintId) ?? null;
		},
	};
}

describe("validateSprintId", () => {
	it("aceita uma sprint existente do mesmo time", async () => {
		await expect(
			validateSprintId(fakeAccess([sprint]), "sprint-1", "team-1"),
		).resolves.toBeUndefined();
	});

	it("rejeita sprint inexistente", async () => {
		await expect(
			validateSprintId(fakeAccess([]), "sprint-missing", "team-1"),
		).rejects.toThrow("Sprint não encontrada");
	});

	it("rejeita sprint de outro time", async () => {
		await expect(
			validateSprintId(fakeAccess([sprint]), "sprint-1", "team-2"),
		).rejects.toThrow("Sprint não encontrada");
	});
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npx vitest run src/application/task/validate-sprint-id.test.ts`
Expected: FAIL — `Cannot find module './validate-sprint-id'`.

- [ ] **Step 3: Implementar**

```ts
// src/application/task/validate-sprint-id.ts
import { ApplicationError } from "@/application/shared/application-error";
import type { SprintAccess } from "@/application/sprint/contracts/sprint-access";

export async function validateSprintId(
	access: SprintAccess,
	sprintId: string,
	teamId: string,
) {
	const sprint = await access.findById(sprintId);
	if (!sprint || sprint.teamId !== teamId) {
		throw new ApplicationError("Sprint não encontrada");
	}
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npx vitest run src/application/task/validate-sprint-id.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add src/application/task/validate-sprint-id.ts src/application/task/validate-sprint-id.test.ts
git commit -m "feat(sprints)!: adiciona validacao de sprintid para tasks"
```

---

### Task 5: `sprintId` no port `TaskRepository` e correção do fake

**Files:**
- Modify: `src/application/task/ports/task-repository.ts`
- Modify: `src/application/task/use-cases/test-helpers/create-fake-task-repository.ts`

**Interfaces:**
- Produces: `CreateTaskData.sprintId?: string | null`, `UpdateTaskData.sprintId?: string | null`.
- O fake deve replicar a semântica real do Drizzle: chave ausente/`undefined` = não altera; `null` = limpa; string = define. Isso importa porque `undefined` explícito em `data.sprintId` (que os próximos tasks sempre vão gerar) não pode sobrescrever silenciosamente o valor atual no fake, ou os testes do Task 7 dariam falso-positivo.

- [ ] **Step 1: Adicionar `sprintId` aos tipos do port**

```ts
// src/application/task/ports/task-repository.ts
export type CreateTaskData = {
	externalId: string;
	description: string;
	typeId: string;
	assigneeId: string | null;
	teamId: string;
	status: TaskStatus;
	dueDate: string;
	parentTaskId: string | null;
	sprintId?: string | null;
	tagIds?: string[];
};

export type UpdateTaskData = {
	externalId: string;
	description: string;
	typeId: string;
	assigneeId: string | null;
	dueDate: string;
	parentTaskId: string | null;
	sprintId?: string | null;
	tagIds?: string[];
};
```

(Mantém as demais linhas do arquivo inalteradas — só os dois tipos acima ganham o campo `sprintId`.)

- [ ] **Step 2: Corrigir `seed` no fake para default `null`**

```ts
// src/application/task/use-cases/test-helpers/create-fake-task-repository.ts
	async function seed(data: CreateTaskData) {
		const now = new Date();
		const task: Task = {
			id: `task-${nextId++}`,
			...data,
			sprintId: data.sprintId ?? null,
			blocked: false,
			createdAt: now,
			updatedAt: now,
		};
		tasks.push(task);
		return task;
	}
```

- [ ] **Step 3: Corrigir `createWithExplicitHistory` para default `null`**

```ts
// dentro de createWithExplicitHistory(data, history):
			const task: Task = {
				id: `task-${nextId++}`,
				...data,
				sprintId: data.sprintId ?? null,
				status: data.status,
				blocked: false,
				createdAt: history[0].changedAt,
				updatedAt: history[history.length - 1].changedAt,
			};
```

- [ ] **Step 4: Corrigir `update` para não sobrescrever com `undefined`**

```ts
// substituir o corpo de update(taskId, data) por:
		async update(taskId: string, data: UpdateTaskData) {
			const task = tasks.find((item) => item.id === taskId);
			if (!task) throw new ApplicationError("Task não encontrada");
			const { sprintId, tagIds, ...rest } = data;
			Object.assign(task, rest, { updatedAt: new Date() });
			if (sprintId !== undefined) {
				task.sprintId = sprintId;
			}
			if (tagIds) {
				const remaining = taskTagIds.filter((a) => a.taskId !== taskId);
				remaining.push(...tagIds.map((tagId) => ({ taskId, tagId })));
				taskTagIds.length = 0;
				taskTagIds.push(...remaining);
			}
			return task;
		},
```

- [ ] **Step 5: Rodar a suíte de testes de task inteira e confirmar que nada quebrou**

Run: `npx vitest run src/application/task src/infrastructure/task`
Expected: todos os testes existentes continuam passando (o campo é opcional e os testes antigos não o usam).

- [ ] **Step 6: Verificar que compila sem erros**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 7: Commit**

```bash
git add src/application/task/ports/task-repository.ts src/application/task/use-cases/test-helpers/create-fake-task-repository.ts
git commit -m "feat(sprints)!: adiciona sprintid ao port taskrepository e ao fake"
```

---

### Task 6: `createTask` valida e persiste `sprintId`

**Files:**
- Modify: `src/application/task/use-cases/create-task.ts`
- Modify: `src/application/task/use-cases/create-task.test.ts`

**Interfaces:**
- Consumes: `SprintAccess` (Task 3), `validateSprintId` (Task 4).
- Produces: `CreateTaskInput.sprintId?: string | null`; `createTask` ganha um 6º parâmetro opcional `sprintAccess?: SprintAccess`.

- [ ] **Step 1: Adicionar os testes**

Adicionar ao final de `describe("createTask", ...)` em `src/application/task/use-cases/create-task.test.ts` (antes do `});` final):

```ts
	it("associa a sprint informada quando validada", async () => {
		const { repository, typeRepository, teamAccess, input } = await setup();
		const sprintAccess = {
			findById: async (id: string) =>
				id === "sprint-1"
					? {
							id: "sprint-1",
							piId: "pi-1",
							teamId: "team-1",
							name: "Sprint 1",
							startDate: "2026-07-01",
							endDate: "2026-07-14",
							status: "PLANNED" as const,
						}
					: null,
		};
		const task = await createTask(
			repository,
			typeRepository,
			teamAccess,
			{ ...input, sprintId: "sprint-1" },
			undefined,
			sprintAccess,
		);
		expect(task.sprintId).toBe("sprint-1");
	});

	it("rejeita sprint que não existe", async () => {
		const { repository, typeRepository, teamAccess, input } = await setup();
		const sprintAccess = { findById: async () => null };
		await expect(
			createTask(
				repository,
				typeRepository,
				teamAccess,
				{ ...input, sprintId: "sprint-missing" },
				undefined,
				sprintAccess,
			),
		).rejects.toThrow("Sprint não encontrada");
	});

	it("cria sem sprint quando sprintId não é informado", async () => {
		const { repository, typeRepository, teamAccess, input } = await setup();
		const task = await createTask(repository, typeRepository, teamAccess, input);
		expect(task.sprintId).toBeNull();
	});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npx vitest run src/application/task/use-cases/create-task.test.ts`
Expected: FAIL nos 2 primeiros novos testes (o 3º já passaria pelo default do fake, mas `createTask` ainda não aceita/persiste `sprintId`).

- [ ] **Step 3: Implementar**

```ts
// src/application/task/use-cases/create-task.ts
import { ApplicationError } from "@/application/shared/application-error";
import type { SprintAccess } from "@/application/sprint/contracts/sprint-access";
import type { TagRepository } from "@/application/task/ports/tag-repository";
import type { TaskRepository } from "@/application/task/ports/task-repository";
import type { TaskTypeRepository } from "@/application/task/ports/task-type-repository";
import { validateSprintId } from "@/application/task/validate-sprint-id";
import { validateTagIds } from "@/application/task/validate-tag-ids";
import { validateTaskReferences } from "@/application/task/validate-task-references";
import type { TeamAccess } from "@/application/team/contracts/team-access";
import type { TaskStatus } from "@/domain/task/entities/task";

export type CreateTaskInput = {
	externalId: string;
	description: string;
	typeId: string;
	assigneeId: string | null;
	teamId: string;
	status: TaskStatus;
	dueDate: string;
	parentTaskId: string | null;
	sprintId?: string | null;
	tagIds?: string[];
};

export async function createTask(
	repository: TaskRepository,
	typeRepository: TaskTypeRepository,
	teamAccess: TeamAccess,
	input: CreateTaskInput,
	tagRepository?: TagRepository,
	sprintAccess?: SprintAccess,
) {
	const externalId = input.externalId.trim();
	const description = input.description.trim();
	if (!externalId) {
		throw new ApplicationError("Id externo não pode ser vazio");
	}
	if (!description) {
		throw new ApplicationError("Descrição não pode ser vazia");
	}
	await validateTaskReferences(repository, typeRepository, teamAccess, {
		teamId: input.teamId,
		typeId: input.typeId,
		assigneeId: input.assigneeId,
		dueDate: input.dueDate,
		externalId,
		parentTaskId: input.parentTaskId,
	});
	if (tagRepository && input.tagIds) {
		await validateTagIds(tagRepository, input.tagIds);
	}
	if (sprintAccess && input.sprintId) {
		await validateSprintId(sprintAccess, input.sprintId, input.teamId);
	}
	return repository.createWithInitialHistory({
		externalId,
		description,
		typeId: input.typeId,
		assigneeId: input.assigneeId,
		teamId: input.teamId,
		status: input.status,
		dueDate: input.dueDate,
		parentTaskId: input.parentTaskId,
		sprintId: input.sprintId ?? null,
		tagIds: input.tagIds,
	});
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npx vitest run src/application/task/use-cases/create-task.test.ts`
Expected: PASS (todos, incluindo os 3 novos).

- [ ] **Step 5: Commit**

```bash
git add src/application/task/use-cases/create-task.ts src/application/task/use-cases/create-task.test.ts
git commit -m "feat(sprints)!: valida e persiste sprintid ao criar task"
```

---

### Task 7: `updateTask` valida e persiste `sprintId`

**Files:**
- Modify: `src/application/task/use-cases/update-task.ts`
- Modify: `src/application/task/use-cases/update-task.test.ts`

**Interfaces:**
- Consumes: `SprintAccess`, `validateSprintId` (Task 3, 4).
- Produces: `UpdateTaskInput.sprintId?: string | null`; `updateTask` ganha um 7º parâmetro opcional `sprintAccess?: SprintAccess`.

- [ ] **Step 1: Adicionar os testes**

Adicionar ao final de `describe("updateTask", ...)` em `src/application/task/use-cases/update-task.test.ts` (antes do `});` final):

```ts
	it("associa a sprint informada quando validada", async () => {
		const { repository, typeRepository, teamAccess, task, type } = await setup();
		const sprintAccess = {
			findById: async (id: string) =>
				id === "sprint-1"
					? {
							id: "sprint-1",
							piId: "pi-1",
							teamId: "team-1",
							name: "Sprint 1",
							startDate: "2026-07-01",
							endDate: "2026-07-14",
							status: "PLANNED" as const,
						}
					: null,
		};
		const updated = await updateTask(
			repository,
			typeRepository,
			teamAccess,
			"team-1",
			task.id,
			{
				externalId: task.externalId,
				description: task.description,
				typeId: type.id,
				assigneeId: null,
				dueDate: "2026-07-01",
				parentTaskId: null,
				sprintId: "sprint-1",
			},
			undefined,
			sprintAccess,
		);
		expect(updated.sprintId).toBe("sprint-1");
	});

	it("rejeita sprint que não existe", async () => {
		const { repository, typeRepository, teamAccess, task, type } = await setup();
		const sprintAccess = { findById: async () => null };
		await expect(
			updateTask(
				repository,
				typeRepository,
				teamAccess,
				"team-1",
				task.id,
				{
					externalId: task.externalId,
					description: task.description,
					typeId: type.id,
					assigneeId: null,
					dueDate: "2026-07-01",
					parentTaskId: null,
					sprintId: "sprint-missing",
				},
				undefined,
				sprintAccess,
			),
		).rejects.toThrow("Sprint não encontrada");
	});

	it("limpa a sprint quando sprintId é null", async () => {
		const { repository, typeRepository, teamAccess, task, type } = await setup();
		await repository.update(task.id, {
			externalId: task.externalId,
			description: task.description,
			typeId: type.id,
			assigneeId: null,
			dueDate: "2026-07-01",
			parentTaskId: null,
			sprintId: "sprint-1",
		});
		const updated = await updateTask(
			repository,
			typeRepository,
			teamAccess,
			"team-1",
			task.id,
			{
				externalId: task.externalId,
				description: task.description,
				typeId: type.id,
				assigneeId: null,
				dueDate: "2026-07-01",
				parentTaskId: null,
				sprintId: null,
			},
		);
		expect(updated.sprintId).toBeNull();
	});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npx vitest run src/application/task/use-cases/update-task.test.ts`
Expected: FAIL nos 2 primeiros novos testes.

- [ ] **Step 3: Implementar**

```ts
// src/application/task/use-cases/update-task.ts
import { ApplicationError } from "@/application/shared/application-error";
import { parseDateOnly } from "@/application/shared/validation";
import type { SprintAccess } from "@/application/sprint/contracts/sprint-access";
import type { TagRepository } from "@/application/task/ports/tag-repository";
import type { TaskRepository } from "@/application/task/ports/task-repository";
import type { TaskTypeRepository } from "@/application/task/ports/task-type-repository";
import { validateSprintId } from "@/application/task/validate-sprint-id";
import { validateTagIds } from "@/application/task/validate-tag-ids";
import type { TeamAccess } from "@/application/team/contracts/team-access";

export type UpdateTaskInput = {
	externalId: string;
	description: string;
	typeId: string;
	assigneeId: string | null;
	dueDate: string;
	parentTaskId: string | null;
	sprintId?: string | null;
	tagIds?: string[];
};

export async function updateTask(
	repository: TaskRepository,
	typeRepository: TaskTypeRepository,
	teamAccess: TeamAccess,
	teamId: string,
	taskId: string,
	input: UpdateTaskInput,
	tagRepository?: TagRepository,
	sprintAccess?: SprintAccess,
) {
	const externalId = input.externalId.trim();
	const description = input.description.trim();
	if (!externalId) {
		throw new ApplicationError("Id externo não pode ser vazio");
	}
	if (!description) {
		throw new ApplicationError("Descrição não pode ser vazia");
	}
	const task = await repository.findById(taskId);
	if (!task || task.teamId !== teamId) {
		throw new ApplicationError("Task não encontrada");
	}
	if (!(await typeRepository.findById(input.typeId))) {
		throw new ApplicationError("Tipo de task não encontrado");
	}
	if (
		input.assigneeId &&
		!(await teamAccess.memberBelongsToTeam(input.assigneeId, teamId))
	) {
		throw new ApplicationError("Membro não pertence ao time");
	}
	if (!input.dueDate) {
		throw new ApplicationError("Data prevista é obrigatória");
	}
	if (!parseDateOnly(input.dueDate)) {
		throw new ApplicationError("Data prevista inválida");
	}
	if (input.parentTaskId) {
		if (input.parentTaskId === taskId) {
			throw new ApplicationError("Uma task não pode ser origem dela mesma");
		}
		const parentTask = await repository.findById(input.parentTaskId);
		if (!parentTask || parentTask.teamId !== teamId) {
			throw new ApplicationError("Task de origem não encontrada");
		}
	}
	if (tagRepository && input.tagIds) {
		await validateTagIds(tagRepository, input.tagIds);
	}
	if (sprintAccess && input.sprintId) {
		await validateSprintId(sprintAccess, input.sprintId, teamId);
	}
	const existing = await repository.findByExternalId(task.teamId, externalId);
	if (existing && existing.id !== taskId) {
		throw new ApplicationError(
			`Já existe uma task com o id externo "${externalId}" neste time`,
		);
	}
	return repository.update(taskId, {
		externalId,
		description,
		typeId: input.typeId,
		assigneeId: input.assigneeId,
		dueDate: input.dueDate,
		parentTaskId: input.parentTaskId,
		sprintId: input.sprintId,
		tagIds: input.tagIds,
	});
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npx vitest run src/application/task/use-cases/update-task.test.ts`
Expected: PASS (todos, incluindo os 3 novos).

- [ ] **Step 5: Commit**

```bash
git add src/application/task/use-cases/update-task.ts src/application/task/use-cases/update-task.test.ts
git commit -m "feat(sprints)!: valida e persiste sprintid ao atualizar task"
```

---

### Task 8: Teste de integração — `sprintId` round-trip no Drizzle

**Files:**
- Modify: `src/infrastructure/task/drizzle-task-repository.test.ts`

**Interfaces:**
- Consumes: `drizzleTaskRepository` (existente), `baseData` helper (existente no próprio arquivo).
- Nenhuma produção de código nova — confirma que a coluna `sprint_id` (Task 2) e os tipos do port (Task 5) funcionam de ponta a ponta contra Postgres real, sem precisar de uma sprint de verdade (sem FK).

- [ ] **Step 1: Adicionar o teste**

Adicionar ao final de `describe("drizzleTaskRepository", ...)` em `src/infrastructure/task/drizzle-task-repository.test.ts` (antes do `});` final):

```ts
	it("persiste, atualiza e limpa o sprintId (sem FK, referência cross-context)", async () => {
		const sprintId = "22222222-2222-2222-2222-222222222222";
		const created = await drizzleTaskRepository.createWithInitialHistory(
			baseData({ sprintId }),
		);
		expect(created.sprintId).toBe(sprintId);

		const otherSprintId = "33333333-3333-3333-3333-333333333333";
		const updated = await drizzleTaskRepository.update(created.id, {
			externalId: created.externalId,
			description: created.description,
			typeId: created.typeId,
			assigneeId: created.assigneeId,
			dueDate: created.dueDate,
			parentTaskId: created.parentTaskId,
			sprintId: otherSprintId,
		});
		expect(updated.sprintId).toBe(otherSprintId);

		const cleared = await drizzleTaskRepository.update(created.id, {
			externalId: created.externalId,
			description: created.description,
			typeId: created.typeId,
			assigneeId: created.assigneeId,
			dueDate: created.dueDate,
			parentTaskId: created.parentTaskId,
			sprintId: null,
		});
		expect(cleared.sprintId).toBeNull();
	});
```

- [ ] **Step 2: Rodar o teste e confirmar que passa**

Run: `npx vitest run src/infrastructure/task/drizzle-task-repository.test.ts`
Expected: PASS (todos, incluindo o novo).

- [ ] **Step 3: Commit**

```bash
git add src/infrastructure/task/drizzle-task-repository.test.ts
git commit -m "test(sprints)!: cobre persistencia do sprintid no drizzletaskrepository"
```

---

### Task 9: Use-case `listSprintsByTeam`

**Files:**
- Create: `src/application/sprint/use-cases/list-sprints-by-team.ts`
- Create: `src/application/sprint/use-cases/list-sprints-by-team.test.ts`

**Interfaces:**
- Consumes: `SprintRepository` (do plano anterior); `createFakeSprintRepository` (do plano anterior).
- Produces: `listSprintsByTeam(repository: SprintRepository, teamId: string): Promise<Sprint[]>`.

- [ ] **Step 1: Escrever o teste**

```ts
// src/application/sprint/use-cases/list-sprints-by-team.test.ts
import { describe, expect, it } from "vitest";
import { createFakeSprintRepository } from "./test-helpers/create-fake-sprint-repository";
import { listSprintsByTeam } from "./list-sprints-by-team";

describe("listSprintsByTeam", () => {
	it("lista apenas as sprints do time informado", async () => {
		const repository = createFakeSprintRepository();
		await repository.create({
			piId: "pi-1",
			teamId: "team-1",
			name: "Sprint do time 1",
			startDate: "2026-07-01",
			endDate: "2026-07-14",
		});
		await repository.create({
			piId: "pi-2",
			teamId: "team-2",
			name: "Sprint do time 2",
			startDate: "2026-07-01",
			endDate: "2026-07-14",
		});

		const result = await listSprintsByTeam(repository, "team-1");

		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("Sprint do time 1");
	});
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest run src/application/sprint/use-cases/list-sprints-by-team.test.ts`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar**

```ts
// src/application/sprint/use-cases/list-sprints-by-team.ts
import type { SprintRepository } from "@/application/sprint/ports/sprint-repository";

export async function listSprintsByTeam(repository: SprintRepository, teamId: string) {
	return repository.listByTeam(teamId);
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest run src/application/sprint/use-cases/list-sprints-by-team.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/application/sprint/use-cases/list-sprints-by-team.ts src/application/sprint/use-cases/list-sprints-by-team.test.ts
git commit -m "feat(sprints)!: adiciona use-case de listagem de sprints por time"
```

---

### Task 10: Composition root — wiring de `sprintAccess` e `listSprintsByTeam`

**Files:**
- Modify: `src/composition/task.ts`
- Modify: `src/composition/sprint.ts`

**Interfaces:**
- Consumes: `drizzleSprintRepository` (plano anterior); `listSprintsByTeam` (Task 9).
- Produces: `createTaskUseCases().createTask`/`updateTask` passam `drizzleSprintRepository` como `sprintAccess`; `createSprintUseCases().listSprintsByTeam(teamId)`.

- [ ] **Step 1: Atualizar `composition/task.ts`**

```ts
// src/composition/task.ts — adicionar o import e ajustar as duas chamadas
import { drizzleSprintRepository } from "@/infrastructure/sprint/drizzle-sprint-repository";
```

```ts
// dentro de createTaskUseCases(), substituir createTask e updateTask por:
		createTask: (input: CreateTaskInput) =>
			createTask(
				drizzleTaskRepository,
				drizzleTaskTypeRepository,
				drizzleTeamRepository,
				input,
				drizzleTagRepository,
				drizzleSprintRepository,
			),
		updateTask: (teamId: string, taskId: string, input: UpdateTaskInput) =>
			updateTask(
				drizzleTaskRepository,
				drizzleTaskTypeRepository,
				drizzleTeamRepository,
				teamId,
				taskId,
				input,
				drizzleTagRepository,
				drizzleSprintRepository,
			),
```

- [ ] **Step 2: Atualizar `composition/sprint.ts`**

```ts
// src/composition/sprint.ts — adicionar o import
import { listSprintsByTeam } from "@/application/sprint/use-cases/list-sprints-by-team";
```

```ts
// dentro de createSprintUseCases(), adicionar ao objeto retornado:
		listSprintsByTeam: (teamId: string) =>
			listSprintsByTeam(drizzleSprintRepository, teamId),
```

- [ ] **Step 3: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/composition/task.ts src/composition/sprint.ts
git commit -m "feat(sprints)!: conecta sprintaccess e listagem de sprints por time na composition root"
```

---

### Task 11: Validação de `sprintId` nas Server Actions do quadro

**Files:**
- Modify: `src/app/board/actions.ts`

**Interfaces:**
- `CreateTaskActionInput`/`UpdateTaskInput` já ganham `sprintId?: string | null` automaticamente (derivam de `CreateTaskInput`/`UpdateTaskInput`, Tasks 6–7). Só falta validar o valor recebido do client antes de repassar ao use-case.

- [ ] **Step 1: Adicionar a validação em `validateInput`**

```ts
// src/app/board/actions.ts — dentro de function validateInput(input), logo após o bloco de parentTaskId:
	if (value.sprintId !== undefined && value.sprintId !== null) {
		validateUuid(value.sprintId, "Sprint inválida");
	}
```

(O restante de `validateInput` permanece igual. `createTaskAction` e `updateTaskAction` já chamam `validateInput` e repassam `input` inteiro para os use-cases, então nenhuma outra mudança é necessária nas duas funções.)

- [ ] **Step 2: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/app/board/actions.ts
git commit -m "feat(sprints)!: valida sprintid recebido pelas server actions do quadro"
```

---

### Task 12: Filtro puro de tasks por sprint

**Files:**
- Create: `src/presentation/task/filter-tasks-by-sprint.ts`
- Create: `src/presentation/task/filter-tasks-by-sprint.test.ts`

**Interfaces:**
- Consumes: `TasksByStatus` de `src/application/task/use-cases/list-tasks-by-team.ts`.
- Produces: `filterTasksByStatusBySprint(tasksByStatus: TasksByStatus, sprintId: string): TasksByStatus`.

- [ ] **Step 1: Escrever o teste**

```ts
// src/presentation/task/filter-tasks-by-sprint.test.ts
import { describe, expect, it } from "vitest";
import type { TaskWithStatusSince } from "@/application/task/use-cases/list-tasks-by-team";
import { filterTasksByStatusBySprint } from "./filter-tasks-by-sprint";

function task(overrides: Partial<TaskWithStatusSince>): TaskWithStatusSince {
	return {
		id: "task-1",
		externalId: "TASK-1",
		description: "Descrição",
		typeId: "type-1",
		assigneeId: null,
		teamId: "team-1",
		status: "TODO",
		blocked: false,
		dueDate: "2026-07-01",
		parentTaskId: null,
		sprintId: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		statusChangedAt: new Date(),
		bugChildCount: 0,
		otherChildCount: 0,
		parentTask: null,
		tags: [],
		...overrides,
	};
}

describe("filterTasksByStatusBySprint", () => {
	it("mantém apenas as tasks da sprint informada em cada coluna", () => {
		const result = filterTasksByStatusBySprint(
			{
				TODO: [
					task({ id: "1", sprintId: "sprint-1" }),
					task({ id: "2", sprintId: "sprint-2" }),
				],
				IN_DEVELOPMENT: [task({ id: "3", sprintId: "sprint-1" })],
				CODE_REVIEW: [],
				TESTING: [],
				AWAITING_PUBLICATION: [],
				DONE: [task({ id: "4", sprintId: null })],
			},
			"sprint-1",
		);

		expect(result.TODO.map((t) => t.id)).toEqual(["1"]);
		expect(result.IN_DEVELOPMENT.map((t) => t.id)).toEqual(["3"]);
		expect(result.DONE).toEqual([]);
	});
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest run src/presentation/task/filter-tasks-by-sprint.test.ts`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar**

```ts
// src/presentation/task/filter-tasks-by-sprint.ts
import type { TasksByStatus } from "@/application/task/use-cases/list-tasks-by-team";

export function filterTasksByStatusBySprint(
	tasksByStatus: TasksByStatus,
	sprintId: string,
): TasksByStatus {
	const entries = Object.entries(tasksByStatus) as [
		keyof TasksByStatus,
		TasksByStatus[keyof TasksByStatus],
	][];
	return Object.fromEntries(
		entries.map(([status, tasks]) => [
			status,
			tasks.filter((task) => task.sprintId === sprintId),
		]),
	) as TasksByStatus;
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest run src/presentation/task/filter-tasks-by-sprint.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/presentation/task/filter-tasks-by-sprint.ts src/presentation/task/filter-tasks-by-sprint.test.ts
git commit -m "feat(sprints)!: adiciona filtro de tasks por sprint na apresentacao"
```

---

### Task 13: Seletor de visão "Atual / Por sprint"

**Files:**
- Create: `src/presentation/task/sprint-board-filter.tsx`

**Interfaces:**
- Consumes: `Sprint` de `src/domain/sprint/entities/sprint.ts`.
- Produces: componente client `<SprintBoardFilter sprints={sprints} />`. Lê `sprintId` da própria URL via `useSearchParams` (não depende de prop vinda do server) e navega via `router.push` — mesmo padrão de `period-filter.tsx`.

- [ ] **Step 1: Criar o componente**

```tsx
// src/presentation/task/sprint-board-filter.tsx
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Sprint } from "@/domain/sprint/entities/sprint";

type SprintBoardFilterProps = {
	sprints: Sprint[];
};

export function SprintBoardFilter({ sprints }: SprintBoardFilterProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const selectedSprintId = searchParams.get("sprintId");

	function goToCurrent() {
		const params = new URLSearchParams(searchParams.toString());
		params.delete("sprintId");
		const query = params.toString();
		router.push(query ? `${pathname}?${query}` : pathname);
	}

	function goToSprint(sprintId: string) {
		const params = new URLSearchParams(searchParams.toString());
		params.set("sprintId", sprintId);
		router.push(`${pathname}?${params.toString()}`);
	}

	if (sprints.length === 0) return null;

	return (
		<div className="flex items-center gap-2">
			<div className="flex h-9 shrink-0 rounded-lg border border-(--border)">
				<button
					type="button"
					onClick={goToCurrent}
					aria-pressed={selectedSprintId === null}
					className={`cursor-pointer px-4 text-sm transition-colors ${
						selectedSprintId === null
							? "bg-(--accent) text-(--accent-fg)"
							: "hover:bg-white/10"
					}`}
				>
					Atual
				</button>
				<button
					type="button"
					onClick={() => goToSprint(selectedSprintId ?? sprints[0].id)}
					aria-pressed={selectedSprintId !== null}
					className={`cursor-pointer px-4 text-sm transition-colors ${
						selectedSprintId !== null
							? "bg-(--accent) text-(--accent-fg)"
							: "hover:bg-white/10"
					}`}
				>
					Por sprint
				</button>
			</div>
			{selectedSprintId !== null ? (
				<select
					value={selectedSprintId}
					onChange={(event) => goToSprint(event.target.value)}
					className="h-9 rounded-lg border border-(--border) px-2 text-sm"
				>
					{sprints.map((sprint) => (
						<option key={sprint.id} value={sprint.id}>
							{sprint.name}
						</option>
					))}
				</select>
			) : null}
		</div>
	);
}
```

- [ ] **Step 2: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/presentation/task/sprint-board-filter.tsx
git commit -m "feat(sprints)!: adiciona seletor de visao atual/por sprint no quadro"
```

---

### Task 14: Campo "Sprint" no modal do card

**Files:**
- Modify: `src/presentation/task/task-form-modal.tsx`

**Interfaces:**
- Consumes: `Sprint` de `src/domain/sprint/entities/sprint.ts`.
- Produces: ambas as variantes de `TaskFormModalProps` ganham `sprints: Sprint[]`; `handleSubmit` passa `sprintId` para `createTaskAction`/`updateTaskAction`.

- [ ] **Step 1: Adicionar o import e o campo `sprints` aos tipos**

```ts
// src/presentation/task/task-form-modal.tsx — adicionar ao topo, junto dos outros imports de tipo:
import type { Sprint } from "@/domain/sprint/entities/sprint";
```

```ts
// dentro de TaskFormModalProps, adicionar `sprints: Sprint[];` em AMBAS as variantes
// (mode: "create" e mode: "edit"), logo após `teamTasks: TeamTaskOption[];`.
```

- [ ] **Step 2: Ler o valor do form e enviar `sprintId`**

```ts
// dentro de handleSubmit, logo após a leitura de parentTaskId:
		const sprintIdValue = String(formData.get("sprintId") ?? "");
		const sprintId = sprintIdValue === "" ? null : sprintIdValue;
```

```ts
// no branch props.mode === "create", adicionar sprintId ao objeto enviado:
			result = await props.createTaskAction({
				externalId,
				description,
				typeId,
				assigneeId,
				dueDate,
				status,
				parentTaskId,
				sprintId,
				tagIds,
			});
```

```ts
// no branch else (edit), adicionar sprintId ao objeto enviado:
			result = await props.updateTaskAction(props.task.id, {
				externalId,
				description,
				typeId,
				assigneeId,
				dueDate,
				parentTaskId,
				sprintId,
				tagIds,
			});
```

- [ ] **Step 3: Adicionar o campo no formulário**

Inserir logo após o bloco do campo "Task de origem (opcional)" (o `<div>` com `parentTaskId`) e antes do `<TagCombobox ...>`:

```tsx
						<div className="flex flex-col gap-2">
							<label htmlFor="sprintId" className="text-sm opacity-70">
								Sprint (opcional)
							</label>
							<select
								id="sprintId"
								name="sprintId"
								defaultValue={
									isEdit ? (props.task.sprintId ?? "") : ""
								}
								className="rounded-lg border border-(--border) px-3 py-2"
							>
								<option value="">Sem sprint</option>
								{props.sprints.map((sprint) => (
									<option key={sprint.id} value={sprint.id}>
										{sprint.name}
									</option>
								))}
							</select>
						</div>
```

- [ ] **Step 4: Verificar que compila (erros esperados em `task-card.tsx`/`kanban-board.tsx` até o próximo task)**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: erros de "Property 'sprints' is missing" em `task-card.tsx` e `kanban-board.tsx` — corrigidos no Task 15.

---

### Task 15: Propagar `sprints` por `TaskCard` e `KanbanBoard`

**Files:**
- Modify: `src/presentation/task/task-card.tsx`
- Modify: `src/presentation/task/kanban-board.tsx`

**Interfaces:**
- Consumes: `Sprint`, `SprintBoardFilter` (Task 13), `TaskFormModal` com `sprints` (Task 14).
- Produces: `TaskCardProps.sprints: Sprint[]`; `KanbanBoardProps.sprints: Sprint[]`.

- [ ] **Step 1: Atualizar `task-card.tsx`**

```ts
// src/presentation/task/task-card.tsx — adicionar import
import type { Sprint } from "@/domain/sprint/entities/sprint";
```

```ts
// em TaskCardProps, adicionar logo após `teamTasks: TeamTaskOption[];`:
	sprints: Sprint[];
```

```ts
// na assinatura de export function TaskCard({ ... }), adicionar `sprints,` na desestruturação
// (logo após `teamTasks,`), e em <TaskFormModal mode="edit" ...> adicionar a prop:
					sprints={sprints}
```

- [ ] **Step 2: Atualizar `kanban-board.tsx`**

```ts
// src/presentation/task/kanban-board.tsx — adicionar imports
import type { Sprint } from "@/domain/sprint/entities/sprint";
import { SprintBoardFilter } from "@/presentation/task/sprint-board-filter";
```

```ts
// em KanbanBoardProps, adicionar logo após `tags: Tag[];`:
	sprints: Sprint[];
```

```ts
// na assinatura de export function KanbanBoard({ ... }), adicionar `sprints,`
// (logo após `tags,`) na desestruturação.
```

```tsx
// no header, dentro do <div className="flex items-center gap-2"> que já existe
// (o mesmo que contém HistoricalTaskFormModal e TaskFormModal), adicionar
// <SprintBoardFilter sprints={sprints} /> como PRIMEIRO filho do container:
				<div className="flex items-center gap-2">
					<SprintBoardFilter sprints={sprints} />
					<HistoricalTaskFormModal
						...
```

```tsx
// em <TaskFormModal mode="create" ...>, adicionar a prop sprints:
					sprints={sprints}
```

```tsx
// em <TaskCard ... />, dentro do .map, adicionar a prop sprints:
								sprints={sprints}
```

- [ ] **Step 3: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/presentation/task/task-form-modal.tsx src/presentation/task/task-card.tsx src/presentation/task/kanban-board.tsx
git commit -m "feat(sprints)!: adiciona campo de sprint ao card e seletor de visao ao quadro"
```

---

### Task 16: `board/page.tsx` — buscar sprints, ler `searchParams` e filtrar

**Files:**
- Modify: `src/app/board/page.tsx`

**Interfaces:**
- Consumes: `createSprintUseCases().listSprintsByTeam` (Task 10); `filterTasksByStatusBySprint` (Task 12).

- [ ] **Step 1: Atualizar a página**

```tsx
// src/app/board/page.tsx
import { redirect } from "next/navigation";
import {
	createHistoricalTaskAction,
	createTaskAction,
	deleteTaskAction,
	moveTaskAction,
	toggleBlockedAction,
	updateTaskAction,
} from "@/app/board/actions";
import { createSprintUseCases } from "@/composition/sprint";
import { createTaskUseCases } from "@/composition/task";
import { createTeamUseCases } from "@/composition/team";
import { filterTasksByStatusBySprint } from "@/presentation/task/filter-tasks-by-sprint";
import { KanbanBoard } from "@/presentation/task/kanban-board";

export default async function BoardPage({
	searchParams,
}: {
	searchParams: Promise<{ sprintId?: string }>;
}) {
	const teamUseCases = createTeamUseCases();
	const currentTeam = await teamUseCases.getCurrentTeam();
	if (!currentTeam) {
		redirect("/teams");
	}

	const teamResult = await teamUseCases.getTeam(currentTeam.id);
	const members = teamResult?.members ?? [];

	const taskUseCases = createTaskUseCases();
	const tasksByStatus = await taskUseCases.listTasksByTeam(currentTeam.id);
	const taskTypes = await taskUseCases.listTaskTypes();
	const tags = await taskUseCases.listTags();
	const sprints = await createSprintUseCases().listSprintsByTeam(currentTeam.id);

	const { sprintId } = await searchParams;
	const boardTasksByStatus =
		sprintId && sprints.some((sprint) => sprint.id === sprintId)
			? filterTasksByStatusBySprint(tasksByStatus, sprintId)
			: tasksByStatus;

	return (
		<KanbanBoard
			tasksByStatus={boardTasksByStatus}
			completedTaskLimit={currentTeam.completedTaskLimit}
			taskTypes={taskTypes}
			tags={tags}
			sprints={sprints}
			members={members}
			createTaskAction={createTaskAction}
			createHistoricalTaskAction={createHistoricalTaskAction}
			updateTaskAction={updateTaskAction}
			deleteTaskAction={deleteTaskAction}
			moveTaskAction={moveTaskAction}
			toggleBlockedAction={toggleBlockedAction}
		/>
	);
}
```

- [ ] **Step 2: Verificar que o projeto inteiro compila**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/app/board/page.tsx
git commit -m "feat(sprints)!: filtra o quadro por sprint via query string"
```

---

### Task 17: Verificação final

- [ ] **Step 1: Rodar a suíte completa de testes**

Run: `npm run test`
Expected: todos os testes passam, incluindo os novos de `sprintId` (domain/application com fakes, infrastructure com Postgres real, presentation com o filtro puro).

- [ ] **Step 2: Rodar o typecheck**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Rodar o Biome**

Run: `npm run lint`
Expected: sem violações. Se houver, rodar `npm run lint:fix` e revisar o diff antes de comitar (`style(sprints)!: aplica formatacao do biome`, mesmo padrão do plano anterior).

- [ ] **Step 4: Rodar o Knip**

Run: `npm run knip`
Expected: nenhum arquivo/export novo reportado como não usado.

- [ ] **Step 5: Verificação manual (se houver `DATABASE_URL` configurado para o dev server)**

Run: `npm run dev`, abrir `/board` com um time que tenha ao menos uma sprint `PLANNED` cadastrada (via `/sprints`, plano anterior). Confirmar:
- O botão "Sprint" aparece no modal de criar/editar card e permite associar/desassociar uma sprint.
- O seletor "Atual / Por sprint" aparece no quadro assim que existir ao menos uma sprint cadastrada para o time; some quando não há nenhuma.
- Selecionar "Por sprint" + uma sprint filtra os cards de todas as colunas para mostrar só os associados a ela; "Atual" volta a mostrar tudo.
- Se o ambiente não tiver `DATABASE_URL` configurado para o dev server, registrar essa limitação explicitamente em vez de assumir que a UI funciona — a cobertura fica pelos testes automatizados dos steps anteriores.

- [ ] **Step 6: Atualizar o grafo do graphify**

Run: `graphify update .`
Expected: grafo atualizado refletindo os novos arquivos e relações. Commitar `graphify-out/graph.json` e `graphify-out/GRAPH_REPORT.md` com `chore(graphify)!: atualiza grafo apos atribuicao de sprint no quadro`.

---

## Próximo plano (fora deste escopo)

Com a atribuição de card e a visão por sprint implementadas, o próximo plano da spec (`docs/superpowers/specs/2026-07-23-pi-sprints-design.md`) é o **ciclo de vida da sprint**: iniciar/finalizar sprint, regra de overflow, `sprint_task_snapshots` e `sprint_metrics_snapshot`, e a visão histórica read-only de sprints fechadas (que passa a ler o snapshot em vez da tabela `tasks` viva). Só depois disso o filtro de sprint nas métricas faz sentido, já que depende do snapshot de métricas.
