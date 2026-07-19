# Gráficos de tendência no dashboard de métricas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar 4 gráficos de tendência (throughput, planejado x entregue, lead x cycle time, composição do fluxo) ao dashboard de métricas, reaproveitando o motor de métricas existente sem novas queries N+1.

**Architecture:** `get-metrics-dashboard.ts` passa a buscar um único snapshot largo (8 períodos) via `getPreviousPeriods` (já existe, hoje órfã) e fatiar em `history: HistoricalPeriodMetrics[]` com `getMetricsForRange` (já existe) — zero mudança em `MetricsQueryPort`, no port Drizzle ou nas fórmulas. Presentation ganha uma pasta `charts/` com 4 componentes cliente (Recharts) + funções puras de shaping testadas isoladamente, seguindo o mesmo padrão de tooltip nativo (`title`) que os tiles já usam.

**Tech Stack:** Next.js App Router, TypeScript estrito, Recharts (reintroduzida), Tailwind CSS v4, Vitest, Playwright.

## Global Constraints

- Reaproveitar `getPreviousPeriods` de `src/application/metrics/period.ts` sem modificá-la — já tem o comportamento exato necessário (8 períodos terminando no período de referência), testada em `period.test.ts`.
- Nenhuma mudança em `MetricsQueryPort`, `drizzle-metrics-query-port.ts` ou nas fórmulas de `src/application/metrics/formulas/`.
- Uma única chamada a `loadSnapshot` por carregamento de página (mesmo padrão de round-trip único que já existe hoje).
- Cores: reaproveitar `--chart-primary` (`#0d9488`) e `--chart-secondary` (`#d97706`), já em `src/app/globals.css`. Acrescentar `--chart-tertiary` (`#3b82f6`), `--chart-quaternary` (`#ec4899`), `--chart-quinary` (`#8b5cf6`) — os 5 juntos passaram em todos os checks do validador do skill `dataviz` (`validate_palette.js "#0d9488,#d97706,#3b82f6,#ec4899,#8b5cf6" --mode dark --surface "#2a2f33"`: lightness band, chroma floor, CVD separation, normal-vision floor e contraste — todos PASS, sem WARN).
- Título de cada gráfico usa o atributo HTML `title` nativo com a descrição (mesmo mecanismo de `StatTile`/`METRIC_DEFINITIONS`), mais uma entrada no modal do botão (i) — não um componente de tooltip novo.
- Commits em português seguindo `techdocs/guidelines.md` (tipo(contexto)!: descrição, minúscula, sem ponto final).
- Sem gráfico por semana no bloco de composição do fluxo (gráfico 4 é sempre 1 barra do período atual) e sem 3ª barra de "não planejados" no gráfico 2 — decisões já fechadas na spec.

---

### Task 1: Dependência do Recharts e cores do gráfico de composição

**Files:**
- Modify: `package.json` (via `npm install`)
- Modify: `src/app/globals.css:19` (após `--chart-secondary`)

**Interfaces:**
- Produces: variáveis CSS `--chart-tertiary`, `--chart-quaternary`, `--chart-quinary` consumidas pelos componentes de gráfico das Tasks 6-9.

- [ ] **Step 1: Instalar a dependência**

Run: `npm install recharts@^3.9.2`
Expected: `package.json` e `package-lock.json` atualizados, `node_modules/recharts` presente.

- [ ] **Step 2: Adicionar as 3 cores novas ao `:root` de `globals.css`**

Em `src/app/globals.css`, logo após a linha `--chart-secondary: #d97706;`:

```css
	--chart-primary: #0d9488;
	--chart-secondary: #d97706;
	--chart-tertiary: #3b82f6;
	--chart-quaternary: #ec4899;
	--chart-quinary: #8b5cf6;
	--warn: #f5a623;
```

- [ ] **Step 3: Verificar que o projeto ainda builda**

Run: `npm run typecheck`
Expected: sem erros (nenhum código consome as libs/vars novas ainda).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/app/globals.css
git commit -m "chore(metricas)!: adiciona recharts e cores do grafico de composicao do fluxo"
```

---

### Task 2: Histórico de períodos no motor de métricas

**Files:**
- Modify: `src/application/metrics/use-cases/get-metrics-dashboard.ts`
- Test: `src/application/metrics/use-cases/get-metrics-dashboard.test.ts`

**Interfaces:**
- Consumes: `getPreviousPeriods(periodType, referenceDate, count): PeriodRange[]` de `@/application/metrics/period` (já existe); `getMetricsForRange(snapshot, periodStart, periodEnd, now): HistoricalPeriodMetrics` de `./get-metrics-for-period` (já existe).
- Produces: `MetricsDashboardResult = { current: PeriodMetrics; history: HistoricalPeriodMetrics[] }` — `history` em ordem cronológica (mais antigo → mais recente), `history.at(-1)` sempre igual ao período atual.

- [ ] **Step 1: Escrever o teste que falha**

Substituir o conteúdo de `src/application/metrics/use-cases/get-metrics-dashboard.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type {
	MetricsQueryPort,
	MetricsSnapshot,
} from "@/application/metrics/ports/metrics-query-port";
import { getMetricsDashboard } from "./get-metrics-dashboard";

describe("getMetricsDashboard", () => {
	it("calcula o dashboard inteiro a partir de um único snapshot largo", async () => {
		const snapshot: MetricsSnapshot = {
			completionEvents: [
				{
					taskId: "task-1",
					createdAt: new Date("2026-07-01T00:00:00Z"),
					completedAt: new Date("2026-07-14T00:00:00Z"),
					dueDate: "2026-07-15",
				},
				{
					taskId: "task-1",
					createdAt: new Date("2026-07-01T00:00:00Z"),
					completedAt: new Date("2026-07-16T00:00:00Z"),
					dueDate: "2026-07-15",
				},
			],
			statusChanges: [
				{
					taskId: "task-1",
					fromStatus: "TODO",
					toStatus: "IN_DEVELOPMENT",
					changedAt: new Date("2026-07-02T00:00:00Z"),
				},
			],
			blockedPeriods: [
				{
					taskId: "task-1",
					blockedAt: new Date("2026-07-10T00:00:00Z"),
					unblockedAt: new Date("2026-07-11T00:00:00Z"),
				},
			],
			dueDateTasks: [
				{
					taskId: "task-1",
					dueDate: "2026-07-15",
					firstCompletedAt: new Date("2026-07-16T00:00:00Z"),
				},
			],
			wip: {
				total: 3,
				blocked: 0,
				inReview: 0,
				inTesting: 0,
				inPublication: 0,
			},
		};
		let loadSnapshotCalls = 0;
		let capturedRange: { start: Date; end: Date } | null = null;
		const port: MetricsQueryPort = {
			async loadSnapshot(_teamId, periodStart, periodEnd) {
				loadSnapshotCalls += 1;
				capturedRange = { start: periodStart, end: periodEnd };
				return snapshot;
			},
		};

		const dashboard = await getMetricsDashboard(
			port,
			"team-1",
			"WEEK",
			new Date("2026-07-15T12:00:00Z"),
		);

		expect(loadSnapshotCalls).toBe(1);
		expect(capturedRange).toEqual({
			start: new Date("2026-05-25T00:00:00Z"),
			end: new Date("2026-07-20T00:00:00Z"),
		});
		expect(dashboard.history).toHaveLength(8);
		expect(dashboard.history.at(-1)?.periodStart).toEqual(
			new Date("2026-07-13T00:00:00Z"),
		);
		expect(dashboard.history.at(-1)?.throughput).toBe(1);
		expect(dashboard.history[0]?.periodStart).toEqual(
			new Date("2026-05-25T00:00:00Z"),
		);
		expect(dashboard.history[0]?.throughput).toBe(0);
		expect(dashboard.current.periodStart).toEqual(
			new Date("2026-07-13T00:00:00Z"),
		);
		expect(dashboard.current.periodEnd).toEqual(
			new Date("2026-07-20T00:00:00Z"),
		);
		expect(dashboard.current.throughput).toBe(1);
		expect(dashboard.current.wip).toEqual({
			total: 3,
			blocked: 0,
			inReview: 0,
			inTesting: 0,
			inPublication: 0,
		});
		expect(dashboard.current.leadTime?.averageMs).toBe(15 * 86_400_000);
		expect(dashboard.current.cycleTime?.averageMs).toBe(14 * 86_400_000);
		expect(dashboard.current.blockedTime?.averageMs).toBe(86_400_000);
		expect(dashboard.current.predictability).toBe(0);
	});
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest run src/application/metrics/use-cases/get-metrics-dashboard.test.ts`
Expected: FAIL — `dashboard.history` é `undefined` (propriedade não existe ainda) e `capturedRange`/`loadSnapshotCalls` não batem porque hoje `loadSnapshot` é chamado com o range do período único.

- [ ] **Step 3: Implementar**

Substituir o conteúdo de `src/application/metrics/use-cases/get-metrics-dashboard.ts`:

```ts
import type { PeriodType } from "@/application/metrics/period";
import { getPreviousPeriods } from "@/application/metrics/period";
import type { MetricsQueryPort } from "@/application/metrics/ports/metrics-query-port";
import {
	getMetricsForRange,
	type HistoricalPeriodMetrics,
	type PeriodMetrics,
} from "./get-metrics-for-period";

const HISTORY_LENGTH = 8;

export type MetricsDashboardResult = {
	current: PeriodMetrics;
	history: HistoricalPeriodMetrics[];
};

export async function getMetricsDashboard(
	port: MetricsQueryPort,
	teamId: string,
	periodType: PeriodType,
	referenceDate: Date,
): Promise<MetricsDashboardResult> {
	const periods = getPreviousPeriods(periodType, referenceDate, HISTORY_LENGTH);
	const windowStart = periods[0].start;
	const windowEnd = periods[periods.length - 1].end;
	const snapshot = await port.loadSnapshot(teamId, windowStart, windowEnd);
	const now = new Date();

	const history = periods.map((range) =>
		getMetricsForRange(snapshot, range.start, range.end, now),
	);
	const current = history[history.length - 1];

	return {
		current: { ...current, wip: snapshot.wip },
		history,
	};
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest run src/application/metrics/use-cases/get-metrics-dashboard.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/application/metrics/use-cases/get-metrics-dashboard.ts src/application/metrics/use-cases/get-metrics-dashboard.test.ts
git commit -m "feat(metricas)!: adiciona historico de periodos ao dashboard de metricas"
```

---

### Task 3: Rótulo curto de período para o eixo X

**Files:**
- Modify: `src/presentation/metrics-dashboard/format-period-label.ts`
- Test: `src/presentation/metrics-dashboard/format-period-label.test.ts`

**Interfaces:**
- Produces: `formatPeriodShortLabel(periodType: PeriodType, periodStart: Date): string` — `"13/07"` pra semana, `"Jul/26"` pra mês.

- [ ] **Step 1: Escrever os testes que falham**

Adicionar ao final de `src/presentation/metrics-dashboard/format-period-label.test.ts` (ver o arquivo atual pra manter os imports existentes; adicionar `formatPeriodShortLabel` ao import de `./format-period-label`):

```ts
describe("formatPeriodShortLabel", () => {
	it("formata semana como dia/mês do início do período", () => {
		expect(
			formatPeriodShortLabel("WEEK", new Date("2026-07-13T00:00:00Z")),
		).toBe("13/07");
	});

	it("formata mês como abreviação capitalizada + ano curto", () => {
		expect(
			formatPeriodShortLabel("MONTH", new Date("2026-07-01T00:00:00Z")),
		).toBe("Jul/26");
	});
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npx vitest run src/presentation/metrics-dashboard/format-period-label.test.ts`
Expected: FAIL — `formatPeriodShortLabel` não existe.

- [ ] **Step 3: Implementar**

Em `src/presentation/metrics-dashboard/format-period-label.ts`, adicionar (depois de `formatDayMonth`, antes ou depois de `formatPeriodLabel`):

```ts
export function formatPeriodShortLabel(
	periodType: PeriodType,
	periodStart: Date,
): string {
	if (periodType === "WEEK") {
		return formatDayMonth(periodStart);
	}
	const monthAbbrev = periodStart
		.toLocaleDateString("pt-BR", { month: "short", timeZone: "UTC" })
		.replace(".", "");
	const yearShort = String(periodStart.getUTCFullYear()).slice(-2);
	return `${capitalize(monthAbbrev)}/${yearShort}`;
}
```

`toLocaleDateString` com `month: "short"` em `pt-BR` no Node retorna `"jul."` (com ponto) — por isso o `.replace(".", "")` antes de capitalizar e concatenar o ano curto manualmente. Verificado no Node deste projeto para os 12 meses (`jan.`...`dez.`), todos com um único ponto à direita.

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npx vitest run src/presentation/metrics-dashboard/format-period-label.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/presentation/metrics-dashboard/format-period-label.ts src/presentation/metrics-dashboard/format-period-label.test.ts
git commit -m "feat(metricas)!: adiciona rotulo curto de periodo para eixo de grafico"
```

---

### Task 4: Definições e modal de info dos 4 gráficos

**Files:**
- Modify: `src/presentation/metrics-dashboard/metric-definitions.ts`
- Modify: `src/presentation/metrics-dashboard/metric-info-button.tsx`

**Interfaces:**
- Produces: `MetricKey` com 4 valores novos (`"throughputTrend"`, `"plannedDeliveredTrend"`, `"leadCycleTimeTrend"`, `"flowComposition"`) e as entradas correspondentes em `METRIC_DEFINITIONS`, consumidas pela Task 5 (`ChartCard`).

- [ ] **Step 1: Adicionar as chaves e definições**

Em `src/presentation/metrics-dashboard/metric-definitions.ts`, adicionar ao `MetricKey`:

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
	| "flowComposition";
```

E ao final do array `METRIC_DEFINITIONS` (antes do `];` de fechamento):

```ts
	{
		key: "throughputTrend",
		label: "Throughput por período",
		description:
			"Cards entregues em cada um dos últimos 8 períodos (semanas ou meses).",
	},
	{
		key: "plannedDeliveredTrend",
		label: "Planejado x entregue",
		description:
			"Cards com prazo (planejado) e cards entregues até o prazo (entregue) em cada um dos últimos 8 períodos.",
	},
	{
		key: "leadCycleTimeTrend",
		label: "Lead time x Cycle time",
		description:
			"Mediana do lead time e do cycle time em cada um dos últimos 8 períodos.",
	},
	{
		key: "flowComposition",
		label: "Composição do fluxo",
		description:
			"Média do tempo do card em cada etapa (desenvolvimento, code review, testes, bloqueado, aguardando publicação) no período atual. Desenvolvimento é o tempo restante do cycle time depois de somar as outras etapas.",
	},
```

- [ ] **Step 2: Adicionar o grupo "Gráficos" ao modal**

Em `src/presentation/metrics-dashboard/metric-info-button.tsx`, adicionar ao array `GROUPS` (depois do grupo `"Tempo do fluxo"`):

```ts
	{
		title: "Gráficos",
		keys: [
			"throughputTrend",
			"plannedDeliveredTrend",
			"leadCycleTimeTrend",
			"flowComposition",
		],
	},
```

- [ ] **Step 3: Verificar tipos**

Run: `npm run typecheck`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/presentation/metrics-dashboard/metric-definitions.ts src/presentation/metrics-dashboard/metric-info-button.tsx
git commit -m "feat(metricas)!: adiciona definicoes dos graficos ao modal de info"
```

---

### Task 5: `ChartCard` — wrapper de título com tooltip

**Files:**
- Create: `src/presentation/metrics-dashboard/charts/chart-card.tsx`

**Interfaces:**
- Consumes: `METRIC_DEFINITIONS`, `MetricKey` de `../metric-definitions`.
- Produces: `<ChartCard metricKey={...}>{children}</ChartCard>` — usado pelas Tasks 6-9.

- [ ] **Step 1: Criar o componente**

```tsx
import type { ReactNode } from "react";
import { METRIC_DEFINITIONS, type MetricKey } from "../metric-definitions";

type ChartCardProps = {
	metricKey: MetricKey;
	children: ReactNode;
};

export function ChartCard({ metricKey, children }: ChartCardProps) {
	const definition = METRIC_DEFINITIONS.find((item) => item.key === metricKey);

	return (
		<div
			data-testid={`metric-chart-${metricKey}`}
			className="flex flex-col gap-2 rounded-xl border border-(--border) bg-(--surface) p-4"
		>
			<h3
				title={definition?.description}
				className="text-sm font-semibold opacity-70"
			>
				{definition?.label ?? metricKey}
			</h3>
			{children}
		</div>
	);
}
```

Não precisa de teste dedicado: é um wrapper de apresentação puro, coberto pelos testes E2E das Tasks 6-9/11 (mesmo padrão de `StatTile`, que também não tem teste próprio).

- [ ] **Step 2: Verificar tipos**

Run: `npm run typecheck`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/presentation/metrics-dashboard/charts/chart-card.tsx
git commit -m "feat(metricas)!: adiciona chart-card com tooltip nativo de titulo"
```

---

### Task 6: Gráfico de throughput

**Files:**
- Create: `src/presentation/metrics-dashboard/charts/to-throughput-series.ts`
- Test: `src/presentation/metrics-dashboard/charts/to-throughput-series.test.ts`
- Create: `src/presentation/metrics-dashboard/charts/throughput-chart.tsx`

**Interfaces:**
- Consumes: `HistoricalPeriodMetrics` de `@/application/metrics/use-cases/get-metrics-for-period`; `PeriodType` de `@/application/metrics/period`; `formatPeriodShortLabel` de `../format-period-label`.
- Produces: `toThroughputSeries(history, periodType): { label: string; throughput: number }[]`; `<ThroughputChart history={...} periodType={...} />`.

- [ ] **Step 1: Escrever o teste que falha**

```ts
import { describe, expect, it } from "vitest";
import type { HistoricalPeriodMetrics } from "@/application/metrics/use-cases/get-metrics-for-period";
import { toThroughputSeries } from "./to-throughput-series";

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
		...overrides,
	};
}

describe("toThroughputSeries", () => {
	it("mapeia cada período pro rótulo curto e o throughput", () => {
		const history = [
			historicalEntry({
				periodStart: new Date("2026-07-06T00:00:00Z"),
				throughput: 5,
			}),
			historicalEntry({
				periodStart: new Date("2026-07-13T00:00:00Z"),
				throughput: 2,
			}),
		];

		expect(toThroughputSeries(history, "WEEK")).toEqual([
			{ label: "06/07", throughput: 5 },
			{ label: "13/07", throughput: 2 },
		]);
	});
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest run src/presentation/metrics-dashboard/charts/to-throughput-series.test.ts`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar a função de shaping**

```ts
import type { PeriodType } from "@/application/metrics/period";
import type { HistoricalPeriodMetrics } from "@/application/metrics/use-cases/get-metrics-for-period";
import { formatPeriodShortLabel } from "../format-period-label";

export type ThroughputPoint = { label: string; throughput: number };

export function toThroughputSeries(
	history: HistoricalPeriodMetrics[],
	periodType: PeriodType,
): ThroughputPoint[] {
	return history.map((entry) => ({
		label: formatPeriodShortLabel(periodType, entry.periodStart),
		throughput: entry.throughput,
	}));
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest run src/presentation/metrics-dashboard/charts/to-throughput-series.test.ts`
Expected: PASS

- [ ] **Step 5: Criar o componente do gráfico**

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
import { toThroughputSeries } from "./to-throughput-series";

type ThroughputChartProps = {
	history: HistoricalPeriodMetrics[];
	periodType: PeriodType;
};

export function ThroughputChart({ history, periodType }: ThroughputChartProps) {
	const data = toThroughputSeries(history, periodType);

	return (
		<ChartCard metricKey="throughputTrend">
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
						dataKey="throughput"
						name="Throughput"
						fill="var(--chart-primary)"
						radius={[4, 4, 0, 0]}
					/>
				</BarChart>
			</ResponsiveContainer>
		</ChartCard>
	);
}
```

- [ ] **Step 6: Verificar tipos**

Run: `npm run typecheck`
Expected: sem erros.

- [ ] **Step 7: Commit**

```bash
git add src/presentation/metrics-dashboard/charts/to-throughput-series.ts src/presentation/metrics-dashboard/charts/to-throughput-series.test.ts src/presentation/metrics-dashboard/charts/throughput-chart.tsx
git commit -m "feat(metricas)!: adiciona grafico de throughput por periodo"
```

---

### Task 7: Gráfico de planejado x entregue

**Files:**
- Create: `src/presentation/metrics-dashboard/charts/to-planned-delivered-series.ts`
- Test: `src/presentation/metrics-dashboard/charts/to-planned-delivered-series.test.ts`
- Create: `src/presentation/metrics-dashboard/charts/planned-delivered-chart.tsx`

**Interfaces:**
- Consumes: mesmos tipos da Task 6, mais `predictabilityCounts: { planned: number; delivered: number } | null` (já existe em `HistoricalPeriodMetrics`).
- Produces: `toPlannedDeliveredSeries(history, periodType): { label: string; planned: number; delivered: number }[]`; `<PlannedDeliveredChart history={...} periodType={...} />`.

- [ ] **Step 1: Escrever o teste que falha**

```ts
import { describe, expect, it } from "vitest";
import type { HistoricalPeriodMetrics } from "@/application/metrics/use-cases/get-metrics-for-period";
import { toPlannedDeliveredSeries } from "./to-planned-delivered-series";

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
		...overrides,
	};
}

describe("toPlannedDeliveredSeries", () => {
	it("mapeia planejado e entregue de cada período", () => {
		const history = [
			historicalEntry({
				periodStart: new Date("2026-07-13T00:00:00Z"),
				predictabilityCounts: { planned: 8, delivered: 7 },
			}),
		];

		expect(toPlannedDeliveredSeries(history, "WEEK")).toEqual([
			{ label: "13/07", planned: 8, delivered: 7 },
		]);
	});

	it("usa 0/0 quando não há tasks com prazo no período", () => {
		const history = [
			historicalEntry({ periodStart: new Date("2026-07-13T00:00:00Z") }),
		];

		expect(toPlannedDeliveredSeries(history, "WEEK")).toEqual([
			{ label: "13/07", planned: 0, delivered: 0 },
		]);
	});
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest run src/presentation/metrics-dashboard/charts/to-planned-delivered-series.test.ts`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar a função de shaping**

```ts
import type { PeriodType } from "@/application/metrics/period";
import type { HistoricalPeriodMetrics } from "@/application/metrics/use-cases/get-metrics-for-period";
import { formatPeriodShortLabel } from "../format-period-label";

export type PlannedDeliveredPoint = {
	label: string;
	planned: number;
	delivered: number;
};

export function toPlannedDeliveredSeries(
	history: HistoricalPeriodMetrics[],
	periodType: PeriodType,
): PlannedDeliveredPoint[] {
	return history.map((entry) => ({
		label: formatPeriodShortLabel(periodType, entry.periodStart),
		planned: entry.predictabilityCounts?.planned ?? 0,
		delivered: entry.predictabilityCounts?.delivered ?? 0,
	}));
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest run src/presentation/metrics-dashboard/charts/to-planned-delivered-series.test.ts`
Expected: PASS

- [ ] **Step 5: Criar o componente do gráfico**

```tsx
"use client";

import {
	Bar,
	BarChart,
	CartesianGrid,
	Legend,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import type { PeriodType } from "@/application/metrics/period";
import type { HistoricalPeriodMetrics } from "@/application/metrics/use-cases/get-metrics-for-period";
import { ChartCard } from "./chart-card";
import { toPlannedDeliveredSeries } from "./to-planned-delivered-series";

type PlannedDeliveredChartProps = {
	history: HistoricalPeriodMetrics[];
	periodType: PeriodType;
};

export function PlannedDeliveredChart({
	history,
	periodType,
}: PlannedDeliveredChartProps) {
	const data = toPlannedDeliveredSeries(history, periodType);

	return (
		<ChartCard metricKey="plannedDeliveredTrend">
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
					<Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />
					<Bar
						dataKey="planned"
						name="Planejado"
						fill="var(--chart-primary)"
						radius={[4, 4, 0, 0]}
					/>
					<Bar
						dataKey="delivered"
						name="Entregue"
						fill="var(--chart-secondary)"
						radius={[4, 4, 0, 0]}
					/>
				</BarChart>
			</ResponsiveContainer>
		</ChartCard>
	);
}
```

- [ ] **Step 6: Verificar tipos**

Run: `npm run typecheck`
Expected: sem erros.

- [ ] **Step 7: Commit**

```bash
git add src/presentation/metrics-dashboard/charts/to-planned-delivered-series.ts src/presentation/metrics-dashboard/charts/to-planned-delivered-series.test.ts src/presentation/metrics-dashboard/charts/planned-delivered-chart.tsx
git commit -m "feat(metricas)!: adiciona grafico de planejado x entregue"
```

---

### Task 8: Gráfico de lead time x cycle time

**Files:**
- Create: `src/presentation/metrics-dashboard/charts/to-duration-trend-series.ts`
- Test: `src/presentation/metrics-dashboard/charts/to-duration-trend-series.test.ts`
- Create: `src/presentation/metrics-dashboard/charts/lead-cycle-time-chart.tsx`

**Interfaces:**
- Consumes: `HistoricalPeriodMetrics.leadTime`/`.cycleTime: DurationStats | null` (`DurationStats = { averageMs: number; medianMs: number }`, de `@/application/metrics/formulas/duration-metrics`); `formatDuration` de `../format-metric-value`.
- Produces: `toDurationTrendSeries(history, periodType): { label: string; leadTimeMs: number | null; cycleTimeMs: number | null }[]`; `<LeadCycleTimeChart history={...} periodType={...} />`.

- [ ] **Step 1: Escrever o teste que falha**

```ts
import { describe, expect, it } from "vitest";
import type { HistoricalPeriodMetrics } from "@/application/metrics/use-cases/get-metrics-for-period";
import { toDurationTrendSeries } from "./to-duration-trend-series";

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
		...overrides,
	};
}

describe("toDurationTrendSeries", () => {
	it("usa a mediana de lead time e cycle time", () => {
		const history = [
			historicalEntry({
				periodStart: new Date("2026-07-13T00:00:00Z"),
				leadTime: { averageMs: 1000, medianMs: 900 },
				cycleTime: { averageMs: 500, medianMs: 400 },
			}),
		];

		expect(toDurationTrendSeries(history, "WEEK")).toEqual([
			{ label: "13/07", leadTimeMs: 900, cycleTimeMs: 400 },
		]);
	});

	it("usa null quando não há dado no período", () => {
		const history = [
			historicalEntry({ periodStart: new Date("2026-07-13T00:00:00Z") }),
		];

		expect(toDurationTrendSeries(history, "WEEK")).toEqual([
			{ label: "13/07", leadTimeMs: null, cycleTimeMs: null },
		]);
	});
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest run src/presentation/metrics-dashboard/charts/to-duration-trend-series.test.ts`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar a função de shaping**

```ts
import type { PeriodType } from "@/application/metrics/period";
import type { HistoricalPeriodMetrics } from "@/application/metrics/use-cases/get-metrics-for-period";
import { formatPeriodShortLabel } from "../format-period-label";

export type DurationTrendPoint = {
	label: string;
	leadTimeMs: number | null;
	cycleTimeMs: number | null;
};

export function toDurationTrendSeries(
	history: HistoricalPeriodMetrics[],
	periodType: PeriodType,
): DurationTrendPoint[] {
	return history.map((entry) => ({
		label: formatPeriodShortLabel(periodType, entry.periodStart),
		leadTimeMs: entry.leadTime?.medianMs ?? null,
		cycleTimeMs: entry.cycleTime?.medianMs ?? null,
	}));
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest run src/presentation/metrics-dashboard/charts/to-duration-trend-series.test.ts`
Expected: PASS

- [ ] **Step 5: Criar o componente do gráfico**

```tsx
"use client";

import {
	CartesianGrid,
	Legend,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import type { PeriodType } from "@/application/metrics/period";
import type { HistoricalPeriodMetrics } from "@/application/metrics/use-cases/get-metrics-for-period";
import { ChartCard } from "./chart-card";
import { formatDuration } from "../format-metric-value";
import { toDurationTrendSeries } from "./to-duration-trend-series";

type LeadCycleTimeChartProps = {
	history: HistoricalPeriodMetrics[];
	periodType: PeriodType;
};

export function LeadCycleTimeChart({
	history,
	periodType,
}: LeadCycleTimeChartProps) {
	const data = toDurationTrendSeries(history, periodType);

	return (
		<ChartCard metricKey="leadCycleTimeTrend">
			<ResponsiveContainer width="100%" height={220}>
				<LineChart data={data}>
					<CartesianGrid stroke="var(--border)" vertical={false} />
					<XAxis
						dataKey="label"
						tick={{ fontSize: 11, fill: "var(--foreground-muted)" }}
					/>
					<YAxis
						width={44}
						tick={{ fontSize: 11, fill: "var(--foreground-muted)" }}
						tickFormatter={(value: number) => formatDuration(value)}
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
						formatter={(value: number) => formatDuration(value)}
					/>
					<Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />
					<Line
						type="monotone"
						dataKey="leadTimeMs"
						name="Lead time"
						stroke="var(--chart-primary)"
						strokeWidth={2}
						dot={{ r: 4 }}
						connectNulls={false}
					/>
					<Line
						type="monotone"
						dataKey="cycleTimeMs"
						name="Cycle time"
						stroke="var(--chart-secondary)"
						strokeWidth={2}
						dot={{ r: 4 }}
						connectNulls={false}
					/>
				</LineChart>
			</ResponsiveContainer>
		</ChartCard>
	);
}
```

- [ ] **Step 6: Verificar tipos**

Run: `npm run typecheck`
Expected: sem erros.

- [ ] **Step 7: Commit**

```bash
git add src/presentation/metrics-dashboard/charts/to-duration-trend-series.ts src/presentation/metrics-dashboard/charts/to-duration-trend-series.test.ts src/presentation/metrics-dashboard/charts/lead-cycle-time-chart.tsx
git commit -m "feat(metricas)!: adiciona grafico de lead time x cycle time"
```

---

### Task 9: Gráfico de composição do fluxo

**Files:**
- Create: `src/presentation/metrics-dashboard/charts/to-flow-composition-data.ts`
- Test: `src/presentation/metrics-dashboard/charts/to-flow-composition-data.test.ts`
- Create: `src/presentation/metrics-dashboard/charts/flow-composition-chart.tsx`

**Interfaces:**
- Consumes: `PeriodMetrics` de `@/application/metrics/use-cases/get-metrics-for-period` (campos `cycleTime`, `codeReviewTime`, `testingTime`, `blockedTime`, `awaitingPublicationTime`, todos `DurationStats | null`).
- Produces: `toFlowCompositionData(current): { development: number; codeReview: number; testing: number; blocked: number; awaitingPublication: number } | null`; `<FlowCompositionChart current={...} />`.

- [ ] **Step 1: Escrever o teste que falha**

```ts
import { describe, expect, it } from "vitest";
import type { PeriodMetrics } from "@/application/metrics/use-cases/get-metrics-for-period";
import { toFlowCompositionData } from "./to-flow-composition-data";

function periodMetrics(overrides: Partial<PeriodMetrics>): PeriodMetrics {
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
		wip: { total: 0, blocked: 0, inReview: 0, inTesting: 0, inPublication: 0 },
		predictability: null,
		predictabilityCounts: null,
		unplannedCount: null,
		...overrides,
	};
}

describe("toFlowCompositionData", () => {
	it("retorna null quando não há cycle time no período", () => {
		expect(toFlowCompositionData(periodMetrics({}))).toBeNull();
	});

	it("calcula desenvolvimento como o restante do cycle time", () => {
		const current = periodMetrics({
			cycleTime: { averageMs: 1000, medianMs: 1000 },
			codeReviewTime: { averageMs: 200, medianMs: 200 },
			testingTime: { averageMs: 100, medianMs: 100 },
			blockedTime: { averageMs: 50, medianMs: 50 },
			awaitingPublicationTime: { averageMs: 150, medianMs: 150 },
		});

		expect(toFlowCompositionData(current)).toEqual({
			development: 500,
			codeReview: 200,
			testing: 100,
			blocked: 50,
			awaitingPublication: 150,
		});
	});

	it("tem piso em 0 quando as etapas somam mais que o cycle time", () => {
		const current = periodMetrics({
			cycleTime: { averageMs: 100, medianMs: 100 },
			codeReviewTime: { averageMs: 200, medianMs: 200 },
		});

		expect(toFlowCompositionData(current)?.development).toBe(0);
	});

	it("trata etapas sem dado como 0", () => {
		const current = periodMetrics({
			cycleTime: { averageMs: 1000, medianMs: 1000 },
		});

		expect(toFlowCompositionData(current)).toEqual({
			development: 1000,
			codeReview: 0,
			testing: 0,
			blocked: 0,
			awaitingPublication: 0,
		});
	});
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest run src/presentation/metrics-dashboard/charts/to-flow-composition-data.test.ts`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar a função de shaping**

```ts
import type { PeriodMetrics } from "@/application/metrics/use-cases/get-metrics-for-period";

export type FlowCompositionData = {
	development: number;
	codeReview: number;
	testing: number;
	blocked: number;
	awaitingPublication: number;
};

export function toFlowCompositionData(
	current: PeriodMetrics,
): FlowCompositionData | null {
	if (!current.cycleTime) {
		return null;
	}
	const codeReview = current.codeReviewTime?.averageMs ?? 0;
	const testing = current.testingTime?.averageMs ?? 0;
	const blocked = current.blockedTime?.averageMs ?? 0;
	const awaitingPublication = current.awaitingPublicationTime?.averageMs ?? 0;
	const development = Math.max(
		current.cycleTime.averageMs -
			(codeReview + testing + blocked + awaitingPublication),
		0,
	);
	return { development, codeReview, testing, blocked, awaitingPublication };
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest run src/presentation/metrics-dashboard/charts/to-flow-composition-data.test.ts`
Expected: PASS

- [ ] **Step 5: Criar o componente do gráfico**

```tsx
"use client";

import {
	Bar,
	BarChart,
	Legend,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import type { PeriodMetrics } from "@/application/metrics/use-cases/get-metrics-for-period";
import { ChartCard } from "./chart-card";
import { formatDuration } from "../format-metric-value";
import { toFlowCompositionData } from "./to-flow-composition-data";

type FlowCompositionChartProps = {
	current: PeriodMetrics;
};

const SEGMENTS = [
	{
		dataKey: "development" as const,
		name: "Desenvolvimento",
		fill: "var(--chart-primary)",
	},
	{
		dataKey: "codeReview" as const,
		name: "Code review",
		fill: "var(--chart-secondary)",
	},
	{ dataKey: "testing" as const, name: "Testes", fill: "var(--chart-tertiary)" },
	{
		dataKey: "blocked" as const,
		name: "Bloqueado",
		fill: "var(--chart-quaternary)",
	},
	{
		dataKey: "awaitingPublication" as const,
		name: "Aguardando publicação",
		fill: "var(--chart-quinary)",
	},
];

export function FlowCompositionChart({ current }: FlowCompositionChartProps) {
	const data = toFlowCompositionData(current);

	return (
		<ChartCard metricKey="flowComposition">
			{data ? (
				<ResponsiveContainer width="100%" height={110}>
					<BarChart
						layout="vertical"
						data={[{ name: "Cycle time", ...data }]}
						margin={{ left: 0, right: 16 }}
					>
						<XAxis
							type="number"
							tickFormatter={(value: number) => formatDuration(value)}
							tick={{ fontSize: 11, fill: "var(--foreground-muted)" }}
						/>
						<YAxis type="category" dataKey="name" hide />
						<Tooltip
							contentStyle={{
								background: "var(--surface)",
								border: "1px solid var(--border)",
								borderRadius: 6,
								fontSize: 12,
							}}
							itemStyle={{ color: "var(--foreground)" }}
							formatter={(value: number) => formatDuration(value)}
						/>
						<Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />
						{SEGMENTS.map((segment) => (
							<Bar
								key={segment.dataKey}
								dataKey={segment.dataKey}
								name={segment.name}
								stackId="flow"
								fill={segment.fill}
							/>
						))}
					</BarChart>
				</ResponsiveContainer>
			) : (
				<p className="text-sm opacity-70">sem dados</p>
			)}
		</ChartCard>
	);
}
```

- [ ] **Step 6: Verificar tipos**

Run: `npm run typecheck`
Expected: sem erros.

- [ ] **Step 7: Commit**

```bash
git add src/presentation/metrics-dashboard/charts/to-flow-composition-data.ts src/presentation/metrics-dashboard/charts/to-flow-composition-data.test.ts src/presentation/metrics-dashboard/charts/flow-composition-chart.tsx
git commit -m "feat(metricas)!: adiciona grafico de composicao do fluxo"
```

---

### Task 10: Seção de gráficos no dashboard

**Files:**
- Create: `src/presentation/metrics-dashboard/charts/charts-section.tsx`
- Modify: `src/presentation/metrics-dashboard/metrics-dashboard.tsx`
- Modify: `src/app/metrics/page.tsx`

**Interfaces:**
- Consumes: `ThroughputChart`, `PlannedDeliveredChart`, `LeadCycleTimeChart`, `FlowCompositionChart` (Tasks 6-9); `MetricsDashboardResult` (`{ current, history }`) da Task 2.
- Produces: `<ChartsSection periodType={...} current={...} history={...} />`, montada dentro de `<MetricsDashboard>`.

- [ ] **Step 1: Criar `charts-section.tsx`**

```tsx
import type { PeriodType } from "@/application/metrics/period";
import type {
	HistoricalPeriodMetrics,
	PeriodMetrics,
} from "@/application/metrics/use-cases/get-metrics-for-period";
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
	return (
		<section className="flex flex-col gap-3">
			<h2 className="text-sm font-semibold opacity-70">Gráficos</h2>
			<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
				<ThroughputChart history={history} periodType={periodType} />
				<PlannedDeliveredChart history={history} periodType={periodType} />
				<LeadCycleTimeChart history={history} periodType={periodType} />
				<FlowCompositionChart current={current} />
			</div>
		</section>
	);
}
```

- [ ] **Step 2: Ligar em `metrics-dashboard.tsx`**

Adicionar o import e a prop `history`, e renderizar `<ChartsSection>` depois de `<FlowTimeSection>`:

```tsx
import type { PeriodType } from "@/application/metrics/period";
import type {
	HistoricalPeriodMetrics,
	PeriodMetrics,
} from "@/application/metrics/use-cases/get-metrics-for-period";
import { ChartsSection } from "./charts/charts-section";
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
	history: HistoricalPeriodMetrics[];
};

export function MetricsDashboard({
	periodType,
	referenceDate,
	current,
	history,
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
			<ChartsSection periodType={periodType} current={current} history={history} />
		</div>
	);
}
```

- [ ] **Step 3: Passar `history` a partir da página**

Em `src/app/metrics/page.tsx`, trocar a desestruturação e a prop passada:

```tsx
	const metricsUseCases = createMetricsUseCases();
	const { current, history } = await metricsUseCases.getMetricsDashboard(
		currentTeam.id,
		periodType,
		referenceDate,
	);

	return (
		<MetricsDashboard
			periodType={periodType}
			referenceDate={referenceDate}
			current={current}
			history={history}
		/>
	);
```

- [ ] **Step 4: Verificar tipos**

Run: `npm run typecheck`
Expected: sem erros.

- [ ] **Step 5: Rodar a suíte unitária inteira**

Run: `npm test`
Expected: todos os testes passam.

- [ ] **Step 6: Commit**

```bash
git add src/presentation/metrics-dashboard/charts/charts-section.tsx src/presentation/metrics-dashboard/metrics-dashboard.tsx src/app/metrics/page.tsx
git commit -m "feat(metricas)!: liga os 4 graficos de tendencia ao dashboard de metricas"
```

---

### Task 11: Testes E2E dos gráficos

**Files:**
- Modify: `tests/integration/metrics-dashboard.spec.ts`

**Interfaces:**
- Consumes: fluxo de UI já usado nos testes existentes do arquivo (criação de time, criação de task retroativa via botão "Retroativo").

- [ ] **Step 1: Estender o teste de "sem dados" pra cobrir os gráficos**

No teste `"mostra os 3 blocos com zeros/sem dados quando o time não tem tasks"`, adicionar, depois das asserções existentes:

```ts
	await expect(
		page.getByRole("heading", { name: "Throughput por período" }),
	).toBeVisible();
	await expect(
		page.getByRole("heading", { name: "Planejado x entregue" }),
	).toBeVisible();
	await expect(
		page.getByRole("heading", { name: "Lead time x Cycle time" }),
	).toBeVisible();
	await expect(
		page.getByRole("heading", { name: "Composição do fluxo" }),
	).toBeVisible();
	await expect(
		page.getByTestId("metric-chart-flowComposition").getByText("sem dados"),
	).toBeVisible();
```

- [ ] **Step 2: Adicionar um teste novo pro tooltip nativo do título e pro throughput com dado real**

Adicionar ao final do arquivo, reaproveitando o fluxo de task retroativa já usado no teste `"card retroativo concluído hoje entra em Entregues e Retrabalho"`:

```ts
test("grafico de throughput mostra o card entregue e o titulo explica o calculo", async ({
	page,
}) => {
	const today = new Date().toISOString().slice(0, 10);
	await page.getByRole("button", { name: "Retroativo" }).click();
	await page.getByLabel("Id externo").fill("TASK-HIST-2");
	await page.getByLabel("Descrição").fill("Ajuste de layout");
	await page.getByLabel("Status da etapa 1").selectOption({ label: "Backlog" });
	await page.getByLabel("Data da etapa 1").fill(today);
	await page.getByRole("button", { name: "+ Adicionar etapa" }).click();
	await page
		.getByLabel("Status da etapa 2")
		.selectOption({ label: "Desenvolvimento" });
	await page.getByLabel("Data da etapa 2").fill(today);
	await page.getByRole("button", { name: "+ Adicionar etapa" }).click();
	await page.getByLabel("Status da etapa 3").selectOption({ label: "Concluído" });
	await page.getByLabel("Data da etapa 3").fill(today);
	await page.getByLabel("Data prevista de entrega").fill(today);
	await page.getByRole("button", { name: "Salvar" }).click();

	await page.getByRole("link", { name: "Métricas" }).click();

	const throughputTitle = page.getByRole("heading", {
		name: "Throughput por período",
	});
	await expect(throughputTitle).toBeVisible();
	await expect(throughputTitle).toHaveAttribute(
		"title",
		"Cards entregues em cada um dos últimos 8 períodos (semanas ou meses).",
	);
	await expect(
		page.getByTestId("metric-chart-throughputTrend").locator("svg"),
	).toBeVisible();
});
```

- [ ] **Step 3: Rodar a suíte E2E**

Run: `npm run test:e2e -- metrics-dashboard`
Expected: todos os testes do arquivo passam (requer banco local via `devops/docker-compose.yml` no ar, mesmo pré-requisito dos demais testes E2E do projeto).

- [ ] **Step 4: Commit**

```bash
git add tests/integration/metrics-dashboard.spec.ts
git commit -m "test(metricas)!: cobre os graficos de tendencia no e2e do dashboard"
```

---

### Task 12: Verificação final

**Files:** nenhum (só validação)

- [ ] **Step 1: Typecheck**

Run: `npm run typecheck`
Expected: sem erros.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: sem erros. Se o Biome reclamar de ordenação de imports, rodar `npm run lint:fix` e revisar o diff antes de seguir.

- [ ] **Step 3: Knip**

Run: `npm run knip`
Expected: sem itens não usados novos. Se `formatPeriodShortLabel`, algum `to-*-series`/`to-flow-composition-data` ou componente de gráfico aparecer como não usado, revisar a ligação feita na Task 10.

- [ ] **Step 4: Suíte unitária**

Run: `npm test`
Expected: todos os testes passam, incluindo os novos das Tasks 2, 3, 6, 7, 8 e 9.

- [ ] **Step 5: Suíte E2E completa**

Run: `npm run test:e2e`
Expected: todos os testes passam, incluindo os da Task 11.
