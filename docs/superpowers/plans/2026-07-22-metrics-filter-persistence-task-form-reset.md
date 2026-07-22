# Persistência do Filtro de Período + Fix de Reset do Form de Task Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lembrar a seleção de período (Semana/Quinzena/Mês/Personalizado) por time nas telas de métricas, pré-preencher o modal "Personalizado" com a data de hoje na primeira abertura, e corrigir o reset dos campos preenchidos quando o cadastro/edição/retroativo de task dá erro.

**Architecture:** Segue o padrão Clean Architecture já usado para `current-team-id` (porta em `application`, adapter de cookie em `infrastructure`, wiring em `composition`). O período preferido fica num cookie único (`metrics-period-pref`) mapeado por `teamId`, lido no server component da página e usado como fallback quando a URL não especifica `period`. O fix do form usa a mesma técnica nos dois arquivos: trocar `<form action={fn}>` por `<form onSubmit={fn}>` para não acionar o reset automático de campos não controlados do React 19.

**Tech Stack:** Next.js 16 (App Router, Server Components + Server Actions), React 19, TypeScript, Vitest (testes unitários de lógica pura), Biome (lint/format).

## Global Constraints

- Sem dependências novas (spec: cookie client-driven, sem endpoint novo).
- Mensagens de commit no formato `tipo(escopo)!: descrição` (convenção do repo — ver `git log`).
- Testes automatizados só para lógica pura (`parseMetricsFilter`); componentes React e adapters de cookie não têm suíte de testes neste repo hoje — não introduzir uma nova convenção de teste de componente aqui.
- `saveMetricsPeriodPreferenceAction` não pode chamar `revalidatePath`/`router.refresh` — o filtro de período foi recentemente ajustado para não causar reflow (commit `343da31`), e isso não pode regredir.
- Preferência de período é uma só por time (vale para `/metrics` e `/metrics/developers`) — não separar por tela.

---

### Task 1: `parseMetricsFilter` aceita uma preferência salva como fallback

**Files:**
- Modify: `src/presentation/metrics-dashboard/parse-metrics-search-params.ts`
- Test: `src/presentation/metrics-dashboard/parse-metrics-search-params.test.ts`

**Interfaces:**
- Produces: `parseMetricsFilter(searchParams: MetricsSearchParams, now?: Date, preference?: MetricsPeriodPreference | null): MetricsFilter` — mesma assinatura de hoje, com um terceiro parâmetro opcional.
- Consumes: tipo `MetricsPeriodPreference` de `@/application/metrics/ports/metrics-period-preference-store` (criado na Task 2 — só o tipo é necessário aqui, então essa task pode ser feita antes da 2 desde que o tipo já exista; se for feita primeiro, criar o arquivo de tipos junto).

Regra: se `searchParams.period` for `undefined` e existir `preference`, usa `preference` no lugar de `searchParams` para toda a extração (period/date/start/end). Se `searchParams.period` estiver presente (mesmo que inválido, ex. `period=custom` sem `end`), o comportamento atual não muda — a preferência é ignorada.

- [ ] **Step 1: Criar o tipo `MetricsPeriodPreference`**

Criar `src/application/metrics/ports/metrics-period-preference-store.ts`:

```ts
export type MetricsPeriodPreference =
	| { period: "week" | "fortnight" | "month" }
	| { period: "custom"; start: string; end: string };

export type MetricsPeriodPreferenceStore = {
	get(teamId: string): Promise<MetricsPeriodPreference | null>;
	set(teamId: string, preference: MetricsPeriodPreference): Promise<void>;
};
```

- [ ] **Step 2: Escrever os testes que falham**

Adicionar ao final de `src/presentation/metrics-dashboard/parse-metrics-search-params.test.ts` (dentro do `describe("parseMetricsFilter")` existente):

```ts
	it("usa a preferência salva quando a URL não especifica period", () => {
		const now = new Date("2026-07-15T12:00:00Z");
		const result = parseMetricsFilter({}, now, { period: "month" });
		expect(result).toEqual({ periodType: "MONTH", referenceDate: now });
	});

	it("usa start/end da preferência salva quando period é custom", () => {
		const result = parseMetricsFilter(
			{},
			new Date("2026-07-15T12:00:00Z"),
			{ period: "custom", start: "2026-07-06", end: "2026-07-17" },
		);
		expect(result).toEqual({
			periodType: "CUSTOM",
			referenceDate: new Date("2026-07-06T00:00:00Z"),
			start: new Date("2026-07-06T00:00:00Z"),
			end: new Date("2026-07-18T00:00:00Z"),
		});
	});

	it("ignora a preferência salva quando a URL já especifica period", () => {
		const now = new Date("2026-07-15T12:00:00Z");
		const result = parseMetricsFilter(
			{ period: "week" },
			now,
			{ period: "month" },
		);
		expect(result).toEqual({ periodType: "WEEK", referenceDate: now });
	});

	it("ignora preferência ausente e usa semana", () => {
		const now = new Date("2026-07-15T12:00:00Z");
		expect(parseMetricsFilter({}, now, null)).toEqual({
			periodType: "WEEK",
			referenceDate: now,
		});
	});
```

- [ ] **Step 3: Rodar os testes e confirmar a falha**

Run: `npm test -- parse-metrics-search-params`
Expected: FAIL — os 4 testes novos falham porque `parseMetricsFilter` ainda não tem o terceiro parâmetro (TypeScript vai reclamar de excesso de argumentos, ou em runtime o parâmetro é ignorado e o resultado não bate).

- [ ] **Step 4: Implementar o fallback**

Editar `src/presentation/metrics-dashboard/parse-metrics-search-params.ts`:

```ts
import type { PeriodType } from "@/application/metrics/period";
import type { MetricsPeriodPreference } from "@/application/metrics/ports/metrics-period-preference-store";
import { parseDateOnly } from "@/application/shared/validation";

export type MetricsSearchParams = {
	period?: string;
	date?: string;
	start?: string;
	end?: string;
	developer?: string;
};

export type MetricsFilter =
	| { periodType: PeriodType; referenceDate: Date }
	| { periodType: "CUSTOM"; referenceDate: Date; start: Date; end: Date };

export function parseMetricsFilter(
	searchParams: MetricsSearchParams,
	now: Date = new Date(),
	preference?: MetricsPeriodPreference | null,
): MetricsFilter {
	const effective: MetricsSearchParams =
		searchParams.period === undefined && preference ? preference : searchParams;

	if (effective.period === "custom") {
		const start = parseDateOnly(effective.start);
		const endInput = parseDateOnly(effective.end);
		if (start && endInput && start <= endInput) {
			const end = new Date(endInput);
			end.setUTCDate(end.getUTCDate() + 1);
			return { periodType: "CUSTOM", referenceDate: start, start, end };
		}
	}
	const periodType: PeriodType =
		effective.period === "month"
			? "MONTH"
			: effective.period === "fortnight"
				? "FORTNIGHT"
				: "WEEK";
	return {
		periodType,
		referenceDate: parseDateOnly(effective.date) ?? now,
	};
}
```

- [ ] **Step 5: Rodar os testes e confirmar que passam**

Run: `npm test -- parse-metrics-search-params`
Expected: PASS — todos os testes (os já existentes e os 4 novos).

- [ ] **Step 6: Typecheck e lint**

Run: `npm run typecheck && npm run lint`
Expected: sem erros.

- [ ] **Step 7: Commit**

```bash
git add src/application/metrics/ports/metrics-period-preference-store.ts src/presentation/metrics-dashboard/parse-metrics-search-params.ts src/presentation/metrics-dashboard/parse-metrics-search-params.test.ts
git commit -m "feat(metricas)!: parseMetricsFilter aceita preferencia de periodo salva como fallback"
```

---

### Task 2: Cookie store, use-cases e wiring da preferência de período

**Files:**
- Create: `src/infrastructure/metrics/cookie-metrics-period-preference-store.ts`
- Create: `src/application/metrics/use-cases/metrics-period-preference.ts`
- Modify: `src/composition/metrics.ts`

**Interfaces:**
- Consumes: `MetricsPeriodPreference`, `MetricsPeriodPreferenceStore` (Task 1, `@/application/metrics/ports/metrics-period-preference-store`).
- Produces: `cookieMetricsPeriodPreferenceStore: MetricsPeriodPreferenceStore`; `getMetricsPeriodPreference(store, teamId)`; `setMetricsPeriodPreference(store, teamId, preference)`; e em `createMetricsUseCases()`, os métodos `getMetricsPeriodPreference(teamId)` e `setMetricsPeriodPreference(teamId, preference)` usados pelas Tasks 3-6.

Sem lógica de negócio ramificada além do parse do cookie (que já tem fallback seguro pra JSON inválido) — sem teste automatizado aqui, mesmo padrão de `cookie-current-team-store.ts` (não testado no repo).

- [ ] **Step 1: Criar o adapter de cookie**

Criar `src/infrastructure/metrics/cookie-metrics-period-preference-store.ts`:

```ts
import { cookies } from "next/headers";
import type {
	MetricsPeriodPreference,
	MetricsPeriodPreferenceStore,
} from "@/application/metrics/ports/metrics-period-preference-store";

const COOKIE_NAME = "metrics-period-pref";

type PreferenceMap = Record<string, MetricsPeriodPreference>;

function parsePreferenceMap(raw: string | undefined): PreferenceMap {
	if (!raw) return {};
	try {
		const parsed = JSON.parse(raw);
		return parsed && typeof parsed === "object" ? parsed : {};
	} catch {
		return {};
	}
}

export const cookieMetricsPeriodPreferenceStore: MetricsPeriodPreferenceStore =
	{
		async get(teamId) {
			const store = await cookies();
			const map = parsePreferenceMap(store.get(COOKIE_NAME)?.value);
			return map[teamId] ?? null;
		},
		async set(teamId, preference) {
			const store = await cookies();
			const map = parsePreferenceMap(store.get(COOKIE_NAME)?.value);
			map[teamId] = preference;
			store.set(COOKIE_NAME, JSON.stringify(map), { path: "/" });
		},
	};
```

- [ ] **Step 2: Criar os use-cases**

Criar `src/application/metrics/use-cases/metrics-period-preference.ts`:

```ts
import type {
	MetricsPeriodPreference,
	MetricsPeriodPreferenceStore,
} from "@/application/metrics/ports/metrics-period-preference-store";

export function getMetricsPeriodPreference(
	store: MetricsPeriodPreferenceStore,
	teamId: string,
): Promise<MetricsPeriodPreference | null> {
	return store.get(teamId);
}

export function setMetricsPeriodPreference(
	store: MetricsPeriodPreferenceStore,
	teamId: string,
	preference: MetricsPeriodPreference,
): Promise<void> {
	return store.set(teamId, preference);
}
```

- [ ] **Step 3: Ligar em `composition/metrics.ts`**

Editar `src/composition/metrics.ts` — adicionar os imports e os dois métodos novos ao objeto retornado por `createMetricsUseCases()`:

```ts
import type { PeriodType } from "@/application/metrics/period";
import type { MetricsPeriodPreference } from "@/application/metrics/ports/metrics-period-preference-store";
import { getDeveloperMetrics } from "@/application/metrics/use-cases/get-developer-metrics";
import {
	getMetricsDashboard,
	getMetricsDashboardForRange,
} from "@/application/metrics/use-cases/get-metrics-dashboard";
import {
	getMetricsPeriodPreference,
	setMetricsPeriodPreference,
} from "@/application/metrics/use-cases/metrics-period-preference";
import { cookieMetricsPeriodPreferenceStore } from "@/infrastructure/metrics/cookie-metrics-period-preference-store";
import { drizzleMetricsQueryPort } from "@/infrastructure/metrics/drizzle-metrics-query-port";

export function createMetricsUseCases() {
	return {
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
		getMetricsDashboard: (
			teamId: string,
			periodType: PeriodType,
			referenceDate: Date,
			wipLimit: number,
		) =>
			getMetricsDashboard(
				drizzleMetricsQueryPort,
				teamId,
				periodType,
				referenceDate,
				wipLimit,
			),
		getMetricsDashboardForRange: (
			teamId: string,
			start: Date,
			end: Date,
			wipLimit: number,
		) =>
			getMetricsDashboardForRange(
				drizzleMetricsQueryPort,
				teamId,
				start,
				end,
				wipLimit,
			),
		getMetricsPeriodPreference: (teamId: string) =>
			getMetricsPeriodPreference(cookieMetricsPeriodPreferenceStore, teamId),
		setMetricsPeriodPreference: (
			teamId: string,
			preference: MetricsPeriodPreference,
		) =>
			setMetricsPeriodPreference(
				cookieMetricsPeriodPreferenceStore,
				teamId,
				preference,
			),
	};
}
```

- [ ] **Step 4: Typecheck e lint**

Run: `npm run typecheck && npm run lint`
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure/metrics/cookie-metrics-period-preference-store.ts src/application/metrics/use-cases/metrics-period-preference.ts src/composition/metrics.ts
git commit -m "feat(metricas)!: adiciona cookie store e use-cases de preferencia de periodo por time"
```

---

### Task 3: Server action para salvar a preferência

**Files:**
- Modify: `src/app/actions.ts`

**Interfaces:**
- Consumes: `createMetricsUseCases()` (Task 2), tipo `MetricsPeriodPreference`.
- Produces: `saveMetricsPeriodPreferenceAction(teamId: string, preference: MetricsPeriodPreference): Promise<void>` — usado pelo `PeriodFilter` (Task 4) via prop.

- [ ] **Step 1: Adicionar a action**

Editar `src/app/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/application/shared/action-state";
import { ApplicationError } from "@/application/shared/application-error";
import type { MetricsPeriodPreference } from "@/application/metrics/ports/metrics-period-preference-store";
import { createMetricsUseCases } from "@/composition/metrics";
import { createTeamUseCases } from "@/composition/team";

function toActionState(error: unknown): ActionState {
	if (error instanceof ApplicationError) return { error: error.message };
	console.error(error);
	return { error: "Não foi possível concluir a operação" };
}

export async function selectTeamAction(teamId: string): Promise<ActionState> {
	try {
		const useCases = createTeamUseCases();
		await useCases.selectTeam(teamId);
		revalidatePath("/");
	} catch (error) {
		return toActionState(error);
	}
	redirect("/");
}

export async function saveMetricsPeriodPreferenceAction(
	teamId: string,
	preference: MetricsPeriodPreference,
): Promise<void> {
	await createMetricsUseCases().setMetricsPeriodPreference(
		teamId,
		preference,
	);
}
```

Nota: sem `revalidatePath`/`redirect` — grava o cookie e retorna, sem navegar nem invalidar cache (evita reflow no filtro).

- [ ] **Step 2: Typecheck e lint**

Run: `npm run typecheck && npm run lint`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/app/actions.ts
git commit -m "feat(metricas)!: adiciona action para salvar preferencia de periodo"
```

---

### Task 4: `PeriodFilter` salva a preferência e abre "Personalizado" com hoje selecionado

**Files:**
- Modify: `src/presentation/metrics-dashboard/period-filter.tsx`

**Interfaces:**
- Consumes: tipo `MetricsPeriodPreference` (Task 1).
- Produces: `PeriodFilterProps` ganha `teamId: string` e `saveMetricsPeriodPreferenceAction: (teamId: string, preference: MetricsPeriodPreference) => Promise<void>` — usados pelas Tasks 5 e 6 ao renderizar `<PeriodFilter>`.

- [ ] **Step 1: Editar o componente**

Substituir o conteúdo de `src/presentation/metrics-dashboard/period-filter.tsx`:

```tsx
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { PeriodType } from "@/application/metrics/period";
import type { MetricsPeriodPreference } from "@/application/metrics/ports/metrics-period-preference-store";
import { Modal } from "@/presentation/shared/modal";
import { buildMetricsUrl } from "./build-metrics-url";
import { shiftReferenceDate } from "./shift-reference-date";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

type PeriodFilterProps = {
	teamId: string;
	saveMetricsPeriodPreferenceAction: (
		teamId: string,
		preference: MetricsPeriodPreference,
	) => Promise<void>;
	periodType: PeriodType | "CUSTOM";
	referenceDate: Date;
	customStart?: Date;
	customEnd?: Date;
};

function toDateParam(date: Date): string {
	return date.toISOString().slice(0, 10);
}

export function PeriodFilter({
	teamId,
	saveMetricsPeriodPreferenceAction,
	periodType,
	referenceDate,
	customStart,
	customEnd,
}: PeriodFilterProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [customModalOpen, setCustomModalOpen] = useState(false);

	function goTo(nextPeriodType: PeriodType, nextReferenceDate: Date) {
		const periodParam =
			nextPeriodType === "MONTH"
				? "month"
				: nextPeriodType === "FORTNIGHT"
					? "fortnight"
					: "week";
		void saveMetricsPeriodPreferenceAction(teamId, { period: periodParam });
		router.push(
			buildMetricsUrl(pathname, new URLSearchParams(searchParams.toString()), {
				period: periodParam,
				date: toDateParam(nextReferenceDate),
			}),
		);
	}

	function submitCustom(formData: FormData) {
		const start = String(formData.get("start") ?? "");
		const end = String(formData.get("end") ?? "");
		if (!start || !end) return;
		setCustomModalOpen(false);
		void saveMetricsPeriodPreferenceAction(teamId, {
			period: "custom",
			start,
			end,
		});
		router.push(
			buildMetricsUrl(pathname, new URLSearchParams(searchParams.toString()), {
				period: "custom",
				start,
				end,
			}),
		);
	}

	return (
		<div className="flex flex-wrap items-center gap-2">
			<div className="flex h-9 rounded-lg border border-(--border)">
				<button
					type="button"
					onClick={() => goTo("WEEK", referenceDate)}
					aria-pressed={periodType === "WEEK"}
					className={`cursor-pointer px-4 text-sm transition-colors ${
						periodType === "WEEK"
							? "bg-(--accent) text-(--accent-fg)"
							: "hover:bg-white/10"
					}`}
				>
					Semana
				</button>
				<button
					type="button"
					onClick={() => goTo("FORTNIGHT", referenceDate)}
					aria-pressed={periodType === "FORTNIGHT"}
					className={`cursor-pointer px-4 text-sm transition-colors ${
						periodType === "FORTNIGHT"
							? "bg-(--accent) text-(--accent-fg)"
							: "hover:bg-white/10"
					}`}
				>
					Quinzena
				</button>
				<button
					type="button"
					onClick={() => goTo("MONTH", referenceDate)}
					aria-pressed={periodType === "MONTH"}
					className={`cursor-pointer px-4 text-sm transition-colors ${
						periodType === "MONTH"
							? "bg-(--accent) text-(--accent-fg)"
							: "hover:bg-white/10"
					}`}
				>
					Mês
				</button>
			</div>
			<button
				type="button"
				onClick={() => setCustomModalOpen(true)}
				aria-pressed={periodType === "CUSTOM"}
				className={`flex h-9 cursor-pointer items-center rounded-lg border border-(--border) px-3 text-sm transition-colors ${
					periodType === "CUSTOM"
						? "bg-(--accent) text-(--accent-fg)"
						: "hover:bg-white/10"
				}`}
			>
				Personalizado
			</button>
			<button
				type="button"
				disabled={periodType === "CUSTOM"}
				onClick={() => periodType !== "CUSTOM" && goTo(periodType, new Date())}
				className="flex h-9 cursor-pointer items-center rounded-lg border border-(--border) px-3 text-sm transition-colors hover:bg-white/10 disabled:pointer-events-none disabled:opacity-40"
			>
				Período atual
			</button>
			<button
				type="button"
				aria-label="Período anterior"
				disabled={periodType === "CUSTOM"}
				onClick={() =>
					periodType !== "CUSTOM" &&
					goTo(periodType, shiftReferenceDate(periodType, referenceDate, -1))
				}
				className="flex h-9 w-10 cursor-pointer items-center justify-center rounded-lg border border-(--border) transition-colors hover:bg-white/10 disabled:pointer-events-none disabled:opacity-40"
			>
				‹
			</button>
			<button
				type="button"
				aria-label="Próximo período"
				disabled={periodType === "CUSTOM"}
				onClick={() =>
					periodType !== "CUSTOM" &&
					goTo(periodType, shiftReferenceDate(periodType, referenceDate, 1))
				}
				className="flex h-9 w-10 cursor-pointer items-center justify-center rounded-lg border border-(--border) transition-colors hover:bg-white/10 disabled:pointer-events-none disabled:opacity-40"
			>
				›
			</button>
			{customModalOpen ? (
				<Modal
					label="Selecionar período"
					onClose={() => setCustomModalOpen(false)}
				>
					<form action={submitCustom} className="flex flex-col gap-4">
						<div className="flex flex-col gap-2">
							<label htmlFor="custom-start" className="text-sm opacity-70">
								Início
							</label>
							<input
								id="custom-start"
								type="date"
								name="start"
								defaultValue={toDateParam(customStart ?? new Date())}
								className="rounded-lg border border-(--border) px-3 py-2"
								required
							/>
						</div>
						<div className="flex flex-col gap-2">
							<label htmlFor="custom-end" className="text-sm opacity-70">
								Fim
							</label>
							<input
								id="custom-end"
								type="date"
								name="end"
								defaultValue={toDateParam(
									customEnd ? new Date(customEnd.getTime() - MS_PER_DAY) : new Date(),
								)}
								className="rounded-lg border border-(--border) px-3 py-2"
								required
							/>
						</div>
						<button
							type="submit"
							className="cursor-pointer rounded-lg bg-(--accent) px-4 py-2 text-(--accent-fg)"
						>
							Aplicar
						</button>
					</form>
				</Modal>
			) : null}
		</div>
	);
}
```

Mudanças: `teamId` + `saveMetricsPeriodPreferenceAction` como novas props; `goTo`/`submitCustom` chamam a action (`void`, sem aguardar — não bloqueia a navegação nem causa reflow); os dois `defaultValue` do modal "Personalizado" caem para `new Date()` (hoje) quando não há um período custom já ativo, em vez de `undefined`.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: erros esperados nos dois arquivos que ainda não passam as novas props (`metrics-dashboard.tsx`, `developer-metrics-dashboard.tsx`) — corrigidos nas Tasks 5 e 6. Confirmar que o erro é exatamente "faltam as propriedades `teamId`, `saveMetricsPeriodPreferenceAction`" nesses dois arquivos, e nenhum outro.

- [ ] **Step 3: Commit**

```bash
git add src/presentation/metrics-dashboard/period-filter.tsx
git commit -m "feat(metricas)!: filtro de periodo salva preferencia e personalizado abre com hoje"
```

---

### Task 5: Wiring em `/metrics` (page + `MetricsDashboard`)

**Files:**
- Modify: `src/app/metrics/page.tsx`
- Modify: `src/presentation/metrics-dashboard/metrics-dashboard.tsx`

**Interfaces:**
- Consumes: `getMetricsPeriodPreference`/`setMetricsPeriodPreference` de `createMetricsUseCases()` (Task 2), `saveMetricsPeriodPreferenceAction` (Task 3), `PeriodFilterProps` (Task 4).

- [ ] **Step 1: Editar `metrics-dashboard.tsx`**

Em `src/presentation/metrics-dashboard/metrics-dashboard.tsx`, adicionar as duas props novas e repassá-las ao `PeriodFilter`:

```tsx
import { CalendarDays } from "lucide-react";
import Link from "next/link";
import type { PeriodType } from "@/application/metrics/period";
import type { MetricsPeriodPreference } from "@/application/metrics/ports/metrics-period-preference-store";
import type {
	HistoricalPeriodMetrics,
	PeriodMetrics,
} from "@/application/metrics/use-cases/get-metrics-for-period";
import { ChartsSection } from "./charts/charts-section";
import { CurrentStatusSection } from "./current-status-section";
import { FlowTimeSection } from "./flow-time-section";
import { formatPeriodRangeLabel } from "./format-period-label";
import { MetricInfoButton } from "./metric-info-button";
import { PeriodFilter } from "./period-filter";
import { WeekResultSection } from "./week-result-section";

type MetricsDashboardProps = {
	teamId: string;
	saveMetricsPeriodPreferenceAction: (
		teamId: string,
		preference: MetricsPeriodPreference,
	) => Promise<void>;
	periodType: PeriodType | "CUSTOM";
	referenceDate: Date;
	current: PeriodMetrics;
	history: HistoricalPeriodMetrics[];
};

export function MetricsDashboard({
	teamId,
	saveMetricsPeriodPreferenceAction,
	periodType,
	referenceDate,
	current,
	history,
}: MetricsDashboardProps) {
	return (
		<div className="flex flex-1 flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
			<header className="flex flex-col gap-5 border-b border-(--border) pb-6 lg:flex-row lg:items-end lg:justify-between">
				<div className="min-w-0">
					<p className="mb-2 font-mono text-xs font-semibold tracking-[0.2em] text-(--accent) uppercase">
						Visão do time
					</p>
					<div className="flex flex-wrap items-center gap-3">
						<h1 className="text-2xl font-semibold sm:text-3xl">Métricas</h1>
						<span className="flex items-center gap-2 rounded-lg border border-(--border) bg-(--surface) px-3 py-1.5 font-mono text-sm font-semibold sm:text-base">
							<CalendarDays
								size={16}
								className="text-(--accent)"
								aria-hidden="true"
							/>
							{formatPeriodRangeLabel(current.periodStart, current.periodEnd)}
						</span>
					</div>
				</div>
				<div className="flex flex-wrap items-center gap-2 self-start rounded-xl border border-(--border) bg-(--surface) p-2 lg:self-auto">
					<Link
						href="/metrics/developers"
						className="flex h-9 items-center rounded-lg border border-(--border) px-3 text-sm transition-colors hover:bg-white/10"
					>
						Por desenvolvedor
					</Link>
					<MetricInfoButton />
					<PeriodFilter
						teamId={teamId}
						saveMetricsPeriodPreferenceAction={saveMetricsPeriodPreferenceAction}
						periodType={periodType}
						referenceDate={referenceDate}
						customStart={
							periodType === "CUSTOM" ? current.periodStart : undefined
						}
						customEnd={periodType === "CUSTOM" ? current.periodEnd : undefined}
					/>
				</div>
			</header>
			<div className="grid items-stretch gap-6 xl:grid-cols-2">
				<CurrentStatusSection wip={current.wip} />
				<WeekResultSection periodType={periodType} current={current} />
			</div>
			<FlowTimeSection current={current} />
			{periodType !== "CUSTOM" ? (
				<ChartsSection
					periodType={periodType}
					current={current}
					history={history}
				/>
			) : null}
		</div>
	);
}
```

- [ ] **Step 2: Editar `page.tsx`**

Substituir `src/app/metrics/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { saveMetricsPeriodPreferenceAction } from "@/app/actions";
import { createMetricsUseCases } from "@/composition/metrics";
import { createTeamUseCases } from "@/composition/team";
import { MetricsDashboard } from "@/presentation/metrics-dashboard/metrics-dashboard";
import {
	type MetricsSearchParams,
	parseMetricsFilter,
} from "@/presentation/metrics-dashboard/parse-metrics-search-params";

export default async function MetricsPage({
	searchParams,
}: {
	searchParams: Promise<MetricsSearchParams>;
}) {
	const teamUseCases = createTeamUseCases();
	const currentTeam = await teamUseCases.getCurrentTeam();
	if (!currentTeam) {
		redirect("/teams");
	}

	const metricsUseCases = createMetricsUseCases();
	const preference = await metricsUseCases.getMetricsPeriodPreference(
		currentTeam.id,
	);
	const resolvedSearchParams = await searchParams;
	const filter = parseMetricsFilter(resolvedSearchParams, undefined, preference);

	const { current, history } =
		filter.periodType === "CUSTOM"
			? await metricsUseCases.getMetricsDashboardForRange(
					currentTeam.id,
					filter.start,
					filter.end,
					currentTeam.wipLimit,
				)
			: await metricsUseCases.getMetricsDashboard(
					currentTeam.id,
					filter.periodType,
					filter.referenceDate,
					currentTeam.wipLimit,
				);

	return (
		<MetricsDashboard
			teamId={currentTeam.id}
			saveMetricsPeriodPreferenceAction={saveMetricsPeriodPreferenceAction}
			periodType={filter.periodType}
			referenceDate={filter.referenceDate}
			current={current}
			history={history}
		/>
	);
}
```

- [ ] **Step 3: Typecheck e lint**

Run: `npm run typecheck && npm run lint`
Expected: sem erros relacionados a `/metrics` (os erros de `developer-metrics-dashboard.tsx` da Task 4 continuam até a Task 6).

- [ ] **Step 4: Commit**

```bash
git add src/app/metrics/page.tsx src/presentation/metrics-dashboard/metrics-dashboard.tsx
git commit -m "feat(metricas)!: usa preferencia de periodo salva em /metrics"
```

---

### Task 6: Wiring em `/metrics/developers` (page + `DeveloperMetricsDashboard`)

**Files:**
- Modify: `src/app/metrics/developers/page.tsx`
- Modify: `src/presentation/developer-metrics/developer-metrics-dashboard.tsx`

**Interfaces:**
- Consumes: mesmos das Task 5 (`getMetricsPeriodPreference`, `saveMetricsPeriodPreferenceAction`, `PeriodFilterProps`).

- [ ] **Step 1: Editar `developer-metrics-dashboard.tsx`**

Em `src/presentation/developer-metrics/developer-metrics-dashboard.tsx`, adicionar `teamId` e `saveMetricsPeriodPreferenceAction` ao tipo de props e repassar ao `PeriodFilter` (mesmo padrão da Task 5):

```tsx
import { CalendarDays } from "lucide-react";
import type { ReactNode } from "react";
import type { DurationStats } from "@/application/metrics/formulas/duration-metrics";
import type { PeriodType } from "@/application/metrics/period";
import type { MetricsPeriodPreference } from "@/application/metrics/ports/metrics-period-preference-store";
import type { DeveloperMetricEvidence } from "@/application/metrics/use-cases/get-developer-metrics";
import type { HistoricalPeriodMetrics } from "@/application/metrics/use-cases/get-metrics-for-period";
import type { Member } from "@/domain/team/entities/member";
import {
	formatDuration,
	formatPercent,
} from "@/presentation/metrics-dashboard/format-metric-value";
import { formatPeriodRangeLabel } from "@/presentation/metrics-dashboard/format-period-label";
import { MetricInfoButton } from "@/presentation/metrics-dashboard/metric-info-button";
import { PeriodFilter } from "@/presentation/metrics-dashboard/period-filter";
import { StatTile } from "@/presentation/metrics-dashboard/stat-tile";
import { DeveloperSelector } from "./developer-selector";

type DeveloperMetricsDashboardProps = {
	teamId: string;
	saveMetricsPeriodPreferenceAction: (
		teamId: string,
		preference: MetricsPeriodPreference,
	) => Promise<void>;
	periodType: PeriodType | "CUSTOM";
	referenceDate: Date;
	members: Member[];
	selectedMember: Member;
	current: HistoricalPeriodMetrics;
	previous: HistoricalPeriodMetrics;
	evidence: DeveloperMetricEvidence;
};
```

(Mantém o resto do arquivo igual, exceto o cabeçalho da função e o `<PeriodFilter>`:)

```tsx
export function DeveloperMetricsDashboard({
	teamId,
	saveMetricsPeriodPreferenceAction,
	periodType,
	referenceDate,
	members,
	selectedMember,
	current,
	previous,
	evidence,
}: DeveloperMetricsDashboardProps) {
```

```tsx
					<PeriodFilter
						teamId={teamId}
						saveMetricsPeriodPreferenceAction={saveMetricsPeriodPreferenceAction}
						periodType={periodType}
						referenceDate={referenceDate}
						customStart={
							periodType === "CUSTOM" ? current.periodStart : undefined
						}
						customEnd={periodType === "CUSTOM" ? current.periodEnd : undefined}
					/>
```

- [ ] **Step 2: Editar `page.tsx`**

Substituir `src/app/metrics/developers/page.tsx`:

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { saveMetricsPeriodPreferenceAction } from "@/app/actions";
import {
	getPeriodRange,
	getPreviousPeriods,
} from "@/application/metrics/period";
import { createMetricsUseCases } from "@/composition/metrics";
import { createTeamUseCases } from "@/composition/team";
import { DeveloperMetricsDashboard } from "@/presentation/developer-metrics/developer-metrics-dashboard";
import {
	type MetricsSearchParams,
	parseMetricsFilter,
} from "@/presentation/metrics-dashboard/parse-metrics-search-params";

export default async function DeveloperMetricsPage({
	searchParams,
}: {
	searchParams: Promise<MetricsSearchParams>;
}) {
	const teamUseCases = createTeamUseCases();
	const currentTeam = await teamUseCases.getCurrentTeam();
	if (!currentTeam) redirect("/teams");

	const teamDetails = await teamUseCases.getTeam(currentTeam.id);
	const members = teamDetails?.members ?? [];
	if (members.length === 0) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
				<h1 className="text-2xl font-semibold">
					Nenhum desenvolvedor cadastrado
				</h1>
				<p className="text-(--foreground-muted)">
					Adicione um membro ao time para consultar as métricas individuais.
				</p>
				<Link
					href={`/teams/${currentTeam.id}`}
					className="rounded-lg bg-(--accent) px-4 py-2 text-(--accent-fg)"
				>
					Gerenciar time
				</Link>
			</div>
		);
	}

	const resolvedSearchParams = await searchParams;
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

	const metricsUseCases = createMetricsUseCases();
	const preference = await metricsUseCases.getMetricsPeriodPreference(
		currentTeam.id,
	);
	const filter = parseMetricsFilter(resolvedSearchParams, undefined, preference);
	const range =
		filter.periodType === "CUSTOM"
			? { start: filter.start, end: filter.end }
			: getPeriodRange(filter.periodType, filter.referenceDate);
	const previousStart =
		filter.periodType === "CUSTOM"
			? new Date(
					range.start.getTime() - (range.end.getTime() - range.start.getTime()),
				)
			: getPreviousPeriods(filter.periodType, filter.referenceDate, 2)[0].start;
	const metrics = await metricsUseCases.getDeveloperMetrics(
		currentTeam.id,
		selectedMember.id,
		previousStart,
		range.start,
		range.end,
	);

	return (
		<DeveloperMetricsDashboard
			teamId={currentTeam.id}
			saveMetricsPeriodPreferenceAction={saveMetricsPeriodPreferenceAction}
			periodType={filter.periodType}
			referenceDate={filter.referenceDate}
			members={members}
			selectedMember={selectedMember}
			{...metrics}
		/>
	);
}
```

- [ ] **Step 3: Typecheck e lint**

Run: `npm run typecheck && npm run lint`
Expected: sem erros em nenhum arquivo do projeto.

- [ ] **Step 4: Rodar a suíte de testes completa**

Run: `npm test`
Expected: PASS — todos os testes, incluindo os novos da Task 1.

- [ ] **Step 5: Commit**

```bash
git add src/app/metrics/developers/page.tsx src/presentation/developer-metrics/developer-metrics-dashboard.tsx
git commit -m "feat(metricas)!: usa preferencia de periodo salva em /metrics/developers"
```

---

### Task 7: Corrige reset dos campos ao dar erro em `TaskFormModal` (criar/editar)

**Files:**
- Modify: `src/presentation/task/task-form-modal.tsx`

**Interfaces:**
- Nenhuma mudança de tipo/assinatura pública — `TaskFormModalProps` e o comportamento de sucesso não mudam.

Causa raiz (ver spec): `<form action={handleSubmit}>` usa o mecanismo de form actions do React 19, que reseta os campos não controlados sempre que a função passada em `action` termina sem lançar — inclusive no caminho de erro tratado internamente (`setError(...)`). Trocar para `onSubmit` com `preventDefault` evita esse reset automático, sem mudar a lógica interna.

- [ ] **Step 1: Editar o handler e o form**

Em `src/presentation/task/task-form-modal.tsx`:

1. Adicionar o import de tipo:

```ts
import type { FormEvent } from "react";
```

2. Trocar a assinatura de `handleSubmit` (linhas 56-101) — só a primeira e a última linha mudam, o corpo entre `setPending(true)` e o `finally` continua idêntico:

```ts
	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const formData = new FormData(event.currentTarget);
		const externalId = String(formData.get("externalId") ?? "");
		const description = String(formData.get("description") ?? "");
		const typeId = String(formData.get("typeId") ?? "");
		const assigneeIdValue = String(formData.get("assigneeId") ?? "");
		const assigneeId = assigneeIdValue === "" ? null : assigneeIdValue;
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
			if (result.error) {
				setError(result.error);
				return;
			}
			setOpen(false);
		} catch {
			setError("Não foi possível concluir a operação");
		} finally {
			setPending(false);
		}
	}
```

3. Trocar `<form action={handleSubmit} className="flex flex-col gap-4">` (linha 174) por:

```tsx
					<form onSubmit={handleSubmit} className="flex flex-col gap-4">
```

- [ ] **Step 2: Typecheck e lint**

Run: `npm run typecheck && npm run lint`
Expected: sem erros.

- [ ] **Step 3: Verificação manual**

Rodar o app localmente (dev server), abrir "Nova task", preencher os campos, forçar um erro (ex. deixar o backend rejeitar — ou simular removendo temporariamente um campo obrigatório do banco não é necessário: basta observar visualmente que, após um erro real de submit, os valores digitados continuam nos campos). Repetir no fluxo de editar task.

- [ ] **Step 4: Commit**

```bash
git add src/presentation/task/task-form-modal.tsx
git commit -m "fix(tasks)!: mantem campos preenchidos ao dar erro no form de criar/editar task"
```

---

### Task 8: Corrige reset dos campos ao dar erro em `HistoricalTaskFormModal` (retroativo)

**Files:**
- Modify: `src/presentation/task/historical-task-form-modal.tsx`

Mesma causa raiz e mesma correção da Task 7, aplicada aqui. Os `steps` (etapas) já são `useState` controlado, então não são afetados pelo reset — só os campos não controlados (`externalId`, `description`, `typeId`, `assigneeId`, `dueDate`).

- [ ] **Step 1: Editar o handler e o form**

Em `src/presentation/task/historical-task-form-modal.tsx`:

1. Adicionar o import de tipo:

```ts
import type { FormEvent } from "react";
```

2. Trocar a assinatura de `handleSubmit` (linhas 42-72):

```ts
	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const formData = new FormData(event.currentTarget);
		const externalId = String(formData.get("externalId") ?? "");
		const description = String(formData.get("description") ?? "");
		const typeId = String(formData.get("typeId") ?? "");
		const assigneeIdValue = String(formData.get("assigneeId") ?? "");
		const assigneeId = assigneeIdValue === "" ? null : assigneeIdValue;
		const dueDate = String(formData.get("dueDate") ?? "");

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
```

3. Trocar `<form action={handleSubmit} className="flex flex-col gap-4">` (linha 86) por:

```tsx
					<form onSubmit={handleSubmit} className="flex flex-col gap-4">
```

- [ ] **Step 2: Typecheck e lint**

Run: `npm run typecheck && npm run lint`
Expected: sem erros.

- [ ] **Step 3: Verificação manual**

Abrir "Retroativo", preencher os campos e etapas, forçar/observar um erro de submit, confirmar que os campos preenchidos e as etapas continuam visíveis.

- [ ] **Step 4: Commit**

```bash
git add src/presentation/task/historical-task-form-modal.tsx
git commit -m "fix(tasks)!: mantem campos preenchidos ao dar erro no form de card retroativo"
```

---

### Task 9: Verificação final

**Files:** nenhum (só verificação).

- [ ] **Step 1: Suíte completa**

Run: `npm run typecheck && npm run lint && npm test`
Expected: tudo passando.

- [ ] **Step 2: Verificação manual do filtro de período**

Com o dev server rodando: selecionar "Mês" em `/metrics`, navegar para outra tela e voltar (ou abrir uma nova aba na mesma sessão) sem `period` na URL — confirmar que abre em "Mês". Repetir com "Personalizado" (confirmar que abre com o intervalo salvo). Trocar de time (se houver mais de um) e confirmar que a preferência é por time (não compartilhada). Abrir "Personalizado" pela primeira vez num time sem preferência salva e confirmar que os dois campos de data já vêm com a data de hoje.

- [ ] **Step 3: Commit do `package.json`**

O usuário já alterou a versão em `package.json` (usada no rodapé, ver `343da31`) e pediu para incluir junto:

```bash
git add package.json
git commit -m "build(app)!: atualiza versao do app para 1.1.4"
```
