# PIs e Sprints — Ciclo de vida da sprint (iniciar/finalizar, overflow, histórico) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir iniciar e finalizar uma sprint no quadro. Ao finalizar: congela um snapshot de métricas e de todas as tasks da sprint (com flag de transbordo), move as tasks não concluídas para a próxima sprint planejada (ou desassocia, se não houver), e disponibiliza uma visão histórica read-only da sprint fechada no quadro.

**Architecture:** Duas novas tabelas no contexto `sprint` (`sprint_task_snapshots`, `sprint_metrics_snapshots`), sem FK para `tasks`/`task_types` (cross-context). O cálculo de métricas do snapshot reaproveita diretamente `getMetricsForRange` e `MetricsQueryPort`, já públicos na camada de aplicação do contexto `metrics` — não crio um novo port só para isso, seria uma abstração sem segunda implementação. `finishSprint` é o único use-case com efeito colateral amplo (grava 2 snapshots, atualiza N tasks, fecha a sprint); os demais são operações pontuais.

**Tech Stack:** Next.js App Router, TypeScript estrito, Drizzle ORM (jsonb para o snapshot de métricas), Vitest, Biome, Tailwind.

## Global Constraints

- Todas as dos planos anteriores continuam valendo (ver `2026-07-23-pi-sprints-fundacao.md` e `2026-07-23-pi-sprints-atribuicao-quadro.md`): `kebab-case`, `ApplicationError`, `parseDateOnly`, fakes in-memory em `application`, testes de `infrastructure` contra Postgres real, commits `tipo(sprints)!: descrição`.
- Este plano assume os dois planos anteriores implementados: `ProgramIncrement`/`Sprint` cadastráveis, `tasks.sprint_id`, atribuição de card no modal, visão "Por sprint" no quadro.
- `sprint_task_snapshots.task_id`/`type_id` e `sprint_metrics_snapshots` não têm FK para tabelas de outro contexto — mesmo padrão de `tasks.team_id`.
- O snapshot de métricas é gravado em `jsonb`; ao ser lido de volta, `Date` vira string (serialização JSON padrão). Isso é aceitável porque o snapshot é só leitura histórica — a exibição desses números fica para um plano futuro (filtro de sprint nas métricas), que trata os valores como já formatados, não como `Date` vivas.
- Só uma sprint `ACTIVE` por time por vez (regra já estabelecida na fundação). `startSprint` resolve automaticamente qual sprint iniciar (a `PLANNED` de `startDate` mais próxima) — não há seleção manual pelo usuário.
- Fora de escopo: exibir os números do snapshot de métricas na UI (só a gravação, aqui); filtro de sprint na tela de métricas; reabrir ou editar sprint `CLOSED`.

---

## File Structure

```
src/domain/sprint/entities/sprint-task-snapshot.ts                        (novo)

src/application/sprint/ports/sprint-task-snapshot-repository.ts           (novo)
src/application/sprint/ports/sprint-metrics-snapshot-repository.ts        (novo)
src/application/sprint/use-cases/start-sprint.ts                          (novo)
src/application/sprint/use-cases/start-sprint.test.ts                     (novo)
src/application/sprint/use-cases/finish-sprint.ts                         (novo)
src/application/sprint/use-cases/finish-sprint.test.ts                    (novo)
src/application/sprint/use-cases/get-sprint-history.ts                    (novo)
src/application/sprint/use-cases/get-sprint-history.test.ts               (novo)
src/application/sprint/use-cases/test-helpers/create-fake-sprint-task-snapshot-repository.ts     (novo)
src/application/sprint/use-cases/test-helpers/create-fake-sprint-metrics-snapshot-repository.ts  (novo)

src/application/task/ports/task-repository.ts                             (modificado)
src/application/task/use-cases/test-helpers/create-fake-task-repository.ts (modificado)
src/application/sprint/ports/sprint-repository.ts                         (modificado)
src/application/sprint/use-cases/test-helpers/create-fake-sprint-repository.ts (modificado)

src/infrastructure/sprint/drizzle/schema.ts                               (modificado)
src/infrastructure/sprint/drizzle-sprint-repository.ts                    (modificado)
src/infrastructure/sprint/drizzle-sprint-repository.test.ts               (modificado)
src/infrastructure/sprint/drizzle-sprint-task-snapshot-repository.ts      (novo)
src/infrastructure/sprint/drizzle-sprint-task-snapshot-repository.test.ts (novo)
src/infrastructure/sprint/drizzle-sprint-metrics-snapshot-repository.ts   (novo)
src/infrastructure/sprint/drizzle-sprint-metrics-snapshot-repository.test.ts (novo)
src/infrastructure/task/drizzle-task-repository.ts                        (modificado)
src/infrastructure/task/drizzle-task-repository.test.ts                   (modificado)

src/composition/sprint.ts                                                 (modificado)

src/app/board/actions.ts                                                  (modificado)
src/app/board/page.tsx                                                    (modificado)

src/presentation/task/sprint-lifecycle-control.tsx                        (novo)
src/presentation/task/sprint-history-board.tsx                            (novo)
src/presentation/task/kanban-board.tsx                                    (modificado)
```

---

### Task 1: Entidade `SprintTaskSnapshot`

**Files:**
- Create: `src/domain/sprint/entities/sprint-task-snapshot.ts`

**Interfaces:**
- Consumes: `TaskStatus` de `src/domain/task/entities/task.ts`.
- Produces: `SprintTaskSnapshot`.

- [ ] **Step 1: Criar a entidade**

```ts
// src/domain/sprint/entities/sprint-task-snapshot.ts
import type { TaskStatus } from "@/domain/task/entities/task";

export type SprintTaskSnapshot = {
	id: string;
	sprintId: string;
	taskId: string;
	externalId: string;
	description: string;
	typeId: string;
	assigneeId: string | null;
	statusAtFreeze: TaskStatus;
	carriedOver: boolean;
};
```

- [ ] **Step 2: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/domain/sprint/entities/sprint-task-snapshot.ts
git commit -m "feat(sprints)!: adiciona entidade sprinttasksnapshot"
```

---

### Task 2: Tabelas de snapshot + `sprint_id` em `tasks.listBySprint`

**Files:**
- Modify: `src/infrastructure/sprint/drizzle/schema.ts`

**Interfaces:**
- Produces: tabelas `sprint_task_snapshots`, `sprint_metrics_snapshots`.

- [ ] **Step 1: Adicionar os imports necessários**

```ts
// src/infrastructure/sprint/drizzle/schema.ts — trocar o import de drizzle-orm/pg-core por:
import {
	boolean,
	check,
	date,
	index,
	jsonb,
	pgTable,
	text,
	uuid,
} from "drizzle-orm/pg-core";
```

- [ ] **Step 2: Adicionar as duas tabelas ao final do arquivo**

```ts
// src/infrastructure/sprint/drizzle/schema.ts — adicionar ao final:
export const sprintTaskSnapshots = pgTable(
	"sprint_task_snapshots",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		sprintId: uuid("sprint_id")
			.notNull()
			.references(() => sprints.id, { onDelete: "cascade" }),
		// taskId e typeId sem FK: referências ao contexto `task`, que não se
		// acopla a `sprint` a nível de schema (mesmo padrão de tasks.team_id).
		taskId: uuid("task_id").notNull(),
		externalId: text("external_id").notNull(),
		description: text("description").notNull(),
		typeId: uuid("type_id").notNull(),
		assigneeId: uuid("assignee_id"),
		statusAtFreeze: text("status_at_freeze").notNull(),
		carriedOver: boolean("carried_over").notNull().default(false),
	},
	(table) => [
		index("sprint_task_snapshots_sprint_id_idx").on(table.sprintId),
	],
);

export const sprintMetricsSnapshots = pgTable("sprint_metrics_snapshots", {
	sprintId: uuid("sprint_id")
		.primaryKey()
		.references(() => sprints.id, { onDelete: "cascade" }),
	metrics: jsonb("metrics").notNull(),
});
```

- [ ] **Step 3: Gerar e aplicar a migration**

Run: `npm run db:generate`
Expected: novo arquivo em `drizzle/migrations/` criando as duas tabelas.

Run: `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/development_metrics_test" npm run db:migrate`
Expected: `migrations applied successfully!`.

- [ ] **Step 4: Commit**

```bash
git add src/infrastructure/sprint/drizzle/schema.ts drizzle/migrations
git commit -m "feat(sprints)!: adiciona tabelas de snapshot de sprint"
```

---

### Task 3: `SprintRepository.updateStatus`

**Files:**
- Modify: `src/application/sprint/ports/sprint-repository.ts`
- Modify: `src/application/sprint/use-cases/test-helpers/create-fake-sprint-repository.ts`
- Modify: `src/infrastructure/sprint/drizzle-sprint-repository.ts`
- Modify: `src/infrastructure/sprint/drizzle-sprint-repository.test.ts`

**Interfaces:**
- Produces: `SprintRepository.updateStatus(sprintId: string, status: SprintStatus): Promise<Sprint>`.

- [ ] **Step 1: Adicionar o teste de integração**

Adicionar ao final de `describe("drizzleSprintRepository", ...)` em `src/infrastructure/sprint/drizzle-sprint-repository.test.ts` (antes do `});` final):

```ts
	it("atualiza o status da sprint", async () => {
		const pi = await seedPi();
		try {
			const created = await drizzleSprintRepository.create({
				piId: pi.id,
				teamId,
				name: "Sprint 1",
				startDate: "2026-07-01",
				endDate: "2026-07-14",
			});
			const updated = await drizzleSprintRepository.updateStatus(
				created.id,
				"ACTIVE",
			);
			expect(updated.status).toBe("ACTIVE");
		} finally {
			await deletePi(pi.id);
		}
	});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest run src/infrastructure/sprint/drizzle-sprint-repository.test.ts`
Expected: FAIL — `drizzleSprintRepository.updateStatus is not a function`.

- [ ] **Step 3: Adicionar `updateStatus` ao port**

```ts
// src/application/sprint/ports/sprint-repository.ts
import type { Sprint, SprintStatus } from "@/domain/sprint/entities/sprint";

export type CreateSprintData = {
	piId: string;
	teamId: string;
	name: string;
	startDate: string;
	endDate: string;
};

export type SprintRepository = {
	create(data: CreateSprintData): Promise<Sprint>;
	listByPi(piId: string): Promise<Sprint[]>;
	listByTeam(teamId: string): Promise<Sprint[]>;
	findById(id: string): Promise<Sprint | null>;
	updateStatus(sprintId: string, status: SprintStatus): Promise<Sprint>;
};
```

- [ ] **Step 4: Implementar no fake**

```ts
// src/application/sprint/use-cases/test-helpers/create-fake-sprint-repository.ts
import { ApplicationError } from "@/application/shared/application-error";
import type {
	CreateSprintData,
	SprintRepository,
} from "@/application/sprint/ports/sprint-repository";
import type { Sprint } from "@/domain/sprint/entities/sprint";

export function createFakeSprintRepository(): SprintRepository {
	const sprints: Sprint[] = [];
	let nextId = 1;

	return {
		async create(data: CreateSprintData) {
			const sprint: Sprint = {
				id: `sprint-${nextId++}`,
				status: "PLANNED",
				...data,
			};
			sprints.push(sprint);
			return sprint;
		},
		async listByPi(piId) {
			return sprints.filter((sprint) => sprint.piId === piId);
		},
		async listByTeam(teamId) {
			return sprints.filter((sprint) => sprint.teamId === teamId);
		},
		async findById(id) {
			return sprints.find((sprint) => sprint.id === id) ?? null;
		},
		async updateStatus(sprintId, status) {
			const sprint = sprints.find((item) => item.id === sprintId);
			if (!sprint) throw new ApplicationError("Sprint não encontrada");
			sprint.status = status;
			return sprint;
		},
	};
}
```

- [ ] **Step 5: Implementar no Drizzle**

```ts
// src/infrastructure/sprint/drizzle-sprint-repository.ts — adicionar ao objeto exportado:
	async updateStatus(id, status) {
		const [row] = await db
			.update(sprints)
			.set({ status })
			.where(eq(sprints.id, id))
			.returning();
		if (!row) throw new Error("Sprint não encontrada");
		return toSprint(row);
	},
```

- [ ] **Step 6: Rodar o teste e confirmar que passa**

Run: `npx vitest run src/infrastructure/sprint/drizzle-sprint-repository.test.ts`
Expected: PASS (todos, incluindo o novo).

- [ ] **Step 7: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 8: Commit**

```bash
git add src/application/sprint/ports/sprint-repository.ts src/application/sprint/use-cases/test-helpers/create-fake-sprint-repository.ts src/infrastructure/sprint/drizzle-sprint-repository.ts src/infrastructure/sprint/drizzle-sprint-repository.test.ts
git commit -m "feat(sprints)!: adiciona updatestatus ao sprintrepository"
```

---

### Task 4: `TaskRepository.listBySprint`

**Files:**
- Modify: `src/application/task/ports/task-repository.ts`
- Modify: `src/application/task/use-cases/test-helpers/create-fake-task-repository.ts`
- Modify: `src/infrastructure/task/drizzle-task-repository.ts`
- Modify: `src/infrastructure/task/drizzle-task-repository.test.ts`

**Interfaces:**
- Produces: `TaskRepository.listBySprint(sprintId: string): Promise<Task[]>`.

- [ ] **Step 1: Adicionar o teste de integração**

Adicionar ao final de `describe("drizzleTaskRepository", ...)` em `src/infrastructure/task/drizzle-task-repository.test.ts` (antes do `});` final):

```ts
	it("lista as tasks de uma sprint", async () => {
		const sprintId = "44444444-4444-4444-4444-444444444444";
		const created = await drizzleTaskRepository.createWithInitialHistory(
			baseData({ sprintId }),
		);
		await drizzleTaskRepository.createWithInitialHistory(
			baseData({ externalId: "TASK-2", sprintId: null }),
		);
		expect(await drizzleTaskRepository.listBySprint(sprintId)).toEqual([
			created,
		]);
	});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest run src/infrastructure/task/drizzle-task-repository.test.ts`
Expected: FAIL — `drizzleTaskRepository.listBySprint is not a function`.

- [ ] **Step 3: Adicionar ao port**

```ts
// src/application/task/ports/task-repository.ts — adicionar à assinatura de TaskRepository,
// logo após `listByTeam(teamId: string): Promise<Task[]>;`:
	listBySprint(sprintId: string): Promise<Task[]>;
```

- [ ] **Step 4: Implementar no fake**

```ts
// src/application/task/use-cases/test-helpers/create-fake-task-repository.ts — adicionar
// ao objeto retornado, logo após `async listByTeam(teamId) { ... }`:
		async listBySprint(sprintId) {
			return tasks.filter((task) => task.sprintId === sprintId);
		},
```

- [ ] **Step 5: Implementar no Drizzle**

```ts
// src/infrastructure/task/drizzle-task-repository.ts — adicionar ao objeto exportado,
// logo após `async listByTeam(teamId) { ... }`:
	async listBySprint(sprintId: string) {
		const rows = await db
			.select()
			.from(tasks)
			.where(eq(tasks.sprintId, sprintId));
		return rows.map(toTask);
	},
```

- [ ] **Step 6: Rodar o teste e confirmar que passa**

Run: `npx vitest run src/infrastructure/task/drizzle-task-repository.test.ts`
Expected: PASS (todos, incluindo o novo).

- [ ] **Step 7: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 8: Commit**

```bash
git add src/application/task/ports/task-repository.ts src/application/task/use-cases/test-helpers/create-fake-task-repository.ts src/infrastructure/task/drizzle-task-repository.ts src/infrastructure/task/drizzle-task-repository.test.ts
git commit -m "feat(sprints)!: adiciona listbysprint ao taskrepository"
```

---

### Task 5: `SprintTaskSnapshotRepository`

**Files:**
- Create: `src/application/sprint/ports/sprint-task-snapshot-repository.ts`
- Create: `src/application/sprint/use-cases/test-helpers/create-fake-sprint-task-snapshot-repository.ts`
- Create: `src/infrastructure/sprint/drizzle-sprint-task-snapshot-repository.ts`
- Create: `src/infrastructure/sprint/drizzle-sprint-task-snapshot-repository.test.ts`

**Interfaces:**
- Consumes: `SprintTaskSnapshot` (Task 1); `sprintTaskSnapshots` (Task 2).
- Produces: `CreateSprintTaskSnapshotData`, `SprintTaskSnapshotRepository = { createMany(data): Promise<void>; listBySprint(sprintId): Promise<SprintTaskSnapshot[]> }`, `drizzleSprintTaskSnapshotRepository`, `createFakeSprintTaskSnapshotRepository()`.

- [ ] **Step 1: Criar a port**

```ts
// src/application/sprint/ports/sprint-task-snapshot-repository.ts
import type { SprintTaskSnapshot } from "@/domain/sprint/entities/sprint-task-snapshot";
import type { TaskStatus } from "@/domain/task/entities/task";

export type CreateSprintTaskSnapshotData = {
	sprintId: string;
	taskId: string;
	externalId: string;
	description: string;
	typeId: string;
	assigneeId: string | null;
	statusAtFreeze: TaskStatus;
	carriedOver: boolean;
};

export type SprintTaskSnapshotRepository = {
	createMany(data: CreateSprintTaskSnapshotData[]): Promise<void>;
	listBySprint(sprintId: string): Promise<SprintTaskSnapshot[]>;
};
```

- [ ] **Step 2: Criar o fake**

```ts
// src/application/sprint/use-cases/test-helpers/create-fake-sprint-task-snapshot-repository.ts
import type {
	CreateSprintTaskSnapshotData,
	SprintTaskSnapshotRepository,
} from "@/application/sprint/ports/sprint-task-snapshot-repository";
import type { SprintTaskSnapshot } from "@/domain/sprint/entities/sprint-task-snapshot";

export function createFakeSprintTaskSnapshotRepository(): SprintTaskSnapshotRepository {
	const snapshots: SprintTaskSnapshot[] = [];
	let nextId = 1;

	return {
		async createMany(data: CreateSprintTaskSnapshotData[]) {
			for (const item of data) {
				snapshots.push({ id: `snapshot-${nextId++}`, ...item });
			}
		},
		async listBySprint(sprintId) {
			return snapshots.filter((snapshot) => snapshot.sprintId === sprintId);
		},
	};
}
```

- [ ] **Step 3: Escrever o teste de integração**

```ts
// src/infrastructure/sprint/drizzle-sprint-task-snapshot-repository.test.ts
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/infrastructure/db/client";
import { programIncrements, sprints } from "./drizzle/schema";
import { drizzleSprintTaskSnapshotRepository } from "./drizzle-sprint-task-snapshot-repository";

const teamId = "00000000-0000-0000-0000-000000000004";

async function seedSprint() {
	const [pi] = await db
		.insert(programIncrements)
		.values({
			teamId,
			name: "PI 2026.3",
			startDate: "2026-07-01",
			endDate: "2026-09-30",
		})
		.returning();
	const [sprint] = await db
		.insert(sprints)
		.values({
			piId: pi.id,
			teamId,
			name: "Sprint 1",
			startDate: "2026-07-01",
			endDate: "2026-07-14",
		})
		.returning();
	return { pi, sprint };
}

async function deletePi(id: string) {
	await db.delete(programIncrements).where(eq(programIncrements.id, id));
}

describe("drizzleSprintTaskSnapshotRepository", () => {
	it("grava e lista snapshots de task de uma sprint", async () => {
		const { pi, sprint } = await seedSprint();
		try {
			await drizzleSprintTaskSnapshotRepository.createMany([
				{
					sprintId: sprint.id,
					taskId: "11111111-1111-1111-1111-111111111111",
					externalId: "TASK-1",
					description: "Corrigir bug de login",
					typeId: "22222222-2222-2222-2222-222222222222",
					assigneeId: null,
					statusAtFreeze: "CODE_REVIEW",
					carriedOver: true,
				},
			]);
			const list = await drizzleSprintTaskSnapshotRepository.listBySprint(
				sprint.id,
			);
			expect(list).toHaveLength(1);
			expect(list[0]).toMatchObject({
				externalId: "TASK-1",
				statusAtFreeze: "CODE_REVIEW",
				carriedOver: true,
			});
		} finally {
			await deletePi(pi.id);
		}
	});

	it("não falha ao gravar uma lista vazia", async () => {
		await expect(
			drizzleSprintTaskSnapshotRepository.createMany([]),
		).resolves.toBeUndefined();
	});
});
```

- [ ] **Step 4: Rodar o teste e confirmar que falha**

Run: `npx vitest run src/infrastructure/sprint/drizzle-sprint-task-snapshot-repository.test.ts`
Expected: FAIL — módulo `./drizzle-sprint-task-snapshot-repository` não existe.

- [ ] **Step 5: Implementar o repositório**

```ts
// src/infrastructure/sprint/drizzle-sprint-task-snapshot-repository.ts
import { eq } from "drizzle-orm";
import type {
	CreateSprintTaskSnapshotData,
	SprintTaskSnapshotRepository,
} from "@/application/sprint/ports/sprint-task-snapshot-repository";
import type { SprintTaskSnapshot } from "@/domain/sprint/entities/sprint-task-snapshot";
import type { TaskStatus } from "@/domain/task/entities/task";
import { db } from "@/infrastructure/db/client";
import { sprintTaskSnapshots } from "./drizzle/schema";

function toSnapshot(
	row: typeof sprintTaskSnapshots.$inferSelect,
): SprintTaskSnapshot {
	return { ...row, statusAtFreeze: row.statusAtFreeze as TaskStatus };
}

export const drizzleSprintTaskSnapshotRepository: SprintTaskSnapshotRepository =
	{
		async createMany(data: CreateSprintTaskSnapshotData[]) {
			if (data.length === 0) return;
			await db.insert(sprintTaskSnapshots).values(data);
		},
		async listBySprint(sprintId) {
			const rows = await db
				.select()
				.from(sprintTaskSnapshots)
				.where(eq(sprintTaskSnapshots.sprintId, sprintId));
			return rows.map(toSnapshot);
		},
	};
```

- [ ] **Step 6: Rodar o teste e confirmar que passa**

Run: `npx vitest run src/infrastructure/sprint/drizzle-sprint-task-snapshot-repository.test.ts`
Expected: PASS (2 testes).

- [ ] **Step 7: Commit**

```bash
git add src/application/sprint/ports/sprint-task-snapshot-repository.ts src/application/sprint/use-cases/test-helpers/create-fake-sprint-task-snapshot-repository.ts src/infrastructure/sprint/drizzle-sprint-task-snapshot-repository.ts src/infrastructure/sprint/drizzle-sprint-task-snapshot-repository.test.ts
git commit -m "feat(sprints)!: adiciona repositorio de snapshot de tasks da sprint"
```

---

### Task 6: `SprintMetricsSnapshotRepository`

**Files:**
- Create: `src/application/sprint/ports/sprint-metrics-snapshot-repository.ts`
- Create: `src/application/sprint/use-cases/test-helpers/create-fake-sprint-metrics-snapshot-repository.ts`
- Create: `src/infrastructure/sprint/drizzle-sprint-metrics-snapshot-repository.ts`
- Create: `src/infrastructure/sprint/drizzle-sprint-metrics-snapshot-repository.test.ts`

**Interfaces:**
- Consumes: `HistoricalPeriodMetrics` de `src/application/metrics/use-cases/get-metrics-for-period.ts` (já existente); `sprintMetricsSnapshots` (Task 2).
- Produces: `SprintMetricsSnapshotRepository = { save(sprintId, metrics): Promise<void>; findBySprint(sprintId): Promise<HistoricalPeriodMetrics | null> }`.

- [ ] **Step 1: Criar a port**

```ts
// src/application/sprint/ports/sprint-metrics-snapshot-repository.ts
import type { HistoricalPeriodMetrics } from "@/application/metrics/use-cases/get-metrics-for-period";

export type SprintMetricsSnapshotRepository = {
	save(sprintId: string, metrics: HistoricalPeriodMetrics): Promise<void>;
	findBySprint(sprintId: string): Promise<HistoricalPeriodMetrics | null>;
};
```

- [ ] **Step 2: Criar o fake**

```ts
// src/application/sprint/use-cases/test-helpers/create-fake-sprint-metrics-snapshot-repository.ts
import type { HistoricalPeriodMetrics } from "@/application/metrics/use-cases/get-metrics-for-period";
import type { SprintMetricsSnapshotRepository } from "@/application/sprint/ports/sprint-metrics-snapshot-repository";

export function createFakeSprintMetricsSnapshotRepository(): SprintMetricsSnapshotRepository {
	const store = new Map<string, HistoricalPeriodMetrics>();

	return {
		async save(sprintId, metrics) {
			store.set(sprintId, metrics);
		},
		async findBySprint(sprintId) {
			return store.get(sprintId) ?? null;
		},
	};
}
```

- [ ] **Step 3: Escrever o teste de integração**

```ts
// src/infrastructure/sprint/drizzle-sprint-metrics-snapshot-repository.test.ts
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/infrastructure/db/client";
import { programIncrements, sprints } from "./drizzle/schema";
import { drizzleSprintMetricsSnapshotRepository } from "./drizzle-sprint-metrics-snapshot-repository";

const teamId = "00000000-0000-0000-0000-000000000005";

async function seedSprint() {
	const [pi] = await db
		.insert(programIncrements)
		.values({
			teamId,
			name: "PI 2026.3",
			startDate: "2026-07-01",
			endDate: "2026-09-30",
		})
		.returning();
	const [sprint] = await db
		.insert(sprints)
		.values({
			piId: pi.id,
			teamId,
			name: "Sprint 1",
			startDate: "2026-07-01",
			endDate: "2026-07-14",
		})
		.returning();
	return { pi, sprint };
}

async function deletePi(id: string) {
	await db.delete(programIncrements).where(eq(programIncrements.id, id));
}

describe("drizzleSprintMetricsSnapshotRepository", () => {
	it("grava e lê o snapshot de métricas de uma sprint", async () => {
		const { pi, sprint } = await seedSprint();
		try {
			await drizzleSprintMetricsSnapshotRepository.save(sprint.id, {
				periodStart: new Date("2026-07-01T00:00:00Z"),
				periodEnd: new Date("2026-07-15T00:00:00Z"),
				leadTime: null,
				cycleTime: null,
				cycleTimeOutliers: [],
				blockedTime: null,
				codeReviewTime: null,
				testingTime: null,
				awaitingPublicationTime: null,
				reworkRate: null,
				reworkCount: null,
				throughput: 3,
				predictability: null,
				predictabilityCounts: null,
				unplannedCount: null,
				bugsOpened: 1,
				bugsRanking: [],
			});
			const found = await drizzleSprintMetricsSnapshotRepository.findBySprint(
				sprint.id,
			);
			expect(found?.throughput).toBe(3);
			expect(found?.bugsOpened).toBe(1);
		} finally {
			await deletePi(pi.id);
		}
	});

	it("retorna null quando não há snapshot para a sprint", async () => {
		expect(
			await drizzleSprintMetricsSnapshotRepository.findBySprint(
				"00000000-0000-0000-0000-000000000000",
			),
		).toBeNull();
	});
});
```

- [ ] **Step 4: Rodar o teste e confirmar que falha**

Run: `npx vitest run src/infrastructure/sprint/drizzle-sprint-metrics-snapshot-repository.test.ts`
Expected: FAIL — módulo `./drizzle-sprint-metrics-snapshot-repository` não existe.

- [ ] **Step 5: Implementar o repositório**

```ts
// src/infrastructure/sprint/drizzle-sprint-metrics-snapshot-repository.ts
import { eq } from "drizzle-orm";
import type { HistoricalPeriodMetrics } from "@/application/metrics/use-cases/get-metrics-for-period";
import type { SprintMetricsSnapshotRepository } from "@/application/sprint/ports/sprint-metrics-snapshot-repository";
import { db } from "@/infrastructure/db/client";
import { sprintMetricsSnapshots } from "./drizzle/schema";

export const drizzleSprintMetricsSnapshotRepository: SprintMetricsSnapshotRepository =
	{
		async save(sprintId: string, metrics: HistoricalPeriodMetrics) {
			await db
				.insert(sprintMetricsSnapshots)
				.values({ sprintId, metrics })
				.onConflictDoUpdate({
					target: sprintMetricsSnapshots.sprintId,
					set: { metrics },
				});
		},
		async findBySprint(sprintId) {
			const [row] = await db
				.select()
				.from(sprintMetricsSnapshots)
				.where(eq(sprintMetricsSnapshots.sprintId, sprintId));
			return (row?.metrics as HistoricalPeriodMetrics) ?? null;
		},
	};
```

- [ ] **Step 6: Rodar o teste e confirmar que passa**

Run: `npx vitest run src/infrastructure/sprint/drizzle-sprint-metrics-snapshot-repository.test.ts`
Expected: PASS (2 testes).

- [ ] **Step 7: Commit**

```bash
git add src/application/sprint/ports/sprint-metrics-snapshot-repository.ts src/application/sprint/use-cases/test-helpers/create-fake-sprint-metrics-snapshot-repository.ts src/infrastructure/sprint/drizzle-sprint-metrics-snapshot-repository.ts src/infrastructure/sprint/drizzle-sprint-metrics-snapshot-repository.test.ts
git commit -m "feat(sprints)!: adiciona repositorio de snapshot de metricas da sprint"
```

---

### Task 7: Use-case `startSprint`

**Files:**
- Create: `src/application/sprint/use-cases/start-sprint.ts`
- Create: `src/application/sprint/use-cases/start-sprint.test.ts`

**Interfaces:**
- Consumes: `SprintRepository` (Task 3, com `updateStatus`); `createFakeSprintRepository`.
- Produces: `startSprint(repository: SprintRepository, teamId: string): Promise<Sprint>`.

- [ ] **Step 1: Escrever os testes**

```ts
// src/application/sprint/use-cases/start-sprint.test.ts
import { describe, expect, it } from "vitest";
import { createFakeSprintRepository } from "./test-helpers/create-fake-sprint-repository";
import { startSprint } from "./start-sprint";

describe("startSprint", () => {
	it("inicia a sprint planejada de startDate mais próxima", async () => {
		const repository = createFakeSprintRepository();
		await repository.create({
			piId: "pi-1",
			teamId: "team-1",
			name: "Sprint 2",
			startDate: "2026-07-15",
			endDate: "2026-07-28",
		});
		const first = await repository.create({
			piId: "pi-1",
			teamId: "team-1",
			name: "Sprint 1",
			startDate: "2026-07-01",
			endDate: "2026-07-14",
		});

		const started = await startSprint(repository, "team-1");

		expect(started.id).toBe(first.id);
		expect(started.status).toBe("ACTIVE");
	});

	it("rejeita quando já existe sprint ativa no time", async () => {
		const repository = createFakeSprintRepository();
		const active = await repository.create({
			piId: "pi-1",
			teamId: "team-1",
			name: "Sprint ativa",
			startDate: "2026-07-01",
			endDate: "2026-07-14",
		});
		await repository.updateStatus(active.id, "ACTIVE");
		await repository.create({
			piId: "pi-1",
			teamId: "team-1",
			name: "Sprint 2",
			startDate: "2026-07-15",
			endDate: "2026-07-28",
		});

		await expect(startSprint(repository, "team-1")).rejects.toThrow(
			"Já existe uma sprint ativa para este time",
		);
	});

	it("rejeita quando não há sprint planejada para iniciar", async () => {
		const repository = createFakeSprintRepository();
		await expect(startSprint(repository, "team-1")).rejects.toThrow(
			"Não há sprint planejada para iniciar",
		);
	});
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npx vitest run src/application/sprint/use-cases/start-sprint.test.ts`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar**

```ts
// src/application/sprint/use-cases/start-sprint.ts
import { ApplicationError } from "@/application/shared/application-error";
import type { SprintRepository } from "@/application/sprint/ports/sprint-repository";

export async function startSprint(repository: SprintRepository, teamId: string) {
	const teamSprints = await repository.listByTeam(teamId);
	if (teamSprints.some((sprint) => sprint.status === "ACTIVE")) {
		throw new ApplicationError("Já existe uma sprint ativa para este time");
	}
	const [nextSprint] = teamSprints
		.filter((sprint) => sprint.status === "PLANNED")
		.sort((a, b) => a.startDate.localeCompare(b.startDate));
	if (!nextSprint) {
		throw new ApplicationError("Não há sprint planejada para iniciar");
	}
	return repository.updateStatus(nextSprint.id, "ACTIVE");
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npx vitest run src/application/sprint/use-cases/start-sprint.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add src/application/sprint/use-cases/start-sprint.ts src/application/sprint/use-cases/start-sprint.test.ts
git commit -m "feat(sprints)!: adiciona use-case de iniciar sprint"
```

---

### Task 8: Use-case `finishSprint`

**Files:**
- Create: `src/application/sprint/use-cases/finish-sprint.ts`
- Create: `src/application/sprint/use-cases/finish-sprint.test.ts`

**Interfaces:**
- Consumes: `SprintRepository` (Task 3); `TaskRepository` (Task 4); `SprintTaskSnapshotRepository` (Task 5); `SprintMetricsSnapshotRepository` (Task 6); `MetricsQueryPort`/`getMetricsForRange` (já existentes em `application/metrics`).
- Produces: `finishSprint(sprintRepository, taskRepository, sprintTaskSnapshotRepository, sprintMetricsSnapshotRepository, metricsQueryPort, sprintId, teamId): Promise<Sprint>`.

- [ ] **Step 1: Escrever os testes**

```ts
// src/application/sprint/use-cases/finish-sprint.test.ts
import { describe, expect, it } from "vitest";
import type { MetricsQueryPort } from "@/application/metrics/ports/metrics-query-port";
import { createFakeSprintMetricsSnapshotRepository } from "./test-helpers/create-fake-sprint-metrics-snapshot-repository";
import { createFakeSprintRepository } from "./test-helpers/create-fake-sprint-repository";
import { createFakeSprintTaskSnapshotRepository } from "./test-helpers/create-fake-sprint-task-snapshot-repository";
import { createFakeTaskRepository } from "@/application/task/use-cases/test-helpers/create-fake-task-repository";
import { finishSprint } from "./finish-sprint";

const emptyMetricsQueryPort: MetricsQueryPort = {
	async loadSnapshot() {
		return {
			completionEvents: [],
			statusChanges: [],
			blockedPeriods: [],
			dueDateTasks: [],
			currentWipTasks: [],
			bugEvents: [],
		};
	},
};

async function setup() {
	const sprintRepository = createFakeSprintRepository();
	const taskRepository = createFakeTaskRepository();
	const sprintTaskSnapshotRepository = createFakeSprintTaskSnapshotRepository();
	const sprintMetricsSnapshotRepository =
		createFakeSprintMetricsSnapshotRepository();
	const sprint = await sprintRepository.create({
		piId: "pi-1",
		teamId: "team-1",
		name: "Sprint 1",
		startDate: "2026-07-01",
		endDate: "2026-07-14",
	});
	await sprintRepository.updateStatus(sprint.id, "ACTIVE");
	return {
		sprintRepository,
		taskRepository,
		sprintTaskSnapshotRepository,
		sprintMetricsSnapshotRepository,
		sprint,
	};
}

describe("finishSprint", () => {
	it("rejeita sprint que não está ativa", async () => {
		const {
			sprintRepository,
			taskRepository,
			sprintTaskSnapshotRepository,
			sprintMetricsSnapshotRepository,
			sprint,
		} = await setup();
		await sprintRepository.updateStatus(sprint.id, "CLOSED");
		await expect(
			finishSprint(
				sprintRepository,
				taskRepository,
				sprintTaskSnapshotRepository,
				sprintMetricsSnapshotRepository,
				emptyMetricsQueryPort,
				sprint.id,
				"team-1",
			),
		).rejects.toThrow("Somente uma sprint ativa pode ser finalizada");
	});

	it("rejeita sprint de outro time", async () => {
		const {
			sprintRepository,
			taskRepository,
			sprintTaskSnapshotRepository,
			sprintMetricsSnapshotRepository,
			sprint,
		} = await setup();
		await expect(
			finishSprint(
				sprintRepository,
				taskRepository,
				sprintTaskSnapshotRepository,
				sprintMetricsSnapshotRepository,
				emptyMetricsQueryPort,
				sprint.id,
				"team-2",
			),
		).rejects.toThrow("Sprint não encontrada");
	});

	it("fecha a sprint e grava o snapshot de métricas", async () => {
		const {
			sprintRepository,
			taskRepository,
			sprintTaskSnapshotRepository,
			sprintMetricsSnapshotRepository,
			sprint,
		} = await setup();
		const closed = await finishSprint(
			sprintRepository,
			taskRepository,
			sprintTaskSnapshotRepository,
			sprintMetricsSnapshotRepository,
			emptyMetricsQueryPort,
			sprint.id,
			"team-1",
		);
		expect(closed.status).toBe("CLOSED");
		expect(await sprintMetricsSnapshotRepository.findBySprint(sprint.id)).not
			.toBeNull();
	});

	it("transborda tasks não concluídas para a próxima sprint planejada", async () => {
		const {
			sprintRepository,
			taskRepository,
			sprintTaskSnapshotRepository,
			sprintMetricsSnapshotRepository,
			sprint,
		} = await setup();
		const nextSprint = await sprintRepository.create({
			piId: "pi-1",
			teamId: "team-1",
			name: "Sprint 2",
			startDate: "2026-07-15",
			endDate: "2026-07-28",
		});
		const pending = await taskRepository.seed({
			externalId: "TASK-1",
			description: "Em andamento",
			typeId: "type-1",
			assigneeId: null,
			teamId: "team-1",
			status: "IN_DEVELOPMENT",
			dueDate: "2026-07-10",
			parentTaskId: null,
			sprintId: sprint.id,
		});
		const done = await taskRepository.seed({
			externalId: "TASK-2",
			description: "Concluída",
			typeId: "type-1",
			assigneeId: null,
			teamId: "team-1",
			status: "DONE",
			dueDate: "2026-07-10",
			parentTaskId: null,
			sprintId: sprint.id,
		});

		await finishSprint(
			sprintRepository,
			taskRepository,
			sprintTaskSnapshotRepository,
			sprintMetricsSnapshotRepository,
			emptyMetricsQueryPort,
			sprint.id,
			"team-1",
		);

		expect((await taskRepository.findById(pending.id))?.sprintId).toBe(
			nextSprint.id,
		);
		expect((await taskRepository.findById(done.id))?.sprintId).toBe(
			sprint.id,
		);

		const snapshots = await sprintTaskSnapshotRepository.listBySprint(
			sprint.id,
		);
		expect(snapshots).toHaveLength(2);
		expect(
			snapshots.find((snapshot) => snapshot.taskId === pending.id),
		).toMatchObject({ statusAtFreeze: "IN_DEVELOPMENT", carriedOver: true });
		expect(
			snapshots.find((snapshot) => snapshot.taskId === done.id),
		).toMatchObject({ statusAtFreeze: "DONE", carriedOver: false });
	});

	it("desassocia tasks não concluídas quando não há próxima sprint planejada", async () => {
		const {
			sprintRepository,
			taskRepository,
			sprintTaskSnapshotRepository,
			sprintMetricsSnapshotRepository,
			sprint,
		} = await setup();
		const pending = await taskRepository.seed({
			externalId: "TASK-1",
			description: "Em andamento",
			typeId: "type-1",
			assigneeId: null,
			teamId: "team-1",
			status: "TODO",
			dueDate: "2026-07-10",
			parentTaskId: null,
			sprintId: sprint.id,
		});

		await finishSprint(
			sprintRepository,
			taskRepository,
			sprintTaskSnapshotRepository,
			sprintMetricsSnapshotRepository,
			emptyMetricsQueryPort,
			sprint.id,
			"team-1",
		);

		expect((await taskRepository.findById(pending.id))?.sprintId).toBeNull();
	});
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npx vitest run src/application/sprint/use-cases/finish-sprint.test.ts`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar**

```ts
// src/application/sprint/use-cases/finish-sprint.ts
import { ApplicationError } from "@/application/shared/application-error";
import { parseDateOnly } from "@/application/shared/validation";
import type { MetricsQueryPort } from "@/application/metrics/ports/metrics-query-port";
import { getMetricsForRange } from "@/application/metrics/use-cases/get-metrics-for-period";
import type { SprintMetricsSnapshotRepository } from "@/application/sprint/ports/sprint-metrics-snapshot-repository";
import type { SprintRepository } from "@/application/sprint/ports/sprint-repository";
import type { SprintTaskSnapshotRepository } from "@/application/sprint/ports/sprint-task-snapshot-repository";
import type { TaskRepository } from "@/application/task/ports/task-repository";

export async function finishSprint(
	sprintRepository: SprintRepository,
	taskRepository: TaskRepository,
	sprintTaskSnapshotRepository: SprintTaskSnapshotRepository,
	sprintMetricsSnapshotRepository: SprintMetricsSnapshotRepository,
	metricsQueryPort: MetricsQueryPort,
	sprintId: string,
	teamId: string,
) {
	const sprint = await sprintRepository.findById(sprintId);
	if (!sprint || sprint.teamId !== teamId) {
		throw new ApplicationError("Sprint não encontrada");
	}
	if (sprint.status !== "ACTIVE") {
		throw new ApplicationError("Somente uma sprint ativa pode ser finalizada");
	}

	const periodStart = parseDateOnly(sprint.startDate) as Date;
	const endDate = parseDateOnly(sprint.endDate) as Date;
	const periodEnd = new Date(
		Date.UTC(
			endDate.getUTCFullYear(),
			endDate.getUTCMonth(),
			endDate.getUTCDate() + 1,
		),
	);
	const metricsSnapshot = await metricsQueryPort.loadSnapshot(
		teamId,
		periodStart,
		periodEnd,
	);
	const metrics = getMetricsForRange(metricsSnapshot, periodStart, periodEnd);
	await sprintMetricsSnapshotRepository.save(sprintId, metrics);

	const [nextSprint] = (await sprintRepository.listByTeam(teamId))
		.filter((candidate) => candidate.status === "PLANNED")
		.sort((a, b) => a.startDate.localeCompare(b.startDate));

	const sprintTasks = await taskRepository.listBySprint(sprintId);
	const snapshotData = sprintTasks.map((task) => ({
		sprintId,
		taskId: task.id,
		externalId: task.externalId,
		description: task.description,
		typeId: task.typeId,
		assigneeId: task.assigneeId,
		statusAtFreeze: task.status,
		carriedOver: task.status !== "DONE",
	}));
	await sprintTaskSnapshotRepository.createMany(snapshotData);

	for (const task of sprintTasks) {
		if (task.status === "DONE") continue;
		await taskRepository.update(task.id, {
			externalId: task.externalId,
			description: task.description,
			typeId: task.typeId,
			assigneeId: task.assigneeId,
			dueDate: task.dueDate,
			parentTaskId: task.parentTaskId,
			sprintId: nextSprint?.id ?? null,
		});
	}

	return sprintRepository.updateStatus(sprintId, "CLOSED");
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npx vitest run src/application/sprint/use-cases/finish-sprint.test.ts`
Expected: PASS (5 testes).

- [ ] **Step 5: Commit**

```bash
git add src/application/sprint/use-cases/finish-sprint.ts src/application/sprint/use-cases/finish-sprint.test.ts
git commit -m "feat(sprints)!: adiciona use-case de finalizar sprint com overflow e snapshot"
```

---

### Task 9: Use-case `getSprintHistory`

**Files:**
- Create: `src/application/sprint/use-cases/get-sprint-history.ts`
- Create: `src/application/sprint/use-cases/get-sprint-history.test.ts`

**Interfaces:**
- Consumes: `SprintTaskSnapshotRepository` (Task 5).
- Produces: `getSprintHistory(repository: SprintTaskSnapshotRepository, sprintId: string): Promise<SprintTaskSnapshot[]>`.

- [ ] **Step 1: Escrever o teste**

```ts
// src/application/sprint/use-cases/get-sprint-history.test.ts
import { describe, expect, it } from "vitest";
import { createFakeSprintTaskSnapshotRepository } from "./test-helpers/create-fake-sprint-task-snapshot-repository";
import { getSprintHistory } from "./get-sprint-history";

describe("getSprintHistory", () => {
	it("lista os snapshots de task da sprint informada", async () => {
		const repository = createFakeSprintTaskSnapshotRepository();
		await repository.createMany([
			{
				sprintId: "sprint-1",
				taskId: "task-1",
				externalId: "TASK-1",
				description: "Descrição",
				typeId: "type-1",
				assigneeId: null,
				statusAtFreeze: "DONE",
				carriedOver: false,
			},
			{
				sprintId: "sprint-2",
				taskId: "task-2",
				externalId: "TASK-2",
				description: "Descrição",
				typeId: "type-1",
				assigneeId: null,
				statusAtFreeze: "TODO",
				carriedOver: true,
			},
		]);

		const result = await getSprintHistory(repository, "sprint-1");

		expect(result).toHaveLength(1);
		expect(result[0].externalId).toBe("TASK-1");
	});
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest run src/application/sprint/use-cases/get-sprint-history.test.ts`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar**

```ts
// src/application/sprint/use-cases/get-sprint-history.ts
import type { SprintTaskSnapshotRepository } from "@/application/sprint/ports/sprint-task-snapshot-repository";

export async function getSprintHistory(
	repository: SprintTaskSnapshotRepository,
	sprintId: string,
) {
	return repository.listBySprint(sprintId);
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest run src/application/sprint/use-cases/get-sprint-history.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/application/sprint/use-cases/get-sprint-history.ts src/application/sprint/use-cases/get-sprint-history.test.ts
git commit -m "feat(sprints)!: adiciona use-case de historico da sprint"
```

---

### Task 10: Composition root

**Files:**
- Modify: `src/composition/sprint.ts`

**Interfaces:**
- Consumes: `drizzleTaskRepository`; `drizzleSprintTaskSnapshotRepository` (Task 5); `drizzleSprintMetricsSnapshotRepository` (Task 6); `drizzleMetricsQueryPort` (já existente); `startSprint`, `finishSprint`, `getSprintHistory` (Tasks 7–9).
- Produces: `createSprintUseCases().startSprint(teamId)`, `.finishSprint(sprintId, teamId)`, `.getSprintHistory(sprintId)`.

- [ ] **Step 1: Atualizar os imports**

```ts
// src/composition/sprint.ts — adicionar aos imports existentes:
import { finishSprint } from "@/application/sprint/use-cases/finish-sprint";
import { getSprintHistory } from "@/application/sprint/use-cases/get-sprint-history";
import { startSprint } from "@/application/sprint/use-cases/start-sprint";
import { drizzleSprintMetricsSnapshotRepository } from "@/infrastructure/sprint/drizzle-sprint-metrics-snapshot-repository";
import { drizzleSprintTaskSnapshotRepository } from "@/infrastructure/sprint/drizzle-sprint-task-snapshot-repository";
import { drizzleMetricsQueryPort } from "@/infrastructure/metrics/drizzle-metrics-query-port";
import { drizzleTaskRepository } from "@/infrastructure/task/drizzle-task-repository";
```

- [ ] **Step 2: Adicionar os três métodos ao objeto retornado**

```ts
// src/composition/sprint.ts — adicionar dentro de createSprintUseCases(), antes do `};` final:
		startSprint: (teamId: string) => startSprint(drizzleSprintRepository, teamId),
		finishSprint: (sprintId: string, teamId: string) =>
			finishSprint(
				drizzleSprintRepository,
				drizzleTaskRepository,
				drizzleSprintTaskSnapshotRepository,
				drizzleSprintMetricsSnapshotRepository,
				drizzleMetricsQueryPort,
				sprintId,
				teamId,
			),
		getSprintHistory: (sprintId: string) =>
			getSprintHistory(drizzleSprintTaskSnapshotRepository, sprintId),
```

- [ ] **Step 3: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/composition/sprint.ts
git commit -m "feat(sprints)!: conecta ciclo de vida da sprint na composition root"
```

---

### Task 11: Server Actions `startSprintAction` e `finishSprintAction`

**Files:**
- Modify: `src/app/board/actions.ts`

**Interfaces:**
- Consumes: `createSprintUseCases()` (Task 10).
- Produces: `startSprintAction(previousState, formData): Promise<ActionState>`, `finishSprintAction(previousState, formData): Promise<ActionState>` (formato `useActionState`).

- [ ] **Step 1: Adicionar o import**

```ts
// src/app/board/actions.ts — adicionar junto dos demais imports de composition:
import { createSprintUseCases } from "@/composition/sprint";
```

- [ ] **Step 2: Adicionar as duas actions ao final do arquivo**

```ts
// src/app/board/actions.ts — adicionar ao final:
export async function startSprintAction(
	_previousState: ActionState,
	_formData: FormData,
) {
	return runTaskAction(async () => {
		const teamId = await getCurrentTeamId();
		await createSprintUseCases().startSprint(teamId);
	});
}

export async function finishSprintAction(
	_previousState: ActionState,
	formData: FormData,
) {
	return runTaskAction(async () => {
		const sprintId = String(formData.get("sprintId") ?? "");
		validateUuid(sprintId, "Sprint inválida");
		const teamId = await getCurrentTeamId();
		await createSprintUseCases().finishSprint(sprintId, teamId);
	});
}
```

- [ ] **Step 3: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/app/board/actions.ts
git commit -m "feat(sprints)!: adiciona server actions de iniciar e finalizar sprint"
```

---

### Task 12: Controle "Iniciar sprint / Finalizar sprint"

**Files:**
- Create: `src/presentation/task/sprint-lifecycle-control.tsx`

**Interfaces:**
- Consumes: `Sprint`; `startSprintAction`, `finishSprintAction` (Task 11, tipadas como `(previousState: ActionState, formData: FormData) => Promise<ActionState>`); `SubmitButton` (existente).
- Produces: `<SprintLifecycleControl activeSprint={...} hasPlannedSprint={...} startSprintAction={...} finishSprintAction={...} />`.

- [ ] **Step 1: Criar o componente**

```tsx
// src/presentation/task/sprint-lifecycle-control.tsx
"use client";

import { useActionState } from "react";
import {
	type ActionState,
	INITIAL_ACTION_STATE,
} from "@/application/shared/action-state";
import type { Sprint } from "@/domain/sprint/entities/sprint";
import { SubmitButton } from "@/presentation/shared/submit-button";

type SprintLifecycleControlProps = {
	activeSprint: Sprint | undefined;
	hasPlannedSprint: boolean;
	startSprintAction: (
		previousState: ActionState,
		formData: FormData,
	) => Promise<ActionState>;
	finishSprintAction: (
		previousState: ActionState,
		formData: FormData,
	) => Promise<ActionState>;
};

export function SprintLifecycleControl({
	activeSprint,
	hasPlannedSprint,
	startSprintAction,
	finishSprintAction,
}: SprintLifecycleControlProps) {
	const [state, action] = useActionState(
		activeSprint ? finishSprintAction : startSprintAction,
		INITIAL_ACTION_STATE,
	);

	if (!activeSprint && !hasPlannedSprint) return null;

	return (
		<form action={action} className="flex items-center gap-2">
			{activeSprint ? (
				<>
					<span className="text-sm opacity-70">
						{activeSprint.name} · {activeSprint.startDate} até{" "}
						{activeSprint.endDate}
					</span>
					<input type="hidden" name="sprintId" value={activeSprint.id} />
					<SubmitButton
						confirmMessage="Finalizar a sprint atual? Tasks não concluídas serão transbordadas para a próxima sprint planejada."
						className="rounded-lg border border-(--border) px-3 py-1.5 text-sm disabled:opacity-60"
					>
						Finalizar sprint
					</SubmitButton>
				</>
			) : (
				<SubmitButton className="rounded-lg border border-(--border) px-3 py-1.5 text-sm disabled:opacity-60">
					Iniciar sprint
				</SubmitButton>
			)}
			{state.error ? (
				<p role="alert" className="text-sm">
					{state.error}
				</p>
			) : null}
		</form>
	);
}
```

- [ ] **Step 2: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/presentation/task/sprint-lifecycle-control.tsx
git commit -m "feat(sprints)!: adiciona controle de iniciar/finalizar sprint"
```

---

### Task 13: Visão histórica read-only de sprint fechada

**Files:**
- Create: `src/presentation/task/sprint-history-board.tsx`

**Interfaces:**
- Consumes: `SprintTaskSnapshot`; `Sprint`; `STATUS_ORDER`/`STATUS_LABELS` (existentes); `SprintBoardFilter` (do plano anterior).
- Produces: `<SprintHistoryBoard sprint={...} snapshots={...} sprints={...} />`.

- [ ] **Step 1: Criar o componente**

```tsx
// src/presentation/task/sprint-history-board.tsx
import type { Sprint } from "@/domain/sprint/entities/sprint";
import type { SprintTaskSnapshot } from "@/domain/sprint/entities/sprint-task-snapshot";
import { SprintBoardFilter } from "@/presentation/task/sprint-board-filter";
import {
	STATUS_LABELS,
	STATUS_ORDER,
} from "@/presentation/task/task-status-labels";

type SprintHistoryBoardProps = {
	sprint: Sprint;
	snapshots: SprintTaskSnapshot[];
	sprints: Sprint[];
};

export function SprintHistoryBoard({
	sprint,
	snapshots,
	sprints,
}: SprintHistoryBoardProps) {
	return (
		<div className="flex flex-1 flex-col gap-4 p-6">
			<div className="flex items-center justify-between">
				<div className="flex flex-col gap-1">
					<h1 className="text-xl font-semibold">
						{sprint.name} <span className="text-sm opacity-60">(fechada)</span>
					</h1>
					<p className="text-sm opacity-70">
						{sprint.startDate} até {sprint.endDate}
					</p>
				</div>
				<SprintBoardFilter sprints={sprints} />
			</div>
			<hr className="border-(--border)" />
			<div className="flex flex-1 gap-2 overflow-x-auto md:gap-4">
				{STATUS_ORDER.map((status, index) => {
					const columnSnapshots = snapshots.filter(
						(snapshot) => snapshot.statusAtFreeze === status,
					);
					return (
						<div
							key={status}
							className={`flex min-w-0 flex-1 flex-col gap-3 p-2 ${
								index > 0 ? "border-l border-(--border)" : ""
							}`}
						>
							<h2 className="text-sm font-semibold text-balance opacity-70">
								{STATUS_LABELS[status]} ({columnSnapshots.length})
							</h2>
							{columnSnapshots.map((snapshot) => (
								<div
									key={snapshot.id}
									className="flex flex-col gap-2 rounded-lg border border-(--border) bg-(--surface) p-3 shadow-sm opacity-90"
								>
									<span className="font-mono text-xs opacity-70">
										{snapshot.externalId}
									</span>
									<p className="text-sm">{snapshot.description}</p>
									{snapshot.carriedOver ? (
										<p className="text-xs font-semibold text-(--warn)">
											Transbordou para a próxima sprint
										</p>
									) : null}
								</div>
							))}
						</div>
					);
				})}
			</div>
		</div>
	);
}
```

- [ ] **Step 2: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/presentation/task/sprint-history-board.tsx
git commit -m "feat(sprints)!: adiciona visao historica read-only de sprint fechada"
```

---

### Task 14: Integrar o controle de ciclo de vida ao `KanbanBoard`

**Files:**
- Modify: `src/presentation/task/kanban-board.tsx`

**Interfaces:**
- Consumes: `SprintLifecycleControl` (Task 12).
- Produces: `KanbanBoardProps` ganha `startSprintAction`/`finishSprintAction` (mesmo formato de `useActionState` do Task 12).

- [ ] **Step 1: Adicionar o import**

```ts
// src/presentation/task/kanban-board.tsx — adicionar junto dos demais imports de presentation/task:
import { SprintLifecycleControl } from "@/presentation/task/sprint-lifecycle-control";
```

- [ ] **Step 2: Adicionar as duas props ao tipo**

```ts
// em KanbanBoardProps, adicionar logo após `sprints: Sprint[];`:
	startSprintAction: (
		previousState: ActionState,
		formData: FormData,
	) => Promise<ActionState>;
	finishSprintAction: (
		previousState: ActionState,
		formData: FormData,
	) => Promise<ActionState>;
```

- [ ] **Step 3: Adicionar à desestruturação**

```ts
// na assinatura de export function KanbanBoard({ ... }), adicionar logo após `sprints,`:
	startSprintAction,
	finishSprintAction,
```

- [ ] **Step 4: Renderizar o controle no header**

```tsx
// substituir o <div className="flex flex-col gap-2"> do início do header por:
				<div className="flex flex-col gap-2">
					<h1 className="text-xl font-semibold">Quadro</h1>
					<BoardSummary tasksByStatus={tasksByStatus} members={members} />
					<SprintLifecycleControl
						activeSprint={sprints.find((sprint) => sprint.status === "ACTIVE")}
						hasPlannedSprint={sprints.some(
							(sprint) => sprint.status === "PLANNED",
						)}
						startSprintAction={startSprintAction}
						finishSprintAction={finishSprintAction}
					/>
				</div>
```

- [ ] **Step 5: Verificar que compila (erro esperado em `board/page.tsx` até o próximo task)**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: erro de "Property 'startSprintAction'/'finishSprintAction' is missing" em `src/app/board/page.tsx` — corrigido no Task 15.

---

### Task 15: `board/page.tsx` — branch entre quadro ao vivo e histórico

**Files:**
- Modify: `src/app/board/page.tsx`

**Interfaces:**
- Consumes: `startSprintAction`, `finishSprintAction` (Task 11); `createSprintUseCases().getSprintHistory` (Task 10); `SprintHistoryBoard` (Task 13).

- [ ] **Step 1: Atualizar a página**

```tsx
// src/app/board/page.tsx
import { redirect } from "next/navigation";
import {
	createHistoricalTaskAction,
	createTaskAction,
	deleteTaskAction,
	finishSprintAction,
	moveTaskAction,
	startSprintAction,
	toggleBlockedAction,
	updateTaskAction,
} from "@/app/board/actions";
import { createSprintUseCases } from "@/composition/sprint";
import { createTaskUseCases } from "@/composition/task";
import { createTeamUseCases } from "@/composition/team";
import { filterTasksByStatusBySprint } from "@/presentation/task/filter-tasks-by-sprint";
import { KanbanBoard } from "@/presentation/task/kanban-board";
import { SprintHistoryBoard } from "@/presentation/task/sprint-history-board";

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

	const sprintUseCases = createSprintUseCases();
	const sprints = await sprintUseCases.listSprintsByTeam(currentTeam.id);
	const { sprintId } = await searchParams;
	const selectedSprint = sprintId
		? sprints.find((sprint) => sprint.id === sprintId)
		: undefined;

	if (selectedSprint?.status === "CLOSED") {
		const snapshots = await sprintUseCases.getSprintHistory(selectedSprint.id);
		return (
			<SprintHistoryBoard
				sprint={selectedSprint}
				snapshots={snapshots}
				sprints={sprints}
			/>
		);
	}

	const teamResult = await teamUseCases.getTeam(currentTeam.id);
	const members = teamResult?.members ?? [];

	const taskUseCases = createTaskUseCases();
	const tasksByStatus = await taskUseCases.listTasksByTeam(currentTeam.id);
	const taskTypes = await taskUseCases.listTaskTypes();
	const tags = await taskUseCases.listTags();

	const boardTasksByStatus = selectedSprint
		? filterTasksByStatusBySprint(tasksByStatus, selectedSprint.id)
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
			startSprintAction={startSprintAction}
			finishSprintAction={finishSprintAction}
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
git commit -m "feat(sprints)!: liga iniciar/finalizar sprint e visao historica ao quadro"
```

---

### Task 16: Verificação final

- [ ] **Step 1: Rodar a suíte completa de testes**

Run: `npm run test`
Expected: todos os testes passam, incluindo os novos de ciclo de vida (domain/application com fakes, infrastructure com Postgres real).

- [ ] **Step 2: Rodar o typecheck**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Rodar o Biome**

Run: `npm run lint`
Expected: sem violações. Se houver, `npm run lint:fix` e revisar o diff (`style(sprints)!: aplica formatacao do biome`, mesmo padrão dos planos anteriores).

- [ ] **Step 4: Rodar o Knip**

Run: `npm run knip`
Expected: nenhum arquivo/export novo reportado como não usado.

- [ ] **Step 5: Verificação manual (se houver `DATABASE_URL` configurado para o dev server)**

Run: `npm run dev`, abrir `/board` com um time que tenha um PI com 2 sprints planejadas. Confirmar:
- Botão "Iniciar sprint" aparece quando não há sprint ativa; ao clicar, a sprint de `startDate` mais próxima vira ativa e o botão muda para "Finalizar sprint".
- Ao finalizar, tasks não `DONE` da sprint somem da visão "Atual" (ficam associadas à próxima sprint planejada, ou ficam "sem sprint" se não houver uma).
- A sprint recém-fechada aparece no seletor "Por sprint"; selecioná-la mostra a visão histórica read-only (colunas com base no status congelado, badge de transbordo nas tasks que passaram adiante), sem os controles do quadro ao vivo.
- Se o ambiente não tiver `DATABASE_URL` configurado para o dev server, registrar essa limitação explicitamente em vez de assumir que a UI funciona — a cobertura fica pelos testes automatizados dos steps anteriores.

- [ ] **Step 6: Atualizar o grafo do graphify**

Run: `graphify update .`
Expected: grafo atualizado. Commitar com `chore(graphify)!: atualiza grafo apos ciclo de vida da sprint`.

---

## Próximo plano (fora deste escopo)

Com o ciclo de vida da sprint implementado, o último plano da spec (`docs/superpowers/specs/2026-07-23-pi-sprints-design.md`) é o **filtro de sprint nas métricas**: toggle Período/Sprint na tela `/metrics`, cálculo ao vivo para sprints `ACTIVE`/`PLANNED` (reaproveitando `getMetricsForRange` sobre o range de datas da sprint) e leitura do `sprint_metrics_snapshot` (gravado neste plano) para sprints `CLOSED`.
