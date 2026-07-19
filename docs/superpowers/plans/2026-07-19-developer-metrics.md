# Métricas por desenvolvedor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar uma página privada de métricas por desenvolvedor, filtrável por período e por membro, com indicadores de apoio, entrega e qualidade acompanhados das tasks que explicam cada valor.

**Architecture:** Reutilizar o fluxo atual `app → composition → application/metrics → infrastructure/metrics`, acrescentando um filtro opcional de responsável ao snapshot existente. Um caso de uso novo calcula o período atual e o anterior com as fórmulas atuais e monta evidências; a apresentação reutiliza `PeriodFilter`, `StatTile`, definições e formatadores já existentes.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript estrito, Drizzle ORM + Postgres, Tailwind CSS, Vitest, Playwright, Biome e Knip.

## Global Constraints

- Ler e obedecer `techdocs/guidelines.md` e `techdocs/architecture.md` antes de editar código.
- Não criar nota, ranking, comparação nominal ou texto automático de avaliação.
- Usar “bugs associados”, nunca “bugs causados”.
- Não incluir WIP: o período histórico não pode misturar uma fotografia atual.
- Reutilizar nomes, fórmulas, cores, filtros e componentes do dashboard atual.
- O responsável atual é a atribuição válida nesta versão; histórico de troca e autoria compartilhada ficam fora do escopo.
- O combo de desenvolvedor preserva todos os parâmetros do período; o filtro de período preserva o desenvolvedor.
- Não adicionar dependências.
- Arquivos em kebab-case; componentes e tipos em PascalCase.
- Cada task termina com teste relevante, `npm run typecheck`, `npm run lint` e um commit coerente em português.

---

### Task 1: Filtrar o snapshot existente por responsável

**Files:**
- Modify: `src/application/metrics/ports/metrics-query-port.ts`
- Modify: `src/infrastructure/metrics/drizzle-metrics-query-port.ts`
- Modify: `src/infrastructure/metrics/drizzle-metrics-query-port.test.ts`
- Modify: `src/application/metrics/use-cases/get-metrics-for-period.test.ts`
- Modify: `src/application/metrics/use-cases/get-metrics-dashboard.test.ts`

**Interfaces:**
- Produces: `MetricTaskEvidence`, identidades nas tasks do snapshot e `loadSnapshot(teamId, periodStart, periodEnd, assigneeId?)`.
- Compatibility: chamadas sem `assigneeId` mantêm exatamente o dashboard agregado atual.

- [ ] **Step 1: Escrever o teste de infraestrutura que falha**

Adicionar ao `describe("drizzleMetricsQueryPort", ...)` um cenário com duas tasks concluídas, cada uma atribuída a um membro, e um bug ligado à task do primeiro membro:

```ts
	it("filtra todas as métricas pelo responsável sem alterar a consulta agregada", async () => {
		const memberA = "22222222-2222-2222-2222-222222222222";
		const memberB = "33333333-3333-3333-3333-333333333333";
		const taskA = await insertTask({
			externalId: "TASK-A",
			description: "Entrega da Ana",
			assigneeId: memberA,
			status: "DONE",
			dueDate: "2026-07-10",
		});
		const taskB = await insertTask({
			externalId: "TASK-B",
			description: "Entrega do Bruno",
			assigneeId: memberB,
			status: "DONE",
			dueDate: "2026-07-10",
		});
		await db.insert(taskStatusChanges).values([
			{
				taskId: taskA.id,
				fromStatus: "IN_DEVELOPMENT",
				toStatus: "DONE",
				changedAt: new Date("2026-07-10T12:00:00Z"),
			},
			{
				taskId: taskB.id,
				fromStatus: "IN_DEVELOPMENT",
				toStatus: "DONE",
				changedAt: new Date("2026-07-10T13:00:00Z"),
			},
		]);
		const [bugType] = await db
			.insert(taskTypes)
			.values({ name: "Bug individual", color: "#dc2626", isBug: true })
			.returning();
		await insertTask({
			externalId: "BUG-A",
			description: "Bug associado à entrega A",
			typeId: bugType.id,
			parentTaskId: taskA.id,
			createdAt: new Date("2026-07-11T00:00:00Z"),
		});

		const start = new Date("2026-07-01T00:00:00Z");
		const end = new Date("2026-08-01T00:00:00Z");
		const individual = await drizzleMetricsQueryPort.loadSnapshot(
			TEAM_ID,
			start,
			end,
			memberA,
		);
		const aggregate = await drizzleMetricsQueryPort.loadSnapshot(
			TEAM_ID,
			start,
			end,
		);

		expect(individual.completionEvents.map((item) => item.externalId)).toEqual([
			"TASK-A",
		]);
		expect(individual.dueDateTasks.map((item) => item.externalId)).toEqual([
			"TASK-A",
		]);
		expect(individual.bugEvents[0]).toMatchObject({
			parentTaskId: taskA.id,
			parentExternalId: "TASK-A",
			parentDescription: "Entrega da Ana",
		});
		expect(aggregate.completionEvents).toHaveLength(2);
	});
```

- [ ] **Step 2: Rodar o teste e confirmar a falha**

Run: `npx vitest run src/infrastructure/metrics/drizzle-metrics-query-port.test.ts -t "filtra todas"`

Expected: FAIL porque `loadSnapshot` ainda não recebe o responsável e os eventos não expõem `externalId`, `description` ou `parentDescription`.

- [ ] **Step 3: Expandir os contratos mínimos do port**

Em `metrics-query-port.ts`, usar estes contratos:

```ts
export type MetricTaskEvidence = {
	taskId: string;
	externalId: string;
	description: string;
};

export type CompletedTaskMetrics = MetricTaskEvidence & {
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

export type DueDateTaskMetrics = MetricTaskEvidence & {
	dueDate: string;
	firstCompletedAt: Date | null;
};

type CompletionEvent = MetricTaskEvidence & {
	createdAt: Date;
	completedAt: Date;
	dueDate: string;
};

export type BugEvent = {
	taskId: string;
	createdAt: Date;
	parentTaskId: string | null;
	parentExternalId: string | null;
	parentDescription: string | null;
};

export type MetricsQueryPort = {
	loadSnapshot(
		teamId: string,
		periodStart: Date,
		periodEnd: Date,
		assigneeId?: string,
	): Promise<MetricsSnapshot>;
};
```

- [ ] **Step 4: Aplicar o filtro em todas as queries relevantes**

Em `drizzle-metrics-query-port.ts`, o quarto argumento passa a se chamar `assigneeId`. Adicionar identidade às seleções de conclusão e prazo e descrição da task-pai à seleção de bugs:

```ts
		async loadSnapshot(teamId, periodStart, periodEnd, assigneeId) {
			const taskAssigneeCondition = assigneeId
				? eq(tasks.assigneeId, assigneeId)
				: undefined;
			const parentAssigneeCondition = assigneeId
				? eq(parentTasks.assigneeId, assigneeId)
				: undefined;
```

```ts
					.select({
						taskId: taskStatusChanges.taskId,
						externalId: tasks.externalId,
						description: tasks.description,
						createdAt: tasks.createdAt,
						completedAt: taskStatusChanges.changedAt,
						dueDate: tasks.dueDate,
					})
```

```ts
					.select({
						taskId: tasks.id,
						externalId: tasks.externalId,
						description: tasks.description,
						dueDate: tasks.dueDate,
						firstCompletedAt: min(taskStatusChanges.changedAt),
					})
```

Adicionar `taskAssigneeCondition` ao `and(...)` das queries de conclusões, prazos e WIP. Adicionar `parentAssigneeCondition` ao `and(...)` da query de bugs. Incluir `tasks.externalId` e `tasks.description` no `groupBy` da query de prazos.

Na seleção e no mapeamento de bugs, incluir:

```ts
							parentExternalId: parentTasks.externalId,
							parentDescription: parentTasks.description,
```

```ts
						parentDescription: row.parentDescription ?? null,
```

No mapeamento de `dueDateTasks`, copiar também `externalId` e `description`.

- [ ] **Step 5: Ajustar as fixtures tipadas**

Em cada `completionEvents` e `dueDateTasks` literal de `get-metrics-for-period.test.ts` e `get-metrics-dashboard.test.ts`, incluir identidades estáveis:

```ts
	externalId: "TASK-1",
	description: "Task de teste",
```

Em cada `bugEvents` literal existente, incluir:

```ts
	parentDescription: "Task de origem",
```

- [ ] **Step 6: Verificar e commit**

Run: `npx vitest run src/infrastructure/metrics/drizzle-metrics-query-port.test.ts src/application/metrics/use-cases/get-metrics-for-period.test.ts src/application/metrics/use-cases/get-metrics-dashboard.test.ts && npm run typecheck && npm run lint`

Expected: PASS.

```bash
git add src/application/metrics/ports/metrics-query-port.ts src/infrastructure/metrics/drizzle-metrics-query-port.ts src/infrastructure/metrics/drizzle-metrics-query-port.test.ts src/application/metrics/use-cases/get-metrics-for-period.test.ts src/application/metrics/use-cases/get-metrics-dashboard.test.ts
git commit -m "feat(metricas)!: filtra snapshot por desenvolvedor"
```

---

### Task 2: Calcular métricas individuais e evidências

**Files:**
- Modify: `src/application/metrics/formulas/rate-metrics.ts`
- Modify: `src/application/metrics/formulas/rate-metrics.test.ts`
- Modify: `src/application/metrics/use-cases/get-metrics-for-period.ts`
- Create: `src/application/metrics/use-cases/get-developer-metrics.ts`
- Create: `src/application/metrics/use-cases/get-developer-metrics.test.ts`

**Interfaces:**
- Consumes: `MetricsQueryPort.loadSnapshot(..., assigneeId)` e as fórmulas atuais.
- Produces: `getDeveloperMetrics(port, teamId, assigneeId, previousStart, start, end): Promise<DeveloperMetricsResult>`.

- [ ] **Step 1: Escrever o teste que falha para período anterior e evidências**

Criar `get-developer-metrics.test.ts` com uma fixture que tenha uma task no período anterior, duas no atual, uma com retrabalho/bloqueio/review/testes e um bug associado. A asserção central deve ser:

```ts
	const result = await getDeveloperMetrics(
		port,
		"team-1",
		"member-1",
		new Date("2026-06-28T00:00:00Z"),
		new Date("2026-07-15T00:00:00Z"),
		new Date("2026-08-01T00:00:00Z"),
	);

	expect(capturedCall).toEqual({
		teamId: "team-1",
		assigneeId: "member-1",
		start: new Date("2026-06-28T00:00:00Z"),
		end: new Date("2026-08-01T00:00:00Z"),
	});
	expect(result.current.throughput).toBe(2);
	expect(result.previous.throughput).toBe(1);
	expect(result.evidence.delivered.map((task) => task.externalId)).toEqual([
		"TASK-ATUAL-1",
		"TASK-ATUAL-2",
	]);
	expect(result.evidence.rework.map((task) => task.externalId)).toEqual([
		"TASK-ATUAL-1",
	]);
	expect(result.evidence.blocked.map((task) => task.externalId)).toEqual([
		"TASK-ATUAL-1",
	]);
	expect(result.evidence.bugsAssociated).toEqual([
		{
			taskId: "task-atual-1",
			externalId: "TASK-ATUAL-1",
			description: "Entrega atual 1",
		},
	]);
```

- [ ] **Step 2: Rodar o teste e confirmar a falha**

Run: `npx vitest run src/application/metrics/use-cases/get-developer-metrics.test.ts`

Expected: FAIL porque o módulo não existe.

- [ ] **Step 3: Expor os dois predicados que já definem contagens**

Em `rate-metrics.ts`, substituir o predicado privado de retrabalho e reutilizá-lo nas fórmulas:

```ts
export function hasRework(task: CompletedTaskMetrics): boolean {
	return task.statusChanges.some(
		(change) =>
			change.toStatus === "IN_DEVELOPMENT" &&
			change.fromStatus !== null &&
			change.fromStatus !== "TODO" &&
			change.fromStatus !== "IN_DEVELOPMENT",
	);
}

export function isUnplanned(
	task: CompletedTaskMetrics,
	periodStart: Date,
	periodEnd: Date,
): boolean {
	const startDate = periodStart.toISOString().slice(0, 10);
	const endDate = periodEnd.toISOString().slice(0, 10);
	return task.dueDate < startDate || task.dueDate >= endDate;
}
```

`calculateReworkCount` usa `tasks.filter(hasRework).length`; `calculateUnplannedCount` usa `tasks.filter((task) => isUnplanned(task, periodStart, periodEnd)).length`. Acrescentar em `rate-metrics.test.ts` um caso direto para cada predicado, confirmando que a regra não mudou.

- [ ] **Step 4: Reutilizar a montagem de tasks concluídas**

Em `get-metrics-for-period.ts`, extrair e exportar o código atual que deduplica conclusões e anexa status/bloqueios:

```ts
export function getCompletedTasksForRange(
	snapshot: MetricsSnapshot,
	periodStart: Date,
	periodEnd: Date,
): CompletedTaskMetrics[] {
	const completionByTask = new Map<
		string,
		MetricsSnapshot["completionEvents"][number]
	>();
	for (const completion of snapshot.completionEvents) {
		if (
			completion.completedAt >= periodStart &&
			completion.completedAt < periodEnd
		) {
			const previous = completionByTask.get(completion.taskId);
			if (!previous || completion.completedAt > previous.completedAt) {
				completionByTask.set(completion.taskId, completion);
			}
		}
	}
	return [...completionByTask.values()].map((completion) => ({
		...completion,
		statusChanges: snapshot.statusChanges
			.filter((change) => change.taskId === completion.taskId)
			.map(({ taskId: _taskId, ...change }) => change),
		blockedPeriods: snapshot.blockedPeriods
			.filter((period) => period.taskId === completion.taskId)
			.map(({ taskId: _taskId, ...period }) => period),
	}));
}
```

`getMetricsForRange` chama essa função no lugar do bloco extraído.

- [ ] **Step 5: Implementar o caso de uso novo**

Criar `get-developer-metrics.ts` com estes contratos e fluxo:

```ts
import { hasRework, isUnplanned } from "@/application/metrics/formulas/rate-metrics";
import type {
	MetricTaskEvidence,
	MetricsQueryPort,
	MetricsSnapshot,
} from "@/application/metrics/ports/metrics-query-port";
import {
	getCompletedTasksForRange,
	getMetricsForRange,
	type HistoricalPeriodMetrics,
} from "./get-metrics-for-period";

export type DeveloperMetricEvidence = {
	delivered: MetricTaskEvidence[];
	predictability: MetricTaskEvidence[];
	cycleTime: MetricTaskEvidence[];
	unplanned: MetricTaskEvidence[];
	rework: MetricTaskEvidence[];
	blocked: MetricTaskEvidence[];
	codeReview: MetricTaskEvidence[];
	testing: MetricTaskEvidence[];
	bugsAssociated: MetricTaskEvidence[];
};

export type DeveloperMetricsResult = {
	current: HistoricalPeriodMetrics;
	previous: HistoricalPeriodMetrics;
	evidence: DeveloperMetricEvidence;
};

function identity(task: MetricTaskEvidence): MetricTaskEvidence {
	return {
		taskId: task.taskId,
		externalId: task.externalId,
		description: task.description,
	};
}

function unique(tasks: MetricTaskEvidence[]): MetricTaskEvidence[] {
	return [...new Map(tasks.map((task) => [task.taskId, task])).values()];
}

function currentDueDateTasks(
	snapshot: MetricsSnapshot,
	start: Date,
	end: Date,
) {
	const startDate = start.toISOString().slice(0, 10);
	const endDate = end.toISOString().slice(0, 10);
	return snapshot.dueDateTasks.filter(
		(task) => task.dueDate >= startDate && task.dueDate < endDate,
	);
}

export async function getDeveloperMetrics(
	port: MetricsQueryPort,
	teamId: string,
	assigneeId: string,
	previousStart: Date,
	start: Date,
	end: Date,
): Promise<DeveloperMetricsResult> {
	const snapshot = await port.loadSnapshot(
		teamId,
		previousStart,
		end,
		assigneeId,
	);
	const completed = getCompletedTasksForRange(snapshot, start, end);

	return {
		current: getMetricsForRange(snapshot, start, end),
		previous: getMetricsForRange(snapshot, previousStart, start),
		evidence: {
			delivered: completed.map(identity),
			predictability: currentDueDateTasks(snapshot, start, end).map(identity),
			cycleTime: completed
				.filter((task) =>
					task.statusChanges.some(
						(change) => change.toStatus === "IN_DEVELOPMENT",
					),
				)
				.map(identity),
			unplanned: completed
				.filter((task) => isUnplanned(task, start, end))
				.map(identity),
			rework: completed.filter(hasRework).map(identity),
			blocked: completed
				.filter((task) => task.blockedPeriods.length > 0)
				.map(identity),
			codeReview: completed
				.filter((task) =>
					task.statusChanges.some((change) => change.toStatus === "CODE_REVIEW"),
				)
				.map(identity),
			testing: completed
				.filter((task) =>
					task.statusChanges.some((change) => change.toStatus === "TESTING"),
				)
				.map(identity),
			bugsAssociated: unique(
				snapshot.bugEvents
					.filter(
						(event) =>
							event.createdAt >= start &&
							event.createdAt < end &&
							event.parentTaskId &&
							event.parentExternalId &&
							event.parentDescription,
					)
					.map((event) => ({
						taskId: event.parentTaskId as string,
						externalId: event.parentExternalId as string,
						description: event.parentDescription as string,
					})),
			),
		},
	};
}
```

- [ ] **Step 6: Verificar e commit**

Run: `npx vitest run src/application/metrics/formulas/rate-metrics.test.ts src/application/metrics/use-cases/get-metrics-for-period.test.ts src/application/metrics/use-cases/get-developer-metrics.test.ts && npm run typecheck && npm run lint`

Expected: PASS.

```bash
git add src/application/metrics/formulas/rate-metrics.ts src/application/metrics/formulas/rate-metrics.test.ts src/application/metrics/use-cases/get-metrics-for-period.ts src/application/metrics/use-cases/get-developer-metrics.ts src/application/metrics/use-cases/get-developer-metrics.test.ts
git commit -m "feat(metricas)!: calcula metricas e evidencias por desenvolvedor"
```

---

### Task 3: Fazer o filtro de período preservar o desenvolvedor

**Files:**
- Create: `src/presentation/metrics-dashboard/build-metrics-url.ts`
- Create: `src/presentation/metrics-dashboard/build-metrics-url.test.ts`
- Modify: `src/presentation/metrics-dashboard/period-filter.tsx`
- Modify: `src/presentation/metrics-dashboard/parse-metrics-search-params.ts`

**Interfaces:**
- Produces: `buildMetricsUrl(pathname, currentSearch, filter)`; `MetricsSearchParams.developer?: string`.
- Behavior: remove somente `period`, `date`, `start` e `end`; qualquer outro parâmetro permanece.

- [ ] **Step 1: Escrever os testes que falham**

Criar `build-metrics-url.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildMetricsUrl } from "./build-metrics-url";

describe("buildMetricsUrl", () => {
	it("preserva o desenvolvedor ao trocar o período", () => {
		const url = buildMetricsUrl(
			"/metrics/developers",
			new URLSearchParams("developer=member-1&period=week&date=2026-07-19"),
			{ period: "month", date: "2026-07-19" },
		);
		expect(url).toBe(
			"/metrics/developers?developer=member-1&period=month&date=2026-07-19",
		);
	});

	it("troca filtros regulares por um intervalo personalizado", () => {
		const url = buildMetricsUrl(
			"/metrics/developers",
			new URLSearchParams("developer=member-1&period=month&date=2026-07-19"),
			{ period: "sprint", start: "2026-07-01", end: "2026-07-15" },
		);
		expect(url).toBe(
			"/metrics/developers?developer=member-1&period=sprint&start=2026-07-01&end=2026-07-15",
		);
	});
});
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npx vitest run src/presentation/metrics-dashboard/build-metrics-url.test.ts`

Expected: FAIL porque o módulo não existe.

- [ ] **Step 3: Implementar o builder puro**

Criar `build-metrics-url.ts`:

```ts
import type { MetricsSearchParams } from "./parse-metrics-search-params";

const FILTER_KEYS = ["period", "date", "start", "end"] as const;

export function buildMetricsUrl(
	pathname: string,
	currentSearch: URLSearchParams,
	filter: MetricsSearchParams,
): string {
	const params = new URLSearchParams(currentSearch);
	for (const key of FILTER_KEYS) params.delete(key);
	for (const [key, value] of Object.entries(filter)) {
		if (value) params.set(key, value);
	}
	return `${pathname}?${params.toString()}`;
}
```

- [ ] **Step 4: Reutilizar o builder no componente existente**

Em `period-filter.tsx`, importar `usePathname` e `useSearchParams`, além de `buildMetricsUrl`. Dentro do componente:

```ts
	const pathname = usePathname();
	const searchParams = useSearchParams();
```

Substituir os builders privados e os `router.push` por:

```ts
	function goTo(nextPeriodType: PeriodType, nextReferenceDate: Date) {
		router.push(
			buildMetricsUrl(pathname, new URLSearchParams(searchParams), {
				period:
					nextPeriodType === "MONTH"
						? "month"
						: nextPeriodType === "FORTNIGHT"
							? "fortnight"
							: "week",
				date: toDateParam(nextReferenceDate),
			}),
		);
	}
```

```ts
		router.push(
			buildMetricsUrl(pathname, new URLSearchParams(searchParams), {
				period: "sprint",
				start,
				end,
			}),
		);
```

Acrescentar `developer?: string` a `MetricsSearchParams`; `parseMetricsFilter` continua ignorando esse campo.

- [ ] **Step 5: Verificar e commit**

Run: `npx vitest run src/presentation/metrics-dashboard/build-metrics-url.test.ts src/presentation/metrics-dashboard/parse-metrics-search-params.test.ts src/presentation/metrics-dashboard/shift-reference-date.test.ts && npm run typecheck && npm run lint`

Expected: PASS.

```bash
git add src/presentation/metrics-dashboard/build-metrics-url.ts src/presentation/metrics-dashboard/build-metrics-url.test.ts src/presentation/metrics-dashboard/period-filter.tsx src/presentation/metrics-dashboard/parse-metrics-search-params.ts
git commit -m "refactor(metricas)!: preserva parametros no filtro de periodo"
```

---

### Task 4: Montar a página e o seletor de desenvolvedor

**Files:**
- Modify: `src/composition/metrics.ts`
- Modify: `src/presentation/metrics-dashboard/metric-definitions.ts`
- Modify: `src/presentation/metrics-dashboard/stat-tile.tsx`
- Create: `src/presentation/developer-metrics/developer-selector.tsx`
- Create: `src/presentation/developer-metrics/developer-metrics-dashboard.tsx`
- Create: `src/app/metrics/developers/page.tsx`
- Modify: `src/presentation/metrics-dashboard/metrics-dashboard.tsx`
- Modify: `src/presentation/shared/header-nav.tsx`
- Create: `tests/integration/developer-metrics.spec.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: `DeveloperMetricsResult`, membros do `getTeam`, `PeriodFilter` e `StatTile`.
- Produces: `/metrics/developers?developer=<uuid>&period=...`.

- [ ] **Step 1: Escrever o E2E que falha**

Criar `developer-metrics.spec.ts`. O teste cria um time, adiciona Ana e Bruno, cria uma task retroativa concluída para cada um, abre a página pelo link “Por desenvolvedor”, troca o combo e confirma que o período permanece:

```ts
import { expect, type Page, test } from "@playwright/test";
import { resetDatabase } from "./reset-db";

async function createDeliveredTask(
	page: Page,
	externalId: string,
	assignee: string,
) {
	const today = new Date().toISOString().slice(0, 10);
	await page.getByRole("button", { name: "Retroativo" }).click();
	await page.getByLabel("Id externo").fill(externalId);
	await page.getByLabel("Descrição").fill(`Entrega de ${assignee}`);
	await page.getByLabel("Responsável").selectOption({ label: assignee });
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
		.selectOption({ label: "Concluído" });
	await page.getByLabel("Data da etapa 3").fill(today);
	await page.getByLabel("Data prevista de entrega").fill(today);
	await page.getByRole("button", { name: "Salvar" }).click();
}

test.beforeEach(async ({ page }) => {
	await resetDatabase();
	await page.goto("/teams");
	await page.getByPlaceholder("Nome do time").fill("Time A");
	await page.getByRole("button", { name: "Criar time" }).click();
	await page.getByRole("button", { name: "Time A" }).click();
	for (const name of ["Ana", "Bruno"]) {
		await page.getByPlaceholder("Nome do novo membro").fill(name);
		await page.getByRole("button", { name: "Adicionar membro" }).click();
	}
	await page.goto("/board");
	await createDeliveredTask(page, "TASK-ANA", "Ana");
	await createDeliveredTask(page, "TASK-BRUNO-1", "Bruno");
	await createDeliveredTask(page, "TASK-BRUNO-2", "Bruno");
});

test("troca o desenvolvedor sem perder o período", async ({ page }) => {
	await page.goto("/metrics");
	await page.getByRole("link", { name: "Por desenvolvedor" }).click();
	await expect(page).toHaveURL(/\/metrics\/developers\?developer=/);

	await page.getByRole("button", { name: "Quinzena" }).click();
	await expect(page).toHaveURL(/period=fortnight/);
	const firstUrl = new URL(page.url());
	await expect(
		page.getByTestId("metric-tile-delivered").getByText("1", { exact: true }),
	).toBeVisible();

	await page.getByLabel("Desenvolvedor").selectOption({ label: "Bruno" });
	await expect(page).toHaveURL(/developer=/);
	const secondUrl = new URL(page.url());
	expect(secondUrl.searchParams.get("developer")).not.toBe(
		firstUrl.searchParams.get("developer"),
	);
	expect(secondUrl.searchParams.get("period")).toBe("fortnight");
	await expect(
		page.getByTestId("metric-tile-delivered").getByText("2", { exact: true }),
	).toBeVisible();
	await expect(page.getByRole("heading", { name: "Apoio" })).toBeVisible();
	await expect(page.getByRole("heading", { name: "Entrega" })).toBeVisible();
	await expect(page.getByRole("heading", { name: "Qualidade" })).toBeVisible();
});
```

- [ ] **Step 2: Rodar o E2E e confirmar a falha**

Run: `npx playwright test tests/integration/developer-metrics.spec.ts`

Expected: FAIL porque a rota e o link ainda não existem.

- [ ] **Step 3: Ligar o caso de uso no composition root**

Em `composition/metrics.ts`, importar `getDeveloperMetrics` e adicionar:

```ts
		getDeveloperMetrics: (
			teamId: string,
			assigneeId: string,
			previousStart: Date,
			start: Date,
			end: Date,
		) =>
			getDeveloperMetrics(
				drizzleMetricsQueryPort,
				teamId,
				assigneeId,
				previousStart,
				start,
				end,
			),
```

- [ ] **Step 4: Fazer o combo preservar a query inteira**

Criar `developer-selector.tsx`:

```tsx
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Member } from "@/domain/team/entities/member";

export function DeveloperSelector({
	members,
	selectedId,
}: {
	members: Member[];
	selectedId: string;
}) {
	const pathname = usePathname();
	const router = useRouter();
	const searchParams = useSearchParams();

	return (
		<label className="flex min-w-60 flex-col gap-2 text-sm text-(--foreground-muted)">
			Desenvolvedor
			<select
				value={selectedId}
				onChange={(event) => {
					const params = new URLSearchParams(searchParams);
					params.set("developer", event.target.value);
					router.push(`${pathname}?${params.toString()}`);
				}}
				className="rounded-lg border border-(--border) bg-(--surface) px-3 py-2 text-(--foreground)"
			>
				{members.map((member) => (
					<option key={member.id} value={member.id}>
						{member.name}
					</option>
				))}
			</select>
		</label>
	);
}
```

- [ ] **Step 5: Permitir evidências no tile padrão**

Adicionar `bugsAssociated` ao `MetricKey` e esta definição em `metric-definitions.ts`:

```ts
	{
		key: "bugsAssociated",
		label: "Bugs associados",
		description:
			"Bugs abertos no período vinculados às entregas do desenvolvedor.",
	},
```

Em `stat-tile.tsx`, adicionar a prop opcional:

```ts
	evidence?: MetricTaskEvidence[];
```

Importar `MetricTaskEvidence` e renderizar depois do bloco `detail`:

```tsx
			{evidence && evidence.length > 0 ? (
				<details className="mt-3 border-t border-(--border) pt-3 text-xs text-(--foreground-muted)">
					<summary className="cursor-pointer">Ver tasks ({evidence.length})</summary>
					<ul className="mt-2 flex flex-col gap-1">
						{evidence.map((task) => (
							<li key={task.taskId}>
								<span className="font-mono text-(--accent)">{task.externalId}</span>
								{" — "}
								{task.description}
							</li>
						))}
					</ul>
				</details>
			) : null}
```

- [ ] **Step 6: Criar o dashboard individual com os três grupos**

Criar `developer-metrics-dashboard.tsx`. O componente recebe `periodType`, `referenceDate`, `members`, `selectedMember`, `current`, `previous` e `evidence`; usa o mesmo cabeçalho, `PeriodFilter`, `formatPeriodLabel`, `formatSprintLabel`, `formatDuration`, `formatPercent` e `StatTile` atuais. A grade deve conter exatamente:

```tsx
<section>
	<h2>Apoio</h2>
	<StatTile metricKey="blockedTime" value={formatDurationOrEmpty(current.blockedTime)} detail={`Período anterior: ${formatDurationOrEmpty(previous.blockedTime)}`} evidence={evidence.blocked} />
	<StatTile metricKey="codeReviewTime" value={formatDurationOrEmpty(current.codeReviewTime)} detail={`Período anterior: ${formatDurationOrEmpty(previous.codeReviewTime)}`} evidence={evidence.codeReview} />
	<StatTile metricKey="testingTime" value={formatDurationOrEmpty(current.testingTime)} detail={`Período anterior: ${formatDurationOrEmpty(previous.testingTime)}`} evidence={evidence.testing} />
</section>

<section>
	<h2>Entrega</h2>
	<StatTile metricKey="delivered" value={String(current.throughput)} detail={`Período anterior: ${previous.throughput}`} evidence={evidence.delivered} />
	<StatTile metricKey="predictability" value={formatPercentOrEmpty(current.predictability)} detail={`Período anterior: ${formatPercentOrEmpty(previous.predictability)}`} evidence={evidence.predictability} />
	<StatTile metricKey="cycleTime" value={formatDurationOrEmpty(current.cycleTime)} detail={`Período anterior: ${formatDurationOrEmpty(previous.cycleTime)}`} evidence={evidence.cycleTime} />
	<StatTile metricKey="unplannedCount" value={nullableCount(current.unplannedCount)} detail={`Período anterior: ${nullableCount(previous.unplannedCount)}`} evidence={evidence.unplanned} />
</section>

<section>
	<h2>Qualidade</h2>
	<StatTile metricKey="reworkCount" value={nullableCount(current.reworkCount)} detail={`Período anterior: ${nullableCount(previous.reworkCount)}`} evidence={evidence.rework} />
	<StatTile metricKey="bugsAssociated" value={String(current.bugsOpened)} detail={`Período anterior: ${previous.bugsOpened}`} evidence={evidence.bugsAssociated} />
</section>
```

Definir no mesmo arquivo, sem novo módulo:

```ts
const formatDurationOrEmpty = (stats: DurationStats | null) =>
	stats ? formatDuration(stats.averageMs) : "sem dados";
const formatPercentOrEmpty = (value: number | null) =>
	value === null ? "sem dados" : formatPercent(value);
const nullableCount = (value: number | null) =>
	value === null ? "sem dados" : String(value);
```

Aplicar às três sections o mesmo container visual de `FlowTimeSection`: `rounded-2xl border border-(--border) bg-(--surface)` e a grade responsiva do mockup aprovado. Não criar gráfico novo.

- [ ] **Step 7: Criar o Server Component da rota**

Em `app/metrics/developers/page.tsx`:

1. carregar o time atual e redirecionar para `/teams` se não houver;
2. carregar `getTeam(currentTeam.id)` para obter membros;
3. se não houver membros, renderizar estado vazio com link para `/teams/{teamId}`;
4. validar `searchParams.developer` contra os membros;
5. quando ausente ou inválido, redirecionar para a mesma URL com o primeiro ID válido, preservando os demais parâmetros;
6. resolver o intervalo atual e o início do período anterior com `parseMetricsFilter`, `getPeriodRange` e `getPreviousPeriods`;
7. chamar `metricsUseCases.getDeveloperMetrics`;
8. renderizar `DeveloperMetricsDashboard`.

O intervalo é resolvido assim:

```ts
	const range =
		filter.periodType === "SPRINT"
			? { start: filter.start, end: filter.end }
			: getPeriodRange(filter.periodType, filter.referenceDate);
	const previousStart =
		filter.periodType === "SPRINT"
			? new Date(range.start.getTime() - (range.end.getTime() - range.start.getTime()))
			: getPreviousPeriods(filter.periodType, filter.referenceDate, 2)[0].start;
```

Passar `previousStart`, `range.start` e `range.end` para `getDeveloperMetrics`. Assim Semana, Quinzena e Mês respeitam seus limites de calendário; somente o intervalo personalizado usa a mesma duração imediatamente anterior.

O redirect seguro usa apenas strings recebidas:

```ts
	const selectedMember = members.find(
		(member) => member.id === resolvedSearchParams.developer,
	);
	if (!selectedMember) {
		const params = new URLSearchParams();
		for (const [key, value] of Object.entries(resolvedSearchParams)) {
			if (typeof value === "string") params.set(key, value);
		}
		params.set("developer", members[0].id);
		redirect(`/metrics/developers?${params.toString()}`);
	}
```

- [ ] **Step 8: Adicionar o acesso e corrigir o estado ativo da navegação**

Em `metrics-dashboard.tsx`, adicionar um `Link` discreto com texto `Por desenvolvedor` e destino `/metrics/developers` no conjunto de controles do cabeçalho.

Em `header-nav.tsx`, trocar a regra de ativo por:

```ts
				const active =
					link.href === "/metrics"
						? pathname.startsWith("/metrics")
						: pathname === link.href;
```

- [ ] **Step 9: Documentar a funcionalidade**

No `README.md`, na lista de funcionalidades, acrescentar uma linha informando que líderes podem consultar métricas por desenvolvedor, trocar o membro e o período e abrir as tasks usadas como evidência. Na seção de regras das métricas, registrar que a atribuição usa o responsável atual e que bugs são associados pela task de origem.

- [ ] **Step 10: Rodar o E2E, verificações e commit**

Run: `npx playwright test tests/integration/developer-metrics.spec.ts tests/integration/metrics-dashboard.spec.ts && npm run typecheck && npm run lint && npm run knip`

Expected: PASS; o dashboard agregado continua funcionando e a rota individual preserva os filtros.

```bash
git add src/composition/metrics.ts src/presentation/metrics-dashboard/metric-definitions.ts src/presentation/metrics-dashboard/stat-tile.tsx src/presentation/developer-metrics/developer-selector.tsx src/presentation/developer-metrics/developer-metrics-dashboard.tsx src/app/metrics/developers/page.tsx src/presentation/metrics-dashboard/metrics-dashboard.tsx src/presentation/shared/header-nav.tsx tests/integration/developer-metrics.spec.ts README.md
git commit -m "feat(metricas)!: adiciona pagina de metricas por desenvolvedor"
```

---

### Task 5: Verificação final

**Files:** nenhum arquivo novo; corrigir somente defeitos encontrados nas verificações.

- [ ] **Step 1: Rodar todas as verificações do projeto**

Run: `npm run typecheck && npm run lint && npm test && npm run knip && npm run test:e2e && npm run build`

Expected: todos os comandos terminam com código `0`.

- [ ] **Step 2: Verificar visualmente o fluxo aprovado**

Run: `npm run dev`

Abrir `/metrics`, entrar em `Por desenvolvedor`, confirmar o tema existente, os três grupos, o combo nativo, os mesmos filtros de período e o `<details>` com evidências. Trocar o desenvolvedor e o período em ambas as ordens e confirmar que um filtro preserva o outro. Encerrar o servidor ao terminar.

- [ ] **Step 3: Conferir o diff final**

Run: `git status --short && git diff --check`

Expected: nenhuma alteração não relacionada e nenhum erro de whitespace.

---

## Self-Review Notes

- **Cobertura da spec:** filtro individual e compatibilidade agregada (Task 1), período anterior e evidências (Task 2), preservação cruzada dos filtros (Task 3), página dedicada, combo, três pilares, estados, acesso, README e E2E (Task 4), suíte completa e inspeção visual (Task 5).
- **Escopo:** uma única funcionalidade; não precisa ser dividida em outros planos.
- **Consistência de tipos:** `MetricTaskEvidence` nasce no port, flui por `DeveloperMetricEvidence` e termina na prop opcional de `StatTile`; `DeveloperMetricsResult` usa `HistoricalPeriodMetrics`, sem WIP.
- **YAGNI:** um método de snapshot com filtro opcional, um caso de uso, uma rota e dois componentes novos; sem dependência, snapshot histórico, modal, gráfico, nota ou ranking.
