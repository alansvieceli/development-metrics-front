# Colunas Testes e Aguardando Publicação Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar as colunas `TESTING` e `AWAITING_PUBLICATION` ao fluxo do quadro Kanban e generalizar retrabalho, WIP e tempo-em-status no motor de métricas para as seis colunas, conforme `docs/superpowers/specs/2026-07-18-kanban-testing-publication-columns-design.md`.

**Architecture:** Extensão de um enum existente (`TaskStatus`) e generalização de fórmulas já existentes em `application/metrics/formulas`; nenhuma entidade, port ou arquivo novo em `domain`/`application/ports`. UI (`kanban-board.tsx`, `task-form-modal.tsx`, `task-move-select.tsx`) já é dirigida por `STATUS_ORDER`/`STATUS_LABELS` e não precisa de mudança própria.

**Tech Stack:** Next.js 16, TypeScript strict, Drizzle ORM, Postgres 16, Vitest 4, Playwright 1.61.

## Global Constraints

- Antes de cada tarefa, localizar todos os chamadores com `rg` antes de generalizar uma função.
- Escrever o menor teste que falha, confirmar a causa, implementar e confirmar o sucesso.
- Nenhuma restrição nova de transição entre colunas: mover para qualquer status continua livre.
- Sem backfill de dados (spec confirma: não há dados em produção).
- `README.md` é atualizado na mesma tarefa que muda o comportamento que ele documenta (funcionalidades, regras de métricas), conforme `techdocs/guidelines.md`.
- Após cada tarefa: teste focado, `npm run typecheck` e `npm run lint`.
- Commits seguem `.githooks/commit-msg`, em português, um por tarefa.

---

### Task 1: Domain e apresentação — novas colunas do quadro

**Files:**
- Modify: `src/domain/task/entities/task.ts`
- Modify: `src/presentation/task/task-status-labels.ts`
- Modify: `src/application/task/use-cases/list-tasks-by-team.ts`, `src/application/task/use-cases/list-tasks-by-team.test.ts`
- Modify: `README.md`

**Interfaces:** Produces `TASK_STATUSES` com 6 valores (usado por todo o restante do plano).

- [ ] **Step 1: Escrever o teste e confirmar a falha**

Adicionar a `list-tasks-by-team.test.ts`:

```ts
it("agrupa tasks nas colunas de testes e aguardando publicacao", async () => {
	const repository = createFakeTaskRepository();
	const historyRepository = createFakeTaskHistoryRepository();
	repository.seed({ ...baseData, externalId: "TASK-4", status: "TESTING" });
	repository.seed({
		...baseData,
		externalId: "TASK-5",
		status: "AWAITING_PUBLICATION",
	});

	const result = await listTasksByTeam(
		repository,
		historyRepository,
		"team-1",
	);

	expect(result.TESTING.map((t) => t.externalId)).toEqual(["TASK-4"]);
	expect(result.AWAITING_PUBLICATION.map((t) => t.externalId)).toEqual([
		"TASK-5",
	]);
});
```

Run: `npm test -- src/application/task/use-cases/list-tasks-by-team.test.ts`. Expected: FAIL (erro de tipo, `"TESTING"` não é `TaskStatus`).

- [ ] **Step 2: Expandir o enum e os pontos que o consomem**

```ts
// src/domain/task/entities/task.ts
export const TASK_STATUSES = [
	"TODO",
	"IN_DEVELOPMENT",
	"CODE_REVIEW",
	"TESTING",
	"AWAITING_PUBLICATION",
	"DONE",
] as const;
```

```ts
// src/presentation/task/task-status-labels.ts
export const STATUS_LABELS: Record<TaskStatus, string> = {
	TODO: "A Fazer",
	IN_DEVELOPMENT: "Em Desenvolvimento",
	CODE_REVIEW: "Code Review",
	TESTING: "Testes",
	AWAITING_PUBLICATION: "Aguardando Publicação",
	DONE: "Concluído",
};

export const STATUS_ORDER: TaskStatus[] = [
	"TODO",
	"IN_DEVELOPMENT",
	"CODE_REVIEW",
	"TESTING",
	"AWAITING_PUBLICATION",
	"DONE",
];
```

```ts
// src/application/task/use-cases/list-tasks-by-team.ts (dentro de listTasksByTeam)
const grouped: TasksByStatus = {
	TODO: [],
	IN_DEVELOPMENT: [],
	CODE_REVIEW: [],
	TESTING: [],
	AWAITING_PUBLICATION: [],
	DONE: [],
};
```

- [ ] **Step 3: Rodar teste e typecheck**

Run: `npm test -- src/application/task/use-cases/list-tasks-by-team.test.ts && npm run typecheck`. Expected: PASS (o teste `it.each(TASK_STATUSES)` de `src/domain/task/entities/task.test.ts` é dirigido pelo próprio array e passa sem alteração).

- [ ] **Step 4: Atualizar README e commit**

Em `README.md`, seção "Funcionalidades": trocar `TODO`, `IN_DEVELOPMENT`, `CODE_REVIEW` e `DONE` pela lista das 6 colunas (`TODO`, `IN_DEVELOPMENT`, `CODE_REVIEW`, `TESTING`, `AWAITING_PUBLICATION` e `DONE`).

```powershell
git add src/domain/task/entities/task.ts src/presentation/task/task-status-labels.ts src/application/task/use-cases/list-tasks-by-team.ts src/application/task/use-cases/list-tasks-by-team.test.ts README.md
git commit -m "feat(kanban)!: adiciona colunas testes e aguardando publicacao"
```

### Task 2: Persistência — migração dos CHECK constraints

**Files:**
- Modify: `src/infrastructure/task/drizzle/schema.ts`
- Create: `drizzle/migrations/0005_task-status-testing-publication.sql` (gerado)
- Modify: `drizzle/migrations/meta/_journal.json` (gerado)

- [ ] **Step 1: Atualizar os três CHECK do schema**

```ts
// src/infrastructure/task/drizzle/schema.ts
check(
	"tasks_status_check",
	sql`${table.status} IN ('TODO', 'IN_DEVELOPMENT', 'CODE_REVIEW', 'TESTING', 'AWAITING_PUBLICATION', 'DONE')`,
),
```

```ts
check(
	"task_status_changes_from_status_check",
	sql`${table.fromStatus} IS NULL OR ${table.fromStatus} IN ('TODO', 'IN_DEVELOPMENT', 'CODE_REVIEW', 'TESTING', 'AWAITING_PUBLICATION', 'DONE')`,
),
check(
	"task_status_changes_to_status_check",
	sql`${table.toStatus} IN ('TODO', 'IN_DEVELOPMENT', 'CODE_REVIEW', 'TESTING', 'AWAITING_PUBLICATION', 'DONE')`,
),
```

- [ ] **Step 2: Gerar a migração**

Run: `npm run db:generate -- --name task-status-testing-publication`. Expected: cria `drizzle/migrations/0005_task-status-testing-publication.sql` com `DROP CONSTRAINT` + `ADD CONSTRAINT` para os três checks (os nomes já existem desde a migração 0004) e acrescenta a entrada `idx: 5` em `drizzle/migrations/meta/_journal.json`. Conferir manualmente que o SQL gerado contém as 6 colunas nos três constraints; se o drizzle-kit não gerar `DROP CONSTRAINT` automaticamente, editar o arquivo gerado para dropar o constraint antigo antes de recriá-lo (mesmo nome, novo `CHECK`).

- [ ] **Step 3: Aplicar em banco de teste e verificar**

Run (com Postgres local ativo, ver `devops/docker-compose.yml`): `$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/development_metrics_test"; npm run db:migrate`. Expected: migração aplicada sem erro; `INSERT` manual com `status = 'TESTING'` é aceito e com `status = 'INVALIDO'` é rejeitado pelo `CHECK`.

- [ ] **Step 4: Typecheck, lint e commit**

Run: `npm run typecheck; npm run lint`.

```powershell
git add src/infrastructure/task/drizzle/schema.ts drizzle/migrations
git commit -m "feat(banco)!: permite status testes e aguardando publicacao"
```

### Task 3: Motor de métricas — generalizar retrabalho e WIP

**Files:**
- Modify: `src/application/metrics/formulas/rate-metrics.ts`, `rate-metrics.test.ts`
- Modify: `src/infrastructure/metrics/drizzle-metrics-query-port.ts`, `drizzle-metrics-query-port.test.ts`

- [ ] **Step 1: Escrever os testes e confirmar a falha**

Adicionar a `rate-metrics.test.ts` (dentro de `describe("calculateReworkRate")`):

```ts
it("conta retrabalho a partir de TESTING -> IN_DEVELOPMENT", () => {
	const tasks = [
		completedTask({
			statusChanges: [
				{
					fromStatus: "TESTING",
					toStatus: "IN_DEVELOPMENT",
					changedAt: new Date("2026-07-01T01:00:00Z"),
				},
			],
		}),
	];
	expect(calculateReworkRate(tasks)).toBe(100);
});

it("conta retrabalho a partir de AWAITING_PUBLICATION -> IN_DEVELOPMENT", () => {
	const tasks = [
		completedTask({
			statusChanges: [
				{
					fromStatus: "AWAITING_PUBLICATION",
					toStatus: "IN_DEVELOPMENT",
					changedAt: new Date("2026-07-01T01:00:00Z"),
				},
			],
		}),
	];
	expect(calculateReworkRate(tasks)).toBe(100);
});

it("nao conta volta para CODE_REVIEW como retrabalho", () => {
	const tasks = [
		completedTask({
			statusChanges: [
				{
					fromStatus: "TESTING",
					toStatus: "CODE_REVIEW",
					changedAt: new Date("2026-07-01T01:00:00Z"),
				},
			],
		}),
	];
	expect(calculateReworkRate(tasks)).toBe(0);
});
```

Adicionar a `drizzle-metrics-query-port.test.ts`, substituindo o teste `"conta o WIP como tasks em desenvolvimento ou code review"`:

```ts
it("conta o WIP como tasks fora de todo e concluido", async () => {
	await insertTask({ externalId: "TASK-1", status: "IN_DEVELOPMENT" });
	await insertTask({ externalId: "TASK-2", status: "CODE_REVIEW" });
	await insertTask({ externalId: "TASK-3", status: "TESTING" });
	await insertTask({ externalId: "TASK-4", status: "AWAITING_PUBLICATION" });
	await insertTask({ externalId: "TASK-5", status: "TODO" });
	await insertTask({ externalId: "TASK-6", status: "DONE" });

	const snapshot = await drizzleMetricsQueryPort.loadSnapshot(
		TEAM_ID,
		new Date("2026-07-01T00:00:00Z"),
		new Date("2026-08-01T00:00:00Z"),
	);
	expect(snapshot.wip).toBe(4);
});
```

Run: `npm test -- src/application/metrics/formulas/rate-metrics.test.ts`. Expected: FAIL nos dois primeiros casos novos (fórmula ainda só reconhece `CODE_REVIEW`/`DONE`).

- [ ] **Step 2: Generalizar `calculateReworkRate`**

```ts
// src/application/metrics/formulas/rate-metrics.ts
const reworkCount = tasks.filter((task) =>
	task.statusChanges.some(
		(change) =>
			change.toStatus === "IN_DEVELOPMENT" &&
			change.fromStatus !== null &&
			change.fromStatus !== "TODO" &&
			change.fromStatus !== "IN_DEVELOPMENT",
	),
).length;
```

- [ ] **Step 3: Generalizar a query de WIP**

```ts
// src/infrastructure/metrics/drizzle-metrics-query-port.ts
import { and, asc, count, eq, gte, inArray, isNotNull, lt, min, ne } from "drizzle-orm";
```

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

- [ ] **Step 4: Rodar testes, typecheck, lint e commit**

Run: `npm test -- src/application/metrics/formulas/rate-metrics.test.ts src/infrastructure/metrics/drizzle-metrics-query-port.test.ts; npm run typecheck; npm run lint`. Expected: PASS.

```powershell
git add src/application/metrics/formulas/rate-metrics.ts src/application/metrics/formulas/rate-metrics.test.ts src/infrastructure/metrics/drizzle-metrics-query-port.ts src/infrastructure/metrics/drizzle-metrics-query-port.test.ts
git commit -m "feat(metricas)!: generaliza retrabalho e wip para novas colunas"
```

### Task 4: Motor de métricas — tempo em status genérico e métricas novas

**Files:**
- Modify: `src/application/metrics/formulas/duration-metrics.ts`, `duration-metrics.test.ts`
- Modify: `src/application/metrics/use-cases/get-metrics-for-period.ts`, `get-metrics-for-period.test.ts`
- Modify: `src/presentation/metrics-dashboard/metric-definitions.ts`
- Modify: `README.md`

**Interfaces:** Produces `calculateTimeInStatus(tasks: CompletedTaskMetrics[], status: TaskStatus): DurationStats | null` (substitui `calculateCodeReviewTime`). `PeriodMetrics` ganha `testingTime` e `awaitingPublicationTime`.

- [ ] **Step 1: Escrever o teste e confirmar a falha**

Em `duration-metrics.test.ts`, renomear o `describe("calculateCodeReviewTime", ...)` para `describe("calculateTimeInStatus", ...)`, trocar as duas chamadas existentes para `calculateTimeInStatus(tasks, "CODE_REVIEW")` e acrescentar:

```ts
it("calcula tempo em qualquer status informado", () => {
	const tasks = [
		task({
			statusChanges: [
				{
					fromStatus: "CODE_REVIEW",
					toStatus: "TESTING",
					changedAt: new Date("2026-07-01T00:00:00Z"),
				},
				{
					fromStatus: "TESTING",
					toStatus: "AWAITING_PUBLICATION",
					changedAt: new Date("2026-07-01T02:00:00Z"),
				},
			],
		}),
	];
	expect(calculateTimeInStatus(tasks, "TESTING")?.averageMs).toBe(
		2 * 60 * 60 * 1000,
	);
});
```

Run: `npm test -- src/application/metrics/formulas/duration-metrics.test.ts`. Expected: FAIL (`calculateTimeInStatus` não existe).

- [ ] **Step 2: Generalizar a fórmula**

```ts
// src/application/metrics/formulas/duration-metrics.ts
import type { TaskStatus } from "@/domain/task/entities/task";

export function calculateTimeInStatus(
	tasks: CompletedTaskMetrics[],
	status: TaskStatus,
): DurationStats | null {
	const durations = tasks.map((task) => {
		const sorted = [...task.statusChanges].sort(
			(a, b) => a.changedAt.getTime() - b.changedAt.getTime(),
		);
		let total = 0;
		for (let i = 0; i < sorted.length; i++) {
			const next = sorted[i + 1];
			if (sorted[i].toStatus === status && next) {
				total += next.changedAt.getTime() - sorted[i].changedAt.getTime();
			}
		}
		return total;
	});
	return computeDurationStats(durations);
}
```

Remover `calculateCodeReviewTime`.

- [ ] **Step 3: Orquestrar as três métricas de tempo em status**

```ts
// src/application/metrics/use-cases/get-metrics-for-period.ts
import { calculateTimeInStatus, /* ...demais imports existentes... */ } from "@/application/metrics/formulas/duration-metrics";
```

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
	throughput: number;
	wip: number;
	predictability: number | null;
};
```

```ts
	codeReviewTime: calculateTimeInStatus(completedTasks, "CODE_REVIEW"),
	testingTime: calculateTimeInStatus(completedTasks, "TESTING"),
	awaitingPublicationTime: calculateTimeInStatus(
		completedTasks,
		"AWAITING_PUBLICATION",
	),
```

Em `get-metrics-for-period.test.ts`, no segundo caso (`"retorna vazio/zero quando o período não tem dados"`), acrescentar:

```ts
expect(metrics.testingTime).toBeNull();
expect(metrics.awaitingPublicationTime).toBeNull();
```

- [ ] **Step 4: Adicionar os dois cards ao dashboard**

```ts
// src/presentation/metrics-dashboard/metric-definitions.ts
export type MetricKey =
	| "leadTime"
	| "cycleTime"
	| "blockedTime"
	| "codeReviewTime"
	| "testingTime"
	| "awaitingPublicationTime"
	| "reworkRate"
	| "throughput"
	| "wip"
	| "predictability";
```

```ts
	{
		key: "codeReviewTime",
		label: "Tempo aguardando code review",
		shape: "duration-dual",
	},
	{ key: "testingTime", label: "Tempo em testes", shape: "duration-dual" },
	{
		key: "awaitingPublicationTime",
		label: "Tempo aguardando publicação",
		shape: "duration-dual",
	},
```

(mantém as demais entradas do array como estão).

- [ ] **Step 5: Rodar testes, typecheck, lint, atualizar README e commit**

Run: `npm test -- src/application/metrics; npm run typecheck; npm run lint`. Expected: PASS; nenhuma referência restante a `calculateCodeReviewTime` (`rg calculateCodeReviewTime src` sem saída).

Em `README.md`: trocar "oito métricas" por "dez métricas" na seção Funcionalidades; na tabela "Regras das métricas", generalizar a linha **Taxa de retrabalho** ("volta de `CODE_REVIEW` ou `DONE`" → "volta de qualquer status diferente de `TODO`/`IN_DEVELOPMENT`"), generalizar a linha **WIP** ("em `IN_DEVELOPMENT` ou `CODE_REVIEW`" → "em qualquer status diferente de `TODO` e `DONE`") e adicionar duas linhas novas, **Tempo em Testes** e **Tempo Aguardando Publicação**, com a mesma redação da linha de tempo em code review trocando a coluna.

```powershell
git add src/application/metrics src/presentation/metrics-dashboard/metric-definitions.ts README.md
git commit -m "feat(metricas)!: adiciona metricas de tempo em testes e publicacao"
```

### Final Verification

Run:

```powershell
rg calculateCodeReviewTime src
npm run typecheck
npm run lint
npm run knip
npm test
npm run build
npm run test:e2e
```

Expected: `rg` sem ocorrências; todos os gates exit 0; quadro com 6 colunas e dashboard com 10 cards funcionando manualmente (`npm run dev`, criar/mover uma task por `Testes` e `Aguardando Publicação`).
