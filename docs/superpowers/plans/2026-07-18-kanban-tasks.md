# Quadro Kanban e Tasks — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o sub-projeto 2 de 4 do Development Metrics — quadro Kanban, tasks e tipos de task — conforme [docs/superpowers/specs/2026-07-17-kanban-tasks-design.md](../specs/2026-07-17-kanban-tasks-design.md).

**Architecture:** Clean Architecture + DDD por bounded context (`task`), seguindo [techdocs/architecture.md](../../../techdocs/architecture.md): `domain` (entidades puras) → `application` (casos de uso + ports) ← `infrastructure` (Drizzle/Postgres) ← `composition` (factories) ← `presentation`/`app` (Server Components, Server Actions, um client component para o modal de task). O contexto `task` não importa entidades internas de `team`; a página `/board` compõe os dois contextos via seus respectivos composition roots.

**Tech Stack:** o mesmo já estabelecido pelo sub-projeto 1 — Next.js App Router, TypeScript estrito, Tailwind CSS v4, Drizzle ORM + Postgres, Vitest, Playwright, Biome, Knip. Nenhuma dependência nova é necessária.

## Global Constraints

- Alias de import `@/*` aponta para `./src/*`.
- Regra de dependência (Clean Architecture): `domain` não importa nada de fora; `application` só conhece `domain` e seus próprios `ports`; `infrastructure` implementa ports de `application` e nunca é importada por `presentation`; `presentation`/`app` só chamam casos de uso via `composition`. Ver [architecture.md](../../../techdocs/architecture.md).
- Contextos não importam entidades ou implementações internas uns dos outros. `Task.assigneeId` e `Task.typeId` (e, por extensão, `Task.teamId`) são ids simples, sem FK de banco cruzando para as tabelas de `team` — a integração com `team` acontece só em `app/board/page.tsx`, chamando os dois composition roots (`createTaskUseCases()` e `createTeamUseCases()`) e compondo os dados na borda.
- Nenhuma abstração especulativa: um port só existe porque uma implementação concreta real o consome nesta mesma spec.
- Arquivos em `kebab-case`; componentes React e tipos em `PascalCase`. Ver [guidelines.md](../../../techdocs/guidelines.md).
- Mensagens de commit devem seguir exatamente o formato validado pelo hook do projeto: `tipo(contexto)!: descrição` — contexto em letras minúsculas/números sem espaços, descrição em português, minúscula, verbo no presente, sem ponto final. Não incluir corpo nem rodapé na mensagem. Contexto usado neste plano: `kanban` (código de produto) e `banco` (schema/migração/seed).
- Movimentação de coluna é livre (sem restrição de transição); cada movimento grava uma entrada em `TaskStatusChange`; mover para a mesma coluna não gera entrada.
- Bloqueado é uma flag independente da coluna, alternável a qualquer status; ligar/desligar quando já está no mesmo estado é idempotente (não abre/fecha um novo período).
- `TaskType` é global (não por time); vem com 3 registros padrão (História, Tarefa Técnica, Bug); não pode ser excluído enquanto estiver em uso por alguma `Task`.
- `externalId` de uma `Task` é único por time (`teamId` + `externalId`); rejeitado na criação/edição quando duplicado.
- Testes: Vitest com fakes em memória para `domain`/`application`; Vitest contra Postgres real para `infrastructure`; Playwright para os fluxos críticos de `presentation`/`app`. Como este sub-projeto introduz múltiplos arquivos de teste de `infrastructure` que compartilham tabelas (`tasks`, `task_types`), a Task 9 desliga `fileParallelism` no Vitest para evitar truncagens concorrentes entre arquivos — o mesmo motivo pelo qual `playwright.config.ts` já usa `fullyParallel: false`.
- Banco local via `docker compose -f devops/docker-compose.yml up -d`, já configurado pelo sub-projeto 1.

---

### Task 1: Entidades de domínio de Task

**Files:**
- Create: `src/domain/task/entities/task.ts`
- Create: `src/domain/task/entities/task-type.ts`
- Create: `src/domain/task/entities/task-status-change.ts`
- Create: `src/domain/task/entities/task-blocked-period.ts`

**Interfaces:**
- Consumes: nada (primeira task do sub-projeto).
- Produces: tipos `TaskStatus`, `Task`, `TaskType`, `TaskStatusChange`, `TaskBlockedPeriod`, usados por todas as tasks seguintes.

- [ ] **Step 1: Criar a entidade `Task`**

`src/domain/task/entities/task.ts`:

```ts
export type TaskStatus = "TODO" | "IN_DEVELOPMENT" | "CODE_REVIEW" | "DONE";

export type Task = {
	id: string;
	externalId: string;
	description: string;
	typeId: string;
	assigneeId: string | null;
	teamId: string;
	status: TaskStatus;
	blocked: boolean;
	dueDate: string | null;
	createdAt: Date;
	updatedAt: Date;
};
```

- [ ] **Step 2: Criar a entidade `TaskType`**

`src/domain/task/entities/task-type.ts`:

```ts
export type TaskType = {
	id: string;
	name: string;
	color: string;
};
```

- [ ] **Step 3: Criar a entidade `TaskStatusChange`**

`src/domain/task/entities/task-status-change.ts`:

```ts
import type { TaskStatus } from "./task";

export type TaskStatusChange = {
	id: string;
	taskId: string;
	fromStatus: TaskStatus | null;
	toStatus: TaskStatus;
	changedAt: Date;
};
```

- [ ] **Step 4: Criar a entidade `TaskBlockedPeriod`**

`src/domain/task/entities/task-blocked-period.ts`:

```ts
export type TaskBlockedPeriod = {
	id: string;
	taskId: string;
	blockedAt: Date;
	unblockedAt: Date | null;
};
```

- [ ] **Step 5: Verificar tipos**

Run: `npm run typecheck`
Expected: sem erros.

- [ ] **Step 6: Commit**

```bash
git add src/domain/task/entities
git commit -m "feat(kanban)!: adiciona entidades de task"
```

---

### Task 2: Ports de Task e repositórios fake para testes

**Files:**
- Create: `src/application/task/ports/task-repository.ts`
- Create: `src/application/task/ports/task-history-repository.ts`
- Create: `src/application/task/ports/task-type-repository.ts`
- Create: `src/application/task/use-cases/test-helpers/create-fake-task-repository.ts`
- Create: `src/application/task/use-cases/test-helpers/create-fake-task-history-repository.ts`
- Create: `src/application/task/use-cases/test-helpers/create-fake-task-type-repository.ts`

**Interfaces:**
- Consumes: `Task`, `TaskStatus`, `TaskType`, `TaskStatusChange`, `TaskBlockedPeriod` (Task 1).
- Produces:
  - `TaskRepository` com `create`, `update`, `delete`, `findById`, `findByExternalId`, `listByTeam`, `updateStatus`, `updateBlocked`, `countByType`.
  - `TaskHistoryRepository` com `recordStatusChange`, `openBlockedPeriod`, `closeBlockedPeriod`.
  - `TaskTypeRepository` com `create`, `update`, `delete`, `listAll`, `findById`.
  - `createFakeTaskRepository()`, `createFakeTaskHistoryRepository()` (expõe `statusChanges`/`blockedPeriods` para inspeção em teste), `createFakeTaskTypeRepository()` — usados por todas as tasks de casos de uso (3–7).

- [ ] **Step 1: Criar o port `TaskRepository`**

`src/application/task/ports/task-repository.ts`:

```ts
import type { Task, TaskStatus } from "@/domain/task/entities/task";

export type CreateTaskData = {
	externalId: string;
	description: string;
	typeId: string;
	assigneeId: string | null;
	teamId: string;
	status: TaskStatus;
	dueDate: string | null;
};

export type UpdateTaskData = {
	externalId: string;
	description: string;
	typeId: string;
	assigneeId: string | null;
	dueDate: string | null;
};

export type TaskRepository = {
	create(data: CreateTaskData): Promise<Task>;
	update(taskId: string, data: UpdateTaskData): Promise<Task>;
	delete(taskId: string): Promise<void>;
	findById(taskId: string): Promise<Task | null>;
	findByExternalId(teamId: string, externalId: string): Promise<Task | null>;
	listByTeam(teamId: string): Promise<Task[]>;
	updateStatus(taskId: string, status: TaskStatus): Promise<Task>;
	updateBlocked(taskId: string, blocked: boolean): Promise<Task>;
	countByType(typeId: string): Promise<number>;
};
```

- [ ] **Step 2: Criar o port `TaskHistoryRepository`**

`src/application/task/ports/task-history-repository.ts`:

```ts
import type { TaskStatus } from "@/domain/task/entities/task";

export type TaskHistoryRepository = {
	recordStatusChange(
		taskId: string,
		fromStatus: TaskStatus | null,
		toStatus: TaskStatus,
	): Promise<void>;
	openBlockedPeriod(taskId: string): Promise<void>;
	closeBlockedPeriod(taskId: string): Promise<void>;
};
```

- [ ] **Step 3: Criar o port `TaskTypeRepository`**

`src/application/task/ports/task-type-repository.ts`:

```ts
import type { TaskType } from "@/domain/task/entities/task-type";

export type TaskTypeRepository = {
	create(name: string, color: string): Promise<TaskType>;
	update(typeId: string, name: string, color: string): Promise<TaskType>;
	delete(typeId: string): Promise<void>;
	listAll(): Promise<TaskType[]>;
	findById(typeId: string): Promise<TaskType | null>;
};
```

- [ ] **Step 4: Criar o repositório fake de Task**

`src/application/task/use-cases/test-helpers/create-fake-task-repository.ts`:

```ts
import type {
	CreateTaskData,
	TaskRepository,
	UpdateTaskData,
} from "@/application/task/ports/task-repository";
import type { Task, TaskStatus } from "@/domain/task/entities/task";

export function createFakeTaskRepository(): TaskRepository {
	let tasks: Task[] = [];
	let nextId = 1;

	return {
		async create(data: CreateTaskData) {
			const now = new Date();
			const task: Task = {
				id: `task-${nextId++}`,
				externalId: data.externalId,
				description: data.description,
				typeId: data.typeId,
				assigneeId: data.assigneeId,
				teamId: data.teamId,
				status: data.status,
				blocked: false,
				dueDate: data.dueDate,
				createdAt: now,
				updatedAt: now,
			};
			tasks.push(task);
			return task;
		},
		async update(taskId: string, data: UpdateTaskData) {
			const task = tasks.find((t) => t.id === taskId);
			if (!task) {
				throw new Error("Task não encontrada");
			}
			task.externalId = data.externalId;
			task.description = data.description;
			task.typeId = data.typeId;
			task.assigneeId = data.assigneeId;
			task.dueDate = data.dueDate;
			task.updatedAt = new Date();
			return task;
		},
		async delete(taskId: string) {
			tasks = tasks.filter((t) => t.id !== taskId);
		},
		async findById(taskId: string) {
			return tasks.find((t) => t.id === taskId) ?? null;
		},
		async findByExternalId(teamId: string, externalId: string) {
			return (
				tasks.find(
					(t) => t.teamId === teamId && t.externalId === externalId,
				) ?? null
			);
		},
		async listByTeam(teamId: string) {
			return tasks.filter((t) => t.teamId === teamId);
		},
		async updateStatus(taskId: string, status: TaskStatus) {
			const task = tasks.find((t) => t.id === taskId);
			if (!task) {
				throw new Error("Task não encontrada");
			}
			task.status = status;
			task.updatedAt = new Date();
			return task;
		},
		async updateBlocked(taskId: string, blocked: boolean) {
			const task = tasks.find((t) => t.id === taskId);
			if (!task) {
				throw new Error("Task não encontrada");
			}
			task.blocked = blocked;
			task.updatedAt = new Date();
			return task;
		},
		async countByType(typeId: string) {
			return tasks.filter((t) => t.typeId === typeId).length;
		},
	};
}
```

- [ ] **Step 5: Criar o repositório fake de histórico**

`src/application/task/use-cases/test-helpers/create-fake-task-history-repository.ts`:

```ts
import type { TaskHistoryRepository } from "@/application/task/ports/task-history-repository";
import type { TaskBlockedPeriod } from "@/domain/task/entities/task-blocked-period";
import type { TaskStatusChange } from "@/domain/task/entities/task-status-change";

export type FakeTaskHistoryRepository = TaskHistoryRepository & {
	statusChanges: TaskStatusChange[];
	blockedPeriods: TaskBlockedPeriod[];
};

export function createFakeTaskHistoryRepository(): FakeTaskHistoryRepository {
	const statusChanges: TaskStatusChange[] = [];
	const blockedPeriods: TaskBlockedPeriod[] = [];
	let nextId = 1;

	return {
		statusChanges,
		blockedPeriods,
		async recordStatusChange(taskId, fromStatus, toStatus) {
			statusChanges.push({
				id: `status-change-${nextId++}`,
				taskId,
				fromStatus,
				toStatus,
				changedAt: new Date(),
			});
		},
		async openBlockedPeriod(taskId) {
			blockedPeriods.push({
				id: `blocked-period-${nextId++}`,
				taskId,
				blockedAt: new Date(),
				unblockedAt: null,
			});
		},
		async closeBlockedPeriod(taskId) {
			const open = [...blockedPeriods]
				.reverse()
				.find((p) => p.taskId === taskId && p.unblockedAt === null);
			if (!open) {
				throw new Error("Não há período de bloqueio aberto para esta task");
			}
			open.unblockedAt = new Date();
		},
	};
}
```

- [ ] **Step 6: Criar o repositório fake de tipo de task**

`src/application/task/use-cases/test-helpers/create-fake-task-type-repository.ts`:

```ts
import type { TaskTypeRepository } from "@/application/task/ports/task-type-repository";
import type { TaskType } from "@/domain/task/entities/task-type";

export function createFakeTaskTypeRepository(): TaskTypeRepository {
	let taskTypes: TaskType[] = [];
	let nextId = 1;

	return {
		async create(name, color) {
			const taskType: TaskType = { id: `task-type-${nextId++}`, name, color };
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

- [ ] **Step 7: Verificar tipos**

Run: `npm run typecheck`
Expected: sem erros (os fakes só compilam se implementarem os ports corretamente).

- [ ] **Step 8: Commit**

```bash
git add src/application/task/ports src/application/task/use-cases/test-helpers
git commit -m "feat(kanban)!: adiciona ports de task e repositorios fake para testes"
```

---

### Task 3: Casos de uso de tipo de task

**Files:**
- Create: `src/application/task/use-cases/create-task-type.ts`
- Create: `src/application/task/use-cases/create-task-type.test.ts`
- Create: `src/application/task/use-cases/update-task-type.ts`
- Create: `src/application/task/use-cases/update-task-type.test.ts`
- Create: `src/application/task/use-cases/delete-task-type.ts`
- Create: `src/application/task/use-cases/delete-task-type.test.ts`
- Create: `src/application/task/use-cases/list-task-types.ts`
- Create: `src/application/task/use-cases/list-task-types.test.ts`

**Interfaces:**
- Consumes: `TaskTypeRepository`, `TaskRepository`, `createFakeTaskTypeRepository()`, `createFakeTaskRepository()` (Task 2).
- Produces:
  - `createTaskType(repository: TaskTypeRepository, name: string, color: string): Promise<TaskType>`
  - `updateTaskType(repository: TaskTypeRepository, typeId: string, name: string, color: string): Promise<TaskType>`
  - `deleteTaskType(taskTypeRepository: TaskTypeRepository, taskRepository: TaskRepository, typeId: string): Promise<void>` — lança erro se o tipo estiver em uso.
  - `listTaskTypes(taskTypeRepository: TaskTypeRepository, taskRepository: TaskRepository): Promise<TaskTypeWithUsage[]>` onde `TaskTypeWithUsage = TaskType & { inUse: boolean }` (exportado de `list-task-types.ts`) — usado pela tela `/task-types` (Task 15) para desabilitar o botão de excluir.

- [ ] **Step 1: Escrever os testes que falham**

`src/application/task/use-cases/create-task-type.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createFakeTaskTypeRepository } from "./test-helpers/create-fake-task-type-repository";
import { createTaskType } from "./create-task-type";

describe("createTaskType", () => {
	it("cria um tipo com nome e cor informados", async () => {
		const repository = createFakeTaskTypeRepository();
		const taskType = await createTaskType(repository, "Épico", "#2563eb");
		expect(taskType.name).toBe("Épico");
		expect(taskType.color).toBe("#2563eb");
	});

	it("rejeita nome vazio", async () => {
		const repository = createFakeTaskTypeRepository();
		await expect(createTaskType(repository, "  ", "#2563eb")).rejects.toThrow(
			"Nome do tipo não pode ser vazio",
		);
	});

	it("rejeita cor fora do formato hexadecimal", async () => {
		const repository = createFakeTaskTypeRepository();
		await expect(createTaskType(repository, "Épico", "azul")).rejects.toThrow(
			"Cor deve ser um hexadecimal válido, ex: #2563eb",
		);
	});
});
```

`src/application/task/use-cases/update-task-type.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createFakeTaskTypeRepository } from "./test-helpers/create-fake-task-type-repository";
import { updateTaskType } from "./update-task-type";

describe("updateTaskType", () => {
	it("atualiza nome e cor de um tipo existente", async () => {
		const repository = createFakeTaskTypeRepository();
		const taskType = await repository.create("Épico", "#2563eb");
		const updated = await updateTaskType(
			repository,
			taskType.id,
			"Épico Grande",
			"#64748b",
		);
		expect(updated.name).toBe("Épico Grande");
		expect(updated.color).toBe("#64748b");
	});

	it("rejeita cor fora do formato hexadecimal", async () => {
		const repository = createFakeTaskTypeRepository();
		const taskType = await repository.create("Épico", "#2563eb");
		await expect(
			updateTaskType(repository, taskType.id, "Épico", "azul"),
		).rejects.toThrow("Cor deve ser um hexadecimal válido, ex: #2563eb");
	});
});
```

`src/application/task/use-cases/delete-task-type.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createFakeTaskRepository } from "./test-helpers/create-fake-task-repository";
import { createFakeTaskTypeRepository } from "./test-helpers/create-fake-task-type-repository";
import { deleteTaskType } from "./delete-task-type";

describe("deleteTaskType", () => {
	it("remove um tipo que não está em uso", async () => {
		const taskTypeRepository = createFakeTaskTypeRepository();
		const taskRepository = createFakeTaskRepository();
		const taskType = await taskTypeRepository.create("Épico", "#2563eb");
		await deleteTaskType(taskTypeRepository, taskRepository, taskType.id);
		expect(await taskTypeRepository.findById(taskType.id)).toBeNull();
	});

	it("rejeita excluir um tipo em uso por uma task", async () => {
		const taskTypeRepository = createFakeTaskTypeRepository();
		const taskRepository = createFakeTaskRepository();
		const taskType = await taskTypeRepository.create("Bug", "#dc2626");
		await taskRepository.create({
			externalId: "TASK-1",
			description: "Corrigir bug",
			typeId: taskType.id,
			assigneeId: null,
			teamId: "team-1",
			status: "TODO",
			dueDate: null,
		});
		await expect(
			deleteTaskType(taskTypeRepository, taskRepository, taskType.id),
		).rejects.toThrow(
			"Não é possível excluir um tipo de task que está em uso por tasks",
		);
	});
});
```

`src/application/task/use-cases/list-task-types.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createFakeTaskRepository } from "./test-helpers/create-fake-task-repository";
import { createFakeTaskTypeRepository } from "./test-helpers/create-fake-task-type-repository";
import { listTaskTypes } from "./list-task-types";

describe("listTaskTypes", () => {
	it("lista os tipos marcando quais estão em uso", async () => {
		const taskTypeRepository = createFakeTaskTypeRepository();
		const taskRepository = createFakeTaskRepository();
		const bug = await taskTypeRepository.create("Bug", "#dc2626");
		const historia = await taskTypeRepository.create("História", "#2563eb");
		await taskRepository.create({
			externalId: "TASK-1",
			description: "Corrigir bug",
			typeId: bug.id,
			assigneeId: null,
			teamId: "team-1",
			status: "TODO",
			dueDate: null,
		});

		const result = await listTaskTypes(taskTypeRepository, taskRepository);

		expect(result.find((t) => t.id === bug.id)?.inUse).toBe(true);
		expect(result.find((t) => t.id === historia.id)?.inUse).toBe(false);
	});
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npm test`
Expected: FAIL — módulos `./create-task-type`, `./update-task-type`, `./delete-task-type`, `./list-task-types` não encontrados.

- [ ] **Step 3: Implementar os casos de uso**

`src/application/task/use-cases/create-task-type.ts`:

```ts
import type { TaskTypeRepository } from "@/application/task/ports/task-type-repository";

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

export async function createTaskType(
	repository: TaskTypeRepository,
	name: string,
	color: string,
) {
	const trimmedName = name.trim();
	if (!trimmedName) {
		throw new Error("Nome do tipo não pode ser vazio");
	}
	if (!HEX_COLOR_PATTERN.test(color)) {
		throw new Error("Cor deve ser um hexadecimal válido, ex: #2563eb");
	}
	return repository.create(trimmedName, color);
}
```

`src/application/task/use-cases/update-task-type.ts`:

```ts
import type { TaskTypeRepository } from "@/application/task/ports/task-type-repository";

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

export async function updateTaskType(
	repository: TaskTypeRepository,
	typeId: string,
	name: string,
	color: string,
) {
	const trimmedName = name.trim();
	if (!trimmedName) {
		throw new Error("Nome do tipo não pode ser vazio");
	}
	if (!HEX_COLOR_PATTERN.test(color)) {
		throw new Error("Cor deve ser um hexadecimal válido, ex: #2563eb");
	}
	return repository.update(typeId, trimmedName, color);
}
```

`src/application/task/use-cases/delete-task-type.ts`:

```ts
import type { TaskRepository } from "@/application/task/ports/task-repository";
import type { TaskTypeRepository } from "@/application/task/ports/task-type-repository";

export async function deleteTaskType(
	taskTypeRepository: TaskTypeRepository,
	taskRepository: TaskRepository,
	typeId: string,
) {
	const tasksUsingType = await taskRepository.countByType(typeId);
	if (tasksUsingType > 0) {
		throw new Error(
			"Não é possível excluir um tipo de task que está em uso por tasks",
		);
	}
	await taskTypeRepository.delete(typeId);
}
```

`src/application/task/use-cases/list-task-types.ts`:

```ts
import type { TaskRepository } from "@/application/task/ports/task-repository";
import type { TaskTypeRepository } from "@/application/task/ports/task-type-repository";
import type { TaskType } from "@/domain/task/entities/task-type";

export type TaskTypeWithUsage = TaskType & { inUse: boolean };

export async function listTaskTypes(
	taskTypeRepository: TaskTypeRepository,
	taskRepository: TaskRepository,
): Promise<TaskTypeWithUsage[]> {
	const taskTypes = await taskTypeRepository.listAll();
	return Promise.all(
		taskTypes.map(async (taskType) => ({
			...taskType,
			inUse: (await taskRepository.countByType(taskType.id)) > 0,
		})),
	);
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npm test`
Expected: PASS — 8 testes novos (3 + 2 + 2 + 1).

- [ ] **Step 5: Commit**

```bash
git add src/application/task/use-cases/create-task-type.ts src/application/task/use-cases/create-task-type.test.ts src/application/task/use-cases/update-task-type.ts src/application/task/use-cases/update-task-type.test.ts src/application/task/use-cases/delete-task-type.ts src/application/task/use-cases/delete-task-type.test.ts src/application/task/use-cases/list-task-types.ts src/application/task/use-cases/list-task-types.test.ts
git commit -m "feat(kanban)!: adiciona casos de uso de tipo de task"
```

---

### Task 4: Casos de uso de CRUD de task

**Files:**
- Create: `src/application/task/use-cases/create-task.ts`
- Create: `src/application/task/use-cases/create-task.test.ts`
- Create: `src/application/task/use-cases/update-task.ts`
- Create: `src/application/task/use-cases/update-task.test.ts`
- Create: `src/application/task/use-cases/delete-task.ts`
- Create: `src/application/task/use-cases/delete-task.test.ts`

**Interfaces:**
- Consumes: `TaskRepository`, `TaskHistoryRepository`, `createFakeTaskRepository()`, `createFakeTaskHistoryRepository()` (Task 2).
- Produces:
  - `CreateTaskInput` (exportado de `create-task.ts`) `= { externalId: string; description: string; typeId: string; assigneeId: string | null; teamId: string; status: TaskStatus; dueDate: string | null }`.
  - `createTask(repository: TaskRepository, historyRepository: TaskHistoryRepository, input: CreateTaskInput): Promise<Task>` — grava também o primeiro `TaskStatusChange` (`fromStatus: null`).
  - `UpdateTaskInput` (exportado de `update-task.ts`) `= { externalId: string; description: string; typeId: string; assigneeId: string | null; dueDate: string | null }`.
  - `updateTask(repository: TaskRepository, taskId: string, input: UpdateTaskInput): Promise<Task>`
  - `deleteTask(repository: TaskRepository, taskId: string): Promise<void>`

- [ ] **Step 1: Escrever os testes que falham**

`src/application/task/use-cases/create-task.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createFakeTaskHistoryRepository } from "./test-helpers/create-fake-task-history-repository";
import { createFakeTaskRepository } from "./test-helpers/create-fake-task-repository";
import { createTask } from "./create-task";

const baseInput = {
	externalId: "TASK-1",
	description: "Corrigir bug de login",
	typeId: "type-1",
	assigneeId: null,
	teamId: "team-1",
	status: "TODO" as const,
	dueDate: null,
};

describe("createTask", () => {
	it("cria a task e grava o status inicial no histórico", async () => {
		const repository = createFakeTaskRepository();
		const historyRepository = createFakeTaskHistoryRepository();
		const task = await createTask(repository, historyRepository, baseInput);

		expect(task.externalId).toBe("TASK-1");
		expect(task.blocked).toBe(false);
		expect(historyRepository.statusChanges).toEqual([
			expect.objectContaining({
				taskId: task.id,
				fromStatus: null,
				toStatus: "TODO",
			}),
		]);
	});

	it("rejeita id externo vazio", async () => {
		const repository = createFakeTaskRepository();
		const historyRepository = createFakeTaskHistoryRepository();
		await expect(
			createTask(repository, historyRepository, {
				...baseInput,
				externalId: "  ",
			}),
		).rejects.toThrow("Id externo não pode ser vazio");
	});

	it("rejeita descrição vazia", async () => {
		const repository = createFakeTaskRepository();
		const historyRepository = createFakeTaskHistoryRepository();
		await expect(
			createTask(repository, historyRepository, {
				...baseInput,
				description: " ",
			}),
		).rejects.toThrow("Descrição não pode ser vazia");
	});

	it("rejeita id externo duplicado no mesmo time", async () => {
		const repository = createFakeTaskRepository();
		const historyRepository = createFakeTaskHistoryRepository();
		await createTask(repository, historyRepository, baseInput);
		await expect(
			createTask(repository, historyRepository, baseInput),
		).rejects.toThrow('Já existe uma task com o id externo "TASK-1" neste time');
	});

	it("permite o mesmo id externo em times diferentes", async () => {
		const repository = createFakeTaskRepository();
		const historyRepository = createFakeTaskHistoryRepository();
		await createTask(repository, historyRepository, baseInput);
		const task = await createTask(repository, historyRepository, {
			...baseInput,
			teamId: "team-2",
		});
		expect(task.teamId).toBe("team-2");
	});
});
```

`src/application/task/use-cases/update-task.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createFakeTaskRepository } from "./test-helpers/create-fake-task-repository";
import { updateTask } from "./update-task";

const baseData = {
	externalId: "TASK-1",
	description: "Corrigir bug de login",
	typeId: "type-1",
	assigneeId: null,
	teamId: "team-1",
	status: "TODO" as const,
	dueDate: null,
};

describe("updateTask", () => {
	it("atualiza os campos editáveis", async () => {
		const repository = createFakeTaskRepository();
		const task = await repository.create(baseData);
		const updated = await updateTask(repository, task.id, {
			externalId: "TASK-1",
			description: "Corrigir bug de login (revisado)",
			typeId: "type-2",
			assigneeId: "member-1",
			dueDate: "2026-08-01",
		});
		expect(updated.description).toBe("Corrigir bug de login (revisado)");
		expect(updated.typeId).toBe("type-2");
		expect(updated.assigneeId).toBe("member-1");
		expect(updated.dueDate).toBe("2026-08-01");
	});

	it("rejeita id externo duplicado no mesmo time", async () => {
		const repository = createFakeTaskRepository();
		await repository.create(baseData);
		const other = await repository.create({ ...baseData, externalId: "TASK-2" });
		await expect(
			updateTask(repository, other.id, { ...baseData, externalId: "TASK-1" }),
		).rejects.toThrow('Já existe uma task com o id externo "TASK-1" neste time');
	});

	it("permite manter o próprio id externo ao editar", async () => {
		const repository = createFakeTaskRepository();
		const task = await repository.create(baseData);
		const updated = await updateTask(repository, task.id, baseData);
		expect(updated.externalId).toBe("TASK-1");
	});
});
```

`src/application/task/use-cases/delete-task.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createFakeTaskRepository } from "./test-helpers/create-fake-task-repository";
import { deleteTask } from "./delete-task";

describe("deleteTask", () => {
	it("remove a task do repositório", async () => {
		const repository = createFakeTaskRepository();
		const task = await repository.create({
			externalId: "TASK-1",
			description: "Corrigir bug",
			typeId: "type-1",
			assigneeId: null,
			teamId: "team-1",
			status: "TODO",
			dueDate: null,
		});
		await deleteTask(repository, task.id);
		expect(await repository.findById(task.id)).toBeNull();
	});
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npm test`
Expected: FAIL — módulos `./create-task`, `./update-task`, `./delete-task` não encontrados.

- [ ] **Step 3: Implementar os casos de uso**

`src/application/task/use-cases/create-task.ts`:

```ts
import type { TaskHistoryRepository } from "@/application/task/ports/task-history-repository";
import type { TaskRepository } from "@/application/task/ports/task-repository";
import type { TaskStatus } from "@/domain/task/entities/task";

export type CreateTaskInput = {
	externalId: string;
	description: string;
	typeId: string;
	assigneeId: string | null;
	teamId: string;
	status: TaskStatus;
	dueDate: string | null;
};

export async function createTask(
	repository: TaskRepository,
	historyRepository: TaskHistoryRepository,
	input: CreateTaskInput,
) {
	const externalId = input.externalId.trim();
	const description = input.description.trim();
	if (!externalId) {
		throw new Error("Id externo não pode ser vazio");
	}
	if (!description) {
		throw new Error("Descrição não pode ser vazia");
	}
	const existing = await repository.findByExternalId(input.teamId, externalId);
	if (existing) {
		throw new Error(
			`Já existe uma task com o id externo "${externalId}" neste time`,
		);
	}
	const task = await repository.create({
		externalId,
		description,
		typeId: input.typeId,
		assigneeId: input.assigneeId,
		teamId: input.teamId,
		status: input.status,
		dueDate: input.dueDate,
	});
	await historyRepository.recordStatusChange(task.id, null, task.status);
	return task;
}
```

`src/application/task/use-cases/update-task.ts`:

```ts
import type { TaskRepository } from "@/application/task/ports/task-repository";

export type UpdateTaskInput = {
	externalId: string;
	description: string;
	typeId: string;
	assigneeId: string | null;
	dueDate: string | null;
};

export async function updateTask(
	repository: TaskRepository,
	taskId: string,
	input: UpdateTaskInput,
) {
	const externalId = input.externalId.trim();
	const description = input.description.trim();
	if (!externalId) {
		throw new Error("Id externo não pode ser vazio");
	}
	if (!description) {
		throw new Error("Descrição não pode ser vazia");
	}
	const task = await repository.findById(taskId);
	if (!task) {
		throw new Error("Task não encontrada");
	}
	const existing = await repository.findByExternalId(task.teamId, externalId);
	if (existing && existing.id !== taskId) {
		throw new Error(
			`Já existe uma task com o id externo "${externalId}" neste time`,
		);
	}
	return repository.update(taskId, {
		externalId,
		description,
		typeId: input.typeId,
		assigneeId: input.assigneeId,
		dueDate: input.dueDate,
	});
}
```

`src/application/task/use-cases/delete-task.ts`:

```ts
import type { TaskRepository } from "@/application/task/ports/task-repository";

export async function deleteTask(repository: TaskRepository, taskId: string) {
	await repository.delete(taskId);
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npm test`
Expected: PASS — 9 testes novos (5 + 3 + 1) somados aos 8 da Task 3.

- [ ] **Step 5: Commit**

```bash
git add src/application/task/use-cases/create-task.ts src/application/task/use-cases/create-task.test.ts src/application/task/use-cases/update-task.ts src/application/task/use-cases/update-task.test.ts src/application/task/use-cases/delete-task.ts src/application/task/use-cases/delete-task.test.ts
git commit -m "feat(kanban)!: adiciona casos de uso de crud de task"
```

---

### Task 5: Caso de uso `moveTask`

**Files:**
- Create: `src/application/task/use-cases/move-task.ts`
- Create: `src/application/task/use-cases/move-task.test.ts`

**Interfaces:**
- Consumes: `TaskRepository`, `TaskHistoryRepository`, fakes (Task 2), `Task`/`TaskStatus` (Task 1).
- Produces: `moveTask(repository: TaskRepository, historyRepository: TaskHistoryRepository, taskId: string, toStatus: TaskStatus): Promise<Task>` — usado pelo `task-move-select` (Task 16) via composition root.

- [ ] **Step 1: Escrever o teste que falha**

`src/application/task/use-cases/move-task.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createFakeTaskHistoryRepository } from "./test-helpers/create-fake-task-history-repository";
import { createFakeTaskRepository } from "./test-helpers/create-fake-task-repository";
import { moveTask } from "./move-task";

const baseData = {
	externalId: "TASK-1",
	description: "Corrigir bug",
	typeId: "type-1",
	assigneeId: null,
	teamId: "team-1",
	status: "TODO" as const,
	dueDate: null,
};

describe("moveTask", () => {
	it("move a task e grava a transição no histórico", async () => {
		const repository = createFakeTaskRepository();
		const historyRepository = createFakeTaskHistoryRepository();
		const task = await repository.create(baseData);

		const moved = await moveTask(
			repository,
			historyRepository,
			task.id,
			"IN_DEVELOPMENT",
		);

		expect(moved.status).toBe("IN_DEVELOPMENT");
		expect(historyRepository.statusChanges).toEqual([
			expect.objectContaining({
				taskId: task.id,
				fromStatus: "TODO",
				toStatus: "IN_DEVELOPMENT",
			}),
		]);
	});

	it("detecta transições de retrabalho (code review -> em desenvolvimento)", async () => {
		const repository = createFakeTaskRepository();
		const historyRepository = createFakeTaskHistoryRepository();
		const task = await repository.create({ ...baseData, status: "CODE_REVIEW" });

		await moveTask(repository, historyRepository, task.id, "IN_DEVELOPMENT");

		expect(historyRepository.statusChanges).toEqual([
			expect.objectContaining({
				fromStatus: "CODE_REVIEW",
				toStatus: "IN_DEVELOPMENT",
			}),
		]);
	});

	it("detecta transições de retrabalho (concluído -> em desenvolvimento)", async () => {
		const repository = createFakeTaskRepository();
		const historyRepository = createFakeTaskHistoryRepository();
		const task = await repository.create({ ...baseData, status: "DONE" });

		await moveTask(repository, historyRepository, task.id, "IN_DEVELOPMENT");

		expect(historyRepository.statusChanges).toEqual([
			expect.objectContaining({ fromStatus: "DONE", toStatus: "IN_DEVELOPMENT" }),
		]);
	});

	it("não grava histórico ao mover para a mesma coluna", async () => {
		const repository = createFakeTaskRepository();
		const historyRepository = createFakeTaskHistoryRepository();
		const task = await repository.create(baseData);

		await moveTask(repository, historyRepository, task.id, "TODO");

		expect(historyRepository.statusChanges).toEqual([]);
	});
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npm test`
Expected: FAIL — módulo `./move-task` não encontrado.

- [ ] **Step 3: Implementar o caso de uso**

`src/application/task/use-cases/move-task.ts`:

```ts
import type { TaskHistoryRepository } from "@/application/task/ports/task-history-repository";
import type { TaskRepository } from "@/application/task/ports/task-repository";
import type { TaskStatus } from "@/domain/task/entities/task";

export async function moveTask(
	repository: TaskRepository,
	historyRepository: TaskHistoryRepository,
	taskId: string,
	toStatus: TaskStatus,
) {
	const task = await repository.findById(taskId);
	if (!task) {
		throw new Error("Task não encontrada");
	}
	const fromStatus = task.status;
	if (fromStatus === toStatus) {
		return task;
	}
	const updated = await repository.updateStatus(taskId, toStatus);
	await historyRepository.recordStatusChange(taskId, fromStatus, toStatus);
	return updated;
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm test`
Expected: PASS — 4 testes novos.

- [ ] **Step 5: Commit**

```bash
git add src/application/task/use-cases/move-task.ts src/application/task/use-cases/move-task.test.ts
git commit -m "feat(kanban)!: adiciona caso de uso de mover task"
```

---

### Task 6: Caso de uso `toggleBlocked`

**Files:**
- Create: `src/application/task/use-cases/toggle-blocked.ts`
- Create: `src/application/task/use-cases/toggle-blocked.test.ts`

**Interfaces:**
- Consumes: `TaskRepository`, `TaskHistoryRepository`, fakes (Task 2).
- Produces: `toggleBlocked(repository: TaskRepository, historyRepository: TaskHistoryRepository, taskId: string, blocked: boolean): Promise<Task>` — usado pelo toggle de bloqueio do modal de edição (Task 17) via composition root.

- [ ] **Step 1: Escrever o teste que falha**

`src/application/task/use-cases/toggle-blocked.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createFakeTaskHistoryRepository } from "./test-helpers/create-fake-task-history-repository";
import { createFakeTaskRepository } from "./test-helpers/create-fake-task-repository";
import { toggleBlocked } from "./toggle-blocked";

const baseData = {
	externalId: "TASK-1",
	description: "Corrigir bug",
	typeId: "type-1",
	assigneeId: null,
	teamId: "team-1",
	status: "TODO" as const,
	dueDate: null,
};

describe("toggleBlocked", () => {
	it("bloqueia a task e abre um período de bloqueio", async () => {
		const repository = createFakeTaskRepository();
		const historyRepository = createFakeTaskHistoryRepository();
		const task = await repository.create(baseData);

		const blocked = await toggleBlocked(repository, historyRepository, task.id, true);

		expect(blocked.blocked).toBe(true);
		expect(historyRepository.blockedPeriods).toHaveLength(1);
		expect(historyRepository.blockedPeriods[0].unblockedAt).toBeNull();
	});

	it("desbloqueia a task e fecha o período de bloqueio", async () => {
		const repository = createFakeTaskRepository();
		const historyRepository = createFakeTaskHistoryRepository();
		const task = await repository.create(baseData);
		await toggleBlocked(repository, historyRepository, task.id, true);

		const unblocked = await toggleBlocked(
			repository,
			historyRepository,
			task.id,
			false,
		);

		expect(unblocked.blocked).toBe(false);
		expect(historyRepository.blockedPeriods[0].unblockedAt).not.toBeNull();
	});

	it("é idempotente ao bloquear uma task já bloqueada", async () => {
		const repository = createFakeTaskRepository();
		const historyRepository = createFakeTaskHistoryRepository();
		const task = await repository.create(baseData);
		await toggleBlocked(repository, historyRepository, task.id, true);

		await toggleBlocked(repository, historyRepository, task.id, true);

		expect(historyRepository.blockedPeriods).toHaveLength(1);
	});

	it("é idempotente ao desbloquear uma task já desbloqueada", async () => {
		const repository = createFakeTaskRepository();
		const historyRepository = createFakeTaskHistoryRepository();
		const task = await repository.create(baseData);

		await toggleBlocked(repository, historyRepository, task.id, false);

		expect(historyRepository.blockedPeriods).toHaveLength(0);
	});
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npm test`
Expected: FAIL — módulo `./toggle-blocked` não encontrado.

- [ ] **Step 3: Implementar o caso de uso**

`src/application/task/use-cases/toggle-blocked.ts`:

```ts
import type { TaskHistoryRepository } from "@/application/task/ports/task-history-repository";
import type { TaskRepository } from "@/application/task/ports/task-repository";

export async function toggleBlocked(
	repository: TaskRepository,
	historyRepository: TaskHistoryRepository,
	taskId: string,
	blocked: boolean,
) {
	const task = await repository.findById(taskId);
	if (!task) {
		throw new Error("Task não encontrada");
	}
	if (task.blocked === blocked) {
		return task;
	}
	if (blocked) {
		await historyRepository.openBlockedPeriod(taskId);
	} else {
		await historyRepository.closeBlockedPeriod(taskId);
	}
	return repository.updateBlocked(taskId, blocked);
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm test`
Expected: PASS — 4 testes novos.

- [ ] **Step 5: Commit**

```bash
git add src/application/task/use-cases/toggle-blocked.ts src/application/task/use-cases/toggle-blocked.test.ts
git commit -m "feat(kanban)!: adiciona caso de uso de alternar bloqueio"
```

---

### Task 7: Caso de uso `listTasksByTeam`

**Files:**
- Create: `src/application/task/use-cases/list-tasks-by-team.ts`
- Create: `src/application/task/use-cases/list-tasks-by-team.test.ts`

**Interfaces:**
- Consumes: `TaskRepository`, `createFakeTaskRepository()` (Task 2).
- Produces: `TasksByStatus = Record<TaskStatus, Task[]>` e `listTasksByTeam(repository: TaskRepository, teamId: string): Promise<TasksByStatus>` — usado por `app/board/page.tsx` (Task 18).

- [ ] **Step 1: Escrever o teste que falha**

`src/application/task/use-cases/list-tasks-by-team.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createFakeTaskRepository } from "./test-helpers/create-fake-task-repository";
import { listTasksByTeam } from "./list-tasks-by-team";

const baseData = {
	description: "Corrigir bug",
	typeId: "type-1",
	assigneeId: null,
	teamId: "team-1",
	dueDate: null,
};

describe("listTasksByTeam", () => {
	it("agrupa as tasks do time por status", async () => {
		const repository = createFakeTaskRepository();
		await repository.create({ ...baseData, externalId: "TASK-1", status: "TODO" });
		await repository.create({
			...baseData,
			externalId: "TASK-2",
			status: "IN_DEVELOPMENT",
		});
		await repository.create({
			...baseData,
			externalId: "TASK-3",
			teamId: "team-2",
			status: "TODO",
		});

		const result = await listTasksByTeam(repository, "team-1");

		expect(result.TODO.map((t) => t.externalId)).toEqual(["TASK-1"]);
		expect(result.IN_DEVELOPMENT.map((t) => t.externalId)).toEqual(["TASK-2"]);
		expect(result.CODE_REVIEW).toEqual([]);
		expect(result.DONE).toEqual([]);
	});
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npm test`
Expected: FAIL — módulo `./list-tasks-by-team` não encontrado.

- [ ] **Step 3: Implementar o caso de uso**

`src/application/task/use-cases/list-tasks-by-team.ts`:

```ts
import type { TaskRepository } from "@/application/task/ports/task-repository";
import type { Task, TaskStatus } from "@/domain/task/entities/task";

export type TasksByStatus = Record<TaskStatus, Task[]>;

export async function listTasksByTeam(
	repository: TaskRepository,
	teamId: string,
): Promise<TasksByStatus> {
	const tasks = await repository.listByTeam(teamId);
	const grouped: TasksByStatus = {
		TODO: [],
		IN_DEVELOPMENT: [],
		CODE_REVIEW: [],
		DONE: [],
	};
	for (const task of tasks) {
		grouped[task.status].push(task);
	}
	return grouped;
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm test`
Expected: PASS — 1 teste novo. Total acumulado: 22 testes de `application/task` (8 + 9 + 4 + 4 + 1).

- [ ] **Step 5: Commit**

```bash
git add src/application/task/use-cases/list-tasks-by-team.ts src/application/task/use-cases/list-tasks-by-team.test.ts
git commit -m "feat(kanban)!: adiciona caso de uso de listagem por time agrupada"
```

---

### Task 8: Schema Drizzle e migração de task

**Files:**
- Create: `src/infrastructure/task/drizzle/schema.ts`
- Create: `drizzle/migrations/0001_<nome-gerado>.sql` (gerado por `drizzle-kit`)

**Interfaces:**
- Consumes: nada de tasks anteriores (é infraestrutura nova); usa `db` de `@/infrastructure/db/client` (já existe desde o sub-projeto 1).
- Produces: tabelas `taskTypes`, `tasks`, `taskStatusChanges`, `taskBlockedPeriods` exportadas de `@/infrastructure/task/drizzle/schema`, usadas pelas Tasks 9–12.

- [ ] **Step 1: Criar o schema Drizzle de `task`**

`src/infrastructure/task/drizzle/schema.ts`:

```ts
import {
	boolean,
	date,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

export const taskTypes = pgTable("task_types", {
	id: uuid("id").defaultRandom().primaryKey(),
	name: text("name").notNull(),
	color: text("color").notNull(),
});

export const tasks = pgTable(
	"tasks",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		externalId: text("external_id").notNull(),
		description: text("description").notNull(),
		typeId: uuid("type_id")
			.notNull()
			.references(() => taskTypes.id, { onDelete: "restrict" }),
		// assigneeId e teamId não têm FK: são ids de agregados do bounded
		// context `team`, e contextos não se acoplam a nível de schema.
		assigneeId: uuid("assignee_id"),
		teamId: uuid("team_id").notNull(),
		status: text("status").notNull(),
		blocked: boolean("blocked").notNull().default(false),
		dueDate: date("due_date"),
		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at")
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(table) => [
		uniqueIndex("tasks_team_id_external_id_idx").on(
			table.teamId,
			table.externalId,
		),
	],
);

export const taskStatusChanges = pgTable("task_status_changes", {
	id: uuid("id").defaultRandom().primaryKey(),
	taskId: uuid("task_id")
		.notNull()
		.references(() => tasks.id, { onDelete: "cascade" }),
	fromStatus: text("from_status"),
	toStatus: text("to_status").notNull(),
	changedAt: timestamp("changed_at").notNull().defaultNow(),
});

export const taskBlockedPeriods = pgTable("task_blocked_periods", {
	id: uuid("id").defaultRandom().primaryKey(),
	taskId: uuid("task_id")
		.notNull()
		.references(() => tasks.id, { onDelete: "cascade" }),
	blockedAt: timestamp("blocked_at").notNull().defaultNow(),
	unblockedAt: timestamp("unblocked_at"),
});
```

O padrão de `drizzle.config.ts` (`./src/infrastructure/**/drizzle/schema.ts`) já cobre este arquivo novo — nenhuma mudança de configuração necessária.

- [ ] **Step 2: Gerar a migração**

```bash
npm run db:generate
```

Expected: `drizzle/migrations/0001_<nome-gerado>.sql` criado. O conteúdo esperado (a formatação exata gerada pelo `drizzle-kit` pode variar ligeiramente) é equivalente a:

```sql
CREATE TABLE "task_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" text NOT NULL,
	"description" text NOT NULL,
	"type_id" uuid NOT NULL,
	"assignee_id" uuid,
	"team_id" uuid NOT NULL,
	"status" text NOT NULL,
	"blocked" boolean DEFAULT false NOT NULL,
	"due_date" date,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_status_changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"from_status" text,
	"to_status" text NOT NULL,
	"changed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_blocked_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"blocked_at" timestamp DEFAULT now() NOT NULL,
	"unblocked_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_type_id_task_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."task_types"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "task_status_changes" ADD CONSTRAINT "task_status_changes_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "task_blocked_periods" ADD CONSTRAINT "task_blocked_periods_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "tasks_team_id_external_id_idx" ON "tasks" USING btree ("team_id","external_id");
```

Se o conteúdo gerado divergir de forma relevante (por exemplo, uma coluna ou constraint faltando), ajustar `schema.ts` até que `npm run db:generate` produza o resultado equivalente ao acima antes de prosseguir.

- [ ] **Step 3: Aplicar a migração no banco de desenvolvimento**

```bash
npm run db:migrate
```

Expected: aplica sem erros em `development_metrics`.

- [ ] **Step 4: Verificar tipos**

Run: `npm run typecheck`
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure/task/drizzle/schema.ts drizzle/migrations
git commit -m "chore(banco)!: adiciona schema e migracao de task"
```

---

### Task 9: Seed dos tipos padrão de task

**Files:**
- Create: `src/infrastructure/task/drizzle/seed-task-types.ts`
- Create: `drizzle/migrations/0002_seed_task_types.sql` (gerado por `drizzle-kit generate --custom`)
- Modify: `tests/integration/reset-db.ts`
- Modify: `vitest.config.ts`

**Interfaces:**
- Consumes: `db` (`@/infrastructure/db/client`), `taskTypes` (`@/infrastructure/task/drizzle/schema`, Task 8).
- Produces: `DEFAULT_TASK_TYPES` e `seedDefaultTaskTypes(): Promise<void>` exportados de `@/infrastructure/task/drizzle/seed-task-types`, usados por `tests/integration/reset-db.ts` (esta task) para manter os 3 tipos padrão disponíveis em cada teste E2E. A migração `0002_seed_task_types.sql` garante o seed em qualquer banco onde as migrações forem aplicadas (dev, produção futura).

- [ ] **Step 1: Criar o módulo de seed**

`src/infrastructure/task/drizzle/seed-task-types.ts`:

```ts
import { db } from "@/infrastructure/db/client";
import { taskTypes } from "./schema";

export const DEFAULT_TASK_TYPES = [
	{ name: "História", color: "#2563eb" },
	{ name: "Tarefa Técnica", color: "#64748b" },
	{ name: "Bug", color: "#dc2626" },
] as const;

export async function seedDefaultTaskTypes() {
	await db.insert(taskTypes).values([...DEFAULT_TASK_TYPES]);
}
```

- [ ] **Step 2: Gerar a migração custom de seed**

```bash
npx drizzle-kit generate --custom --name seed-task-types
```

Expected: cria `drizzle/migrations/0002_seed_task_types.sql` vazio.

- [ ] **Step 3: Preencher a migração de seed**

Substituir o conteúdo de `drizzle/migrations/0002_seed_task_types.sql` por:

```sql
INSERT INTO "task_types" ("name", "color") VALUES
	('História', '#2563eb'),
	('Tarefa Técnica', '#64748b'),
	('Bug', '#dc2626');
```

Os valores devem ser mantidos idênticos aos de `DEFAULT_TASK_TYPES` (Step 1) — são a mesma informação, uma como registro de migração (aplicada uma vez em qualquer banco) e outra como constante reutilizada pelos testes de integração (Step 5).

- [ ] **Step 4: Aplicar a migração no banco de desenvolvimento**

```bash
npm run db:migrate
```

Expected: aplica sem erros; `SELECT * FROM task_types` em `development_metrics` retorna os 3 tipos padrão.

- [ ] **Step 5: Atualizar o reset de banco dos testes de integração**

Em `tests/integration/reset-db.ts`, substituir todo o conteúdo por:

```ts
import { sql } from "drizzle-orm";
import { db } from "@/infrastructure/db/client";
import { seedDefaultTaskTypes } from "@/infrastructure/task/drizzle/seed-task-types";

export async function resetDatabase() {
	await db.execute(
		sql`TRUNCATE TABLE task_blocked_periods, task_status_changes, tasks, task_types, members, teams RESTART IDENTITY CASCADE`,
	);
	await seedDefaultTaskTypes();
}
```

- [ ] **Step 6: Desligar paralelismo de arquivos no Vitest**

Em `vitest.config.ts`, dentro do bloco `test`, adicionar `fileParallelism: false`:

```ts
import path from "node:path";
import { defineConfig } from "vitest/config";

const TEST_DATABASE_URL =
	process.env.DATABASE_URL ??
	"postgresql://postgres:postgres@localhost:5432/development_metrics_test";

export default defineConfig({
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	test: {
		environment: "node",
		include: ["src/**/*.test.ts"],
		env: {
			DATABASE_URL: TEST_DATABASE_URL,
		},
		globalSetup: "./vitest.global-setup.ts",
		fileParallelism: false,
	},
});
```

Vários arquivos de teste de `infrastructure` (Tasks 10–12) truncam as tabelas `tasks`/`task_types` compartilhadas; sem isso, arquivos rodando em paralelo poderiam truncar dados uns dos outros no meio de um teste — o mesmo motivo pelo qual `playwright.config.ts` já usa `fullyParallel: false`.

- [ ] **Step 7: Verificar tipos**

Run: `npm run typecheck`
Expected: sem erros.

- [ ] **Step 8: Commit**

```bash
git add src/infrastructure/task/drizzle/seed-task-types.ts drizzle/migrations tests/integration/reset-db.ts vitest.config.ts
git commit -m "chore(banco)!: adiciona seed dos tipos padrao de task"
```

---

### Task 10: Repositório Drizzle de TaskType

**Files:**
- Create: `src/infrastructure/task/drizzle-task-type-repository.ts`
- Create: `src/infrastructure/task/drizzle-task-type-repository.test.ts`

**Interfaces:**
- Consumes: `db`, `taskTypes` (Task 8), `TaskTypeRepository` (Task 2).
- Produces: `drizzleTaskTypeRepository: TaskTypeRepository`, usado pelo composition root (Task 13).

- [ ] **Step 1: Escrever o teste que falha**

`src/infrastructure/task/drizzle-task-type-repository.test.ts`:

```ts
import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { db } from "@/infrastructure/db/client";
import { taskTypes } from "./drizzle/schema";
import { drizzleTaskTypeRepository } from "./drizzle-task-type-repository";

async function deleteTaskType(typeId: string) {
	await db.delete(taskTypes).where(eq(taskTypes.id, typeId));
}

describe("drizzleTaskTypeRepository", () => {
	afterEach(async () => {
		// Não trunca a tabela inteira: `task_types` carrega o seed padrão
		// (Task 9), consumido por outros testes. Cada teste remove apenas o
		// que criou.
	});

	it("cria e busca um tipo por id", async () => {
		const created = await drizzleTaskTypeRepository.create("Épico", "#2563eb");
		try {
			const found = await drizzleTaskTypeRepository.findById(created.id);
			expect(found).toEqual(created);
		} finally {
			await deleteTaskType(created.id);
		}
	});

	it("retorna null ao buscar um tipo inexistente", async () => {
		expect(
			await drizzleTaskTypeRepository.findById(
				"00000000-0000-0000-0000-000000000000",
			),
		).toBeNull();
	});

	it("atualiza nome e cor", async () => {
		const created = await drizzleTaskTypeRepository.create("Épico", "#2563eb");
		try {
			const updated = await drizzleTaskTypeRepository.update(
				created.id,
				"Épico Grande",
				"#64748b",
			);
			expect(updated.name).toBe("Épico Grande");
			expect(updated.color).toBe("#64748b");
		} finally {
			await deleteTaskType(created.id);
		}
	});

	it("lista os tipos incluindo os criados no teste", async () => {
		const created = await drizzleTaskTypeRepository.create("Épico", "#2563eb");
		try {
			const all = await drizzleTaskTypeRepository.listAll();
			expect(all.map((t) => t.id)).toContain(created.id);
		} finally {
			await deleteTaskType(created.id);
		}
	});

	it("exclui um tipo", async () => {
		const created = await drizzleTaskTypeRepository.create("Épico", "#2563eb");
		await drizzleTaskTypeRepository.delete(created.id);
		expect(await drizzleTaskTypeRepository.findById(created.id)).toBeNull();
	});
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npm test`
Expected: FAIL — módulo `./drizzle-task-type-repository` não encontrado.

- [ ] **Step 3: Implementar o repositório**

`src/infrastructure/task/drizzle-task-type-repository.ts`:

```ts
import { eq } from "drizzle-orm";
import type { TaskTypeRepository } from "@/application/task/ports/task-type-repository";
import type { TaskType } from "@/domain/task/entities/task-type";
import { db } from "@/infrastructure/db/client";
import { taskTypes } from "./drizzle/schema";

export const drizzleTaskTypeRepository: TaskTypeRepository = {
	async create(name, color) {
		const [taskType] = await db
			.insert(taskTypes)
			.values({ name, color })
			.returning();
		return taskType as TaskType;
	},
	async update(typeId, name, color) {
		const [taskType] = await db
			.update(taskTypes)
			.set({ name, color })
			.where(eq(taskTypes.id, typeId))
			.returning();
		if (!taskType) {
			throw new Error("Tipo de task não encontrado");
		}
		return taskType as TaskType;
	},
	async delete(typeId) {
		await db.delete(taskTypes).where(eq(taskTypes.id, typeId));
	},
	async listAll() {
		return db.select().from(taskTypes);
	},
	async findById(typeId) {
		const [taskType] = await db
			.select()
			.from(taskTypes)
			.where(eq(taskTypes.id, typeId));
		return (taskType as TaskType) ?? null;
	},
};
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm test`
Expected: PASS — 5 testes novos, contra o Postgres real de `development_metrics_test`.

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure/task/drizzle-task-type-repository.ts src/infrastructure/task/drizzle-task-type-repository.test.ts
git commit -m "feat(kanban)!: adiciona repositorio drizzle de tipo de task"
```

---

### Task 11: Repositório Drizzle de Task

**Files:**
- Create: `src/infrastructure/task/drizzle-task-repository.ts`
- Create: `src/infrastructure/task/drizzle-task-repository.test.ts`

**Interfaces:**
- Consumes: `db`, `tasks` (Task 8), `TaskRepository` (Task 2), `drizzleTaskTypeRepository` (Task 10, só nos testes, para satisfazer a FK de `typeId`).
- Produces: `drizzleTaskRepository: TaskRepository`, usado pelo composition root (Task 13).

- [ ] **Step 1: Escrever o teste que falha**

`src/infrastructure/task/drizzle-task-repository.test.ts`:

```ts
import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/infrastructure/db/client";
import { drizzleTaskTypeRepository } from "./drizzle-task-type-repository";
import { drizzleTaskRepository } from "./drizzle-task-repository";

async function resetTasksTable() {
	await db.execute(
		sql`TRUNCATE TABLE task_blocked_periods, task_status_changes, tasks RESTART IDENTITY CASCADE`,
	);
}

describe("drizzleTaskRepository", () => {
	let typeId: string;

	beforeEach(async () => {
		const taskType = await drizzleTaskTypeRepository.create("Bug", "#dc2626");
		typeId = taskType.id;
	});

	afterEach(async () => {
		await resetTasksTable();
		await drizzleTaskTypeRepository.delete(typeId);
	});

	function baseData(overrides: Partial<Parameters<typeof drizzleTaskRepository.create>[0]> = {}) {
		return {
			externalId: "TASK-1",
			description: "Corrigir bug de login",
			typeId,
			assigneeId: null,
			teamId: "11111111-1111-1111-1111-111111111111",
			status: "TODO" as const,
			dueDate: null,
			...overrides,
		};
	}

	it("cria e busca uma task por id", async () => {
		const created = await drizzleTaskRepository.create(baseData());
		const found = await drizzleTaskRepository.findById(created.id);
		expect(found).toEqual(created);
		expect(found?.blocked).toBe(false);
	});

	it("busca por id externo dentro do time", async () => {
		const created = await drizzleTaskRepository.create(baseData());
		const found = await drizzleTaskRepository.findByExternalId(
			created.teamId,
			"TASK-1",
		);
		expect(found?.id).toBe(created.id);
	});

	it("lista as tasks de um time", async () => {
		await drizzleTaskRepository.create(baseData());
		await drizzleTaskRepository.create(
			baseData({ externalId: "TASK-2", teamId: "22222222-2222-2222-2222-222222222222" }),
		);
		const list = await drizzleTaskRepository.listByTeam(
			"11111111-1111-1111-1111-111111111111",
		);
		expect(list.map((t) => t.externalId)).toEqual(["TASK-1"]);
	});

	it("atualiza o status", async () => {
		const created = await drizzleTaskRepository.create(baseData());
		const updated = await drizzleTaskRepository.updateStatus(
			created.id,
			"IN_DEVELOPMENT",
		);
		expect(updated.status).toBe("IN_DEVELOPMENT");
	});

	it("atualiza o campo bloqueado", async () => {
		const created = await drizzleTaskRepository.create(baseData());
		const updated = await drizzleTaskRepository.updateBlocked(created.id, true);
		expect(updated.blocked).toBe(true);
	});

	it("atualiza os campos editáveis", async () => {
		const created = await drizzleTaskRepository.create(baseData());
		const updated = await drizzleTaskRepository.update(created.id, {
			externalId: "TASK-1",
			description: "Nova descrição",
			typeId,
			assigneeId: null,
			dueDate: "2026-08-01",
		});
		expect(updated.description).toBe("Nova descrição");
		expect(updated.dueDate).toBe("2026-08-01");
	});

	it("conta as tasks de um tipo", async () => {
		await drizzleTaskRepository.create(baseData());
		expect(await drizzleTaskRepository.countByType(typeId)).toBe(1);
	});

	it("exclui uma task", async () => {
		const created = await drizzleTaskRepository.create(baseData());
		await drizzleTaskRepository.delete(created.id);
		expect(await drizzleTaskRepository.findById(created.id)).toBeNull();
	});
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npm test`
Expected: FAIL — módulo `./drizzle-task-repository` não encontrado.

- [ ] **Step 3: Implementar o repositório**

`src/infrastructure/task/drizzle-task-repository.ts`:

```ts
import { and, eq, sql } from "drizzle-orm";
import type {
	CreateTaskData,
	TaskRepository,
	UpdateTaskData,
} from "@/application/task/ports/task-repository";
import type { Task, TaskStatus } from "@/domain/task/entities/task";
import { db } from "@/infrastructure/db/client";
import { tasks } from "./drizzle/schema";

function toTask(row: typeof tasks.$inferSelect): Task {
	return { ...row, status: row.status as TaskStatus };
}

export const drizzleTaskRepository: TaskRepository = {
	async create(data: CreateTaskData) {
		const [row] = await db.insert(tasks).values(data).returning();
		return toTask(row);
	},
	async update(taskId: string, data: UpdateTaskData) {
		const [row] = await db
			.update(tasks)
			.set(data)
			.where(eq(tasks.id, taskId))
			.returning();
		if (!row) {
			throw new Error("Task não encontrada");
		}
		return toTask(row);
	},
	async delete(taskId: string) {
		await db.delete(tasks).where(eq(tasks.id, taskId));
	},
	async findById(taskId: string) {
		const [row] = await db.select().from(tasks).where(eq(tasks.id, taskId));
		return row ? toTask(row) : null;
	},
	async findByExternalId(teamId: string, externalId: string) {
		const [row] = await db
			.select()
			.from(tasks)
			.where(and(eq(tasks.teamId, teamId), eq(tasks.externalId, externalId)));
		return row ? toTask(row) : null;
	},
	async listByTeam(teamId: string) {
		const rows = await db.select().from(tasks).where(eq(tasks.teamId, teamId));
		return rows.map(toTask);
	},
	async updateStatus(taskId: string, status) {
		const [row] = await db
			.update(tasks)
			.set({ status })
			.where(eq(tasks.id, taskId))
			.returning();
		if (!row) {
			throw new Error("Task não encontrada");
		}
		return toTask(row);
	},
	async updateBlocked(taskId: string, blocked) {
		const [row] = await db
			.update(tasks)
			.set({ blocked })
			.where(eq(tasks.id, taskId))
			.returning();
		if (!row) {
			throw new Error("Task não encontrada");
		}
		return toTask(row);
	},
	async countByType(typeId: string) {
		const [result] = await db
			.select({ count: sql<number>`count(*)::int` })
			.from(tasks)
			.where(eq(tasks.typeId, typeId));
		return result?.count ?? 0;
	},
};
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm test`
Expected: PASS — 8 testes novos.

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure/task/drizzle-task-repository.ts src/infrastructure/task/drizzle-task-repository.test.ts
git commit -m "feat(kanban)!: adiciona repositorio drizzle de task"
```

---

### Task 12: Repositório Drizzle de histórico de Task

**Files:**
- Create: `src/infrastructure/task/drizzle-task-history-repository.ts`
- Create: `src/infrastructure/task/drizzle-task-history-repository.test.ts`

**Interfaces:**
- Consumes: `db`, `taskStatusChanges`, `taskBlockedPeriods` (Task 8), `TaskHistoryRepository` (Task 2), `drizzleTaskTypeRepository` (Task 10) e `drizzleTaskRepository` (Task 11), usados nos testes para satisfazer as FKs.
- Produces: `drizzleTaskHistoryRepository: TaskHistoryRepository`, usado pelo composition root (Task 13).

- [ ] **Step 1: Escrever o teste que falha**

`src/infrastructure/task/drizzle-task-history-repository.test.ts`:

```ts
import { eq, sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/infrastructure/db/client";
import { taskBlockedPeriods, taskStatusChanges } from "./drizzle/schema";
import { drizzleTaskTypeRepository } from "./drizzle-task-type-repository";
import { drizzleTaskRepository } from "./drizzle-task-repository";
import { drizzleTaskHistoryRepository } from "./drizzle-task-history-repository";

describe("drizzleTaskHistoryRepository", () => {
	let typeId: string;
	let taskId: string;

	beforeEach(async () => {
		const taskType = await drizzleTaskTypeRepository.create("Bug", "#dc2626");
		typeId = taskType.id;
		const task = await drizzleTaskRepository.create({
			externalId: "TASK-1",
			description: "Corrigir bug",
			typeId,
			assigneeId: null,
			teamId: "11111111-1111-1111-1111-111111111111",
			status: "TODO",
			dueDate: null,
		});
		taskId = task.id;
	});

	afterEach(async () => {
		await db.execute(
			sql`TRUNCATE TABLE task_blocked_periods, task_status_changes, tasks RESTART IDENTITY CASCADE`,
		);
		await drizzleTaskTypeRepository.delete(typeId);
	});

	it("grava uma transição de status", async () => {
		await drizzleTaskHistoryRepository.recordStatusChange(
			taskId,
			"TODO",
			"IN_DEVELOPMENT",
		);
		const rows = await db
			.select()
			.from(taskStatusChanges)
			.where(eq(taskStatusChanges.taskId, taskId));
		expect(rows).toHaveLength(1);
		expect(rows[0].fromStatus).toBe("TODO");
		expect(rows[0].toStatus).toBe("IN_DEVELOPMENT");
	});

	it("abre e fecha um período de bloqueio", async () => {
		await drizzleTaskHistoryRepository.openBlockedPeriod(taskId);
		let rows = await db
			.select()
			.from(taskBlockedPeriods)
			.where(eq(taskBlockedPeriods.taskId, taskId));
		expect(rows).toHaveLength(1);
		expect(rows[0].unblockedAt).toBeNull();

		await drizzleTaskHistoryRepository.closeBlockedPeriod(taskId);
		rows = await db
			.select()
			.from(taskBlockedPeriods)
			.where(eq(taskBlockedPeriods.taskId, taskId));
		expect(rows[0].unblockedAt).not.toBeNull();
	});

	it("rejeita fechar um período de bloqueio quando não há nenhum aberto", async () => {
		await expect(
			drizzleTaskHistoryRepository.closeBlockedPeriod(taskId),
		).rejects.toThrow("Não há período de bloqueio aberto para esta task");
	});
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npm test`
Expected: FAIL — módulo `./drizzle-task-history-repository` não encontrado.

- [ ] **Step 3: Implementar o repositório**

`src/infrastructure/task/drizzle-task-history-repository.ts`:

```ts
import { and, desc, eq, isNull } from "drizzle-orm";
import type { TaskHistoryRepository } from "@/application/task/ports/task-history-repository";
import { db } from "@/infrastructure/db/client";
import { taskBlockedPeriods, taskStatusChanges } from "./drizzle/schema";

export const drizzleTaskHistoryRepository: TaskHistoryRepository = {
	async recordStatusChange(taskId, fromStatus, toStatus) {
		await db
			.insert(taskStatusChanges)
			.values({ taskId, fromStatus, toStatus });
	},
	async openBlockedPeriod(taskId) {
		await db.insert(taskBlockedPeriods).values({ taskId });
	},
	async closeBlockedPeriod(taskId) {
		const [open] = await db
			.select()
			.from(taskBlockedPeriods)
			.where(
				and(
					eq(taskBlockedPeriods.taskId, taskId),
					isNull(taskBlockedPeriods.unblockedAt),
				),
			)
			.orderBy(desc(taskBlockedPeriods.blockedAt))
			.limit(1);
		if (!open) {
			throw new Error("Não há período de bloqueio aberto para esta task");
		}
		await db
			.update(taskBlockedPeriods)
			.set({ unblockedAt: new Date() })
			.where(eq(taskBlockedPeriods.id, open.id));
	},
};
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm test`
Expected: PASS — 3 testes novos.

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure/task/drizzle-task-history-repository.ts src/infrastructure/task/drizzle-task-history-repository.test.ts
git commit -m "feat(kanban)!: adiciona repositorio drizzle de historico de task"
```

---

### Task 13: Composition root de Task

**Files:**
- Create: `src/composition/task.ts`

**Interfaces:**
- Consumes: `drizzleTaskRepository` (Task 11), `drizzleTaskHistoryRepository` (Task 12), `drizzleTaskTypeRepository` (Task 10), todos os casos de uso de `@/application/task/use-cases/*` (Tasks 3–7).
- Produces: `createTaskUseCases()` retornando:

```ts
{
	createTask: (input: CreateTaskInput) => Promise<Task>;
	updateTask: (taskId: string, input: UpdateTaskInput) => Promise<Task>;
	deleteTask: (taskId: string) => Promise<void>;
	moveTask: (taskId: string, toStatus: TaskStatus) => Promise<Task>;
	toggleBlocked: (taskId: string, blocked: boolean) => Promise<Task>;
	listTasksByTeam: (teamId: string) => Promise<TasksByStatus>;
	createTaskType: (name: string, color: string) => Promise<TaskType>;
	updateTaskType: (typeId: string, name: string, color: string) => Promise<TaskType>;
	deleteTaskType: (typeId: string) => Promise<void>;
	listTaskTypes: () => Promise<TaskTypeWithUsage[]>;
}
```

Usado por todas as tasks de `app/` e `presentation/` a seguir (14–19).

- [ ] **Step 1: Implementar a factory**

`src/composition/task.ts`:

```ts
import type { CreateTaskInput } from "@/application/task/use-cases/create-task";
import { createTask } from "@/application/task/use-cases/create-task";
import { createTaskType } from "@/application/task/use-cases/create-task-type";
import { deleteTask } from "@/application/task/use-cases/delete-task";
import { deleteTaskType } from "@/application/task/use-cases/delete-task-type";
import { listTaskTypes } from "@/application/task/use-cases/list-task-types";
import { listTasksByTeam } from "@/application/task/use-cases/list-tasks-by-team";
import { moveTask } from "@/application/task/use-cases/move-task";
import { toggleBlocked } from "@/application/task/use-cases/toggle-blocked";
import type { UpdateTaskInput } from "@/application/task/use-cases/update-task";
import { updateTask } from "@/application/task/use-cases/update-task";
import { updateTaskType } from "@/application/task/use-cases/update-task-type";
import type { TaskStatus } from "@/domain/task/entities/task";
import { drizzleTaskHistoryRepository } from "@/infrastructure/task/drizzle-task-history-repository";
import { drizzleTaskRepository } from "@/infrastructure/task/drizzle-task-repository";
import { drizzleTaskTypeRepository } from "@/infrastructure/task/drizzle-task-type-repository";

export function createTaskUseCases() {
	return {
		createTask: (input: CreateTaskInput) =>
			createTask(drizzleTaskRepository, drizzleTaskHistoryRepository, input),
		updateTask: (taskId: string, input: UpdateTaskInput) =>
			updateTask(drizzleTaskRepository, taskId, input),
		deleteTask: (taskId: string) => deleteTask(drizzleTaskRepository, taskId),
		moveTask: (taskId: string, toStatus: TaskStatus) =>
			moveTask(
				drizzleTaskRepository,
				drizzleTaskHistoryRepository,
				taskId,
				toStatus,
			),
		toggleBlocked: (taskId: string, blocked: boolean) =>
			toggleBlocked(
				drizzleTaskRepository,
				drizzleTaskHistoryRepository,
				taskId,
				blocked,
			),
		listTasksByTeam: (teamId: string) =>
			listTasksByTeam(drizzleTaskRepository, teamId),
		createTaskType: (name: string, color: string) =>
			createTaskType(drizzleTaskTypeRepository, name, color),
		updateTaskType: (typeId: string, name: string, color: string) =>
			updateTaskType(drizzleTaskTypeRepository, typeId, name, color),
		deleteTaskType: (typeId: string) =>
			deleteTaskType(drizzleTaskTypeRepository, drizzleTaskRepository, typeId),
		listTaskTypes: () =>
			listTaskTypes(drizzleTaskTypeRepository, drizzleTaskRepository),
	};
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npm run typecheck`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/composition/task.ts
git commit -m "feat(kanban)!: adiciona composition root de task"
```

---

### Task 14: Header — link "Tipos de task"

**Files:**
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Consumes: nada de novo (`currentTeam` já vem de `createTeamUseCases()`, já usado neste arquivo).
- Produces: link "Tipos de task" visível no header sempre que houver um time selecionado, navegável pela Task 15.

- [ ] **Step 1: Adicionar o link no header**

Em `src/app/layout.tsx`, adicionar o import de `Link` e envolver `TeamSwitcher` com o novo link:

```tsx
import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { createTeamUseCases } from "@/composition/team";
import { RootShell } from "@/presentation/shared/root-shell";
import { TeamSwitcher } from "@/presentation/team/team-switcher";

export const metadata: Metadata = {
	title: "Development Metrics",
	description: "Development Metrics",
};

export default async function RootLayout({
	children,
	modal,
}: {
	children: ReactNode;
	modal: ReactNode;
}) {
	const useCases = createTeamUseCases();
	const currentTeam = await useCases.getCurrentTeam();
	const teams = currentTeam ? await useCases.listTeams() : [];

	return (
		<RootShell>
			<header className="flex items-center justify-between bg-(--header-bg) px-6 py-4">
				<span className="font-semibold text-(--header-fg)">
					Development Metrics
				</span>
				{currentTeam ? (
					<div className="flex items-center gap-4">
						<Link
							href="/task-types"
							className="text-sm text-(--header-fg) hover:underline"
						>
							Tipos de task
						</Link>
						<TeamSwitcher currentTeam={currentTeam} teams={teams} />
					</div>
				) : null}
			</header>
			{children}
			{modal}
		</RootShell>
	);
}
```

- [ ] **Step 2: Verificar tipos e build**

Run: `npm run typecheck && npm run build`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat(kanban)!: adiciona link de tipos de task no header"
```

---

### Task 15: Tela `/task-types`

**Files:**
- Create: `src/presentation/task/task-type-list.tsx`
- Create: `src/presentation/task/task-type-form.tsx`
- Create: `src/app/task-types/actions.ts`
- Create: `src/app/task-types/page.tsx`

**Interfaces:**
- Consumes: `createTaskUseCases()` (Task 13), `createTeamUseCases()` (já existente), `TaskTypeWithUsage` (Task 3), `SubmitButton` (`@/presentation/shared/submit-button`, já existente).
- Produces: rota `/task-types` navegável pelo link do header (Task 14).

- [ ] **Step 1: Criar as Server Actions**

`src/app/task-types/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { createTaskUseCases } from "@/composition/task";

export async function createTaskTypeAction(formData: FormData) {
	const name = String(formData.get("name") ?? "");
	const color = String(formData.get("color") ?? "");
	const useCases = createTaskUseCases();
	await useCases.createTaskType(name, color);
	revalidatePath("/task-types");
}

export async function updateTaskTypeAction(
	typeId: string,
	formData: FormData,
) {
	const name = String(formData.get("name") ?? "");
	const color = String(formData.get("color") ?? "");
	const useCases = createTaskUseCases();
	await useCases.updateTaskType(typeId, name, color);
	revalidatePath("/task-types");
}

export async function deleteTaskTypeAction(typeId: string) {
	const useCases = createTaskUseCases();
	await useCases.deleteTaskType(typeId);
	revalidatePath("/task-types");
}
```

- [ ] **Step 2: Criar a lista de tipos**

`src/presentation/task/task-type-list.tsx`:

```tsx
import { Trash2 } from "lucide-react";
import type { TaskTypeWithUsage } from "@/application/task/use-cases/list-task-types";
import { SubmitButton } from "@/presentation/shared/submit-button";

type TaskTypeListProps = {
	taskTypes: TaskTypeWithUsage[];
	updateTaskTypeAction: (
		typeId: string,
		formData: FormData,
	) => void | Promise<void>;
	deleteTaskTypeAction: (typeId: string) => void | Promise<void>;
};

export function TaskTypeList({
	taskTypes,
	updateTaskTypeAction,
	deleteTaskTypeAction,
}: TaskTypeListProps) {
	if (taskTypes.length === 0) {
		return <p className="text-sm opacity-70">Nenhum tipo cadastrado ainda.</p>;
	}

	return (
		<ul className="flex flex-col gap-2">
			{taskTypes.map((taskType) => (
				<li key={taskType.id} className="flex items-center gap-2">
					<form
						action={updateTaskTypeAction.bind(null, taskType.id)}
						className="flex flex-1 items-center gap-2"
					>
						<input
							type="color"
							name="color"
							defaultValue={taskType.color}
							className="h-9 w-9 shrink-0 rounded border border-(--border)"
						/>
						<input
							name="name"
							defaultValue={taskType.name}
							className="flex-1 rounded-lg border border-(--border) px-2 py-1"
							required
						/>
						<SubmitButton className="rounded-lg border border-(--border) px-3 py-1.5 disabled:opacity-60">
							Salvar
						</SubmitButton>
					</form>
					<form action={deleteTaskTypeAction.bind(null, taskType.id)}>
						<SubmitButton
							aria-label="Excluir tipo"
							disabled={taskType.inUse}
							title={
								taskType.inUse
									? "Não é possível excluir: há tasks vinculadas a este tipo"
									: undefined
							}
							confirmMessage={`Excluir o tipo "${taskType.name}"?`}
							className="rounded-lg border border-(--border) p-1.5 disabled:opacity-40"
						>
							<Trash2 size={14} aria-hidden="true" />
						</SubmitButton>
					</form>
				</li>
			))}
		</ul>
	);
}
```

- [ ] **Step 3: Criar o formulário de novo tipo**

`src/presentation/task/task-type-form.tsx`:

```tsx
import { SubmitButton } from "@/presentation/shared/submit-button";

type TaskTypeFormProps = {
	createTaskTypeAction: (formData: FormData) => void | Promise<void>;
};

export function TaskTypeForm({ createTaskTypeAction }: TaskTypeFormProps) {
	return (
		<form action={createTaskTypeAction} className="flex flex-col gap-2">
			<p className="text-sm opacity-70">Novo tipo</p>
			<div className="flex items-center gap-2">
				<input
					type="color"
					name="color"
					defaultValue="#2563eb"
					className="h-9 w-9 shrink-0 rounded border border-(--border)"
				/>
				<input
					name="name"
					placeholder="Nome do tipo"
					className="flex-1 rounded-lg border border-(--border) px-3 py-2"
					required
				/>
			</div>
			<SubmitButton className="self-start rounded-lg bg-(--accent) px-4 py-2 text-(--accent-fg) disabled:opacity-60">
				Adicionar tipo
			</SubmitButton>
		</form>
	);
}
```

- [ ] **Step 4: Criar a página**

`src/app/task-types/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { createTaskUseCases } from "@/composition/task";
import { createTeamUseCases } from "@/composition/team";
import { TaskTypeForm } from "@/presentation/task/task-type-form";
import { TaskTypeList } from "@/presentation/task/task-type-list";
import {
	createTaskTypeAction,
	deleteTaskTypeAction,
	updateTaskTypeAction,
} from "./actions";

export default async function TaskTypesPage() {
	const teamUseCases = createTeamUseCases();
	const currentTeam = await teamUseCases.getCurrentTeam();
	if (!currentTeam) {
		redirect("/teams");
	}

	const taskUseCases = createTaskUseCases();
	const taskTypes = await taskUseCases.listTaskTypes();

	return (
		<main className="mx-auto flex max-w-md flex-col gap-6 p-6">
			<h1 className="text-xl font-semibold">Tipos de task</h1>
			<TaskTypeList
				taskTypes={taskTypes}
				updateTaskTypeAction={updateTaskTypeAction}
				deleteTaskTypeAction={deleteTaskTypeAction}
			/>
			<TaskTypeForm createTaskTypeAction={createTaskTypeAction} />
		</main>
	);
}
```

- [ ] **Step 5: Verificar o build**

Run: `npm run build`
Expected: build conclui sem erros. O comportamento fim-a-fim é validado na Task 20.

- [ ] **Step 6: Commit**

```bash
git add src/presentation/task/task-type-list.tsx src/presentation/task/task-type-form.tsx src/app/task-types/actions.ts src/app/task-types/page.tsx
git commit -m "feat(kanban)!: adiciona tela de gerenciamento de tipos de task"
```

---

### Task 16: `/board` — rótulos de status e mover task pelo select

**Files:**
- Create: `src/presentation/task/task-status-labels.ts`
- Create: `src/presentation/task/task-move-select.tsx`
- Create: `src/app/board/actions.ts`

**Interfaces:**
- Consumes: `createTaskUseCases()` (Task 13), `TaskStatus` (Task 1).
- Produces:
  - `STATUS_LABELS: Record<TaskStatus, string>` e `STATUS_ORDER: TaskStatus[]`, reutilizados pelas Tasks 17 e 18.
  - `moveTaskAction(taskId: string, status: TaskStatus): Promise<void>`, reutilizado pela Task 18 (`TaskCard`).
  - `<TaskMoveSelect taskId={string} currentStatus={TaskStatus} />`, usado pela Task 18.

- [ ] **Step 1: Criar os rótulos e a ordem das colunas**

`src/presentation/task/task-status-labels.ts`:

```ts
import type { TaskStatus } from "@/domain/task/entities/task";

export const STATUS_LABELS: Record<TaskStatus, string> = {
	TODO: "A Fazer",
	IN_DEVELOPMENT: "Em Desenvolvimento",
	CODE_REVIEW: "Code Review",
	DONE: "Concluído",
};

export const STATUS_ORDER: TaskStatus[] = [
	"TODO",
	"IN_DEVELOPMENT",
	"CODE_REVIEW",
	"DONE",
];
```

- [ ] **Step 2: Criar as Server Actions do board**

`src/app/board/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import type { CreateTaskInput } from "@/application/task/use-cases/create-task";
import type { UpdateTaskInput } from "@/application/task/use-cases/update-task";
import { createTaskUseCases } from "@/composition/task";
import type { TaskStatus } from "@/domain/task/entities/task";

export async function createTaskAction(input: CreateTaskInput) {
	const useCases = createTaskUseCases();
	await useCases.createTask(input);
	revalidatePath("/board");
}

export async function updateTaskAction(
	taskId: string,
	input: UpdateTaskInput,
) {
	const useCases = createTaskUseCases();
	await useCases.updateTask(taskId, input);
	revalidatePath("/board");
}

export async function deleteTaskAction(taskId: string) {
	const useCases = createTaskUseCases();
	await useCases.deleteTask(taskId);
	revalidatePath("/board");
}

export async function moveTaskAction(taskId: string, status: TaskStatus) {
	const useCases = createTaskUseCases();
	await useCases.moveTask(taskId, status);
	revalidatePath("/board");
}

export async function toggleBlockedAction(taskId: string, blocked: boolean) {
	const useCases = createTaskUseCases();
	await useCases.toggleBlocked(taskId, blocked);
	revalidatePath("/board");
}
```

`createTaskAction`/`updateTaskAction`/`deleteTaskAction`/`toggleBlockedAction` só passam a ser chamadas de fato na Task 17 (modal); esta task já as cria todas juntas porque vivem no mesmo arquivo que `moveTaskAction`.

- [ ] **Step 3: Criar o select de mover task**

`src/presentation/task/task-move-select.tsx`:

```tsx
"use client";

import { moveTaskAction } from "@/app/board/actions";
import type { TaskStatus } from "@/domain/task/entities/task";
import { STATUS_LABELS, STATUS_ORDER } from "@/presentation/task/task-status-labels";

type TaskMoveSelectProps = {
	taskId: string;
	currentStatus: TaskStatus;
};

export function TaskMoveSelect({ taskId, currentStatus }: TaskMoveSelectProps) {
	return (
		<select
			aria-label="Mover para"
			value={currentStatus}
			onChange={(event) => {
				moveTaskAction(taskId, event.target.value as TaskStatus);
			}}
			className="rounded-lg border border-(--border) px-2 py-1 text-sm"
		>
			{STATUS_ORDER.map((status) => (
				<option key={status} value={status}>
					{STATUS_LABELS[status]}
				</option>
			))}
		</select>
	);
}
```

- [ ] **Step 4: Verificar tipos**

Run: `npm run typecheck`
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add src/presentation/task/task-status-labels.ts src/presentation/task/task-move-select.tsx src/app/board/actions.ts
git commit -m "feat(kanban)!: adiciona select de mover task e actions do board"
```

---

### Task 17: `/board` — modal de criar/editar task

**Files:**
- Create: `src/presentation/task/task-form-modal.tsx`

**Interfaces:**
- Consumes: `createTaskAction`, `updateTaskAction`, `deleteTaskAction`, `toggleBlockedAction` (Task 16), `STATUS_LABELS` (Task 16), `Task`/`TaskStatus` (Task 1), `TaskType` (Task 1), `Member` (`@/domain/team/entities/member`, já existente).
- Produces: `<TaskFormModal mode="create" teamId taskTypes members />` e `<TaskFormModal mode="edit" task taskTypes members />`, usados pela Task 18 (`KanbanBoard` e `TaskCard`). Não é uma rota — todo o controle de abrir/fechar é local (`useState`), diferente do modal de time (que usa parallel/intercepting routes).

- [ ] **Step 1: Implementar o componente**

`src/presentation/task/task-form-modal.tsx`:

```tsx
"use client";

import { Pencil, Plus, X } from "lucide-react";
import { useState } from "react";
import {
	createTaskAction,
	deleteTaskAction,
	toggleBlockedAction,
	updateTaskAction,
} from "@/app/board/actions";
import type { Task, TaskStatus } from "@/domain/task/entities/task";
import type { TaskType } from "@/domain/task/entities/task-type";
import type { Member } from "@/domain/team/entities/member";
import { STATUS_LABELS, STATUS_ORDER } from "@/presentation/task/task-status-labels";

type TaskFormModalProps =
	| {
			mode: "create";
			teamId: string;
			taskTypes: TaskType[];
			members: Member[];
	  }
	| {
			mode: "edit";
			task: Task;
			taskTypes: TaskType[];
			members: Member[];
	  };

export function TaskFormModal(props: TaskFormModalProps) {
	const [open, setOpen] = useState(false);
	const [pending, setPending] = useState(false);
	const isEdit = props.mode === "edit";

	async function handleSubmit(formData: FormData) {
		const externalId = String(formData.get("externalId") ?? "");
		const description = String(formData.get("description") ?? "");
		const typeId = String(formData.get("typeId") ?? "");
		const assigneeIdValue = String(formData.get("assigneeId") ?? "");
		const assigneeId = assigneeIdValue === "" ? null : assigneeIdValue;
		const dueDateValue = String(formData.get("dueDate") ?? "");
		const dueDate = dueDateValue === "" ? null : dueDateValue;

		setPending(true);
		try {
			if (props.mode === "create") {
				const status = String(formData.get("status") ?? "TODO") as TaskStatus;
				await createTaskAction({
					externalId,
					description,
					typeId,
					assigneeId,
					dueDate,
					teamId: props.teamId,
					status,
				});
			} else {
				await updateTaskAction(props.task.id, {
					externalId,
					description,
					typeId,
					assigneeId,
					dueDate,
				});
			}
			setOpen(false);
		} catch (error) {
			window.alert(
				error instanceof Error ? error.message : "Erro ao salvar a task",
			);
		} finally {
			setPending(false);
		}
	}

	async function handleDelete() {
		if (props.mode !== "edit") {
			return;
		}
		const confirmed = window.confirm(
			`Excluir a task "${props.task.externalId}"? Essa ação não pode ser desfeita.`,
		);
		if (!confirmed) {
			return;
		}
		setPending(true);
		await deleteTaskAction(props.task.id);
		setOpen(false);
	}

	async function handleToggleBlocked() {
		if (props.mode !== "edit") {
			return;
		}
		setPending(true);
		await toggleBlockedAction(props.task.id, !props.task.blocked);
		setPending(false);
	}

	return (
		<>
			{isEdit ? (
				<button
					type="button"
					aria-label="Editar task"
					onClick={() => setOpen(true)}
					className="rounded-lg border border-(--border) p-1.5"
				>
					<Pencil size={14} aria-hidden="true" />
				</button>
			) : (
				<button
					type="button"
					onClick={() => setOpen(true)}
					className="flex items-center gap-1 rounded-lg bg-(--accent) px-4 py-2 text-(--accent-fg)"
				>
					<Plus size={16} aria-hidden="true" />
					Nova task
				</button>
			)}
			{open ? (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
					<button
						type="button"
						aria-label="Fechar"
						onClick={() => setOpen(false)}
						className="absolute inset-0 bg-black/50"
					/>
					<div className="relative z-10 max-h-[85vh] w-full max-w-md overflow-y-auto rounded-lg bg-(--background) p-6 shadow-xl">
						<button
							type="button"
							aria-label="Fechar"
							onClick={() => setOpen(false)}
							className="absolute top-3 right-3 rounded-lg p-1 hover:bg-black/5"
						>
							<X size={18} aria-hidden="true" />
						</button>
						<form action={handleSubmit} className="flex flex-col gap-4">
							<h2 className="text-xl font-semibold">
								{isEdit ? "Editar task" : "Nova task"}
							</h2>
							<div className="flex flex-col gap-2">
								<label htmlFor="externalId" className="text-sm opacity-70">
									Id externo
								</label>
								<input
									id="externalId"
									name="externalId"
									defaultValue={isEdit ? props.task.externalId : ""}
									className="rounded-lg border border-(--border) px-3 py-2"
									required
								/>
							</div>
							<div className="flex flex-col gap-2">
								<label htmlFor="description" className="text-sm opacity-70">
									Descrição
								</label>
								<textarea
									id="description"
									name="description"
									defaultValue={isEdit ? props.task.description : ""}
									className="rounded-lg border border-(--border) px-3 py-2"
									required
								/>
							</div>
							<div className="flex flex-col gap-2">
								<label htmlFor="typeId" className="text-sm opacity-70">
									Tipo
								</label>
								<select
									id="typeId"
									name="typeId"
									defaultValue={isEdit ? props.task.typeId : props.taskTypes[0]?.id}
									className="rounded-lg border border-(--border) px-3 py-2"
									required
								>
									{props.taskTypes.map((taskType) => (
										<option key={taskType.id} value={taskType.id}>
											{taskType.name}
										</option>
									))}
								</select>
							</div>
							<div className="flex flex-col gap-2">
								<label htmlFor="assigneeId" className="text-sm opacity-70">
									Responsável
								</label>
								<select
									id="assigneeId"
									name="assigneeId"
									defaultValue={isEdit ? (props.task.assigneeId ?? "") : ""}
									className="rounded-lg border border-(--border) px-3 py-2"
								>
									<option value="">Sem responsável</option>
									{props.members.map((member) => (
										<option key={member.id} value={member.id}>
											{member.name}
										</option>
									))}
								</select>
							</div>
							<div className="flex flex-col gap-2">
								<label htmlFor="dueDate" className="text-sm opacity-70">
									Data prevista de entrega
								</label>
								<input
									id="dueDate"
									type="date"
									name="dueDate"
									defaultValue={isEdit ? (props.task.dueDate ?? "") : ""}
									className="rounded-lg border border-(--border) px-3 py-2"
								/>
							</div>
							{!isEdit ? (
								<div className="flex flex-col gap-2">
									<label htmlFor="status" className="text-sm opacity-70">
										Coluna inicial
									</label>
									<select
										id="status"
										name="status"
										defaultValue="TODO"
										className="rounded-lg border border-(--border) px-3 py-2"
									>
										{STATUS_ORDER.map((status) => (
											<option key={status} value={status}>
												{STATUS_LABELS[status]}
											</option>
										))}
									</select>
								</div>
							) : null}
							{isEdit ? (
								<label className="flex items-center gap-2 text-sm">
									<input
										type="checkbox"
										checked={props.task.blocked}
										onChange={handleToggleBlocked}
										disabled={pending}
									/>
									⛔ Bloqueado
								</label>
							) : null}
							<button
								type="submit"
								disabled={pending}
								className="rounded-lg bg-(--accent) px-4 py-2 text-(--accent-fg) disabled:opacity-60"
							>
								Salvar
							</button>
							{isEdit ? (
								<button
									type="button"
									onClick={handleDelete}
									disabled={pending}
									className="rounded-lg bg-red-700 px-4 py-2 text-white disabled:opacity-60"
								>
									Excluir task
								</button>
							) : null}
						</form>
					</div>
				</div>
			) : null}
		</>
	);
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npm run typecheck`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/presentation/task/task-form-modal.tsx
git commit -m "feat(kanban)!: adiciona modal de criar e editar task"
```

---

### Task 18: `/board` — card, quadro e página

**Files:**
- Create: `src/presentation/task/task-card.tsx`
- Create: `src/presentation/task/kanban-board.tsx`
- Create: `src/app/board/page.tsx`

**Interfaces:**
- Consumes: `TaskFormModal` (Task 17), `TaskMoveSelect`, `STATUS_LABELS`, `STATUS_ORDER` (Task 16), `createTaskUseCases()` (Task 13), `createTeamUseCases()` (já existente).
- Produces: rota `/board`, navegável pelo redirect da Task 19.

- [ ] **Step 1: Criar o card de task**

`src/presentation/task/task-card.tsx`:

```tsx
import type { Task } from "@/domain/task/entities/task";
import type { TaskType } from "@/domain/task/entities/task-type";
import type { Member } from "@/domain/team/entities/member";
import { TaskFormModal } from "@/presentation/task/task-form-modal";
import { TaskMoveSelect } from "@/presentation/task/task-move-select";

type TaskCardProps = {
	task: Task;
	taskType: TaskType | undefined;
	assignee: Member | undefined;
	taskTypes: TaskType[];
	members: Member[];
};

export function TaskCard({
	task,
	taskType,
	assignee,
	taskTypes,
	members,
}: TaskCardProps) {
	return (
		<div
			title={taskType?.name}
			className="flex flex-col gap-2 rounded-lg border-l-4 bg-(--background) p-3 shadow-sm"
			style={{ borderLeftColor: taskType?.color ?? "#94a3b8" }}
		>
			<div className="flex items-start justify-between gap-2">
				<span className="font-mono text-xs opacity-70">{task.externalId}</span>
				<TaskFormModal
					mode="edit"
					task={task}
					taskTypes={taskTypes}
					members={members}
				/>
			</div>
			<p className="text-sm">{task.description}</p>
			<p className="text-xs opacity-70">
				{assignee ? assignee.name : "Sem responsável"}
			</p>
			{task.blocked ? (
				<p className="text-xs font-semibold text-red-600">⛔ Bloqueado</p>
			) : null}
			<TaskMoveSelect taskId={task.id} currentStatus={task.status} />
		</div>
	);
}
```

- [ ] **Step 2: Criar o quadro**

`src/presentation/task/kanban-board.tsx`:

```tsx
import type { TasksByStatus } from "@/application/task/use-cases/list-tasks-by-team";
import type { TaskType } from "@/domain/task/entities/task-type";
import type { Member } from "@/domain/team/entities/member";
import { TaskCard } from "@/presentation/task/task-card";
import { TaskFormModal } from "@/presentation/task/task-form-modal";
import { STATUS_LABELS, STATUS_ORDER } from "@/presentation/task/task-status-labels";

type KanbanBoardProps = {
	teamId: string;
	tasksByStatus: TasksByStatus;
	taskTypes: TaskType[];
	members: Member[];
};

export function KanbanBoard({
	teamId,
	tasksByStatus,
	taskTypes,
	members,
}: KanbanBoardProps) {
	const taskTypesById = new Map(taskTypes.map((taskType) => [taskType.id, taskType]));
	const membersById = new Map(members.map((member) => [member.id, member]));

	return (
		<div className="flex flex-1 flex-col gap-4 p-6">
			<div className="flex items-center justify-between">
				<h1 className="text-xl font-semibold">Quadro</h1>
				<TaskFormModal
					mode="create"
					teamId={teamId}
					taskTypes={taskTypes}
					members={members}
				/>
			</div>
			<div className="flex flex-1 gap-4 overflow-x-auto">
				{STATUS_ORDER.map((status, index) => (
					<div
						key={status}
						data-testid={`column-${status}`}
						className={`flex min-w-64 flex-1 flex-col gap-3 p-2 ${
							index > 0 ? "border-l border-(--border)" : ""
						}`}
					>
						<h2 className="text-sm font-semibold opacity-70">
							{STATUS_LABELS[status]}
						</h2>
						{tasksByStatus[status].map((task) => (
							<TaskCard
								key={task.id}
								task={task}
								taskType={taskTypesById.get(task.typeId)}
								assignee={
									task.assigneeId ? membersById.get(task.assigneeId) : undefined
								}
								taskTypes={taskTypes}
								members={members}
							/>
						))}
					</div>
				))}
			</div>
		</div>
	);
}
```

- [ ] **Step 3: Criar a página**

`src/app/board/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { createTaskUseCases } from "@/composition/task";
import { createTeamUseCases } from "@/composition/team";
import { KanbanBoard } from "@/presentation/task/kanban-board";

export default async function BoardPage() {
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

	return (
		<KanbanBoard
			teamId={currentTeam.id}
			tasksByStatus={tasksByStatus}
			taskTypes={taskTypes}
			members={members}
		/>
	);
}
```

- [ ] **Step 4: Verificar o build**

Run: `npm run build`
Expected: build conclui sem erros. O comportamento fim-a-fim é validado na Task 21.

- [ ] **Step 5: Commit**

```bash
git add src/presentation/task/task-card.tsx src/presentation/task/kanban-board.tsx src/app/board/page.tsx
git commit -m "feat(kanban)!: adiciona quadro kanban e pagina do board"
```

---

### Task 19: Redirecionar `/` para `/board`

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `tests/integration/team-selection.spec.ts`

**Interfaces:**
- Consumes: `createTeamUseCases()` (já existente).
- Produces: `/` deixa de renderizar um placeholder e passa a redirecionar para `/board` quando há time selecionado (e para `/teams` quando não há, comportamento já existente).

- [ ] **Step 1: Atualizar a home**

Substituir todo o conteúdo de `src/app/page.tsx` por:

```tsx
import { redirect } from "next/navigation";
import { createTeamUseCases } from "@/composition/team";

export default async function HomePage() {
	const useCases = createTeamUseCases();
	const currentTeam = await useCases.getCurrentTeam();
	if (!currentTeam) {
		redirect("/teams");
	}
	redirect("/board");
}
```

- [ ] **Step 2: Atualizar os testes E2E existentes que assumiam `/`**

Em `tests/integration/team-selection.spec.ts`, os testes 2 e 3 assumem que selecionar um time termina em `/` — agora terminam em `/board`. Substituir todo o conteúdo do arquivo por:

```ts
import { expect, test } from "@playwright/test";
import { resetDatabase } from "./reset-db";

test.beforeEach(async () => {
	await resetDatabase();
});

test("sem time selecionado, acessar / redireciona para /teams", async ({
	page,
}) => {
	await page.goto("/");
	await expect(page).toHaveURL("/teams");
	await expect(page.getByText("Nenhum time cadastrado ainda.")).toBeVisible();
});

test("criar e selecionar um time redireciona para /board e mostra o time no header", async ({
	page,
}) => {
	await page.goto("/teams");
	await page.getByPlaceholder("Nome do time").fill("Time A");
	await page.getByRole("button", { name: "Criar time" }).click();
	await page.getByRole("button", { name: "Time A" }).click();
	await expect(page).toHaveURL("/board");
	await expect(
		page.getByRole("button", { name: "Time A", exact: true }),
	).toBeVisible();
});

test("trocar de time pelo dropdown do header", async ({ page }) => {
	await page.goto("/teams");
	await page.getByPlaceholder("Nome do time").fill("Time A");
	await page.getByRole("button", { name: "Criar time" }).click();
	await expect(page.getByRole("button", { name: "Time A" })).toBeVisible();
	await page.getByPlaceholder("Nome do time").fill("Time B");
	await page.getByRole("button", { name: "Criar time" }).click();
	await expect(page.getByRole("button", { name: "Time B" })).toBeVisible();
	await page.getByRole("button", { name: "Time A" }).click();
	await expect(page).toHaveURL("/board");

	await page.getByRole("button", { name: "Time A", exact: true }).click();
	await page.getByRole("button", { name: "Time B" }).click();
	await expect(
		page.getByRole("button", { name: "Time B", exact: true }),
	).toBeVisible();
});
```

- [ ] **Step 3: Rodar a suíte E2E existente**

Run: `npm run test:e2e`
Expected: PASS — os 3 testes de `team-selection.spec.ts` e o `smoke.spec.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx tests/integration/team-selection.spec.ts
git commit -m "feat(kanban)!: redireciona raiz para o quadro kanban"
```

---

### Task 20: E2E — fluxo de tipos de task

**Files:**
- Create: `tests/integration/task-types.spec.ts`
- Modify: `playwright.config.ts`

**Interfaces:**
- Consumes: `resetDatabase()` (`./reset-db`, Task 9), rotas `/teams`, `/board`, `/task-types` (Tasks 15, 18, 19).
- Produces: nenhuma (teste final da tela de tipos).

- [ ] **Step 0: Serializar os workers do Playwright**

Com dois arquivos de teste chamando `resetDatabase()` contra o mesmo banco real (`smoke.spec.ts`/`team-selection.spec.ts` já existentes + este novo `task-types.spec.ts`), o Playwright passa a rodar arquivos diferentes em workers paralelos por padrão — `fullyParallel: false` só serializa testes dentro do mesmo arquivo. Um `TRUNCATE` de um arquivo pode atingir o banco no meio de um teste de outro arquivo. Em `playwright.config.ts`, adicionar `workers: 1`:

```ts
import { defineConfig } from "@playwright/test";

const TEST_DATABASE_URL =
	process.env.DATABASE_URL ??
	"postgresql://postgres:postgres@localhost:5432/development_metrics_test";
process.env.DATABASE_URL = TEST_DATABASE_URL;

export default defineConfig({
	testDir: "./tests/integration",
	fullyParallel: false,
	// Todos os arquivos compartilham o mesmo banco de testes real; sem isso,
	// arquivos diferentes rodam em workers paralelos e um `resetDatabase()`
	// pode truncar o banco no meio de um teste de outro arquivo.
	workers: 1,
	globalSetup: "./tests/integration/global-setup.ts",
	webServer: {
		command: "npm run dev -- --port 3100",
		url: "http://localhost:3100",
		reuseExistingServer: !process.env.CI,
		env: {
			DATABASE_URL: TEST_DATABASE_URL,
		},
	},
	use: {
		baseURL: "http://localhost:3100",
	},
});
```

- [ ] **Step 1: Escrever o teste**

`tests/integration/task-types.spec.ts`:

```ts
import { expect, test } from "@playwright/test";
import { resetDatabase } from "./reset-db";

test.beforeEach(async ({ page }) => {
	await resetDatabase();
	await page.goto("/teams");
	await page.getByPlaceholder("Nome do time").fill("Time A");
	await page.getByRole("button", { name: "Criar time" }).click();
	await page.getByRole("button", { name: "Time A" }).click();
	await page.getByRole("link", { name: "Tipos de task" }).click();
});

test("lista os tipos padrão e permite criar e editar um tipo", async ({
	page,
}) => {
	await expect(page).toHaveURL("/task-types");
	const names = await page
		.locator('input[name="name"]')
		.evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).value));
	expect(names).toEqual(
		expect.arrayContaining(["História", "Tarefa Técnica", "Bug"]),
	);

	await page.getByPlaceholder("Nome do tipo").fill("Épico");
	await page.getByRole("button", { name: "Adicionar tipo" }).click();

	const epicoRow = page
		.locator("li")
		.filter({ has: page.locator('input[value="Épico"]') });
	await expect(epicoRow).toBeVisible();

	const epicoNameInput = epicoRow.locator('input[name="name"]');
	await epicoNameInput.fill("Épico Grande");
	await epicoRow.getByRole("button", { name: "Salvar" }).click();
	await expect(epicoNameInput).toHaveValue("Épico Grande");
});

test("não permite excluir um tipo em uso por uma task", async ({ page }) => {
	await page.goto("/board");
	await page.getByRole("button", { name: "Nova task" }).click();
	await page.getByLabel("Id externo").fill("TASK-1");
	await page.getByLabel("Descrição").fill("Primeira task");
	await page.getByLabel("Tipo").selectOption({ label: "História" });
	await page.getByRole("button", { name: "Salvar" }).click();

	await page.getByRole("link", { name: "Tipos de task" }).click();
	const historiaRow = page
		.locator("li")
		.filter({ has: page.locator('input[value="História"]') });
	await expect(
		historiaRow.getByRole("button", { name: "Excluir tipo" }),
	).toBeDisabled();
});
```

- [ ] **Step 2: Rodar o teste**

Run: `npm run test:e2e`
Expected: PASS — 2 testes novos.

- [ ] **Step 3: Commit**

```bash
git add tests/integration/task-types.spec.ts
git commit -m "test(kanban)!: adiciona testes e2e de tipos de task"
```

---

### Task 21: E2E — fluxo do quadro Kanban

**Files:**
- Create: `tests/integration/kanban-board.spec.ts`

**Interfaces:**
- Consumes: `resetDatabase()` (`./reset-db`, Task 9), rotas `/teams`, `/board` (Tasks 18, 19).
- Produces: nenhuma (teste final do quadro).

- [ ] **Step 1: Escrever o teste**

`tests/integration/kanban-board.spec.ts`:

```ts
import { expect, test } from "@playwright/test";
import { resetDatabase } from "./reset-db";

test.beforeEach(async ({ page }) => {
	await resetDatabase();
	await page.goto("/teams");
	await page.getByPlaceholder("Nome do time").fill("Time A");
	await page.getByRole("button", { name: "Criar time" }).click();
	await page.getByRole("button", { name: "Time A" }).click();
});

test("criar uma task pelo modal a coloca na coluna escolhida", async ({
	page,
}) => {
	await expect(page).toHaveURL("/board");
	await page.getByRole("button", { name: "Nova task" }).click();
	await page.getByLabel("Id externo").fill("TASK-1");
	await page.getByLabel("Descrição").fill("Corrigir bug de login");
	await page.getByLabel("Tipo").selectOption({ label: "Bug" });
	await page
		.getByLabel("Coluna inicial")
		.selectOption({ label: "Code Review" });
	await page.getByRole("button", { name: "Salvar" }).click();

	await expect(
		page.getByTestId("column-CODE_REVIEW").getByText("TASK-1"),
	).toBeVisible();
});

test("mover uma task pelo select atualiza a coluna", async ({ page }) => {
	await page.getByRole("button", { name: "Nova task" }).click();
	await page.getByLabel("Id externo").fill("TASK-2");
	await page.getByLabel("Descrição").fill("Ajustar layout");
	await page.getByRole("button", { name: "Salvar" }).click();

	await expect(
		page.getByTestId("column-TODO").getByText("TASK-2"),
	).toBeVisible();

	await page
		.getByTestId("column-TODO")
		.getByRole("combobox", { name: "Mover para" })
		.selectOption({ label: "Em Desenvolvimento" });

	await expect(
		page.getByTestId("column-IN_DEVELOPMENT").getByText("TASK-2"),
	).toBeVisible();
});

test("a cor do tipo aparece na borda do card", async ({ page }) => {
	await page.getByRole("button", { name: "Nova task" }).click();
	await page.getByLabel("Id externo").fill("TASK-3");
	await page.getByLabel("Descrição").fill("Investigar lentidão");
	await page.getByLabel("Tipo").selectOption({ label: "Bug" });
	await page.getByRole("button", { name: "Salvar" }).click();

	const card = page.getByTitle("Bug").filter({ hasText: "TASK-3" });
	await expect(card).toHaveCSS("border-left-color", "rgb(220, 38, 38)");
});
```

- [ ] **Step 2: Rodar o teste**

Run: `npm run test:e2e`
Expected: PASS — 3 testes novos. Suíte completa de integração: `smoke` (1) + `team-selection` (3) + `task-types` (2) + `kanban-board` (3) = 9 testes.

- [ ] **Step 3: Rodar toda a verificação do projeto**

Run: `npm run typecheck && npm run lint && npm test && npm run knip`
Expected: todos passam sem erros. `knip` não deve acusar nenhum arquivo, export ou dependência não usados neste sub-projeto.

- [ ] **Step 4: Commit**

```bash
git add tests/integration/kanban-board.spec.ts
git commit -m "test(kanban)!: adiciona testes e2e do quadro kanban"
```

---
