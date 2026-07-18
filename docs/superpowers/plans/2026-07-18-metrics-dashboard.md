# Dashboard de Métricas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o sub-projeto 4 de 4 do Development Metrics — a área visual `/metrics` com os 8 cards de métricas do time selecionado, filtro de período por semana/mês e gráfico de evolução por card, conforme [docs/superpowers/specs/2026-07-17-metrics-dashboard-design.md](../specs/2026-07-17-metrics-dashboard-design.md).

**Architecture:** Camada `presentation/metrics-dashboard` pura (Server Component de dados + Client Components de interação), sem novo caso de uso: `application/metrics` já expõe `getMetricsForPeriod`/`getMetricsSeries` (sub-projeto 3). `app/metrics/page.tsx` busca os dados via `composition/metrics.ts` e `composition/team.ts` e repassa como props para `MetricsDashboard`, seguindo exatamente o mesmo padrão de `app/board/page.tsx` → `KanbanBoard` (fetch no `app/`, componente de apresentação recebe dados prontos). Gráficos usam **Recharts** em Client Components; a granularidade semanal/mensal de cada card é resolvida no servidor de uma vez só (8 semanas + 6 meses buscados juntos) e o alternador do card apenas troca qual array já carregado é renderizado — sem fetch client-side.

**Tech Stack:** Next.js App Router, TypeScript estrito, Recharts (nova dependência), Tailwind CSS, Vitest, Playwright, Biome, Knip.

## Global Constraints

- Alias de import `@/*` aponta para `./src/*`.
- Regra de dependência (Clean Architecture): `presentation` consome `application` (casos de uso e tipos), nunca `infrastructure`. Ver [architecture.md](../../../techdocs/architecture.md).
- **Nenhum novo caso de uso de aplicação.** `getMetricsForPeriod` e `getMetricsSeries` (sub-projeto 3, já commitados) cobrem tudo que esta spec precisa. `application/metrics` não é tocado neste plano.
- **Adaptação de estrutura em relação à árvore sugerida pela spec:** a spec propõe `presentation/metrics-dashboard/metrics-page.tsx` como Server Component que já faz o fetch. Este plano segue o padrão já estabelecido pelo sub-projeto 2 (`app/board/page.tsx` faz o fetch e passa os dados prontos para `KanbanBoard`, um componente de apresentação puro) em vez de introduzir um padrão novo: o fetch fica em `app/metrics/page.tsx`, e `presentation/metrics-dashboard/metrics-dashboard.tsx` é o componente de apresentação puro (equivalente ao `KanbanBoard`). O restante da árvore da spec (`period-filter.tsx`, `metric-card.tsx`, `metric-trend-chart.tsx`) é mantido como proposto.
- **searchParams assíncrono:** `app/metrics/page.tsx` segue o mesmo padrão já usado em `app/teams/[teamId]/page.tsx` para `params` (`Promise<...>` resolvido com `await`), aplicado aqui a `searchParams`.
- **Entrada não confiável:** `period` e `date` da URL são tratados como entrada não confiável (`parseMetricsFilter`, Task 2) — valores ausentes ou inválidos caem no padrão (semana atual), nunca lançam exceção nem geram `Invalid Date`.
- **Séries dos cards ancoradas na data do filtro do topo:** a janela de 8 semanas / 6 meses de cada gráfico termina sempre na `referenceDate` atual da URL (não em "hoje"), para manter a página 100% derivada de `searchParams` sem nenhum fetch disparado pelo alternador semanal/mensal de um card — navegar o filtro do topo desloca também os gráficos.
- **Edge case "histórico insuficiente":** aplicado apenas às métricas de linha (duração e percentual) via `toTrendPoints` (Task 6), que descarta os períodos iniciais sem dado. Para o throughput (gráfico de barras), 0 é um valor legítimo indistinguível de "time ainda não existia" sem um conceito de "data de criação do time" — fora do escopo deste sub-projeto — então o gráfico de throughput sempre mostra a janela completa.
- **Cores das séries validadas nesta etapa** (conforme exigido pela spec, que deixa a validação para a implementação): série primária (média / valor único / barra) reaproveita `--accent` já existente em `src/app/globals.css` (`#2563eb` claro / `#3b82f6` escuro); série secundária (mediana) usa um novo `--chart-secondary` (`#008300` claro e escuro). Validado com `node scripts/validate_palette.js "#2563eb,#008300" --mode light --surface "#ffffff"` e `"#3b82f6,#008300" --mode dark --surface "#141b2d"` (script do skill `dataviz`) — todos os checks PASS (pior ΔE normal-vision 32.8, pior CVD 30.3).
- Testes unitários (Vitest) cobrem toda lógica pura e ramificada de `presentation/metrics-dashboard` (parsing de URL, aritmética de datas, formatação, mapeamento de série). Client Components que só compõem Recharts/roteamento (`period-filter.tsx`, `metric-trend-chart.tsx`) não têm teste unitário isolado — cobertos pelo E2E, seguindo a convenção já usada em `task-move-select.tsx`/`team-switcher.tsx` (sem `@testing-library/react`/jsdom instalados no projeto).
- Testes E2E (Playwright) seguem o padrão já usado em `kanban-board.spec.ts`/`task-types.spec.ts`: dirigidos 100% pela UI (criar time, criar/mover task pelo board), sem importar repositórios de `infrastructure` no arquivo de teste. Isso é uma adaptação da redação da spec ("dado um retorno mockado") para a convenção real do projeto — não há `@testing-library/react`/jsdom instalados, e introduzir essa dependência só para "mockar" o retorno do caso de uso contrariaria a regra de não adicionar dependência sem necessidade real.
- Arquivos em `kebab-case`; componentes React e tipos em `PascalCase`. Ver [guidelines.md](../../../techdocs/guidelines.md).
- Mensagens de commit seguem o formato validado pelo hook: `tipo(contexto)!: descrição` — português, minúsculo, verbo no presente, sem ponto final, sem corpo nem rodapé. Contexto usado neste plano: `metricas`.
- Banco local via `docker compose -f devops/docker-compose.yml up -d` (necessário para `npm test` de infraestrutura já existentes e para `npm run test:e2e`).

---

### Task 1: Dependência Recharts e cores das séries

**Files:**
- Modify: `package.json`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: nada (primeira task do sub-projeto).
- Produces: pacote `recharts` instalado; variáveis CSS `--chart-secondary` (claro/escuro) — usadas pela Task 8 (`metric-trend-chart.tsx`) junto com `--accent` já existente.

- [ ] **Step 1: Adicionar a dependência**

Em `package.json`, dentro de `"dependencies"` (ordem alfabética, entre `"react"` e `"react-dom"` não se aplica — inserir após `"postgres"` e antes de `"react"` para manter ordem alfabética):

```json
"dependencies": {
	"drizzle-orm": "^0.45.2",
	"lucide-react": "^1.25.0",
	"next": "16.2.10",
	"postgres": "^3.4.9",
	"react": "19.2.4",
	"react-dom": "19.2.4",
	"recharts": "^3.9.2"
}
```

Run: `npm install`
Expected: `package-lock.json` atualizado, sem erros de peer dependency (Recharts 3.x suporta React 19).

- [ ] **Step 2: Adicionar a cor da série secundária**

Em `src/app/globals.css`, adicionar `--chart-secondary` em ambos os blocos:

```css
:root {
	--background: #f5f7fb;
	--surface: #ffffff;
	--foreground: #1e293b;
	--header-bg: #0f1b33;
	--header-fg: #ffffff;
	--accent: #2563eb;
	--accent-fg: #ffffff;
	--border: #dbe2ee;
	--chart-secondary: #008300;
}

@media (prefers-color-scheme: dark) {
	:root {
		--background: #0b1220;
		--surface: #141b2d;
		--foreground: #e2e8f0;
		--header-bg: #0f1b33;
		--header-fg: #ffffff;
		--accent: #3b82f6;
		--accent-fg: #ffffff;
		--border: #1e293b;
		--chart-secondary: #008300;
	}
}
```

- [ ] **Step 3: Verificar tipos e lint**

Run: `npm run typecheck && npm run lint`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/app/globals.css
git commit -m "chore(metricas)!: adiciona recharts e cor da serie secundaria do dashboard"
```

---

### Task 2: Parser do filtro de período na URL

**Files:**
- Create: `src/presentation/metrics-dashboard/parse-metrics-search-params.ts`
- Create: `src/presentation/metrics-dashboard/parse-metrics-search-params.test.ts`

**Interfaces:**
- Consumes: `PeriodType` (`@/application/metrics/period`, já existente).
- Produces: `MetricsSearchParams = { period?: string; date?: string }`, `MetricsFilter = { periodType: PeriodType; referenceDate: Date }`, `parseMetricsFilter(searchParams, now?): MetricsFilter` — usado pela Task 10 (`app/metrics/page.tsx`).

- [ ] **Step 1: Escrever os testes que falham**

`src/presentation/metrics-dashboard/parse-metrics-search-params.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseMetricsFilter } from "./parse-metrics-search-params";

describe("parseMetricsFilter", () => {
	it("usa semana e a data atual quando não há parâmetros", () => {
		const now = new Date("2026-07-15T12:00:00Z");
		expect(parseMetricsFilter({}, now)).toEqual({
			periodType: "WEEK",
			referenceDate: now,
		});
	});

	it("interpreta period=month", () => {
		const now = new Date("2026-07-15T12:00:00Z");
		expect(parseMetricsFilter({ period: "month" }, now).periodType).toBe(
			"MONTH",
		);
	});

	it("interpreta a data informada na URL", () => {
		const result = parseMetricsFilter({ date: "2026-06-01" });
		expect(result.referenceDate).toEqual(new Date("2026-06-01T00:00:00Z"));
	});

	it("ignora data em formato inválido e usa a data atual", () => {
		const now = new Date("2026-07-15T12:00:00Z");
		expect(
			parseMetricsFilter({ date: "not-a-date" }, now).referenceDate,
		).toEqual(now);
	});

	it("ignora period desconhecido e usa semana", () => {
		expect(parseMetricsFilter({ period: "year" }).periodType).toBe("WEEK");
	});
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npm test`
Expected: FAIL — módulo `./parse-metrics-search-params` não encontrado.

- [ ] **Step 3: Implementar o parser**

`src/presentation/metrics-dashboard/parse-metrics-search-params.ts`:

```ts
import type { PeriodType } from "@/application/metrics/period";

export type MetricsSearchParams = { period?: string; date?: string };

export type MetricsFilter = { periodType: PeriodType; referenceDate: Date };

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function parseMetricsFilter(
	searchParams: MetricsSearchParams,
	now: Date = new Date(),
): MetricsFilter {
	const periodType: PeriodType =
		searchParams.period === "month" ? "MONTH" : "WEEK";
	return {
		periodType,
		referenceDate: parseReferenceDate(searchParams.date) ?? now,
	};
}

function parseReferenceDate(date: string | undefined): Date | null {
	if (!date || !DATE_ONLY_PATTERN.test(date)) {
		return null;
	}
	const parsed = new Date(`${date}T00:00:00Z`);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npm test`
Expected: PASS — 5 testes novos.

- [ ] **Step 5: Commit**

```bash
git add src/presentation/metrics-dashboard/parse-metrics-search-params.ts src/presentation/metrics-dashboard/parse-metrics-search-params.test.ts
git commit -m "feat(metricas)!: adiciona parser do filtro de periodo na url do dashboard"
```

---

### Task 3: Deslocamento de período (setas ‹ ›)

**Files:**
- Create: `src/presentation/metrics-dashboard/shift-reference-date.ts`
- Create: `src/presentation/metrics-dashboard/shift-reference-date.test.ts`

**Interfaces:**
- Consumes: `PeriodType` (`@/application/metrics/period`).
- Produces: `shiftReferenceDate(periodType, referenceDate, direction): Date` (`direction: -1 | 1`) — usado pela Task 7 (`period-filter.tsx`).

- [ ] **Step 1: Escrever os testes que falham**

`src/presentation/metrics-dashboard/shift-reference-date.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { shiftReferenceDate } from "./shift-reference-date";

describe("shiftReferenceDate", () => {
	it("avança uma semana", () => {
		expect(
			shiftReferenceDate("WEEK", new Date("2026-07-15T12:00:00Z"), 1),
		).toEqual(new Date("2026-07-22T12:00:00Z"));
	});

	it("retrocede uma semana", () => {
		expect(
			shiftReferenceDate("WEEK", new Date("2026-07-15T12:00:00Z"), -1),
		).toEqual(new Date("2026-07-08T12:00:00Z"));
	});

	it("avança um mês de calendário", () => {
		expect(
			shiftReferenceDate("MONTH", new Date("2026-07-15T12:00:00Z"), 1),
		).toEqual(new Date("2026-08-15T12:00:00Z"));
	});

	it("retrocede um mês de calendário virando o ano", () => {
		expect(
			shiftReferenceDate("MONTH", new Date("2026-01-15T12:00:00Z"), -1),
		).toEqual(new Date("2025-12-15T12:00:00Z"));
	});
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npm test`
Expected: FAIL — módulo `./shift-reference-date` não encontrado.

- [ ] **Step 3: Implementar o deslocamento**

`src/presentation/metrics-dashboard/shift-reference-date.ts`:

```ts
import type { PeriodType } from "@/application/metrics/period";

export function shiftReferenceDate(
	periodType: PeriodType,
	referenceDate: Date,
	direction: -1 | 1,
): Date {
	const shifted = new Date(referenceDate);
	if (periodType === "WEEK") {
		shifted.setUTCDate(shifted.getUTCDate() + 7 * direction);
		return shifted;
	}
	shifted.setUTCMonth(shifted.getUTCMonth() + direction);
	return shifted;
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npm test`
Expected: PASS — 4 testes novos.

- [ ] **Step 5: Commit**

```bash
git add src/presentation/metrics-dashboard/shift-reference-date.ts src/presentation/metrics-dashboard/shift-reference-date.test.ts
git commit -m "feat(metricas)!: adiciona deslocamento de periodo do filtro do dashboard"
```

---

### Task 4: Formatação de duração e percentual

**Files:**
- Create: `src/presentation/metrics-dashboard/format-metric-value.ts`
- Create: `src/presentation/metrics-dashboard/format-metric-value.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `formatDuration(ms: number): string`, `formatPercent(value: number): string` — usados pelas Tasks 8 e 9 (`metric-trend-chart.tsx`, `metric-card.tsx`).

- [ ] **Step 1: Escrever os testes que falham**

`src/presentation/metrics-dashboard/format-metric-value.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatDuration, formatPercent } from "./format-metric-value";

describe("formatDuration", () => {
	it("formata minutos quando menor que uma hora", () => {
		expect(formatDuration(30 * 60 * 1000)).toBe("30min");
	});

	it("formata horas quando menor que um dia", () => {
		expect(formatDuration(5 * 60 * 60 * 1000)).toBe("5h");
	});

	it("formata dias e horas quando maior ou igual a um dia", () => {
		expect(formatDuration(2 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000)).toBe(
			"2d 3h",
		);
	});

	it("omite horas quando são exatamente zero", () => {
		expect(formatDuration(3 * 24 * 60 * 60 * 1000)).toBe("3d");
	});
});

describe("formatPercent", () => {
	it("arredonda e adiciona o símbolo de porcentagem", () => {
		expect(formatPercent(33.333)).toBe("33%");
	});
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npm test`
Expected: FAIL — módulo `./format-metric-value` não encontrado.

- [ ] **Step 3: Implementar a formatação**

`src/presentation/metrics-dashboard/format-metric-value.ts`:

```ts
export function formatDuration(ms: number): string {
	const totalMinutes = Math.round(ms / 60_000);
	if (totalMinutes < 60) {
		return `${totalMinutes}min`;
	}
	const totalHours = Math.round(ms / 3_600_000);
	if (totalHours < 24) {
		return `${totalHours}h`;
	}
	const days = Math.floor(ms / 86_400_000);
	const hours = Math.round((ms % 86_400_000) / 3_600_000);
	return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
}

export function formatPercent(value: number): string {
	return `${Math.round(value)}%`;
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npm test`
Expected: PASS — 5 testes novos.

- [ ] **Step 5: Commit**

```bash
git add src/presentation/metrics-dashboard/format-metric-value.ts src/presentation/metrics-dashboard/format-metric-value.test.ts
git commit -m "feat(metricas)!: adiciona formatacao de duracao e percentual do dashboard"
```

---

### Task 5: Definições estáticas dos 8 cards

**Files:**
- Create: `src/presentation/metrics-dashboard/metric-definitions.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `MetricKey` (união das 8 chaves), `MetricShape = "duration-dual" | "percent-single" | "count-bar" | "number-only"`, `MetricDefinition = { key: MetricKey; label: string; shape: MetricShape }`, `METRIC_DEFINITIONS: MetricDefinition[]` (ordem fixa da spec) — usado pelas Tasks 6, 8 e 9.

- [ ] **Step 1: Criar o arquivo**

`src/presentation/metrics-dashboard/metric-definitions.ts`:

```ts
export type MetricKey =
	| "leadTime"
	| "cycleTime"
	| "blockedTime"
	| "codeReviewTime"
	| "reworkRate"
	| "throughput"
	| "wip"
	| "predictability";

export type MetricShape =
	| "duration-dual"
	| "percent-single"
	| "count-bar"
	| "number-only";

export type MetricDefinition = {
	key: MetricKey;
	label: string;
	shape: MetricShape;
};

export const METRIC_DEFINITIONS: MetricDefinition[] = [
	{ key: "leadTime", label: "Lead time", shape: "duration-dual" },
	{ key: "cycleTime", label: "Cycle time", shape: "duration-dual" },
	{ key: "blockedTime", label: "Tempo bloqueado", shape: "duration-dual" },
	{
		key: "codeReviewTime",
		label: "Tempo aguardando code review",
		shape: "duration-dual",
	},
	{ key: "reworkRate", label: "Taxa de retrabalho", shape: "percent-single" },
	{ key: "throughput", label: "Throughput", shape: "count-bar" },
	{ key: "wip", label: "WIP", shape: "number-only" },
	{
		key: "predictability",
		label: "Previsibilidade",
		shape: "percent-single",
	},
];
```

Sem teste: dado estático sem ramificação (regra "trivial one-liner não exige teste"); a ordem e os rótulos são exercitados pelo E2E da Task 11.

- [ ] **Step 2: Verificar tipos**

Run: `npm run typecheck`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/presentation/metrics-dashboard/metric-definitions.ts
git commit -m "feat(metricas)!: adiciona definicoes estaticas dos cards do dashboard"
```

---

### Task 6: Mapeamento de série para pontos do gráfico

**Files:**
- Create: `src/presentation/metrics-dashboard/to-trend-points.ts`
- Create: `src/presentation/metrics-dashboard/to-trend-points.test.ts`

**Interfaces:**
- Consumes: `MetricsSeriesEntry` (`@/application/metrics/use-cases/get-metrics-series`), `DurationStats` (`@/application/metrics/formulas/duration-metrics`), `MetricKey`, `MetricShape` (Task 5).
- Produces: `TrendPoint = { periodStart: Date; primary: number | null; secondary: number | null }`, `toTrendPoints(entries, key, shape): TrendPoint[]` — usado pela Task 9 (`metric-card.tsx`).

- [ ] **Step 1: Escrever os testes que falham**

`src/presentation/metrics-dashboard/to-trend-points.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { PeriodMetrics } from "@/application/metrics/use-cases/get-metrics-for-period";
import type { MetricsSeriesEntry } from "@/application/metrics/use-cases/get-metrics-series";
import { toTrendPoints } from "./to-trend-points";

function entry(
	overrides: Partial<PeriodMetrics> = {},
	periodStart = new Date("2026-07-01T00:00:00Z"),
): MetricsSeriesEntry {
	const periodEnd = new Date(periodStart.getTime() + 86_400_000);
	return {
		periodStart,
		periodEnd,
		metrics: {
			periodStart,
			periodEnd,
			leadTime: null,
			cycleTime: null,
			blockedTime: null,
			codeReviewTime: null,
			reworkRate: null,
			throughput: 0,
			wip: 0,
			predictability: null,
			...overrides,
		},
	};
}

describe("toTrendPoints", () => {
	it("mapeia average/median para duration-dual", () => {
		const entries = [entry({ leadTime: { averageMs: 1000, medianMs: 900 } })];
		expect(toTrendPoints(entries, "leadTime", "duration-dual")).toEqual([
			{ periodStart: entries[0].periodStart, primary: 1000, secondary: 900 },
		]);
	});

	it("mapeia valor único para percent-single", () => {
		const entries = [entry({ reworkRate: 25 })];
		expect(toTrendPoints(entries, "reworkRate", "percent-single")).toEqual([
			{ periodStart: entries[0].periodStart, primary: 25, secondary: null },
		]);
	});

	it("mapeia contagem para count-bar sem remover períodos vazios", () => {
		const entries = [entry({ throughput: 0 }), entry({ throughput: 3 })];
		expect(toTrendPoints(entries, "throughput", "count-bar")).toHaveLength(2);
	});

	it("remove períodos iniciais sem dado para métricas de linha", () => {
		const entries = [
			entry({ leadTime: null }, new Date("2026-06-01T00:00:00Z")),
			entry({ leadTime: null }, new Date("2026-06-08T00:00:00Z")),
			entry(
				{ leadTime: { averageMs: 500, medianMs: 500 } },
				new Date("2026-06-15T00:00:00Z"),
			),
		];
		const result = toTrendPoints(entries, "leadTime", "duration-dual");
		expect(result).toHaveLength(1);
		expect(result[0].periodStart).toEqual(new Date("2026-06-15T00:00:00Z"));
	});

	it("retorna lista vazia quando nenhum período tem dado", () => {
		const entries = [entry({ leadTime: null })];
		expect(toTrendPoints(entries, "leadTime", "duration-dual")).toEqual([]);
	});
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npm test`
Expected: FAIL — módulo `./to-trend-points` não encontrado.

- [ ] **Step 3: Implementar o mapeamento**

`src/presentation/metrics-dashboard/to-trend-points.ts`:

```ts
import type { DurationStats } from "@/application/metrics/formulas/duration-metrics";
import type { MetricsSeriesEntry } from "@/application/metrics/use-cases/get-metrics-series";
import type { MetricKey, MetricShape } from "./metric-definitions";

export type TrendPoint = {
	periodStart: Date;
	primary: number | null;
	secondary: number | null;
};

export function toTrendPoints(
	entries: MetricsSeriesEntry[],
	key: MetricKey,
	shape: MetricShape,
): TrendPoint[] {
	const points = entries.map((entry): TrendPoint => {
		const value = entry.metrics[key];
		if (shape === "duration-dual") {
			const stats = value as DurationStats | null;
			return {
				periodStart: entry.periodStart,
				primary: stats?.averageMs ?? null,
				secondary: stats?.medianMs ?? null,
			};
		}
		if (shape === "percent-single") {
			return {
				periodStart: entry.periodStart,
				primary: value as number | null,
				secondary: null,
			};
		}
		return {
			periodStart: entry.periodStart,
			primary: value as number,
			secondary: null,
		};
	});

	if (shape === "count-bar" || shape === "number-only") {
		return points;
	}
	const firstWithData = points.findIndex((point) => point.primary !== null);
	return firstWithData === -1 ? [] : points.slice(firstWithData);
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npm test`
Expected: PASS — 5 testes novos.

- [ ] **Step 5: Commit**

```bash
git add src/presentation/metrics-dashboard/to-trend-points.ts src/presentation/metrics-dashboard/to-trend-points.test.ts
git commit -m "feat(metricas)!: adiciona mapeamento de serie para pontos do grafico"
```

---

### Task 7: Filtro de período (topo da página)

**Files:**
- Create: `src/presentation/metrics-dashboard/period-filter.tsx`

**Interfaces:**
- Consumes: `PeriodType` (`@/application/metrics/period`), `shiftReferenceDate` (Task 3).
- Produces: `PeriodFilter({ periodType, referenceDate })` (Client Component) — usado pela Task 10 (`metrics-dashboard.tsx`).

- [ ] **Step 1: Implementar o componente**

`src/presentation/metrics-dashboard/period-filter.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import type { PeriodType } from "@/application/metrics/period";
import { shiftReferenceDate } from "./shift-reference-date";

type PeriodFilterProps = {
	periodType: PeriodType;
	referenceDate: Date;
};

function toDateParam(date: Date): string {
	return date.toISOString().slice(0, 10);
}

function buildMetricsUrl(periodType: PeriodType, referenceDate: Date): string {
	const params = new URLSearchParams({
		period: periodType === "MONTH" ? "month" : "week",
		date: toDateParam(referenceDate),
	});
	return `/metrics?${params.toString()}`;
}

export function PeriodFilter({ periodType, referenceDate }: PeriodFilterProps) {
	const router = useRouter();

	function goTo(nextPeriodType: PeriodType, nextReferenceDate: Date) {
		router.push(buildMetricsUrl(nextPeriodType, nextReferenceDate));
	}

	return (
		<div className="flex items-center gap-2">
			<div className="flex rounded-lg border border-(--border)">
				<button
					type="button"
					onClick={() => goTo("WEEK", referenceDate)}
					aria-pressed={periodType === "WEEK"}
					className={`px-3 py-1 text-sm ${
						periodType === "WEEK" ? "bg-(--accent) text-(--accent-fg)" : ""
					}`}
				>
					Semana
				</button>
				<button
					type="button"
					onClick={() => goTo("MONTH", referenceDate)}
					aria-pressed={periodType === "MONTH"}
					className={`px-3 py-1 text-sm ${
						periodType === "MONTH" ? "bg-(--accent) text-(--accent-fg)" : ""
					}`}
				>
					Mês
				</button>
			</div>
			<button
				type="button"
				aria-label="Período anterior"
				onClick={() =>
					goTo(periodType, shiftReferenceDate(periodType, referenceDate, -1))
				}
				className="rounded-lg border border-(--border) px-2 py-1"
			>
				‹
			</button>
			<button
				type="button"
				aria-label="Próximo período"
				onClick={() =>
					goTo(periodType, shiftReferenceDate(periodType, referenceDate, 1))
				}
				className="rounded-lg border border-(--border) px-2 py-1"
			>
				›
			</button>
		</div>
	);
}
```

- [ ] **Step 2: Verificar tipos e lint**

Run: `npm run typecheck && npm run lint`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/presentation/metrics-dashboard/period-filter.tsx
git commit -m "feat(metricas)!: adiciona filtro de periodo do dashboard de metricas"
```

---

### Task 8: Gráfico de evolução por card

**Files:**
- Create: `src/presentation/metrics-dashboard/metric-trend-chart.tsx`

**Interfaces:**
- Consumes: `PeriodType` (`@/application/metrics/period`), `TrendPoint` (Task 6).
- Produces: `MetricTrendChart({ variant, weeklyPoints, monthlyPoints, formatValue })` (Client Component), `variant: "dual-line" | "single-line" | "bar"` — usado pela Task 9 (`metric-card.tsx`).

- [ ] **Step 1: Implementar o componente**

`src/presentation/metrics-dashboard/metric-trend-chart.tsx`:

```tsx
"use client";

import { useState } from "react";
import {
	Bar,
	BarChart,
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
import type { TrendPoint } from "./to-trend-points";

type MetricTrendChartProps = {
	variant: "dual-line" | "single-line" | "bar";
	weeklyPoints: TrendPoint[];
	monthlyPoints: TrendPoint[];
	formatValue: (value: number) => string;
};

function formatAxisLabel(date: Date, granularity: PeriodType): string {
	return granularity === "WEEK"
		? date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
		: date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}

export function MetricTrendChart({
	variant,
	weeklyPoints,
	monthlyPoints,
	formatValue,
}: MetricTrendChartProps) {
	const [granularity, setGranularity] = useState<PeriodType>("WEEK");
	const points = granularity === "WEEK" ? weeklyPoints : monthlyPoints;
	const data = points.map((point) => ({
		label: formatAxisLabel(point.periodStart, granularity),
		primary: point.primary,
		secondary: point.secondary,
	}));

	return (
		<div className="flex flex-col gap-2">
			<div className="flex justify-end gap-1 text-xs">
				<button
					type="button"
					onClick={() => setGranularity("WEEK")}
					aria-pressed={granularity === "WEEK"}
					className={`rounded px-2 py-0.5 ${
						granularity === "WEEK"
							? "bg-(--accent) text-(--accent-fg)"
							: "opacity-60"
					}`}
				>
					Semanal
				</button>
				<button
					type="button"
					onClick={() => setGranularity("MONTH")}
					aria-pressed={granularity === "MONTH"}
					className={`rounded px-2 py-0.5 ${
						granularity === "MONTH"
							? "bg-(--accent) text-(--accent-fg)"
							: "opacity-60"
					}`}
				>
					Mensal
				</button>
			</div>
			<ResponsiveContainer width="100%" height={140}>
				{variant === "bar" ? (
					<BarChart data={data}>
						<CartesianGrid stroke="var(--border)" vertical={false} />
						<XAxis dataKey="label" tick={{ fontSize: 11 }} />
						<YAxis width={32} tick={{ fontSize: 11 }} />
						<Tooltip formatter={(value: number) => formatValue(value)} />
						<Bar
							dataKey="primary"
							name="Throughput"
							fill="var(--accent)"
							radius={[4, 4, 0, 0]}
						/>
					</BarChart>
				) : (
					<LineChart data={data}>
						<CartesianGrid stroke="var(--border)" vertical={false} />
						<XAxis dataKey="label" tick={{ fontSize: 11 }} />
						<YAxis width={32} tick={{ fontSize: 11 }} />
						<Tooltip formatter={(value: number) => formatValue(value)} />
						{variant === "dual-line" ? <Legend /> : null}
						<Line
							type="monotone"
							dataKey="primary"
							name={variant === "dual-line" ? "Média" : "Valor"}
							stroke="var(--accent)"
							strokeWidth={2}
							dot={{ r: 4 }}
							connectNulls
						/>
						{variant === "dual-line" ? (
							<Line
								type="monotone"
								dataKey="secondary"
								name="Mediana"
								stroke="var(--chart-secondary)"
								strokeWidth={2}
								dot={{ r: 4 }}
								connectNulls
							/>
						) : null}
					</LineChart>
				)}
			</ResponsiveContainer>
		</div>
	);
}
```

- [ ] **Step 2: Verificar tipos e lint**

Run: `npm run typecheck && npm run lint`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/presentation/metrics-dashboard/metric-trend-chart.tsx
git commit -m "feat(metricas)!: adiciona grafico de evolucao dos cards de metricas"
```

---

### Task 9: Card de métrica

**Files:**
- Create: `src/presentation/metrics-dashboard/metric-card.tsx`

**Interfaces:**
- Consumes: `PeriodMetrics` (`@/application/metrics/use-cases/get-metrics-for-period`), `MetricsSeriesEntry` (`@/application/metrics/use-cases/get-metrics-series`), `DurationStats` (`@/application/metrics/formulas/duration-metrics`), `MetricDefinition` (Task 5), `toTrendPoints` (Task 6), `MetricTrendChart` (Task 8), `formatDuration`/`formatPercent` (Task 4).
- Produces: `MetricCard({ definition, current, weeklySeries, monthlySeries })` — usado pela Task 10 (`metrics-dashboard.tsx`). Renderiza com `data-testid="metric-card-{key}"` — usado pelo E2E da Task 11.

- [ ] **Step 1: Implementar o componente**

`src/presentation/metrics-dashboard/metric-card.tsx`:

```tsx
import type { DurationStats } from "@/application/metrics/formulas/duration-metrics";
import type { PeriodMetrics } from "@/application/metrics/use-cases/get-metrics-for-period";
import type { MetricsSeriesEntry } from "@/application/metrics/use-cases/get-metrics-series";
import { formatDuration, formatPercent } from "./format-metric-value";
import type { MetricDefinition } from "./metric-definitions";
import { MetricTrendChart } from "./metric-trend-chart";
import { toTrendPoints } from "./to-trend-points";

type MetricCardProps = {
	definition: MetricDefinition;
	current: PeriodMetrics;
	weeklySeries: MetricsSeriesEntry[];
	monthlySeries: MetricsSeriesEntry[];
};

export function MetricCard({
	definition,
	current,
	weeklySeries,
	monthlySeries,
}: MetricCardProps) {
	return (
		<div
			data-testid={`metric-card-${definition.key}`}
			className="flex flex-col gap-3 rounded-xl border border-(--border) bg-(--surface) p-4"
		>
			<h2 className="text-sm font-semibold opacity-70">{definition.label}</h2>
			<CurrentValue definition={definition} value={current[definition.key]} />
			{definition.shape === "number-only" ? null : (
				<MetricTrendChart
					variant={shapeToVariant(definition.shape)}
					weeklyPoints={toTrendPoints(
						weeklySeries,
						definition.key,
						definition.shape,
					)}
					monthlyPoints={toTrendPoints(
						monthlySeries,
						definition.key,
						definition.shape,
					)}
					formatValue={shapeToFormatter(definition.shape)}
				/>
			)}
		</div>
	);
}

function shapeToVariant(
	shape: MetricDefinition["shape"],
): "dual-line" | "single-line" | "bar" {
	if (shape === "duration-dual") {
		return "dual-line";
	}
	if (shape === "percent-single") {
		return "single-line";
	}
	return "bar";
}

function shapeToFormatter(
	shape: MetricDefinition["shape"],
): (value: number) => string {
	if (shape === "duration-dual") {
		return formatDuration;
	}
	if (shape === "percent-single") {
		return formatPercent;
	}
	return (value: number) => String(value);
}

function CurrentValue({
	definition,
	value,
}: {
	definition: MetricDefinition;
	value: PeriodMetrics[keyof PeriodMetrics];
}) {
	if (definition.shape === "duration-dual") {
		const stats = value as DurationStats | null;
		if (!stats) {
			return <p className="text-sm opacity-60">sem dados</p>;
		}
		return (
			<p className="flex gap-4 text-lg font-semibold">
				<span>Média: {formatDuration(stats.averageMs)}</span>
				<span>Mediana: {formatDuration(stats.medianMs)}</span>
			</p>
		);
	}
	if (definition.shape === "percent-single") {
		const percent = value as number | null;
		if (percent === null) {
			return <p className="text-sm opacity-60">sem dados</p>;
		}
		return <p className="text-lg font-semibold">{formatPercent(percent)}</p>;
	}
	return <p className="text-lg font-semibold">{value as number}</p>;
}
```

- [ ] **Step 2: Verificar tipos e lint**

Run: `npm run typecheck && npm run lint`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/presentation/metrics-dashboard/metric-card.tsx
git commit -m "feat(metricas)!: adiciona card de metrica do dashboard"
```

---

### Task 10: Dashboard, página `/metrics` e navegação no header

**Files:**
- Create: `src/presentation/metrics-dashboard/metrics-dashboard.tsx`
- Create: `src/app/metrics/page.tsx`
- Modify: `src/app/layout.tsx`
- Delete: `knip.json`

**Interfaces:**
- Consumes: `METRIC_DEFINITIONS` (Task 5), `MetricCard` (Task 9), `PeriodFilter` (Task 7), `parseMetricsFilter` (Task 2), `createMetricsUseCases` (`@/composition/metrics`, já existente), `createTeamUseCases` (`@/composition/team`, já existente).
- Produces: `MetricsDashboard({ periodType, referenceDate, current, weeklySeries, monthlySeries })`, rota `/metrics`, links "Quadro"/"Métricas" no header.

- [ ] **Step 1: Implementar o componente de apresentação**

`src/presentation/metrics-dashboard/metrics-dashboard.tsx`:

```tsx
import type { PeriodType } from "@/application/metrics/period";
import type { PeriodMetrics } from "@/application/metrics/use-cases/get-metrics-for-period";
import type { MetricsSeriesEntry } from "@/application/metrics/use-cases/get-metrics-series";
import { MetricCard } from "./metric-card";
import { METRIC_DEFINITIONS } from "./metric-definitions";
import { PeriodFilter } from "./period-filter";

type MetricsDashboardProps = {
	periodType: PeriodType;
	referenceDate: Date;
	current: PeriodMetrics;
	weeklySeries: MetricsSeriesEntry[];
	monthlySeries: MetricsSeriesEntry[];
};

export function MetricsDashboard({
	periodType,
	referenceDate,
	current,
	weeklySeries,
	monthlySeries,
}: MetricsDashboardProps) {
	return (
		<div className="flex flex-1 flex-col gap-6 p-6">
			<div className="flex items-center justify-between">
				<h1 className="text-xl font-semibold">Métricas</h1>
				<PeriodFilter periodType={periodType} referenceDate={referenceDate} />
			</div>
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
				{METRIC_DEFINITIONS.map((definition) => (
					<MetricCard
						key={definition.key}
						definition={definition}
						current={current}
						weeklySeries={weeklySeries}
						monthlySeries={monthlySeries}
					/>
				))}
			</div>
		</div>
	);
}
```

- [ ] **Step 2: Implementar a página**

`src/app/metrics/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { createMetricsUseCases } from "@/composition/metrics";
import { createTeamUseCases } from "@/composition/team";
import { MetricsDashboard } from "@/presentation/metrics-dashboard/metrics-dashboard";
import { parseMetricsFilter } from "@/presentation/metrics-dashboard/parse-metrics-search-params";

const WEEKLY_SERIES_LENGTH = 8;
const MONTHLY_SERIES_LENGTH = 6;

export default async function MetricsPage({
	searchParams,
}: {
	searchParams: Promise<{ period?: string; date?: string }>;
}) {
	const teamUseCases = createTeamUseCases();
	const currentTeam = await teamUseCases.getCurrentTeam();
	if (!currentTeam) {
		redirect("/teams");
	}

	const resolvedSearchParams = await searchParams;
	const { periodType, referenceDate } = parseMetricsFilter(
		resolvedSearchParams,
	);

	const metricsUseCases = createMetricsUseCases();
	const [current, weeklySeries, monthlySeries] = await Promise.all([
		metricsUseCases.getMetricsForPeriod(
			currentTeam.id,
			periodType,
			referenceDate,
		),
		metricsUseCases.getMetricsSeries(
			currentTeam.id,
			"WEEK",
			referenceDate,
			WEEKLY_SERIES_LENGTH,
		),
		metricsUseCases.getMetricsSeries(
			currentTeam.id,
			"MONTH",
			referenceDate,
			MONTHLY_SERIES_LENGTH,
		),
	]);

	return (
		<MetricsDashboard
			periodType={periodType}
			referenceDate={referenceDate}
			current={current}
			weeklySeries={weeklySeries}
			monthlySeries={monthlySeries}
		/>
	);
}
```

- [ ] **Step 3: Adicionar a navegação no header**

Em `src/app/layout.tsx`, substituir o bloco do header para incluir os links "Quadro" e "Métricas" antes de "Tipos de task":

```tsx
{currentTeam ? (
	<div className="flex items-center gap-4">
		<nav className="flex items-center gap-4">
			<Link
				href="/board"
				className="text-sm text-(--header-fg) hover:underline"
			>
				Quadro
			</Link>
			<Link
				href="/metrics"
				className="text-sm text-(--header-fg) hover:underline"
			>
				Métricas
			</Link>
		</nav>
		<Link
			href="/task-types"
			className="text-sm text-(--header-fg) hover:underline"
		>
			Tipos de task
		</Link>
		<TeamSwitcher currentTeam={currentTeam} teams={teams} />
	</div>
) : null}
```

- [ ] **Step 4: Remover a entrada manual do Knip**

`app/metrics/page.tsx` agora importa `composition/metrics.ts` organicamente como ponto de entrada padrão do App Router, então a entrada manual adicionada no sub-projeto 3 (só necessária enquanto nada em `app/` importava o composition root) deixa de ser necessária:

```bash
git rm knip.json
```

- [ ] **Step 5: Rodar toda a verificação do projeto**

Run: `npm run typecheck && npm run lint && npm test && npm run knip`
Expected: todos passam sem erros; `knip` não acusa `src/composition/metrics.ts` nem nada em `presentation/metrics-dashboard` como não utilizado.

- [ ] **Step 6: Commit**

```bash
git add src/presentation/metrics-dashboard/metrics-dashboard.tsx src/app/metrics/page.tsx src/app/layout.tsx knip.json
git commit -m "feat(metricas)!: adiciona pagina do dashboard de metricas e navegacao no header"
```

---

### Task 11: Testes E2E do dashboard e verificação final

**Files:**
- Create: `tests/integration/metrics-dashboard.spec.ts`

**Interfaces:**
- Consumes: `resetDatabase` (`./reset-db`, já existente), rota `/metrics`, `data-testid="metric-card-{key}"` (Task 9).
- Produces: nada consumido por outras tasks (última task do sub-projeto).

- [ ] **Step 1: Escrever os testes E2E**

`tests/integration/metrics-dashboard.spec.ts`:

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

test("mostra os 8 cards de métricas sem dados quando o time não tem tasks", async ({
	page,
}) => {
	await page.getByRole("link", { name: "Métricas" }).click();
	await expect(page).toHaveURL("/metrics");

	await expect(
		page.getByRole("heading", { name: "Lead time" }),
	).toBeVisible();
	await expect(
		page.getByRole("heading", { name: "Cycle time" }),
	).toBeVisible();
	await expect(
		page.getByRole("heading", { name: "Tempo bloqueado" }),
	).toBeVisible();
	await expect(
		page.getByRole("heading", { name: "Tempo aguardando code review" }),
	).toBeVisible();
	await expect(
		page.getByRole("heading", { name: "Taxa de retrabalho" }),
	).toBeVisible();
	await expect(
		page.getByRole("heading", { name: "Throughput" }),
	).toBeVisible();
	await expect(page.getByRole("heading", { name: "WIP" })).toBeVisible();
	await expect(
		page.getByRole("heading", { name: "Previsibilidade" }),
	).toBeVisible();

	const leadTimeCard = page.getByTestId("metric-card-leadTime");
	await expect(leadTimeCard.getByText("sem dados")).toBeVisible();

	const wipCard = page.getByTestId("metric-card-wip");
	await expect(wipCard.getByText("0")).toBeVisible();
});

test("WIP reflete tasks em desenvolvimento ou code review", async ({
	page,
}) => {
	await page.getByRole("button", { name: "Nova task" }).click();
	await page.getByLabel("Id externo").fill("TASK-1");
	await page.getByLabel("Descrição").fill("Corrigir bug de login");
	await page
		.getByLabel("Coluna inicial")
		.selectOption({ label: "Em Desenvolvimento" });
	await page.getByRole("button", { name: "Salvar" }).click();

	await page.getByRole("link", { name: "Métricas" }).click();

	const wipCard = page.getByTestId("metric-card-wip");
	await expect(wipCard.getByText("1")).toBeVisible();
});

test("o filtro de período atualiza a URL ao trocar semana/mês e navegar", async ({
	page,
}) => {
	await page.getByRole("link", { name: "Métricas" }).click();
	await expect(page).toHaveURL("/metrics");

	await page.getByRole("button", { name: "Mês" }).click();
	await expect(page).toHaveURL(/period=month/);
	const urlAfterMonth = new URL(page.url());

	await page.getByRole("button", { name: "Período anterior" }).click();
	await expect(page).toHaveURL(/period=month/);
	const urlAfterPrev = new URL(page.url());
	expect(urlAfterPrev.searchParams.get("date")).not.toBe(
		urlAfterMonth.searchParams.get("date"),
	);
});
```

- [ ] **Step 2: Subir o banco local (se necessário)**

Run: `docker compose -f devops/docker-compose.yml up -d`
Expected: container Postgres saudável.

- [ ] **Step 3: Rodar os testes E2E e confirmar que passam**

Run: `npm run test:e2e`
Expected: PASS — 3 testes novos (mais os já existentes, sem regressão).

- [ ] **Step 4: Rodar toda a verificação final do projeto**

Run: `npm run typecheck && npm run lint && npm test && npm run test:e2e && npm run knip`
Expected: todos passam sem erros — sub-projeto 4 (e o produto Development Metrics completo) verificado de ponta a ponta.

- [ ] **Step 5: Commit**

```bash
git add tests/integration/metrics-dashboard.spec.ts
git commit -m "test(metricas)!: adiciona testes e2e do dashboard de metricas"
```

---
