# Indicador de Semana/Mês no Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar um rótulo textual ("Semana N · dd/mm – dd/mm" ou "Mês de Ano") no cabeçalho do dashboard de métricas, conforme `docs/superpowers/specs/2026-07-18-metrics-period-label-design.md`.

**Architecture:** Função pura nova em `presentation/metrics-dashboard`, consumindo `current.periodStart`/`current.periodEnd` que `MetricsDashboard` já recebe. Nenhuma mudança em `application`, `domain` ou `infrastructure`.

**Tech Stack:** Next.js 16 (Server Component), TypeScript strict, `Intl`/`toLocaleDateString`.

## Global Constraints

- Nenhum dado novo buscado: `current.periodStart`/`current.periodEnd` já chegam prontos.
- Semana ISO 8601 (segunda a domingo, semana 1 = a que contém a primeira quinta-feira do ano).
- Após cada tarefa: teste focado, `npm run typecheck` e `npm run lint`.
- `README.md` não precisa mudar (mudança puramente de apresentação, sem nova regra de negócio a documentar na seção "Regras das métricas").

---

### Task 1: `formatPeriodLabel`

**Files:**
- Create: `src/presentation/metrics-dashboard/format-period-label.ts`, `format-period-label.test.ts`

**Interfaces:** Produces `formatPeriodLabel(periodType: PeriodType, periodStart: Date, periodEnd: Date): string`.

- [ ] **Step 1: Escrever os testes e confirmar a falha**

```ts
import { describe, expect, it } from "vitest";
import { formatPeriodLabel } from "./format-period-label";

describe("formatPeriodLabel", () => {
	it("formata uma semana comum com o número ISO e o intervalo de datas", () => {
		expect(
			formatPeriodLabel(
				"WEEK",
				new Date("2026-07-13T00:00:00Z"),
				new Date("2026-07-20T00:00:00Z"),
			),
		).toBe("Semana 29 · 13/07 – 19/07");
	});

	it("atribui a semana que começa em dezembro à semana 1 do ano seguinte", () => {
		expect(
			formatPeriodLabel(
				"WEEK",
				new Date("2025-12-29T00:00:00Z"),
				new Date("2026-01-05T00:00:00Z"),
			),
		).toBe("Semana 1 · 29/12 – 04/01");
	});

	it("formata o mês por extenso e capitalizado", () => {
		expect(
			formatPeriodLabel(
				"MONTH",
				new Date("2026-07-01T00:00:00Z"),
				new Date("2026-08-01T00:00:00Z"),
			),
		).toBe("Julho de 2026");
	});
});
```

Run: `npm test -- src/presentation/metrics-dashboard/format-period-label.test.ts`. Expected: FAIL (módulo não existe).

- [ ] **Step 2: Implementar**

```ts
// src/presentation/metrics-dashboard/format-period-label.ts
import type { PeriodType } from "@/application/metrics/period";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function getIsoWeekNumber(monday: Date): number {
	const thursday = new Date(monday);
	thursday.setUTCDate(thursday.getUTCDate() + 3);
	const isoYear = thursday.getUTCFullYear();
	const jan4 = new Date(Date.UTC(isoYear, 0, 4));
	const jan4DayNr = (jan4.getUTCDay() + 6) % 7;
	const firstThursday = new Date(jan4);
	firstThursday.setUTCDate(jan4.getUTCDate() - jan4DayNr + 3);
	return (
		1 +
		Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * MS_PER_DAY))
	);
}

function formatDayMonth(date: Date): string {
	return date.toLocaleDateString("pt-BR", {
		day: "2-digit",
		month: "2-digit",
		timeZone: "UTC",
	});
}

function capitalize(value: string): string {
	return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatPeriodLabel(
	periodType: PeriodType,
	periodStart: Date,
	periodEnd: Date,
): string {
	if (periodType === "MONTH") {
		const month = capitalize(
			periodStart.toLocaleDateString("pt-BR", {
				month: "long",
				timeZone: "UTC",
			}),
		);
		return `${month} de ${periodStart.getUTCFullYear()}`;
	}
	const week = getIsoWeekNumber(periodStart);
	const lastDay = new Date(periodEnd.getTime() - MS_PER_DAY);
	return `Semana ${week} · ${formatDayMonth(periodStart)} – ${formatDayMonth(lastDay)}`;
}
```

- [ ] **Step 3: Rodar, typecheck, lint e commit**

Run: `npm test -- src/presentation/metrics-dashboard/format-period-label.test.ts; npm run typecheck; npm run lint`. Expected: PASS.

```powershell
git add src/presentation/metrics-dashboard/format-period-label.ts src/presentation/metrics-dashboard/format-period-label.test.ts
git commit -m "feat(metricas)!: adiciona formatacao do rotulo de periodo do dashboard"
```

### Task 2: Renderizar o rótulo no dashboard

**Files:**
- Modify: `src/presentation/metrics-dashboard/metrics-dashboard.tsx`
- Modify: `tests/integration/metrics-dashboard.spec.ts`

- [ ] **Step 1: Escrever o E2E e confirmar a falha**

```ts
test("mostra o rótulo do período no cabeçalho e atualiza ao trocar de mês", async ({
	page,
}) => {
	await page.getByRole("link", { name: "Métricas" }).click();
	await expect(page.getByText(/^Semana \d+ · \d{2}\/\d{2} – \d{2}\/\d{2}$/)).toBeVisible();

	await page.getByRole("button", { name: "Mês" }).click();
	await expect(page.getByText(/^[A-ZÀ-Ú][a-zà-ú]+ de \d{4}$/)).toBeVisible();
});
```

Run: `npm run test:e2e -- tests/integration/metrics-dashboard.spec.ts`. Expected: FAIL (rótulo ainda não é renderizado).

- [ ] **Step 2: Renderizar no cabeçalho**

```tsx
// src/presentation/metrics-dashboard/metrics-dashboard.tsx
import { formatPeriodLabel } from "./format-period-label";
```

```tsx
<div className="flex items-center justify-between">
	<div className="flex items-center gap-3">
		<h1 className="text-xl font-semibold">Métricas</h1>
		<span className="text-sm opacity-70">
			{formatPeriodLabel(periodType, current.periodStart, current.periodEnd)}
		</span>
	</div>
	<PeriodFilter periodType={periodType} referenceDate={referenceDate} />
</div>
```

- [ ] **Step 3: Rodar E2E, typecheck, lint e commit**

Run: `npm run test:e2e -- tests/integration/metrics-dashboard.spec.ts; npm run typecheck; npm run lint`. Expected: PASS.

```powershell
git add src/presentation/metrics-dashboard/metrics-dashboard.tsx tests/integration/metrics-dashboard.spec.ts
git commit -m "feat(metricas)!: exibe rotulo de semana ou mes no dashboard"
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
