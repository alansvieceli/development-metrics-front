# Project Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir os 12 riscos confirmados de segurança, integridade, arquitetura, UX, automação e desempenho sem adicionar dependências.

**Architecture:** `app` valida a forma e resolve o contexto da requisição; `application` mantém regras, autorização e ports; `infrastructure` concentra Drizzle, SQL, locks e transações. As tarefas formam 12 commits e cinco checkpoints de PR conforme `docs/superpowers/specs/2026-07-18-project-hardening-design.md`.

**Tech Stack:** Next.js 16, React 19, TypeScript strict, Drizzle ORM, Postgres 16, Vitest 4, Playwright 1.61, Biome 2 e Knip 6.

## Global Constraints

- Antes de cada tarefa, ler `techdocs/guidelines.md` e `techdocs/architecture.md` e localizar chamadores com `rg`.
- Escrever o menor teste que falha, confirmar a causa, implementar na origem e confirmar o sucesso.
- Não adicionar dependências, FK entre `team`/`task`, cascata de tasks, toast, Context de Actions, cache ou WIP histórico.
- SQL, Drizzle e tipos ORM permanecem em `infrastructure`; erros esperados usam `ApplicationError`.
- Após cada tarefa: teste focado, `npm run typecheck` e `npm run lint`.
- Em cada checkpoint: `npm run knip`, `npm test`, `npm run build` e `npm run test:e2e` além dos gates anteriores.
- Commits seguem `.githooks/commit-msg`, em português e sem misturar tarefas.

---

## PR 1 — Proteções e automação

### Task 1: Isolar o banco de testes

**Files:**
- Create: `scripts/test-database-url.ts`, `scripts/test-database-url.test.ts`
- Modify: `vitest.config.ts`, `vitest.global-setup.ts`, `playwright.config.ts`
- Modify: `tests/integration/global-setup.ts`, `tests/integration/reset-db.ts`, `README.md`

**Interfaces:** Produces `getTestDatabaseUrl(value?: string): string`.

- [ ] **Step 1: Escrever o teste e confirmar a falha**

```ts
import { describe, expect, it } from "vitest";
import { getTestDatabaseUrl } from "./test-database-url";

describe("getTestDatabaseUrl", () => {
	it("aceita banco _test", () => {
		const url = "postgresql://postgres:postgres@localhost:5432/development_metrics_test";
		expect(getTestDatabaseUrl(url)).toBe(url);
	});
	it.each([
		"postgresql://localhost/development_metrics",
		"postgresql://localhost/",
		"https://localhost/development_metrics_test",
		"url inválida",
	])("rejeita %s", (url) => expect(() => getTestDatabaseUrl(url)).toThrow("TEST_DATABASE_URL"));
});
```

Adicionar `scripts/**/*.test.ts` ao `include` do Vitest. Run: `npm test -- scripts/test-database-url.test.ts`. Expected: FAIL por módulo ausente.

- [ ] **Step 2: Implementar o guard**

```ts
const DEFAULT_URL = "postgresql://postgres:postgres@localhost:5432/development_metrics_test";
export function getTestDatabaseUrl(value = process.env.TEST_DATABASE_URL ?? DEFAULT_URL) {
	let url: URL;
	try { url = new URL(value); } catch { throw new Error("TEST_DATABASE_URL deve ser uma URL PostgreSQL válida"); }
	const database = decodeURIComponent(url.pathname.slice(1));
	if (!['postgres:', 'postgresql:'].includes(url.protocol) || !database || database.includes('/') || !database.endsWith('_test'))
		throw new Error("TEST_DATABASE_URL deve apontar para banco terminado em _test");
	return value;
}
```

- [ ] **Step 3: Proteger todos os caminhos destrutivos**

Vitest e Playwright usam `const TEST_DATABASE_URL = getTestDatabaseUrl()` e só depois o repassam como `DATABASE_URL`. Ambos os global setups chamam `migrateDatabase(getTestDatabaseUrl())`. Em `reset-db.ts`, validar antes do import que cria client:

```ts
export async function resetDatabase() {
	getTestDatabaseUrl();
	const [{ sql }, { db }, { seedDefaultTaskTypes }] = await Promise.all([
		import("drizzle-orm"), import("@/infrastructure/db/client"),
		import("@/infrastructure/task/drizzle/seed-task-types"),
	]);
	await db.execute(sql`TRUNCATE TABLE task_blocked_periods, task_status_changes, tasks, task_types, members, teams RESTART IDENTITY CASCADE`);
	await seedDefaultTaskTypes();
}
```

Remover todo fallback para `DATABASE_URL`; documentar `TEST_DATABASE_URL` no README.

- [ ] **Step 4: Verificar e commit**

Run: `npm test -- scripts/test-database-url.test.ts`; depois `$env:TEST_DATABASE_URL="postgresql://localhost/development_metrics"; npm test`. Expected: PASS; depois falha antes da migração.

```powershell
git add scripts vitest.config.ts vitest.global-setup.ts playwright.config.ts tests/integration README.md
git commit -m "fix(testes)!: impede uso de banco real nos testes"
```

### Task 2: Adicionar CI

**Files:** Create `.github/workflows/ci.yml`; modify `package.json`, `README.md`.

- [ ] **Step 1: Configurar Biome e workflow**

Alterar `lint` para `biome ci .`, mantendo `lint:fix`. Criar workflow:

```yaml
name: CI
on:
  pull_request:
  push:
    branches: [master]
permissions:
  contents: read
env:
  TEST_DATABASE_URL: postgresql://postgres:postgres@localhost:5432/development_metrics_test
jobs:
  quality:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_USER: postgres, POSTGRES_PASSWORD: postgres, POSTGRES_DB: development_metrics_test }
        ports: [5432:5432]
        options: --health-cmd "pg_isready -U postgres -d development_metrics_test" --health-interval 10s --health-timeout 5s --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run knip
      - run: npm test
      - run: npm run build
  e2e:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_USER: postgres, POSTGRES_PASSWORD: postgres, POSTGRES_DB: development_metrics_test }
        ports: [5432:5432]
        options: --health-cmd "pg_isready -U postgres -d development_metrics_test" --health-interval 10s --health-timeout 5s --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
```

- [ ] **Step 2: Verificar e commit**

Run: `npm run typecheck; npm run lint; npm run knip; npm test; npm run build`. Expected: exit 0. Documentar no README; branch protection externa exigirá `quality` e `e2e`.

```powershell
git add .github package.json README.md
git commit -m "ci(github)!: adiciona gates automatizados do projeto"
```

### Task 3: Validar cookie, rota e seleção UUID

**Files:**
- Create: `src/application/shared/validation.ts`, `validation.test.ts`
- Create: `src/application/team/use-cases/select-team.ts`, `select-team.test.ts`
- Modify: `get-current-team.ts`, `get-current-team.test.ts`, `src/composition/team.ts`
- Modify: both `src/app/**/teams/[teamId]/page.tsx`, `tests/integration/team-selection.spec.ts`

**Interfaces:** Produces `isUuid(value: unknown): value is string`.

- [ ] **Step 1: Testar e implementar UUID**

```ts
it("aceita UUID canônico", () => expect(isUuid("550e8400-e29b-41d4-a716-446655440000")).toBe(true));
it.each([null, undefined, "abc", "550e8400e29b41d4a716446655440000"])("rejeita %s", value => expect(isUuid(value)).toBe(false));
```

```ts
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(value: unknown): value is string {
	return typeof value === "string" && UUID_PATTERN.test(value);
}
```

Em get-current-team, `if (!isUuid(teamId)) return null`. Testar com `vi.spyOn(repository, "findById")` e `expect(findById).not.toHaveBeenCalled()`.

- [ ] **Step 2: Selecionar somente time existente**

```ts
export async function selectTeam(store: CurrentTeamStore, repository: TeamRepository, teamId: string) {
	if (!isUuid(teamId) || !(await repository.findById(teamId))) throw new Error("Time não encontrado");
	await store.set(teamId);
}
```

Testar time existente grava uma vez e inexistente não grava. Usar o caso na composição.

- [ ] **Step 3: Proteger páginas e E2E**

Após params, nas duas páginas: `if (!isUuid(teamId)) notFound();`.

```ts
test("cookie e rota malformados não produzem 500", async ({ page, context }) => {
	await context.addCookies([{ name: "current-team-id", value: "abc", url: "http://localhost:3100" }]);
	await page.goto("/board");
	await expect(page).toHaveURL(/\/teams$/);
	expect((await page.goto("/teams/abc"))?.status()).toBe(404);
});
```

Run focused unit/E2E; expected PASS. Commit: `fix(times)!: valida ids de time antes do banco`.

### Task 4: Rejeitar datas inexistentes

**Files:** Modify shared validation/test and metrics parser/test.

- [ ] **Step 1: Testar matriz e confirmar normalização indevida**

```ts
it.each([["2026-02-28", true], ["2026-02-29", false], ["2028-02-29", true], ["2026-02-31", false], ["2026-13-01", false]])(
	"valida %s", (value, valid) => expect(Boolean(parseDateOnly(value))).toBe(valid),
);
```

- [ ] **Step 2: Implementar e reutilizar**

```ts
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
export function parseDateOnly(value: unknown): Date | null {
	if (typeof value !== "string") return null;
	const match = DATE_ONLY.exec(value); if (!match) return null;
	const parsed = new Date(`${value}T00:00:00Z`);
	return parsed.getUTCFullYear() === Number(match[1]) && parsed.getUTCMonth() === Number(match[2]) - 1 && parsed.getUTCDate() === Number(match[3]) ? parsed : null;
}
```

Parser usa `parseDateOnly(searchParams.date) ?? now`. Run focused tests/typecheck/lint. Commit: `fix(metricas)!: rejeita datas inexistentes nos filtros`.

### PR 1 checkpoint

Run: `npm run typecheck; npm run lint; npm run knip; npm test; npm run build; npm run test:e2e`. Expected: exit 0 somente com banco `_test`.

---

## PR 2 — Integridade das entradas e gravações

### Task 5: Validar mutações e pertencimento

**Files:**
- Create: `src/application/shared/application-error.ts`, `src/application/team/contracts/team-access.ts`
- Modify: task entity/test, team repository/fake/adapter/tests
- Modify: task mutation use cases/tests/fakes, task composition
- Modify: board/team/task-type Actions and board presentation payload
- Modify: task schema; create `drizzle/migrations/0004_validate-task-status.sql`

**Interfaces:** Produces `ApplicationError`, `TASK_STATUSES`, `isTaskStatus`, `TeamAccess`.

- [ ] **Step 1: Criar tipos puros e testes**

```ts
export class ApplicationError extends Error {}
export const TASK_STATUSES = ["TODO", "IN_DEVELOPMENT", "CODE_REVIEW", "DONE"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export const isTaskStatus = (value: unknown): value is TaskStatus => typeof value === "string" && TASK_STATUSES.includes(value as TaskStatus);
export type TeamAccess = { teamExists(teamId: string): Promise<boolean>; memberBelongsToTeam(memberId: string, teamId: string): Promise<boolean> };
```

Testar quatro válidos e `HACKED`; esperado FAIL antes e PASS depois.

- [ ] **Step 2: Implementar acesso de team**

Fazer `TeamRepository` estender `TeamAccess`; fake e Drizzle implementam `teamExists`/`memberBelongsToTeam` com `select({id}).where(...).limit(1)`. Testar inexistente e membro de outro time.

- [ ] **Step 3: Testar regras nos casos de uso**

Adicionar casos para tipo inexistente, membro de outro time, data inválida e task de outro time em create/update/delete/move/toggle:

```ts
await expect(moveTask(repository, history, OTHER_TEAM_ID, task.id, "DONE")).rejects.toThrow("Task não encontrada");
await expect(createTask(repository, history, typeRepository, teamAccess, { ...input, dueDate: "2026-02-31" })).rejects.toThrow("Data prevista inválida");
```

- [ ] **Step 4: Implementar regras na aplicação**

Create verifica time, tipo, membro e dueDate. Update verifica task/time, tipo e membro. Delete/move/toggle verificam task/time. Rename/remove member recebem teamId e confirmam pertencimento. Todas as falhas conhecidas lançam `ApplicationError`.

- [ ] **Step 5: Validar Actions antes da composição**

Board define `CreateTaskActionInput = Omit<CreateTaskInput, "teamId">`, resolve current team no servidor e valida UUID/status/boolean/data/texto. Remover teamId de TaskFormModal, Kanban e BoardPage. Team/task-type Actions validam IDs; member Actions passam teamId ao caso de uso.

- [ ] **Step 6: Criar checks e migração**

Schema usa `check/sql` para tasks.status e history from/to. Gerar `npx drizzle-kit generate --custom --name validate-task-status` e preencher:

```sql
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_status_check" CHECK ("status" IN ('TODO','IN_DEVELOPMENT','CODE_REVIEW','DONE'));
ALTER TABLE "task_status_changes" ADD CONSTRAINT "task_status_changes_from_status_check" CHECK ("from_status" IS NULL OR "from_status" IN ('TODO','IN_DEVELOPMENT','CODE_REVIEW','DONE'));
ALTER TABLE "task_status_changes" ADD CONSTRAINT "task_status_changes_to_status_check" CHECK ("to_status" IN ('TODO','IN_DEVELOPMENT','CODE_REVIEW','DONE'));
```

Run task/team/domain/infra tests, typecheck, lint. Commit: `fix(entradas)!: valida mutacoes e pertencimento ao time`.

### Task 6: Tornar task e histórico atômicos

**Files:** Modify TaskRepository, TaskHistoryRepository, create/move/toggle use cases/tests/fakes, task adapters/tests, metrics fixtures, composition.

**Interfaces:** Produces:

```ts
createWithInitialHistory(data: CreateTaskData): Promise<Task>;
moveWithHistory(taskId: string, toStatus: TaskStatus): Promise<Task>;
setBlockedWithHistory(taskId: string, blocked: boolean): Promise<Task>;
```

- [ ] **Step 1: Alterar ports/fakes e confirmar erros de tipo**

Remover escritas de TaskHistoryRepository, mantendo `getStatusChangedAtForTasks`. Fake task expõe helper `seed` e as três operações atômicas. Run typecheck; expected FAIL em callers antigos.

- [ ] **Step 2: Delegar uma operação por caso de uso**

Após validações: create retorna `repository.createWithInitialHistory(data)`; move retorna `repository.moveWithHistory`; toggle retorna `repository.setBlockedWithHistory`. Remover history desses três casos/composição.

- [ ] **Step 3: Implementar transações**

Create insere task+histórico no mesmo `db.transaction`. Move/toggle leem com:

```ts
const [row] = await tx.select().from(tasks).where(eq(tasks.id, taskId)).for("update");
if (!row) throw new ApplicationError("Task não encontrada");
```

No-op quando estado coincide; caso contrário atualizar task e inserir/fechar histórico no mesmo callback. Desbloqueio sem período aberto lança e reverte.

- [ ] **Step 4: Testar rollback e concorrência**

No teste Drizzle, criar trigger temporário que lança em insert de history, chamar move e confirmar status antigo; remover trigger em `finally`. Em outro teste executar duas `setBlockedWithHistory(..., true)` em `Promise.all` e confirmar `count(*) === 1` em blocked periods. Fixtures de metrics fazem inserts explícitos; adapter de history fica somente leitura.

Run `rg` por escritas antigas e testes task/metrics; expected nenhuma escrita de produção antiga e PASS. Commit: `fix(historico)!: grava task e historico atomicamente`.

### Task 7: Proteger exclusão de time e membro

**Files:** Create `src/application/task/contracts/task-usage-query.ts`; modify task port/adapter/tests, delete-team/remove-member tests/use cases, team composition.

- [ ] **Step 1: Testar bloqueio sem alteração**

```ts
const usage = { hasTasksForTeam: async () => true, hasTasksForAssignee: async () => true };
await expect(deleteTeam(repository, usage, team.id)).rejects.toThrow("Time possui tasks");
expect(await repository.findById(team.id)).toEqual(team);
await expect(removeMember(repository, usage, team.id, member.id)).rejects.toThrow("responsável por tasks");
```

- [ ] **Step 2: Implementar contrato e regra**

```ts
export type TaskUsageQuery = { hasTasksForTeam(teamId: string): Promise<boolean>; hasTasksForAssignee(assigneeId: string): Promise<boolean> };
```

TaskRepository estende contrato; Drizzle usa `SELECT id ... LIMIT 1`. Delete/remove lançam ApplicationError quando usado; remove confirma membro/time. Injetar drizzleTaskRepository na composição team.

Run team/task tests/typecheck/lint. Commit: `fix(exclusao)!: protege times e membros vinculados a tasks`.

### PR 2 checkpoint

Aplicar migrações em banco `_test` vazio e executar todos os gates. Expected: migração limpa e exit 0.

---

## PR 3 — Fronteira e experiência da UI

### Task 8: Passar Server Actions por props

**Files:** Modify app layout/board page, TeamSwitcher, KanbanBoard, TaskCard, TaskFormModal, TaskMoveSelect.

- [ ] **Step 1: Confirmar violação e definir props**

Run: `rg 'from "@/app/' src/presentation`. Expected: três ocorrências.

TeamSwitcher recebe `selectTeamAction`; TaskMoveSelect recebe `moveTaskAction`; variantes de TaskFormModal recebem somente callbacks usados. Kanban recebe cinco Actions e TaskCard quatro. App layout e board page importam Actions e iniciam o encadeamento.

- [ ] **Step 2: Verificar e commit**

Run `rg` novamente (sem saída), typecheck e E2E de board/team. Commit: `refactor(apresentacao)!: injeta server actions por propriedades`.

### Task 9: Consolidar modais com dialog nativo

**Files:** Create `src/presentation/shared/route-modal.tsx`; modify `src/presentation/shared/modal.tsx`, `src/presentation/task/task-form-modal.tsx`, `src/app/@modal/(.)teams/page.tsx`, `src/app/@modal/(.)teams/[teamId]/page.tsx`, `tests/integration/kanban-board.spec.ts`, `tests/integration/team-selection.spec.ts`.

- [ ] **Step 1: Escrever E2E de acessibilidade/foco**

```ts
const trigger = page.getByRole("button", { name: "Nova task" });
await trigger.click();
const dialog = page.getByRole("dialog", { name: "Nova task" });
await expect(dialog).toBeVisible();
await page.keyboard.press("Escape");
await expect(dialog).toBeHidden();
await expect(trigger).toBeFocused();
```

Adicionar casos de botão Fechar e click nas coordenadas do backdrop. Expected: FAIL no role/foco.

- [ ] **Step 2: Implementar Modal controlado**

```tsx
export function Modal({ children, label, onClose }: { children: ReactNode; label: string; onClose: () => void }) {
	const ref = useRef<HTMLDialogElement>(null);
	useEffect(() => { ref.current?.showModal(); }, []);
	function close() { ref.current?.close(); onClose(); }
	return <dialog ref={ref} aria-label={label} onCancel={(e) => { e.preventDefault(); close(); }}
		onClick={(e) => { if (e.target === e.currentTarget) close(); }}
		className="m-auto max-h-[85vh] w-full max-w-md rounded-lg bg-(--background) p-6 shadow-xl backdrop:bg-black/50">
		<button type="button" aria-label="Fechar" onClick={close}><X size={18} aria-hidden="true" /></button>{children}
	</dialog>;
}
```

Criar `RouteModal`, Client Component que usa `useRouter()` e renderiza `<Modal label={label} onClose={() => router.back()}>`. As páginas interceptadas usam `RouteModal`; task form usa `Modal` com `onClose={() => setOpen(false)}`. Remover overlays duplicados.

Run focused E2E/typecheck/lint. Commit: `fix(modais)!: usa dialog nativo nos formularios`.

### Task 10: Tratar erros e pending

**Files:** Create `src/application/shared/action-state.ts`; modify all Server Actions and client mutation components; modify E2E board/team.

**Interfaces:**

```ts
export type ActionState = { error: string | null };
export const INITIAL_ACTION_STATE: ActionState = { error: null };
```

- [ ] **Step 1: Testar rejeição visual e restauração**

Criar E2E que tenta remover membro responsável e time com task, espera `role=alert`, botão habilitado; mover task com status adulterado via `page.evaluate` e confirmar select anterior/habilitado.

- [ ] **Step 2: Converter erros na borda**

Criar helper local de Action:

```ts
function toActionState(error: unknown): ActionState {
	if (error instanceof ApplicationError) return { error: error.message };
	console.error(error); return { error: "Não foi possível concluir a operação" };
}
```

Actions capturam operações, retornam `{ error: null }` em sucesso sem redirect e `toActionState` em falha. Actions de time usam `(teamId: string, previousState: ActionState, formData: FormData)`; Actions de membro usam `(teamId: string, memberId: string, previousState: ActionState, formData: FormData)`; chamam redirect somente após sucesso.

- [ ] **Step 3: Usar estado nativo e finally**

Forms usam `useActionState`; exibem `{state.error ? <p role="alert">{state.error}</p> : null}`. Handlers imperativos:

```ts
setPending(true); setError(null);
try { const result = await action(...); if (result.error) { setError(result.error); return; } }
catch { setError("Não foi possível concluir a operação"); }
finally { setPending(false); }
```

Move guarda o status selecionado localmente e restaura `currentStatus` ao falhar. Delete/toggle/team switch seguem o mesmo padrão; nenhum `window.alert` permanece.

Run E2E/typecheck/lint e `rg 'window\.alert|[^a]moveTaskAction\(' src/presentation`. Commit: `fix(interface)!: trata erros e estados pendentes`.

### PR 3 checkpoint

Run todos os gates. Expected: exit 0; `rg 'from "@/app/' src/presentation` sem saída.

---

## PR 4 — Consultas de tipos

### Task 11: Eliminar N+1 da listagem de tipos

**Files:** Modify TaskRepository/fake/Drizzle/tests, list-task-types/test.

**Interfaces:** Produces `listUsedTypeIds(): Promise<string[]>`; preserves `countByType` for delete.

- [ ] **Step 1: Testar uma chamada independente do volume**

Fake incrementa `listUsedTypeIdsCalls`. Teste cria três tipos, marca dois usados, chama list e espera flags `[true,false,true]` e calls `1`. Expected: FAIL porque list atual chama count três vezes.

- [ ] **Step 2: Implementar DISTINCT e Set**

```ts
async listUsedTypeIds() {
	const rows = await db.selectDistinct({ typeId: tasks.typeId }).from(tasks);
	return rows.map(row => row.typeId);
}
```

```ts
const [types, usedIds] = await Promise.all([taskTypeRepository.listAll(), taskRepository.listUsedTypeIds()]);
const used = new Set(usedIds);
return types.map(type => ({ ...type, inUse: used.has(type.id) }));
```

Manter countByType. Run focused tests/typecheck/lint. Commit: `perf(tipos)!: carrega uso dos tipos em uma consulta`.

### PR 4 checkpoint

Run todos os gates. Expected: exit 0.

---

## PR 5 — Snapshot de métricas

### Task 12: Carregar dashboard em até cinco queries

**Files:**
- Modify metrics port/fake/Drizzle/tests
- Create `src/application/metrics/use-cases/get-metrics-dashboard.ts`, `.test.ts`
- Delete: `src/application/metrics/use-cases/get-metrics-series.ts`, `get-metrics-series.test.ts` depois de migrar seus callers
- Modify: `src/application/metrics/use-cases/get-metrics-for-period.ts`, `get-metrics-for-period.test.ts`
- Modify metrics composition/page and dashboard/trend types/tests

**Interfaces:**

```ts
export type MetricsSnapshot = {
	completionEvents: { taskId: string; createdAt: Date; completedAt: Date }[];
	statusChanges: { taskId: string; fromStatus: TaskStatus | null; toStatus: TaskStatus; changedAt: Date }[];
	blockedPeriods: { taskId: string; blockedAt: Date; unblockedAt: Date | null }[];
	dueDateTasks: DueDateTaskMetrics[];
	wip: number;
};
loadSnapshot(teamId: string, periodStart: Date, periodEnd: Date): Promise<MetricsSnapshot>;
```

- [ ] **Step 1: Congelar equivalência em teste**

Criar dataset com conclusão múltipla da mesma task, fronteira de período, histórico anterior, período vazio, dueDate e bloqueio. Chamar implementação antiga e novo caso esperado; comparar current/weekly/monthly sem WIP nas séries. Fake conta `loadSnapshotCalls`; esperar `1`.

- [ ] **Step 2: Implementar snapshot em cinco queries**

Adapter executa: completion events no intervalo; status completo dos taskIds; blocked completo; due tasks no intervalo com `min(DONE)` histórico; countWip atual. Retornos vazios pulam queries 2/3 mas nunca ultrapassam cinco. Exportar `createDrizzleMetricsQueryPort(database = db)`. No teste, criar client `postgres(getTestDatabaseUrl(), { debug() { queryCount += 1; } })`, envolvê-lo com `drizzle(client)`, fornecer esse database à factory e esperar `queryCount <= 5` somente ao redor de `loadSnapshot`; encerrar o client em `finally`.

- [ ] **Step 3: Agregar períodos sem reescrever fórmulas**

`getMetricsDashboard(port, teamId, periodType, referenceDate)` calcula ranges current/8 weeks/6 months, obtém min start/max end, chama snapshot uma vez e usa helper puro:

```ts
function metricsForRange(snapshot: MetricsSnapshot, start: Date, end: Date) {
	const lastCompletionByTask = new Map<string, Date>();
	for (const event of snapshot.completionEvents)
		if (event.completedAt >= start && event.completedAt < end) lastCompletionByTask.set(event.taskId, event.completedAt);
	return [...lastCompletionByTask].map(([taskId, completedAt]) => {
		const completion = snapshot.completionEvents.find(event => event.taskId === taskId)!;
		return {
			taskId, createdAt: completion.createdAt, completedAt,
			statusChanges: snapshot.statusChanges.filter(change => change.taskId === taskId),
			blockedPeriods: snapshot.blockedPeriods.filter(period => period.taskId === taskId),
		};
	});
}
```

Due tasks são filtradas por dueDate do range. Current recebe `wip: snapshot.wip`; entries de série usam `Omit<PeriodMetrics,"wip">`.

- [ ] **Step 4: Migrar composição e página**

Composition expõe somente `getMetricsDashboard`. Página faz uma chamada e desestrutura `{current, weeklySeries, monthlySeries}`. Ajustar MetricsSeriesEntry, MetricCard e toTrendPoints para série sem WIP; cartão WIP continua `number-only`, sem gráfico. Remover exports/helpers antigos somente após `rg` confirmar zero callers.

- [ ] **Step 5: Verificar desempenho, equivalência e commit**

Run: `npm test -- src/application/metrics src/infrastructure/metrics src/presentation/metrics-dashboard; npm run test:e2e -- tests/integration/metrics-dashboard.spec.ts; npm run typecheck; npm run lint`.

Expected: resultados equivalentes, uma chamada de port e no máximo cinco SQL queries.

```powershell
git add src/application/metrics src/infrastructure/metrics src/composition/metrics.ts src/app/metrics src/presentation/metrics-dashboard tests/integration/metrics-dashboard.spec.ts
git commit -m "perf(metricas)!: carrega dashboard em lote"
```

### PR 5 checkpoint

Run todos os gates. Expected: exit 0 e teto de cinco queries coberto por teste executável.

## Exact file paths for Tasks 5–12

- **Task 5:** `src/application/shared/application-error.ts`; `src/application/team/contracts/team-access.ts`; `src/domain/task/entities/task.ts`; `src/domain/task/entities/task.test.ts`; `src/application/team/ports/team-repository.ts`; `src/application/team/use-cases/test-helpers/create-fake-team-repository.ts`; `src/infrastructure/team/drizzle-team-repository.ts`; `src/infrastructure/team/drizzle-team-repository.test.ts`; five task mutation use cases with their tests; task fake repositories; `src/composition/task.ts`; `src/app/board/actions.ts`; `src/app/task-types/actions.ts`; `src/app/teams/[teamId]/actions.ts`; `src/presentation/task/task-form-modal.tsx`; `src/presentation/task/kanban-board.tsx`; `src/app/board/page.tsx`; `src/infrastructure/task/drizzle/schema.ts`; `drizzle/migrations/0004_validate-task-status.sql`; `drizzle/migrations/meta/_journal.json`.
- **Task 6:** `src/application/task/ports/task-repository.ts`; `task-history-repository.ts`; create/move/toggle/list use cases with tests and fakes; `src/infrastructure/task/drizzle-task-repository.ts`; `drizzle-task-repository.test.ts`; `drizzle-task-history-repository.ts`; `drizzle-task-history-repository.test.ts`; `src/infrastructure/metrics/drizzle-metrics-query-port.test.ts`; `src/composition/task.ts`.
- **Task 7:** `src/application/task/contracts/task-usage-query.ts`; task port/fake/Drizzle adapter/test; `src/application/team/use-cases/delete-team.ts`; `delete-team.test.ts`; `remove-member.ts`; `remove-member.test.ts`; `src/composition/team.ts`.
- **Task 8:** `src/app/layout.tsx`; `src/app/board/page.tsx`; `src/presentation/team/team-switcher.tsx`; `src/presentation/task/kanban-board.tsx`; `task-card.tsx`; `task-form-modal.tsx`; `task-move-select.tsx`.
- **Task 9:** shared modal/route-modal; task form modal; both intercepted team pages; `tests/integration/kanban-board.spec.ts`; `team-selection.spec.ts`.
- **Task 10:** `src/application/shared/action-state.ts`; all five Action modules; submit button; task form/move controls; team switcher/delete/manage/select components; board/team E2E specs.
- **Task 11:** task port/fake/Drizzle adapter/test; `src/application/task/use-cases/list-task-types.ts`; `list-task-types.test.ts`.
- **Task 12:** metrics port/fake/Drizzle adapter/test; dashboard/period/series use cases and tests; metrics composition/page; dashboard, card and trend mapper/tests; metrics E2E spec.

## Final Verification

Run:

```powershell
rg 'from "@/app/' src/presentation
rg 'process\.env\.DATABASE_URL \?\?' vitest.config.ts playwright.config.ts vitest.global-setup.ts tests
npm run typecheck
npm run lint
npm run knip
npm test
npm run build
npm run test:e2e
```

Expected: dois `rg` sem ocorrências; todos os gates exit 0; worktree contém apenas mudanças deliberadas da tarefa corrente.
