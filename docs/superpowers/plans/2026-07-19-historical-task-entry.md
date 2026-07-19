# Cadastro Retroativo de Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir cadastrar um card já com uma sequência de etapas (status + data) no passado, reconstruindo o histórico, conforme `docs/superpowers/specs/2026-07-18-historical-task-entry-design.md`.

**Architecture:** Novo método `createWithExplicitHistory` no port `TaskRepository` (mesma forma de `createWithInitialHistory`, mas com histórico completo e `createdAt` explícito). Novo caso de uso `createHistoricalTask` reaproveitando as validações de referência já usadas por `createTask` via um helper extraído. UI: novo modal dirigido pelos mesmos `STATUS_ORDER`/`STATUS_LABELS`, sem tabela nem entidade de domínio novas.

**Tech Stack:** Next.js 16 (Server Actions), TypeScript strict, Drizzle ORM, Postgres 16, Vitest, Playwright.

## Global Constraints

- Fora de escopo: bloqueio retroativo (`TaskBlockedPeriod`). Depois de criado, o card só pode ser bloqueado com a ação existente, com data de "agora".
- Datas de etapa são "por dia" (sem horário), armazenadas como meia-noite UTC — reaproveitar `parseDateOnly` de `src/application/shared/validation.ts`.
- Nenhuma tabela, entidade de domínio ou port novo além do método de repositório listado abaixo.
- Após cada tarefa: teste focado, `npm run typecheck` e `npm run lint`.
- `README.md` é atualizado na mesma tarefa que muda o comportamento que ele documenta.
- Commits seguem `.githooks/commit-msg`, em português, um por tarefa.

---

### Task 1: Port e persistência — `createWithExplicitHistory`

**Files:**
- Modify: `src/application/task/ports/task-repository.ts`
- Modify: `src/infrastructure/task/drizzle-task-repository.ts`, `drizzle-task-repository.test.ts`
- Modify: `src/application/task/use-cases/test-helpers/create-fake-task-repository.ts`

**Interfaces:** Produces `createWithExplicitHistory(data: CreateTaskData, history: { status: TaskStatus; changedAt: Date }[]): Promise<Task>`.

- [ ] **Step 1: Escrever o teste Drizzle e confirmar a falha**

Adicionar a `drizzle-task-repository.test.ts`:

```ts
it("cria a task com createdAt explícito e uma transição por etapa", async () => {
	const created = await drizzleTaskRepository.createWithExplicitHistory(
		baseData({ status: "AWAITING_PUBLICATION" }),
		[
			{ status: "TODO", changedAt: new Date("2026-07-01T00:00:00Z") },
			{
				status: "IN_DEVELOPMENT",
				changedAt: new Date("2026-07-03T00:00:00Z"),
			},
			{
				status: "AWAITING_PUBLICATION",
				changedAt: new Date("2026-07-10T00:00:00Z"),
			},
		],
	);

	expect(created.createdAt).toEqual(new Date("2026-07-01T00:00:00Z"));
	expect(created.status).toBe("AWAITING_PUBLICATION");

	const history = await db
		.select()
		.from(taskStatusChanges)
		.where(eq(taskStatusChanges.taskId, created.id));
	expect(
		history
			.sort((a, b) => a.changedAt.getTime() - b.changedAt.getTime())
			.map(({ fromStatus, toStatus, changedAt }) => ({
				fromStatus,
				toStatus,
				changedAt,
			})),
	).toEqual([
		{
			fromStatus: null,
			toStatus: "TODO",
			changedAt: new Date("2026-07-01T00:00:00Z"),
		},
		{
			fromStatus: "TODO",
			toStatus: "IN_DEVELOPMENT",
			changedAt: new Date("2026-07-03T00:00:00Z"),
		},
		{
			fromStatus: "IN_DEVELOPMENT",
			toStatus: "AWAITING_PUBLICATION",
			changedAt: new Date("2026-07-10T00:00:00Z"),
		},
	]);
});
```

Run: `npm test -- src/infrastructure/task/drizzle-task-repository.test.ts`. Expected: FAIL (`createWithExplicitHistory` não existe no port nem na implementação — erro de tipo).

- [ ] **Step 2: Declarar o método no port**

```ts
// src/application/task/ports/task-repository.ts
export type TaskRepository = TaskUsageQuery & {
	createWithInitialHistory(data: CreateTaskData): Promise<Task>;
	createWithExplicitHistory(
		data: CreateTaskData,
		history: { status: TaskStatus; changedAt: Date }[],
	): Promise<Task>;
	moveWithHistory(taskId: string, toStatus: TaskStatus): Promise<Task>;
	// ...demais membros inalterados
};
```

- [ ] **Step 3: Implementar no Drizzle**

```ts
// src/infrastructure/task/drizzle-task-repository.ts
async createWithExplicitHistory(data, history) {
	return db.transaction(async (tx) => {
		const [row] = await tx
			.insert(tasks)
			.values({ ...data, status: history[0].status, createdAt: history[0].changedAt })
			.returning();
		let fromStatus: TaskStatus | null = null;
		for (const step of history) {
			await tx.insert(taskStatusChanges).values({
				taskId: row.id,
				fromStatus,
				toStatus: step.status,
				changedAt: step.changedAt,
			});
			fromStatus = step.status;
		}
		const [finalRow] = await tx
			.update(tasks)
			.set({ status: data.status })
			.where(eq(tasks.id, row.id))
			.returning();
		return toTask(finalRow);
	});
},
```

- [ ] **Step 4: Implementar no fake e rodar os testes**

```ts
// src/application/task/use-cases/test-helpers/create-fake-task-repository.ts
async createWithExplicitHistory(data, history) {
	const task: Task = {
		id: `task-${nextId++}`,
		...data,
		status: data.status,
		blocked: false,
		createdAt: history[0].changedAt,
		updatedAt: history[history.length - 1].changedAt,
	};
	tasks.push(task);
	let fromStatus: TaskStatus | null = null;
	for (const step of history) {
		statusChanges.push({
			id: `status-change-${nextId++}`,
			taskId: task.id,
			fromStatus,
			toStatus: step.status,
			changedAt: step.changedAt,
		});
		fromStatus = step.status;
	}
	return task;
},
```

Run: `npm test -- src/infrastructure/task/drizzle-task-repository.test.ts; npm run typecheck; npm run lint`. Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/application/task/ports/task-repository.ts src/infrastructure/task/drizzle-task-repository.ts src/infrastructure/task/drizzle-task-repository.test.ts src/application/task/use-cases/test-helpers/create-fake-task-repository.ts
git commit -m "feat(kanban)!: adiciona criacao de task com historico explicito"
```

### Task 2: Caso de uso `createHistoricalTask`

**Files:**
- Create: `src/application/task/validate-task-references.ts`
- Modify: `src/application/task/use-cases/create-task.ts` (usa o helper extraído; nenhuma mudança de comportamento)
- Create: `src/application/task/use-cases/create-historical-task.ts`, `create-historical-task.test.ts`

**Interfaces:** Produces `validateTaskReferences(repository, typeRepository, teamAccess, { teamId, typeId, assigneeId, dueDate, externalId }): Promise<void>` (lança `ApplicationError`). Produces `createHistoricalTask(repository, typeRepository, teamAccess, input: CreateHistoricalTaskInput): Promise<Task>` onde `CreateHistoricalTaskInput` tem `steps: { status: TaskStatus; date: string }[]`.

- [ ] **Step 1: Extrair a validação de referências compartilhada**

```ts
// src/application/task/validate-task-references.ts
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
		dueDate: string | null;
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
	if (input.dueDate !== null && !parseDateOnly(input.dueDate)) {
		throw new ApplicationError("Data prevista inválida");
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

Alterar `create-task.ts` para chamar o helper (mesma ordem, mesmas mensagens — nenhum caso de `create-task.test.ts` deve mudar):

```ts
export async function createTask(repository, typeRepository, teamAccess, input) {
	const externalId = input.externalId.trim();
	const description = input.description.trim();
	if (!externalId) throw new ApplicationError("Id externo não pode ser vazio");
	if (!description) throw new ApplicationError("Descrição não pode ser vazia");
	await validateTaskReferences(repository, typeRepository, teamAccess, {
		teamId: input.teamId,
		typeId: input.typeId,
		assigneeId: input.assigneeId,
		dueDate: input.dueDate,
		externalId,
	});
	return repository.createWithInitialHistory({
		externalId,
		description,
		typeId: input.typeId,
		assigneeId: input.assigneeId,
		teamId: input.teamId,
		status: input.status,
		dueDate: input.dueDate,
	});
}
```

Run: `npm test -- src/application/task/use-cases/create-task.test.ts`. Expected: PASS (comportamento idêntico).

- [ ] **Step 2: Escrever os testes do caso de uso novo e confirmar a falha**

```ts
// src/application/task/use-cases/create-historical-task.test.ts
import { describe, expect, it } from "vitest";
import { createHistoricalTask } from "./create-historical-task";
import { createFakeTaskRepository } from "./test-helpers/create-fake-task-repository";
import { createFakeTaskTypeRepository } from "./test-helpers/create-fake-task-type-repository";

const baseInput = {
	externalId: "TASK-1",
	description: "Migrar dados legados",
	typeId: "type-1",
	assigneeId: null,
	teamId: "team-1",
	dueDate: null,
};

async function setup() {
	const repository = createFakeTaskRepository();
	const typeRepository = createFakeTaskTypeRepository();
	const type = await typeRepository.create("Bug", "#dc2626");
	const teamAccess = {
		teamExists: async (teamId: string) => teamId === "team-1",
		memberBelongsToTeam: async (memberId: string, teamId: string) =>
			memberId === "member-1" && teamId === "team-1",
	};
	return {
		repository,
		typeRepository,
		teamAccess,
		input: { ...baseInput, typeId: type.id },
	};
}

describe("createHistoricalTask", () => {
	it("gera uma transição por etapa e usa a data da primeira como createdAt", async () => {
		const { repository, typeRepository, teamAccess, input } = await setup();
		const task = await createHistoricalTask(repository, typeRepository, teamAccess, {
			...input,
			steps: [
				{ status: "TODO", date: "2026-07-01" },
				{ status: "CODE_REVIEW", date: "2026-07-05" },
				{ status: "DONE", date: "2026-07-08" },
			],
		});

		expect(task.status).toBe("DONE");
		expect(task.createdAt).toEqual(new Date("2026-07-01T00:00:00Z"));
		expect(
			repository.statusChanges.map(({ fromStatus, toStatus }) => ({
				fromStatus,
				toStatus,
			})),
		).toEqual([
			{ fromStatus: null, toStatus: "TODO" },
			{ fromStatus: "TODO", toStatus: "CODE_REVIEW" },
			{ fromStatus: "CODE_REVIEW", toStatus: "DONE" },
		]);
	});

	it("permite pular etapas e parar sem chegar em DONE", async () => {
		const { repository, typeRepository, teamAccess, input } = await setup();
		const task = await createHistoricalTask(repository, typeRepository, teamAccess, {
			...input,
			steps: [
				{ status: "TODO", date: "2026-07-01" },
				{ status: "TESTING", date: "2026-07-04" },
			],
		});
		expect(task.status).toBe("TESTING");
	});

	it("rejeita lista de etapas vazia", async () => {
		const { repository, typeRepository, teamAccess, input } = await setup();
		await expect(
			createHistoricalTask(repository, typeRepository, teamAccess, {
				...input,
				steps: [],
			}),
		).rejects.toThrow("Informe ao menos uma etapa");
	});

	it("rejeita datas fora de ordem", async () => {
		const { repository, typeRepository, teamAccess, input } = await setup();
		await expect(
			createHistoricalTask(repository, typeRepository, teamAccess, {
				...input,
				steps: [
					{ status: "TODO", date: "2026-07-05" },
					{ status: "CODE_REVIEW", date: "2026-07-01" },
				],
			}),
		).rejects.toThrow("As datas das etapas devem estar em ordem crescente");
	});

	it("rejeita duas etapas seguidas com o mesmo status", async () => {
		const { repository, typeRepository, teamAccess, input } = await setup();
		await expect(
			createHistoricalTask(repository, typeRepository, teamAccess, {
				...input,
				steps: [
					{ status: "TODO", date: "2026-07-01" },
					{ status: "TODO", date: "2026-07-02" },
				],
			}),
		).rejects.toThrow("Duas etapas seguidas não podem ter o mesmo status");
	});

	it("reaproveita as validações de create-task (id externo duplicado)", async () => {
		const { repository, typeRepository, teamAccess, input } = await setup();
		const steps = [{ status: "TODO" as const, date: "2026-07-01" }];
		await createHistoricalTask(repository, typeRepository, teamAccess, {
			...input,
			steps,
		});
		await expect(
			createHistoricalTask(repository, typeRepository, teamAccess, {
				...input,
				steps,
			}),
		).rejects.toThrow(
			'Já existe uma task com o id externo "TASK-1" neste time',
		);
	});
});
```

Run: `npm test -- src/application/task/use-cases/create-historical-task.test.ts`. Expected: FAIL (módulo não existe).

- [ ] **Step 3: Implementar o caso de uso**

```ts
// src/application/task/use-cases/create-historical-task.ts
import { ApplicationError } from "@/application/shared/application-error";
import { parseDateOnly } from "@/application/shared/validation";
import type { TaskRepository } from "@/application/task/ports/task-repository";
import type { TaskTypeRepository } from "@/application/task/ports/task-type-repository";
import { validateTaskReferences } from "@/application/task/validate-task-references";
import type { TeamAccess } from "@/application/team/contracts/team-access";
import type { TaskStatus } from "@/domain/task/entities/task";

export type CreateHistoricalTaskInput = {
	externalId: string;
	description: string;
	typeId: string;
	assigneeId: string | null;
	teamId: string;
	dueDate: string | null;
	steps: { status: TaskStatus; date: string }[];
};

export async function createHistoricalTask(
	repository: TaskRepository,
	typeRepository: TaskTypeRepository,
	teamAccess: TeamAccess,
	input: CreateHistoricalTaskInput,
) {
	const externalId = input.externalId.trim();
	const description = input.description.trim();
	if (!externalId) {
		throw new ApplicationError("Id externo não pode ser vazio");
	}
	if (!description) {
		throw new ApplicationError("Descrição não pode ser vazia");
	}
	if (input.steps.length === 0) {
		throw new ApplicationError("Informe ao menos uma etapa");
	}
	const steps = input.steps.map((step) => {
		const changedAt = parseDateOnly(step.date);
		if (!changedAt) {
			throw new ApplicationError("Data de etapa inválida");
		}
		return { status: step.status, changedAt };
	});
	for (let i = 1; i < steps.length; i++) {
		if (steps[i].changedAt.getTime() < steps[i - 1].changedAt.getTime()) {
			throw new ApplicationError(
				"As datas das etapas devem estar em ordem crescente",
			);
		}
		if (steps[i].status === steps[i - 1].status) {
			throw new ApplicationError(
				"Duas etapas seguidas não podem ter o mesmo status",
			);
		}
	}
	await validateTaskReferences(repository, typeRepository, teamAccess, {
		teamId: input.teamId,
		typeId: input.typeId,
		assigneeId: input.assigneeId,
		dueDate: input.dueDate,
		externalId,
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
		},
		steps,
	);
}
```

- [ ] **Step 4: Rodar os testes, typecheck, lint e commit**

Run: `npm test -- src/application/task; npm run typecheck; npm run lint`. Expected: PASS.

```powershell
git add src/application/task/validate-task-references.ts src/application/task/use-cases/create-task.ts src/application/task/use-cases/create-historical-task.ts src/application/task/use-cases/create-historical-task.test.ts
git commit -m "feat(kanban)!: adiciona caso de uso de cadastro retroativo de card"
```

### Task 3: Regressão das métricas para card retroativo em andamento

**Files:**
- Modify: `src/application/metrics/use-cases/get-metrics-for-period.test.ts`

Nenhum código de produção novo: a spec pede confirmação de que as fórmulas existentes (que já dependem de um evento `→ DONE` no período para `throughput`/`leadTime`/`cycleTime`, e de uma transição de saída para `calculateTimeInStatus`) já se comportam corretamente para uma task retroativa "ainda em andamento".

- [ ] **Step 1: Escrever o teste**

```ts
it("card retroativo sem chegar em DONE conta no WIP mas nao em throughput/lead/cycle, e a etapa atual nao conta em tempo-em-status", () => {
	const snapshot: MetricsSnapshot = {
		completionEvents: [],
		statusChanges: [
			{
				taskId: "task-hist",
				fromStatus: null,
				toStatus: "TODO",
				changedAt: new Date("2026-07-01T00:00:00Z"),
			},
			{
				taskId: "task-hist",
				fromStatus: "TODO",
				toStatus: "TESTING",
				changedAt: new Date("2026-07-05T00:00:00Z"),
			},
		],
		blockedPeriods: [],
		dueDateTasks: [],
		wip: 1,
	};
	const metrics = getMetricsForRange(
		snapshot,
		new Date("2026-07-01T00:00:00Z"),
		new Date("2026-07-08T00:00:00Z"),
	);

	expect(metrics.throughput).toBe(0);
	expect(metrics.leadTime).toBeNull();
	expect(metrics.cycleTime).toBeNull();
});
```

Run: `npm test -- src/application/metrics/use-cases/get-metrics-for-period.test.ts`. Expected: PASS já na primeira execução (comportamento emergente das fórmulas existentes — a task não tem `completionEvents`, então nunca entra em `completedTasks`).

- [ ] **Step 2: Confirmar `calculateTimeInStatus` isoladamente**

Run: `npm test -- src/application/metrics/formulas/duration-metrics.test.ts` (já cobre "retorna zero para task que nunca passou pelo status informado" — mesma regra que faz a etapa atual, sem transição de saída, não contribuir).

- [ ] **Step 3: Commit**

```powershell
git add src/application/metrics/use-cases/get-metrics-for-period.test.ts
git commit -m "test(metricas)!: confirma comportamento de card retroativo em andamento"
```

### Task 4: Server Action, composição e modal

**Files:**
- Modify: `src/composition/task.ts`
- Modify: `src/app/board/actions.ts`
- Create: `src/presentation/task/historical-task-form-modal.tsx`
- Modify: `src/presentation/task/kanban-board.tsx`
- Modify: `src/app/board/page.tsx`

**Interfaces:** Produces `CreateHistoricalTaskActionInput` e `createHistoricalTaskAction(input): Promise<ActionState>`.

- [ ] **Step 1: Compor o caso de uso**

```ts
// src/composition/task.ts
import type { CreateHistoricalTaskInput } from "@/application/task/use-cases/create-historical-task";
import { createHistoricalTask } from "@/application/task/use-cases/create-historical-task";
```

```ts
createHistoricalTask: (input: CreateHistoricalTaskInput) =>
	createHistoricalTask(
		drizzleTaskRepository,
		drizzleTaskTypeRepository,
		drizzleTeamRepository,
		input,
	),
```

- [ ] **Step 2: Adicionar a Server Action**

```ts
// src/app/board/actions.ts
import type { TaskStatus } from "@/domain/task/entities/task";
import { isTaskStatus } from "@/domain/task/entities/task";
```

```ts
export type CreateHistoricalTaskActionInput = {
	externalId: string;
	description: string;
	typeId: string;
	assigneeId: string | null;
	dueDate: string | null;
	steps: { status: TaskStatus; date: string }[];
};

function validateSteps(
	steps: unknown,
): asserts steps is { status: TaskStatus; date: string }[] {
	if (!Array.isArray(steps) || steps.length === 0) {
		throw new ApplicationError("Informe ao menos uma etapa");
	}
	for (const step of steps) {
		const candidate = step as { status?: unknown; date?: unknown };
		if (!isTaskStatus(candidate.status) || typeof candidate.date !== "string") {
			throw new ApplicationError("Etapa inválida");
		}
	}
}

export async function createHistoricalTaskAction(
	input: CreateHistoricalTaskActionInput,
) {
	return runTaskAction(async () => {
		if (
			typeof input.externalId !== "string" ||
			typeof input.description !== "string"
		)
			throw new ApplicationError("Dados da task inválidos");
		validateUuid(input.typeId, "Tipo de task inválido");
		if (input.assigneeId !== null)
			validateUuid(input.assigneeId, "Responsável inválido");
		if (input.dueDate !== null && !parseDateOnly(input.dueDate))
			throw new ApplicationError("Data prevista inválida");
		validateSteps(input.steps);
		const teamId = await getCurrentTeamId();
		await createTaskUseCases().createHistoricalTask({
			externalId: input.externalId,
			description: input.description,
			typeId: input.typeId,
			assigneeId: input.assigneeId,
			teamId,
			dueDate: input.dueDate,
			steps: input.steps,
		});
	});
}
```

- [ ] **Step 3: Criar o modal**

```tsx
// src/presentation/task/historical-task-form-modal.tsx
"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import type { ActionState } from "@/application/shared/action-state";
import type { CreateHistoricalTaskActionInput } from "@/app/board/actions";
import type { TaskStatus } from "@/domain/task/entities/task";
import type { TaskType } from "@/domain/task/entities/task-type";
import type { Member } from "@/domain/team/entities/member";
import { Modal } from "@/presentation/shared/modal";
import {
	STATUS_LABELS,
	STATUS_ORDER,
} from "@/presentation/task/task-status-labels";

type Step = { status: TaskStatus; date: string };

type HistoricalTaskFormModalProps = {
	taskTypes: TaskType[];
	members: Member[];
	createHistoricalTaskAction: (
		input: CreateHistoricalTaskActionInput,
	) => Promise<ActionState>;
};

export function HistoricalTaskFormModal({
	taskTypes,
	members,
	createHistoricalTaskAction,
}: HistoricalTaskFormModalProps) {
	const [open, setOpen] = useState(false);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [steps, setSteps] = useState<Step[]>([{ status: "TODO", date: "" }]);

	function updateStep(index: number, patch: Partial<Step>) {
		setSteps((current) =>
			current.map((step, i) => (i === index ? { ...step, ...patch } : step)),
		);
	}

	async function handleSubmit(formData: FormData) {
		const externalId = String(formData.get("externalId") ?? "");
		const description = String(formData.get("description") ?? "");
		const typeId = String(formData.get("typeId") ?? "");
		const assigneeIdValue = String(formData.get("assigneeId") ?? "");
		const assigneeId = assigneeIdValue === "" ? null : assigneeIdValue;
		const dueDateValue = String(formData.get("dueDate") ?? "");
		const dueDate = dueDateValue === "" ? null : dueDateValue;

		setPending(true);
		setError(null);
		try {
			const result = await createHistoricalTaskAction({
				externalId,
				description,
				typeId,
				assigneeId,
				dueDate,
				steps,
			});
			if (result.error) {
				setError(result.error);
				return;
			}
			setOpen(false);
			setSteps([{ status: "TODO", date: "" }]);
		} catch {
			setError("Não foi possível concluir a operação");
		} finally {
			setPending(false);
		}
	}

	return (
		<>
			<button
				type="button"
				onClick={() => setOpen(true)}
				className="flex items-center gap-1 rounded-lg border border-(--border) px-4 py-2"
			>
				<Plus size={16} aria-hidden="true" />
				Card retroativo
			</button>
			{open ? (
				<Modal label="Card retroativo" onClose={() => setOpen(false)}>
					<form action={handleSubmit} className="flex flex-col gap-4">
						<h2 className="text-xl font-semibold">Card retroativo</h2>
						<div className="flex flex-col gap-2">
							<label htmlFor="hist-externalId" className="text-sm opacity-70">
								Id externo
							</label>
							<input
								id="hist-externalId"
								name="externalId"
								className="rounded-lg border border-(--border) px-3 py-2"
								required
							/>
						</div>
						<div className="flex flex-col gap-2">
							<label htmlFor="hist-description" className="text-sm opacity-70">
								Descrição
							</label>
							<textarea
								id="hist-description"
								name="description"
								className="rounded-lg border border-(--border) px-3 py-2"
								required
							/>
						</div>
						<div className="flex flex-col gap-2">
							<label htmlFor="hist-typeId" className="text-sm opacity-70">
								Tipo
							</label>
							<select
								id="hist-typeId"
								name="typeId"
								defaultValue={taskTypes[0]?.id}
								className="rounded-lg border border-(--border) px-3 py-2"
								required
							>
								{taskTypes.map((taskType) => (
									<option key={taskType.id} value={taskType.id}>
										{taskType.name}
									</option>
								))}
							</select>
						</div>
						<div className="flex flex-col gap-2">
							<label htmlFor="hist-assigneeId" className="text-sm opacity-70">
								Responsável
							</label>
							<select
								id="hist-assigneeId"
								name="assigneeId"
								defaultValue=""
								className="rounded-lg border border-(--border) px-3 py-2"
							>
								<option value="">Sem responsável</option>
								{members.map((member) => (
									<option key={member.id} value={member.id}>
										{member.name}
									</option>
								))}
							</select>
						</div>
						<div className="flex flex-col gap-2">
							<label htmlFor="hist-dueDate" className="text-sm opacity-70">
								Data prevista de entrega
							</label>
							<input
								id="hist-dueDate"
								type="date"
								name="dueDate"
								className="rounded-lg border border-(--border) px-3 py-2"
							/>
						</div>
						<div className="flex flex-col gap-2">
							<span className="text-sm opacity-70">Etapas</span>
							{steps.map((step, index) => (
								<div key={index} className="flex items-center gap-2">
									<select
										aria-label={`Status da etapa ${index + 1}`}
										value={step.status}
										onChange={(event) =>
											updateStep(index, {
												status: event.target.value as TaskStatus,
											})
										}
										className="rounded-lg border border-(--border) px-2 py-1"
									>
										{STATUS_ORDER.map((status) => (
											<option key={status} value={status}>
												{STATUS_LABELS[status]}
											</option>
										))}
									</select>
									<input
										aria-label={`Data da etapa ${index + 1}`}
										type="date"
										value={step.date}
										onChange={(event) =>
											updateStep(index, { date: event.target.value })
										}
										className="rounded-lg border border-(--border) px-2 py-1"
										required
									/>
									{steps.length > 1 ? (
										<button
											type="button"
											aria-label={`Remover etapa ${index + 1}`}
											onClick={() =>
												setSteps((current) =>
													current.filter((_, i) => i !== index),
												)
											}
											className="rounded-lg border border-(--border) p-1.5"
										>
											<X size={14} aria-hidden="true" />
										</button>
									) : null}
								</div>
							))}
							<button
								type="button"
								onClick={() =>
									setSteps((current) => [
										...current,
										{ status: "TODO", date: "" },
									])
								}
								className="self-start rounded-lg border border-(--border) px-3 py-1.5 text-sm"
							>
								+ Adicionar etapa
							</button>
						</div>
						{error ? <p role="alert">{error}</p> : null}
						<button
							type="submit"
							disabled={pending}
							className="rounded-lg bg-(--accent) px-4 py-2 text-(--accent-fg) disabled:opacity-60"
						>
							Salvar
						</button>
					</form>
				</Modal>
			) : null}
		</>
	);
}
```

- [ ] **Step 4: Renderizar o botão no quadro e passar a Action pela página**

```tsx
// src/presentation/task/kanban-board.tsx — no cabeçalho, ao lado de TaskFormModal
<div className="flex items-center gap-2">
	<HistoricalTaskFormModal
		taskTypes={taskTypes}
		members={members}
		createHistoricalTaskAction={createHistoricalTaskAction}
	/>
	<TaskFormModal
		mode="create"
		taskTypes={taskTypes}
		members={members}
		createTaskAction={createTaskAction}
	/>
</div>
```

Adicionar `createHistoricalTaskAction` a `KanbanBoardProps` e repassar em `app/board/page.tsx`, importando `createHistoricalTaskAction` de `@/app/board/actions`.

- [ ] **Step 5: Verificar e commit**

Run: `npm run typecheck; npm run lint`.

```powershell
git add src/composition/task.ts src/app/board/actions.ts src/presentation/task/historical-task-form-modal.tsx src/presentation/task/kanban-board.tsx src/app/board/page.tsx
git commit -m "feat(kanban)!: adiciona modal e action de cadastro retroativo de card"
```

### Task 5: E2E e README

**Files:**
- Modify: `tests/integration/kanban-board.spec.ts`
- Modify: `tests/integration/metrics-dashboard.spec.ts`
- Modify: `README.md`

- [ ] **Step 1: Escrever os E2E e confirmar a falha**

Em `kanban-board.spec.ts`:

```ts
test("cadastro retroativo cria o card já na coluna da última etapa", async ({
	page,
}) => {
	await page.getByRole("button", { name: "Card retroativo" }).click();
	await page.getByLabel("Id externo").fill("TASK-HIST-1");
	await page.getByLabel("Descrição").fill("Migração legada");
	await page.getByLabel("Status da etapa 1").selectOption({ label: "A Fazer" });
	await page.getByLabel("Data da etapa 1").fill("2026-07-01");
	await page.getByRole("button", { name: "+ Adicionar etapa" }).click();
	await page
		.getByLabel("Status da etapa 2")
		.selectOption({ label: "Code Review" });
	await page.getByLabel("Data da etapa 2").fill("2026-07-05");
	await page.getByRole("button", { name: "Salvar" }).click();

	await expect(
		page.getByTestId("column-CODE_REVIEW").getByText("TASK-HIST-1"),
	).toBeVisible();
});
```

Em `metrics-dashboard.spec.ts`:

```ts
test("card retroativo concluído hoje entra no throughput da semana", async ({
	page,
}) => {
	const today = new Date().toISOString().slice(0, 10);
	await page.getByRole("button", { name: "Card retroativo" }).click();
	await page.getByLabel("Id externo").fill("TASK-HIST-1");
	await page.getByLabel("Descrição").fill("Migração legada");
	await page.getByLabel("Status da etapa 1").selectOption({ label: "A Fazer" });
	await page.getByLabel("Data da etapa 1").fill(today);
	await page.getByRole("button", { name: "+ Adicionar etapa" }).click();
	await page
		.getByLabel("Status da etapa 2")
		.selectOption({ label: "Concluído" });
	await page.getByLabel("Data da etapa 2").fill(today);
	await page.getByRole("button", { name: "Salvar" }).click();

	await page.getByRole("link", { name: "Métricas" }).click();
	const throughputCard = page.getByTestId("metric-card-throughput");
	await expect(throughputCard.getByText("1")).toBeVisible();
});
```

Run: `npm run test:e2e -- tests/integration/kanban-board.spec.ts tests/integration/metrics-dashboard.spec.ts`. Expected: FAIL (botão/modal ainda não existem quando este passo roda antes da Task 4; se executado depois da Task 4, confirmar que passam já de primeira e ajustar seletores conforme a run real).

- [ ] **Step 2: Rodar novamente após a Task 4 e ajustar se necessário**

Run: mesmo comando acima. Expected: PASS.

- [ ] **Step 3: Atualizar README e commit**

Em `README.md`, seção "Funcionalidades": acrescentar — "Cadastro retroativo de card: monta uma sequência de etapas (status + data) para reconstruir o histórico de um card já existente fora do app; a task nasce com `createdAt` da primeira etapa e status da última."

```powershell
git add tests/integration/kanban-board.spec.ts tests/integration/metrics-dashboard.spec.ts README.md
git commit -m "test(kanban)!: adiciona e2e do cadastro retroativo de card"
```

### Final Verification

Run:

```powershell
npm run typecheck
npm run lint
npm run knip
npm test
npm run build
npm run test:e2e
```

Expected: todos os gates exit 0.
