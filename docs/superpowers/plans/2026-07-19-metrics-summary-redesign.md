# Redesenho da Página de Métricas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir a grade de cards + gráficos da página `/metrics` por um resumo em 3 blocos (Situação atual, Resultado da semana, Tempo do fluxo), com tooltip nativo por tile.

**Architecture:** Motor de métricas ganha um `wip` estruturado (contagens "agora" por status/bloqueio) e dois cálculos novos (retrabalho em contagem, não planejados); a apresentação troca o sistema genérico de "shape + gráfico" por 3 seções fixas de tiles simples.

**Tech Stack:** TypeScript, Next.js (Server Components), Drizzle ORM, Vitest, Playwright.

## Global Constraints

- Pré-requisito: [2026-07-19-task-due-date-required.md](./2026-07-19-task-due-date-required.md) já implementado — `Task.dueDate` é `string` (nunca `null`) em todas as camadas.
- Commits seguem `tipo(numero-do-card): descrição` ou `tipo(contexto)!: descrição` (`docs/techdocs/guidelines.md`).
- `tsc --noEmit`, `biome ci .`, `vitest run` e `knip` devem passar antes de cada commit; `playwright test` roda ao final da Task 7.

---

## Task 1: Application — tipos do motor (`WipBreakdown`, `dueDate` no evento de conclusão)

**Files:**
- Modify: `src/application/metrics/ports/metrics-query-port.ts`

**Interfaces:**
- Produces: `WipBreakdown = { total: number; blocked: number; inReview: number; inTesting: number; inPublication: number }`; `MetricsSnapshot.wip: WipBreakdown` (era `number`); `CompletedTaskMetrics.dueDate: string` e `CompletionEvent` (tipo interno do snapshot) também ganham `dueDate: string`.

- [ ] **Step 1: Adicionar `WipBreakdown` e propagar `dueDate`**

Em `src/application/metrics/ports/metrics-query-port.ts`, trocar:

```ts
export type CompletedTaskMetrics = {
	taskId: string;
	createdAt: Date;
	completedAt: Date;
	statusChanges: {
		fromStatus: TaskStatus | null;
		toStatus: TaskStatus;
		changedAt: Date;
	}[];
	blockedPeriods: {
		blockedAt: Date;
		unblockedAt: Date | null;
	}[];
};
```

por:

```ts
export type CompletedTaskMetrics = {
	taskId: string;
	createdAt: Date;
	completedAt: Date;
	dueDate: string;
	statusChanges: {
		fromStatus: TaskStatus | null;
		toStatus: TaskStatus;
		changedAt: Date;
	}[];
	blockedPeriods: {
		blockedAt: Date;
		unblockedAt: Date | null;
	}[];
};
```

e trocar:

```ts
type CompletionEvent = {
	taskId: string;
	createdAt: Date;
	completedAt: Date;
};
```

por:

```ts
type CompletionEvent = {
	taskId: string;
	createdAt: Date;
	completedAt: Date;
	dueDate: string;
};
```

e trocar:

```ts
export type MetricsSnapshot = {
	completionEvents: CompletionEvent[];
	statusChanges: SnapshotStatusChange[];
	blockedPeriods: SnapshotBlockedPeriod[];
	dueDateTasks: DueDateTaskMetrics[];
	wip: number;
};
```

por:

```ts
export type WipBreakdown = {
	total: number;
	blocked: number;
	inReview: number;
	inTesting: number;
	inPublication: number;
};

export type MetricsSnapshot = {
	completionEvents: CompletionEvent[];
	statusChanges: SnapshotStatusChange[];
	blockedPeriods: SnapshotBlockedPeriod[];
	dueDateTasks: DueDateTaskMetrics[];
	wip: WipBreakdown;
};
```

- [ ] **Step 2: Rodar typecheck para levantar todos os pontos quebrados**

Run: `npm run typecheck`
Expected: FAIL — erros em `drizzle-metrics-query-port.ts` (retorna `wip: number`, e `completionEvents` sem `dueDate`), `get-metrics-for-period.ts`/`.test.ts`, `get-metrics-dashboard.test.ts`, `drizzle-metrics-query-port.test.ts`. Essa lista guia as próximas tasks; não commitar ainda.

- [ ] **Step 3: Commit**

```bash
git add src/application/metrics/ports/metrics-query-port.ts
git commit -m "feat(metricas)!: adiciona WipBreakdown e dueDate ao snapshot de metricas"
```

---

## Task 2: Infrastructure — query de WIP estruturada e `dueDate` no evento de conclusão

**Files:**
- Modify: `src/infrastructure/metrics/drizzle-metrics-query-port.ts`
- Modify: `src/infrastructure/metrics/drizzle-metrics-query-port.test.ts`

**Interfaces:**
- Consumes: `WipBreakdown`, `CompletionEvent` (Task 1).
- Produces: `drizzleMetricsQueryPort.loadSnapshot(...)` retornando `wip: WipBreakdown` e `completionEvents[].dueDate: string`, sem aumentar o número de queries.

- [ ] **Step 1: Escrever o teste que falha — WIP estruturado**

Em `src/infrastructure/metrics/drizzle-metrics-query-port.test.ts`, trocar o teste `"conta o WIP como tasks fora de todo e concluido"` (que hoje faz `expect(snapshot.wip).toBe(4)`) por:

```ts
	it("conta o WIP estruturado por status e bloqueio", async () => {
		await insertTask({ externalId: "TASK-1", status: "IN_DEVELOPMENT" });
		await insertTask({
			externalId: "TASK-2",
			status: "IN_DEVELOPMENT",
			blocked: true,
		});
		await insertTask({ externalId: "TASK-3", status: "CODE_REVIEW" });
		await insertTask({ externalId: "TASK-4", status: "TESTING" });
		await insertTask({ externalId: "TASK-5", status: "AWAITING_PUBLICATION" });
		await insertTask({ externalId: "TASK-6", status: "TODO" });
		await insertTask({ externalId: "TASK-7", status: "DONE" });

		const snapshot = await drizzleMetricsQueryPort.loadSnapshot(
			TEAM_ID,
			new Date("2026-07-01T00:00:00Z"),
			new Date("2026-08-01T00:00:00Z"),
		);
		expect(snapshot.wip).toEqual({
			total: 5,
			blocked: 1,
			inReview: 1,
			inTesting: 1,
			inPublication: 1,
		});
	});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest run src/infrastructure/metrics/drizzle-metrics-query-port.test.ts -t "WIP estruturado"`
Expected: FAIL — hoje `loadSnapshot` retorna `wip` como número.

- [ ] **Step 3: Implementar a query estruturada de WIP**

Em `src/infrastructure/metrics/drizzle-metrics-query-port.ts`, trocar a terceira query do `Promise.all` inicial (a que hoje só faz `select({ count: count() })...`):

```ts
				database
					.select({ count: count() })
					.from(tasks)
					.where(
						and(
							eq(tasks.teamId, teamId),
							ne(tasks.status, "TODO"),
							ne(tasks.status, "DONE"),
						),
					),
```

por:

```ts
				database
					.select({
						total: sql<number>`count(*) filter (where ${tasks.status} not in ('TODO', 'DONE'))::int`,
						blocked: sql<number>`count(*) filter (where ${tasks.blocked} and ${tasks.status} not in ('TODO', 'DONE'))::int`,
						inReview: sql<number>`count(*) filter (where ${tasks.status} = 'CODE_REVIEW')::int`,
						inTesting: sql<number>`count(*) filter (where ${tasks.status} = 'TESTING')::int`,
						inPublication: sql<number>`count(*) filter (where ${tasks.status} = 'AWAITING_PUBLICATION')::int`,
					})
					.from(tasks)
					.where(eq(tasks.teamId, teamId)),
```

A desestruturação `const [completionEvents, dueDateRows, wipRows] = await Promise.all([...])` mantém o mesmo nome `wipRows` — só muda o formato da linha retornada dentro do array.

`count` e `ne` (importados de `drizzle-orm`) só eram usados nessa query antiga e ficam sem uso — trocar a linha de import no topo do arquivo de:

```ts
import {
	and,
	asc,
	count,
	eq,
	gte,
	inArray,
	isNotNull,
	lt,
	min,
	ne,
} from "drizzle-orm";
```

por:

```ts
import {
	and,
	asc,
	eq,
	gte,
	inArray,
	isNotNull,
	lt,
	min,
	sql,
} from "drizzle-orm";
```

(`sql` é usado nas quatro colunas de contagem do Step 3.)

No final da função, trocar:

```ts
				wip: wipRows[0]?.count ?? 0,
```

por:

```ts
				wip: wipRows[0] ?? {
					total: 0,
					blocked: 0,
					inReview: 0,
					inTesting: 0,
					inPublication: 0,
				},
```

- [ ] **Step 4: Adicionar `dueDate` ao select de `completionEvents`**

Trocar:

```ts
				database
					.select({
						taskId: taskStatusChanges.taskId,
						createdAt: tasks.createdAt,
						completedAt: taskStatusChanges.changedAt,
					})
					.from(taskStatusChanges)
					.innerJoin(tasks, eq(tasks.id, taskStatusChanges.taskId))
```

por:

```ts
				database
					.select({
						taskId: taskStatusChanges.taskId,
						createdAt: tasks.createdAt,
						completedAt: taskStatusChanges.changedAt,
						dueDate: tasks.dueDate,
					})
					.from(taskStatusChanges)
					.innerJoin(tasks, eq(tasks.id, taskStatusChanges.taskId))
```

- [ ] **Step 5: Rodar o teste e confirmar que passa**

Run: `npx vitest run src/infrastructure/metrics/drizzle-metrics-query-port.test.ts`
Expected: PASS em todos os casos, incluindo o de no máximo 5 queries (a contagem de round-trips não muda — a query de WIP continua sendo uma só, só com mais colunas).

- [ ] **Step 6: Adicionar asserção de `dueDate` no teste de conclusão**

No teste `"lista tasks concluídas no período com o histórico completo"`, depois de `expect(snapshot.completionEvents[0].taskId).toBe(task.id);`, adicionar:

```ts
		expect(snapshot.completionEvents[0].dueDate).toBe("2026-07-01");
```

(usa a due date padrão definida em `insertTask` pela spec de due date obrigatória — ajustar a string se o padrão daquele arquivo for outra data.)

- [ ] **Step 7: Rodar a suíte do arquivo novamente**

Run: `npx vitest run src/infrastructure/metrics/drizzle-metrics-query-port.test.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/infrastructure/metrics/drizzle-metrics-query-port.ts src/infrastructure/metrics/drizzle-metrics-query-port.test.ts
git commit -m "feat(metricas)!: estrutura o wip por status/bloqueio e traz dueDate no snapshot"
```

---

## Task 3: Application — retrabalho em contagem e não planejados

**Files:**
- Modify: `src/application/metrics/formulas/rate-metrics.ts`
- Modify: `src/application/metrics/formulas/rate-metrics.test.ts`

**Interfaces:**
- Consumes: `CompletedTaskMetrics.dueDate` (Task 1).
- Produces: `calculateReworkCount(tasks): number | null`, `calculateUnplannedCount(tasks, periodStart, periodEnd): number | null` — usados pela Task 4.

- [ ] **Step 1: Escrever os testes que falham**

Em `src/application/metrics/formulas/rate-metrics.test.ts`, adicionar (depois do `describe("calculateReworkRate", ...)`):

```ts
describe("calculateReworkCount", () => {
	it("retorna null quando não há tasks concluídas no período", () => {
		expect(calculateReworkCount([])).toBeNull();
	});

	it("conta quantas tasks tiveram retrabalho", () => {
		const tasks = [
			completedTask({
				statusChanges: [
					{
						fromStatus: "CODE_REVIEW",
						toStatus: "IN_DEVELOPMENT",
						changedAt: new Date("2026-07-01T01:00:00Z"),
					},
				],
			}),
			completedTask({ taskId: "task-2" }),
		];
		expect(calculateReworkCount(tasks)).toBe(1);
	});
});

describe("calculateUnplannedCount", () => {
	const periodStart = new Date("2026-07-13T00:00:00Z");
	const periodEnd = new Date("2026-07-20T00:00:00Z");

	it("retorna null quando não há tasks concluídas no período", () => {
		expect(calculateUnplannedCount([], periodStart, periodEnd)).toBeNull();
	});

	it("não conta task cuja dueDate cai dentro do período", () => {
		const tasks = [completedTask({ dueDate: "2026-07-15" })];
		expect(calculateUnplannedCount(tasks, periodStart, periodEnd)).toBe(0);
	});

	it("conta task cuja dueDate cai fora do período", () => {
		const tasks = [
			completedTask({ taskId: "task-1", dueDate: "2026-07-10" }),
			completedTask({ taskId: "task-2", dueDate: "2026-07-25" }),
			completedTask({ taskId: "task-3", dueDate: "2026-07-16" }),
		];
		expect(calculateUnplannedCount(tasks, periodStart, periodEnd)).toBe(2);
	});
});
```

Atualizar o import no topo do arquivo de:

```ts
import { calculatePredictability, calculateReworkRate } from "./rate-metrics";
```

para:

```ts
import {
	calculatePredictability,
	calculateReworkCount,
	calculateReworkRate,
	calculateUnplannedCount,
} from "./rate-metrics";
```

E adicionar `dueDate: "2026-07-01"` no objeto retornado pela função `completedTask(...)` (helper local do arquivo, hoje sem esse campo):

```ts
function completedTask(
	overrides: Partial<CompletedTaskMetrics> = {},
): CompletedTaskMetrics {
	return {
		taskId: "task-1",
		createdAt: new Date("2026-07-01T00:00:00Z"),
		completedAt: new Date("2026-07-02T00:00:00Z"),
		dueDate: "2026-07-01",
		statusChanges: [],
		blockedPeriods: [],
		...overrides,
	};
}
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npx vitest run src/application/metrics/formulas/rate-metrics.test.ts`
Expected: FAIL — `calculateReworkCount` e `calculateUnplannedCount` ainda não existem.

- [ ] **Step 3: Implementar as duas funções**

Em `src/application/metrics/formulas/rate-metrics.ts`, trocar:

```ts
export function calculateReworkRate(
	tasks: CompletedTaskMetrics[],
): number | null {
	if (tasks.length === 0) {
		return null;
	}
	const reworkCount = tasks.filter((task) =>
		task.statusChanges.some(
			(change) =>
				change.toStatus === "IN_DEVELOPMENT" &&
				change.fromStatus !== null &&
				change.fromStatus !== "TODO" &&
				change.fromStatus !== "IN_DEVELOPMENT",
		),
	).length;
	return (reworkCount / tasks.length) * 100;
}
```

por:

```ts
function isReworkTransition(change: {
	fromStatus: string | null;
	toStatus: string;
}): boolean {
	return (
		change.toStatus === "IN_DEVELOPMENT" &&
		change.fromStatus !== null &&
		change.fromStatus !== "TODO" &&
		change.fromStatus !== "IN_DEVELOPMENT"
	);
}

export function calculateReworkCount(
	tasks: CompletedTaskMetrics[],
): number | null {
	if (tasks.length === 0) {
		return null;
	}
	return tasks.filter((task) => task.statusChanges.some(isReworkTransition))
		.length;
}

export function calculateReworkRate(
	tasks: CompletedTaskMetrics[],
): number | null {
	const reworkCount = calculateReworkCount(tasks);
	return reworkCount === null ? null : (reworkCount / tasks.length) * 100;
}

export function calculateUnplannedCount(
	tasks: CompletedTaskMetrics[],
	periodStart: Date,
	periodEnd: Date,
): number | null {
	if (tasks.length === 0) {
		return null;
	}
	const startDate = periodStart.toISOString().slice(0, 10);
	const endDate = periodEnd.toISOString().slice(0, 10);
	return tasks.filter(
		(task) => task.dueDate < startDate || task.dueDate >= endDate,
	).length;
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npx vitest run src/application/metrics/formulas/rate-metrics.test.ts`
Expected: PASS em todos os casos, incluindo os já existentes de `calculateReworkRate`.

- [ ] **Step 5: Commit**

```bash
git add src/application/metrics/formulas/rate-metrics.ts src/application/metrics/formulas/rate-metrics.test.ts
git commit -m "feat(metricas)!: adiciona contagem de retrabalho e de nao planejados"
```

---

## Task 4: Application — `get-metrics-for-period` expõe os campos novos

**Files:**
- Modify: `src/application/metrics/use-cases/get-metrics-for-period.ts`
- Modify: `src/application/metrics/use-cases/get-metrics-for-period.test.ts`

**Interfaces:**
- Consumes: `calculateReworkCount`, `calculateUnplannedCount` (Task 3); `WipBreakdown` (Task 1).
- Produces: `PeriodMetrics.wip: WipBreakdown`, `PeriodMetrics.reworkCount: number | null`, `PeriodMetrics.unplannedCount: number | null` — usados pela presentation (Task 6).

- [ ] **Step 1: Atualizar os testes existentes para o novo formato de `wip` e `dueDate`**

Em `src/application/metrics/use-cases/get-metrics-for-period.test.ts`, em cada um dos 3 snapshots de teste, trocar `wip: 4` / `wip: 0` / `wip: 1` pelo formato estruturado, por exemplo:

```ts
			wip: { total: 4, blocked: 1, inReview: 1, inTesting: 1, inPublication: 1 },
```

```ts
				wip: { total: 0, blocked: 0, inReview: 0, inTesting: 0, inPublication: 0 },
```

```ts
			wip: { total: 1, blocked: 0, inReview: 0, inTesting: 1, inPublication: 0 },
```

(mantendo o mesmo `total` que o teste já usava, os outros campos podem ser quaisquer valores plausíveis — não são consumidos por `getMetricsForRange`, que nunca lê `snapshot.wip`.)

No primeiro teste (`"monta as métricas do período a partir do snapshot"`), adicionar `dueDate: "2026-07-03"` ao único item de `completionEvents`, e depois de `expect(metrics.predictability).toBe(100);` adicionar:

```ts
		expect(metrics.reworkCount).toBe(0);
		expect(metrics.unplannedCount).toBe(0);
```

No segundo teste (`"retorna vazio/zero quando o período não tem dados"`), depois de `expect(metrics.predictability).toBeNull();` adicionar:

```ts
		expect(metrics.reworkCount).toBeNull();
		expect(metrics.unplannedCount).toBeNull();
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npx vitest run src/application/metrics/use-cases/get-metrics-for-period.test.ts`
Expected: FAIL — `reworkCount`/`unplannedCount` ainda não existem em `PeriodMetrics`.

- [ ] **Step 3: Atualizar `PeriodMetrics` e `getMetricsForRange`**

Em `src/application/metrics/use-cases/get-metrics-for-period.ts`, atualizar o import:

```ts
import {
	calculatePredictability,
	calculatePredictabilityCounts,
	calculateReworkCount,
	calculateReworkRate,
	calculateUnplannedCount,
	type PredictabilityCounts,
} from "@/application/metrics/formulas/rate-metrics";
import type {
	CompletedTaskMetrics,
	MetricsSnapshot,
	WipBreakdown,
} from "@/application/metrics/ports/metrics-query-port";
```

trocar `PeriodMetrics`:

```ts
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
	wip: WipBreakdown;
	predictability: number | null;
	predictabilityCounts: PredictabilityCounts | null;
	unplannedCount: number | null;
};
```

e no `return` de `getMetricsForRange`, adicionar as duas linhas novas (mantendo o resto igual):

```ts
		reworkRate: calculateReworkRate(completedTasks),
		reworkCount: calculateReworkCount(completedTasks),
		throughput: completedTasks.length,
		predictability: calculatePredictability(dueDateTasks),
		predictabilityCounts: calculatePredictabilityCounts(dueDateTasks),
		unplannedCount: calculateUnplannedCount(completedTasks, periodStart, periodEnd),
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npx vitest run src/application/metrics/use-cases/get-metrics-for-period.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/application/metrics/use-cases/get-metrics-for-period.ts src/application/metrics/use-cases/get-metrics-for-period.test.ts
git commit -m "feat(metricas)!: expoe reworkCount e unplannedCount em PeriodMetrics"
```

---

## Task 5: Application — simplificar `get-metrics-dashboard` (sem séries semanais/mensais)

**Files:**
- Modify: `src/application/metrics/use-cases/get-metrics-dashboard.ts`
- Modify: `src/application/metrics/use-cases/get-metrics-dashboard.test.ts`

**Interfaces:**
- Consumes: `getMetricsForRange`, `getPeriodRange` (já existentes).
- Produces: `MetricsDashboardResult = { current: PeriodMetrics }` — usado pela Task 6 (`app/metrics/page.tsx`).

- [ ] **Step 1: Atualizar o teste**

Em `src/application/metrics/use-cases/get-metrics-dashboard.test.ts`, trocar `wip: 3` no snapshot por:

```ts
			wip: { total: 3, blocked: 0, inReview: 0, inTesting: 0, inPublication: 0 },
```

adicionar `dueDate: "2026-07-15"` em cada um dos dois itens de `completionEvents`.

Trocar:

```ts
		expect(dashboard.current.wip).toBe(3);
```

por:

```ts
		expect(dashboard.current.wip).toEqual({
			total: 3,
			blocked: 0,
			inReview: 0,
			inTesting: 0,
			inPublication: 0,
		});
```

Remover as últimas 4 linhas do teste (séries que deixam de existir):

```ts
		expect(dashboard.weeklySeries).toHaveLength(8);
		expect(dashboard.monthlySeries).toHaveLength(6);
		expect(dashboard.weeklySeries.at(-1)?.metrics.throughput).toBe(1);
		expect(dashboard.weeklySeries[0].metrics.throughput).toBe(0);
		expect(dashboard.weeklySeries[0].metrics).not.toHaveProperty("wip");
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest run src/application/metrics/use-cases/get-metrics-dashboard.test.ts`
Expected: FAIL — hoje `dashboard.current.wip` ainda é `number` e a função ainda calcula séries.

- [ ] **Step 3: Simplificar `get-metrics-dashboard.ts`**

Substituir o arquivo inteiro por:

```ts
import type { PeriodType } from "@/application/metrics/period";
import { getPeriodRange } from "@/application/metrics/period";
import type { MetricsQueryPort } from "@/application/metrics/ports/metrics-query-port";
import { getMetricsForRange, type PeriodMetrics } from "./get-metrics-for-period";

export type MetricsDashboardResult = {
	current: PeriodMetrics;
};

export async function getMetricsDashboard(
	port: MetricsQueryPort,
	teamId: string,
	periodType: PeriodType,
	referenceDate: Date,
): Promise<MetricsDashboardResult> {
	const currentRange = getPeriodRange(periodType, referenceDate);
	const snapshot = await port.loadSnapshot(
		teamId,
		currentRange.start,
		currentRange.end,
	);
	const now = new Date();

	return {
		current: {
			...getMetricsForRange(snapshot, currentRange.start, currentRange.end, now),
			wip: snapshot.wip,
		},
	};
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest run src/application/metrics/use-cases/get-metrics-dashboard.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/application/metrics/use-cases/get-metrics-dashboard.ts src/application/metrics/use-cases/get-metrics-dashboard.test.ts
git commit -m "refactor(metricas)!: remove series semanais/mensais do dashboard de metricas"
```

---

## Task 6: Presentation — 3 seções substituem a grade de cards

**Files:**
- Modify: `src/presentation/metrics-dashboard/metric-definitions.ts`
- Create: `src/presentation/metrics-dashboard/stat-tile.tsx`
- Create: `src/presentation/metrics-dashboard/current-status-section.tsx`
- Create: `src/presentation/metrics-dashboard/week-result-section.tsx`
- Create: `src/presentation/metrics-dashboard/flow-time-section.tsx`
- Modify: `src/presentation/metrics-dashboard/metrics-dashboard.tsx`
- Modify: `src/presentation/metrics-dashboard/format-metric-value.ts`
- Modify: `src/app/metrics/page.tsx`
- Delete: `src/presentation/metrics-dashboard/metric-card.tsx`
- Delete: `src/presentation/metrics-dashboard/metric-trend-chart.tsx`
- Delete: `src/presentation/metrics-dashboard/to-trend-points.ts`
- Delete: `src/presentation/metrics-dashboard/to-trend-points.test.ts`

**Interfaces:**
- Consumes: `PeriodMetrics` (Task 4), `WipBreakdown` (Task 1).
- Produces: `MetricsDashboard({ periodType, referenceDate, current })` — usado por `app/metrics/page.tsx`. `StatTile({ metricKey, value, secondary? })` — usado pelas 3 seções.

- [ ] **Step 1: Reescrever `metric-definitions.ts`**

Substituir o arquivo inteiro por:

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
	| "awaitingPublicationTime";

export type MetricDefinition = {
	key: MetricKey;
	label: string;
	description: string;
};

export const METRIC_DEFINITIONS: MetricDefinition[] = [
	{
		key: "wip",
		label: "WIP",
		description: "Quantidade de cards em andamento agora (fora de Backlog e Concluído).",
	},
	{
		key: "blocked",
		label: "Bloqueados",
		description: "Cards em andamento marcados como bloqueados agora.",
	},
	{
		key: "inReview",
		label: "Em review",
		description: "Cards atualmente na coluna Revisão.",
	},
	{
		key: "inTesting",
		label: "Em testes",
		description: "Cards atualmente na coluna Testes.",
	},
	{
		key: "inPublication",
		label: "Publicação",
		description: "Cards atualmente na coluna Aguardando Publicação.",
	},
	{
		key: "delivered",
		label: "Entregues",
		description:
			"Cards com prazo neste período que foram concluídos até o prazo, sobre o total de cards com prazo no período.",
	},
	{
		key: "predictability",
		label: "Previsibilidade",
		description: "Percentual de cards com prazo neste período entregues até o prazo.",
	},
	{
		key: "unplannedCount",
		label: "Não planejados",
		description: "Cards concluídos neste período cujo prazo era de outro período.",
	},
	{
		key: "reworkCount",
		label: "Retrabalho",
		description: "Cards concluídos neste período que voltaram para desenvolvimento em algum momento.",
	},
	{
		key: "leadTime",
		label: "Lead time",
		description: "Média do tempo da entrada do card até a entrega.",
	},
	{
		key: "cycleTime",
		label: "Cycle time",
		description: "Média do tempo do início do desenvolvimento até a entrega.",
	},
	{
		key: "codeReviewTime",
		label: "Code review",
		description: "Média do tempo que o card esperou revisão de código.",
	},
	{
		key: "testingTime",
		label: "Testes",
		description: "Média do tempo que o card passou em testes.",
	},
	{
		key: "blockedTime",
		label: "Bloqueado",
		description: "Média do tempo que o card passou bloqueado por impedimentos.",
	},
	{
		key: "awaitingPublicationTime",
		label: "Aguardando publicação",
		description: "Média do tempo que o card esperou para ser publicado.",
	},
];
```

- [ ] **Step 2: Criar `stat-tile.tsx`**

```tsx
import { METRIC_DEFINITIONS, type MetricKey } from "./metric-definitions";

type StatTileProps = {
	metricKey: MetricKey;
	value: string;
	secondary?: string;
};

export function StatTile({ metricKey, value, secondary }: StatTileProps) {
	const definition = METRIC_DEFINITIONS.find((item) => item.key === metricKey);

	return (
		<div
			data-testid={`metric-tile-${metricKey}`}
			className="flex flex-col gap-1 rounded-xl border border-(--border) bg-(--surface) p-4"
		>
			<h3
				title={definition?.description}
				className="text-sm font-semibold opacity-70"
			>
				{definition?.label ?? metricKey}
			</h3>
			<p className="font-mono text-lg font-semibold">
				{value}
				{secondary ? (
					<span className="ml-2 text-sm font-normal opacity-70">
						{secondary}
					</span>
				) : null}
			</p>
		</div>
	);
}
```

- [ ] **Step 3: Criar `current-status-section.tsx`**

```tsx
import type { WipBreakdown } from "@/application/metrics/ports/metrics-query-port";
import { StatTile } from "./stat-tile";

type CurrentStatusSectionProps = {
	wip: WipBreakdown;
};

export function CurrentStatusSection({ wip }: CurrentStatusSectionProps) {
	return (
		<section className="flex flex-col gap-3">
			<h2 className="text-sm font-semibold opacity-70">Situação atual</h2>
			<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
				<StatTile metricKey="wip" value={String(wip.total)} />
				<StatTile metricKey="blocked" value={String(wip.blocked)} />
				<StatTile metricKey="inReview" value={String(wip.inReview)} />
				<StatTile metricKey="inTesting" value={String(wip.inTesting)} />
				<StatTile metricKey="inPublication" value={String(wip.inPublication)} />
			</div>
		</section>
	);
}
```

- [ ] **Step 4: Criar `week-result-section.tsx`**

```tsx
import type { PeriodMetrics } from "@/application/metrics/use-cases/get-metrics-for-period";
import { formatPercent } from "./format-metric-value";
import { StatTile } from "./stat-tile";

type WeekResultSectionProps = {
	current: PeriodMetrics;
};

export function WeekResultSection({ current }: WeekResultSectionProps) {
	const counts = current.predictabilityCounts;

	return (
		<section className="flex flex-col gap-3">
			<h2 className="text-sm font-semibold opacity-70">Resultado da semana</h2>
			<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
				<StatTile
					metricKey="delivered"
					value={counts ? `${counts.delivered}/${counts.planned}` : "sem dados"}
				/>
				<StatTile
					metricKey="predictability"
					value={
						current.predictability === null
							? "sem dados"
							: formatPercent(current.predictability)
					}
				/>
				<StatTile
					metricKey="unplannedCount"
					value={
						current.unplannedCount === null
							? "sem dados"
							: String(current.unplannedCount)
					}
				/>
				<StatTile
					metricKey="reworkCount"
					value={
						current.reworkCount === null
							? "sem dados"
							: `${current.reworkCount} cards`
					}
					secondary={
						current.reworkRate === null
							? undefined
							: `(${formatPercent(current.reworkRate)})`
					}
				/>
			</div>
		</section>
	);
}
```

- [ ] **Step 5: Criar `flow-time-section.tsx`**

```tsx
import type { DurationStats } from "@/application/metrics/formulas/duration-metrics";
import type { PeriodMetrics } from "@/application/metrics/use-cases/get-metrics-for-period";
import { formatDuration } from "./format-metric-value";
import type { MetricKey } from "./metric-definitions";
import { StatTile } from "./stat-tile";

type FlowTimeSectionProps = {
	current: PeriodMetrics;
};

function DurationTile({
	metricKey,
	stats,
}: {
	metricKey: MetricKey;
	stats: DurationStats | null;
}) {
	return (
		<StatTile
			metricKey={metricKey}
			value={stats ? formatDuration(stats.averageMs) : "sem dados"}
		/>
	);
}

export function FlowTimeSection({ current }: FlowTimeSectionProps) {
	return (
		<section className="flex flex-col gap-3">
			<h2 className="text-sm font-semibold opacity-70">Tempo do fluxo</h2>
			<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
				<DurationTile metricKey="leadTime" stats={current.leadTime} />
				<DurationTile metricKey="cycleTime" stats={current.cycleTime} />
				<DurationTile metricKey="codeReviewTime" stats={current.codeReviewTime} />
				<DurationTile metricKey="testingTime" stats={current.testingTime} />
				<DurationTile metricKey="blockedTime" stats={current.blockedTime} />
				<DurationTile
					metricKey="awaitingPublicationTime"
					stats={current.awaitingPublicationTime}
				/>
			</div>
		</section>
	);
}
```

- [ ] **Step 6: Reescrever `metrics-dashboard.tsx`**

Substituir o arquivo inteiro por:

```tsx
import type { PeriodType } from "@/application/metrics/period";
import type { PeriodMetrics } from "@/application/metrics/use-cases/get-metrics-for-period";
import { CurrentStatusSection } from "./current-status-section";
import { FlowTimeSection } from "./flow-time-section";
import { formatPeriodLabel } from "./format-period-label";
import { MetricInfoButton } from "./metric-info-button";
import { PeriodFilter } from "./period-filter";
import { WeekResultSection } from "./week-result-section";

type MetricsDashboardProps = {
	periodType: PeriodType;
	referenceDate: Date;
	current: PeriodMetrics;
};

export function MetricsDashboard({
	periodType,
	referenceDate,
	current,
}: MetricsDashboardProps) {
	return (
		<div className="flex flex-1 flex-col gap-6 p-6">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<h1 className="text-xl font-semibold">Métricas</h1>
					<span className="text-xl font-semibold text-(--foreground-muted)">
						|
					</span>
					<span className="text-xl font-semibold">
						{formatPeriodLabel(
							periodType,
							current.periodStart,
							current.periodEnd,
						)}
					</span>
				</div>
				<div className="flex items-center gap-2">
					<MetricInfoButton />
					<PeriodFilter periodType={periodType} referenceDate={referenceDate} />
				</div>
			</div>
			<CurrentStatusSection wip={current.wip} />
			<WeekResultSection current={current} />
			<FlowTimeSection current={current} />
		</div>
	);
}
```

- [ ] **Step 7: Remover `formatDurationCompact` (sem uso depois que o gráfico sai)**

Em `src/presentation/metrics-dashboard/format-metric-value.ts`, remover a função `formatDurationCompact` inteira (mantendo `formatDuration` e `formatPercent`):

```ts
export function formatDurationCompact(ms: number): string {
	if (ms === 0) {
		return "0";
	}
	const totalMinutes = Math.round(ms / 60_000);
	if (totalMinutes < 60) {
		return `${totalMinutes}min`;
	}
	const totalHours = Math.round(ms / 3_600_000);
	if (totalHours < 24) {
		return `${totalHours}h`;
	}
	return `${Math.round(ms / 86_400_000)}d`;
}
```

- [ ] **Step 8: Atualizar `app/metrics/page.tsx`**

Trocar:

```ts
	const metricsUseCases = createMetricsUseCases();
	const { current, weeklySeries, monthlySeries } =
		await metricsUseCases.getMetricsDashboard(
			currentTeam.id,
			periodType,
			referenceDate,
		);

	return (
		<MetricsDashboard
			periodType={periodType}
			referenceDate={referenceDate}
			current={current}
			weeklySeries={weeklySeries}
			monthlySeries={monthlySeries}
		/>
	);
```

por:

```ts
	const metricsUseCases = createMetricsUseCases();
	const { current } = await metricsUseCases.getMetricsDashboard(
		currentTeam.id,
		periodType,
		referenceDate,
	);

	return (
		<MetricsDashboard
			periodType={periodType}
			referenceDate={referenceDate}
			current={current}
		/>
	);
```

- [ ] **Step 9: Apagar os arquivos de gráfico sem uso**

```bash
git rm src/presentation/metrics-dashboard/metric-card.tsx src/presentation/metrics-dashboard/metric-trend-chart.tsx src/presentation/metrics-dashboard/to-trend-points.ts src/presentation/metrics-dashboard/to-trend-points.test.ts
```

- [ ] **Step 10: Rodar typecheck, lint, testes unitários e knip**

Run: `npm run typecheck && npm run lint && npx vitest run src/presentation/metrics-dashboard && npm run knip`
Expected: PASS. Se o Knip acusar `recharts` sem uso (era usado só por `metric-trend-chart.tsx`), remover a dependência do `package.json` e do `techdocs/guidelines.md` (linha "Recharts para gráficos do dashboard de métricas") **apenas se for confirmado que não há nenhum outro uso** — não é esperado, mas checar antes de remover.

- [ ] **Step 11: Commit**

```bash
git add src/presentation/metrics-dashboard src/app/metrics/page.tsx
git commit -m "feat(metricas)!: substitui a grade de graficos por 3 blocos de resumo"
```

---

## Task 7: E2E — reescrever `metrics-dashboard.spec.ts`

**Files:**
- Modify: `tests/integration/metrics-dashboard.spec.ts`

**Interfaces:**
- Consumes: `data-testid="metric-tile-<key>"` (Task 6, `stat-tile.tsx`); `Data prevista de entrega` obrigatória no formulário (spec de due date).

- [ ] **Step 1: Substituir o arquivo inteiro**

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

test("mostra os 3 blocos com zeros/sem dados quando o time não tem tasks", async ({
	page,
}) => {
	await page.getByRole("link", { name: "Métricas" }).click();
	await expect(page).toHaveURL("/metrics");

	await expect(
		page.getByRole("heading", { name: "Situação atual" }),
	).toBeVisible();
	await expect(
		page.getByRole("heading", { name: "Resultado da semana" }),
	).toBeVisible();
	await expect(
		page.getByRole("heading", { name: "Tempo do fluxo" }),
	).toBeVisible();

	await expect(page.getByTestId("metric-tile-wip").getByText("0")).toBeVisible();
	await expect(
		page.getByTestId("metric-tile-leadTime").getByText("sem dados"),
	).toBeVisible();
	await expect(
		page.getByTestId("metric-tile-delivered").getByText("sem dados"),
	).toBeVisible();
});

test("Situação atual reflete WIP, bloqueados e coluna atual das tasks", async ({
	page,
}) => {
	await page.getByRole("button", { name: "Task" }).click();
	await page.getByLabel("Id externo").fill("TASK-1");
	await page.getByLabel("Descrição").fill("Corrigir bug de login");
	await page
		.getByLabel("Coluna inicial")
		.selectOption({ label: "Desenvolvimento" });
	await page.getByLabel("Data prevista de entrega").fill("2026-12-31");
	await page.getByRole("button", { name: "Salvar" }).click();

	await page.getByRole("button", { name: "Task" }).click();
	await page.getByLabel("Id externo").fill("TASK-2");
	await page.getByLabel("Descrição").fill("Escrever testes de login");
	await page.getByLabel("Coluna inicial").selectOption({ label: "Testes" });
	await page.getByLabel("Data prevista de entrega").fill("2026-12-31");
	await page.getByRole("button", { name: "Salvar" }).click();

	await page
		.getByTitle("História")
		.filter({ hasText: "TASK-1" })
		.getByRole("button", { name: "Editar task" })
		.click();
	await page.getByRole("checkbox", { name: "⛔ Bloqueado" }).click();
	await page.getByRole("dialog").getByRole("button", { name: "Fechar" }).click();

	await page.getByRole("link", { name: "Métricas" }).click();

	await expect(page.getByTestId("metric-tile-wip").getByText("2")).toBeVisible();
	await expect(
		page.getByTestId("metric-tile-blocked").getByText("1"),
	).toBeVisible();
	await expect(
		page.getByTestId("metric-tile-inTesting").getByText("1"),
	).toBeVisible();
});

test("card retroativo concluído hoje entra em Entregues e Retrabalho", async ({
	page,
}) => {
	const today = new Date().toISOString().slice(0, 10);
	await page.getByRole("button", { name: "Retroativo" }).click();
	await page.getByLabel("Id externo").fill("TASK-HIST-1");
	await page.getByLabel("Descrição").fill("Migração legada");
	await page.getByLabel("Status da etapa 1").selectOption({ label: "Backlog" });
	await page.getByLabel("Data da etapa 1").fill(today);
	await page.getByRole("button", { name: "+ Adicionar etapa" }).click();
	await page
		.getByLabel("Status da etapa 2")
		.selectOption({ label: "Desenvolvimento" });
	await page.getByLabel("Data da etapa 2").fill(today);
	await page.getByRole("button", { name: "+ Adicionar etapa" }).click();
	await page
		.getByLabel("Status da etapa 3")
		.selectOption({ label: "Revisão" });
	await page.getByLabel("Data da etapa 3").fill(today);
	await page.getByRole("button", { name: "+ Adicionar etapa" }).click();
	// Volta pra Desenvolvimento: essa é a transição que conta como retrabalho.
	await page
		.getByLabel("Status da etapa 4")
		.selectOption({ label: "Desenvolvimento" });
	await page.getByLabel("Data da etapa 4").fill(today);
	await page.getByRole("button", { name: "+ Adicionar etapa" }).click();
	await page
		.getByLabel("Status da etapa 5")
		.selectOption({ label: "Revisão" });
	await page.getByLabel("Data da etapa 5").fill(today);
	await page.getByRole("button", { name: "+ Adicionar etapa" }).click();
	await page
		.getByLabel("Status da etapa 6")
		.selectOption({ label: "Concluído" });
	await page.getByLabel("Data da etapa 6").fill(today);
	await page.getByLabel("Data prevista de entrega").fill(today);
	await page.getByRole("button", { name: "Salvar" }).click();

	await page.getByRole("link", { name: "Métricas" }).click();
	await expect(
		page.getByTestId("metric-tile-delivered").getByText("1/1"),
	).toBeVisible();
	await expect(
		page.getByTestId("metric-tile-reworkCount").getByText("1 cards"),
	).toBeVisible();
});

test("mostra o rótulo do período no cabeçalho e atualiza ao trocar de mês", async ({
	page,
}) => {
	await page.getByRole("link", { name: "Métricas" }).click();
	await expect(
		page.getByText(/^Semana \d+ · \d{2}\/\d{2} – \d{2}\/\d{2}$/),
	).toBeVisible();

	await page.getByRole("button", { name: "Mês" }).click();
	await expect(page.getByText(/^[A-ZÀ-Ú][a-zà-ú]+ de \d{4}$/)).toBeVisible();
});

test("o filtro de período atualiza a URL ao trocar semana/mês e navegar", async ({
	page,
}) => {
	await page.getByRole("link", { name: "Métricas" }).click();
	await expect(page).toHaveURL("/metrics");

	await page.getByRole("button", { name: "Mês" }).click();
	await page.waitForURL(/period=month/);
	const urlAfterMonth = new URL(page.url());

	await page.getByRole("button", { name: "Período anterior" }).click();
	await page.waitForURL(
		(url) =>
			url.search !== urlAfterMonth.search && /period=month/.test(url.search),
	);
	const urlAfterPrev = new URL(page.url());
	expect(urlAfterPrev.searchParams.get("date")).not.toBe(
		urlAfterMonth.searchParams.get("date"),
	);
});
```

- [ ] **Step 2: Rodar a suíte E2E de métricas**

Run: `npx playwright test tests/integration/metrics-dashboard.spec.ts`
Expected: PASS em todos os testes. Se o teste de retrabalho retroativo falhar por causa da regra "duas etapas seguidas não podem ter o mesmo status" ou de datas fora de ordem, ajustar as datas das etapas para serem estritamente crescentes (usar `today`, `today`, `today`, `today` já funciona porque os status mudam a cada etapa, não a data — confirmar com a regra de `create-historical-task.ts`, que só rejeita data **decrescente**, não igual).

- [ ] **Step 3: Commit**

```bash
git add tests/integration/metrics-dashboard.spec.ts
git commit -m "test(metricas)!: reescreve o e2e da pagina de metricas para os 3 blocos"
```

---

## Task 8: Verificação final

**Files:** nenhum (task de verificação).

- [ ] **Step 1: Rodar a suíte completa**

Run: `npm run typecheck && npm run lint && npm test && npm run knip && npm run test:e2e`
Expected: PASS em tudo.

- [ ] **Step 2: Conferir visualmente a página `/metrics` no navegador**

Run: `npm run dev` (em background) e abrir `http://localhost:3000/metrics` com um time que tenha tasks variadas — confirmar visualmente os 3 blocos, o tooltip ao passar o mouse no título de um tile, e o botão (i) ainda funcionando.

- [ ] **Step 3: Parar o servidor de dev**

Encerrar o processo iniciado no Step 2.

---

## Self-Review Notes

- **Cobertura da spec:** `WipBreakdown` estruturado (Tasks 1–2), retrabalho em contagem + não planejados (Task 3–4), simplificação do `get-metrics-dashboard` sem séries (Task 5), 3 seções + tooltip nativo por tile + remoção dos gráficos (Task 6), E2E reescrito (Task 7) — todos os pontos da spec cobertos.
- **Sem placeholders:** cada step tem o código exato a escrever ou o diff exato a aplicar.
- **Consistência de tipos:** `MetricKey` (metric-definitions.ts) é o único vocabulário de chaves usado por `StatTile` e pelas 3 seções; `WipBreakdown`/`PeriodMetrics` fluem de `metrics-query-port.ts` (Task 1) até a presentation (Task 6) sem reintrodução do formato antigo.
