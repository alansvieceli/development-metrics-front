# Métricas de bugs no dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar no dashboard de métricas quantos bugs foram abertos por período e quais tasks mais geraram bugs no período atual, reaproveitando o vínculo de task de origem já existente.

**Architecture:** Clean Architecture + DDD já usada no projeto. O motor de métricas (`application/metrics`) ganha um 4º array no `MetricsSnapshot` (`bugEvents`), carregado por uma 4ª query paralela em `drizzle-metrics-query-port.ts` que resolve a task de origem via self-join (`alias()` do Drizzle). Duas fórmulas puras novas (`calculateBugsOpened`, `calculateBugsRanking`) entram em `PeriodMetrics`, calculadas para todo o histórico (mesmo padrão de `leadTime`/`cycleTime`), mas o ranking só é consumido do período atual. A presentation ganha um gráfico de barras e uma lista, réplicas dos componentes existentes.

**Tech Stack:** Next.js 16, Drizzle ORM + Postgres, Vitest (unit), Playwright (e2e), Recharts, Biome.

## Global Constraints

- Rótulos de UI e mensagens em português, mesmo tom já usado no projeto.
- Arquivos kebab-case; tipos e componentes PascalCase.
- `domain`/`application` não importam `infrastructure` nem tipos de ORM; o self-join com `alias()` fica confinado a `src/infrastructure/metrics/drizzle-metrics-query-port.ts`.
- `BUG_RANKING_LIMIT = 5` é uma constante fixa da regra de negócio (mesma ideia do `HISTORY_LENGTH = 8` já usado em `get-metrics-dashboard.ts`) — não virar configuração.
- Sem critério de desempate no ranking além da ordem estável de inserção (`Array.prototype.sort` é estável) — não introduzir desempate adicional.
- `bugsOpened`/`bugsRanking` entram em `PeriodMetrics` (não em `HistoricalPeriodMetrics` com omissão) e são calculados para todo período do histórico, mas `bugsRanking` só é consumido via `current.bugsRanking` — decisão já validada, não vira série histórica.
- Cada task desta implementação termina com `npm run typecheck` e a suíte relevante passando (repositório sempre em estado verde antes do commit).
- Rodar `npm run lint` antes de cada commit.
- `README.md` (seção "Funcionalidades" e "Regras das métricas") é atualizado na mesma mudança que altera essas regras, conforme `techdocs/guidelines.md`.

---

### Task 1: `bugEvents` no snapshot do motor de métricas

**Files:**
- Modify: `src/application/metrics/ports/metrics-query-port.ts`
- Modify: `src/infrastructure/metrics/drizzle-metrics-query-port.ts`
- Modify: `src/infrastructure/metrics/drizzle-metrics-query-port.test.ts`
- Modify: `src/application/metrics/use-cases/get-metrics-for-period.test.ts` (só para compilar — adicionar `bugEvents: []` aos 3 snapshots literais existentes)
- Modify: `src/application/metrics/use-cases/get-metrics-dashboard.test.ts` (só para compilar — adicionar `bugEvents: []` ao snapshot literal)

**Interfaces:**
- Produces: `BugEvent = { taskId: string; createdAt: Date; parentTaskId: string | null; parentExternalId: string | null }`; `MetricsSnapshot.bugEvents: BugEvent[]`. Consumida pelas Tasks 2 e 3.

- [ ] **Step 1: Escrever o teste que falha para o novo self-join**

Em `src/infrastructure/metrics/drizzle-metrics-query-port.test.ts`, adicionar `taskTypes` e `eq` aos imports existentes:

```ts
import type { InferInsertModel } from "drizzle-orm";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/infrastructure/db/client";
import {
	taskBlockedPeriods,
	taskStatusChanges,
	tasks,
	taskTypes,
} from "@/infrastructure/task/drizzle/schema";
import { drizzleTaskTypeRepository } from "@/infrastructure/task/drizzle-task-type-repository";
import { getTestDatabaseUrl } from "../../../scripts/test-database-url";
import {
	createDrizzleMetricsQueryPort,
	drizzleMetricsQueryPort,
} from "./drizzle-metrics-query-port";
```

Adicionar este teste ao final do `describe("drizzleMetricsQueryPort", ...)`, antes do teste "carrega o snapshot em no máximo cinco queries":

```ts
	it("carrega os bugs abertos com a task de origem resolvida via self-join", async () => {
		const [bugType] = await db
			.insert(taskTypes)
			.values({ name: "Bug-teste", color: "#dc2626", isBug: true })
			.returning();
		try {
			const parent = await insertTask({ externalId: "TASK-PAI" });
			const bugWithParent = await insertTask({
				externalId: "TASK-BUG-1",
				typeId: bugType.id,
				parentTaskId: parent.id,
			});
			const orphanBug = await insertTask({
				externalId: "TASK-BUG-2",
				typeId: bugType.id,
			});

			const snapshot = await drizzleMetricsQueryPort.loadSnapshot(
				TEAM_ID,
				new Date("2026-07-01T00:00:00Z"),
				new Date("2026-08-01T00:00:00Z"),
			);

			expect(snapshot.bugEvents).toHaveLength(2);
			const withParent = snapshot.bugEvents.find(
				(event) => event.taskId === bugWithParent.id,
			);
			expect(withParent?.parentTaskId).toBe(parent.id);
			expect(withParent?.parentExternalId).toBe("TASK-PAI");
			const orphan = snapshot.bugEvents.find(
				(event) => event.taskId === orphanBug.id,
			);
			expect(orphan?.parentTaskId).toBeNull();
			expect(orphan?.parentExternalId).toBeNull();
		} finally {
			await db.delete(taskTypes).where(eq(taskTypes.id, bugType.id));
		}
	});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest run src/infrastructure/metrics/drizzle-metrics-query-port.test.ts -t "self-join"`
Expected: FAIL — `snapshot.bugEvents` é `undefined`, `MetricsSnapshot` ainda não tem esse campo.

- [ ] **Step 3: Adicionar `BugEvent` e `bugEvents` ao port**

Em `src/application/metrics/ports/metrics-query-port.ts`, adicionar logo antes de `MetricsSnapshot`:

```ts
export type BugEvent = {
	taskId: string;
	createdAt: Date;
	parentTaskId: string | null;
	parentExternalId: string | null;
};
```

E adicionar o campo em `MetricsSnapshot`:

```ts
export type MetricsSnapshot = {
	completionEvents: CompletionEvent[];
	statusChanges: SnapshotStatusChange[];
	blockedPeriods: SnapshotBlockedPeriod[];
	dueDateTasks: DueDateTaskMetrics[];
	currentWipTasks: CurrentWipTaskMetrics[];
	bugEvents: BugEvent[];
};
```

- [ ] **Step 4: Implementar a 4ª query em `drizzle-metrics-query-port.ts`**

Adicionar aos imports do topo:

```ts
import { alias } from "drizzle-orm/pg-core";
import type {
	BugEvent,
	DueDateTaskMetrics,
	MetricsQueryPort,
} from "@/application/metrics/ports/metrics-query-port";
import type { TaskStatus } from "@/domain/task/entities/task";
import { db } from "@/infrastructure/db/client";
import {
	taskBlockedPeriods,
	taskStatusChanges,
	tasks,
	taskTypes,
} from "@/infrastructure/task/drizzle/schema";

const parentTasks = alias(tasks, "parent_tasks");
```

Trocar a desestruturação e o `Promise.all` de 3 para 4 queries:

```ts
			const [completionEvents, dueDateRows, currentWipRows, bugRows] =
				await Promise.all([
					database
						.select({
							taskId: taskStatusChanges.taskId,
							createdAt: tasks.createdAt,
							completedAt: taskStatusChanges.changedAt,
							dueDate: tasks.dueDate,
						})
						.from(taskStatusChanges)
						.innerJoin(tasks, eq(tasks.id, taskStatusChanges.taskId))
						.where(
							and(
								eq(tasks.teamId, teamId),
								eq(taskStatusChanges.toStatus, "DONE"),
								gte(taskStatusChanges.changedAt, periodStart),
								lt(taskStatusChanges.changedAt, periodEnd),
							),
						)
						.orderBy(asc(taskStatusChanges.changedAt)),
					database
						.select({
							taskId: tasks.id,
							dueDate: tasks.dueDate,
							firstCompletedAt: min(taskStatusChanges.changedAt),
						})
						.from(tasks)
						.leftJoin(
							taskStatusChanges,
							and(
								eq(taskStatusChanges.taskId, tasks.id),
								eq(taskStatusChanges.toStatus, "DONE"),
							),
						)
						.where(
							and(
								eq(tasks.teamId, teamId),
								isNotNull(tasks.dueDate),
								gte(tasks.dueDate, toDateOnly(periodStart)),
								lt(tasks.dueDate, toDateOnly(periodEnd)),
							),
						)
						.groupBy(tasks.id, tasks.dueDate),
					database
						.select({
							status: tasks.status,
							statusChangedAt:
								sql<Date>`coalesce(max(${taskStatusChanges.changedAt}), ${tasks.createdAt})`.mapWith(
									tasks.createdAt,
								),
							blockedAt:
								sql<Date | null>`case when ${tasks.blocked} then max(${taskBlockedPeriods.blockedAt}) else null end`.mapWith(
									taskBlockedPeriods.blockedAt,
								),
						})
						.from(tasks)
						.leftJoin(
							taskStatusChanges,
							and(
								eq(taskStatusChanges.taskId, tasks.id),
								eq(taskStatusChanges.toStatus, tasks.status),
							),
						)
						.leftJoin(
							taskBlockedPeriods,
							and(
								eq(taskBlockedPeriods.taskId, tasks.id),
								isNull(taskBlockedPeriods.unblockedAt),
							),
						)
						.where(
							and(
								eq(tasks.teamId, teamId),
								notInArray(tasks.status, ["TODO", "DONE"]),
							),
						)
						.groupBy(tasks.id),
					database
						.select({
							taskId: tasks.id,
							createdAt: tasks.createdAt,
							parentTaskId: tasks.parentTaskId,
							parentExternalId: parentTasks.externalId,
						})
						.from(tasks)
						.innerJoin(taskTypes, eq(taskTypes.id, tasks.typeId))
						.leftJoin(parentTasks, eq(parentTasks.id, tasks.parentTaskId))
						.where(
							and(
								eq(tasks.teamId, teamId),
								eq(taskTypes.isBug, true),
								gte(tasks.createdAt, periodStart),
								lt(tasks.createdAt, periodEnd),
							),
						),
				]);
```

E no `return` final, adicionar o mapeamento (após `currentWipTasks`):

```ts
				currentWipTasks: currentWipRows.map((row) => ({
					status: row.status as TaskStatus,
					statusChangedAt: row.statusChangedAt,
					blockedAt: row.blockedAt,
				})),
				bugEvents: bugRows.map(
					(row): BugEvent => ({
						taskId: row.taskId,
						createdAt: row.createdAt,
						parentTaskId: row.parentTaskId ?? null,
						parentExternalId: row.parentExternalId ?? null,
					}),
				),
```

- [ ] **Step 5: Rodar o teste novo e confirmar que passa**

Run: `npx vitest run src/infrastructure/metrics/drizzle-metrics-query-port.test.ts -t "self-join"`
Expected: PASS.

- [ ] **Step 6: Atualizar o teste de contagem de queries (3 → 4 paralelas)**

O teste "carrega o snapshot em no máximo cinco queries" ficou desatualizado: a query nova soma-se às 3 já existentes no primeiro `Promise.all`, então o total sobe de até 5 para até 6. Renomear e ajustar em `drizzle-metrics-query-port.test.ts`:

```ts
	it("carrega o snapshot em no máximo seis queries", async () => {
		const task = await insertTask({ status: "DONE", dueDate: "2026-07-10" });
		await db.insert(taskStatusChanges).values({
			taskId: task.id,
			fromStatus: "IN_DEVELOPMENT",
			toStatus: "DONE",
		});
		let queryCount = 0;
		const client = postgres(getTestDatabaseUrl(), {
			max: 1,
			debug() {
				queryCount += 1;
			},
		});
		const port = createDrizzleMetricsQueryPort(drizzle(client));

		try {
			await client.unsafe("select 1");
			queryCount = 0;
			await port.loadSnapshot(
				TEAM_ID,
				new Date("2026-07-01T00:00:00Z"),
				new Date("2026-08-01T00:00:00Z"),
			);
			expect(queryCount).toBeLessThanOrEqual(6);
		} finally {
			await client.end();
		}
	});
```

- [ ] **Step 7: Rodar o typecheck e confirmar a lista de erros esperada**

Run: `npm run typecheck`
Expected: FAIL — `MetricsSnapshot` agora exige `bugEvents`; os snapshots literais em `get-metrics-for-period.test.ts` (3 ocorrências) e `get-metrics-dashboard.test.ts` (1 ocorrência) não o têm.

- [ ] **Step 8: Adicionar `bugEvents: []` às fixtures existentes**

Em `src/application/metrics/use-cases/get-metrics-for-period.test.ts`, adicionar `bugEvents: [],` logo após `currentWipTasks: [],` (ou `currentWipTasks: [],` sem itens) em cada um dos 3 objetos `MetricsSnapshot` literais do arquivo (nos testes "monta as métricas do período a partir do snapshot", "retorna vazio/zero quando o período não tem dados" e "card retroativo sem chegar em DONE...").

Em `src/application/metrics/use-cases/get-metrics-dashboard.test.ts`, adicionar `bugEvents: [],` logo após o fechamento de `currentWipTasks: [...]` no único snapshot literal do arquivo.

- [ ] **Step 9: Rodar o typecheck e a suíte de testes completa**

Run: `npm run typecheck && npx vitest run src/application/metrics src/infrastructure/metrics`
Expected: PASS em ambos.

- [ ] **Step 10: Commit**

```bash
git add src/application/metrics/ports/metrics-query-port.ts src/infrastructure/metrics/drizzle-metrics-query-port.ts src/infrastructure/metrics/drizzle-metrics-query-port.test.ts src/application/metrics/use-cases/get-metrics-for-period.test.ts src/application/metrics/use-cases/get-metrics-dashboard.test.ts
git commit -m "feat(metricas)!: carrega bugs abertos no snapshot de metricas"
```

---

### Task 2: Fórmulas `calculateBugsOpened` e `calculateBugsRanking`

**Files:**
- Create: `src/application/metrics/formulas/bug-metrics.ts`
- Create: `src/application/metrics/formulas/bug-metrics.test.ts`

**Interfaces:**
- Consumes: `BugEvent` (Task 1).
- Produces: `BugRankingEntry = { taskId: string; externalId: string; bugCount: number }`, `calculateBugsOpened(bugEvents, periodStart, periodEnd): number`, `calculateBugsRanking(bugEvents, periodStart, periodEnd): BugRankingEntry[]`. Consumida pela Task 3.

- [ ] **Step 1: Escrever os testes que falham**

Criar `src/application/metrics/formulas/bug-metrics.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { BugEvent } from "@/application/metrics/ports/metrics-query-port";
import { calculateBugsOpened, calculateBugsRanking } from "./bug-metrics";

function bugEvent(overrides: Partial<BugEvent> = {}): BugEvent {
	return {
		taskId: "bug-1",
		createdAt: new Date("2026-07-14T00:00:00Z"),
		parentTaskId: "parent-1",
		parentExternalId: "TASK-PAI",
		...overrides,
	};
}

const periodStart = new Date("2026-07-13T00:00:00Z");
const periodEnd = new Date("2026-07-20T00:00:00Z");

describe("calculateBugsOpened", () => {
	it("conta bugs do período com ou sem vínculo de origem", () => {
		const events = [
			bugEvent({ taskId: "bug-1" }),
			bugEvent({
				taskId: "bug-2",
				parentTaskId: null,
				parentExternalId: null,
			}),
		];
		expect(calculateBugsOpened(events, periodStart, periodEnd)).toBe(2);
	});

	it("ignora bugs fora do período", () => {
		const events = [bugEvent({ createdAt: new Date("2026-07-01T00:00:00Z") })];
		expect(calculateBugsOpened(events, periodStart, periodEnd)).toBe(0);
	});

	it("retorna 0 quando não há bugs", () => {
		expect(calculateBugsOpened([], periodStart, periodEnd)).toBe(0);
	});
});

describe("calculateBugsRanking", () => {
	it("agrupa por task de origem e ordena decrescente", () => {
		const events = [
			bugEvent({
				taskId: "bug-1",
				parentTaskId: "parent-1",
				parentExternalId: "TASK-A",
			}),
			bugEvent({
				taskId: "bug-2",
				parentTaskId: "parent-2",
				parentExternalId: "TASK-B",
			}),
			bugEvent({
				taskId: "bug-3",
				parentTaskId: "parent-1",
				parentExternalId: "TASK-A",
			}),
		];
		expect(calculateBugsRanking(events, periodStart, periodEnd)).toEqual([
			{ taskId: "parent-1", externalId: "TASK-A", bugCount: 2 },
			{ taskId: "parent-2", externalId: "TASK-B", bugCount: 1 },
		]);
	});

	it("exclui bugs sem task de origem", () => {
		const events = [bugEvent({ parentTaskId: null, parentExternalId: null })];
		expect(calculateBugsRanking(events, periodStart, periodEnd)).toEqual([]);
	});

	it("corta no top 5", () => {
		const events = Array.from({ length: 6 }, (_, i) =>
			bugEvent({
				taskId: `bug-${i}`,
				parentTaskId: `parent-${i}`,
				parentExternalId: `TASK-${i}`,
			}),
		);
		expect(calculateBugsRanking(events, periodStart, periodEnd)).toHaveLength(
			5,
		);
	});

	it("ignora bugs fora do período", () => {
		const events = [bugEvent({ createdAt: new Date("2026-06-01T00:00:00Z") })];
		expect(calculateBugsRanking(events, periodStart, periodEnd)).toEqual([]);
	});

	it("retorna vazio quando não há bugs", () => {
		expect(calculateBugsRanking([], periodStart, periodEnd)).toEqual([]);
	});
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npx vitest run src/application/metrics/formulas/bug-metrics.test.ts`
Expected: FAIL — o módulo `./bug-metrics` não existe ainda.

- [ ] **Step 3: Implementar `bug-metrics.ts`**

Criar `src/application/metrics/formulas/bug-metrics.ts`:

```ts
import type { BugEvent } from "@/application/metrics/ports/metrics-query-port";

export type BugRankingEntry = {
	taskId: string;
	externalId: string;
	bugCount: number;
};

const BUG_RANKING_LIMIT = 5;

export function calculateBugsOpened(
	bugEvents: BugEvent[],
	periodStart: Date,
	periodEnd: Date,
): number {
	return bugEvents.filter(
		(event) => event.createdAt >= periodStart && event.createdAt < periodEnd,
	).length;
}

export function calculateBugsRanking(
	bugEvents: BugEvent[],
	periodStart: Date,
	periodEnd: Date,
): BugRankingEntry[] {
	const countByParent = new Map<string, BugRankingEntry>();
	for (const event of bugEvents) {
		if (event.createdAt < periodStart || event.createdAt >= periodEnd) {
			continue;
		}
		if (!event.parentTaskId || !event.parentExternalId) {
			continue;
		}
		const entry = countByParent.get(event.parentTaskId);
		if (entry) {
			entry.bugCount += 1;
		} else {
			countByParent.set(event.parentTaskId, {
				taskId: event.parentTaskId,
				externalId: event.parentExternalId,
				bugCount: 1,
			});
		}
	}
	return [...countByParent.values()]
		.sort((a, b) => b.bugCount - a.bugCount)
		.slice(0, BUG_RANKING_LIMIT);
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npx vitest run src/application/metrics/formulas/bug-metrics.test.ts`
Expected: PASS em todos.

- [ ] **Step 5: Commit**

```bash
git add src/application/metrics/formulas/bug-metrics.ts src/application/metrics/formulas/bug-metrics.test.ts
git commit -m "feat(metricas)!: adiciona formulas de bugs abertos e ranking"
```

---

### Task 3: `bugsOpened`/`bugsRanking` em `PeriodMetrics`

**Files:**
- Modify: `src/application/metrics/use-cases/get-metrics-for-period.ts`
- Modify: `src/application/metrics/use-cases/get-metrics-for-period.test.ts`
- Modify: `src/presentation/metrics-dashboard/charts/to-flow-composition-data.test.ts`
- Modify: `src/presentation/metrics-dashboard/charts/to-duration-trend-series.test.ts`
- Modify: `src/presentation/metrics-dashboard/charts/to-planned-delivered-series.test.ts`
- Modify: `src/presentation/metrics-dashboard/charts/to-throughput-series.test.ts`

**Interfaces:**
- Consumes: `calculateBugsOpened`, `calculateBugsRanking`, `BugRankingEntry` (Task 2).
- Produces: `PeriodMetrics.bugsOpened: number`, `PeriodMetrics.bugsRanking: BugRankingEntry[]`. Consumida pela Task 5 (`toBugsOpenedSeries`) e Task 6 (`BugsRankingList`, via `current.bugsRanking`).

- [ ] **Step 1: Escrever o teste que falha**

Em `src/application/metrics/use-cases/get-metrics-for-period.test.ts`, adicionar este teste ao final do `describe("getMetricsForRange", ...)`:

```ts
	it("calcula bugsOpened e bugsRanking a partir dos bugEvents do snapshot", () => {
		const snapshot: MetricsSnapshot = {
			completionEvents: [],
			statusChanges: [],
			blockedPeriods: [],
			dueDateTasks: [],
			currentWipTasks: [],
			bugEvents: [
				{
					taskId: "bug-1",
					createdAt: new Date("2026-07-02T00:00:00Z"),
					parentTaskId: "parent-1",
					parentExternalId: "TASK-PAI",
				},
				{
					taskId: "bug-2",
					createdAt: new Date("2026-07-03T00:00:00Z"),
					parentTaskId: "parent-1",
					parentExternalId: "TASK-PAI",
				},
			],
		};
		const metrics = getMetricsForRange(
			snapshot,
			new Date("2026-07-01T00:00:00Z"),
			new Date("2026-07-08T00:00:00Z"),
		);
		expect(metrics.bugsOpened).toBe(2);
		expect(metrics.bugsRanking).toEqual([
			{ taskId: "parent-1", externalId: "TASK-PAI", bugCount: 2 },
		]);
	});
```

Também adicionar, no teste "retorna vazio/zero quando o período não tem dados", as duas asserções ao final do bloco:

```ts
		expect(metrics.bugsOpened).toBe(0);
		expect(metrics.bugsRanking).toEqual([]);
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npx vitest run src/application/metrics/use-cases/get-metrics-for-period.test.ts`
Expected: FAIL — `metrics.bugsOpened`/`metrics.bugsRanking` são `undefined`.

- [ ] **Step 3: Implementar em `get-metrics-for-period.ts`**

```ts
import type { CurrentWipMetrics } from "@/application/metrics/formulas/current-wip-metrics";
import type { DurationStats } from "@/application/metrics/formulas/duration-metrics";
import {
	calculateBlockedTime,
	calculateCycleTime,
	calculateLeadTime,
	calculateTimeInStatus,
} from "@/application/metrics/formulas/duration-metrics";
import {
	calculatePredictability,
	calculatePredictabilityCounts,
	calculateReworkCount,
	calculateReworkRate,
	calculateUnplannedCount,
	type PredictabilityCounts,
} from "@/application/metrics/formulas/rate-metrics";
import {
	calculateBugsOpened,
	calculateBugsRanking,
	type BugRankingEntry,
} from "@/application/metrics/formulas/bug-metrics";
import type {
	CompletedTaskMetrics,
	MetricsSnapshot,
} from "@/application/metrics/ports/metrics-query-port";

export type PeriodMetrics = {
	periodStart: Date;
	periodEnd: Date;
	leadTime: DurationStats | null;
	cycleTime: DurationStats | null;
	blockedTime: DurationStats | null;
	codeReviewTime: DurationStats | null;
	testingTime: DurationStats | null;
	awaitingPublicationTime: DurationStats | null;
	reworkRate: number | null;
	reworkCount: number | null;
	throughput: number;
	wip: CurrentWipMetrics;
	predictability: number | null;
	predictabilityCounts: PredictabilityCounts | null;
	unplannedCount: number | null;
	bugsOpened: number;
	bugsRanking: BugRankingEntry[];
};
```

E no `return` de `getMetricsForRange`, adicionar após `unplannedCount`:

```ts
		unplannedCount: calculateUnplannedCount(
			completedTasks,
			periodStart,
			periodEnd,
		),
		bugsOpened: calculateBugsOpened(snapshot.bugEvents, periodStart, periodEnd),
		bugsRanking: calculateBugsRanking(
			snapshot.bugEvents,
			periodStart,
			periodEnd,
		),
	};
}
```

(O tipo `HistoricalPeriodMetrics = Omit<PeriodMetrics, "wip">` não muda — continua herdando os 2 campos novos automaticamente.)

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npx vitest run src/application/metrics/use-cases/get-metrics-for-period.test.ts`
Expected: PASS em todos.

- [ ] **Step 5: Rodar o typecheck e confirmar a lista de erros esperada**

Run: `npm run typecheck`
Expected: FAIL — os helpers `periodMetrics(...)`/`historicalEntry(...)` em `to-flow-composition-data.test.ts`, `to-duration-trend-series.test.ts`, `to-planned-delivered-series.test.ts` e `to-throughput-series.test.ts` retornam um objeto sem `bugsOpened`/`bugsRanking`, mas tipado como `PeriodMetrics`/`HistoricalPeriodMetrics`.

- [ ] **Step 6: Adicionar os campos novos às 4 fixtures de gráficos**

Em cada um dos 4 arquivos abaixo, adicionar as duas linhas `bugsOpened: 0,` e `bugsRanking: [],` logo após a linha `unplannedCount: null,` (antes de `...overrides,`):

- `src/presentation/metrics-dashboard/charts/to-flow-composition-data.test.ts`
- `src/presentation/metrics-dashboard/charts/to-duration-trend-series.test.ts`
- `src/presentation/metrics-dashboard/charts/to-planned-delivered-series.test.ts`
- `src/presentation/metrics-dashboard/charts/to-throughput-series.test.ts`

- [ ] **Step 7: Rodar o typecheck e a suíte de testes completa**

Run: `npm run typecheck && npm test`
Expected: PASS em ambos.

- [ ] **Step 8: Commit**

```bash
git add src/application/metrics/use-cases/get-metrics-for-period.ts src/application/metrics/use-cases/get-metrics-for-period.test.ts src/presentation/metrics-dashboard/charts/to-flow-composition-data.test.ts src/presentation/metrics-dashboard/charts/to-duration-trend-series.test.ts src/presentation/metrics-dashboard/charts/to-planned-delivered-series.test.ts src/presentation/metrics-dashboard/charts/to-throughput-series.test.ts
git commit -m "feat(metricas)!: calcula bugsOpened e bugsRanking por periodo"
```

---

### Task 4: Definições dos indicadores de bugs

**Files:**
- Modify: `src/presentation/metrics-dashboard/metric-definitions.ts`
- Modify: `src/presentation/metrics-dashboard/metric-info-button.tsx`

**Interfaces:**
- Produces: `MetricKey` ganha `"bugsOpenedTrend"` e `"bugsRanking"`. Consumida pela Task 6 (`ChartCard metricKey="bugsOpenedTrend"` / `"bugsRanking"`).

- [ ] **Step 1: Adicionar as chaves em `metric-definitions.ts`**

```ts
export type MetricKey =
	| "wip"
	| "blocked"
	| "inReview"
	| "inTesting"
	| "inPublication"
	| "delivered"
	| "predictability"
	| "unplannedCount"
	| "reworkCount"
	| "leadTime"
	| "cycleTime"
	| "codeReviewTime"
	| "testingTime"
	| "blockedTime"
	| "awaitingPublicationTime"
	| "throughputTrend"
	| "plannedDeliveredTrend"
	| "leadCycleTimeTrend"
	| "flowComposition"
	| "bugsOpenedTrend"
	| "bugsRanking";
```

Adicionar ao final do array `METRIC_DEFINITIONS`:

```ts
	{
		key: "bugsOpenedTrend",
		label: "Bugs abertos por período",
		description:
			"Bugs abertos (tasks do tipo Bug) em cada um dos últimos 8 períodos (semanas, quinzenas ou meses).",
	},
	{
		key: "bugsRanking",
		label: "Ranking de bugs",
		description:
			"As até 5 tasks que mais geraram bugs no período atual, via o vínculo de task de origem.",
	},
];
```

- [ ] **Step 2: Adicionar as chaves ao grupo "Gráficos" em `metric-info-button.tsx`**

```ts
	{
		title: "Gráficos",
		keys: [
			"throughputTrend",
			"plannedDeliveredTrend",
			"leadCycleTimeTrend",
			"flowComposition",
			"bugsOpenedTrend",
			"bugsRanking",
		],
	},
```

- [ ] **Step 3: Rodar o typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/presentation/metrics-dashboard/metric-definitions.ts src/presentation/metrics-dashboard/metric-info-button.tsx
git commit -m "feat(metricas)!: adiciona definicoes dos indicadores de bugs"
```

---

### Task 5: Série do gráfico de bugs abertos

**Files:**
- Create: `src/presentation/metrics-dashboard/charts/to-bugs-opened-series.ts`
- Create: `src/presentation/metrics-dashboard/charts/to-bugs-opened-series.test.ts`

**Interfaces:**
- Consumes: `HistoricalPeriodMetrics.bugsOpened` (Task 3), `formatPeriodShortLabel` (existente).
- Produces: `BugsOpenedPoint = { label: string; bugsOpened: number }`, `toBugsOpenedSeries(history, periodType): BugsOpenedPoint[]`. Consumida pela Task 6.

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/presentation/metrics-dashboard/charts/to-bugs-opened-series.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { HistoricalPeriodMetrics } from "@/application/metrics/use-cases/get-metrics-for-period";
import { toBugsOpenedSeries } from "./to-bugs-opened-series";

function historicalEntry(
	overrides: Partial<HistoricalPeriodMetrics>,
): HistoricalPeriodMetrics {
	return {
		periodStart: new Date("2026-07-13T00:00:00Z"),
		periodEnd: new Date("2026-07-20T00:00:00Z"),
		leadTime: null,
		cycleTime: null,
		blockedTime: null,
		codeReviewTime: null,
		testingTime: null,
		awaitingPublicationTime: null,
		reworkRate: null,
		reworkCount: null,
		throughput: 0,
		predictability: null,
		predictabilityCounts: null,
		unplannedCount: null,
		bugsOpened: 0,
		bugsRanking: [],
		...overrides,
	};
}

describe("toBugsOpenedSeries", () => {
	it("mapeia cada período pro rótulo curto e o total de bugs abertos", () => {
		const history = [
			historicalEntry({
				periodStart: new Date("2026-07-06T00:00:00Z"),
				bugsOpened: 3,
			}),
			historicalEntry({
				periodStart: new Date("2026-07-13T00:00:00Z"),
				bugsOpened: 1,
			}),
		];

		expect(toBugsOpenedSeries(history, "WEEK")).toEqual([
			{ label: "06/07", bugsOpened: 3 },
			{ label: "13/07", bugsOpened: 1 },
		]);
	});
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest run src/presentation/metrics-dashboard/charts/to-bugs-opened-series.test.ts`
Expected: FAIL — o módulo `./to-bugs-opened-series` não existe ainda.

- [ ] **Step 3: Implementar `to-bugs-opened-series.ts`**

```ts
import type { PeriodType } from "@/application/metrics/period";
import type { HistoricalPeriodMetrics } from "@/application/metrics/use-cases/get-metrics-for-period";
import { formatPeriodShortLabel } from "../format-period-label";

export type BugsOpenedPoint = { label: string; bugsOpened: number };

export function toBugsOpenedSeries(
	history: HistoricalPeriodMetrics[],
	periodType: PeriodType,
): BugsOpenedPoint[] {
	return history.map((entry) => ({
		label: formatPeriodShortLabel(periodType, entry.periodStart),
		bugsOpened: entry.bugsOpened,
	}));
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest run src/presentation/metrics-dashboard/charts/to-bugs-opened-series.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/presentation/metrics-dashboard/charts/to-bugs-opened-series.ts src/presentation/metrics-dashboard/charts/to-bugs-opened-series.test.ts
git commit -m "feat(metricas)!: adiciona serie do grafico de bugs abertos"
```

---

### Task 6: Gráfico de bugs abertos e lista de ranking no painel

**Files:**
- Create: `src/presentation/metrics-dashboard/charts/bugs-opened-chart.tsx`
- Create: `src/presentation/metrics-dashboard/charts/bugs-ranking-list.tsx`
- Modify: `src/presentation/metrics-dashboard/charts/charts-section.tsx`

**Interfaces:**
- Consumes: `toBugsOpenedSeries` (Task 5), `HistoricalPeriodMetrics`/`PeriodMetrics.bugsRanking` (Task 3), `ChartCard` (existente), `BugRankingEntry` (Task 2).
- Produces: componentes `BugsOpenedChart`, `BugsRankingList`, consumidos só por `charts-section.tsx`.

- [ ] **Step 1: Criar `bugs-opened-chart.tsx`**

```tsx
"use client";

import {
	Bar,
	BarChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import type { PeriodType } from "@/application/metrics/period";
import type { HistoricalPeriodMetrics } from "@/application/metrics/use-cases/get-metrics-for-period";
import { ChartCard } from "./chart-card";
import { toBugsOpenedSeries } from "./to-bugs-opened-series";

type BugsOpenedChartProps = {
	history: HistoricalPeriodMetrics[];
	periodType: PeriodType;
};

export function BugsOpenedChart({
	history,
	periodType,
}: BugsOpenedChartProps) {
	const data = toBugsOpenedSeries(history, periodType);

	return (
		<ChartCard metricKey="bugsOpenedTrend">
			<ResponsiveContainer width="100%" height={220}>
				<BarChart data={data}>
					<CartesianGrid stroke="var(--border)" vertical={false} />
					<XAxis
						dataKey="label"
						tick={{ fontSize: 11, fill: "var(--foreground-muted)" }}
					/>
					<YAxis
						width={28}
						allowDecimals={false}
						tick={{ fontSize: 11, fill: "var(--foreground-muted)" }}
					/>
					<Tooltip
						contentStyle={{
							background: "var(--surface)",
							border: "1px solid var(--border)",
							borderRadius: 6,
							fontSize: 12,
						}}
						itemStyle={{ color: "var(--foreground)" }}
						labelStyle={{ color: "var(--foreground-muted)" }}
					/>
					<Bar
						dataKey="bugsOpened"
						name="Bugs abertos"
						fill="var(--chart-primary)"
						radius={[4, 4, 0, 0]}
					/>
				</BarChart>
			</ResponsiveContainer>
		</ChartCard>
	);
}
```

- [ ] **Step 2: Criar `bugs-ranking-list.tsx`**

```tsx
import type { BugRankingEntry } from "@/application/metrics/formulas/bug-metrics";
import { ChartCard } from "./chart-card";

type BugsRankingListProps = {
	ranking: BugRankingEntry[];
};

export function BugsRankingList({ ranking }: BugsRankingListProps) {
	return (
		<ChartCard metricKey="bugsRanking">
			{ranking.length === 0 ? (
				<p className="text-sm opacity-70">sem dados</p>
			) : (
				<ol className="flex flex-col gap-2 text-sm">
					{ranking.map((entry) => (
						<li
							key={entry.taskId}
							className="rounded-lg border border-(--border) px-3 py-2"
						>
							#{entry.externalId} — {entry.bugCount} bugs
						</li>
					))}
				</ol>
			)}
		</ChartCard>
	);
}
```

- [ ] **Step 3: Ligar os dois componentes em `charts-section.tsx`**

```tsx
import type { PeriodType } from "@/application/metrics/period";
import type {
	HistoricalPeriodMetrics,
	PeriodMetrics,
} from "@/application/metrics/use-cases/get-metrics-for-period";
import { BugsOpenedChart } from "./bugs-opened-chart";
import { BugsRankingList } from "./bugs-ranking-list";
import { FlowCompositionChart } from "./flow-composition-chart";
import { LeadCycleTimeChart } from "./lead-cycle-time-chart";
import { PlannedDeliveredChart } from "./planned-delivered-chart";
import { ThroughputChart } from "./throughput-chart";

type ChartsSectionProps = {
	periodType: PeriodType;
	current: PeriodMetrics;
	history: HistoricalPeriodMetrics[];
};

export function ChartsSection({
	periodType,
	current,
	history,
}: ChartsSectionProps) {
	const windowLabel =
		periodType === "WEEK"
			? `últimas ${history.length} semanas`
			: periodType === "FORTNIGHT"
				? `últimas ${history.length} quinzenas`
				: `últimos ${history.length} meses`;

	return (
		<section className="flex flex-col gap-5 rounded-2xl border border-(--border) bg-(--surface) p-5 shadow-[inset_0_3px_0_var(--accent)] sm:p-6">
			<div>
				<p className="mb-1 font-mono text-xs font-semibold tracking-[0.16em] text-(--accent) uppercase">
					Histórico
				</p>
				<h2 className="text-lg font-semibold">
					Tendência
					<span className="ml-2 text-sm font-normal text-(--foreground-muted)">
						· {windowLabel}
					</span>
				</h2>
			</div>
			<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
				<ThroughputChart history={history} periodType={periodType} />
				<PlannedDeliveredChart history={history} periodType={periodType} />
				<LeadCycleTimeChart history={history} periodType={periodType} />
				<FlowCompositionChart current={current} />
				<BugsOpenedChart history={history} periodType={periodType} />
				<BugsRankingList ranking={current.bugsRanking} />
			</div>
		</section>
	);
}
```

- [ ] **Step 4: Rodar o typecheck e o lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS em ambos.

(Sem teste unitário para estes componentes `.tsx`: seguindo a convenção do projeto — "fluxos críticos de presentation usam testes de integração ou E2E" — a cobertura vem do cenário e2e da Task 7.)

- [ ] **Step 5: Commit**

```bash
git add src/presentation/metrics-dashboard/charts/bugs-opened-chart.tsx src/presentation/metrics-dashboard/charts/bugs-ranking-list.tsx src/presentation/metrics-dashboard/charts/charts-section.tsx
git commit -m "feat(metricas)!: adiciona graficos de bugs abertos e ranking ao painel"
```

---

### Task 7: Cenário e2e de bugs abertos e ranking

**Files:**
- Modify: `tests/integration/metrics-dashboard.spec.ts`

**Interfaces:**
- Consumes: campo "Task de origem (opcional)" do formulário (já implementado), `data-testid="metric-chart-bugsOpenedTrend"`/`"metric-chart-bugsRanking"` (Task 6).

- [ ] **Step 1: Escrever o teste e2e que falha**

Adicionar ao final de `tests/integration/metrics-dashboard.spec.ts`:

```ts
test("mostra bugs abertos e o ranking de tasks com mais bugs", async ({
	page,
}) => {
	await page.getByRole("button", { name: "Task" }).click();
	await page.getByLabel("Id externo").fill("TASK-ORIGEM");
	await page.getByLabel("Descrição").fill("História que gera bugs");
	await page.getByLabel("Data prevista de entrega").fill("2026-12-31");
	await page.getByRole("button", { name: "Salvar" }).click();

	await page.getByRole("button", { name: "Task", exact: true }).click();
	await page.getByLabel("Id externo").fill("TASK-BUG-1");
	await page.getByLabel("Descrição").fill("Bug 1");
	await page.getByLabel("Tipo").selectOption({ label: "Bug" });
	await page
		.getByLabel("Task de origem (opcional)")
		.selectOption({ label: "TASK-ORIGEM — História que gera bugs" });
	await page.getByLabel("Data prevista de entrega").fill("2026-12-31");
	await page.getByRole("button", { name: "Salvar" }).click();

	await page.getByRole("button", { name: "Task", exact: true }).click();
	await page.getByLabel("Id externo").fill("TASK-BUG-2");
	await page.getByLabel("Descrição").fill("Bug 2");
	await page.getByLabel("Tipo").selectOption({ label: "Bug" });
	await page
		.getByLabel("Task de origem (opcional)")
		.selectOption({ label: "TASK-ORIGEM — História que gera bugs" });
	await page.getByLabel("Data prevista de entrega").fill("2026-12-31");
	await page.getByRole("button", { name: "Salvar" }).click();

	await page.getByRole("link", { name: "Métricas" }).click();

	await expect(
		page.getByRole("heading", { name: "Bugs abertos por período" }),
	).toBeVisible();
	await expect(
		page.getByTestId("metric-chart-bugsOpenedTrend").locator("svg"),
	).toBeVisible();
	await expect(
		page
			.getByTestId("metric-chart-bugsRanking")
			.getByText("#TASK-ORIGEM — 2 bugs"),
	).toBeVisible();
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha (antes das Tasks 1-6) / passa (depois)**

Run: `npx playwright test metrics-dashboard.spec.ts -g "bugs abertos e o ranking"`
Expected: PASS — todo o motor e a presentation já foram implementados nas Tasks 1-6; este teste apenas os verifica de ponta a ponta.

- [ ] **Step 3: Rodar a suíte e2e completa do dashboard**

Run: `npx playwright test metrics-dashboard.spec.ts`
Expected: PASS em todos os cenários (novo e existentes).

- [ ] **Step 4: Commit**

```bash
git add tests/integration/metrics-dashboard.spec.ts
git commit -m "test(metricas)!: valida bugs abertos e ranking no dashboard"
```

---

### Task 8: Documentar no README

**Files:**
- Modify: `README.md`

**Interfaces:** nenhuma — apenas documentação.

- [ ] **Step 1: Atualizar a lista de funcionalidades**

Adicionar, logo após a bullet sobre a task de origem (que já menciona os badges 🐛/🔗), uma nova bullet:

```markdown
- O dashboard mostra quantos bugs foram abertos por período e as até 5 tasks
  que mais geraram bugs no período atual, via o vínculo de task de origem.
```

E atualizar a contagem de gráficos na bullet do dashboard:

```markdown
- Dashboard com 15 indicadores do time atual, filtros semanal, quinzenal ou
  mensal e seis gráficos baseados no período atual e nos últimos 8 períodos.
```

- [ ] **Step 2: Adicionar as 2 regras novas à tabela de métricas**

Na tabela de "Regras das métricas", adicionar duas linhas após a linha de **Previsibilidade**:

```markdown
| **Bugs abertos** | Quantidade de tasks do tipo `Bug` cujo `createdAt` cai no período selecionado, com ou sem vínculo de task de origem. |
| **Ranking de bugs** | Bugs do período **com** task de origem, agrupados por task-pai, ordenados por quantidade decrescente e limitados às 5 primeiras. Bugs órfãos (sem task de origem) não entram no ranking, mas contam em "Bugs abertos". |
```

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs(readme)!: documenta metricas de bugs abertos e ranking"
```
