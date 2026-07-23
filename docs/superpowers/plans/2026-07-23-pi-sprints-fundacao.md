# PIs e Sprints — Fundação (domínio, persistência e cadastro) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar o contexto `sprint` (Clean Architecture + DDD) com as entidades ProgramIncrement e Sprint, sua persistência em Postgres via Drizzle, e uma tela de cadastro (`/sprints`) onde o time cria PIs (~3 meses) e, dentro de cada PI, sprints (~2 semanas), com datas ajustáveis.

**Architecture:** Novo bounded context `sprint`, seguindo exatamente o padrão já usado pelo contexto `task` (ex.: `tag`): `domain/sprint/entities` (types puros) → `application/sprint/{ports,use-cases}` (funções puras + fakes in-memory para teste) → `infrastructure/sprint/drizzle` (schema + repos Drizzle, testados contra Postgres real) → `composition/sprint.ts` (factory) → `app/sprints` + `presentation/sprint` (tela CRUD simples, mesmo modelo de `/tags`).

**Tech Stack:** Next.js App Router, TypeScript estrito, Drizzle ORM (Postgres), Vitest, Biome, Tailwind.

## Global Constraints

- Arquivos em `kebab-case`; componentes React e tipos em `PascalCase`.
- `domain` não importa `application`, `infrastructure`, `presentation`, React, Next.js ou ORM.
- Contextos não se acoplam a nível de schema: `sprints`/`program_increments` guardam `team_id` sem FK (mesmo padrão de `tasks.team_id`).
- Erros de negócio usam `ApplicationError` (`src/application/shared/application-error.ts`), convertidos para mensagem de UI apenas na borda (`actions.ts`).
- Datas de domínio são strings `YYYY-MM-DD` validadas com `parseDateOnly` (`src/application/shared/validation.ts`), igual a `Task.dueDate` — não `Date` no tipo de domínio.
- Testes de `application` usam fakes in-memory (nunca sobem banco); testes de `infrastructure` rodam contra Postgres real de teste (`vitest.global-setup.ts` já aplica migrations automaticamente).
- Commits em português seguindo o padrão do projeto (`techdocs/guidelines.md`): `tipo(sprints)!: descrição`.
- Este plano é o primeiro de uma sequência (ver spec `docs/superpowers/specs/2026-07-23-pi-sprints-design.md`). Fora de escopo aqui: atribuir card à sprint, iniciar/finalizar sprint, overflow, snapshots, visão por sprint no quadro, filtro de sprint nas métricas — isso vem em planos seguintes, depois que esta fundação existir.

---

## File Structure

```
src/domain/sprint/entities/
  program-increment.ts
  sprint.ts
  sprint.test.ts

src/application/sprint/ports/
  program-increment-repository.ts
  sprint-repository.ts
src/application/sprint/use-cases/
  create-program-increment.ts
  create-program-increment.test.ts
  list-program-increments-by-team.ts
  list-program-increments-by-team.test.ts
  create-sprint.ts
  create-sprint.test.ts
  list-sprints-by-pi.ts
  list-sprints-by-pi.test.ts
  test-helpers/
    create-fake-program-increment-repository.ts
    create-fake-sprint-repository.ts

src/infrastructure/sprint/drizzle/
  schema.ts
src/infrastructure/sprint/
  drizzle-program-increment-repository.ts
  drizzle-program-increment-repository.test.ts
  drizzle-sprint-repository.ts
  drizzle-sprint-repository.test.ts

src/composition/sprint.ts

src/app/sprints/
  actions.ts
  page.tsx

src/presentation/sprint/
  program-increment-form.tsx
  program-increment-list.tsx
  sprint-form.tsx

src/presentation/shared/header-nav.tsx   (modificado)
```

---

### Task 1: Entidades de domínio — ProgramIncrement e Sprint

**Files:**
- Create: `src/domain/sprint/entities/program-increment.ts`
- Create: `src/domain/sprint/entities/sprint.ts`
- Create: `src/domain/sprint/entities/sprint.test.ts`

**Interfaces:**
- Produces: `ProgramIncrement = { id: string; teamId: string; name: string; startDate: string; endDate: string }`
- Produces: `SPRINT_STATUSES`, `SprintStatus`, `isSprintStatus(value): value is SprintStatus`
- Produces: `Sprint = { id: string; piId: string; teamId: string; name: string; startDate: string; endDate: string; status: SprintStatus }`

- [ ] **Step 1: Escrever o teste de `isSprintStatus`**

```ts
// src/domain/sprint/entities/sprint.test.ts
import { describe, expect, it } from "vitest";
import { isSprintStatus, SPRINT_STATUSES } from "./sprint";

describe("isSprintStatus", () => {
	it.each(SPRINT_STATUSES)("aceita %s", (status) => {
		expect(isSprintStatus(status)).toBe(true);
	});

	it("rejeita status desconhecido", () => {
		expect(isSprintStatus("HACKED")).toBe(false);
	});
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest run src/domain/sprint/entities/sprint.test.ts`
Expected: FAIL — `Cannot find module './sprint'` (o arquivo ainda não existe).

- [ ] **Step 3: Criar `program-increment.ts`**

```ts
// src/domain/sprint/entities/program-increment.ts
export type ProgramIncrement = {
	id: string;
	teamId: string;
	name: string;
	startDate: string;
	endDate: string;
};
```

- [ ] **Step 4: Criar `sprint.ts`**

```ts
// src/domain/sprint/entities/sprint.ts
export const SPRINT_STATUSES = ["PLANNED", "ACTIVE", "CLOSED"] as const;
export type SprintStatus = (typeof SPRINT_STATUSES)[number];
export const isSprintStatus = (value: unknown): value is SprintStatus =>
	typeof value === "string" && SPRINT_STATUSES.includes(value as SprintStatus);

export type Sprint = {
	id: string;
	piId: string;
	teamId: string;
	name: string;
	startDate: string;
	endDate: string;
	status: SprintStatus;
};
```

- [ ] **Step 5: Rodar o teste e confirmar que passa**

Run: `npx vitest run src/domain/sprint/entities/sprint.test.ts`
Expected: PASS (4 testes: 3 status + 1 rejeição).

- [ ] **Step 6: Commit**

```bash
git add src/domain/sprint
git commit -m "feat(sprints)!: adiciona entidades de dominio programincrement e sprint"
```

---

### Task 2: Schema Drizzle — `program_increments` e `sprints`

**Files:**
- Create: `src/infrastructure/sprint/drizzle/schema.ts`

**Interfaces:**
- Produces: tabelas Drizzle `programIncrements`, `sprints` (exports nomeados, mesmo padrão de `src/infrastructure/task/drizzle/schema.ts`).

- [ ] **Step 1: Criar o schema**

```ts
// src/infrastructure/sprint/drizzle/schema.ts
import { sql } from "drizzle-orm";
import { check, date, index, pgTable, text, uuid } from "drizzle-orm/pg-core";

export const programIncrements = pgTable(
	"program_increments",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		// teamId sem FK: contextos não se acoplam a nível de schema (mesmo
		// padrão de tasks.team_id em src/infrastructure/task/drizzle/schema.ts).
		teamId: uuid("team_id").notNull(),
		name: text("name").notNull(),
		startDate: date("start_date").notNull(),
		endDate: date("end_date").notNull(),
	},
	(table) => [index("program_increments_team_id_idx").on(table.teamId)],
);

export const sprints = pgTable(
	"sprints",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		piId: uuid("pi_id")
			.notNull()
			.references(() => programIncrements.id, { onDelete: "cascade" }),
		teamId: uuid("team_id").notNull(),
		name: text("name").notNull(),
		startDate: date("start_date").notNull(),
		endDate: date("end_date").notNull(),
		status: text("status").notNull().default("PLANNED"),
	},
	(table) => [
		check(
			"sprints_status_check",
			sql`${table.status} IN ('PLANNED', 'ACTIVE', 'CLOSED')`,
		),
		index("sprints_pi_id_idx").on(table.piId),
		index("sprints_team_id_status_idx").on(table.teamId, table.status),
	],
);
```

- [ ] **Step 2: Gerar a migration**

Run: `npm run db:generate`
Expected: novo arquivo em `drizzle/migrations/00XX_<nome-gerado>.sql` criando `program_increments` e `sprints` (confirme lendo o arquivo gerado — deve conter `CREATE TABLE "program_increments"` e `CREATE TABLE "sprints"` com a FK e o `CHECK` de status).

- [ ] **Step 3: Aplicar a migration no banco de teste**

Run: `npm run db:migrate`
Expected: saída sem erro confirmando a migration aplicada. (O `vitest.global-setup.ts` também aplica migrations automaticamente antes da suíte de testes, então isso garante que o schema já está sincronizado antes do próximo task.)

- [ ] **Step 4: Commit**

```bash
git add src/infrastructure/sprint/drizzle/schema.ts drizzle/migrations
git commit -m "feat(sprints)!: adiciona tabelas program_increments e sprints"
```

---

### Task 3: Port + repositório fake de `ProgramIncrement`

**Files:**
- Create: `src/application/sprint/ports/program-increment-repository.ts`
- Create: `src/application/sprint/use-cases/test-helpers/create-fake-program-increment-repository.ts`

**Interfaces:**
- Consumes: `ProgramIncrement` de `src/domain/sprint/entities/program-increment.ts` (Task 1).
- Produces: `CreateProgramIncrementData = { teamId: string; name: string; startDate: string; endDate: string }`, `ProgramIncrementRepository = { create(data): Promise<ProgramIncrement>; listByTeam(teamId): Promise<ProgramIncrement[]>; findById(id): Promise<ProgramIncrement | null> }`, `createFakeProgramIncrementRepository(): ProgramIncrementRepository`.

- [ ] **Step 1: Criar a port**

```ts
// src/application/sprint/ports/program-increment-repository.ts
import type { ProgramIncrement } from "@/domain/sprint/entities/program-increment";

export type CreateProgramIncrementData = {
	teamId: string;
	name: string;
	startDate: string;
	endDate: string;
};

export type ProgramIncrementRepository = {
	create(data: CreateProgramIncrementData): Promise<ProgramIncrement>;
	listByTeam(teamId: string): Promise<ProgramIncrement[]>;
	findById(id: string): Promise<ProgramIncrement | null>;
};
```

- [ ] **Step 2: Criar o fake**

```ts
// src/application/sprint/use-cases/test-helpers/create-fake-program-increment-repository.ts
import type {
	CreateProgramIncrementData,
	ProgramIncrementRepository,
} from "@/application/sprint/ports/program-increment-repository";
import type { ProgramIncrement } from "@/domain/sprint/entities/program-increment";

export function createFakeProgramIncrementRepository(): ProgramIncrementRepository {
	const programIncrements: ProgramIncrement[] = [];
	let nextId = 1;

	return {
		async create(data: CreateProgramIncrementData) {
			const pi: ProgramIncrement = { id: `pi-${nextId++}`, ...data };
			programIncrements.push(pi);
			return pi;
		},
		async listByTeam(teamId) {
			return programIncrements.filter((pi) => pi.teamId === teamId);
		},
		async findById(id) {
			return programIncrements.find((pi) => pi.id === id) ?? null;
		},
	};
}
```

- [ ] **Step 3: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sem erros novos relacionados a `src/application/sprint`.

- [ ] **Step 4: Commit**

```bash
git add src/application/sprint/ports/program-increment-repository.ts src/application/sprint/use-cases/test-helpers/create-fake-program-increment-repository.ts
git commit -m "feat(sprints)!: adiciona port e fake de programincrementrepository"
```

---

### Task 4: Port + repositório fake de `Sprint`

**Files:**
- Create: `src/application/sprint/ports/sprint-repository.ts`
- Create: `src/application/sprint/use-cases/test-helpers/create-fake-sprint-repository.ts`

**Interfaces:**
- Consumes: `Sprint` de `src/domain/sprint/entities/sprint.ts` (Task 1).
- Produces: `CreateSprintData = { piId: string; teamId: string; name: string; startDate: string; endDate: string }`, `SprintRepository = { create(data): Promise<Sprint>; listByPi(piId): Promise<Sprint[]>; listByTeam(teamId): Promise<Sprint[]>; findById(id): Promise<Sprint | null> }`, `createFakeSprintRepository(): SprintRepository`.

- [ ] **Step 1: Criar a port**

```ts
// src/application/sprint/ports/sprint-repository.ts
import type { Sprint } from "@/domain/sprint/entities/sprint";

export type CreateSprintData = {
	piId: string;
	teamId: string;
	name: string;
	startDate: string;
	endDate: string;
};

export type SprintRepository = {
	create(data: CreateSprintData): Promise<Sprint>;
	listByPi(piId: string): Promise<Sprint[]>;
	listByTeam(teamId: string): Promise<Sprint[]>;
	findById(id: string): Promise<Sprint | null>;
};
```

- [ ] **Step 2: Criar o fake**

```ts
// src/application/sprint/use-cases/test-helpers/create-fake-sprint-repository.ts
import type {
	CreateSprintData,
	SprintRepository,
} from "@/application/sprint/ports/sprint-repository";
import type { Sprint } from "@/domain/sprint/entities/sprint";

export function createFakeSprintRepository(): SprintRepository {
	const sprints: Sprint[] = [];
	let nextId = 1;

	return {
		async create(data: CreateSprintData) {
			const sprint: Sprint = {
				id: `sprint-${nextId++}`,
				status: "PLANNED",
				...data,
			};
			sprints.push(sprint);
			return sprint;
		},
		async listByPi(piId) {
			return sprints.filter((sprint) => sprint.piId === piId);
		},
		async listByTeam(teamId) {
			return sprints.filter((sprint) => sprint.teamId === teamId);
		},
		async findById(id) {
			return sprints.find((sprint) => sprint.id === id) ?? null;
		},
	};
}
```

- [ ] **Step 3: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sem erros novos.

- [ ] **Step 4: Commit**

```bash
git add src/application/sprint/ports/sprint-repository.ts src/application/sprint/use-cases/test-helpers/create-fake-sprint-repository.ts
git commit -m "feat(sprints)!: adiciona port e fake de sprintrepository"
```

---

### Task 5: Use-case `createProgramIncrement`

**Files:**
- Create: `src/application/sprint/use-cases/create-program-increment.ts`
- Create: `src/application/sprint/use-cases/create-program-increment.test.ts`

**Interfaces:**
- Consumes: `ProgramIncrementRepository`, `CreateProgramIncrementData` (Task 3); `createFakeProgramIncrementRepository` (Task 3).
- Produces: `createProgramIncrement(repository: ProgramIncrementRepository, data: CreateProgramIncrementData): Promise<ProgramIncrement>`.

- [ ] **Step 1: Escrever os testes**

```ts
// src/application/sprint/use-cases/create-program-increment.test.ts
import { describe, expect, it } from "vitest";
import { createFakeProgramIncrementRepository } from "./test-helpers/create-fake-program-increment-repository";
import { createProgramIncrement } from "./create-program-increment";

describe("createProgramIncrement", () => {
	it("cria um pi com nome e datas válidas", async () => {
		const repository = createFakeProgramIncrementRepository();
		const pi = await createProgramIncrement(repository, {
			teamId: "team-1",
			name: "PI 2026.3",
			startDate: "2026-07-01",
			endDate: "2026-09-30",
		});
		expect(pi.name).toBe("PI 2026.3");
		expect(pi.startDate).toBe("2026-07-01");
		expect(pi.endDate).toBe("2026-09-30");
	});

	it("rejeita nome vazio", async () => {
		const repository = createFakeProgramIncrementRepository();
		await expect(
			createProgramIncrement(repository, {
				teamId: "team-1",
				name: "   ",
				startDate: "2026-07-01",
				endDate: "2026-09-30",
			}),
		).rejects.toThrow("Nome do PI não pode ser vazio");
	});

	it("rejeita data de início inválida", async () => {
		const repository = createFakeProgramIncrementRepository();
		await expect(
			createProgramIncrement(repository, {
				teamId: "team-1",
				name: "PI 2026.3",
				startDate: "2026-13-40",
				endDate: "2026-09-30",
			}),
		).rejects.toThrow("Data de início inválida");
	});

	it("rejeita data de término anterior ou igual à de início", async () => {
		const repository = createFakeProgramIncrementRepository();
		await expect(
			createProgramIncrement(repository, {
				teamId: "team-1",
				name: "PI 2026.3",
				startDate: "2026-07-01",
				endDate: "2026-07-01",
			}),
		).rejects.toThrow("Data de término deve ser posterior à data de início");
	});
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npx vitest run src/application/sprint/use-cases/create-program-increment.test.ts`
Expected: FAIL — `Cannot find module './create-program-increment'`.

- [ ] **Step 3: Implementar o use-case**

```ts
// src/application/sprint/use-cases/create-program-increment.ts
import type {
	CreateProgramIncrementData,
	ProgramIncrementRepository,
} from "@/application/sprint/ports/program-increment-repository";
import { ApplicationError } from "@/application/shared/application-error";
import { parseDateOnly } from "@/application/shared/validation";

export async function createProgramIncrement(
	repository: ProgramIncrementRepository,
	data: CreateProgramIncrementData,
) {
	const name = data.name.trim();
	if (!name) {
		throw new ApplicationError("Nome do PI não pode ser vazio");
	}
	const startDate = parseDateOnly(data.startDate);
	if (!startDate) {
		throw new ApplicationError("Data de início inválida");
	}
	const endDate = parseDateOnly(data.endDate);
	if (!endDate) {
		throw new ApplicationError("Data de término inválida");
	}
	if (endDate <= startDate) {
		throw new ApplicationError(
			"Data de término deve ser posterior à data de início",
		);
	}
	return repository.create({ ...data, name });
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npx vitest run src/application/sprint/use-cases/create-program-increment.test.ts`
Expected: PASS (4 testes).

- [ ] **Step 5: Commit**

```bash
git add src/application/sprint/use-cases/create-program-increment.ts src/application/sprint/use-cases/create-program-increment.test.ts
git commit -m "feat(sprints)!: adiciona use-case de criacao de pi"
```

---

### Task 6: Use-case `listProgramIncrementsByTeam`

**Files:**
- Create: `src/application/sprint/use-cases/list-program-increments-by-team.ts`
- Create: `src/application/sprint/use-cases/list-program-increments-by-team.test.ts`

**Interfaces:**
- Consumes: `ProgramIncrementRepository` (Task 3).
- Produces: `listProgramIncrementsByTeam(repository: ProgramIncrementRepository, teamId: string): Promise<ProgramIncrement[]>`.

- [ ] **Step 1: Escrever o teste**

```ts
// src/application/sprint/use-cases/list-program-increments-by-team.test.ts
import { describe, expect, it } from "vitest";
import { createFakeProgramIncrementRepository } from "./test-helpers/create-fake-program-increment-repository";
import { listProgramIncrementsByTeam } from "./list-program-increments-by-team";

describe("listProgramIncrementsByTeam", () => {
	it("lista apenas os pis do time informado", async () => {
		const repository = createFakeProgramIncrementRepository();
		await repository.create({
			teamId: "team-1",
			name: "PI do time 1",
			startDate: "2026-07-01",
			endDate: "2026-09-30",
		});
		await repository.create({
			teamId: "team-2",
			name: "PI do time 2",
			startDate: "2026-07-01",
			endDate: "2026-09-30",
		});

		const result = await listProgramIncrementsByTeam(repository, "team-1");

		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("PI do time 1");
	});
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest run src/application/sprint/use-cases/list-program-increments-by-team.test.ts`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar o use-case**

```ts
// src/application/sprint/use-cases/list-program-increments-by-team.ts
import type { ProgramIncrementRepository } from "@/application/sprint/ports/program-increment-repository";

export async function listProgramIncrementsByTeam(
	repository: ProgramIncrementRepository,
	teamId: string,
) {
	return repository.listByTeam(teamId);
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest run src/application/sprint/use-cases/list-program-increments-by-team.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/application/sprint/use-cases/list-program-increments-by-team.ts src/application/sprint/use-cases/list-program-increments-by-team.test.ts
git commit -m "feat(sprints)!: adiciona use-case de listagem de pis por time"
```

---

### Task 7: Use-case `createSprint`

**Files:**
- Create: `src/application/sprint/use-cases/create-sprint.ts`
- Create: `src/application/sprint/use-cases/create-sprint.test.ts`

**Interfaces:**
- Consumes: `SprintRepository`, `CreateSprintData` (Task 4); `ProgramIncrementRepository` (Task 3); ambos os fakes.
- Produces: `createSprint(sprintRepository: SprintRepository, programIncrementRepository: ProgramIncrementRepository, data: CreateSprintData): Promise<Sprint>`.

- [ ] **Step 1: Escrever os testes**

```ts
// src/application/sprint/use-cases/create-sprint.test.ts
import { describe, expect, it } from "vitest";
import { createFakeProgramIncrementRepository } from "./test-helpers/create-fake-program-increment-repository";
import { createFakeSprintRepository } from "./test-helpers/create-fake-sprint-repository";
import { createSprint } from "./create-sprint";

async function seedPi(
	programIncrementRepository: ReturnType<typeof createFakeProgramIncrementRepository>,
	teamId = "team-1",
) {
	return programIncrementRepository.create({
		teamId,
		name: "PI 2026.3",
		startDate: "2026-07-01",
		endDate: "2026-09-30",
	});
}

describe("createSprint", () => {
	it("cria uma sprint planejada vinculada ao pi", async () => {
		const sprintRepository = createFakeSprintRepository();
		const programIncrementRepository = createFakeProgramIncrementRepository();
		const pi = await seedPi(programIncrementRepository);

		const sprint = await createSprint(sprintRepository, programIncrementRepository, {
			piId: pi.id,
			teamId: "team-1",
			name: "Sprint 1",
			startDate: "2026-07-01",
			endDate: "2026-07-14",
		});

		expect(sprint.name).toBe("Sprint 1");
		expect(sprint.status).toBe("PLANNED");
	});

	it("rejeita pi inexistente", async () => {
		const sprintRepository = createFakeSprintRepository();
		const programIncrementRepository = createFakeProgramIncrementRepository();

		await expect(
			createSprint(sprintRepository, programIncrementRepository, {
				piId: "pi-inexistente",
				teamId: "team-1",
				name: "Sprint 1",
				startDate: "2026-07-01",
				endDate: "2026-07-14",
			}),
		).rejects.toThrow("PI não encontrado");
	});

	it("rejeita pi de outro time", async () => {
		const sprintRepository = createFakeSprintRepository();
		const programIncrementRepository = createFakeProgramIncrementRepository();
		const pi = await seedPi(programIncrementRepository, "team-1");

		await expect(
			createSprint(sprintRepository, programIncrementRepository, {
				piId: pi.id,
				teamId: "team-2",
				name: "Sprint 1",
				startDate: "2026-07-01",
				endDate: "2026-07-14",
			}),
		).rejects.toThrow("PI não encontrado");
	});

	it("rejeita nome vazio", async () => {
		const sprintRepository = createFakeSprintRepository();
		const programIncrementRepository = createFakeProgramIncrementRepository();
		const pi = await seedPi(programIncrementRepository);

		await expect(
			createSprint(sprintRepository, programIncrementRepository, {
				piId: pi.id,
				teamId: "team-1",
				name: "  ",
				startDate: "2026-07-01",
				endDate: "2026-07-14",
			}),
		).rejects.toThrow("Nome da sprint não pode ser vazio");
	});

	it("rejeita data de término anterior ou igual à de início", async () => {
		const sprintRepository = createFakeSprintRepository();
		const programIncrementRepository = createFakeProgramIncrementRepository();
		const pi = await seedPi(programIncrementRepository);

		await expect(
			createSprint(sprintRepository, programIncrementRepository, {
				piId: pi.id,
				teamId: "team-1",
				name: "Sprint 1",
				startDate: "2026-07-14",
				endDate: "2026-07-14",
			}),
		).rejects.toThrow("Data de término deve ser posterior à data de início");
	});
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npx vitest run src/application/sprint/use-cases/create-sprint.test.ts`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar o use-case**

```ts
// src/application/sprint/use-cases/create-sprint.ts
import { ApplicationError } from "@/application/shared/application-error";
import { parseDateOnly } from "@/application/shared/validation";
import type { ProgramIncrementRepository } from "@/application/sprint/ports/program-increment-repository";
import type {
	CreateSprintData,
	SprintRepository,
} from "@/application/sprint/ports/sprint-repository";

export async function createSprint(
	sprintRepository: SprintRepository,
	programIncrementRepository: ProgramIncrementRepository,
	data: CreateSprintData,
) {
	const pi = await programIncrementRepository.findById(data.piId);
	if (!pi || pi.teamId !== data.teamId) {
		throw new ApplicationError("PI não encontrado");
	}
	const name = data.name.trim();
	if (!name) {
		throw new ApplicationError("Nome da sprint não pode ser vazio");
	}
	const startDate = parseDateOnly(data.startDate);
	if (!startDate) {
		throw new ApplicationError("Data de início inválida");
	}
	const endDate = parseDateOnly(data.endDate);
	if (!endDate) {
		throw new ApplicationError("Data de término inválida");
	}
	if (endDate <= startDate) {
		throw new ApplicationError(
			"Data de término deve ser posterior à data de início",
		);
	}
	return sprintRepository.create({ ...data, name });
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npx vitest run src/application/sprint/use-cases/create-sprint.test.ts`
Expected: PASS (5 testes).

- [ ] **Step 5: Commit**

```bash
git add src/application/sprint/use-cases/create-sprint.ts src/application/sprint/use-cases/create-sprint.test.ts
git commit -m "feat(sprints)!: adiciona use-case de criacao de sprint"
```

---

### Task 8: Use-case `listSprintsByPi`

**Files:**
- Create: `src/application/sprint/use-cases/list-sprints-by-pi.ts`
- Create: `src/application/sprint/use-cases/list-sprints-by-pi.test.ts`

**Interfaces:**
- Consumes: `SprintRepository` (Task 4).
- Produces: `listSprintsByPi(repository: SprintRepository, piId: string): Promise<Sprint[]>`.

- [ ] **Step 1: Escrever o teste**

```ts
// src/application/sprint/use-cases/list-sprints-by-pi.test.ts
import { describe, expect, it } from "vitest";
import { createFakeSprintRepository } from "./test-helpers/create-fake-sprint-repository";
import { listSprintsByPi } from "./list-sprints-by-pi";

describe("listSprintsByPi", () => {
	it("lista apenas as sprints do pi informado", async () => {
		const repository = createFakeSprintRepository();
		await repository.create({
			piId: "pi-1",
			teamId: "team-1",
			name: "Sprint do pi 1",
			startDate: "2026-07-01",
			endDate: "2026-07-14",
		});
		await repository.create({
			piId: "pi-2",
			teamId: "team-1",
			name: "Sprint do pi 2",
			startDate: "2026-07-01",
			endDate: "2026-07-14",
		});

		const result = await listSprintsByPi(repository, "pi-1");

		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("Sprint do pi 1");
	});
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest run src/application/sprint/use-cases/list-sprints-by-pi.test.ts`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar o use-case**

```ts
// src/application/sprint/use-cases/list-sprints-by-pi.ts
import type { SprintRepository } from "@/application/sprint/ports/sprint-repository";

export async function listSprintsByPi(repository: SprintRepository, piId: string) {
	return repository.listByPi(piId);
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest run src/application/sprint/use-cases/list-sprints-by-pi.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/application/sprint/use-cases/list-sprints-by-pi.ts src/application/sprint/use-cases/list-sprints-by-pi.test.ts
git commit -m "feat(sprints)!: adiciona use-case de listagem de sprints por pi"
```

---

### Task 9: Repositório Drizzle de `ProgramIncrement`

**Files:**
- Create: `src/infrastructure/sprint/drizzle-program-increment-repository.ts`
- Create: `src/infrastructure/sprint/drizzle-program-increment-repository.test.ts`

**Interfaces:**
- Consumes: `ProgramIncrementRepository`, `CreateProgramIncrementData` (Task 3); `programIncrements` (Task 2); `db` de `@/infrastructure/db/client`.
- Produces: `drizzleProgramIncrementRepository: ProgramIncrementRepository`.

- [ ] **Step 1: Escrever o teste de integração**

```ts
// src/infrastructure/sprint/drizzle-program-increment-repository.test.ts
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/infrastructure/db/client";
import { programIncrements } from "./drizzle/schema";
import { drizzleProgramIncrementRepository } from "./drizzle-program-increment-repository";

async function deletePi(id: string) {
	await db.delete(programIncrements).where(eq(programIncrements.id, id));
}

describe("drizzleProgramIncrementRepository", () => {
	it("cria e busca um pi por id", async () => {
		const created = await drizzleProgramIncrementRepository.create({
			teamId: "00000000-0000-0000-0000-000000000001",
			name: "PI 2026.3",
			startDate: "2026-07-01",
			endDate: "2026-09-30",
		});
		try {
			const found = await drizzleProgramIncrementRepository.findById(created.id);
			expect(found).toEqual(created);
		} finally {
			await deletePi(created.id);
		}
	});

	it("retorna null ao buscar um pi inexistente", async () => {
		expect(
			await drizzleProgramIncrementRepository.findById(
				"00000000-0000-0000-0000-000000000000",
			),
		).toBeNull();
	});

	it("lista apenas os pis do time informado", async () => {
		const teamId = "00000000-0000-0000-0000-000000000002";
		const created = await drizzleProgramIncrementRepository.create({
			teamId,
			name: "PI 2026.3",
			startDate: "2026-07-01",
			endDate: "2026-09-30",
		});
		try {
			const list = await drizzleProgramIncrementRepository.listByTeam(teamId);
			expect(list.map((pi) => pi.id)).toEqual([created.id]);
		} finally {
			await deletePi(created.id);
		}
	});
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest run src/infrastructure/sprint/drizzle-program-increment-repository.test.ts`
Expected: FAIL — módulo `./drizzle-program-increment-repository` não existe.

- [ ] **Step 3: Implementar o repositório**

```ts
// src/infrastructure/sprint/drizzle-program-increment-repository.ts
import { eq } from "drizzle-orm";
import type {
	CreateProgramIncrementData,
	ProgramIncrementRepository,
} from "@/application/sprint/ports/program-increment-repository";
import type { ProgramIncrement } from "@/domain/sprint/entities/program-increment";
import { db } from "@/infrastructure/db/client";
import { programIncrements } from "./drizzle/schema";

export const drizzleProgramIncrementRepository: ProgramIncrementRepository = {
	async create(data: CreateProgramIncrementData) {
		const [row] = await db.insert(programIncrements).values(data).returning();
		return row as ProgramIncrement;
	},
	async listByTeam(teamId) {
		const rows = await db
			.select()
			.from(programIncrements)
			.where(eq(programIncrements.teamId, teamId));
		return rows as ProgramIncrement[];
	},
	async findById(id) {
		const [row] = await db
			.select()
			.from(programIncrements)
			.where(eq(programIncrements.id, id));
		return (row as ProgramIncrement) ?? null;
	},
};
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest run src/infrastructure/sprint/drizzle-program-increment-repository.test.ts`
Expected: PASS (3 testes). Requer Postgres de teste acessível (já configurado pelo `vitest.global-setup.ts` do projeto).

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure/sprint/drizzle-program-increment-repository.ts src/infrastructure/sprint/drizzle-program-increment-repository.test.ts
git commit -m "feat(sprints)!: adiciona repositorio drizzle de programincrement"
```

---

### Task 10: Repositório Drizzle de `Sprint`

**Files:**
- Create: `src/infrastructure/sprint/drizzle-sprint-repository.ts`
- Create: `src/infrastructure/sprint/drizzle-sprint-repository.test.ts`

**Interfaces:**
- Consumes: `SprintRepository`, `CreateSprintData` (Task 4); `sprints`, `programIncrements` (Task 2); `db`.
- Produces: `drizzleSprintRepository: SprintRepository`.

- [ ] **Step 1: Escrever o teste de integração**

```ts
// src/infrastructure/sprint/drizzle-sprint-repository.test.ts
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/infrastructure/db/client";
import { programIncrements, sprints } from "./drizzle/schema";
import { drizzleSprintRepository } from "./drizzle-sprint-repository";

const teamId = "00000000-0000-0000-0000-000000000003";

async function seedPi() {
	const [pi] = await db
		.insert(programIncrements)
		.values({
			teamId,
			name: "PI 2026.3",
			startDate: "2026-07-01",
			endDate: "2026-09-30",
		})
		.returning();
	return pi;
}

async function deletePi(id: string) {
	await db.delete(programIncrements).where(eq(programIncrements.id, id));
}

describe("drizzleSprintRepository", () => {
	it("cria uma sprint como PLANNED e busca por id", async () => {
		const pi = await seedPi();
		try {
			const created = await drizzleSprintRepository.create({
				piId: pi.id,
				teamId,
				name: "Sprint 1",
				startDate: "2026-07-01",
				endDate: "2026-07-14",
			});
			expect(created.status).toBe("PLANNED");
			const found = await drizzleSprintRepository.findById(created.id);
			expect(found).toEqual(created);
		} finally {
			await deletePi(pi.id);
		}
	});

	it("lista as sprints de um pi", async () => {
		const pi = await seedPi();
		try {
			const created = await drizzleSprintRepository.create({
				piId: pi.id,
				teamId,
				name: "Sprint 1",
				startDate: "2026-07-01",
				endDate: "2026-07-14",
			});
			const list = await drizzleSprintRepository.listByPi(pi.id);
			expect(list.map((s) => s.id)).toEqual([created.id]);
		} finally {
			await deletePi(pi.id);
		}
	});

	it("remove as sprints em cascata ao remover o pi", async () => {
		const pi = await seedPi();
		const created = await drizzleSprintRepository.create({
			piId: pi.id,
			teamId,
			name: "Sprint 1",
			startDate: "2026-07-01",
			endDate: "2026-07-14",
		});
		await deletePi(pi.id);
		const [row] = await db.select().from(sprints).where(eq(sprints.id, created.id));
		expect(row).toBeUndefined();
	});
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest run src/infrastructure/sprint/drizzle-sprint-repository.test.ts`
Expected: FAIL — módulo `./drizzle-sprint-repository` não existe.

- [ ] **Step 3: Implementar o repositório**

```ts
// src/infrastructure/sprint/drizzle-sprint-repository.ts
import { eq } from "drizzle-orm";
import type {
	CreateSprintData,
	SprintRepository,
} from "@/application/sprint/ports/sprint-repository";
import type { Sprint, SprintStatus } from "@/domain/sprint/entities/sprint";
import { db } from "@/infrastructure/db/client";
import { sprints } from "./drizzle/schema";

function toSprint(row: typeof sprints.$inferSelect): Sprint {
	return { ...row, status: row.status as SprintStatus };
}

export const drizzleSprintRepository: SprintRepository = {
	async create(data: CreateSprintData) {
		const [row] = await db.insert(sprints).values(data).returning();
		return toSprint(row);
	},
	async listByPi(piId) {
		const rows = await db.select().from(sprints).where(eq(sprints.piId, piId));
		return rows.map(toSprint);
	},
	async listByTeam(teamId) {
		const rows = await db.select().from(sprints).where(eq(sprints.teamId, teamId));
		return rows.map(toSprint);
	},
	async findById(id) {
		const [row] = await db.select().from(sprints).where(eq(sprints.id, id));
		return row ? toSprint(row) : null;
	},
};
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest run src/infrastructure/sprint/drizzle-sprint-repository.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure/sprint/drizzle-sprint-repository.ts src/infrastructure/sprint/drizzle-sprint-repository.test.ts
git commit -m "feat(sprints)!: adiciona repositorio drizzle de sprint"
```

---

### Task 11: Composition root do contexto `sprint`

**Files:**
- Create: `src/composition/sprint.ts`

**Interfaces:**
- Consumes: use-cases das Tasks 5–8; `drizzleProgramIncrementRepository` (Task 9); `drizzleSprintRepository` (Task 10).
- Produces: `createSprintUseCases()` retornando `{ createProgramIncrement, listProgramIncrementsByTeam, createSprint, listSprintsByPi }`.

- [ ] **Step 1: Criar a composition root**

```ts
// src/composition/sprint.ts
import type { CreateProgramIncrementData } from "@/application/sprint/ports/program-increment-repository";
import type { CreateSprintData } from "@/application/sprint/ports/sprint-repository";
import { createProgramIncrement } from "@/application/sprint/use-cases/create-program-increment";
import { createSprint } from "@/application/sprint/use-cases/create-sprint";
import { listProgramIncrementsByTeam } from "@/application/sprint/use-cases/list-program-increments-by-team";
import { listSprintsByPi } from "@/application/sprint/use-cases/list-sprints-by-pi";
import { drizzleProgramIncrementRepository } from "@/infrastructure/sprint/drizzle-program-increment-repository";
import { drizzleSprintRepository } from "@/infrastructure/sprint/drizzle-sprint-repository";

export function createSprintUseCases() {
	return {
		createProgramIncrement: (data: CreateProgramIncrementData) =>
			createProgramIncrement(drizzleProgramIncrementRepository, data),
		listProgramIncrementsByTeam: (teamId: string) =>
			listProgramIncrementsByTeam(drizzleProgramIncrementRepository, teamId),
		createSprint: (data: CreateSprintData) =>
			createSprint(drizzleSprintRepository, drizzleProgramIncrementRepository, data),
		listSprintsByPi: (piId: string) => listSprintsByPi(drizzleSprintRepository, piId),
	};
}
```

- [ ] **Step 2: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/composition/sprint.ts
git commit -m "feat(sprints)!: adiciona composition root do contexto sprint"
```

---

### Task 12: Tela de cadastro `/sprints` — actions e página

**Files:**
- Create: `src/app/sprints/actions.ts`
- Create: `src/app/sprints/page.tsx`

**Interfaces:**
- Consumes: `createSprintUseCases()` (Task 11); `createTeamUseCases()` (existente); `ApplicationError`, `ActionState`, `isUuid` (existentes).
- Produces: `createProgramIncrementAction`, `createSprintAction` (Server Actions no formato `(previousState, formData) => Promise<ActionState>`, para uso com `useActionState`, igual ao padrão de `src/app/tags/actions.ts`).

- [ ] **Step 1: Criar as actions**

```ts
// src/app/sprints/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/application/shared/action-state";
import { ApplicationError } from "@/application/shared/application-error";
import { isUuid } from "@/application/shared/validation";
import { createSprintUseCases } from "@/composition/sprint";
import { createTeamUseCases } from "@/composition/team";

function toActionState(error: unknown): ActionState {
	if (error instanceof ApplicationError) return { error: error.message };
	console.error(error);
	return { error: "Não foi possível concluir a operação" };
}

async function runSprintAction(operation: () => Promise<void>) {
	try {
		await operation();
		revalidatePath("/sprints");
		return { error: null };
	} catch (error) {
		return toActionState(error);
	}
}

function getText(formData: FormData, field: string) {
	const value = formData.get(field);
	if (typeof value !== "string") throw new ApplicationError("Dados inválidos");
	return value;
}

async function getCurrentTeamId() {
	const team = await createTeamUseCases().getCurrentTeam();
	if (!team) throw new ApplicationError("Time não encontrado");
	return team.id;
}

export async function createProgramIncrementAction(
	_previousState: ActionState,
	formData: FormData,
) {
	return runSprintAction(async () => {
		const teamId = await getCurrentTeamId();
		await createSprintUseCases().createProgramIncrement({
			teamId,
			name: getText(formData, "name"),
			startDate: getText(formData, "startDate"),
			endDate: getText(formData, "endDate"),
		});
	});
}

export async function createSprintAction(
	piId: string,
	_previousState: ActionState,
	formData: FormData,
) {
	return runSprintAction(async () => {
		if (!isUuid(piId)) throw new ApplicationError("PI inválido");
		const teamId = await getCurrentTeamId();
		await createSprintUseCases().createSprint({
			piId,
			teamId,
			name: getText(formData, "name"),
			startDate: getText(formData, "startDate"),
			endDate: getText(formData, "endDate"),
		});
	});
}
```

- [ ] **Step 2: Criar a página**

```tsx
// src/app/sprints/page.tsx
import { redirect } from "next/navigation";
import { createSprintUseCases } from "@/composition/sprint";
import { createTeamUseCases } from "@/composition/team";
import { ProgramIncrementForm } from "@/presentation/sprint/program-increment-form";
import { ProgramIncrementList } from "@/presentation/sprint/program-increment-list";
import { createProgramIncrementAction, createSprintAction } from "./actions";

export default async function SprintsPage() {
	const teamUseCases = createTeamUseCases();
	const currentTeam = await teamUseCases.getCurrentTeam();
	if (!currentTeam) {
		redirect("/teams");
	}

	const sprintUseCases = createSprintUseCases();
	const programIncrements = await sprintUseCases.listProgramIncrementsByTeam(
		currentTeam.id,
	);
	const sprintsByPi = await Promise.all(
		programIncrements.map((pi) => sprintUseCases.listSprintsByPi(pi.id)),
	);

	return (
		<main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
			<h1 className="text-xl font-semibold">PIs e Sprints</h1>
			<ProgramIncrementList
				programIncrements={programIncrements.map((pi, index) => ({
					pi,
					sprints: sprintsByPi[index],
				}))}
				createSprintAction={createSprintAction}
			/>
			<ProgramIncrementForm createProgramIncrementAction={createProgramIncrementAction} />
		</main>
	);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/sprints
git commit -m "feat(sprints)!: adiciona rota de cadastro de pis e sprints"
```

(A rota só compilará depois do Task 13, que cria os componentes de apresentação — o commit aqui documenta o adapter de entrada; rode `npx tsc --noEmit` de novo ao final do Task 13 para confirmar que tudo fecha.)

---

### Task 13: Componentes de apresentação — formulários e lista

**Files:**
- Create: `src/presentation/sprint/program-increment-form.tsx`
- Create: `src/presentation/sprint/sprint-form.tsx`
- Create: `src/presentation/sprint/program-increment-list.tsx`

**Interfaces:**
- Consumes: `createProgramIncrementAction`, `createSprintAction` (Task 12, tipadas como `(previousState: ActionState, formData: FormData) => Promise<ActionState>` e `(piId: string, previousState: ActionState, formData: FormData) => Promise<ActionState>` respectivamente); `ProgramIncrement` (Task 1); `Sprint` (Task 1); `SubmitButton` (`@/presentation/shared/submit-button`, existente).

- [ ] **Step 1: Criar `program-increment-form.tsx`**

```tsx
// src/presentation/sprint/program-increment-form.tsx
"use client";

import { useActionState } from "react";
import {
	type ActionState,
	INITIAL_ACTION_STATE,
} from "@/application/shared/action-state";
import { SubmitButton } from "@/presentation/shared/submit-button";

type ProgramIncrementFormProps = {
	createProgramIncrementAction: (
		previousState: ActionState,
		formData: FormData,
	) => Promise<ActionState>;
};

export function ProgramIncrementForm({
	createProgramIncrementAction,
}: ProgramIncrementFormProps) {
	const [state, action] = useActionState(
		createProgramIncrementAction,
		INITIAL_ACTION_STATE,
	);
	return (
		<form action={action} className="flex flex-col gap-2 border-t border-(--border) pt-4">
			<p className="text-sm opacity-70">Novo PI</p>
			<input
				name="name"
				placeholder="Nome do PI (ex: PI 2026.3)"
				className="rounded-lg border border-(--border) px-3 py-2"
				required
			/>
			<div className="flex items-center gap-2">
				<input
					type="date"
					name="startDate"
					className="flex-1 rounded-lg border border-(--border) px-3 py-2"
					required
				/>
				<span className="opacity-60">até</span>
				<input
					type="date"
					name="endDate"
					className="flex-1 rounded-lg border border-(--border) px-3 py-2"
					required
				/>
			</div>
			{state.error ? <p role="alert">{state.error}</p> : null}
			<SubmitButton className="self-start rounded-lg bg-(--accent) px-4 py-2 text-(--accent-fg) disabled:opacity-60">
				Adicionar PI
			</SubmitButton>
		</form>
	);
}
```

- [ ] **Step 2: Criar `sprint-form.tsx`**

```tsx
// src/presentation/sprint/sprint-form.tsx
"use client";

import { useActionState } from "react";
import {
	type ActionState,
	INITIAL_ACTION_STATE,
} from "@/application/shared/action-state";
import { SubmitButton } from "@/presentation/shared/submit-button";

type SprintFormProps = {
	piId: string;
	createSprintAction: (
		piId: string,
		previousState: ActionState,
		formData: FormData,
	) => Promise<ActionState>;
};

export function SprintForm({ piId, createSprintAction }: SprintFormProps) {
	const [state, action] = useActionState(
		createSprintAction.bind(null, piId),
		INITIAL_ACTION_STATE,
	);
	return (
		<form action={action} className="flex flex-wrap items-center gap-2">
			<input
				name="name"
				placeholder="Nome da sprint (ex: Sprint 1)"
				className="flex-1 rounded-lg border border-(--border) px-2 py-1 text-sm"
				required
			/>
			<input
				type="date"
				name="startDate"
				className="rounded-lg border border-(--border) px-2 py-1 text-sm"
				required
			/>
			<input
				type="date"
				name="endDate"
				className="rounded-lg border border-(--border) px-2 py-1 text-sm"
				required
			/>
			<SubmitButton className="rounded-lg border border-(--border) px-3 py-1 text-sm disabled:opacity-60">
				Adicionar sprint
			</SubmitButton>
			{state.error ? <p role="alert" className="w-full text-sm">{state.error}</p> : null}
		</form>
	);
}
```

- [ ] **Step 3: Criar `program-increment-list.tsx`**

```tsx
// src/presentation/sprint/program-increment-list.tsx
import type { ActionState } from "@/application/shared/action-state";
import type { ProgramIncrement } from "@/domain/sprint/entities/program-increment";
import type { Sprint } from "@/domain/sprint/entities/sprint";
import { SprintForm } from "@/presentation/sprint/sprint-form";

type ProgramIncrementListProps = {
	programIncrements: { pi: ProgramIncrement; sprints: Sprint[] }[];
	createSprintAction: (
		piId: string,
		previousState: ActionState,
		formData: FormData,
	) => Promise<ActionState>;
};

export function ProgramIncrementList({
	programIncrements,
	createSprintAction,
}: ProgramIncrementListProps) {
	if (programIncrements.length === 0) {
		return <p className="text-sm opacity-70">Nenhum PI cadastrado ainda.</p>;
	}

	return (
		<ul className="flex flex-col gap-6">
			{programIncrements.map(({ pi, sprints }) => (
				<li key={pi.id} className="flex flex-col gap-3 rounded-lg border border-(--border) p-4">
					<div>
						<p className="font-semibold">{pi.name}</p>
						<p className="text-xs opacity-70">
							{pi.startDate} até {pi.endDate}
						</p>
					</div>
					{sprints.length > 0 ? (
						<ul className="flex flex-col gap-1 text-sm">
							{sprints.map((sprint) => (
								<li key={sprint.id} className="flex items-center gap-2">
									<span
										aria-hidden="true"
										className={`h-1.5 w-1.5 rounded-full ${
											sprint.status === "ACTIVE"
												? "bg-(--accent)"
												: sprint.status === "CLOSED"
													? "bg-(--foreground-muted)"
													: "bg-transparent border border-(--border)"
										}`}
									/>
									{sprint.name} · {sprint.startDate} até {sprint.endDate}
								</li>
							))}
						</ul>
					) : (
						<p className="text-sm opacity-70">Nenhuma sprint cadastrada.</p>
					)}
					<SprintForm piId={pi.id} createSprintAction={createSprintAction} />
				</li>
			))}
		</ul>
	);
}
```

- [ ] **Step 4: Verificar que o projeto inteiro compila**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add src/presentation/sprint
git commit -m "feat(sprints)!: adiciona formularios e listagem de pis e sprints"
```

---

### Task 14: Link de navegação para `/sprints`

**Files:**
- Modify: `src/presentation/shared/header-nav.tsx:6-11`

**Interfaces:**
- Nenhuma nova — apenas adiciona uma entrada em `NAV_LINKS`.

- [ ] **Step 1: Adicionar o link**

```ts
// src/presentation/shared/header-nav.tsx
const NAV_LINKS = [
	{ href: "/board", label: "Quadro" },
	{ href: "/metrics", label: "Métricas" },
	{ href: "/sprints", label: "Sprints" },
	{ href: "/task-types", label: "Tipos de task" },
	{ href: "/tags", label: "Tarjas" },
] as const;
```

- [ ] **Step 2: Verificar visualmente**

Run: `npm run dev` e abrir `http://localhost:3000/sprints` no navegador (com um time já selecionado). Confirmar:
- O link "Sprints" aparece no menu e fica destacado quando a rota está ativa.
- É possível criar um PI (nome + datas) e ele aparece na lista.
- Dentro do PI criado, é possível adicionar uma sprint (nome + datas) e ela aparece listada com o indicador de status `PLANNED`.
- Mensagens de erro aparecem ao tentar salvar com data de término igual/anterior à de início.

- [ ] **Step 3: Commit**

```bash
git add src/presentation/shared/header-nav.tsx
git commit -m "feat(sprints)!: adiciona link de sprints ao menu de navegacao"
```

---

### Task 15: Verificação final

- [ ] **Step 1: Rodar a suíte completa de testes**

Run: `npm run test`
Expected: todos os testes passam, incluindo os novos de `sprint` (domain, application com fakes, infrastructure com Postgres real).

- [ ] **Step 2: Rodar o typecheck**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Rodar o Biome**

Run: `npm run lint`
Expected: sem violações. Se houver problemas de formatação, rodar `npm run lint:fix` e revisar o diff antes de comitar.

- [ ] **Step 4: Rodar o Knip**

Run: `npm run knip`
Expected: nenhum arquivo/export novo do contexto `sprint` reportado como não usado (todos os arquivos criados são alcançados a partir de `src/app/sprints/page.tsx` e `src/composition/sprint.ts`).

- [ ] **Step 5: Atualizar o README se necessário**

Se `/sprints` merece uma linha na lista de telas do `README.md` (seguindo o padrão das outras rotas documentadas), adicionar. Caso o README não liste rotas individualmente hoje, pular este passo.

---

## Próximos planos (fora deste escopo)

Com esta fundação implementada, os próximos planos da spec `docs/superpowers/specs/2026-07-23-pi-sprints-design.md` são:

1. **Atribuição de card à sprint + visão "por sprint" no quadro** — campo de sprint no modal do card, seletor de visão Atual/Por sprint, filtro de cards por `sprintId`.
2. **Ciclo de vida da sprint** — iniciar/finalizar sprint, regra de overflow, `sprint_task_snapshots` e `sprint_metrics_snapshot`, visão histórica read-only de sprints fechadas.
3. **Filtro de sprint nas métricas** — toggle Período/Sprint, cálculo ao vivo para sprints abertas, leitura do snapshot para sprints fechadas.
