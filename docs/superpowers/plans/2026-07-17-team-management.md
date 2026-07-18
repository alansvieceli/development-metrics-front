# Gestão e Seleção de Time — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o sub-projeto 1 de 4 do Development Metrics — cadastro/seleção/troca de time e gestão de membros — conforme [docs/superpowers/specs/2026-07-17-team-management-design.md](../specs/2026-07-17-team-management-design.md).

**Architecture:** Clean Architecture + DDD por bounded context (`team`), seguindo [techdocs/architecture.md](../../../techdocs/architecture.md): `domain` (entidades puras) → `application` (casos de uso + ports) ← `infrastructure` (Drizzle/Postgres, cookie) ← `composition` (factories) ← `presentation`/`app` (Server Components, Server Actions). Este é o primeiro sub-projeto do produto, então este plano também introduz toda a base técnica ainda inexistente: Tailwind CSS, Drizzle + Postgres, Vitest e Playwright.

**Tech Stack:** Next.js App Router, TypeScript estrito, Tailwind CSS v4, Drizzle ORM + Postgres (`postgres` driver), Vitest (testes unitários), Playwright (testes de integração/E2E), Biome, Knip.

## Global Constraints

- Alias de import `@/*` aponta para `./src/*` (já configurado em `tsconfig.json`).
- Regra de dependência (Clean Architecture): `domain` não importa nada de fora; `application` só conhece `domain` e seus próprios `ports`; `infrastructure` implementa ports de `application` e nunca é importada por `presentation`; `presentation`/`app` só chamam casos de uso via `composition`. Ver [architecture.md](../../../techdocs/architecture.md).
- Nenhuma abstração especulativa: um port só existe porque uma implementação concreta real o consome nesta mesma spec.
- Arquivos em `kebab-case`; componentes React e tipos em `PascalCase`. Ver [guidelines.md](../../../techdocs/guidelines.md).
- Mensagens de commit devem seguir exatamente o formato validado pelo hook do projeto: `tipo(contexto)!: descrição` — contexto em letras minúsculas/números sem espaços, descrição em português, minúscula, verbo no presente, sem ponto final. Ver a tabela de tipos em [guidelines.md](../../../techdocs/guidelines.md). Não incluir corpo nem rodapé na mensagem.
- Tailwind CSS v4 é a biblioteca de estilização adotada. Paleta: tema claro fundo `#E4FD97`/texto `#2D3E2C`; tema escuro fundo `#2D3E2C`/texto `#E4FD97`; alternância por `prefers-color-scheme` (já existente em `globals.css`).
- Drizzle ORM + Postgres (`devops/docker-compose.yml`) é a persistência adotada. Schema e queries de cada contexto ficam confinados a `infrastructure/<contexto>/drizzle`.
- **Sem middleware/`proxy.ts`.** O gate de "time selecionado" não pode ser um único `app/layout.tsx` plano: como ele envolveria também a própria rota `/teams`, um `redirect("/teams")" incondicional causaria loop de redirecionamento ao acessar `/teams`. Este plano resolve isso com **dois root layouts via route groups** (`app/(teams)/` sem gate e `app/(main)/` com gate) — um recurso nativo do App Router para múltiplos root layouts, não uma camada de borda adicional. Detalhes na Task 15.
- Testes: Vitest para `domain`/`application` (com fakes em memória) e para o `infrastructure` que fala com Postgres real; Playwright para fluxos críticos de `presentation`/`app` (cookie, redirect, interação client-side). Nenhum dos dois existe no projeto ainda — ambos são introduzidos neste plano.
- Banco local via `docker compose -f devops/docker-compose.yml up -d`. Dois bancos: `development_metrics` (dev) e `development_metrics_test` (testes), este último criado por script de init do container.

---

### Task 1: Tailwind CSS v4 e paleta de cores do tema

**Files:**
- Modify: `package.json`
- Create: `postcss.config.mjs`
- Modify: `src/app/globals.css`
- Modify: `README.md`

**Interfaces:**
- Consumes: nada (primeira task).
- Produces: classes utilitárias Tailwind disponíveis em todo `src/app` e `src/presentation`; variáveis CSS `--background`/`--foreground` com a paleta do tema, consumidas por qualquer componente via `var(--background)`/`var(--foreground)`.

- [ ] **Step 1: Instalar Tailwind CSS v4**

```bash
npm install -D tailwindcss@4.3.3 @tailwindcss/postcss@4.3.3 postcss@8.5.19
```

- [ ] **Step 2: Criar a configuração do PostCSS**

`postcss.config.mjs`:

```js
export default {
	plugins: {
		"@tailwindcss/postcss": {},
	},
};
```

- [ ] **Step 3: Atualizar `globals.css` com Tailwind e a paleta do tema**

Substituir todo o conteúdo de `src/app/globals.css` por:

```css
@import "tailwindcss";

:root {
	--background: #e4fd97;
	--foreground: #2d3e2c;
}

@media (prefers-color-scheme: dark) {
	:root {
		--background: #2d3e2c;
		--foreground: #e4fd97;
	}
}

html {
	height: 100%;
}

html,
body {
	max-width: 100vw;
	overflow-x: hidden;
}

body {
	min-height: 100%;
	display: flex;
	flex-direction: column;
	color: var(--foreground);
	background: var(--background);
	font-family: Arial, Helvetica, sans-serif;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
}

a {
	color: inherit;
	text-decoration: none;
}

@media (prefers-color-scheme: dark) {
	html {
		color-scheme: dark;
	}
}
```

O reset manual `* { box-sizing: border-box; padding: 0; margin: 0; }` foi removido: o Preflight do Tailwind (incluído via `@import "tailwindcss"`) já cobre isso, evitando duplicar o mesmo reset.

- [ ] **Step 4: Verificar que o build compila com Tailwind**

Run: `npm run build`
Expected: build conclui sem erros (a saída inclui a geração do CSS do Tailwind).

- [ ] **Step 5: Atualizar o README**

Em `README.md`, na lista de "Stack", adicionar a linha `- Tailwind CSS (estilização)` logo após a linha do TypeScript.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json postcss.config.mjs src/app/globals.css README.md
git commit -m "chore(estilo)!: adiciona tailwind css e paleta de cores do tema"
```

---

### Task 2: Bootstrap do Vitest (testes unitários)

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

**Interfaces:**
- Consumes: nada.
- Produces: script `npm test` executando Vitest; qualquer arquivo `*.test.ts` sob `src/` é coletado automaticamente pela configuração padrão do Vitest.

- [ ] **Step 1: Instalar o Vitest**

```bash
npm install -D vitest@4.1.10
```

- [ ] **Step 2: Criar a configuração do Vitest**

`vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node",
	},
});
```

- [ ] **Step 3: Adicionar os scripts no `package.json`**

Em `package.json`, dentro de `"scripts"`, adicionar:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Verificar que o Vitest roda**

Run: `npm test`
Expected: Vitest inicia e reporta "No test files found" — esperado, pois ainda não existe nenhum arquivo `*.test.ts` (os primeiros chegam na Task 6).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore(testes)!: configura vitest para testes unitarios"
```

---

### Task 3: Bootstrap do Playwright (testes de integração/E2E)

**Files:**
- Modify: `package.json`
- Create: `playwright.config.ts`
- Create: `tests/integration/smoke.spec.ts`

**Interfaces:**
- Consumes: nada.
- Produces: script `npm run test:e2e`; servidor de desenvolvimento sobe automaticamente na porta 3100 durante os testes.

- [ ] **Step 1: Instalar o Playwright e os browsers**

```bash
npm install -D @playwright/test@1.61.1
npx playwright install chromium
```

- [ ] **Step 2: Criar a configuração do Playwright**

`playwright.config.ts`:

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: "./tests/integration",
	fullyParallel: false,
	webServer: {
		command: "npm run dev -- --port 3100",
		url: "http://localhost:3100",
		reuseExistingServer: !process.env.CI,
	},
	use: {
		baseURL: "http://localhost:3100",
	},
});
```

- [ ] **Step 3: Criar um teste de fumaça**

`tests/integration/smoke.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("smoke: a home responde com sucesso", async ({ page }) => {
	const response = await page.goto("/");
	expect(response?.ok()).toBeTruthy();
});
```

Este teste fica deliberadamente independente de conteúdo da página (não afirma texto específico), porque a Task 15 vai mudar o comportamento de `/` (passa a exigir time selecionado). Ele só valida que o harness Playwright + servidor Next.js estão corretamente conectados.

- [ ] **Step 4: Adicionar o script no `package.json`**

Em `package.json`, dentro de `"scripts"`, adicionar:

```json
"test:e2e": "playwright test"
```

- [ ] **Step 5: Rodar o teste de fumaça**

Run: `npm run test:e2e`
Expected: 1 passed.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json playwright.config.ts tests/integration/smoke.spec.ts
git commit -m "chore(testes)!: configura playwright para testes de integracao"
```

---

### Task 4: Entidades de domínio — Team e Member

**Files:**
- Create: `src/domain/team/entities/team.ts`
- Create: `src/domain/team/entities/member.ts`

**Interfaces:**
- Consumes: nada.
- Produces: tipos `Team { id: string; name: string }` e `Member { id: string; name: string; teamId: string }`, usados por todas as tasks seguintes deste plano.

- [ ] **Step 1: Criar a entidade `Team`**

`src/domain/team/entities/team.ts`:

```ts
export type Team = {
	id: string;
	name: string;
};
```

- [ ] **Step 2: Criar a entidade `Member`**

`src/domain/team/entities/member.ts`:

```ts
export type Member = {
	id: string;
	name: string;
	teamId: string;
};
```

- [ ] **Step 3: Verificar tipos**

Run: `npm run typecheck`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/domain/team/entities/team.ts src/domain/team/entities/member.ts
git commit -m "feat(times)!: adiciona entidades de time e membro"
```

---

### Task 5: Ports de Team e repositório fake para testes

**Files:**
- Create: `src/application/team/ports/team-repository.ts`
- Create: `src/application/team/ports/current-team-store.ts`
- Create: `src/application/team/use-cases/test-helpers/create-fake-team-repository.ts`

**Interfaces:**
- Consumes: `Team` e `Member` de `@/domain/team/entities/team` e `@/domain/team/entities/member` (Task 4).
- Produces:
  - Tipo `TeamRepository` com os métodos: `create(name: string): Promise<Team>`, `rename(teamId: string, name: string): Promise<Team>`, `delete(teamId: string): Promise<void>`, `listAll(): Promise<Team[]>`, `findById(teamId: string): Promise<Team | null>`, `addMember(teamId: string, name: string): Promise<Member>`, `renameMember(memberId: string, name: string): Promise<Member>`, `removeMember(memberId: string): Promise<void>`, `listMembers(teamId: string): Promise<Member[]>`.
  - Tipo `CurrentTeamStore` com `get(): Promise<string | null>` e `set(teamId: string): Promise<void>`.
  - Função `createFakeTeamRepository(): TeamRepository`, um repositório em memória usado por todos os testes unitários de casos de uso (Tasks 6, 7, 8).

- [ ] **Step 1: Criar o port `TeamRepository`**

`src/application/team/ports/team-repository.ts`:

```ts
import type { Member } from "@/domain/team/entities/member";
import type { Team } from "@/domain/team/entities/team";

export type TeamRepository = {
	create(name: string): Promise<Team>;
	rename(teamId: string, name: string): Promise<Team>;
	delete(teamId: string): Promise<void>;
	listAll(): Promise<Team[]>;
	findById(teamId: string): Promise<Team | null>;
	addMember(teamId: string, name: string): Promise<Member>;
	renameMember(memberId: string, name: string): Promise<Member>;
	removeMember(memberId: string): Promise<void>;
	listMembers(teamId: string): Promise<Member[]>;
};
```

- [ ] **Step 2: Criar o port `CurrentTeamStore`**

`src/application/team/ports/current-team-store.ts`:

```ts
export type CurrentTeamStore = {
	get(): Promise<string | null>;
	set(teamId: string): Promise<void>;
};
```

- [ ] **Step 3: Criar o repositório fake para testes**

`src/application/team/use-cases/test-helpers/create-fake-team-repository.ts`:

```ts
import type { Member } from "@/domain/team/entities/member";
import type { Team } from "@/domain/team/entities/team";
import type { TeamRepository } from "@/application/team/ports/team-repository";

export function createFakeTeamRepository(): TeamRepository {
	let teams: Team[] = [];
	let members: Member[] = [];
	let nextId = 1;

	return {
		async create(name) {
			const team: Team = { id: `team-${nextId++}`, name };
			teams.push(team);
			return team;
		},
		async rename(teamId, name) {
			const team = teams.find((t) => t.id === teamId);
			if (!team) {
				throw new Error("Time não encontrado");
			}
			team.name = name;
			return team;
		},
		async delete(teamId) {
			teams = teams.filter((t) => t.id !== teamId);
			members = members.filter((m) => m.teamId !== teamId);
		},
		async listAll() {
			return teams;
		},
		async findById(teamId) {
			return teams.find((t) => t.id === teamId) ?? null;
		},
		async addMember(teamId, name) {
			const member: Member = { id: `member-${nextId++}`, name, teamId };
			members.push(member);
			return member;
		},
		async renameMember(memberId, name) {
			const member = members.find((m) => m.id === memberId);
			if (!member) {
				throw new Error("Membro não encontrado");
			}
			member.name = name;
			return member;
		},
		async removeMember(memberId) {
			members = members.filter((m) => m.id !== memberId);
		},
		async listMembers(teamId) {
			return members.filter((m) => m.teamId === teamId);
		},
	};
}
```

- [ ] **Step 4: Verificar tipos**

Run: `npm run typecheck`
Expected: sem erros (o fake só compila se implementar `TeamRepository` corretamente — essa é a checagem desta task).

- [ ] **Step 5: Commit**

```bash
git add src/application/team/ports src/application/team/use-cases/test-helpers
git commit -m "feat(times)!: adiciona ports de time e repositorio fake para testes"
```

---

### Task 6: Casos de uso de CRUD de time

**Files:**
- Create: `src/application/team/use-cases/create-team.ts`
- Create: `src/application/team/use-cases/create-team.test.ts`
- Create: `src/application/team/use-cases/rename-team.ts`
- Create: `src/application/team/use-cases/rename-team.test.ts`
- Create: `src/application/team/use-cases/delete-team.ts`
- Create: `src/application/team/use-cases/delete-team.test.ts`
- Create: `src/application/team/use-cases/list-teams.ts`
- Create: `src/application/team/use-cases/list-teams.test.ts`
- Create: `src/application/team/use-cases/get-team.ts`
- Create: `src/application/team/use-cases/get-team.test.ts`

**Interfaces:**
- Consumes: `TeamRepository` (Task 5), `createFakeTeamRepository()` (Task 5), `Team`/`Member` (Task 4).
- Produces:
  - `createTeam(repository: TeamRepository, name: string): Promise<Team>`
  - `renameTeam(repository: TeamRepository, teamId: string, name: string): Promise<Team>`
  - `deleteTeam(repository: TeamRepository, teamId: string): Promise<void>`
  - `listTeams(repository: TeamRepository): Promise<Team[]>`
  - `getTeam(repository: TeamRepository, teamId: string): Promise<TeamWithMembers | null>` onde `TeamWithMembers = { team: Team; members: Member[] }` (exportado de `get-team.ts`).

- [ ] **Step 1: Escrever os testes que falham**

`src/application/team/use-cases/create-team.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createFakeTeamRepository } from "./test-helpers/create-fake-team-repository";
import { createTeam } from "./create-team";

describe("createTeam", () => {
	it("cria um time com o nome informado", async () => {
		const repository = createFakeTeamRepository();
		const team = await createTeam(repository, "Time A");
		expect(team.name).toBe("Time A");
		expect(await repository.listAll()).toEqual([team]);
	});

	it("rejeita nome vazio", async () => {
		const repository = createFakeTeamRepository();
		await expect(createTeam(repository, "   ")).rejects.toThrow(
			"Nome do time não pode ser vazio",
		);
	});
});
```

`src/application/team/use-cases/rename-team.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createFakeTeamRepository } from "./test-helpers/create-fake-team-repository";
import { renameTeam } from "./rename-team";

describe("renameTeam", () => {
	it("renomeia um time existente", async () => {
		const repository = createFakeTeamRepository();
		const team = await repository.create("Time A");
		const renamed = await renameTeam(repository, team.id, "Time B");
		expect(renamed.name).toBe("Time B");
	});

	it("rejeita nome vazio", async () => {
		const repository = createFakeTeamRepository();
		const team = await repository.create("Time A");
		await expect(renameTeam(repository, team.id, " ")).rejects.toThrow(
			"Nome do time não pode ser vazio",
		);
	});
});
```

`src/application/team/use-cases/delete-team.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createFakeTeamRepository } from "./test-helpers/create-fake-team-repository";
import { deleteTeam } from "./delete-team";

describe("deleteTeam", () => {
	it("remove o time do repositório", async () => {
		const repository = createFakeTeamRepository();
		const team = await repository.create("Time A");
		await deleteTeam(repository, team.id);
		expect(await repository.findById(team.id)).toBeNull();
	});
});
```

`src/application/team/use-cases/list-teams.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createFakeTeamRepository } from "./test-helpers/create-fake-team-repository";
import { listTeams } from "./list-teams";

describe("listTeams", () => {
	it("lista todos os times cadastrados", async () => {
		const repository = createFakeTeamRepository();
		await repository.create("Time A");
		await repository.create("Time B");
		const teams = await listTeams(repository);
		expect(teams.map((t) => t.name)).toEqual(["Time A", "Time B"]);
	});

	it("retorna lista vazia quando não há times", async () => {
		const repository = createFakeTeamRepository();
		expect(await listTeams(repository)).toEqual([]);
	});
});
```

`src/application/team/use-cases/get-team.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createFakeTeamRepository } from "./test-helpers/create-fake-team-repository";
import { getTeam } from "./get-team";

describe("getTeam", () => {
	it("retorna o time com seus membros", async () => {
		const repository = createFakeTeamRepository();
		const team = await repository.create("Time A");
		await repository.addMember(team.id, "Ana");
		const result = await getTeam(repository, team.id);
		expect(result?.team).toEqual(team);
		expect(result?.members.map((m) => m.name)).toEqual(["Ana"]);
	});

	it("retorna null quando o time não existe", async () => {
		const repository = createFakeTeamRepository();
		expect(await getTeam(repository, "inexistente")).toBeNull();
	});
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npm test`
Expected: FAIL — módulos `./create-team`, `./rename-team`, `./delete-team`, `./list-teams`, `./get-team` não encontrados.

- [ ] **Step 3: Implementar os casos de uso**

`src/application/team/use-cases/create-team.ts`:

```ts
import type { TeamRepository } from "@/application/team/ports/team-repository";

export async function createTeam(repository: TeamRepository, name: string) {
	const trimmed = name.trim();
	if (!trimmed) {
		throw new Error("Nome do time não pode ser vazio");
	}
	return repository.create(trimmed);
}
```

`src/application/team/use-cases/rename-team.ts`:

```ts
import type { TeamRepository } from "@/application/team/ports/team-repository";

export async function renameTeam(
	repository: TeamRepository,
	teamId: string,
	name: string,
) {
	const trimmed = name.trim();
	if (!trimmed) {
		throw new Error("Nome do time não pode ser vazio");
	}
	return repository.rename(teamId, trimmed);
}
```

`src/application/team/use-cases/delete-team.ts`:

```ts
import type { TeamRepository } from "@/application/team/ports/team-repository";

export async function deleteTeam(repository: TeamRepository, teamId: string) {
	await repository.delete(teamId);
}
```

`src/application/team/use-cases/list-teams.ts`:

```ts
import type { TeamRepository } from "@/application/team/ports/team-repository";

export function listTeams(repository: TeamRepository) {
	return repository.listAll();
}
```

`src/application/team/use-cases/get-team.ts`:

```ts
import type { Member } from "@/domain/team/entities/member";
import type { Team } from "@/domain/team/entities/team";
import type { TeamRepository } from "@/application/team/ports/team-repository";

export type TeamWithMembers = {
	team: Team;
	members: Member[];
};

export async function getTeam(
	repository: TeamRepository,
	teamId: string,
): Promise<TeamWithMembers | null> {
	const team = await repository.findById(teamId);
	if (!team) {
		return null;
	}
	const members = await repository.listMembers(teamId);
	return { team, members };
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npm test`
Expected: PASS — 9 testes (2 + 2 + 1 + 2 + 2).

- [ ] **Step 5: Commit**

```bash
git add src/application/team/use-cases/create-team.ts src/application/team/use-cases/create-team.test.ts src/application/team/use-cases/rename-team.ts src/application/team/use-cases/rename-team.test.ts src/application/team/use-cases/delete-team.ts src/application/team/use-cases/delete-team.test.ts src/application/team/use-cases/list-teams.ts src/application/team/use-cases/list-teams.test.ts src/application/team/use-cases/get-team.ts src/application/team/use-cases/get-team.test.ts
git commit -m "feat(times)!: adiciona casos de uso de crud de time"
```

---

### Task 7: Casos de uso de CRUD de membro

**Files:**
- Create: `src/application/team/use-cases/add-member.ts`
- Create: `src/application/team/use-cases/add-member.test.ts`
- Create: `src/application/team/use-cases/rename-member.ts`
- Create: `src/application/team/use-cases/rename-member.test.ts`
- Create: `src/application/team/use-cases/remove-member.ts`
- Create: `src/application/team/use-cases/remove-member.test.ts`

**Interfaces:**
- Consumes: `TeamRepository` e `createFakeTeamRepository()` (Task 5).
- Produces:
  - `addMember(repository: TeamRepository, teamId: string, name: string): Promise<Member>`
  - `renameMember(repository: TeamRepository, memberId: string, name: string): Promise<Member>`
  - `removeMember(repository: TeamRepository, memberId: string): Promise<void>`

- [ ] **Step 1: Escrever os testes que falham**

`src/application/team/use-cases/add-member.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createFakeTeamRepository } from "./test-helpers/create-fake-team-repository";
import { addMember } from "./add-member";

describe("addMember", () => {
	it("adiciona um membro ao time", async () => {
		const repository = createFakeTeamRepository();
		const team = await repository.create("Time A");
		const member = await addMember(repository, team.id, "Ana");
		expect(member.name).toBe("Ana");
		expect(member.teamId).toBe(team.id);
	});

	it("rejeita nome vazio", async () => {
		const repository = createFakeTeamRepository();
		const team = await repository.create("Time A");
		await expect(addMember(repository, team.id, " ")).rejects.toThrow(
			"Nome do membro não pode ser vazio",
		);
	});
});
```

`src/application/team/use-cases/rename-member.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createFakeTeamRepository } from "./test-helpers/create-fake-team-repository";
import { renameMember } from "./rename-member";

describe("renameMember", () => {
	it("renomeia um membro existente", async () => {
		const repository = createFakeTeamRepository();
		const team = await repository.create("Time A");
		const member = await repository.addMember(team.id, "Ana");
		const renamed = await renameMember(repository, member.id, "Ana Souza");
		expect(renamed.name).toBe("Ana Souza");
	});

	it("rejeita nome vazio", async () => {
		const repository = createFakeTeamRepository();
		const team = await repository.create("Time A");
		const member = await repository.addMember(team.id, "Ana");
		await expect(renameMember(repository, member.id, " ")).rejects.toThrow(
			"Nome do membro não pode ser vazio",
		);
	});
});
```

`src/application/team/use-cases/remove-member.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createFakeTeamRepository } from "./test-helpers/create-fake-team-repository";
import { removeMember } from "./remove-member";

describe("removeMember", () => {
	it("remove o membro do time", async () => {
		const repository = createFakeTeamRepository();
		const team = await repository.create("Time A");
		const member = await repository.addMember(team.id, "Ana");
		await removeMember(repository, member.id);
		expect(await repository.listMembers(team.id)).toEqual([]);
	});
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npm test`
Expected: FAIL — módulos `./add-member`, `./rename-member`, `./remove-member` não encontrados.

- [ ] **Step 3: Implementar os casos de uso**

`src/application/team/use-cases/add-member.ts`:

```ts
import type { TeamRepository } from "@/application/team/ports/team-repository";

export async function addMember(
	repository: TeamRepository,
	teamId: string,
	name: string,
) {
	const trimmed = name.trim();
	if (!trimmed) {
		throw new Error("Nome do membro não pode ser vazio");
	}
	return repository.addMember(teamId, trimmed);
}
```

`src/application/team/use-cases/rename-member.ts`:

```ts
import type { TeamRepository } from "@/application/team/ports/team-repository";

export async function renameMember(
	repository: TeamRepository,
	memberId: string,
	name: string,
) {
	const trimmed = name.trim();
	if (!trimmed) {
		throw new Error("Nome do membro não pode ser vazio");
	}
	return repository.renameMember(memberId, trimmed);
}
```

`src/application/team/use-cases/remove-member.ts`:

```ts
import type { TeamRepository } from "@/application/team/ports/team-repository";

export async function removeMember(
	repository: TeamRepository,
	memberId: string,
) {
	await repository.removeMember(memberId);
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npm test`
Expected: PASS — 5 testes (2 + 2 + 1) somados aos 9 da Task 6.

- [ ] **Step 5: Commit**

```bash
git add src/application/team/use-cases/add-member.ts src/application/team/use-cases/add-member.test.ts src/application/team/use-cases/rename-member.ts src/application/team/use-cases/rename-member.test.ts src/application/team/use-cases/remove-member.ts src/application/team/use-cases/remove-member.test.ts
git commit -m "feat(times)!: adiciona casos de uso de crud de membro"
```

---

### Task 8: Caso de uso `getCurrentTeam`

**Files:**
- Create: `src/application/team/use-cases/get-current-team.ts`
- Create: `src/application/team/use-cases/get-current-team.test.ts`

**Interfaces:**
- Consumes: `TeamRepository`, `CurrentTeamStore`, `createFakeTeamRepository()` (Task 5).
- Produces: `getCurrentTeam(store: CurrentTeamStore, repository: TeamRepository): Promise<Team | null>` — usado pelo gate do layout (Task 15) e pelo composition root (Task 12).

- [ ] **Step 1: Escrever o teste que falha**

`src/application/team/use-cases/get-current-team.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { CurrentTeamStore } from "@/application/team/ports/current-team-store";
import { createFakeTeamRepository } from "./test-helpers/create-fake-team-repository";
import { getCurrentTeam } from "./get-current-team";

function createFakeCurrentTeamStore(initial: string | null): CurrentTeamStore {
	let value = initial;
	return {
		async get() {
			return value;
		},
		async set(teamId) {
			value = teamId;
		},
	};
}

describe("getCurrentTeam", () => {
	it("retorna o time quando o cookie aponta para um time existente", async () => {
		const repository = createFakeTeamRepository();
		const team = await repository.create("Time A");
		const store = createFakeCurrentTeamStore(team.id);
		expect(await getCurrentTeam(store, repository)).toEqual(team);
	});

	it("retorna null quando não há cookie", async () => {
		const repository = createFakeTeamRepository();
		const store = createFakeCurrentTeamStore(null);
		expect(await getCurrentTeam(store, repository)).toBeNull();
	});

	it("retorna null quando o cookie aponta para um time que não existe mais", async () => {
		const repository = createFakeTeamRepository();
		const store = createFakeCurrentTeamStore("time-excluido");
		expect(await getCurrentTeam(store, repository)).toBeNull();
	});
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npm test`
Expected: FAIL — módulo `./get-current-team` não encontrado.

- [ ] **Step 3: Implementar o caso de uso**

`src/application/team/use-cases/get-current-team.ts`:

```ts
import type { Team } from "@/domain/team/entities/team";
import type { CurrentTeamStore } from "@/application/team/ports/current-team-store";
import type { TeamRepository } from "@/application/team/ports/team-repository";

export async function getCurrentTeam(
	store: CurrentTeamStore,
	repository: TeamRepository,
): Promise<Team | null> {
	const teamId = await store.get();
	if (!teamId) {
		return null;
	}
	return repository.findById(teamId);
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm test`
Expected: PASS — 3 testes somados aos 14 anteriores (17 no total).

- [ ] **Step 5: Commit**

```bash
git add src/application/team/use-cases/get-current-team.ts src/application/team/use-cases/get-current-team.test.ts
git commit -m "feat(times)!: adiciona caso de uso de time atual"
```

---

### Task 9: Postgres, Drizzle e schema de time

**Files:**
- Modify: `package.json`
- Modify: `devops/docker-compose.yml`
- Create: `devops/initdb/01-create-test-database.sql`
- Create: `drizzle.config.ts`
- Create: `src/infrastructure/db/client.ts`
- Create: `src/infrastructure/team/drizzle/schema.ts`
- Create: `scripts/migrate-database.ts`
- Create: `vitest.global-setup.ts`
- Modify: `vitest.config.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: nada de tasks anteriores (é infraestrutura nova).
- Produces:
  - `db` (instância Drizzle) exportado de `@/infrastructure/db/client`, usado por qualquer repositório Drizzle de qualquer contexto.
  - Tabelas `teams` e `members` exportadas de `@/infrastructure/team/drizzle/schema`.
  - `migrateDatabase(connectionString: string): Promise<void>` exportado de `scripts/migrate-database`, usado pelos `globalSetup` de Vitest (esta task) e, na Task 17, de Playwright.
  - Banco `development_metrics_test` migrado automaticamente antes de cada execução de `npm test`.

- [ ] **Step 1: Instalar as dependências**

```bash
npm install drizzle-orm@0.45.2 postgres@3.4.9
npm install -D drizzle-kit@0.31.10
```

- [ ] **Step 2: Criar o banco de testes via script de init do Postgres**

`devops/initdb/01-create-test-database.sql`:

```sql
CREATE DATABASE development_metrics_test;
```

Em `devops/docker-compose.yml`, adicionar o volume do init script ao serviço `postgres`:

```yaml
services:
  postgres:
    image: postgres:16
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: development_metrics
    ports:
      - "5432:5432"
    volumes:
      - ./data:/var/lib/postgresql/data
      - ./initdb:/docker-entrypoint-initdb.d
```

Scripts em `/docker-entrypoint-initdb.d` só rodam na primeira inicialização de um volume vazio. Subir o Postgres:

```bash
docker compose -f devops/docker-compose.yml up -d
```

Se o container já tiver sido iniciado antes deste passo (volume `devops/data` já existente), recriar o volume para que o script rode: `docker compose -f devops/docker-compose.yml down -v && docker compose -f devops/docker-compose.yml up -d` (descarta dados locais de desenvolvimento, aceitável nesta fase do projeto).

- [ ] **Step 3: Criar o arquivo de ambiente local**

Criar manualmente `.env` na raiz do projeto (já coberto por `.env*` no `.gitignore`, não deve ser commitado):

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/development_metrics
```

- [ ] **Step 4: Criar o schema Drizzle de `team`**

`src/infrastructure/team/drizzle/schema.ts`:

```ts
import { pgTable, text, uuid } from "drizzle-orm/pg-core";

export const teams = pgTable("teams", {
	id: uuid("id").defaultRandom().primaryKey(),
	name: text("name").notNull(),
});

export const members = pgTable("members", {
	id: uuid("id").defaultRandom().primaryKey(),
	name: text("name").notNull(),
	teamId: uuid("team_id")
		.notNull()
		.references(() => teams.id, { onDelete: "cascade" }),
});
```

`onDelete: "cascade"` garante que excluir um time remove seus membros, evitando membros órfãos.

- [ ] **Step 5: Criar o cliente Drizzle compartilhado**

`src/infrastructure/db/client.ts`:

```ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const client = postgres(process.env.DATABASE_URL as string);

export const db = drizzle(client);
```

Este cliente vive fora de `infrastructure/team` porque é compartilhado por todos os contextos que futuramente acessarem Postgres (um único pool de conexões para toda a aplicação, não uma abstração especulativa).

- [ ] **Step 6: Criar a configuração do Drizzle Kit**

`drizzle.config.ts`:

```ts
import { defineConfig } from "drizzle-kit";

try {
	process.loadEnvFile();
} catch {
	// .env é opcional; variáveis também podem vir do ambiente (CI, docker etc.)
}

export default defineConfig({
	schema: "./src/infrastructure/**/drizzle/schema.ts",
	out: "./drizzle/migrations",
	dialect: "postgresql",
	dbCredentials: {
		url: process.env.DATABASE_URL as string,
	},
});
```

O padrão `./src/infrastructure/**/drizzle/schema.ts` já cobre os schemas de futuros contextos (`task`, `metrics` etc.), seguindo a mesma convenção de pastas de `architecture.md` sem precisar editar este arquivo a cada novo sub-projeto.

- [ ] **Step 7: Adicionar os scripts do Drizzle Kit no `package.json`**

Em `package.json`, dentro de `"scripts"`, adicionar:

```json
"db:generate": "drizzle-kit generate",
"db:migrate": "drizzle-kit migrate"
```

- [ ] **Step 8: Gerar e aplicar a primeira migração no banco de desenvolvimento**

```bash
npm run db:generate
npm run db:migrate
```

Expected: `drizzle/migrations/0000_<nome-gerado>.sql` criado com `CREATE TABLE teams` e `CREATE TABLE members`; `db:migrate` aplica no banco `development_metrics`.

- [ ] **Step 9: Criar o script compartilhado de migração**

`scripts/migrate-database.ts`:

```ts
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

export async function migrateDatabase(connectionString: string) {
	const client = postgres(connectionString, { max: 1 });
	const db = drizzle(client);
	await migrate(db, { migrationsFolder: "./drizzle/migrations" });
	await client.end();
}
```

- [ ] **Step 10: Ligar o `globalSetup` do Vitest ao banco de testes**

`vitest.global-setup.ts`:

```ts
import { migrateDatabase } from "./scripts/migrate-database";

export default async function setup() {
	await migrateDatabase(
		process.env.DATABASE_URL ??
			"postgresql://postgres:postgres@localhost:5432/development_metrics_test",
	);
}
```

Atualizar `vitest.config.ts` (criado na Task 2) para:

```ts
import { defineConfig } from "vitest/config";

const TEST_DATABASE_URL =
	process.env.DATABASE_URL ??
	"postgresql://postgres:postgres@localhost:5432/development_metrics_test";

export default defineConfig({
	test: {
		environment: "node",
		env: {
			DATABASE_URL: TEST_DATABASE_URL,
		},
		globalSetup: "./vitest.global-setup.ts",
	},
});
```

- [ ] **Step 11: Verificar a migração do banco de testes**

Run: `npm test`
Expected: o `globalSetup` conecta em `development_metrics_test` e aplica a migração (sem erros de conexão), depois Vitest reporta os 17 testes das Tasks 6–8 como PASS (a suíte de testes já existe; o efeito novo desta task é que a migração real acontece antes).

- [ ] **Step 12: Atualizar o README**

Em `README.md`: adicionar `- Drizzle ORM + Postgres (persistência)` na lista de "Stack"; adicionar ao pré-requisito "Como rodar" a criação do `.env` com `DATABASE_URL` e o comando `docker compose -f devops/docker-compose.yml up -d`; adicionar linhas na tabela de scripts para `npm test`, `npm run test:watch`, `npm run db:generate` e `npm run db:migrate`.

- [ ] **Step 13: Commit**

```bash
git add package.json package-lock.json devops/docker-compose.yml devops/initdb drizzle.config.ts drizzle/migrations src/infrastructure/db/client.ts src/infrastructure/team/drizzle/schema.ts scripts/migrate-database.ts vitest.global-setup.ts vitest.config.ts README.md
git commit -m "chore(banco)!: configura drizzle e postgres com schema de time"
```

---

### Task 10: Repositório Drizzle de Team

**Files:**
- Create: `src/infrastructure/team/drizzle-team-repository.ts`
- Create: `src/infrastructure/team/drizzle-team-repository.test.ts`

**Interfaces:**
- Consumes: `db` (`@/infrastructure/db/client`), `teams`/`members` (`@/infrastructure/team/drizzle/schema`), `TeamRepository` (Task 5) — todas da Task 9.
- Produces: `drizzleTeamRepository: TeamRepository`, implementação real usada pelo composition root (Task 12).

- [ ] **Step 1: Escrever o teste que falha**

`src/infrastructure/team/drizzle-team-repository.test.ts`:

```ts
import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { db } from "@/infrastructure/db/client";
import { drizzleTeamRepository } from "./drizzle-team-repository";

async function resetDatabase() {
	await db.execute(
		sql`TRUNCATE TABLE members, teams RESTART IDENTITY CASCADE`,
	);
}

describe("drizzleTeamRepository", () => {
	afterEach(async () => {
		await resetDatabase();
	});

	it("cria e busca um time por id", async () => {
		const created = await drizzleTeamRepository.create("Time A");
		const found = await drizzleTeamRepository.findById(created.id);
		expect(found).toEqual(created);
	});

	it("retorna null ao buscar um time inexistente", async () => {
		expect(await drizzleTeamRepository.findById("00000000-0000-0000-0000-000000000000")).toBeNull();
	});

	it("renomeia um time", async () => {
		const team = await drizzleTeamRepository.create("Time A");
		const renamed = await drizzleTeamRepository.rename(team.id, "Time B");
		expect(renamed.name).toBe("Time B");
	});

	it("adiciona e lista membros de um time", async () => {
		const team = await drizzleTeamRepository.create("Time A");
		await drizzleTeamRepository.addMember(team.id, "Ana");
		const teamMembers = await drizzleTeamRepository.listMembers(team.id);
		expect(teamMembers).toHaveLength(1);
		expect(teamMembers[0].name).toBe("Ana");
	});

	it("excluir o time remove os membros (cascade)", async () => {
		const team = await drizzleTeamRepository.create("Time A");
		await drizzleTeamRepository.addMember(team.id, "Ana");
		await drizzleTeamRepository.delete(team.id);
		expect(await drizzleTeamRepository.listMembers(team.id)).toHaveLength(0);
	});
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npm test`
Expected: FAIL — módulo `./drizzle-team-repository` não encontrado.

- [ ] **Step 3: Implementar o repositório**

`src/infrastructure/team/drizzle-team-repository.ts`:

```ts
import { eq } from "drizzle-orm";
import type { TeamRepository } from "@/application/team/ports/team-repository";
import type { Member } from "@/domain/team/entities/member";
import type { Team } from "@/domain/team/entities/team";
import { db } from "@/infrastructure/db/client";
import { members, teams } from "./drizzle/schema";

export const drizzleTeamRepository: TeamRepository = {
	async create(name) {
		const [team] = await db.insert(teams).values({ name }).returning();
		return team as Team;
	},
	async rename(teamId, name) {
		const [team] = await db
			.update(teams)
			.set({ name })
			.where(eq(teams.id, teamId))
			.returning();
		if (!team) {
			throw new Error("Time não encontrado");
		}
		return team as Team;
	},
	async delete(teamId) {
		await db.delete(teams).where(eq(teams.id, teamId));
	},
	async listAll() {
		return db.select().from(teams);
	},
	async findById(teamId) {
		const [team] = await db.select().from(teams).where(eq(teams.id, teamId));
		return (team as Team) ?? null;
	},
	async addMember(teamId, name) {
		const [member] = await db
			.insert(members)
			.values({ name, teamId })
			.returning();
		return member as Member;
	},
	async renameMember(memberId, name) {
		const [member] = await db
			.update(members)
			.set({ name })
			.where(eq(members.id, memberId))
			.returning();
		if (!member) {
			throw new Error("Membro não encontrado");
		}
		return member as Member;
	},
	async removeMember(memberId) {
		await db.delete(members).where(eq(members.id, memberId));
	},
	async listMembers(teamId) {
		return db.select().from(members).where(eq(members.teamId, teamId));
	},
};
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm test`
Expected: PASS — 5 testes novos, contra o Postgres real de `development_metrics_test`.

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure/team/drizzle-team-repository.ts src/infrastructure/team/drizzle-team-repository.test.ts
git commit -m "feat(times)!: adiciona repositorio drizzle de time"
```

---

### Task 11: Armazenamento do time atual em cookie

**Files:**
- Create: `src/infrastructure/team/cookie-current-team-store.ts`

**Interfaces:**
- Consumes: `CurrentTeamStore` (Task 5).
- Produces: `cookieCurrentTeamStore: CurrentTeamStore`, usado pelo composition root (Task 12).

- [ ] **Step 1: Implementar o store**

`src/infrastructure/team/cookie-current-team-store.ts`:

```ts
import { cookies } from "next/headers";
import type { CurrentTeamStore } from "@/application/team/ports/current-team-store";

const COOKIE_NAME = "current-team-id";

export const cookieCurrentTeamStore: CurrentTeamStore = {
	async get() {
		const store = await cookies();
		return store.get(COOKIE_NAME)?.value ?? null;
	},
	async set(teamId) {
		const store = await cookies();
		store.set(COOKIE_NAME, teamId, { path: "/" });
	},
};
```

`set` só pode ser chamado a partir de uma Server Action ou Route Handler (regra do Next.js); `get` funciona em qualquer Server Component. Isso é respeitado nas tasks seguintes: `get` é usado no gate do layout (Server Component) e `set` só é chamado dentro de Server Actions.

- [ ] **Step 2: Verificar tipos**

Run: `npm run typecheck`
Expected: sem erros (o objeto só compila se implementar `CurrentTeamStore` corretamente).

- [ ] **Step 3: Commit**

```bash
git add src/infrastructure/team/cookie-current-team-store.ts
git commit -m "feat(times)!: adiciona armazenamento do time atual em cookie"
```

---

### Task 12: Composition root de Team

**Files:**
- Create: `src/composition/team.ts`

**Interfaces:**
- Consumes: `drizzleTeamRepository` (Task 10), `cookieCurrentTeamStore` (Task 11), todos os casos de uso de `@/application/team/use-cases/*` (Tasks 6, 7, 8).
- Produces: `createTeamUseCases()` retornando:

```ts
{
	createTeam: (name: string) => Promise<Team>;
	renameTeam: (teamId: string, name: string) => Promise<Team>;
	deleteTeam: (teamId: string) => Promise<void>;
	listTeams: () => Promise<Team[]>;
	getTeam: (teamId: string) => Promise<TeamWithMembers | null>;
	addMember: (teamId: string, name: string) => Promise<Member>;
	renameMember: (memberId: string, name: string) => Promise<Member>;
	removeMember: (memberId: string) => Promise<void>;
	getCurrentTeam: () => Promise<Team | null>;
	selectTeam: (teamId: string) => Promise<void>;
}
```

Usado por todas as tasks de `app/` e `presentation/` a seguir (13–16).

- [ ] **Step 1: Implementar a factory**

`src/composition/team.ts`:

```ts
import { addMember } from "@/application/team/use-cases/add-member";
import { createTeam } from "@/application/team/use-cases/create-team";
import { deleteTeam } from "@/application/team/use-cases/delete-team";
import { getCurrentTeam } from "@/application/team/use-cases/get-current-team";
import { getTeam } from "@/application/team/use-cases/get-team";
import { listTeams } from "@/application/team/use-cases/list-teams";
import { removeMember } from "@/application/team/use-cases/remove-member";
import { renameMember } from "@/application/team/use-cases/rename-member";
import { renameTeam } from "@/application/team/use-cases/rename-team";
import { cookieCurrentTeamStore } from "@/infrastructure/team/cookie-current-team-store";
import { drizzleTeamRepository } from "@/infrastructure/team/drizzle-team-repository";

export function createTeamUseCases() {
	return {
		createTeam: (name: string) => createTeam(drizzleTeamRepository, name),
		renameTeam: (teamId: string, name: string) =>
			renameTeam(drizzleTeamRepository, teamId, name),
		deleteTeam: (teamId: string) => deleteTeam(drizzleTeamRepository, teamId),
		listTeams: () => listTeams(drizzleTeamRepository),
		getTeam: (teamId: string) => getTeam(drizzleTeamRepository, teamId),
		addMember: (teamId: string, name: string) =>
			addMember(drizzleTeamRepository, teamId, name),
		renameMember: (memberId: string, name: string) =>
			renameMember(drizzleTeamRepository, memberId, name),
		removeMember: (memberId: string) =>
			removeMember(drizzleTeamRepository, memberId),
		getCurrentTeam: () =>
			getCurrentTeam(cookieCurrentTeamStore, drizzleTeamRepository),
		selectTeam: (teamId: string) => cookieCurrentTeamStore.set(teamId),
	};
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npm run typecheck`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/composition/team.ts
git commit -m "feat(times)!: adiciona composition root de time"
```

---

### Task 13: Tela `/teams` — seleção e criação de time

**Files:**
- Create: `src/app/teams/page.tsx`

**Interfaces:**
- Consumes: `createTeamUseCases()` (Task 12).
- Produces: rota `/teams` navegável pelas Tasks 15 (redirect do gate) e 16 (link "Criar novo time" do header); textos "Nome do time" (placeholder) e "Criar time" (botão) e "Nenhum time cadastrado ainda." consumidos pelos testes E2E da Task 17.

- [ ] **Step 1: Implementar a página**

`src/app/teams/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { createTeamUseCases } from "@/composition/team";

async function createTeamAction(formData: FormData) {
	"use server";
	const name = String(formData.get("name") ?? "");
	const useCases = createTeamUseCases();
	await useCases.createTeam(name);
	redirect("/teams");
}

async function selectTeamAction(formData: FormData) {
	"use server";
	const teamId = String(formData.get("teamId") ?? "");
	const useCases = createTeamUseCases();
	await useCases.selectTeam(teamId);
	redirect("/");
}

export default async function TeamsPage() {
	const useCases = createTeamUseCases();
	const teams = await useCases.listTeams();

	return (
		<main className="mx-auto flex max-w-md flex-col gap-6 p-6">
			<h1 className="text-xl font-semibold">Selecionar time</h1>
			{teams.length === 0 ? (
				<p>Nenhum time cadastrado ainda. Crie o primeiro time abaixo.</p>
			) : (
				<ul className="flex flex-col gap-2">
					{teams.map((team) => (
						<li key={team.id}>
							<form action={selectTeamAction}>
								<input type="hidden" name="teamId" value={team.id} />
								<button
									type="submit"
									className="w-full rounded border px-4 py-2 text-left"
								>
									{team.name}
								</button>
							</form>
						</li>
					))}
				</ul>
			)}
			<form action={createTeamAction} className="flex flex-col gap-2">
				<input
					name="name"
					placeholder="Nome do time"
					className="rounded border px-3 py-2"
					required
				/>
				<button
					type="submit"
					className="rounded bg-[var(--foreground)] px-4 py-2 text-[var(--background)]"
				>
					Criar time
				</button>
			</form>
		</main>
	);
}
```

- [ ] **Step 2: Verificar o build**

Run: `npm run build`
Expected: build conclui sem erros. O comportamento fim-a-fim (criar, selecionar, redirecionar) é validado na Task 17.

- [ ] **Step 3: Commit**

```bash
git add src/app/teams/page.tsx
git commit -m "feat(times)!: adiciona tela de selecao e criacao de time"
```

---

### Task 14: Tela `/teams/[teamId]` — gerenciar time

**Files:**
- Create: `src/app/teams/[teamId]/page.tsx`

**Interfaces:**
- Consumes: `createTeamUseCases()` (Task 12).
- Produces: rota `/teams/[teamId]` navegável pelo link "Gerenciar time atual" do header (Task 16).

- [ ] **Step 1: Implementar a página**

`src/app/teams/[teamId]/page.tsx`:

```tsx
import { notFound, redirect } from "next/navigation";
import { createTeamUseCases } from "@/composition/team";

async function renameTeamAction(teamId: string, formData: FormData) {
	"use server";
	const name = String(formData.get("name") ?? "");
	const useCases = createTeamUseCases();
	await useCases.renameTeam(teamId, name);
	redirect(`/teams/${teamId}`);
}

async function deleteTeamAction(teamId: string) {
	"use server";
	const useCases = createTeamUseCases();
	await useCases.deleteTeam(teamId);
	redirect("/teams");
}

async function addMemberAction(teamId: string, formData: FormData) {
	"use server";
	const name = String(formData.get("name") ?? "");
	const useCases = createTeamUseCases();
	await useCases.addMember(teamId, name);
	redirect(`/teams/${teamId}`);
}

async function renameMemberAction(
	teamId: string,
	memberId: string,
	formData: FormData,
) {
	"use server";
	const name = String(formData.get("name") ?? "");
	const useCases = createTeamUseCases();
	await useCases.renameMember(memberId, name);
	redirect(`/teams/${teamId}`);
}

async function removeMemberAction(teamId: string, memberId: string) {
	"use server";
	const useCases = createTeamUseCases();
	await useCases.removeMember(memberId);
	redirect(`/teams/${teamId}`);
}

export default async function ManageTeamPage({
	params,
}: {
	params: Promise<{ teamId: string }>;
}) {
	const { teamId } = await params;
	const useCases = createTeamUseCases();
	const result = await useCases.getTeam(teamId);
	if (!result) {
		notFound();
	}
	const { team, members } = result;

	return (
		<main className="mx-auto flex max-w-md flex-col gap-6 p-6">
			<h1 className="text-xl font-semibold">Gerenciar time</h1>
			<form
				action={renameTeamAction.bind(null, teamId)}
				className="flex flex-col gap-2"
			>
				<label htmlFor="team-name">Nome do time</label>
				<input
					id="team-name"
					name="name"
					defaultValue={team.name}
					className="rounded border px-3 py-2"
					required
				/>
				<button type="submit" className="self-start rounded border px-4 py-2">
					Salvar nome
				</button>
			</form>

			<div className="flex flex-col gap-2">
				<p>Membros</p>
				{members.map((member) => (
					<div
						key={member.id}
						className="flex items-center justify-between gap-2"
					>
						<form
							action={renameMemberAction.bind(null, teamId, member.id)}
							className="flex flex-1 gap-2"
						>
							<input
								name="name"
								defaultValue={member.name}
								className="flex-1 rounded border px-2 py-1"
								required
							/>
							<button type="submit" className="rounded border px-2 py-1">
								Renomear
							</button>
						</form>
						<form action={removeMemberAction.bind(null, teamId, member.id)}>
							<button type="submit" className="rounded border px-2 py-1">
								Remover
							</button>
						</form>
					</div>
				))}
			</div>

			<form
				action={addMemberAction.bind(null, teamId)}
				className="flex flex-col gap-2"
			>
				<input
					name="name"
					placeholder="Nome do novo membro"
					className="rounded border px-3 py-2"
					required
				/>
				<button type="submit" className="self-start rounded border px-4 py-2">
					+ Adicionar membro
				</button>
			</form>

			<hr />
			<form action={deleteTeamAction.bind(null, teamId)}>
				<button
					type="submit"
					className="rounded bg-red-700 px-4 py-2 text-white"
				>
					Excluir time
				</button>
			</form>
		</main>
	);
}
```

- [ ] **Step 2: Verificar o build**

Run: `npm run build`
Expected: build conclui sem erros.

- [ ] **Step 3: Commit**

```bash
git add "src/app/teams/[teamId]/page.tsx"
git commit -m "feat(times)!: adiciona tela de gerenciamento de time"
```

---

### Task 15: Gate de time selecionado no layout

**Files:**
- Create: `src/presentation/shared/root-shell.tsx`
- Create: `src/app/(teams)/layout.tsx`
- Create: `src/app/(main)/layout.tsx`
- Move: `src/app/page.tsx` → `src/app/(main)/page.tsx`
- Delete: `src/app/layout.tsx`

**Interfaces:**
- Consumes: `createTeamUseCases()` (Task 12).
- Produces: gate ativo em toda rota fora de `/teams`; `<RootShell>` reutilizável por qualquer root layout futuro deste projeto.

Um único `app/layout.tsx` plano envolveria também `/teams`: com o cookie ausente, o gate redirecionaria para `/teams`, mas o próprio layout rodaria de novo aí e redirecionaria para `/teams` outra vez — loop infinito. A solução é ter **dois root layouts via route groups** (recurso nativo do App Router para múltiplos root layouts, não é middleware): `(teams)` sem gate, para `/teams` e `/teams/[teamId]`; `(main)` com gate, para o restante (hoje só a home `/`). Ambos compartilham a mesma casca HTML através de `RootShell`.

- [ ] **Step 1: Extrair a casca HTML compartilhada**

`src/presentation/shared/root-shell.tsx`:

```tsx
import { Geist, Geist_Mono } from "next/font/google";
import "@/app/globals.css";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export function RootShell({ children }: { children: React.ReactNode }) {
	return (
		<html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable}`}>
			<body>{children}</body>
		</html>
	);
}
```

- [ ] **Step 2: Criar o root layout de `/teams` (sem gate)**

`src/app/(teams)/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { RootShell } from "@/presentation/shared/root-shell";

export const metadata: Metadata = {
	title: "Development Metrics",
	description: "Development Metrics",
};

export default function TeamsLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <RootShell>{children}</RootShell>;
}
```

Mover os arquivos de rota de times para dentro deste grupo:

```bash
mkdir -p "src/app/(teams)/teams/[teamId]"
git mv src/app/teams/page.tsx "src/app/(teams)/teams/page.tsx"
git mv "src/app/teams/[teamId]/page.tsx" "src/app/(teams)/teams/[teamId]/page.tsx"
```

- [ ] **Step 3: Criar o root layout com o gate**

`src/app/(main)/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createTeamUseCases } from "@/composition/team";
import { RootShell } from "@/presentation/shared/root-shell";

export const metadata: Metadata = {
	title: "Development Metrics",
	description: "Development Metrics",
};

export default async function MainLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const useCases = createTeamUseCases();
	const currentTeam = await useCases.getCurrentTeam();
	if (!currentTeam) {
		redirect("/teams");
	}

	return (
		<RootShell>
			<header className="flex items-center justify-between border-b px-6 py-4">
				<span className="font-semibold">Development Metrics</span>
			</header>
			{children}
		</RootShell>
	);
}
```

O `<header>` ganha o seletor de time na Task 16; por ora renderiza só o título, mantendo este passo focado exclusivamente no gate.

- [ ] **Step 4: Mover a home para o grupo `(main)` e remover o layout antigo**

```bash
mkdir -p "src/app/(main)"
git mv src/app/page.tsx "src/app/(main)/page.tsx"
git rm src/app/layout.tsx
```

- [ ] **Step 5: Verificar o build**

Run: `npm run build`
Expected: build conclui sem erros. Verificação manual: com `docker compose -f devops/docker-compose.yml up -d` ativo e `npm run dev`, acessar `http://localhost:3000/` sem nenhum time cadastrado deve redirecionar para `/teams` sem loop; acessar `/teams` diretamente deve carregar normalmente. A cobertura automatizada desse fluxo é a Task 17.

- [ ] **Step 6: Commit**

```bash
git add src/presentation/shared/root-shell.tsx "src/app/(teams)/layout.tsx" "src/app/(teams)/teams" "src/app/(main)/layout.tsx" "src/app/(main)/page.tsx"
git commit -m "feat(times)!: adiciona gate de time selecionado no layout"
```

---

### Task 16: Seletor de time no header

**Files:**
- Create: `src/app/(main)/actions.ts`
- Create: `src/presentation/team/team-switcher.tsx`
- Modify: `src/app/(main)/layout.tsx`

**Interfaces:**
- Consumes: `createTeamUseCases()` (Task 12), `Team` (Task 4).
- Produces: componente `<TeamSwitcher currentTeam={Team} teams={Team[]} />`; texto do botão `"{nome do time} ▾"` e itens de menu `"Gerenciar time atual"` / `"+ Criar novo time"`, consumidos pelos testes E2E da Task 17.

- [ ] **Step 1: Criar a Server Action de troca de time**

`src/app/(main)/actions.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { createTeamUseCases } from "@/composition/team";

export async function selectTeamAction(teamId: string) {
	const useCases = createTeamUseCases();
	await useCases.selectTeam(teamId);
	redirect("/");
}
```

- [ ] **Step 2: Criar o componente do dropdown**

`src/presentation/team/team-switcher.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import type { Team } from "@/domain/team/entities/team";
import { selectTeamAction } from "@/app/(main)/actions";

type TeamSwitcherProps = {
	currentTeam: Team;
	teams: Team[];
};

export function TeamSwitcher({ currentTeam, teams }: TeamSwitcherProps) {
	const [open, setOpen] = useState(false);
	const otherTeams = teams.filter((team) => team.id !== currentTeam.id);

	return (
		<div className="relative">
			<button
				type="button"
				onClick={() => setOpen((value) => !value)}
				className="rounded border px-3 py-1"
			>
				{currentTeam.name} ▾
			</button>
			{open ? (
				<div className="absolute right-0 z-10 mt-2 flex w-48 flex-col gap-1 rounded border bg-[var(--background)] p-2 shadow">
					{otherTeams.map((team) => (
						<button
							key={team.id}
							type="button"
							onClick={() => selectTeamAction(team.id)}
							className="rounded px-2 py-1 text-left hover:bg-black/5"
						>
							{team.name}
						</button>
					))}
					{otherTeams.length > 0 ? <hr /> : null}
					<Link
						href={`/teams/${currentTeam.id}`}
						className="rounded px-2 py-1 hover:bg-black/5"
					>
						Gerenciar time atual
					</Link>
					<Link href="/teams" className="rounded px-2 py-1 hover:bg-black/5">
						+ Criar novo time
					</Link>
				</div>
			) : null}
		</div>
	);
}
```

- [ ] **Step 3: Ligar o `TeamSwitcher` ao layout com gate**

Em `src/app/(main)/layout.tsx`, importar `TeamSwitcher` e `listTeams` via `useCases`, substituindo o `<header>` do passo anterior:

```tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createTeamUseCases } from "@/composition/team";
import { RootShell } from "@/presentation/shared/root-shell";
import { TeamSwitcher } from "@/presentation/team/team-switcher";

export const metadata: Metadata = {
	title: "Development Metrics",
	description: "Development Metrics",
};

export default async function MainLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const useCases = createTeamUseCases();
	const currentTeam = await useCases.getCurrentTeam();
	if (!currentTeam) {
		redirect("/teams");
	}
	const teams = await useCases.listTeams();

	return (
		<RootShell>
			<header className="flex items-center justify-between border-b px-6 py-4">
				<span className="font-semibold">Development Metrics</span>
				<TeamSwitcher currentTeam={currentTeam} teams={teams} />
			</header>
			{children}
		</RootShell>
	);
}
```

- [ ] **Step 4: Verificar o build**

Run: `npm run build`
Expected: build conclui sem erros. A interação do dropdown é validada na Task 17.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(main)/actions.ts" src/presentation/team/team-switcher.tsx "src/app/(main)/layout.tsx"
git commit -m "feat(times)!: adiciona seletor de time no header"
```

---

### Task 17: Testes de integração dos fluxos críticos

**Files:**
- Modify: `playwright.config.ts`
- Create: `tests/integration/global-setup.ts`
- Create: `tests/integration/reset-db.ts`
- Create: `tests/integration/team-selection.spec.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: `migrateDatabase` (`scripts/migrate-database`, Task 9), `db` (`@/infrastructure/db/client`, Task 9), textos exatos definidos nas Tasks 13/14/16 (`"Nome do time"`, `"Criar time"`, `"Nenhum time cadastrado ainda."`, `"{nome} ▾"`).
- Produces: suíte `npm run test:e2e` cobrindo os três fluxos críticos do spec.

- [ ] **Step 1: Ligar o Playwright ao banco de testes**

Atualizar `playwright.config.ts` (criado na Task 3):

```ts
import { defineConfig } from "@playwright/test";

const TEST_DATABASE_URL =
	process.env.DATABASE_URL ??
	"postgresql://postgres:postgres@localhost:5432/development_metrics_test";
process.env.DATABASE_URL = TEST_DATABASE_URL;

export default defineConfig({
	testDir: "./tests/integration",
	fullyParallel: false,
	globalSetup: "./tests/integration/global-setup.ts",
	webServer: {
		command: "npm run dev -- --port 3100",
		url: "http://localhost:3100",
		reuseExistingServer: !process.env.CI,
		env: {
			DATABASE_URL: TEST_DATABASE_URL,
		},
	},
	use: {
		baseURL: "http://localhost:3100",
	},
});
```

- [ ] **Step 2: Criar o `globalSetup` e o helper de reset do banco**

`tests/integration/global-setup.ts`:

```ts
import { migrateDatabase } from "../../scripts/migrate-database";

export default async function globalSetup() {
	await migrateDatabase(process.env.DATABASE_URL as string);
}
```

`tests/integration/reset-db.ts`:

```ts
import { sql } from "drizzle-orm";
import { db } from "@/infrastructure/db/client";

export async function resetDatabase() {
	await db.execute(
		sql`TRUNCATE TABLE members, teams RESTART IDENTITY CASCADE`,
	);
}
```

- [ ] **Step 3: Escrever os testes dos três fluxos críticos**

`tests/integration/team-selection.spec.ts`:

```ts
import { expect, test } from "@playwright/test";
import { resetDatabase } from "./reset-db";

test.beforeEach(async () => {
	await resetDatabase();
});

test("sem time selecionado, acessar / redireciona para /teams", async ({
	page,
}) => {
	await page.goto("/");
	await expect(page).toHaveURL("/teams");
	await expect(page.getByText("Nenhum time cadastrado ainda.")).toBeVisible();
});

test("criar e selecionar um time redireciona para / e mostra o time no header", async ({
	page,
}) => {
	await page.goto("/teams");
	await page.getByPlaceholder("Nome do time").fill("Time A");
	await page.getByRole("button", { name: "Criar time" }).click();
	await page.getByRole("button", { name: "Time A" }).click();
	await expect(page).toHaveURL("/");
	await expect(page.getByText("Time A ▾")).toBeVisible();
});

test("trocar de time pelo dropdown do header", async ({ page }) => {
	await page.goto("/teams");
	await page.getByPlaceholder("Nome do time").fill("Time A");
	await page.getByRole("button", { name: "Criar time" }).click();
	await page.getByPlaceholder("Nome do time").fill("Time B");
	await page.getByRole("button", { name: "Criar time" }).click();
	await page.getByRole("button", { name: "Time A" }).click();
	await expect(page).toHaveURL("/");

	await page.getByRole("button", { name: "Time A ▾" }).click();
	await page.getByRole("button", { name: "Time B" }).click();
	await expect(page.getByText("Time B ▾")).toBeVisible();
});
```

- [ ] **Step 4: Rodar os testes E2E**

Run: `npm run test:e2e`
Expected: 3 passed (mais o smoke test da Task 3, 4 passed no total).

- [ ] **Step 5: Atualizar o README**

Em `README.md`: adicionar `npm run test:e2e` à tabela de scripts; adicionar nota no "Como rodar" sobre `npx playwright install chromium` ser necessário uma vez antes do primeiro `npm run test:e2e`.

- [ ] **Step 6: Commit**

```bash
git add playwright.config.ts tests/integration/global-setup.ts tests/integration/reset-db.ts tests/integration/team-selection.spec.ts README.md
git commit -m "test(times)!: adiciona testes de integracao do fluxo de selecao de time"
```

---

## Self-Review

**Cobertura do spec:** modelo de dados (Team/Member — Task 4; TeamStatus não se aplica a este sub-projeto), persistência do time selecionado em cookie via port (Tasks 5, 11), gate único sem middleware (Task 15, com a ressalva de rota documentada), rotas `/`, `/teams`, `/teams/[teamId]` e header (Tasks 13, 14, 15, 16), arquitetura em camadas conforme listada na spec (Tasks 4–14), Tailwind + paleta (Task 1), Drizzle confinado a `infrastructure` (Task 9, 10), edge cases — time atual excluído (gate detecta cookie órfão, Task 15), nome vazio (validado nos casos de uso, Tasks 6/7), nenhum time cadastrado (Task 13) — e testes unitários + integração pedidos na seção "Testes" da spec (Tasks 6–8, 10, 17). Nenhum requisito do spec ficou sem task correspondente.

**Placeholders:** nenhum "TBD"/"implementar depois" — todo código de cada step está completo e executável.

**Consistência de tipos:** `TeamRepository`, `CurrentTeamStore`, `Team`, `Member` e `TeamWithMembers` usam a mesma assinatura em todas as tasks que os consomem (`createFakeTeamRepository` implementa exatamente `TeamRepository`; `createTeamUseCases()` expõe exatamente os métodos usados pelas Tasks 13–16).
