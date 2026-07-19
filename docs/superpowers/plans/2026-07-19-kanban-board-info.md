# Informações do Quadro Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar contagem por coluna, uma faixa de resumo (responsáveis e bloqueios) e destaque de prazo no card do quadro Kanban, conforme `docs/superpowers/specs/2026-07-18-kanban-board-info-design.md`.

**Architecture:** Tudo é agregação/formatação sobre dados que `KanbanBoard` já recebe (`tasksByStatus`, `members`); nenhuma mudança em `domain`, `application` ou `infrastructure`. Dois arquivos novos em `presentation/task` (`due-date-status.ts`, `board-summary.tsx`) e edições pontuais em `task-card.tsx`/`kanban-board.tsx`.

**Tech Stack:** Next.js 16 (Server Components), TypeScript strict, Tailwind CSS, Vitest, Playwright.

## Global Constraints

- Nenhum novo fetch de dado: `tasksByStatus` e `members` já chegam prontos em `KanbanBoard`.
- Cores usam os tokens já existentes em `src/app/globals.css` (`--warn`, `--critical`); nenhum token novo.
- `README.md` é atualizado na mesma tarefa que muda o comportamento que ele documenta.
- Após cada tarefa: teste focado, `npm run typecheck` e `npm run lint`.
- Commits seguem `.githooks/commit-msg`, em português, um por tarefa.

---

### Task 1: Prazo no card

**Files:**
- Create: `src/presentation/task/due-date-status.ts`, `src/presentation/task/due-date-status.test.ts`
- Modify: `src/presentation/task/task-card.tsx`
- Modify: `README.md`

**Interfaces:** Produces `getDueDateStatus(dueDate: string | null, status: TaskStatus, today: Date): "none" | "ok" | "warning" | "overdue"`.

- [ ] **Step 1: Escrever o teste e confirmar a falha**

```ts
// src/presentation/task/due-date-status.test.ts
import { describe, expect, it } from "vitest";
import { getDueDateStatus } from "./due-date-status";

const today = new Date("2026-07-19T12:00:00Z");

describe("getDueDateStatus", () => {
	it("retorna none quando não há prazo", () => {
		expect(getDueDateStatus(null, "TODO", today)).toBe("none");
	});

	it("retorna ok quando o prazo é distante (mais de 2 dias)", () => {
		expect(getDueDateStatus("2026-07-25", "TODO", today)).toBe("ok");
	});

	it("retorna warning quando faltam exatamente 2 dias", () => {
		expect(getDueDateStatus("2026-07-21", "TODO", today)).toBe("warning");
	});

	it("retorna warning quando o prazo é hoje", () => {
		expect(getDueDateStatus("2026-07-19", "TODO", today)).toBe("warning");
	});

	it("retorna overdue quando o prazo já passou", () => {
		expect(getDueDateStatus("2026-07-18", "TODO", today)).toBe("overdue");
	});

	it("retorna none quando o prazo passou mas a task está concluída", () => {
		expect(getDueDateStatus("2026-07-18", "DONE", today)).toBe("none");
	});
});
```

Run: `npm test -- src/presentation/task/due-date-status.test.ts`. Expected: FAIL (módulo `due-date-status.ts` não existe).

- [ ] **Step 2: Implementar a função pura**

```ts
// src/presentation/task/due-date-status.ts
import type { TaskStatus } from "@/domain/task/entities/task";

export type DueDateStatus = "none" | "ok" | "warning" | "overdue";

const WARNING_THRESHOLD_DAYS = 2;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function getDueDateStatus(
	dueDate: string | null,
	status: TaskStatus,
	today: Date,
): DueDateStatus {
	if (!dueDate || status === "DONE") {
		return "none";
	}
	const due = new Date(`${dueDate}T00:00:00Z`);
	const startOfToday = Date.UTC(
		today.getUTCFullYear(),
		today.getUTCMonth(),
		today.getUTCDate(),
	);
	const diffDays = Math.round((due.getTime() - startOfToday) / MS_PER_DAY);
	if (diffDays < 0) {
		return "overdue";
	}
	if (diffDays <= WARNING_THRESHOLD_DAYS) {
		return "warning";
	}
	return "ok";
}
```

- [ ] **Step 3: Rodar o teste**

Run: `npm test -- src/presentation/task/due-date-status.test.ts`. Expected: PASS.

- [ ] **Step 4: Exibir o prazo no card**

```tsx
// src/presentation/task/task-card.tsx
import { getDueDateStatus } from "@/presentation/task/due-date-status";
```

```tsx
function formatDueDate(dueDate: string): string {
	const [, month, day] = dueDate.split("-");
	return `${day}/${month}`;
}

function dueDateClassName(status: ReturnType<typeof getDueDateStatus>): string {
	if (status === "warning") return "text-(--warn)";
	if (status === "overdue") return "text-(--critical)";
	return "opacity-70";
}
```

Dentro do JSX, logo abaixo do parágrafo de `formatElapsed`:

```tsx
{task.dueDate ? (
	<p
		className={`text-xs font-semibold ${dueDateClassName(
			getDueDateStatus(task.dueDate, task.status, new Date()),
		)}`}
	>
		Prazo: {formatDueDate(task.dueDate)}
	</p>
) : null}
```

- [ ] **Step 5: Verificar e commit**

Run: `npm run typecheck; npm run lint`.

Em `README.md`, seção "Funcionalidades": acrescentar um bullet — "O card de tarefa destaca o prazo (`dueDate`) em amarelo quando está a até 2 dias do vencimento e em vermelho quando já venceu, exceto para tarefas concluídas."

```powershell
git add src/presentation/task/due-date-status.ts src/presentation/task/due-date-status.test.ts src/presentation/task/task-card.tsx README.md
git commit -m "feat(kanban)!: destaca prazo proximo ou vencido no card"
```

### Task 2: Faixa de resumo e contagem por coluna

**Files:**
- Create: `src/presentation/task/board-summary.tsx`
- Modify: `src/presentation/task/kanban-board.tsx`
- Modify: `tests/integration/kanban-board.spec.ts`
- Modify: `README.md`

**Interfaces:** Produces `BoardSummary({ tasksByStatus, members })`. Consome `TasksByStatus` (de `list-tasks-by-team.ts`) e `Member[]`.

- [ ] **Step 1: Escrever os E2E e confirmar a falha**

Adicionar a `tests/integration/kanban-board.spec.ts`:

```ts
test("a contagem da coluna reflete o número de cards", async ({ page }) => {
	await page.getByRole("button", { name: "Nova task" }).click();
	await page.getByLabel("Id externo").fill("TASK-COUNT-1");
	await page.getByLabel("Descrição").fill("Primeira task");
	await page.getByRole("button", { name: "Salvar" }).click();

	await expect(
		page.getByRole("heading", { name: "A Fazer (1)" }),
	).toBeVisible();

	await page.getByRole("button", { name: "Nova task" }).click();
	await page.getByLabel("Id externo").fill("TASK-COUNT-2");
	await page.getByLabel("Descrição").fill("Segunda task");
	await page.getByRole("button", { name: "Salvar" }).click();

	await expect(
		page.getByRole("heading", { name: "A Fazer (2)" }),
	).toBeVisible();
	await expect(
		page.getByRole("heading", { name: "Em Desenvolvimento (0)" }),
	).toBeVisible();
});

test("o chip de responsável mostra a contagem de cards ativos", async ({
	page,
}) => {
	await page.getByRole("button", { name: "Time A", exact: true }).click();
	await page.getByRole("link", { name: "Gerenciar time atual" }).click();
	await page.getByPlaceholder("Nome do novo membro").fill("Ana");
	await page.getByRole("button", { name: "Adicionar membro" }).click();
	await page.getByRole("dialog", { name: "Gerenciar time" }).getByRole("button", { name: "Fechar" }).click();

	await page.getByRole("button", { name: "Nova task" }).click();
	await page.getByLabel("Id externo").fill("TASK-ANA-1");
	await page.getByLabel("Descrição").fill("Task da Ana");
	await page.getByLabel("Responsável").selectOption({ label: "Ana" });
	await page.getByRole("button", { name: "Salvar" }).click();

	await expect(page.getByText("Ana: 1")).toBeVisible();
});

test("o chip de bloqueados aparece e some conforme o card é bloqueado", async ({
	page,
}) => {
	await page.getByRole("button", { name: "Nova task" }).click();
	await page.getByLabel("Id externo").fill("TASK-BLOCK-1");
	await page.getByLabel("Descrição").fill("Task a bloquear");
	await page.getByLabel("Tipo").selectOption({ label: "Bug" });
	await page.getByRole("button", { name: "Salvar" }).click();

	await expect(page.getByText("bloqueados")).toHaveCount(0);

	await page
		.getByTitle("Bug")
		.filter({ hasText: "TASK-BLOCK-1" })
		.getByRole("button", { name: "Editar task" })
		.click();
	await page.getByRole("checkbox", { name: "⛔ Bloqueado" }).check();

	await expect(page.getByText("⛔ 1 bloqueados")).toBeVisible();

	await page.getByRole("checkbox", { name: "⛔ Bloqueado" }).uncheck();
	await expect(page.getByText("bloqueados")).toHaveCount(0);
});
```

Run: `npm run test:e2e -- tests/integration/kanban-board.spec.ts`. Expected: FAIL (nem contagem nem chips existem ainda).

- [ ] **Step 2: Implementar `BoardSummary`**

```tsx
// src/presentation/task/board-summary.tsx
import type { TasksByStatus } from "@/application/task/use-cases/list-tasks-by-team";
import type { Member } from "@/domain/team/entities/member";

type BoardSummaryProps = {
	tasksByStatus: TasksByStatus;
	members: Member[];
};

export function BoardSummary({ tasksByStatus, members }: BoardSummaryProps) {
	const allTasks = Object.values(tasksByStatus).flat();
	const activeTasks = allTasks.filter((task) => task.status !== "DONE");
	const blockedCount = allTasks.filter((task) => task.blocked).length;

	const countByAssignee = new Map<string, number>();
	let unassignedCount = 0;
	for (const task of activeTasks) {
		if (task.assigneeId) {
			countByAssignee.set(
				task.assigneeId,
				(countByAssignee.get(task.assigneeId) ?? 0) + 1,
			);
		} else {
			unassignedCount += 1;
		}
	}

	const assigneeChips = members
		.filter((member) => (countByAssignee.get(member.id) ?? 0) > 0)
		.map((member) => `${member.name}: ${countByAssignee.get(member.id)}`);
	if (unassignedCount > 0) {
		assigneeChips.push(`Sem responsável: ${unassignedCount}`);
	}

	if (assigneeChips.length === 0 && blockedCount === 0) {
		return null;
	}

	return (
		<div className="flex flex-wrap gap-2 text-xs">
			{assigneeChips.map((chip) => (
				<span
					key={chip}
					className="rounded-full border border-(--border) px-3 py-1"
				>
					{chip}
				</span>
			))}
			{blockedCount > 0 ? (
				<span className="rounded-full border border-(--critical) px-3 py-1 text-(--critical)">
					⛔ {blockedCount} bloqueados
				</span>
			) : null}
		</div>
	);
}
```

- [ ] **Step 3: Renderizar o resumo e a contagem por coluna**

```tsx
// src/presentation/task/kanban-board.tsx
import { BoardSummary } from "@/presentation/task/board-summary";
```

```tsx
<div className="flex items-center justify-between">
	<h1 className="text-xl font-semibold">Quadro</h1>
	<TaskFormModal ... />
</div>
<BoardSummary tasksByStatus={tasksByStatus} members={members} />
<div className="flex flex-1 gap-4 overflow-x-auto">
```

```tsx
<h2 className="text-sm font-semibold opacity-70">
	{STATUS_LABELS[status]} ({tasksByStatus[status].length})
</h2>
```

- [ ] **Step 4: Rodar E2E, typecheck, lint, atualizar README e commit**

Run: `npm run test:e2e -- tests/integration/kanban-board.spec.ts; npm run typecheck; npm run lint`. Expected: PASS.

Em `README.md`, mesmo bullet do quadro Kanban: acrescentar "; o quadro mostra a contagem de cards por coluna e um resumo por responsável e de tarefas bloqueadas."

```powershell
git add src/presentation/task/board-summary.tsx src/presentation/task/kanban-board.tsx tests/integration/kanban-board.spec.ts README.md
git commit -m "feat(kanban)!: adiciona contagem por coluna e resumo de responsaveis e bloqueios"
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

Expected: todos os gates exit 0; quadro exibindo contagem por coluna, chips de resumo e prazo destacado ao rodar `npm run dev` manualmente.
