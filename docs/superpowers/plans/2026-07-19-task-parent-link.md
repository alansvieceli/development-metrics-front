# Vínculo de origem entre tasks (bug ↔ task-pai) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que qualquer task registre uma task-pai opcional (mesmo time), exibir contadores separados de bugs/outros vínculos no card da task-pai, e proteger o tipo `Bug` contra exclusão.

**Architecture:** Clean Architecture + DDD já usada no projeto. `parentTaskId` é uma FK auto-referenciada nullable em `tasks`; `isBug` é uma coluna booleana em `task_types`, fonte única de verdade para "isso é bug", imutável fora do seed. Toda validação de negócio fica na camada `application`; a camada `presentation` só lê os campos já calculados.

**Tech Stack:** Next.js 16 (Server Actions), Drizzle ORM + Postgres, Vitest (unit), Playwright (e2e), Biome.

## Global Constraints

- Mensagens de erro e rótulos de UI em português, seguindo o tom já usado no projeto (ex.: "Task não encontrada").
- Arquivos kebab-case, tipos/componentes PascalCase (convenção já em uso).
- `domain/` não pode importar nada de `infrastructure/` ou `drizzle`.
- Contextos (`task`, `team`) não se acoplam a nível de schema — `parentTaskId` é auto-referenciado dentro do próprio contexto `task`, então usa FK normal.
- Sem detecção de ciclo profundo no vínculo pai/filho — só se bloqueia auto-referência direta.
- `isBug` nunca é exposto nos DTOs de criação/edição de tipo — só existe via seed.
- Rodar `npm run lint` e `npm run typecheck` antes de cada commit (mesmo padrão dos commits recentes do repositório).

---

### Task 1: Fundação de dados — `isBug`, `parentTaskId` e tipos

**Files:**
- Modify: `src/infrastructure/task/drizzle/schema.ts`
- Modify: `src/infrastructure/task/drizzle/seed-task-types.ts`
- Modify: `src/domain/task/entities/task-type.ts`
- Modify: `src/domain/task/entities/task.ts`
- Modify: `src/application/task/ports/task-repository.ts`
- Modify: `src/application/task/use-cases/test-helpers/create-fake-task-type-repository.ts`
- Modify (adicionar `parentTaskId: null,` a fixtures existentes): `src/application/task/use-cases/create-task.test.ts`, `src/application/task/use-cases/create-historical-task.test.ts`, `src/application/task/use-cases/delete-task-type.test.ts`, `src/application/task/use-cases/delete-task.test.ts`, `src/application/task/use-cases/list-task-types.test.ts`, `src/application/task/use-cases/list-tasks-by-team.test.ts`, `src/application/task/use-cases/move-task.test.ts`, `src/application/task/use-cases/toggle-blocked.test.ts`, `src/application/task/use-cases/update-task.test.ts`, `src/infrastructure/task/drizzle-task-repository.test.ts`
- Create: `drizzle/migrations/00XX_*.sql` (gerado por `drizzle-kit generate`, não escrito à mão)

**Interfaces:**
- Produces: `TaskType.isBug: boolean`, `Task.parentTaskId: string | null`, `CreateTaskData.parentTaskId: string | null`, `UpdateTaskData.parentTaskId: string | null`, `FakeTaskTypeRepository.seedType(data: { name: string; color: string; isBug: boolean }): Promise<TaskType>`. Todas as tasks seguintes consomem esses tipos.

- [ ] **Step 1: Adicionar as colunas no schema**

Em `src/infrastructure/task/drizzle/schema.ts`, importar `type AnyPgColumn` junto dos outros imports de `drizzle-orm/pg-core`:

```ts
import {
	type AnyPgColumn,
	boolean,
	check,
	date,
	index,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
```

Adicionar `isBug` em `taskTypes`:

```ts
export const taskTypes = pgTable("task_types", {
	id: uuid("id").defaultRandom().primaryKey(),
	name: text("name").notNull(),
	color: text("color").notNull(),
	isBug: boolean("is_bug").notNull().default(false),
});
```

Adicionar `parentTaskId` em `tasks` (dentro do objeto de colunas, após `dueDate`) e o índice correspondente (dentro do array de `(table) => [...]`):

```ts
			dueDate: date("due_date").notNull(),
			parentTaskId: uuid("parent_task_id").references(
				(): AnyPgColumn => tasks.id,
				{ onDelete: "set null" },
			),
			createdAt: timestamp("created_at").notNull().defaultNow(),
```

```ts
			index("tasks_team_id_due_date_idx").on(table.teamId, table.dueDate),
			index("tasks_parent_task_id_idx").on(table.parentTaskId),
```

- [ ] **Step 2: Marcar o tipo seed "Bug" como `isBug`**

Em `src/infrastructure/task/drizzle/seed-task-types.ts`:

```ts
const DEFAULT_TASK_TYPES = [
	{ name: "História", color: "#2563eb", isBug: false },
	{ name: "Tarefa Técnica", color: "#64748b", isBug: false },
	{ name: "Bug", color: "#dc2626", isBug: true },
] as const;
```

- [ ] **Step 3: Gerar a migração**

Run: `npm run db:generate`
Expected: novo arquivo em `drizzle/migrations/00XX_<nome>.sql` com `ALTER TABLE "task_types" ADD COLUMN "is_bug" boolean DEFAULT false NOT NULL;` e `ALTER TABLE "tasks" ADD COLUMN "parent_task_id" uuid;` + `ADD CONSTRAINT ... FOREIGN KEY ("parent_task_id") REFERENCES "tasks"("id") ON DELETE SET NULL;` + `CREATE INDEX "tasks_parent_task_id_idx" ...`. Revisar o SQL gerado antes de prosseguir.

- [ ] **Step 4: Atualizar os tipos de domínio**

`src/domain/task/entities/task-type.ts`:

```ts
export type TaskType = {
	id: string;
	name: string;
	color: string;
	isBug: boolean;
};
```

`src/domain/task/entities/task.ts` — adicionar o campo ao tipo `Task` (mantendo o resto do arquivo igual):

```ts
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
	createdAt: Date;
	updatedAt: Date;
};
```

- [ ] **Step 5: Atualizar o port do repositório**

Em `src/application/task/ports/task-repository.ts`, adicionar `parentTaskId: string | null;` ao final de `CreateTaskData` e de `UpdateTaskData`:

```ts
export type CreateTaskData = {
	externalId: string;
	description: string;
	typeId: string;
	assigneeId: string | null;
	teamId: string;
	status: TaskStatus;
	dueDate: string;
	parentTaskId: string | null;
};

export type UpdateTaskData = {
	externalId: string;
	description: string;
	typeId: string;
	assigneeId: string | null;
	dueDate: string;
	parentTaskId: string | null;
};
```

Não é preciso alterar `drizzle-task-repository.ts` nem `drizzle-task-type-repository.ts`: `toTask` espalha a linha inteira (`{...row, ...}`) e `taskTypes.$inferSelect`/`.returning()` já incluem as novas colunas automaticamente.

- [ ] **Step 6: Rodar o typecheck e confirmar a lista de erros esperada**

Run: `npm run typecheck`
Expected: FAIL — erros em `create-fake-task-type-repository.ts` (falta `isBug` no objeto retornado por `create`) e em todo arquivo de teste que constrói um `CreateTaskData`/chama `repository.seed(...)` sem `parentTaskId`.

- [ ] **Step 7: Atualizar o fake de `TaskTypeRepository`**

Reescrever `src/application/task/use-cases/test-helpers/create-fake-task-type-repository.ts`:

```ts
import type { TaskTypeRepository } from "@/application/task/ports/task-type-repository";
import type { TaskType } from "@/domain/task/entities/task-type";

export type FakeTaskTypeRepository = TaskTypeRepository & {
	seedType(data: {
		name: string;
		color: string;
		isBug: boolean;
	}): Promise<TaskType>;
};

export function createFakeTaskTypeRepository(): FakeTaskTypeRepository {
	let taskTypes: TaskType[] = [];
	let nextId = 1;

	return {
		async create(name, color) {
			const taskType: TaskType = {
				id: `task-type-${nextId++}`,
				name,
				color,
				isBug: false,
			};
			taskTypes.push(taskType);
			return taskType;
		},
		async seedType(data) {
			const taskType: TaskType = { id: `task-type-${nextId++}`, ...data };
			taskTypes.push(taskType);
			return taskType;
		},
		async update(typeId, name, color) {
			const taskType = taskTypes.find((t) => t.id === typeId);
			if (!taskType) {
				throw new Error("Tipo de task não encontrado");
			}
			taskType.name = name;
			taskType.color = color;
			return taskType;
		},
		async delete(typeId) {
			taskTypes = taskTypes.filter((t) => t.id !== typeId);
		},
		async listAll() {
			return taskTypes;
		},
		async findById(typeId) {
			return taskTypes.find((t) => t.id === typeId) ?? null;
		},
	};
}
```

- [ ] **Step 8: Adicionar `parentTaskId: null,` às fixtures de teste existentes**

Em cada arquivo abaixo, adicionar a linha `parentTaskId: null,` junto de `assigneeId: null,` (mesmo objeto, mesma indentação):

- `src/application/task/use-cases/create-task.test.ts` — no `baseInput` (1 ocorrência).
- `src/application/task/use-cases/create-historical-task.test.ts` — no `baseInput` (1 ocorrência).
- `src/application/task/use-cases/delete-task-type.test.ts` — no objeto passado a `taskRepository.seed({...})` (1 ocorrência).
- `src/application/task/use-cases/delete-task.test.ts` — nos dois objetos passados a `repository.seed({...})` (2 ocorrências).
- `src/application/task/use-cases/list-task-types.test.ts` — nos dois objetos passados a `taskRepository.seed({...})` (2 ocorrências).
- `src/application/task/use-cases/list-tasks-by-team.test.ts` — no `baseData` (1 ocorrência).
- `src/application/task/use-cases/move-task.test.ts` — no `baseData` (1 ocorrência).
- `src/application/task/use-cases/toggle-blocked.test.ts` — no `baseData` (1 ocorrência).
- `src/application/task/use-cases/update-task.test.ts` — nos dois objetos passados a `repository.seed({...})` dentro de `setup()`/no teste de id duplicado (2 ocorrências). **Não** mexer ainda nos objetos passados como `UpdateTaskInput` para `updateTask(...)` — isso é escopo da Task 3.
- `src/infrastructure/task/drizzle-task-repository.test.ts` — na função `baseData(...)` (1 ocorrência).

- [ ] **Step 9: Rodar typecheck e a suíte de testes**

Run: `npm run typecheck && npm test`
Expected: PASS em ambos, sem nenhum teste novo ainda — só a fundação de tipos/dados widenizada sem quebrar nada existente.

- [ ] **Step 10: Commit**

```bash
git add src/infrastructure/task/drizzle/schema.ts src/infrastructure/task/drizzle/seed-task-types.ts src/domain/task/entities/task-type.ts src/domain/task/entities/task.ts src/application/task/ports/task-repository.ts src/application/task/use-cases/test-helpers/create-fake-task-type-repository.ts src/application/task/use-cases/create-task.test.ts src/application/task/use-cases/create-historical-task.test.ts src/application/task/use-cases/delete-task-type.test.ts src/application/task/use-cases/delete-task.test.ts src/application/task/use-cases/list-task-types.test.ts src/application/task/use-cases/list-tasks-by-team.test.ts src/application/task/use-cases/move-task.test.ts src/application/task/use-cases/toggle-blocked.test.ts src/application/task/use-cases/update-task.test.ts src/infrastructure/task/drizzle-task-repository.test.ts drizzle/migrations
git commit -m "feat(tarefas)!: adiciona isBug e parentTaskId ao schema de tasks"
```

---

### Task 2: Vínculo na criação de tasks

**Files:**
- Modify: `src/application/task/validate-task-references.ts`
- Modify: `src/application/task/use-cases/create-task.ts`
- Modify: `src/application/task/use-cases/create-historical-task.ts`
- Test: `src/application/task/use-cases/create-task.test.ts`

**Interfaces:**
- Consumes: `TaskRepository.findById(taskId): Promise<Task | null>` (Task 1), `CreateTaskData.parentTaskId` (Task 1).
- Produces: `CreateTaskInput.parentTaskId: string | null`; `validateTaskReferences(...)` agora exige `parentTaskId` no objeto de input.

- [ ] **Step 1: Escrever os testes que falham**

Em `src/application/task/use-cases/create-task.test.ts`, adicionar `parentTaskId: null,` ao `baseInput` (se ainda não feito na Task 1) e adicionar estes três testes ao final de `describe("createTask", ...)`, antes do `});` final:

```ts
	it("salva a task de origem quando informada", async () => {
		const { repository, typeRepository, teamAccess, input } = await setup();
		const parent = await repository.seed({
			...input,
			externalId: "TASK-PAI",
		});
		const task = await createTask(repository, typeRepository, teamAccess, {
			...input,
			externalId: "TASK-FILHO",
			parentTaskId: parent.id,
		});
		expect(task.parentTaskId).toBe(parent.id);
	});

	it("rejeita task de origem inexistente", async () => {
		const { repository, typeRepository, teamAccess, input } = await setup();
		await expect(
			createTask(repository, typeRepository, teamAccess, {
				...input,
				parentTaskId: "missing",
			}),
		).rejects.toThrow("Task de origem não encontrada");
	});

	it("rejeita task de origem de outro time", async () => {
		const { repository, typeRepository, teamAccess, input } = await setup();
		const parent = await repository.seed({
			...input,
			externalId: "TASK-PAI",
			teamId: "team-2",
		});
		await expect(
			createTask(repository, typeRepository, teamAccess, {
				...input,
				parentTaskId: parent.id,
			}),
		).rejects.toThrow("Task de origem não encontrada");
	});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npx vitest run src/application/task/use-cases/create-task.test.ts`
Expected: FAIL nos 3 testes novos — `parentTaskId` não existe em `CreateTaskInput`/não é validado ainda (erro de tipo ou teste retornando sem lançar).

- [ ] **Step 3: Adicionar a validação em `validate-task-references.ts`**

```ts
import { ApplicationError } from "@/application/shared/application-error";
import { parseDateOnly } from "@/application/shared/validation";
import type { TaskRepository } from "@/application/task/ports/task-repository";
import type { TaskTypeRepository } from "@/application/task/ports/task-type-repository";
import type { TeamAccess } from "@/application/team/contracts/team-access";

export async function validateTaskReferences(
	repository: TaskRepository,
	typeRepository: TaskTypeRepository,
	teamAccess: TeamAccess,
	input: {
		teamId: string;
		typeId: string;
		assigneeId: string | null;
		dueDate: string;
		externalId: string;
		parentTaskId: string | null;
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
	if (input.parentTaskId) {
		const parentTask = await repository.findById(input.parentTaskId);
		if (!parentTask || parentTask.teamId !== input.teamId) {
			throw new ApplicationError("Task de origem não encontrada");
		}
	}
	const existing = await repository.findByExternalId(
		input.teamId,
		input.externalId,
	);
	if (existing) {
		throw new ApplicationError(
			`Já existe uma task com o id externo "${input.externalId}" neste time`,
		);
	}
}
```

- [ ] **Step 4: Atualizar `create-task.ts`**

```ts
export type CreateTaskInput = {
	externalId: string;
	description: string;
	typeId: string;
	assigneeId: string | null;
	teamId: string;
	status: TaskStatus;
	dueDate: string;
	parentTaskId: string | null;
};

export async function createTask(
	repository: TaskRepository,
	typeRepository: TaskTypeRepository,
	teamAccess: TeamAccess,
	input: CreateTaskInput,
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
	return repository.createWithInitialHistory({
		externalId,
		description,
		typeId: input.typeId,
		assigneeId: input.assigneeId,
		teamId: input.teamId,
		status: input.status,
		dueDate: input.dueDate,
		parentTaskId: input.parentTaskId,
	});
}
```

- [ ] **Step 5: Atualizar `create-historical-task.ts`**

Trocar as duas chamadas que constroem objetos de dados, adicionando `parentTaskId: null` (a entrada retroativa não expõe esse campo — está fora do escopo desta feature):

```ts
	await validateTaskReferences(repository, typeRepository, teamAccess, {
		teamId: input.teamId,
		typeId: input.typeId,
		assigneeId: input.assigneeId,
		dueDate: input.dueDate,
		externalId,
		parentTaskId: null,
	});
	return repository.createWithExplicitHistory(
		{
			externalId,
			description,
			typeId: input.typeId,
			assigneeId: input.assigneeId,
			teamId: input.teamId,
			status: steps[steps.length - 1].status,
			dueDate: input.dueDate,
			parentTaskId: null,
		},
		steps,
	);
```

- [ ] **Step 6: Rodar os testes e confirmar que passam**

Run: `npx vitest run src/application/task/use-cases/create-task.test.ts src/application/task/use-cases/create-historical-task.test.ts`
Expected: PASS em todos.

- [ ] **Step 7: Typecheck completo**

Run: `npm run typecheck`
Expected: FAIL — `src/app/board/actions.ts` não compila mais, porque `CreateTaskInput` (via `CreateTaskActionInput`) agora exige `parentTaskId` e `createTaskAction` ainda não o envia. Corrigir com um shim temporário (será substituído por validação real na Task 6): em `src/app/board/actions.ts`, dentro de `createTaskAction`, alterar

```ts
		await createTaskUseCases().createTask({ ...input, teamId });
```

para

```ts
		await createTaskUseCases().createTask({
			...input,
			teamId,
			parentTaskId: null,
		});
```

(Este trecho será substituído por validação real na Task 6.)

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/application/task/validate-task-references.ts src/application/task/use-cases/create-task.ts src/application/task/use-cases/create-historical-task.ts src/application/task/use-cases/create-task.test.ts src/app/board/actions.ts
git commit -m "feat(tarefas)!: valida a task de origem ao criar uma task"
```

---

### Task 3: Vínculo na edição de tasks

**Files:**
- Modify: `src/application/task/use-cases/update-task.ts`
- Test: `src/application/task/use-cases/update-task.test.ts`

**Interfaces:**
- Consumes: `TaskRepository.findById` (Task 1).
- Produces: `UpdateTaskInput.parentTaskId: string | null`.

- [ ] **Step 1: Escrever os testes que falham**

Em `src/application/task/use-cases/update-task.test.ts`, adicionar `parentTaskId: null,` a todo objeto passado como último argumento de `updateTask(...)` nos testes já existentes (o teste "atualiza os campos editáveis", o de "id externo duplicado" e as 5 linhas do `it.each`). Em seguida, adicionar estes três testes ao final de `describe("updateTask", ...)`:

```ts
	it("vincula a uma task de origem do mesmo time", async () => {
		const { repository, typeRepository, teamAccess, task, type } =
			await setup();
		const parent = await repository.seed({
			externalId: "TASK-PAI",
			description: "Origem",
			typeId: type.id,
			assigneeId: null,
			teamId: "team-1",
			status: "TODO",
			dueDate: "2026-07-01",
			parentTaskId: null,
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
				parentTaskId: parent.id,
			},
		);
		expect(updated.parentTaskId).toBe(parent.id);
	});

	it("rejeita se tornar origem dela mesma", async () => {
		const { repository, typeRepository, teamAccess, task, type } =
			await setup();
		await expect(
			updateTask(repository, typeRepository, teamAccess, "team-1", task.id, {
				externalId: task.externalId,
				description: task.description,
				typeId: type.id,
				assigneeId: null,
				dueDate: "2026-07-01",
				parentTaskId: task.id,
			}),
		).rejects.toThrow("Uma task não pode ser origem dela mesma");
	});

	it("rejeita task de origem inexistente", async () => {
		const { repository, typeRepository, teamAccess, task, type } =
			await setup();
		await expect(
			updateTask(repository, typeRepository, teamAccess, "team-1", task.id, {
				externalId: task.externalId,
				description: task.description,
				typeId: type.id,
				assigneeId: null,
				dueDate: "2026-07-01",
				parentTaskId: "missing",
			}),
		).rejects.toThrow("Task de origem não encontrada");
	});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npx vitest run src/application/task/use-cases/update-task.test.ts`
Expected: FAIL — `parentTaskId` ainda não existe em `UpdateTaskInput` nem é validado.

- [ ] **Step 3: Implementar em `update-task.ts`**

```ts
import { ApplicationError } from "@/application/shared/application-error";
import { parseDateOnly } from "@/application/shared/validation";
import type { TaskRepository } from "@/application/task/ports/task-repository";
import type { TaskTypeRepository } from "@/application/task/ports/task-type-repository";
import type { TeamAccess } from "@/application/team/contracts/team-access";

export type UpdateTaskInput = {
	externalId: string;
	description: string;
	typeId: string;
	assigneeId: string | null;
	dueDate: string;
	parentTaskId: string | null;
};

export async function updateTask(
	repository: TaskRepository,
	typeRepository: TaskTypeRepository,
	teamAccess: TeamAccess,
	teamId: string,
	taskId: string,
	input: UpdateTaskInput,
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
	});
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npx vitest run src/application/task/use-cases/update-task.test.ts`
Expected: PASS em todos.

- [ ] **Step 5: Confirmar que `updateTaskAction` continua compilando**

`updateTaskAction` já repassa o `input: UpdateTaskInput` inteiro para `createTaskUseCases().updateTask(teamId, taskId, input)` sem reconstruir o objeto — nenhuma mudança de código é necessária aqui. `validateInput` (que faz `asserts input is UpdateTaskInput`) ainda não checa o formato de `parentTaskId` — isso é adicionado na Task 6; por ora ele só precisa compilar.

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/application/task/use-cases/update-task.ts src/application/task/use-cases/update-task.test.ts
git commit -m "feat(tarefas)!: valida a task de origem ao editar uma task"
```

---

### Task 4: Proteger o tipo Bug contra exclusão

**Files:**
- Modify: `src/application/task/use-cases/delete-task-type.ts`
- Test: `src/application/task/use-cases/delete-task-type.test.ts`

**Interfaces:**
- Consumes: `TaskTypeRepository.findById` (existente), `FakeTaskTypeRepository.seedType` (Task 1).
- Produces: nenhuma interface nova — só a regra de negócio.

- [ ] **Step 1: Escrever o teste que falha**

Adicionar ao final de `describe("deleteTaskType", ...)` em `src/application/task/use-cases/delete-task-type.test.ts`:

```ts
	it("rejeita excluir o tipo Bug mesmo sem uso", async () => {
		const taskTypeRepository = createFakeTaskTypeRepository();
		const taskRepository = createFakeTaskRepository();
		const bugType = await taskTypeRepository.seedType({
			name: "Bug",
			color: "#dc2626",
			isBug: true,
		});
		await expect(
			deleteTaskType(taskTypeRepository, taskRepository, bugType.id),
		).rejects.toThrow("O tipo Bug não pode ser excluído");
	});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest run src/application/task/use-cases/delete-task-type.test.ts`
Expected: FAIL — hoje nada bloqueia a exclusão de um tipo `isBug` sem uso.

- [ ] **Step 3: Implementar em `delete-task-type.ts`**

```ts
import type { TaskRepository } from "@/application/task/ports/task-repository";
import type { TaskTypeRepository } from "@/application/task/ports/task-type-repository";

export async function deleteTaskType(
	taskTypeRepository: TaskTypeRepository,
	taskRepository: TaskRepository,
	typeId: string,
) {
	const taskType = await taskTypeRepository.findById(typeId);
	if (taskType?.isBug) {
		throw new Error("O tipo Bug não pode ser excluído");
	}
	const tasksUsingType = await taskRepository.countByType(typeId);
	if (tasksUsingType > 0) {
		throw new Error(
			"Não é possível excluir um tipo de task que está em uso por tasks",
		);
	}
	await taskTypeRepository.delete(typeId);
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npx vitest run src/application/task/use-cases/delete-task-type.test.ts`
Expected: PASS em todos (incluindo os 2 testes já existentes).

- [ ] **Step 5: Commit**

```bash
git add src/application/task/use-cases/delete-task-type.ts src/application/task/use-cases/delete-task-type.test.ts
git commit -m "fix(tasktypes)!: bloqueia exclusao do tipo Bug"
```

---

### Task 5: Contagem de filhos no board (`listTasksByTeam`)

**Files:**
- Modify: `src/application/task/use-cases/list-tasks-by-team.ts`
- Modify: `src/composition/task.ts`
- Test: `src/application/task/use-cases/list-tasks-by-team.test.ts`

**Interfaces:**
- Consumes: `TaskTypeRepository.listAll()` (existente), `TaskRepository.listByTeam()` (existente).
- Produces: `TaskWithStatusSince = Task & { statusChangedAt: Date; bugChildCount: number; otherChildCount: number; parentTask: { id: string; externalId: string } | null }`. Consumida pela Task 7 (`task-card.tsx`) e pela Task 6 (`kanban-board.tsx`).

- [ ] **Step 1: Escrever o teste que falha**

Adicionar ao final de `describe("listTasksByTeam", ...)` em `src/application/task/use-cases/list-tasks-by-team.test.ts`:

```ts
	it("calcula bugChildCount, otherChildCount e parentTask", async () => {
		const repository = createFakeTaskRepository();
		const historyRepository = createFakeTaskHistoryRepository();
		const typeRepository = createFakeTaskTypeRepository();
		const bugType = await typeRepository.seedType({
			name: "Bug",
			color: "#dc2626",
			isBug: true,
		});
		const otherType = await typeRepository.seedType({
			name: "Tarefa Técnica",
			color: "#64748b",
			isBug: false,
		});
		const parent = await repository.seed({
			...baseData,
			typeId: otherType.id,
			externalId: "TASK-PAI",
			status: "TODO",
		});
		await repository.seed({
			...baseData,
			typeId: bugType.id,
			externalId: "TASK-BUG-1",
			status: "TODO",
			parentTaskId: parent.id,
		});
		await repository.seed({
			...baseData,
			typeId: bugType.id,
			externalId: "TASK-BUG-2",
			status: "TODO",
			parentTaskId: parent.id,
		});
		await repository.seed({
			...baseData,
			typeId: otherType.id,
			externalId: "TASK-OUTRA",
			status: "TODO",
			parentTaskId: parent.id,
		});

		const result = await listTasksByTeam(
			repository,
			historyRepository,
			typeRepository,
			"team-1",
		);

		const parentResult = result.TODO.find((t) => t.externalId === "TASK-PAI");
		expect(parentResult?.bugChildCount).toBe(2);
		expect(parentResult?.otherChildCount).toBe(1);
		expect(parentResult?.parentTask).toBeNull();

		const childResult = result.TODO.find((t) => t.externalId === "TASK-BUG-1");
		expect(childResult?.parentTask).toEqual({
			id: parent.id,
			externalId: "TASK-PAI",
		});
		expect(childResult?.bugChildCount).toBe(0);
		expect(childResult?.otherChildCount).toBe(0);
	});
```

No topo do arquivo, importar `createFakeTaskTypeRepository`:

```ts
import { createFakeTaskTypeRepository } from "./test-helpers/create-fake-task-type-repository";
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest run src/application/task/use-cases/list-tasks-by-team.test.ts`
Expected: FAIL — `listTasksByTeam` ainda não recebe `typeRepository` nem calcula os campos novos (erro de tipo: função espera 3 argumentos, recebeu 4).

- [ ] **Step 3: Implementar em `list-tasks-by-team.ts`**

```ts
import type { TaskHistoryRepository } from "@/application/task/ports/task-history-repository";
import type { TaskRepository } from "@/application/task/ports/task-repository";
import type { TaskTypeRepository } from "@/application/task/ports/task-type-repository";
import type { Task, TaskStatus } from "@/domain/task/entities/task";

export type TaskWithStatusSince = Task & {
	statusChangedAt: Date;
	bugChildCount: number;
	otherChildCount: number;
	parentTask: { id: string; externalId: string } | null;
};
export type TasksByStatus = Record<TaskStatus, TaskWithStatusSince[]>;

export async function listTasksByTeam(
	repository: TaskRepository,
	historyRepository: TaskHistoryRepository,
	typeRepository: TaskTypeRepository,
	teamId: string,
): Promise<TasksByStatus> {
	const tasks = await repository.listByTeam(teamId);
	const changedAtByTaskId = await historyRepository.getStatusChangedAtForTasks(
		tasks.map((task) => task.id),
	);
	const taskTypes = await typeRepository.listAll();
	const bugTypeIds = new Set(
		taskTypes.filter((type) => type.isBug).map((type) => type.id),
	);
	const tasksById = new Map(tasks.map((task) => [task.id, task]));
	const childrenByParentId = new Map<string, Task[]>();
	for (const task of tasks) {
		if (!task.parentTaskId) continue;
		const children = childrenByParentId.get(task.parentTaskId) ?? [];
		children.push(task);
		childrenByParentId.set(task.parentTaskId, children);
	}

	const grouped: TasksByStatus = {
		TODO: [],
		IN_DEVELOPMENT: [],
		CODE_REVIEW: [],
		TESTING: [],
		AWAITING_PUBLICATION: [],
		DONE: [],
	};
	for (const task of tasks) {
		const children = childrenByParentId.get(task.id) ?? [];
		const bugChildCount = children.filter((child) =>
			bugTypeIds.has(child.typeId),
		).length;
		const parent = task.parentTaskId
			? tasksById.get(task.parentTaskId)
			: undefined;
		grouped[task.status].push({
			...task,
			statusChangedAt: changedAtByTaskId[task.id] ?? task.createdAt,
			bugChildCount,
			otherChildCount: children.length - bugChildCount,
			parentTask: parent
				? { id: parent.id, externalId: parent.externalId }
				: null,
		});
	}
	return grouped;
}
```

- [ ] **Step 4: Atualizar a composição**

Em `src/composition/task.ts`, importar `drizzleTaskTypeRepository` (já importado nesse arquivo) e alterar a chamada:

```ts
		listTasksByTeam: (teamId: string) =>
			listTasksByTeam(
				drizzleTaskRepository,
				drizzleTaskHistoryRepository,
				drizzleTaskTypeRepository,
				teamId,
			),
```

- [ ] **Step 5: Rodar os testes e confirmar que passam**

Run: `npx vitest run src/application/task/use-cases/list-tasks-by-team.test.ts`
Expected: PASS em todos (5 testes existentes + 1 novo).

Run: `npm run typecheck`
Expected: PASS (nenhum outro chamador direto de `listTasksByTeam` existe fora de `composition/task.ts`).

- [ ] **Step 6: Commit**

```bash
git add src/application/task/use-cases/list-tasks-by-team.ts src/application/task/use-cases/list-tasks-by-team.test.ts src/composition/task.ts
git commit -m "feat(tarefas)!: calcula contagem de bugs e vinculos por task"
```

---

### Task 6: Campo "Task de origem" no formulário

**Files:**
- Modify: `src/app/board/actions.ts`
- Modify: `src/presentation/task/task-form-modal.tsx`
- Modify: `src/presentation/task/kanban-board.tsx`
- Modify: `src/presentation/task/task-card.tsx` (só para repassar a nova prop — os badges vêm na Task 7)
- Test: `tests/integration/kanban-board.spec.ts`

**Interfaces:**
- Produces: `TeamTaskOption = { id: string; externalId: string; description: string }` (exportado de `task-form-modal.tsx`), prop `teamTasks: TeamTaskOption[]` em `TaskFormModal` e `TaskCard`.

- [ ] **Step 1: Escrever o teste e2e que falha**

Adicionar ao final de `tests/integration/kanban-board.spec.ts`:

```ts
test("vincula uma task a uma task de origem pelo formulário", async ({
	page,
}) => {
	await page.getByRole("button", { name: "Task" }).click();
	await page.getByLabel("Id externo").fill("TASK-ORIGEM");
	await page.getByLabel("Descrição").fill("História original");
	await page.getByLabel("Data prevista de entrega").fill("2026-12-31");
	await page.getByRole("button", { name: "Salvar" }).click();
	await expect(
		page.getByTestId("column-TODO").getByText("TASK-ORIGEM"),
	).toBeVisible();

	await page.getByRole("button", { name: "Task", exact: true }).click();
	await page.getByLabel("Id externo").fill("TASK-BUG-1");
	await page.getByLabel("Descrição").fill("Bug encontrado na história");
	await page.getByLabel("Tipo").selectOption({ label: "Bug" });
	await page
		.getByLabel("Task de origem (opcional)")
		.selectOption({ label: "TASK-ORIGEM — História original" });
	await page.getByLabel("Data prevista de entrega").fill("2026-12-31");
	await page.getByRole("button", { name: "Salvar" }).click();

	await expect(
		page.getByTestId("column-TODO").getByText("TASK-BUG-1"),
	).toBeVisible();
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx playwright test kanban-board.spec.ts -g "vincula uma task a uma task de origem"`
Expected: FAIL — o label "Task de origem (opcional)" ainda não existe no formulário.

- [ ] **Step 3: Validar `parentTaskId` no Server Action**

Em `src/app/board/actions.ts`, na função `validateInput`, adicionar a checagem (após a validação de `dueDate`, antes do fechamento da função):

```ts
function validateInput(input: unknown): asserts input is UpdateTaskInput {
	if (!input || typeof input !== "object")
		throw new ApplicationError("Dados da task inválidos");
	const value = input as Partial<UpdateTaskInput>;
	if (
		typeof value.externalId !== "string" ||
		typeof value.description !== "string"
	)
		throw new ApplicationError("Dados da task inválidos");
	validateUuid(value.typeId, "Tipo de task inválido");
	if (value.assigneeId !== null)
		validateUuid(value.assigneeId, "Responsável inválido");
	if (typeof value.dueDate !== "string" || !value.dueDate)
		throw new ApplicationError("Data prevista é obrigatória");
	if (!parseDateOnly(value.dueDate))
		throw new ApplicationError("Data prevista inválida");
	if (value.parentTaskId !== null)
		validateUuid(value.parentTaskId, "Task de origem inválida");
}
```

Remover o ajuste temporário da Task 2 em `createTaskAction` (voltar a usar `input` diretamente, já que agora `input.parentTaskId` vem validado do formulário):

```ts
export async function createTaskAction(input: CreateTaskActionInput) {
	return runTaskAction(async () => {
		validateInput(input);
		if (!isTaskStatus(input.status))
			throw new ApplicationError("Status inválido");
		const teamId = await getCurrentTeamId();
		await createTaskUseCases().createTask({ ...input, teamId });
	});
}
```

- [ ] **Step 4: Adicionar o campo no formulário**

Em `src/presentation/task/task-form-modal.tsx`, exportar o tipo de opção logo após os imports:

```ts
export type TeamTaskOption = {
	id: string;
	externalId: string;
	description: string;
};
```

Adicionar `teamTasks: TeamTaskOption[];` em ambos os ramos de `TaskFormModalProps` (`mode: "create"` e `mode: "edit"`), junto de `taskTypes`/`members`.

Em `handleSubmit`, ler o novo campo e incluí-lo nos dois `result = await ...`:

```ts
		const dueDate = String(formData.get("dueDate") ?? "");
		const parentTaskIdValue = String(formData.get("parentTaskId") ?? "");
		const parentTaskId = parentTaskIdValue === "" ? null : parentTaskIdValue;

		setPending(true);
		setError(null);
		try {
			let result: ActionState;
			if (props.mode === "create") {
				const status = String(formData.get("status") ?? "TODO") as TaskStatus;
				result = await props.createTaskAction({
					externalId,
					description,
					typeId,
					assigneeId,
					dueDate,
					status,
					parentTaskId,
				});
			} else {
				result = await props.updateTaskAction(props.task.id, {
					externalId,
					description,
					typeId,
					assigneeId,
					dueDate,
					parentTaskId,
				});
			}
```

Adicionar o campo de select no JSX, logo após o bloco `dueDate`/`status` (antes do checkbox "Bloqueado"):

```tsx
						<div className="flex flex-col gap-2">
							<label htmlFor="parentTaskId" className="text-sm opacity-70">
								Task de origem (opcional)
							</label>
							<select
								id="parentTaskId"
								name="parentTaskId"
								defaultValue={
									isEdit ? (props.task.parentTaskId ?? "") : ""
								}
								className="rounded-lg border border-(--border) px-3 py-2"
							>
								<option value="">Nenhuma</option>
								{props.teamTasks
									.filter((teamTask) => !isEdit || teamTask.id !== props.task.id)
									.map((teamTask) => (
										<option key={teamTask.id} value={teamTask.id}>
											{teamTask.externalId} — {teamTask.description}
										</option>
									))}
							</select>
						</div>
```

- [ ] **Step 5: Repassar `teamTasks` em `kanban-board.tsx` e `task-card.tsx`**

Em `src/presentation/task/kanban-board.tsx`, calcular a lista logo após `membersById`:

```ts
	const teamTasks = Object.values(tasksByStatus)
		.flat()
		.map((task) => ({
			id: task.id,
			externalId: task.externalId,
			description: task.description,
		}))
		.sort((a, b) => a.externalId.localeCompare(b.externalId));
```

Passar `teamTasks={teamTasks}` para o `TaskFormModal` de criação e para cada `TaskCard`.

Em `src/presentation/task/task-card.tsx`, importar `type { TeamTaskOption } from "@/presentation/task/task-form-modal"`, adicionar `teamTasks: TeamTaskOption[];` em `TaskCardProps`, receber no destructuring e repassar `teamTasks={teamTasks}` para o `<TaskFormModal mode="edit" ...>` interno.

- [ ] **Step 6: Rodar o teste e confirmar que passa**

Run: `npx playwright test kanban-board.spec.ts -g "vincula uma task a uma task de origem"`
Expected: PASS.

- [ ] **Step 7: Rodar a suíte completa**

Run: `npm run typecheck && npm test && npm run test:e2e`
Expected: PASS em tudo.

- [ ] **Step 8: Commit**

```bash
git add src/app/board/actions.ts src/presentation/task/task-form-modal.tsx src/presentation/task/kanban-board.tsx src/presentation/task/task-card.tsx tests/integration/kanban-board.spec.ts
git commit -m "feat(quadro)!: adiciona campo de task de origem no formulario"
```

---

### Task 7: Badges de bugs/vínculos e linha de origem no card

**Files:**
- Modify: `src/presentation/task/task-card.tsx`
- Test: `tests/integration/kanban-board.spec.ts`

**Interfaces:**
- Consumes: `TaskWithStatusSince.bugChildCount`, `.otherChildCount`, `.parentTask` (Task 5).

- [ ] **Step 1: Escrever o teste e2e que falha**

Adicionar ao final de `tests/integration/kanban-board.spec.ts`:

```ts
test("mostra os badges de bugs e vínculos originados de uma task", async ({
	page,
}) => {
	await page.getByRole("button", { name: "Task" }).click();
	await page.getByLabel("Id externo").fill("TASK-PAI");
	await page.getByLabel("Descrição").fill("Tarefa que vai gerar bugs");
	await page.getByLabel("Tipo").selectOption({ label: "História" });
	await page.getByLabel("Data prevista de entrega").fill("2026-12-31");
	await page.getByRole("button", { name: "Salvar" }).click();

	await page.getByRole("button", { name: "Task", exact: true }).click();
	await page.getByLabel("Id externo").fill("TASK-FILHO-BUG");
	await page.getByLabel("Descrição").fill("Bug 1");
	await page.getByLabel("Tipo").selectOption({ label: "Bug" });
	await page
		.getByLabel("Task de origem (opcional)")
		.selectOption({ label: "TASK-PAI — Tarefa que vai gerar bugs" });
	await page.getByLabel("Data prevista de entrega").fill("2026-12-31");
	await page.getByRole("button", { name: "Salvar" }).click();

	await page.getByRole("button", { name: "Task", exact: true }).click();
	await page.getByLabel("Id externo").fill("TASK-FILHO-OUTRO");
	await page.getByLabel("Descrição").fill("Subtarefa técnica");
	await page.getByLabel("Tipo").selectOption({ label: "Tarefa Técnica" });
	await page
		.getByLabel("Task de origem (opcional)")
		.selectOption({ label: "TASK-PAI — Tarefa que vai gerar bugs" });
	await page.getByLabel("Data prevista de entrega").fill("2026-12-31");
	await page.getByRole("button", { name: "Salvar" }).click();

	const parentCard = page.getByTitle("História").filter({ hasText: "TASK-PAI" });
	await expect(parentCard.getByText("🐛 1")).toBeVisible();
	await expect(parentCard.getByText("🔗 1")).toBeVisible();

	const bugCard = page.getByTitle("Bug").filter({ hasText: "TASK-FILHO-BUG" });
	await expect(bugCard.getByText("Origem: #TASK-PAI")).toBeVisible();
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx playwright test kanban-board.spec.ts -g "mostra os badges"`
Expected: FAIL — os badges e a linha de origem ainda não existem no card.

- [ ] **Step 3: Implementar em `task-card.tsx`**

Adicionar, logo após o parágrafo de `Prazo:` e antes do bloco de `task.blocked`:

```tsx
				{task.parentTask ? (
					<p className="text-xs opacity-50">
						Origem: #{task.parentTask.externalId}
					</p>
				) : null}
				{task.bugChildCount > 0 || task.otherChildCount > 0 ? (
					<div className="flex gap-2 text-xs">
						{task.bugChildCount > 0 ? (
							<span title="Bugs originados desta task">
								🐛 {task.bugChildCount}
							</span>
						) : null}
						{task.otherChildCount > 0 ? (
							<span title="Outras tasks originadas desta task">
								🔗 {task.otherChildCount}
							</span>
						) : null}
					</div>
				) : null}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx playwright test kanban-board.spec.ts -g "mostra os badges"`
Expected: PASS.

- [ ] **Step 5: Rodar a suíte completa**

Run: `npm run typecheck && npm run test:e2e`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/presentation/task/task-card.tsx tests/integration/kanban-board.spec.ts
git commit -m "feat(quadro)!: mostra badges de bugs e origem no card"
```

---

### Task 8: Bloquear exclusão do tipo Bug na tela de tipos

**Files:**
- Modify: `src/presentation/task/task-type-list.tsx`
- Test: `tests/integration/task-types.spec.ts`

**Interfaces:**
- Consumes: `TaskTypeWithUsage.isBug` (herdado de `TaskType`, Task 1).

- [ ] **Step 1: Escrever o teste e2e que falha**

Adicionar ao final de `tests/integration/task-types.spec.ts`:

```ts
test("não permite excluir o tipo Bug mesmo sem uso", async ({ page }) => {
	const bugRow = page
		.locator("li")
		.filter({ has: page.locator('input[value="Bug"]') });
	await expect(
		bugRow.getByRole("button", { name: "Excluir tipo" }),
	).toBeDisabled();
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx playwright test task-types.spec.ts -g "não permite excluir o tipo Bug"`
Expected: FAIL — hoje o botão só é desabilitado quando o tipo está em uso; o seed "Bug" não tem nenhuma task usando ele neste teste.

- [ ] **Step 3: Implementar em `task-type-list.tsx`**

Alterar o `<form>` de exclusão:

```tsx
				<form action={deleteAction}>
					<SubmitButton
						aria-label="Excluir tipo"
						disabled={taskType.inUse || taskType.isBug}
						title={
							taskType.isBug
								? "O tipo Bug não pode ser excluído"
								: taskType.inUse
									? "Não é possível excluir: há tasks vinculadas a este tipo"
									: undefined
						}
						confirmMessage={`Excluir o tipo ${taskType.name}?`}
						className="rounded-lg border border-(--border) p-1.5 disabled:opacity-40"
					>
						<Trash2 size={14} aria-hidden="true" />
					</SubmitButton>
				</form>
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx playwright test task-types.spec.ts -g "não permite excluir o tipo Bug"`
Expected: PASS.

- [ ] **Step 5: Rodar a suíte completa e o lint**

Run: `npm run typecheck && npm run test:e2e && npm run lint`
Expected: PASS em tudo.

- [ ] **Step 6: Commit**

```bash
git add src/presentation/task/task-type-list.tsx tests/integration/task-types.spec.ts
git commit -m "fix(tasktypes)!: desabilita exclusao do tipo Bug na tela de tipos"
```
