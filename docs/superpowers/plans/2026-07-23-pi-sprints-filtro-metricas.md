# PIs e Sprints — Filtro de sprint nas métricas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar um toggle "Período | Sprint" na tela `/metrics`. Selecionando uma sprint `ACTIVE`/`PLANNED`, os números são calculados ao vivo sobre o range de datas da sprint; selecionando uma sprint `CLOSED`, os números vêm do `sprint_metrics_snapshot` gravado no plano anterior — não mudam mesmo que as tasks tenham sido editadas depois.

**Architecture:** Novo use-case `getMetricsForSprint` no contexto `metrics`, que consome `SprintRepository` e `SprintMetricsSnapshotRepository` (portas públicas do contexto `sprint`) — mesma direção de integração cross-context já usada por `finishSprint` no plano anterior, só que invertida. Nenhuma tabela nova. Um bug latente do plano anterior é corrigido aqui: `jsonb` desserializa `Date` como string, então `drizzleSprintMetricsSnapshotRepository.findBySprint` precisa reconstruir `periodStart`/`periodEnd` como `Date` antes de devolver — sem isso, `formatPeriodRangeLabel` quebraria ao renderizar uma sprint fechada.

**Tech Stack:** Next.js App Router (Server Components + query string), TypeScript estrito, Vitest, Biome, Tailwind.

## Global Constraints

- Todas as dos planos anteriores continuam valendo (ver os três planos anteriores em `docs/superpowers/plans/2026-07-23-pi-sprints-*.md`).
- Este plano assume os três planos anteriores implementados: PIs/Sprints cadastráveis, atribuição de card, ciclo de vida (iniciar/finalizar com snapshot).
- Filtro de sprint e filtro de período são mutuamente exclusivos, controlados pela presença do parâmetro `sprintId` na URL — mesmo padrão já usado no quadro (`/board?sprintId=`).
- Para sprint `ACTIVE`/`PLANNED`: cálculo ao vivo reaproveitando `getMetricsForRange` sobre `[startDate, endDate)` da sprint (fim exclusivo, mesmo padrão de `period.ts`).
- Para sprint `CLOSED`: lê `sprint_metrics_snapshot`; o campo `wip` (que não existe no snapshot congelado) é preenchido com zeros — uma sprint fechada não tem "trabalho em andamento" atual.
- Filtro de tarjas (`TagFilter`) não se aplica ao modo Sprint (o cálculo de sprint não recebe `tagIds`) — fora de escopo tratar essa interação na UI; a tela simplesmente ignora tarjas selecionadas quando uma sprint está ativa no filtro.

---

## File Structure

```
src/application/metrics/use-cases/get-metrics-for-sprint.ts       (novo)
src/application/metrics/use-cases/get-metrics-for-sprint.test.ts  (novo)

src/infrastructure/sprint/drizzle-sprint-metrics-snapshot-repository.ts       (modificado)
src/infrastructure/sprint/drizzle-sprint-metrics-snapshot-repository.test.ts  (modificado)

src/composition/metrics.ts                                        (modificado)

src/presentation/metrics-dashboard/parse-metrics-search-params.ts (modificado)
src/presentation/metrics-dashboard/metrics-sprint-filter.tsx      (novo)
src/presentation/metrics-dashboard/metrics-dashboard.tsx          (modificado)

src/app/metrics/page.tsx                                          (modificado)
```

---

### Task 1: Corrigir `findBySprint` para reconstruir `Date`

**Files:**
- Modify: `src/infrastructure/sprint/drizzle-sprint-metrics-snapshot-repository.ts`
- Modify: `src/infrastructure/sprint/drizzle-sprint-metrics-snapshot-repository.test.ts`

**Interfaces:**
- `SprintMetricsSnapshotRepository.findBySprint` continua com a mesma assinatura; só o comportamento muda — `periodStart`/`periodEnd` do retorno passam a ser instâncias reais de `Date`.

- [ ] **Step 1: Adicionar o teste que expõe o bug**

Adicionar ao final de `describe("drizzleSprintMetricsSnapshotRepository", ...)` em `src/infrastructure/sprint/drizzle-sprint-metrics-snapshot-repository.test.ts` (antes do `});` final):

```ts
	it("reconstrói periodStart e periodEnd como Date ao ler de volta", async () => {
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
				throughput: 0,
				predictability: null,
				predictabilityCounts: null,
				unplannedCount: null,
				bugsOpened: 0,
				bugsRanking: [],
			});
			const found = await drizzleSprintMetricsSnapshotRepository.findBySprint(
				sprint.id,
			);
			expect(found?.periodStart).toBeInstanceOf(Date);
			expect(found?.periodEnd).toBeInstanceOf(Date);
			expect(found?.periodStart.toISOString()).toBe("2026-07-01T00:00:00.000Z");
		} finally {
			await deletePi(pi.id);
		}
	});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest run src/infrastructure/sprint/drizzle-sprint-metrics-snapshot-repository.test.ts`
Expected: FAIL — `found?.periodStart` é uma string (`"2026-07-01T00:00:00.000Z"`), não uma instância de `Date`, então `toBeInstanceOf(Date)` falha.

- [ ] **Step 3: Corrigir `findBySprint`**

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
			if (!row) return null;
			// jsonb desserializa Date como string — reconstrói os dois campos de
			// data conhecidos do snapshot antes de devolver ao chamador.
			const stored = row.metrics as HistoricalPeriodMetrics;
			return {
				...stored,
				periodStart: new Date(stored.periodStart),
				periodEnd: new Date(stored.periodEnd),
			};
		},
	};
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest run src/infrastructure/sprint/drizzle-sprint-metrics-snapshot-repository.test.ts`
Expected: PASS (todos, incluindo o novo).

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure/sprint/drizzle-sprint-metrics-snapshot-repository.ts src/infrastructure/sprint/drizzle-sprint-metrics-snapshot-repository.test.ts
git commit -m "fix(sprints)!: reconstroi datas do snapshot de metricas ao ler do jsonb"
```

---

### Task 2: Use-case `getMetricsForSprint`

**Files:**
- Create: `src/application/metrics/use-cases/get-metrics-for-sprint.ts`
- Create: `src/application/metrics/use-cases/get-metrics-for-sprint.test.ts`

**Interfaces:**
- Consumes: `SprintRepository`, `SprintMetricsSnapshotRepository` (contexto `sprint`, já existentes); `MetricsQueryPort`, `getMetricsForRange`, `calculateCurrentWipMetrics`, `MetricsDashboardResult` (já existentes em `application/metrics`).
- Produces: `getMetricsForSprint(sprintRepository, sprintMetricsSnapshotRepository, metricsQueryPort, sprintId, teamId, wipLimit): Promise<MetricsDashboardResult>`.

- [ ] **Step 1: Escrever os testes**

```ts
// src/application/metrics/use-cases/get-metrics-for-sprint.test.ts
import { describe, expect, it } from "vitest";
import type { MetricsQueryPort } from "@/application/metrics/ports/metrics-query-port";
import { createFakeSprintMetricsSnapshotRepository } from "@/application/sprint/use-cases/test-helpers/create-fake-sprint-metrics-snapshot-repository";
import { createFakeSprintRepository } from "@/application/sprint/use-cases/test-helpers/create-fake-sprint-repository";
import { getMetricsForSprint } from "./get-metrics-for-sprint";

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

describe("getMetricsForSprint", () => {
	it("rejeita sprint inexistente", async () => {
		const sprintRepository = createFakeSprintRepository();
		const sprintMetricsSnapshotRepository =
			createFakeSprintMetricsSnapshotRepository();
		await expect(
			getMetricsForSprint(
				sprintRepository,
				sprintMetricsSnapshotRepository,
				emptyMetricsQueryPort,
				"sprint-missing",
				"team-1",
				5,
			),
		).rejects.toThrow("Sprint não encontrada");
	});

	it("rejeita sprint de outro time", async () => {
		const sprintRepository = createFakeSprintRepository();
		const sprintMetricsSnapshotRepository =
			createFakeSprintMetricsSnapshotRepository();
		const sprint = await sprintRepository.create({
			piId: "pi-1",
			teamId: "team-1",
			name: "Sprint 1",
			startDate: "2026-07-01",
			endDate: "2026-07-14",
		});
		await expect(
			getMetricsForSprint(
				sprintRepository,
				sprintMetricsSnapshotRepository,
				emptyMetricsQueryPort,
				sprint.id,
				"team-2",
				5,
			),
		).rejects.toThrow("Sprint não encontrada");
	});

	it("calcula ao vivo para sprint ativa, sobre o range da sprint", async () => {
		const sprintRepository = createFakeSprintRepository();
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

		let receivedRange: { start: Date; end: Date } | undefined;
		const metricsQueryPort: MetricsQueryPort = {
			async loadSnapshot(_teamId, periodStart, periodEnd) {
				receivedRange = { start: periodStart, end: periodEnd };
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

		const result = await getMetricsForSprint(
			sprintRepository,
			sprintMetricsSnapshotRepository,
			metricsQueryPort,
			sprint.id,
			"team-1",
			5,
		);

		expect(receivedRange?.start.toISOString()).toBe("2026-07-01T00:00:00.000Z");
		expect(receivedRange?.end.toISOString()).toBe("2026-07-15T00:00:00.000Z");
		expect(result.current.wip.limit).toBe(5);
		expect(result.history).toEqual([]);
	});

	it("calcula ao vivo para sprint planejada", async () => {
		const sprintRepository = createFakeSprintRepository();
		const sprintMetricsSnapshotRepository =
			createFakeSprintMetricsSnapshotRepository();
		const sprint = await sprintRepository.create({
			piId: "pi-1",
			teamId: "team-1",
			name: "Sprint 1",
			startDate: "2026-07-01",
			endDate: "2026-07-14",
		});

		const result = await getMetricsForSprint(
			sprintRepository,
			sprintMetricsSnapshotRepository,
			emptyMetricsQueryPort,
			sprint.id,
			"team-1",
			5,
		);
		expect(result.current.throughput).toBe(0);
	});

	it("lê o snapshot congelado para sprint fechada, com wip zerado", async () => {
		const sprintRepository = createFakeSprintRepository();
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
		await sprintRepository.updateStatus(sprint.id, "CLOSED");
		await sprintMetricsSnapshotRepository.save(sprint.id, {
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
			throughput: 7,
			predictability: null,
			predictabilityCounts: null,
			unplannedCount: null,
			bugsOpened: 2,
			bugsRanking: [],
		});

		const result = await getMetricsForSprint(
			sprintRepository,
			sprintMetricsSnapshotRepository,
			emptyMetricsQueryPort,
			sprint.id,
			"team-1",
			5,
		);

		expect(result.current.throughput).toBe(7);
		expect(result.current.bugsOpened).toBe(2);
		expect(result.current.wip).toEqual({
			total: 0,
			limit: 5,
			blocked: 0,
			oldestBlockedAgeMs: null,
			inReview: 0,
			averageReviewAgeMs: null,
			inTesting: 0,
			oldestTestingAgeMs: null,
			inPublication: 0,
			oldestPublicationAgeMs: null,
		});
	});

	it("rejeita sprint fechada sem snapshot gravado", async () => {
		const sprintRepository = createFakeSprintRepository();
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
		await sprintRepository.updateStatus(sprint.id, "CLOSED");

		await expect(
			getMetricsForSprint(
				sprintRepository,
				sprintMetricsSnapshotRepository,
				emptyMetricsQueryPort,
				sprint.id,
				"team-1",
				5,
			),
		).rejects.toThrow("Sprint sem snapshot de métricas");
	});
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npx vitest run src/application/metrics/use-cases/get-metrics-for-sprint.test.ts`
Expected: FAIL — módulo `./get-metrics-for-sprint` não existe.

- [ ] **Step 3: Implementar**

```ts
// src/application/metrics/use-cases/get-metrics-for-sprint.ts
import { calculateCurrentWipMetrics } from "@/application/metrics/formulas/current-wip-metrics";
import type { MetricsQueryPort } from "@/application/metrics/ports/metrics-query-port";
import { ApplicationError } from "@/application/shared/application-error";
import { parseDateOnly } from "@/application/shared/validation";
import type { SprintMetricsSnapshotRepository } from "@/application/sprint/ports/sprint-metrics-snapshot-repository";
import type { SprintRepository } from "@/application/sprint/ports/sprint-repository";
import type { MetricsDashboardResult } from "./get-metrics-dashboard";
import { getMetricsForRange } from "./get-metrics-for-period";

export async function getMetricsForSprint(
	sprintRepository: SprintRepository,
	sprintMetricsSnapshotRepository: SprintMetricsSnapshotRepository,
	metricsQueryPort: MetricsQueryPort,
	sprintId: string,
	teamId: string,
	wipLimit: number,
): Promise<MetricsDashboardResult> {
	const sprint = await sprintRepository.findById(sprintId);
	if (!sprint || sprint.teamId !== teamId) {
		throw new ApplicationError("Sprint não encontrada");
	}

	if (sprint.status === "CLOSED") {
		const metrics = await sprintMetricsSnapshotRepository.findBySprint(
			sprintId,
		);
		if (!metrics) {
			throw new ApplicationError("Sprint sem snapshot de métricas");
		}
		return {
			current: {
				...metrics,
				wip: {
					total: 0,
					limit: wipLimit,
					blocked: 0,
					oldestBlockedAgeMs: null,
					inReview: 0,
					averageReviewAgeMs: null,
					inTesting: 0,
					oldestTestingAgeMs: null,
					inPublication: 0,
					oldestPublicationAgeMs: null,
				},
			},
			history: [],
		};
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
	const snapshot = await metricsQueryPort.loadSnapshot(
		teamId,
		periodStart,
		periodEnd,
	);
	const now = new Date();
	const current = getMetricsForRange(snapshot, periodStart, periodEnd, now);
	return {
		current: {
			...current,
			wip: calculateCurrentWipMetrics(snapshot.currentWipTasks, wipLimit, now),
		},
		history: [],
	};
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npx vitest run src/application/metrics/use-cases/get-metrics-for-sprint.test.ts`
Expected: PASS (6 testes).

- [ ] **Step 5: Commit**

```bash
git add src/application/metrics/use-cases/get-metrics-for-sprint.ts src/application/metrics/use-cases/get-metrics-for-sprint.test.ts
git commit -m "feat(sprints)!: adiciona use-case de metricas por sprint"
```

---

### Task 3: Composition root

**Files:**
- Modify: `src/composition/metrics.ts`

**Interfaces:**
- Produces: `createMetricsUseCases().getMetricsForSprint(sprintId, teamId, wipLimit)`.

- [ ] **Step 1: Adicionar os imports**

```ts
// src/composition/metrics.ts — adicionar aos imports existentes:
import { getMetricsForSprint } from "@/application/metrics/use-cases/get-metrics-for-sprint";
import { drizzleSprintMetricsSnapshotRepository } from "@/infrastructure/sprint/drizzle-sprint-metrics-snapshot-repository";
import { drizzleSprintRepository } from "@/infrastructure/sprint/drizzle-sprint-repository";
```

- [ ] **Step 2: Adicionar o método ao objeto retornado**

```ts
// src/composition/metrics.ts — dentro de createMetricsUseCases(), adicionar antes do `};` final:
		getMetricsForSprint: (sprintId: string, teamId: string, wipLimit: number) =>
			getMetricsForSprint(
				drizzleSprintRepository,
				drizzleSprintMetricsSnapshotRepository,
				drizzleMetricsQueryPort,
				sprintId,
				teamId,
				wipLimit,
			),
```

- [ ] **Step 3: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/composition/metrics.ts
git commit -m "feat(sprints)!: conecta metricas por sprint na composition root"
```

---

### Task 4: `sprintId` em `MetricsSearchParams`

**Files:**
- Modify: `src/presentation/metrics-dashboard/parse-metrics-search-params.ts`

**Interfaces:**
- Produces: `MetricsSearchParams.sprintId?: string`.

- [ ] **Step 1: Adicionar o campo ao tipo**

```ts
// src/presentation/metrics-dashboard/parse-metrics-search-params.ts
export type MetricsSearchParams = {
	period?: string;
	date?: string;
	start?: string;
	end?: string;
	developer?: string;
	tags?: string;
	sprintId?: string;
};
```

(Nenhuma outra mudança no arquivo — `parseMetricsFilter`/`parseTagIds` continuam iguais; `sprintId` é lido diretamente por `app/metrics/page.tsx` no Task 7, fora dessas funções, porque decide um branch totalmente diferente.)

- [ ] **Step 2: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/presentation/metrics-dashboard/parse-metrics-search-params.ts
git commit -m "feat(sprints)!: adiciona sprintid aos search params de metricas"
```

---

### Task 5: Componente `MetricsSprintFilter`

**Files:**
- Create: `src/presentation/metrics-dashboard/metrics-sprint-filter.tsx`

**Interfaces:**
- Consumes: `Sprint`.
- Produces: `<MetricsSprintFilter sprints={...} periodFilter={<PeriodFilter .../>} />` — client component que decide, via query string (`sprintId`), se renderiza o `periodFilter` recebido (modo Período) ou um `<select>` de sprints (modo Sprint).

- [ ] **Step 1: Criar o componente**

```tsx
// src/presentation/metrics-dashboard/metrics-sprint-filter.tsx
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import type { Sprint } from "@/domain/sprint/entities/sprint";

type MetricsSprintFilterProps = {
	sprints: Sprint[];
	periodFilter: ReactNode;
};

function defaultSprintId(sprints: Sprint[]): string {
	const active = sprints.find((sprint) => sprint.status === "ACTIVE");
	if (active) return active.id;
	return [...sprints].sort((a, b) => b.startDate.localeCompare(a.startDate))[0]
		.id;
}

export function MetricsSprintFilter({
	sprints,
	periodFilter,
}: MetricsSprintFilterProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const selectedSprintId = searchParams.get("sprintId");

	if (sprints.length === 0) return <>{periodFilter}</>;

	function goToPeriod() {
		const params = new URLSearchParams(searchParams.toString());
		params.delete("sprintId");
		const query = params.toString();
		router.push(query ? `${pathname}?${query}` : pathname);
	}

	function goToSprint(sprintId: string) {
		const params = new URLSearchParams(searchParams.toString());
		params.set("sprintId", sprintId);
		router.push(`${pathname}?${params.toString()}`);
	}

	return (
		<div className="flex items-center gap-2">
			<div className="flex h-9 shrink-0 rounded-lg border border-(--border)">
				<button
					type="button"
					onClick={goToPeriod}
					aria-pressed={selectedSprintId === null}
					className={`cursor-pointer px-4 text-sm transition-colors ${
						selectedSprintId === null
							? "bg-(--accent) text-(--accent-fg)"
							: "hover:bg-white/10"
					}`}
				>
					Período
				</button>
				<button
					type="button"
					onClick={() =>
						goToSprint(selectedSprintId ?? defaultSprintId(sprints))
					}
					aria-pressed={selectedSprintId !== null}
					className={`cursor-pointer px-4 text-sm transition-colors ${
						selectedSprintId !== null
							? "bg-(--accent) text-(--accent-fg)"
							: "hover:bg-white/10"
					}`}
				>
					Sprint
				</button>
			</div>
			{selectedSprintId === null ? (
				periodFilter
			) : (
				<select
					value={selectedSprintId}
					onChange={(event) => goToSprint(event.target.value)}
					className="h-9 rounded-lg border border-(--border) px-2 text-sm"
				>
					{sprints.map((sprint) => (
						<option key={sprint.id} value={sprint.id}>
							{sprint.name}
						</option>
					))}
				</select>
			)}
		</div>
	);
}
```

- [ ] **Step 2: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/presentation/metrics-dashboard/metrics-sprint-filter.tsx
git commit -m "feat(sprints)!: adiciona seletor de periodo/sprint nas metricas"
```

---

### Task 6: Integrar ao `MetricsDashboard`

**Files:**
- Modify: `src/presentation/metrics-dashboard/metrics-dashboard.tsx`

**Interfaces:**
- Consumes: `MetricsSprintFilter` (Task 5).
- Produces: `MetricsDashboardProps` ganha `sprints: Sprint[]`.

- [ ] **Step 1: Adicionar o import**

```ts
// src/presentation/metrics-dashboard/metrics-dashboard.tsx — adicionar aos imports:
import type { Sprint } from "@/domain/sprint/entities/sprint";
import { MetricsSprintFilter } from "./metrics-sprint-filter";
```

- [ ] **Step 2: Adicionar `sprints` ao tipo e à desestruturação**

```ts
// em MetricsDashboardProps, adicionar logo após `tags: Tag[];`:
	sprints: Sprint[];
```

```ts
// na assinatura de export function MetricsDashboard({ ... }), adicionar `sprints,`
// logo após `tags,`.
```

- [ ] **Step 3: Envolver o `PeriodFilter` existente**

```tsx
// substituir o bloco atual:
//   <PeriodFilter
//     teamId={teamId}
//     saveMetricsPeriodPreferenceAction={saveMetricsPeriodPreferenceAction}
//     periodType={periodType}
//     referenceDate={referenceDate}
//     customStart={periodType === "CUSTOM" ? current.periodStart : undefined}
//     customEnd={periodType === "CUSTOM" ? current.periodEnd : undefined}
//   />
// por:
					<MetricsSprintFilter
						sprints={sprints}
						periodFilter={
							<PeriodFilter
								teamId={teamId}
								saveMetricsPeriodPreferenceAction={
									saveMetricsPeriodPreferenceAction
								}
								periodType={periodType}
								referenceDate={referenceDate}
								customStart={
									periodType === "CUSTOM" ? current.periodStart : undefined
								}
								customEnd={
									periodType === "CUSTOM" ? current.periodEnd : undefined
								}
							/>
						}
					/>
```

- [ ] **Step 4: Verificar que compila (erro esperado em `app/metrics/page.tsx` até o próximo task)**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: erro de "Property 'sprints' is missing" em `src/app/metrics/page.tsx` — corrigido no Task 7.

---

### Task 7: `app/metrics/page.tsx` — branch Período/Sprint

**Files:**
- Modify: `src/app/metrics/page.tsx`

**Interfaces:**
- Consumes: `createSprintUseCases().listSprintsByTeam`, `createMetricsUseCases().getMetricsForSprint` (Task 3).

- [ ] **Step 1: Atualizar a página**

```tsx
// src/app/metrics/page.tsx
import { redirect } from "next/navigation";
import { saveMetricsPeriodPreferenceAction } from "@/app/actions";
import { createMetricsUseCases } from "@/composition/metrics";
import { createSprintUseCases } from "@/composition/sprint";
import { createTaskUseCases } from "@/composition/task";
import { createTeamUseCases } from "@/composition/team";
import { MetricsDashboard } from "@/presentation/metrics-dashboard/metrics-dashboard";
import {
	type MetricsSearchParams,
	parseMetricsFilter,
	parseTagIds,
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
	const sprints = await createSprintUseCases().listSprintsByTeam(
		currentTeam.id,
	);
	const tags = await createTaskUseCases().listTags();
	const resolvedSearchParams = await searchParams;

	const selectedSprint = resolvedSearchParams.sprintId
		? sprints.find((sprint) => sprint.id === resolvedSearchParams.sprintId)
		: undefined;

	if (selectedSprint) {
		const { current, history } = await metricsUseCases.getMetricsForSprint(
			selectedSprint.id,
			currentTeam.id,
			currentTeam.wipLimit,
		);
		return (
			<MetricsDashboard
				teamId={currentTeam.id}
				saveMetricsPeriodPreferenceAction={saveMetricsPeriodPreferenceAction}
				periodType="CUSTOM"
				referenceDate={current.periodStart}
				current={current}
				history={history}
				tags={tags}
				selectedTagIds={[]}
				sprints={sprints}
			/>
		);
	}

	const preference = await metricsUseCases.getMetricsPeriodPreference(
		currentTeam.id,
	);
	const filter = parseMetricsFilter(
		resolvedSearchParams,
		undefined,
		preference,
	);
	const tagIds = parseTagIds(resolvedSearchParams);

	const { current, history } =
		filter.periodType === "CUSTOM"
			? await metricsUseCases.getMetricsDashboardForRange(
					currentTeam.id,
					filter.start,
					filter.end,
					currentTeam.wipLimit,
					tagIds,
				)
			: await metricsUseCases.getMetricsDashboard(
					currentTeam.id,
					filter.periodType,
					filter.referenceDate,
					currentTeam.wipLimit,
					tagIds,
				);

	return (
		<MetricsDashboard
			teamId={currentTeam.id}
			saveMetricsPeriodPreferenceAction={saveMetricsPeriodPreferenceAction}
			periodType={filter.periodType}
			referenceDate={filter.referenceDate}
			current={current}
			history={history}
			tags={tags}
			selectedTagIds={tagIds}
			sprints={sprints}
		/>
	);
}
```

- [ ] **Step 2: Verificar que o projeto inteiro compila**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/app/metrics/page.tsx
git commit -m "feat(sprints)!: liga filtro de sprint a tela de metricas"
```

---

### Task 8: Verificação final

- [ ] **Step 1: Rodar a suíte completa de testes**

Run: `npm run test`
Expected: todos os testes passam, incluindo os novos de `getMetricsForSprint` e a correção de `findBySprint`.

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

Run: `npm run dev`, abrir `/metrics` com um time que tenha ao menos uma sprint `CLOSED` e uma `ACTIVE`/`PLANNED`. Confirmar:
- O toggle "Período | Sprint" aparece só quando o time tem alguma sprint cadastrada.
- Selecionar "Sprint" mostra o dropdown de sprints; os números mudam para refletir o range da sprint selecionada.
- Numa sprint `CLOSED`, os números continuam os mesmos mesmo editando uma task que participou dela (lidos do snapshot).
- Voltar para "Período" restaura o filtro de período de antes.
- Se o ambiente não tiver `DATABASE_URL` configurado para o dev server, registrar essa limitação explicitamente em vez de assumir que a UI funciona — a cobertura fica pelos testes automatizados dos steps anteriores.

- [ ] **Step 6: Atualizar o grafo do graphify**

Run: `graphify update .`
Expected: grafo atualizado. Commitar com `chore(graphify)!: atualiza grafo apos filtro de sprint nas metricas`.

---

## Encerramento da spec

Com este plano, todos os quatro planos derivados de `docs/superpowers/specs/2026-07-23-pi-sprints-design.md` estarão implementados: fundação (PI/Sprint cadastráveis), atribuição de card + visão por sprint no quadro, ciclo de vida da sprint (iniciar/finalizar, overflow, snapshots, histórico), e filtro de sprint nas métricas. A feature completa descrita na spec original está coberta.
