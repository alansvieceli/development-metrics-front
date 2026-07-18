# Motor de Métricas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o sub-projeto 3 de 4 do Development Metrics — o motor de cálculo das 8 métricas de fluxo, sob demanda, conforme [docs/superpowers/specs/2026-07-17-metrics-engine-design.md](../specs/2026-07-17-metrics-engine-design.md).

**Architecture:** Sem entidades de domínio (contexto de leitura, sem invariantes) — apenas `application/metrics` (funções puras + casos de uso + port) e `infrastructure/metrics` (implementação Drizzle das consultas agregadas), seguindo a seção "Quando simplificar" de [architecture.md](../../../techdocs/architecture.md). `MetricsQueryPort` lê diretamente as tabelas de histórico de `task` (já existentes desde o sub-projeto 2), sem passar pelos casos de uso ou entidades de `application/task`. Este sub-projeto não tem UI — os casos de uso ficam prontos para o sub-projeto 4 (Dashboard) consumir via `composition/metrics.ts`.

**Tech Stack:** o mesmo já estabelecido — Next.js App Router, TypeScript estrito, Drizzle ORM + Postgres, Vitest, Biome, Knip. Nenhuma dependência nova é necessária.

## Global Constraints

- Alias de import `@/*` aponta para `./src/*`.
- Regra de dependência (Clean Architecture): `application` só conhece `domain` e seus próprios `ports`; `infrastructure` implementa ports de `application`. Ver [architecture.md](../../../techdocs/architecture.md).
- `application/metrics` reaproveita o tipo `TaskStatus` de `@/domain/task/entities/task` (um Value Object de vocabulário, sem invariantes) para não duplicar a mesma união de strings — não importa entidades ricas nem casos de uso de `application/task`, conforme exigido pela spec.
- Adaptação de estrutura em relação à árvore sugerida pela spec: além de `application/metrics/use-cases` e `application/metrics/ports`, este plano introduz `application/metrics/period.ts` (cálculo puro de intervalos de semana/mês, compartilhado pelos dois casos de uso) e `application/metrics/formulas/` (as fórmulas puras das 8 métricas, testáveis isoladamente com fakes — separadas de `use-cases/` porque não orquestram nenhum port). Essa divisão existe para viabilizar os testes unitários por fórmula exigidos pela spec; a agregação pesada (joins, agrupamento por task) continua em SQL na camada `infrastructure`, e apenas a matemática final (média, mediana, percentual) roda em TypeScript puro sobre os dados já filtrados pelo período.
- Os índices de banco citados na spec são adicionados diretamente às tabelas existentes em `src/infrastructure/task/drizzle/schema.ts` (não em uma pasta `infrastructure/metrics/drizzle/`), porque o Drizzle Kit gera migrações a partir da definição das tabelas, e essas tabelas já pertencem ao schema de `task`. A migração gerada continua saindo em `drizzle/migrations/`, compartilhado por todo o projeto.
- Nenhuma abstração especulativa: um port só existe porque uma implementação concreta real o consome nesta mesma spec.
- Arquivos em `kebab-case`; componentes React e tipos em `PascalCase`. Ver [guidelines.md](../../../techdocs/guidelines.md).
- Mensagens de commit devem seguir exatamente o formato validado pelo hook do projeto: `tipo(contexto)!: descrição` — contexto em letras minúsculas/números sem espaços, descrição em português, minúscula, verbo no presente, sem ponto final. Não incluir corpo nem rodapé na mensagem. Contexto usado neste plano: `metricas` (código de produto) e `banco` (schema/migração).
- Períodos: `WEEK` é a semana ISO (segunda a domingo); `MONTH` é o mês de calendário. Todo intervalo é representado como `{ start: Date; end: Date }` com `end` **exclusivo** (meia-noite UTC do primeiro dia após o período), para permitir comparações `>= start && < end` sem ambiguidade de fuso.
- "Task concluída no período" (usado pelas métricas 1 a 6) é definida de forma unificada como: task com ao menos uma transição de histórico `toStatus = 'DONE'` cujo `changedAt` caia dentro do período (`completedAt` = a mais recente dessas transições, se houver mais de uma). Throughput é simplesmente a contagem dessas tasks — não há um critério separado.
- Testes: Vitest com fakes em memória para `application/metrics` (formulas e use-cases); Vitest contra Postgres real para `infrastructure/metrics` (`fileParallelism: false` já está configurado em `vitest.config.ts` desde o sub-projeto 2). Não há testes E2E neste sub-projeto — não existe UI.
- Banco local via `docker compose -f devops/docker-compose.yml up -d`, já configurado pelos sub-projetos anteriores.

---

### Task 1: Cálculo de períodos (semana/mês)

**Files:**
- Create: `src/application/metrics/period.ts`
- Create: `src/application/metrics/period.test.ts`

**Interfaces:**
- Consumes: nada (primeira task do sub-projeto).
- Produces: `PeriodType = "WEEK" | "MONTH"`, `PeriodRange = { start: Date; end: Date }`, `getPeriodRange(periodType, referenceDate): PeriodRange`, `getPreviousPeriods(periodType, referenceDate, count): PeriodRange[]` (últimos `count` períodos em ordem cronológica, terminando no período que contém `referenceDate`) — usados pelas Tasks 5 (casos de uso) e 6/7 (infraestrutura, que recebe `start`/`end` já calculados).

- [ ] **Step 1: Escrever os testes que falham**

`src/application/metrics/period.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getPeriodRange, getPreviousPeriods } from "./period";

describe("getPeriodRange", () => {
	it("calcula a semana ISO (segunda a domingo) contendo a data de referência", () => {
		// 2026-07-15 é uma quarta-feira
		const range = getPeriodRange("WEEK", new Date("2026-07-15T12:00:00Z"));
		expect(range.start).toEqual(new Date("2026-07-13T00:00:00Z"));
		expect(range.end).toEqual(new Date("2026-07-20T00:00:00Z"));
	});

	it("calcula a semana quando a data de referência é domingo", () => {
		const range = getPeriodRange("WEEK", new Date("2026-07-19T12:00:00Z"));
		expect(range.start).toEqual(new Date("2026-07-13T00:00:00Z"));
		expect(range.end).toEqual(new Date("2026-07-20T00:00:00Z"));
	});

	it("calcula o mês de calendário contendo a data de referência", () => {
		const range = getPeriodRange("MONTH", new Date("2026-07-15T12:00:00Z"));
		expect(range.start).toEqual(new Date("2026-07-01T00:00:00Z"));
		expect(range.end).toEqual(new Date("2026-08-01T00:00:00Z"));
	});
});

describe("getPreviousPeriods", () => {
	it("retorna os últimos N períodos em ordem cronológica, terminando no período de referência", () => {
		const ranges = getPreviousPeriods("WEEK", new Date("2026-07-15T12:00:00Z"), 3);
		expect(ranges).toHaveLength(3);
		expect(ranges[0].start).toEqual(new Date("2026-06-29T00:00:00Z"));
		expect(ranges[1].start).toEqual(new Date("2026-07-06T00:00:00Z"));
		expect(ranges[2].start).toEqual(new Date("2026-07-13T00:00:00Z"));
		expect(ranges[2].end).toEqual(new Date("2026-07-20T00:00:00Z"));
	});
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npm test`
Expected: FAIL — módulo `./period` não encontrado.

- [ ] **Step 3: Implementar o cálculo de períodos**

`src/application/metrics/period.ts`:

```ts
export type PeriodType = "WEEK" | "MONTH";

export type PeriodRange = {
	start: Date;
	end: Date;
};

export function getPeriodRange(
	periodType: PeriodType,
	referenceDate: Date,
): PeriodRange {
	return periodType === "WEEK"
		? getWeekRange(referenceDate)
		: getMonthRange(referenceDate);
}

export function getPreviousPeriods(
	periodType: PeriodType,
	referenceDate: Date,
	count: number,
): PeriodRange[] {
	const ranges: PeriodRange[] = [];
	let cursor = referenceDate;
	for (let i = 0; i < count; i++) {
		const range = getPeriodRange(periodType, cursor);
		ranges.unshift(range);
		const dayBeforeStart = new Date(range.start);
		dayBeforeStart.setUTCDate(dayBeforeStart.getUTCDate() - 1);
		cursor = dayBeforeStart;
	}
	return ranges;
}

function getWeekRange(referenceDate: Date): PeriodRange {
	const start = new Date(
		Date.UTC(
			referenceDate.getUTCFullYear(),
			referenceDate.getUTCMonth(),
			referenceDate.getUTCDate(),
		),
	);
	const dayOfWeek = start.getUTCDay();
	const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
	start.setUTCDate(start.getUTCDate() + diffToMonday);
	const end = new Date(start);
	end.setUTCDate(end.getUTCDate() + 7);
	return { start, end };
}

function getMonthRange(referenceDate: Date): PeriodRange {
	const start = new Date(
		Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), 1),
	);
	const end = new Date(
		Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth() + 1, 1),
	);
	return { start, end };
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npm test`
Expected: PASS — 4 testes novos.

- [ ] **Step 5: Commit**

```bash
git add src/application/metrics/period.ts src/application/metrics/period.test.ts
git commit -m "feat(metricas)!: adiciona calculo de periodos do motor de metricas"
```

---

### Task 2: Port de consulta e fake para testes

**Files:**
- Create: `src/application/metrics/ports/metrics-query-port.ts`
- Create: `src/application/metrics/use-cases/test-helpers/create-fake-metrics-query-port.ts`

**Interfaces:**
- Consumes: `TaskStatus` (`@/domain/task/entities/task`, já existente).
- Produces:
  - `CompletedTaskMetrics = { taskId: string; createdAt: Date; completedAt: Date; statusChanges: { fromStatus: TaskStatus | null; toStatus: TaskStatus; changedAt: Date }[]; blockedPeriods: { blockedAt: Date; unblockedAt: Date | null }[] }` — `statusChanges` e `blockedPeriods` contêm o histórico **completo** da task (todo o ciclo de vida, não só o período filtrado), necessário para calcular cycle time (primeira entrada em `IN_DEVELOPMENT`, que pode ser anterior ao período) e tempo bloqueado/code review (soma de todas as passagens).
  - `DueDateTaskMetrics = { taskId: string; dueDate: string; firstCompletedAt: Date | null }`.
  - `MetricsQueryPort` com `listCompletedTasksInPeriod(teamId, periodStart, periodEnd): Promise<CompletedTaskMetrics[]>`, `listTasksWithDueDateInPeriod(teamId, periodStart, periodEnd): Promise<DueDateTaskMetrics[]>`, `countWip(teamId): Promise<number>`.
  - `createFakeMetricsQueryPort()` expõe `completedTasks`, `dueDateTasks`, `wip` diretamente para configuração em teste — usado pelas Tasks 5 (casos de uso).

- [ ] **Step 1: Criar o port `MetricsQueryPort`**

`src/application/metrics/ports/metrics-query-port.ts`:

```ts
import type { TaskStatus } from "@/domain/task/entities/task";

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

export type DueDateTaskMetrics = {
	taskId: string;
	dueDate: string;
	firstCompletedAt: Date | null;
};

export type MetricsQueryPort = {
	listCompletedTasksInPeriod(
		teamId: string,
		periodStart: Date,
		periodEnd: Date,
	): Promise<CompletedTaskMetrics[]>;
	listTasksWithDueDateInPeriod(
		teamId: string,
		periodStart: Date,
		periodEnd: Date,
	): Promise<DueDateTaskMetrics[]>;
	countWip(teamId: string): Promise<number>;
};
```

- [ ] **Step 2: Criar o fake do port**

`src/application/metrics/use-cases/test-helpers/create-fake-metrics-query-port.ts`:

```ts
import type {
	CompletedTaskMetrics,
	DueDateTaskMetrics,
	MetricsQueryPort,
} from "@/application/metrics/ports/metrics-query-port";

export type FakeMetricsQueryPort = MetricsQueryPort & {
	completedTasks: CompletedTaskMetrics[];
	dueDateTasks: DueDateTaskMetrics[];
	wip: number;
};

export function createFakeMetricsQueryPort(): FakeMetricsQueryPort {
	const state: FakeMetricsQueryPort = {
		completedTasks: [],
		dueDateTasks: [],
		wip: 0,
		async listCompletedTasksInPeriod() {
			return state.completedTasks;
		},
		async listTasksWithDueDateInPeriod() {
			return state.dueDateTasks;
		},
		async countWip() {
			return state.wip;
		},
	};
	return state;
}
```

- [ ] **Step 3: Verificar tipos**

Run: `npm run typecheck`
Expected: sem erros (o fake só compila se implementar o port corretamente).

- [ ] **Step 4: Commit**

```bash
git add src/application/metrics/ports src/application/metrics/use-cases/test-helpers
git commit -m "feat(metricas)!: adiciona port de consulta e fake para testes do motor de metricas"
```

---

### Task 3: Fórmulas de duração (lead time, cycle time, bloqueio, code review)

**Files:**
- Create: `src/application/metrics/formulas/duration-metrics.ts`
- Create: `src/application/metrics/formulas/duration-metrics.test.ts`

**Interfaces:**
- Consumes: `CompletedTaskMetrics` (Task 2).
- Produces:
  - `DurationStats = { averageMs: number; medianMs: number }`.
  - `computeDurationStats(durationsMs: number[]): DurationStats | null` — vazio quando a lista está vazia; mediana como média dos dois valores centrais quando a quantidade é par.
  - `calculateLeadTime(tasks: CompletedTaskMetrics[]): DurationStats | null`.
  - `calculateCycleTime(tasks: CompletedTaskMetrics[]): DurationStats | null` — ignora tasks sem nenhuma entrada em `IN_DEVELOPMENT`.
  - `calculateBlockedTime(tasks: CompletedTaskMetrics[], now: Date): DurationStats | null` — períodos ainda abertos (`unblockedAt: null`) contam até `now`.
  - `calculateCodeReviewTime(tasks: CompletedTaskMetrics[]): DurationStats | null` — soma todas as passagens por `CODE_REVIEW`.
  - Usadas pela Task 5 (`get-metrics-for-period.ts`).

- [ ] **Step 1: Escrever os testes que falham**

`src/application/metrics/formulas/duration-metrics.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { CompletedTaskMetrics } from "@/application/metrics/ports/metrics-query-port";
import {
	calculateBlockedTime,
	calculateCodeReviewTime,
	calculateCycleTime,
	calculateLeadTime,
	computeDurationStats,
} from "./duration-metrics";

function task(overrides: Partial<CompletedTaskMetrics> = {}): CompletedTaskMetrics {
	return {
		taskId: "task-1",
		createdAt: new Date("2026-07-01T00:00:00Z"),
		completedAt: new Date("2026-07-01T00:00:01Z"),
		statusChanges: [],
		blockedPeriods: [],
		...overrides,
	};
}

describe("computeDurationStats", () => {
	it("retorna null quando não há durações", () => {
		expect(computeDurationStats([])).toBeNull();
	});

	it("calcula média e mediana com quantidade ímpar", () => {
		expect(computeDurationStats([5000, 1000, 3000])).toEqual({
			averageMs: 3000,
			medianMs: 3000,
		});
	});

	it("calcula a mediana como média dos dois valores centrais com quantidade par", () => {
		expect(computeDurationStats([1000, 2000, 4000, 100000])).toEqual({
			averageMs: 26750,
			medianMs: 3000,
		});
	});
});

describe("calculateLeadTime", () => {
	it("retorna null quando não há tasks concluídas", () => {
		expect(calculateLeadTime([])).toBeNull();
	});

	it("calcula lead time como concluído menos criado", () => {
		const tasks = [
			task({
				createdAt: new Date("2026-07-01T00:00:00Z"),
				completedAt: new Date("2026-07-03T00:00:00Z"),
			}),
		];
		expect(calculateLeadTime(tasks)).toEqual({
			averageMs: 2 * 24 * 60 * 60 * 1000,
			medianMs: 2 * 24 * 60 * 60 * 1000,
		});
	});
});

describe("calculateCycleTime", () => {
	it("ignora tasks que nunca entraram em IN_DEVELOPMENT", () => {
		expect(calculateCycleTime([task({ statusChanges: [] })])).toBeNull();
	});

	it("usa a primeira entrada em IN_DEVELOPMENT mesmo havendo retrabalho", () => {
		const tasks = [
			task({
				completedAt: new Date("2026-07-10T00:00:00Z"),
				statusChanges: [
					{
						fromStatus: "TODO",
						toStatus: "IN_DEVELOPMENT",
						changedAt: new Date("2026-07-01T00:00:00Z"),
					},
					{
						fromStatus: "IN_DEVELOPMENT",
						toStatus: "CODE_REVIEW",
						changedAt: new Date("2026-07-05T00:00:00Z"),
					},
					{
						fromStatus: "CODE_REVIEW",
						toStatus: "IN_DEVELOPMENT",
						changedAt: new Date("2026-07-06T00:00:00Z"),
					},
				],
			}),
		];
		expect(calculateCycleTime(tasks)?.averageMs).toBe(9 * 24 * 60 * 60 * 1000);
	});
});

describe("calculateBlockedTime", () => {
	it("retorna null quando não há tasks", () => {
		expect(calculateBlockedTime([], new Date())).toBeNull();
	});

	it("soma múltiplos períodos de bloqueio da mesma task", () => {
		const tasks = [
			task({
				blockedPeriods: [
					{
						blockedAt: new Date("2026-07-01T00:00:00Z"),
						unblockedAt: new Date("2026-07-01T01:00:00Z"),
					},
					{
						blockedAt: new Date("2026-07-02T00:00:00Z"),
						unblockedAt: new Date("2026-07-02T03:00:00Z"),
					},
				],
			}),
		];
		expect(
			calculateBlockedTime(tasks, new Date("2026-07-10T00:00:00Z"))?.averageMs,
		).toBe(4 * 60 * 60 * 1000);
	});

	it("conta período ainda aberto até o momento do cálculo", () => {
		const tasks = [
			task({
				blockedPeriods: [
					{ blockedAt: new Date("2026-07-01T00:00:00Z"), unblockedAt: null },
				],
			}),
		];
		const now = new Date("2026-07-01T02:00:00Z");
		expect(calculateBlockedTime(tasks, now)?.averageMs).toBe(2 * 60 * 60 * 1000);
	});
});

describe("calculateCodeReviewTime", () => {
	it("soma múltiplas passagens por CODE_REVIEW (retrabalho)", () => {
		const tasks = [
			task({
				statusChanges: [
					{
						fromStatus: "IN_DEVELOPMENT",
						toStatus: "CODE_REVIEW",
						changedAt: new Date("2026-07-01T00:00:00Z"),
					},
					{
						fromStatus: "CODE_REVIEW",
						toStatus: "IN_DEVELOPMENT",
						changedAt: new Date("2026-07-01T01:00:00Z"),
					},
					{
						fromStatus: "IN_DEVELOPMENT",
						toStatus: "CODE_REVIEW",
						changedAt: new Date("2026-07-02T00:00:00Z"),
					},
					{
						fromStatus: "CODE_REVIEW",
						toStatus: "DONE",
						changedAt: new Date("2026-07-02T02:00:00Z"),
					},
				],
			}),
		];
		expect(calculateCodeReviewTime(tasks)?.averageMs).toBe(3 * 60 * 60 * 1000);
	});

	it("retorna zero para task que nunca passou por CODE_REVIEW", () => {
		expect(calculateCodeReviewTime([task({ statusChanges: [] })])).toEqual({
			averageMs: 0,
			medianMs: 0,
		});
	});
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npm test`
Expected: FAIL — módulo `./duration-metrics` não encontrado.

- [ ] **Step 3: Implementar as fórmulas**

`src/application/metrics/formulas/duration-metrics.ts`:

```ts
import type { CompletedTaskMetrics } from "@/application/metrics/ports/metrics-query-port";

export type DurationStats = { averageMs: number; medianMs: number };

export function computeDurationStats(durationsMs: number[]): DurationStats | null {
	if (durationsMs.length === 0) {
		return null;
	}
	const sorted = [...durationsMs].sort((a, b) => a - b);
	const averageMs = sorted.reduce((sum, ms) => sum + ms, 0) / sorted.length;
	const middle = Math.floor(sorted.length / 2);
	const medianMs =
		sorted.length % 2 === 0
			? (sorted[middle - 1] + sorted[middle]) / 2
			: sorted[middle];
	return { averageMs, medianMs };
}

export function calculateLeadTime(
	tasks: CompletedTaskMetrics[],
): DurationStats | null {
	return computeDurationStats(
		tasks.map((task) => task.completedAt.getTime() - task.createdAt.getTime()),
	);
}

export function calculateCycleTime(
	tasks: CompletedTaskMetrics[],
): DurationStats | null {
	const durations = tasks
		.map((task) => {
			const firstInDevelopment = task.statusChanges
				.filter((change) => change.toStatus === "IN_DEVELOPMENT")
				.reduce<Date | null>(
					(earliest, change) =>
						!earliest || change.changedAt < earliest ? change.changedAt : earliest,
					null,
				);
			if (!firstInDevelopment) {
				return null;
			}
			return task.completedAt.getTime() - firstInDevelopment.getTime();
		})
		.filter((ms): ms is number => ms !== null);
	return computeDurationStats(durations);
}

export function calculateBlockedTime(
	tasks: CompletedTaskMetrics[],
	now: Date,
): DurationStats | null {
	const durations = tasks.map((task) =>
		task.blockedPeriods.reduce(
			(sum, period) =>
				sum + (period.unblockedAt ?? now).getTime() - period.blockedAt.getTime(),
			0,
		),
	);
	return computeDurationStats(durations);
}

export function calculateCodeReviewTime(
	tasks: CompletedTaskMetrics[],
): DurationStats | null {
	const durations = tasks.map((task) => {
		const sorted = [...task.statusChanges].sort(
			(a, b) => a.changedAt.getTime() - b.changedAt.getTime(),
		);
		let total = 0;
		for (let i = 0; i < sorted.length; i++) {
			const next = sorted[i + 1];
			if (sorted[i].toStatus === "CODE_REVIEW" && next) {
				total += next.changedAt.getTime() - sorted[i].changedAt.getTime();
			}
		}
		return total;
	});
	return computeDurationStats(durations);
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npm test`
Expected: PASS — 10 testes novos.

- [ ] **Step 5: Commit**

```bash
git add src/application/metrics/formulas/duration-metrics.ts src/application/metrics/formulas/duration-metrics.test.ts
git commit -m "feat(metricas)!: adiciona formulas de duracao do motor de metricas"
```

---

### Task 4: Fórmulas de taxa (retrabalho e previsibilidade)

**Files:**
- Create: `src/application/metrics/formulas/rate-metrics.ts`
- Create: `src/application/metrics/formulas/rate-metrics.test.ts`

**Interfaces:**
- Consumes: `CompletedTaskMetrics`, `DueDateTaskMetrics` (Task 2).
- Produces:
  - `calculateReworkRate(tasks: CompletedTaskMetrics[]): number | null` — percentual; `null` quando não há tasks concluídas.
  - `calculatePredictability(tasks: DueDateTaskMetrics[]): number | null` — percentual; `null` quando não há tasks com `dueDate` no período.
  - Usadas pela Task 5 (`get-metrics-for-period.ts`).

- [ ] **Step 1: Escrever os testes que falham**

`src/application/metrics/formulas/rate-metrics.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type {
	CompletedTaskMetrics,
	DueDateTaskMetrics,
} from "@/application/metrics/ports/metrics-query-port";
import { calculatePredictability, calculateReworkRate } from "./rate-metrics";

function completedTask(
	overrides: Partial<CompletedTaskMetrics> = {},
): CompletedTaskMetrics {
	return {
		taskId: "task-1",
		createdAt: new Date("2026-07-01T00:00:00Z"),
		completedAt: new Date("2026-07-02T00:00:00Z"),
		statusChanges: [],
		blockedPeriods: [],
		...overrides,
	};
}

describe("calculateReworkRate", () => {
	it("retorna null quando não há tasks concluídas no período", () => {
		expect(calculateReworkRate([])).toBeNull();
	});

	it("conta uma task com retrabalho apenas uma vez mesmo com múltiplas transições", () => {
		const tasks = [
			completedTask({
				statusChanges: [
					{
						fromStatus: "CODE_REVIEW",
						toStatus: "IN_DEVELOPMENT",
						changedAt: new Date("2026-07-01T01:00:00Z"),
					},
					{
						fromStatus: "CODE_REVIEW",
						toStatus: "IN_DEVELOPMENT",
						changedAt: new Date("2026-07-01T02:00:00Z"),
					},
				],
			}),
			completedTask({ taskId: "task-2" }),
		];
		expect(calculateReworkRate(tasks)).toBe(50);
	});

	it("considera retrabalho a partir de DONE -> IN_DEVELOPMENT", () => {
		const tasks = [
			completedTask({
				statusChanges: [
					{
						fromStatus: "DONE",
						toStatus: "IN_DEVELOPMENT",
						changedAt: new Date("2026-07-01T01:00:00Z"),
					},
				],
			}),
		];
		expect(calculateReworkRate(tasks)).toBe(100);
	});
});

describe("calculatePredictability", () => {
	it("retorna null quando não há tasks com dueDate no período", () => {
		expect(calculatePredictability([])).toBeNull();
	});

	it("conta como sucesso a task concluída até o dueDate (inclusive)", () => {
		const tasks: DueDateTaskMetrics[] = [
			{
				taskId: "task-1",
				dueDate: "2026-07-10",
				firstCompletedAt: new Date("2026-07-10T23:59:00Z"),
			},
			{
				taskId: "task-2",
				dueDate: "2026-07-10",
				firstCompletedAt: new Date("2026-07-11T00:00:01Z"),
			},
			{ taskId: "task-3", dueDate: "2026-07-10", firstCompletedAt: null },
		];
		expect(calculatePredictability(tasks)).toBeCloseTo(33.333, 2);
	});
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npm test`
Expected: FAIL — módulo `./rate-metrics` não encontrado.

- [ ] **Step 3: Implementar as fórmulas**

`src/application/metrics/formulas/rate-metrics.ts`:

```ts
import type {
	CompletedTaskMetrics,
	DueDateTaskMetrics,
} from "@/application/metrics/ports/metrics-query-port";

export function calculateReworkRate(tasks: CompletedTaskMetrics[]): number | null {
	if (tasks.length === 0) {
		return null;
	}
	const reworkCount = tasks.filter((task) =>
		task.statusChanges.some(
			(change) =>
				(change.fromStatus === "CODE_REVIEW" || change.fromStatus === "DONE") &&
				change.toStatus === "IN_DEVELOPMENT",
		),
	).length;
	return (reworkCount / tasks.length) * 100;
}

export function calculatePredictability(
	tasks: DueDateTaskMetrics[],
): number | null {
	if (tasks.length === 0) {
		return null;
	}
	const metCount = tasks.filter(
		(task) =>
			task.firstCompletedAt !== null &&
			task.firstCompletedAt.getTime() <= endOfDay(task.dueDate).getTime(),
	).length;
	return (metCount / tasks.length) * 100;
}

function endOfDay(dateOnly: string): Date {
	return new Date(`${dateOnly}T23:59:59.999Z`);
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npm test`
Expected: PASS — 5 testes novos.

- [ ] **Step 5: Commit**

```bash
git add src/application/metrics/formulas/rate-metrics.ts src/application/metrics/formulas/rate-metrics.test.ts
git commit -m "feat(metricas)!: adiciona formulas de taxa do motor de metricas"
```

---

### Task 5: Casos de uso `getMetricsForPeriod` e `getMetricsSeries`

**Files:**
- Create: `src/application/metrics/use-cases/get-metrics-for-period.ts`
- Create: `src/application/metrics/use-cases/get-metrics-for-period.test.ts`
- Create: `src/application/metrics/use-cases/get-metrics-series.ts`
- Create: `src/application/metrics/use-cases/get-metrics-series.test.ts`

**Interfaces:**
- Consumes: `MetricsQueryPort`, `createFakeMetricsQueryPort()` (Task 2); `PeriodType`, `getPeriodRange`, `getPreviousPeriods` (Task 1); `calculateLeadTime`, `calculateCycleTime`, `calculateBlockedTime`, `calculateCodeReviewTime`, `DurationStats` (Task 3); `calculateReworkRate`, `calculatePredictability` (Task 4).
- Produces:
  - `PeriodMetrics = { periodStart: Date; periodEnd: Date; leadTime: DurationStats | null; cycleTime: DurationStats | null; blockedTime: DurationStats | null; codeReviewTime: DurationStats | null; reworkRate: number | null; throughput: number; wip: number; predictability: number | null }`.
  - `getMetricsForRange(port, teamId, periodStart, periodEnd, now?): Promise<PeriodMetrics>`.
  - `getMetricsForPeriod(port, teamId, periodType, referenceDate): Promise<PeriodMetrics>`.
  - `MetricsSeriesEntry = { periodStart: Date; periodEnd: Date; metrics: PeriodMetrics }`, `getMetricsSeries(port, teamId, periodType, referenceDate, howManyPeriods): Promise<MetricsSeriesEntry[]>` — usados por `composition/metrics.ts` (Task 8).

- [ ] **Step 1: Escrever os testes que falham**

`src/application/metrics/use-cases/get-metrics-for-period.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createFakeMetricsQueryPort } from "./test-helpers/create-fake-metrics-query-port";
import { getMetricsForPeriod, getMetricsForRange } from "./get-metrics-for-period";

describe("getMetricsForRange", () => {
	it("monta as 8 métricas a partir dos dados retornados pelo port", async () => {
		const port = createFakeMetricsQueryPort();
		port.completedTasks = [
			{
				taskId: "task-1",
				createdAt: new Date("2026-07-01T00:00:00Z"),
				completedAt: new Date("2026-07-03T00:00:00Z"),
				statusChanges: [
					{
						fromStatus: "TODO",
						toStatus: "IN_DEVELOPMENT",
						changedAt: new Date("2026-07-01T00:00:00Z"),
					},
				],
				blockedPeriods: [],
			},
		];
		port.dueDateTasks = [
			{
				taskId: "task-1",
				dueDate: "2026-07-03",
				firstCompletedAt: new Date("2026-07-03T00:00:00Z"),
			},
		];
		port.wip = 4;

		const start = new Date("2026-07-01T00:00:00Z");
		const end = new Date("2026-07-08T00:00:00Z");
		const metrics = await getMetricsForRange(port, "team-1", start, end);

		expect(metrics.periodStart).toEqual(start);
		expect(metrics.periodEnd).toEqual(end);
		expect(metrics.leadTime?.averageMs).toBe(2 * 24 * 60 * 60 * 1000);
		expect(metrics.cycleTime?.averageMs).toBe(2 * 24 * 60 * 60 * 1000);
		expect(metrics.blockedTime).toEqual({ averageMs: 0, medianMs: 0 });
		expect(metrics.codeReviewTime).toEqual({ averageMs: 0, medianMs: 0 });
		expect(metrics.reworkRate).toBe(0);
		expect(metrics.throughput).toBe(1);
		expect(metrics.wip).toBe(4);
		expect(metrics.predictability).toBe(100);
	});

	it("retorna vazio/zero quando não há tasks concluídas ou com dueDate no período", async () => {
		const port = createFakeMetricsQueryPort();

		const metrics = await getMetricsForRange(
			port,
			"team-1",
			new Date("2026-07-01T00:00:00Z"),
			new Date("2026-07-08T00:00:00Z"),
		);

		expect(metrics.leadTime).toBeNull();
		expect(metrics.cycleTime).toBeNull();
		expect(metrics.blockedTime).toBeNull();
		expect(metrics.codeReviewTime).toBeNull();
		expect(metrics.reworkRate).toBeNull();
		expect(metrics.throughput).toBe(0);
		expect(metrics.wip).toBe(0);
		expect(metrics.predictability).toBeNull();
	});
});

describe("getMetricsForPeriod", () => {
	it("resolve o período a partir do tipo e da data de referência antes de consultar o port", async () => {
		const port = createFakeMetricsQueryPort();
		const metrics = await getMetricsForPeriod(
			port,
			"team-1",
			"WEEK",
			new Date("2026-07-15T12:00:00Z"),
		);
		expect(metrics.periodStart).toEqual(new Date("2026-07-13T00:00:00Z"));
		expect(metrics.periodEnd).toEqual(new Date("2026-07-20T00:00:00Z"));
	});
});
```

`src/application/metrics/use-cases/get-metrics-series.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getPreviousPeriods } from "@/application/metrics/period";
import type { MetricsQueryPort } from "@/application/metrics/ports/metrics-query-port";
import { getMetricsSeries } from "./get-metrics-series";

describe("getMetricsSeries", () => {
	it("retorna a métrica correta alinhada a cada período da série", async () => {
		const referenceDate = new Date("2026-07-15T12:00:00Z");
		const expectedRanges = getPreviousPeriods("WEEK", referenceDate, 3);
		const targetRange = expectedRanges[2];

		const port: MetricsQueryPort = {
			async listCompletedTasksInPeriod(_teamId, periodStart) {
				if (periodStart.getTime() === targetRange.start.getTime()) {
					return [
						{
							taskId: "task-1",
							createdAt: targetRange.start,
							completedAt: targetRange.start,
							statusChanges: [],
							blockedPeriods: [],
						},
					];
				}
				return [];
			},
			async listTasksWithDueDateInPeriod() {
				return [];
			},
			async countWip() {
				return 0;
			},
		};

		const series = await getMetricsSeries(port, "team-1", "WEEK", referenceDate, 3);

		expect(series).toHaveLength(3);
		expect(series.map((entry) => entry.periodStart)).toEqual(
			expectedRanges.map((range) => range.start),
		);
		expect(series.map((entry) => entry.metrics.throughput)).toEqual([0, 0, 1]);
	});
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npm test`
Expected: FAIL — módulos `./get-metrics-for-period` e `./get-metrics-series` não encontrados.

- [ ] **Step 3: Implementar os casos de uso**

`src/application/metrics/use-cases/get-metrics-for-period.ts`:

```ts
import type { DurationStats } from "@/application/metrics/formulas/duration-metrics";
import {
	calculateBlockedTime,
	calculateCodeReviewTime,
	calculateCycleTime,
	calculateLeadTime,
} from "@/application/metrics/formulas/duration-metrics";
import {
	calculatePredictability,
	calculateReworkRate,
} from "@/application/metrics/formulas/rate-metrics";
import { getPeriodRange, type PeriodType } from "@/application/metrics/period";
import type { MetricsQueryPort } from "@/application/metrics/ports/metrics-query-port";

export type PeriodMetrics = {
	periodStart: Date;
	periodEnd: Date;
	leadTime: DurationStats | null;
	cycleTime: DurationStats | null;
	blockedTime: DurationStats | null;
	codeReviewTime: DurationStats | null;
	reworkRate: number | null;
	throughput: number;
	wip: number;
	predictability: number | null;
};

export async function getMetricsForRange(
	port: MetricsQueryPort,
	teamId: string,
	periodStart: Date,
	periodEnd: Date,
	now: Date = new Date(),
): Promise<PeriodMetrics> {
	const [completedTasks, dueDateTasks, wip] = await Promise.all([
		port.listCompletedTasksInPeriod(teamId, periodStart, periodEnd),
		port.listTasksWithDueDateInPeriod(teamId, periodStart, periodEnd),
		port.countWip(teamId),
	]);

	return {
		periodStart,
		periodEnd,
		leadTime: calculateLeadTime(completedTasks),
		cycleTime: calculateCycleTime(completedTasks),
		blockedTime: calculateBlockedTime(completedTasks, now),
		codeReviewTime: calculateCodeReviewTime(completedTasks),
		reworkRate: calculateReworkRate(completedTasks),
		throughput: completedTasks.length,
		wip,
		predictability: calculatePredictability(dueDateTasks),
	};
}

export async function getMetricsForPeriod(
	port: MetricsQueryPort,
	teamId: string,
	periodType: PeriodType,
	referenceDate: Date,
): Promise<PeriodMetrics> {
	const { start, end } = getPeriodRange(periodType, referenceDate);
	return getMetricsForRange(port, teamId, start, end);
}
```

`src/application/metrics/use-cases/get-metrics-series.ts`:

```ts
import { getPreviousPeriods, type PeriodType } from "@/application/metrics/period";
import type { MetricsQueryPort } from "@/application/metrics/ports/metrics-query-port";
import { getMetricsForRange, type PeriodMetrics } from "./get-metrics-for-period";

export type MetricsSeriesEntry = {
	periodStart: Date;
	periodEnd: Date;
	metrics: PeriodMetrics;
};

export async function getMetricsSeries(
	port: MetricsQueryPort,
	teamId: string,
	periodType: PeriodType,
	referenceDate: Date,
	howManyPeriods: number,
): Promise<MetricsSeriesEntry[]> {
	const ranges = getPreviousPeriods(periodType, referenceDate, howManyPeriods);
	return Promise.all(
		ranges.map(async (range) => ({
			periodStart: range.start,
			periodEnd: range.end,
			metrics: await getMetricsForRange(port, teamId, range.start, range.end),
		})),
	);
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npm test`
Expected: PASS — 4 testes novos (3 + 1).

- [ ] **Step 5: Commit**

```bash
git add src/application/metrics/use-cases/get-metrics-for-period.ts src/application/metrics/use-cases/get-metrics-for-period.test.ts src/application/metrics/use-cases/get-metrics-series.ts src/application/metrics/use-cases/get-metrics-series.test.ts
git commit -m "feat(metricas)!: adiciona casos de uso de calculo de metricas"
```

---

### Task 6: Índices de banco para as consultas de métricas

**Files:**
- Modify: `src/infrastructure/task/drizzle/schema.ts`
- Create: `drizzle/migrations/0003_<nome-gerado>.sql` (gerado por `drizzle-kit`)

**Interfaces:**
- Consumes: nada de `application/metrics` (é infraestrutura pura sobre tabelas já existentes desde o sub-projeto 2).
- Produces: índices em `tasks`, `task_status_changes` e `task_blocked_periods` — usados pelas queries da Task 7 para permanecerem rápidas conforme o histórico cresce.

- [ ] **Step 1: Adicionar os índices ao schema**

Em `src/infrastructure/task/drizzle/schema.ts`, importar `index` junto de `uniqueIndex`:

```ts
import {
	boolean,
	date,
	index,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
```

Alterar a definição de `tasks` para incluir os dois novos índices ao lado do já existente:

```ts
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
		index("tasks_team_id_status_idx").on(table.teamId, table.status),
		index("tasks_team_id_due_date_idx").on(table.teamId, table.dueDate),
	],
);
```

Alterar `taskStatusChanges` para incluir os dois índices:

```ts
export const taskStatusChanges = pgTable(
	"task_status_changes",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		taskId: uuid("task_id")
			.notNull()
			.references(() => tasks.id, { onDelete: "cascade" }),
		fromStatus: text("from_status"),
		toStatus: text("to_status").notNull(),
		changedAt: timestamp("changed_at").notNull().defaultNow(),
	},
	(table) => [
		index("task_status_changes_task_id_changed_at_idx").on(
			table.taskId,
			table.changedAt,
		),
		index("task_status_changes_to_status_changed_at_idx").on(
			table.toStatus,
			table.changedAt,
		),
	],
);
```

Alterar `taskBlockedPeriods` para incluir o índice:

```ts
export const taskBlockedPeriods = pgTable(
	"task_blocked_periods",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		taskId: uuid("task_id")
			.notNull()
			.references(() => tasks.id, { onDelete: "cascade" }),
		blockedAt: timestamp("blocked_at").notNull().defaultNow(),
		unblockedAt: timestamp("unblocked_at"),
	},
	(table) => [
		index("task_blocked_periods_task_id_blocked_at_idx").on(
			table.taskId,
			table.blockedAt,
		),
	],
);
```

`taskTypes` não muda.

- [ ] **Step 2: Gerar a migração**

```bash
npm run db:generate
```

Expected: `drizzle/migrations/0003_<nome-gerado>.sql` criado, com 5 `CREATE INDEX` (2 em `tasks`, 2 em `task_status_changes`, 1 em `task_blocked_periods`), equivalente a:

```sql
CREATE INDEX "tasks_team_id_status_idx" ON "tasks" USING btree ("team_id","status");
--> statement-breakpoint
CREATE INDEX "tasks_team_id_due_date_idx" ON "tasks" USING btree ("team_id","due_date");
--> statement-breakpoint
CREATE INDEX "task_status_changes_task_id_changed_at_idx" ON "task_status_changes" USING btree ("task_id","changed_at");
--> statement-breakpoint
CREATE INDEX "task_status_changes_to_status_changed_at_idx" ON "task_status_changes" USING btree ("to_status","changed_at");
--> statement-breakpoint
CREATE INDEX "task_blocked_periods_task_id_blocked_at_idx" ON "task_blocked_periods" USING btree ("task_id","blocked_at");
```

Se o conteúdo gerado divergir de forma relevante, ajustar `schema.ts` até que `npm run db:generate` produza o resultado equivalente ao acima antes de prosseguir.

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
git commit -m "chore(banco)!: adiciona indices para consultas do motor de metricas"
```

---

### Task 7: `MetricsQueryPort` com Drizzle

**Files:**
- Create: `src/infrastructure/metrics/drizzle-metrics-query-port.ts`
- Create: `src/infrastructure/metrics/drizzle-metrics-query-port.test.ts`

**Interfaces:**
- Consumes: `MetricsQueryPort`, `CompletedTaskMetrics`, `DueDateTaskMetrics` (Task 2); `TaskStatus` (`@/domain/task/entities/task`); `tasks`, `taskStatusChanges`, `taskBlockedPeriods` (`@/infrastructure/task/drizzle/schema`, atualizado na Task 6); `db` (`@/infrastructure/db/client`); `drizzleTaskRepository`, `drizzleTaskTypeRepository`, `drizzleTaskHistoryRepository` (já existentes desde o sub-projeto 2, usados só nos testes para popular dados).
- Produces: `drizzleMetricsQueryPort: MetricsQueryPort` — usado por `composition/metrics.ts` (Task 8).

- [ ] **Step 1: Escrever os testes que falham**

`src/infrastructure/metrics/drizzle-metrics-query-port.test.ts`:

```ts
import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/infrastructure/db/client";
import { drizzleTaskHistoryRepository } from "@/infrastructure/task/drizzle-task-history-repository";
import { drizzleTaskRepository } from "@/infrastructure/task/drizzle-task-repository";
import { drizzleTaskTypeRepository } from "@/infrastructure/task/drizzle-task-type-repository";
import { drizzleMetricsQueryPort } from "./drizzle-metrics-query-port";

const TEAM_ID = "11111111-1111-1111-1111-111111111111";

async function resetTasksTable() {
	await db.execute(
		sql`TRUNCATE TABLE task_blocked_periods, task_status_changes, tasks RESTART IDENTITY CASCADE`,
	);
}

describe("drizzleMetricsQueryPort", () => {
	let typeId: string;

	beforeEach(async () => {
		const taskType = await drizzleTaskTypeRepository.create("Bug", "#dc2626");
		typeId = taskType.id;
	});

	afterEach(async () => {
		await resetTasksTable();
		await drizzleTaskTypeRepository.delete(typeId);
	});

	it("lista tasks concluídas no período com o histórico completo", async () => {
		const task = await drizzleTaskRepository.create({
			externalId: "TASK-1",
			description: "Corrigir bug",
			typeId,
			assigneeId: null,
			teamId: TEAM_ID,
			status: "TODO",
			dueDate: null,
		});
		await drizzleTaskHistoryRepository.recordStatusChange(task.id, null, "TODO");
		await drizzleTaskHistoryRepository.recordStatusChange(
			task.id,
			"TODO",
			"IN_DEVELOPMENT",
		);
		await drizzleTaskHistoryRepository.recordStatusChange(
			task.id,
			"IN_DEVELOPMENT",
			"DONE",
		);
		await drizzleTaskRepository.updateStatus(task.id, "DONE");

		const periodStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
		const periodEnd = new Date(Date.now() + 24 * 60 * 60 * 1000);
		const completed = await drizzleMetricsQueryPort.listCompletedTasksInPeriod(
			TEAM_ID,
			periodStart,
			periodEnd,
		);

		expect(completed).toHaveLength(1);
		expect(completed[0].taskId).toBe(task.id);
		expect(completed[0].statusChanges).toHaveLength(3);
	});

	it("não lista tasks concluídas fora do período", async () => {
		const task = await drizzleTaskRepository.create({
			externalId: "TASK-1",
			description: "Corrigir bug",
			typeId,
			assigneeId: null,
			teamId: TEAM_ID,
			status: "DONE",
			dueDate: null,
		});
		await drizzleTaskHistoryRepository.recordStatusChange(task.id, null, "DONE");

		const periodStart = new Date(Date.now() + 24 * 60 * 60 * 1000);
		const periodEnd = new Date(Date.now() + 48 * 60 * 60 * 1000);
		const completed = await drizzleMetricsQueryPort.listCompletedTasksInPeriod(
			TEAM_ID,
			periodStart,
			periodEnd,
		);

		expect(completed).toEqual([]);
	});

	it("lista tasks com dueDate no período informando a primeira conclusão", async () => {
		const task = await drizzleTaskRepository.create({
			externalId: "TASK-1",
			description: "Corrigir bug",
			typeId,
			assigneeId: null,
			teamId: TEAM_ID,
			status: "TODO",
			dueDate: "2026-07-10",
		});
		await drizzleTaskHistoryRepository.recordStatusChange(task.id, null, "DONE");
		await drizzleTaskRepository.updateStatus(task.id, "DONE");

		const result = await drizzleMetricsQueryPort.listTasksWithDueDateInPeriod(
			TEAM_ID,
			new Date("2026-07-01T00:00:00Z"),
			new Date("2026-08-01T00:00:00Z"),
		);

		expect(result).toHaveLength(1);
		expect(result[0].dueDate).toBe("2026-07-10");
		expect(result[0].firstCompletedAt).not.toBeNull();
	});

	it("retorna firstCompletedAt nulo para task com dueDate ainda não concluída", async () => {
		await drizzleTaskRepository.create({
			externalId: "TASK-1",
			description: "Corrigir bug",
			typeId,
			assigneeId: null,
			teamId: TEAM_ID,
			status: "TODO",
			dueDate: "2026-07-10",
		});

		const result = await drizzleMetricsQueryPort.listTasksWithDueDateInPeriod(
			TEAM_ID,
			new Date("2026-07-01T00:00:00Z"),
			new Date("2026-08-01T00:00:00Z"),
		);

		expect(result[0].firstCompletedAt).toBeNull();
	});

	it("conta o WIP como tasks em IN_DEVELOPMENT ou CODE_REVIEW", async () => {
		await drizzleTaskRepository.create({
			externalId: "TASK-1",
			description: "A",
			typeId,
			assigneeId: null,
			teamId: TEAM_ID,
			status: "IN_DEVELOPMENT",
			dueDate: null,
		});
		await drizzleTaskRepository.create({
			externalId: "TASK-2",
			description: "B",
			typeId,
			assigneeId: null,
			teamId: TEAM_ID,
			status: "CODE_REVIEW",
			dueDate: null,
		});
		await drizzleTaskRepository.create({
			externalId: "TASK-3",
			description: "C",
			typeId,
			assigneeId: null,
			teamId: TEAM_ID,
			status: "TODO",
			dueDate: null,
		});

		expect(await drizzleMetricsQueryPort.countWip(TEAM_ID)).toBe(2);
	});
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npm test`
Expected: FAIL — módulo `./drizzle-metrics-query-port` não encontrado.

- [ ] **Step 3: Implementar o port**

`src/infrastructure/metrics/drizzle-metrics-query-port.ts`:

```ts
import { and, asc, eq, gte, inArray, isNotNull, lt, sql } from "drizzle-orm";
import type {
	CompletedTaskMetrics,
	DueDateTaskMetrics,
	MetricsQueryPort,
} from "@/application/metrics/ports/metrics-query-port";
import type { TaskStatus } from "@/domain/task/entities/task";
import { db } from "@/infrastructure/db/client";
import {
	taskBlockedPeriods,
	taskStatusChanges,
	tasks,
} from "@/infrastructure/task/drizzle/schema";

function toDateOnly(date: Date): string {
	return date.toISOString().slice(0, 10);
}

export const drizzleMetricsQueryPort: MetricsQueryPort = {
	async listCompletedTasksInPeriod(teamId, periodStart, periodEnd) {
		const completions = await db
			.select({
				taskId: taskStatusChanges.taskId,
				createdAt: tasks.createdAt,
				completedAt: sql<Date>`max(${taskStatusChanges.changedAt})`,
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
			.groupBy(taskStatusChanges.taskId, tasks.createdAt);

		if (completions.length === 0) {
			return [];
		}
		const taskIds = completions.map((completion) => completion.taskId);

		const statusChangeRows = await db
			.select()
			.from(taskStatusChanges)
			.where(inArray(taskStatusChanges.taskId, taskIds))
			.orderBy(asc(taskStatusChanges.changedAt));

		const blockedPeriodRows = await db
			.select()
			.from(taskBlockedPeriods)
			.where(inArray(taskBlockedPeriods.taskId, taskIds))
			.orderBy(asc(taskBlockedPeriods.blockedAt));

		return completions.map(
			(completion): CompletedTaskMetrics => ({
				taskId: completion.taskId,
				createdAt: completion.createdAt,
				completedAt: completion.completedAt,
				statusChanges: statusChangeRows
					.filter((row) => row.taskId === completion.taskId)
					.map((row) => ({
						fromStatus: row.fromStatus as TaskStatus | null,
						toStatus: row.toStatus as TaskStatus,
						changedAt: row.changedAt,
					})),
				blockedPeriods: blockedPeriodRows
					.filter((row) => row.taskId === completion.taskId)
					.map((row) => ({
						blockedAt: row.blockedAt,
						unblockedAt: row.unblockedAt,
					})),
			}),
		);
	},

	async listTasksWithDueDateInPeriod(teamId, periodStart, periodEnd) {
		const dueTasks = await db
			.select({ taskId: tasks.id, dueDate: tasks.dueDate })
			.from(tasks)
			.where(
				and(
					eq(tasks.teamId, teamId),
					isNotNull(tasks.dueDate),
					gte(tasks.dueDate, toDateOnly(periodStart)),
					lt(tasks.dueDate, toDateOnly(periodEnd)),
				),
			);

		if (dueTasks.length === 0) {
			return [];
		}
		const taskIds = dueTasks.map((task) => task.taskId);

		const completions = await db
			.select({
				taskId: taskStatusChanges.taskId,
				firstCompletedAt: sql<Date>`min(${taskStatusChanges.changedAt})`,
			})
			.from(taskStatusChanges)
			.where(
				and(
					inArray(taskStatusChanges.taskId, taskIds),
					eq(taskStatusChanges.toStatus, "DONE"),
				),
			)
			.groupBy(taskStatusChanges.taskId);
		const firstCompletedAtByTask = new Map(
			completions.map((completion) => [
				completion.taskId,
				completion.firstCompletedAt,
			]),
		);

		return dueTasks.map(
			(task): DueDateTaskMetrics => ({
				taskId: task.taskId,
				dueDate: task.dueDate as string,
				firstCompletedAt: firstCompletedAtByTask.get(task.taskId) ?? null,
			}),
		);
	},

	async countWip(teamId) {
		const [result] = await db
			.select({ count: sql<number>`count(*)::int` })
			.from(tasks)
			.where(
				and(
					eq(tasks.teamId, teamId),
					inArray(tasks.status, ["IN_DEVELOPMENT", "CODE_REVIEW"]),
				),
			);
		return result?.count ?? 0;
	},
};
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npm test`
Expected: PASS — 5 testes novos.

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure/metrics/drizzle-metrics-query-port.ts src/infrastructure/metrics/drizzle-metrics-query-port.test.ts
git commit -m "feat(metricas)!: implementa port de consulta de metricas com drizzle"
```

---

### Task 8: Composition root e verificação final

**Files:**
- Create: `src/composition/metrics.ts`
- Create: `knip.json`

**Interfaces:**
- Consumes: `getMetricsForPeriod`, `getMetricsSeries`, `PeriodMetrics`, `MetricsSeriesEntry` (Task 5); `PeriodType` (Task 1); `drizzleMetricsQueryPort` (Task 7).
- Produces: `createMetricsUseCases()` retornando `{ getMetricsForPeriod(teamId, periodType, referenceDate), getMetricsSeries(teamId, periodType, referenceDate, howManyPeriods) }` — este é o ponto que o sub-projeto 4 (Dashboard) vai importar de `app/metrics/page.tsx` para montar a UI, exatamente como `composition/task.ts` e `composition/team.ts` já são consumidos por `app/board/page.tsx`.

- [ ] **Step 1: Criar o composition root**

`src/composition/metrics.ts`:

```ts
import type { PeriodType } from "@/application/metrics/period";
import { getMetricsForPeriod } from "@/application/metrics/use-cases/get-metrics-for-period";
import { getMetricsSeries } from "@/application/metrics/use-cases/get-metrics-series";
import { drizzleMetricsQueryPort } from "@/infrastructure/metrics/drizzle-metrics-query-port";

export function createMetricsUseCases() {
	return {
		getMetricsForPeriod: (
			teamId: string,
			periodType: PeriodType,
			referenceDate: Date,
		) =>
			getMetricsForPeriod(drizzleMetricsQueryPort, teamId, periodType, referenceDate),
		getMetricsSeries: (
			teamId: string,
			periodType: PeriodType,
			referenceDate: Date,
			howManyPeriods: number,
		) =>
			getMetricsSeries(
				drizzleMetricsQueryPort,
				teamId,
				periodType,
				referenceDate,
				howManyPeriods,
			),
	};
}
```

- [ ] **Step 2: Declarar o composition root como entrada adicional do Knip**

Como este sub-projeto não tem UI (o sub-projeto 4 é quem vai chamar `createMetricsUseCases()` a partir de `app/metrics/`), nada em `app/` importa `composition/metrics.ts` ainda. Sem isso, o Knip acusaria toda a cadeia (`composition/metrics.ts` → casos de uso → fórmulas → port Drizzle) como não utilizada. Registrar o composition root como ponto de entrada adicional, conforme permitido por [guidelines.md](../../../techdocs/guidelines.md) ("Configurar entradas adicionais somente quando o projeto tiver pontos de entrada não convencionais"):

`knip.json`:

```json
{
	"$schema": "https://unpkg.com/knip@6/schema.json",
	"entry": ["src/composition/metrics.ts"]
}
```

- [ ] **Step 3: Rodar toda a verificação do projeto**

Run: `npm run typecheck && npm run lint && npm test && npm run knip`
Expected: todos passam sem erros. `knip` não deve acusar nenhum arquivo, export ou dependência não usados neste sub-projeto.

- [ ] **Step 4: Commit**

```bash
git add src/composition/metrics.ts knip.json
git commit -m "feat(metricas)!: adiciona composition root do motor de metricas"
```

---
