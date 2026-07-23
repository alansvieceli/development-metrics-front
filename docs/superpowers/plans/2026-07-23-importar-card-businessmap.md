# Importar card do Businessmap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar um botão "Importar card" no quadro que busca um card do Businessmap pelo id, monta um preview (dados + histórico traduzido para status internos) para o usuário confirmar, e só então cria a task com histórico explícito reaproveitando o use-case `createHistoricalTask` já existente.

**Architecture:** Novo port `ExternalCardProvider` (application) implementado por um adapter HTTP (`infrastructure/task/businessmap-card-provider.ts`) que fala com a API v2 do Businessmap/Kanbanize. Um novo use-case `previewCardImport` busca o card, traduz o histórico de colunas do Businessmap para `TaskStatus` via matching fuzzy bidirecional (novo util compartilhado), resolve o responsável comparando com os membros do time, e retorna um objeto de preview com avisos. A confirmação do usuário reaproveita `createHistoricalTask` sem nenhuma mudança nele. Erros de dados obrigatórios ausentes (deadline, etapa não mapeável, tipo não selecionado) interrompem o fluxo com `ApplicationError` mostrado ao usuário — nada é importado parcialmente ou com valor default silencioso.

**Tech Stack:** Next.js Server Actions, TypeScript, Vitest, `fetch` nativo (sem client HTTP novo), Drizzle (já existente, sem mudanças de schema).

## Global Constraints

- Sem novas dependências de terceiros: usar `fetch` nativo do runtime Node/Next para chamar a API do Businessmap.
- Time é único no sistema hoje (`createTeamUseCases().getCurrentTeam()`); não adicionar seletor de time na feature.
- Reaproveitar `createHistoricalTask` para persistir — não criar um use-case de criação paralelo.
- Qualquer dado obrigatório ausente ou não mapeável deve lançar `ApplicationError` com mensagem clara, nunca preencher com default silencioso.
- Seguir o padrão de leitura de env var já usado em `src/infrastructure/db/client.ts` (`process.env.X` direto, sem serviço de config).
- Nunca commitar o valor real da API key do Businessmap em nenhum arquivo do repo.

---

## ⚠️ Contrato real da API (confirmado via curl na execução da Task 1)

O MCP `businessmap-cards` normaliza os dados — a API REST v2 crua (`https://dasa.kanbanize.com/api/v2`) é bem diferente e **não tem um endpoint de histórico pronto**. Confirmado com requisições reais contra o card 415931:

- `GET /cards/{id}` → estado atual (`card_id`, `board_id`, `column_id`, `description`, `deadline`, `owner_user_id`, `created_at`). Não existe `owner_username` aqui, só o id numérico.
- `GET /cards/{id}/revisions` → lista `{revision, user_id, replaced_at}`, sem descrever o que mudou.
- `GET /cards/{id}/revisions/{n}` → **snapshot completo do card naquela revisão** (mesmo shape do card atual). O histórico de coluna precisa ser reconstruído comparando `column_id` entre snapshots consecutivos.
- `GET /boards/{board_id}/columns` → lista de colunas (`column_id`, `parent_column_id`, `name`). O label `"Seção.Coluna"` é `parent.name + "." + column.name}` quando há `parent_column_id`, senão só `column.name`.
- `GET /users/{id}` → resolve `owner_user_id` para `username`.

Verificado manualmente contra as 11 revisões do card 415931: o snapshot da revisão N reflete o estado **antes** da própria mudança registrada na revisão N ser aplicada; a transição de coluna entre snapshot(N) e snapshot(N+1) tem seu timestamp em `revisions[N-1].replaced_at` (índice da revisão N na lista, 0-based). Ex.: snapshot(9)=coluna 5267, snapshot(10)=coluna 5270, e `revisions` com `"revision":9` tem `replaced_at:"2026-07-20T17:00:38"` — bate exatamente com o evento "Task moved" de jose.hudson.ext visto via MCP.

Isso significa que importar 1 card faz ~1 (card) + 1 (columns) + 1 (revisions) + N (um GET por revisão) + 1 (user) chamadas — ~15 no caso do card 415931. Aceitável para uma ação manual e pontual (botão clicado uma vez por card), mas nada paralelizado nesta primeira versão — sequencial é suficiente e mais simples.

Os fixtures reais já foram salvos em `src/infrastructure/task/__fixtures__/` (card, columns, revisions, 3 snapshots de exemplo, user). A Task 5 já reflete esse contrato — não precisa reabrir a investigação.

---

### Task 1: Verificar o contrato real da API do Businessmap — ✅ concluída

**Files (já criados):**
- `src/infrastructure/task/__fixtures__/businessmap-card-415931-details.json`
- `src/infrastructure/task/__fixtures__/businessmap-card-415931-revisions.json`
- `src/infrastructure/task/__fixtures__/businessmap-card-415931-revision-1.json`
- `src/infrastructure/task/__fixtures__/businessmap-card-415931-revision-9.json`
- `src/infrastructure/task/__fixtures__/businessmap-card-415931-revision-10.json`
- `src/infrastructure/task/__fixtures__/businessmap-board-108-columns.json`
- `src/infrastructure/task/__fixtures__/businessmap-user-1460.json`

Executada com curl real usando `BUSINESSMAP_COMPANY_NAME=dasa` e a api key do `.env` local. Resultado documentado na seção "Contrato real da API" acima — a Task 5 já foi escrita em cima desse contrato confirmado, não do formato assumido originalmente (MCP). Nenhum arquivo de fixture contém a api key (ela só vai no header da requisição).

```bash
git add src/infrastructure/task/__fixtures__/
git commit -m "test: adiciona fixtures reais da API do Businessmap para o card 415931"
```

---

### Task 2: Util compartilhado de matching fuzzy bidirecional

**Files:**
- Create: `src/application/shared/fuzzy-match.ts`
- Test: `src/application/shared/fuzzy-match.test.ts`

**Interfaces:**
- Produz: `normalizeForMatch(value: string): string`, `matchesEitherWay(a: string, b: string): boolean` — usados pela Task 3 (matching de status) e pela Task 4 (matching de responsável).

- [ ] **Step 1: Escrever o teste**

```typescript
import { describe, expect, it } from "vitest";
import { matchesEitherWay, normalizeForMatch } from "./fuzzy-match";

describe("normalizeForMatch", () => {
	it("remove acentos e normaliza para minúsculas", () => {
		expect(normalizeForMatch("Homologação")).toBe("homologacao");
	});
});

describe("matchesEitherWay", () => {
	it("casa quando a primeira string contém a segunda", () => {
		expect(matchesEitherWay("Pronto para Publicação", "Publicação")).toBe(true);
	});

	it("casa quando a segunda string contém a primeira", () => {
		expect(matchesEitherWay("Testes", "Testes.Para Testar")).toBe(true);
	});

	it("ignora acentuação e caixa na comparação", () => {
		expect(matchesEitherWay("CONCLUIDO", "Concluído")).toBe(true);
	});

	it("não casa strings sem relação", () => {
		expect(matchesEitherWay("Backlog", "Homologação")).toBe(false);
	});

	it("não casa quando uma das strings é vazia", () => {
		expect(matchesEitherWay("", "Backlog")).toBe(false);
	});
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest run src/application/shared/fuzzy-match.test.ts`
Expected: FAIL — `Cannot find module './fuzzy-match'`

- [ ] **Step 3: Implementar**

```typescript
export function normalizeForMatch(value: string): string {
	return value
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.trim();
}

export function matchesEitherWay(a: string, b: string): boolean {
	const normalizedA = normalizeForMatch(a);
	const normalizedB = normalizeForMatch(b);
	if (!normalizedA || !normalizedB) return false;
	return normalizedA.includes(normalizedB) || normalizedB.includes(normalizedA);
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest run src/application/shared/fuzzy-match.test.ts`
Expected: PASS (5 testes)

- [ ] **Step 5: Commit**

```bash
git add src/application/shared/fuzzy-match.ts src/application/shared/fuzzy-match.test.ts
git commit -m "feat: adiciona matching fuzzy bidirecional compartilhado"
```

---

### Task 3: Tradutor de coluna do Businessmap para `TaskStatus`

**Files:**
- Create: `src/application/task/match-external-status.ts`
- Test: `src/application/task/match-external-status.test.ts`

**Interfaces:**
- Consome: `matchesEitherWay` de `@/application/shared/fuzzy-match` (Task 2), `TASK_STATUSES`/`TaskStatus` de `@/domain/task/entities/task`.
- Produz: `matchExternalStatus(rawLabel: string): TaskStatus | null` — usado pela Task 4.

**Decisão de design importante:** o label do Businessmap vem como `Secao.Coluna` (ex: `"Desenvolvimento.Para Code Review"`). Comparar a string inteira contra os aliases faz `"Desenvolvimento.Para Code Review"` casar erroneamente com `IN_DEVELOPMENT` (por causa do prefixo de seção `"Desenvolvimento"`), quando deveria casar com `CODE_REVIEW`. Por isso o matcher usa **apenas o trecho depois do último ponto** para comparar contra os aliases, com fallback para a string inteira quando não há ponto (ex: `"Card created"`, `"Concluído"`).

- [ ] **Step 1: Escrever o teste**

```typescript
import { describe, expect, it } from "vitest";
import { matchExternalStatus } from "./match-external-status";

describe("matchExternalStatus", () => {
	it("mapeia 'Card created' para TODO", () => {
		expect(matchExternalStatus("Card created")).toBe("TODO");
	});

	it("mapeia 'Desenvolvimento.Em Andamento' para IN_DEVELOPMENT", () => {
		expect(matchExternalStatus("Desenvolvimento.Em Andamento")).toBe(
			"IN_DEVELOPMENT",
		);
	});

	it("mapeia 'Desenvolvimento.Para Code Review' para CODE_REVIEW, não IN_DEVELOPMENT", () => {
		expect(matchExternalStatus("Desenvolvimento.Para Code Review")).toBe(
			"CODE_REVIEW",
		);
	});

	it("mapeia 'Testes.Para Testar' para TESTING", () => {
		expect(matchExternalStatus("Testes.Para Testar")).toBe("TESTING");
	});

	it("mapeia 'Homologação.Pronto para Publicação' para AWAITING_PUBLICATION", () => {
		expect(matchExternalStatus("Homologação.Pronto para Publicação")).toBe(
			"AWAITING_PUBLICATION",
		);
	});

	it("mapeia 'Concluído' para DONE", () => {
		expect(matchExternalStatus("Concluído")).toBe("DONE");
	});

	it("retorna null para coluna desconhecida", () => {
		expect(matchExternalStatus("Refinamento.Refinamento Técnico")).toBeNull();
	});
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest run src/application/task/match-external-status.test.ts`
Expected: FAIL — `Cannot find module './match-external-status'`

- [ ] **Step 3: Implementar**

```typescript
import { matchesEitherWay } from "@/application/shared/fuzzy-match";
import { TASK_STATUSES, type TaskStatus } from "@/domain/task/entities/task";

const STATUS_ALIASES: Record<TaskStatus, string[]> = {
	TODO: ["Backlog", "Card created"],
	IN_DEVELOPMENT: ["Desenvolvimento", "Em Andamento"],
	CODE_REVIEW: ["Revisão", "Code Review"],
	TESTING: ["Testes", "Para Testar"],
	AWAITING_PUBLICATION: ["Publicação", "Homologação"],
	DONE: ["Concluído", "Concluido", "Done"],
};

export function matchExternalStatus(rawLabel: string): TaskStatus | null {
	const columnPart = rawLabel.includes(".")
		? rawLabel.slice(rawLabel.lastIndexOf(".") + 1)
		: rawLabel;
	for (const status of TASK_STATUSES) {
		if (
			STATUS_ALIASES[status].some((alias) => matchesEitherWay(columnPart, alias))
		) {
			return status;
		}
	}
	return null;
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest run src/application/task/match-external-status.test.ts`
Expected: PASS (7 testes)

- [ ] **Step 5: Commit**

```bash
git add src/application/task/match-external-status.ts src/application/task/match-external-status.test.ts
git commit -m "feat: adiciona tradutor de coluna do Businessmap para TaskStatus"
```

---

### Task 4: Port `ExternalCardProvider` + use-case `previewCardImport`

**Files:**
- Create: `src/application/task/ports/external-card-provider.ts`
- Create: `src/application/task/use-cases/test-helpers/create-fake-external-card-provider.ts`
- Create: `src/application/task/use-cases/preview-card-import.ts`
- Test: `src/application/task/use-cases/preview-card-import.test.ts`

**Interfaces:**
- Consome: `matchExternalStatus` (Task 3), `TeamRepository.listMembers` (`@/application/team/ports/team-repository`), `ApplicationError` (`@/application/shared/application-error`).
- Produz: tipo `ExternalCard`/`ExternalCardStep`/`ExternalCardProvider` (consumidos pela Task 5 e pela composição na Task 6), tipo `CardImportPreview` e função `previewCardImport(provider, teamRepository, teamId, cardId)` (consumidos pela Task 6 e pela Task 7).

- [ ] **Step 1: Definir o port**

```typescript
// src/application/task/ports/external-card-provider.ts
export type ExternalCardStep = {
	columnLabel: string;
	changedAt: Date;
};

export type ExternalCard = {
	externalId: string;
	description: string;
	ownerName: string | null;
	dueDate: string | null;
	steps: ExternalCardStep[];
};

export type ExternalCardProvider = {
	fetchCard(cardId: string): Promise<ExternalCard>;
};
```

- [ ] **Step 2: Fake provider para testes**

```typescript
// src/application/task/use-cases/test-helpers/create-fake-external-card-provider.ts
import type {
	ExternalCard,
	ExternalCardProvider,
} from "@/application/task/ports/external-card-provider";

export type FakeExternalCardProvider = ExternalCardProvider & {
	seed(cardId: string, card: ExternalCard): void;
};

export function createFakeExternalCardProvider(): FakeExternalCardProvider {
	const cards = new Map<string, ExternalCard>();
	return {
		seed(cardId, card) {
			cards.set(cardId, card);
		},
		async fetchCard(cardId) {
			const card = cards.get(cardId);
			if (!card) throw new Error(`Card ${cardId} não encontrado no fake provider`);
			return card;
		},
	};
}
```

- [ ] **Step 3: Escrever o teste do use-case**

```typescript
// src/application/task/use-cases/preview-card-import.test.ts
import { describe, expect, it } from "vitest";
import { createFakeTeamRepository } from "@/application/team/use-cases/test-helpers/create-fake-team-repository";
import { createFakeExternalCardProvider } from "./test-helpers/create-fake-external-card-provider";
import { previewCardImport } from "./preview-card-import";

async function setup() {
	const provider = createFakeExternalCardProvider();
	const teamRepository = createFakeTeamRepository();
	const team = await teamRepository.create("Time 1");
	const member = await teamRepository.addMember(team.id, "Bruno Pajtak");
	return { provider, teamRepository, teamId: team.id, memberId: member.id };
}

describe("previewCardImport", () => {
	it("monta o preview traduzindo histórico e resolvendo responsável", async () => {
		const { provider, teamRepository, teamId, memberId } = await setup();
		provider.seed("415931", {
			externalId: "415931",
			description: "Implementação de link direto",
			ownerName: "Bruno Pajtak",
			dueDate: "2026-10-29",
			steps: [
				{ columnLabel: "Card created", changedAt: new Date("2026-06-10") },
				{
					columnLabel: "Desenvolvimento.Em Andamento",
					changedAt: new Date("2026-07-20"),
				},
			],
		});

		const preview = await previewCardImport(provider, teamRepository, teamId, "415931");

		expect(preview.externalId).toBe("415931");
		expect(preview.dueDate).toBe("2026-10-29");
		expect(preview.resolvedAssigneeId).toBe(memberId);
		expect(preview.warnings).toEqual([]);
		expect(preview.steps).toEqual([
			{ status: "TODO", date: "2026-06-10" },
			{ status: "IN_DEVELOPMENT", date: "2026-07-20" },
		]);
	});

	it("rejeita etapa que não mapeia para nenhum status conhecido", async () => {
		const { provider, teamRepository, teamId } = await setup();
		provider.seed("2", {
			externalId: "2",
			description: "Card com refinamento",
			ownerName: null,
			dueDate: "2026-08-01",
			steps: [
				{ columnLabel: "Card created", changedAt: new Date("2026-06-01") },
				{
					columnLabel: "Refinamento.Refinamento Funcional",
					changedAt: new Date("2026-06-02"),
				},
			],
		});

		await expect(
			previewCardImport(provider, teamRepository, teamId, "2"),
		).rejects.toThrow(
			'Não foi possível mapear a etapa "Refinamento.Refinamento Funcional" para um status conhecido',
		);
	});

	it("rejeita card sem deadline", async () => {
		const { provider, teamRepository, teamId } = await setup();
		provider.seed("3", {
			externalId: "3",
			description: "Sem deadline",
			ownerName: null,
			dueDate: null,
			steps: [{ columnLabel: "Card created", changedAt: new Date("2026-06-01") }],
		});

		await expect(
			previewCardImport(provider, teamRepository, teamId, "3"),
		).rejects.toThrow("O card não possui deadline definido no Businessmap");
	});

	it("adiciona aviso quando o responsável não é encontrado no time", async () => {
		const { provider, teamRepository, teamId } = await setup();
		provider.seed("4", {
			externalId: "4",
			description: "Owner desconhecido",
			ownerName: "jose.hudson.ext",
			dueDate: "2026-08-01",
			steps: [{ columnLabel: "Card created", changedAt: new Date("2026-06-01") }],
		});

		const preview = await previewCardImport(provider, teamRepository, teamId, "4");

		expect(preview.resolvedAssigneeId).toBeNull();
		expect(preview.warnings).toEqual([
			'Responsável "jose.hudson.ext" não encontrado entre os membros do time; será importado sem responsável',
		]);
	});

	it("rejeita id de card vazio", async () => {
		const { provider, teamRepository, teamId } = await setup();
		await expect(
			previewCardImport(provider, teamRepository, teamId, "  "),
		).rejects.toThrow("Id do card é obrigatório");
	});
});
```

- [ ] **Step 4: Rodar os testes e confirmar que falham**

Run: `npx vitest run src/application/task/use-cases/preview-card-import.test.ts`
Expected: FAIL — `Cannot find module './preview-card-import'`

- [ ] **Step 5: Implementar o use-case**

```typescript
// src/application/task/use-cases/preview-card-import.ts
import { ApplicationError } from "@/application/shared/application-error";
import { matchesEitherWay } from "@/application/shared/fuzzy-match";
import { matchExternalStatus } from "@/application/task/match-external-status";
import type { ExternalCardProvider } from "@/application/task/ports/external-card-provider";
import type { TeamRepository } from "@/application/team/ports/team-repository";
import type { Member } from "@/domain/team/entities/member";
import type { TaskStatus } from "@/domain/task/entities/task";

export type CardImportPreview = {
	externalId: string;
	description: string;
	dueDate: string;
	ownerName: string | null;
	resolvedAssigneeId: string | null;
	steps: { status: TaskStatus; date: string }[];
	warnings: string[];
};

function matchMemberByName(members: Member[], ownerName: string): Member | null {
	return members.find((member) => matchesEitherWay(member.name, ownerName)) ?? null;
}

export async function previewCardImport(
	provider: ExternalCardProvider,
	teamRepository: TeamRepository,
	teamId: string,
	cardId: string,
): Promise<CardImportPreview> {
	const trimmedCardId = cardId.trim();
	if (!trimmedCardId) {
		throw new ApplicationError("Id do card é obrigatório");
	}

	const card = await provider.fetchCard(trimmedCardId);
	if (!card.dueDate) {
		throw new ApplicationError("O card não possui deadline definido no Businessmap");
	}
	if (card.steps.length === 0) {
		throw new ApplicationError("O card não possui histórico de movimentação");
	}

	const steps: { status: TaskStatus; date: string }[] = [];
	for (const step of card.steps) {
		const status = matchExternalStatus(step.columnLabel);
		if (!status) {
			throw new ApplicationError(
				`Não foi possível mapear a etapa "${step.columnLabel}" para um status conhecido`,
			);
		}
		const date = step.changedAt.toISOString().slice(0, 10);
		const last = steps[steps.length - 1];
		if (last && last.status === status) continue;
		steps.push({ status, date });
	}
	if (steps.length === 0) {
		throw new ApplicationError("Nenhuma etapa válida encontrada no histórico do card");
	}

	const warnings: string[] = [];
	let resolvedAssigneeId: string | null = null;
	if (card.ownerName) {
		const members = await teamRepository.listMembers(teamId);
		const match = matchMemberByName(members, card.ownerName);
		if (match) {
			resolvedAssigneeId = match.id;
		} else {
			warnings.push(
				`Responsável "${card.ownerName}" não encontrado entre os membros do time; será importado sem responsável`,
			);
		}
	} else {
		warnings.push("Card não possui responsável definido no Businessmap");
	}

	return {
		externalId: card.externalId,
		description: card.description,
		dueDate: card.dueDate,
		ownerName: card.ownerName,
		resolvedAssigneeId,
		steps,
		warnings,
	};
}
```

- [ ] **Step 6: Rodar os testes e confirmar que passam**

Run: `npx vitest run src/application/task/use-cases/preview-card-import.test.ts`
Expected: PASS (5 testes)

- [ ] **Step 7: Commit**

```bash
git add src/application/task/ports/external-card-provider.ts \
  src/application/task/use-cases/test-helpers/create-fake-external-card-provider.ts \
  src/application/task/use-cases/preview-card-import.ts \
  src/application/task/use-cases/preview-card-import.test.ts
git commit -m "feat: adiciona use-case previewCardImport para pré-visualizar importação de card"
```

---

### Task 5: Adapter `businessmapCardProvider` (infra) + env vars

**Files:**
- Create: `src/infrastructure/task/businessmap-card-provider.ts`
- Test: `src/infrastructure/task/businessmap-card-provider.test.ts`
- Create: `.env.example`
- Modify: `.gitignore`

**Interfaces:**
- Consome: `ExternalCardProvider`/`ExternalCard` (Task 4), fixtures reais da Task 1 (`businessmap-card-415931-details.json`, `businessmap-board-108-columns.json`, `businessmap-card-415931-revision-{1,9,10}.json`, `businessmap-card-415931-revisions-trimmed.json`, `businessmap-user-1460.json`).
- Produz: `businessmapCardProvider: ExternalCardProvider` — consumido pela Task 6 (composição).

**Algoritmo (contrato confirmado na Task 1):** a API não tem endpoint de histórico. É preciso: (1) buscar o card atual; (2) buscar as colunas do board (`card.board_id`) para montar o label `"Seção.Coluna"`; (3) buscar a lista de revisões; (4) buscar o snapshot de cada revisão (`GET /cards/{id}/revisions/{n}`) e comparar `column_id` entre snapshots consecutivos — quando muda, é uma transição, com timestamp em `revisions[i].replaced_at` (a revisão que *precede* o snapshot novo); (5) se o último snapshot ainda for diferente da coluna atual do card, adiciona uma transição final; (6) resolve `owner_user_id` via `/users/{id}`.

- [ ] **Step 1: Adicionar `.env.example` e ajustar `.gitignore`**

`.gitignore` tem `.env*` na linha 21, o que também ignora `.env.example`. Adicione uma negação logo abaixo para que o exemplo seja versionado:

```gitignore
# env files (can opt-in for committing if needed)
.env*
!.env.example
```

```bash
# .env.example
BUSINESSMAP_COMPANY_NAME=
BUSINESSMAP_API_KEY=
```

- [ ] **Step 2: Escrever o teste do adapter (com fetch mockado e fixtures reais)**

```typescript
// src/infrastructure/task/businessmap-card-provider.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import cardDetails from "./__fixtures__/businessmap-card-415931-details.json";
import columns from "./__fixtures__/businessmap-board-108-columns.json";
import revisions from "./__fixtures__/businessmap-card-415931-revisions-trimmed.json";
import revision1 from "./__fixtures__/businessmap-card-415931-revision-1.json";
import revision9 from "./__fixtures__/businessmap-card-415931-revision-9.json";
import revision10 from "./__fixtures__/businessmap-card-415931-revision-10.json";
import user from "./__fixtures__/businessmap-user-1460.json";
import { businessmapCardProvider } from "./businessmap-card-provider";

function jsonResponse(body: unknown) {
	return new Response(JSON.stringify(body), { status: 200 });
}

describe("businessmapCardProvider", () => {
	beforeEach(() => {
		process.env.BUSINESSMAP_COMPANY_NAME = "dasa";
		process.env.BUSINESSMAP_API_KEY = "fake-key";
		vi.stubGlobal(
			"fetch",
			vi.fn(async (url: string) => {
				if (url.endsWith("/revisions/1")) return jsonResponse(revision1);
				if (url.endsWith("/revisions/9")) return jsonResponse(revision9);
				if (url.endsWith("/revisions/10")) return jsonResponse(revision10);
				if (url.endsWith("/revisions")) return jsonResponse(revisions);
				if (url.endsWith("/boards/108/columns")) return jsonResponse(columns);
				if (url.endsWith("/users/1460")) return jsonResponse(user);
				if (url.endsWith("/cards/415931")) return jsonResponse(cardDetails);
				throw new Error(`URL não mockada: ${url}`);
			}),
		);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.unstubAllEnvs();
	});

	it("busca card, reconstrói o histórico de colunas e resolve o responsável", async () => {
		const card = await businessmapCardProvider.fetchCard("415931");

		expect(card.externalId).toBe("415931");
		expect(card.ownerName).toBe("jose.hudson.ext");
		expect(card.dueDate).toBe("2026-10-29");
		expect(card.steps).toEqual([
			{ columnLabel: "Backlog", changedAt: new Date("2026-06-10T17:48:37Z") },
			{
				columnLabel: "Refinamento.Pronto para Desenvolvimento",
				changedAt: new Date("2026-06-10T17:48:50+00:00"),
			},
			{
				columnLabel: "Desenvolvimento.Em Andamento",
				changedAt: new Date("2026-07-20T17:00:38+00:00"),
			},
		]);
	});

	it("lança erro quando falta a env var da company name", async () => {
		process.env.BUSINESSMAP_COMPANY_NAME = "";
		await expect(businessmapCardProvider.fetchCard("415931")).rejects.toThrow(
			"BUSINESSMAP_COMPANY_NAME não configurado",
		);
	});
});
```

- [ ] **Step 3: Rodar o teste e confirmar que falha**

Run: `npx vitest run src/infrastructure/task/businessmap-card-provider.test.ts`
Expected: FAIL — `Cannot find module './businessmap-card-provider'`

- [ ] **Step 4: Implementar o adapter**

```typescript
// src/infrastructure/task/businessmap-card-provider.ts
import type {
	ExternalCard,
	ExternalCardProvider,
} from "@/application/task/ports/external-card-provider";

type BusinessmapCard = {
	card_id: number;
	board_id: number;
	column_id: number;
	description: string;
	deadline: string | null;
	owner_user_id: number | null;
	created_at: string;
};

type BusinessmapRevision = { revision: number; user_id: number; replaced_at: string };
type BusinessmapColumn = {
	column_id: number;
	parent_column_id: number | null;
	name: string;
};
type BusinessmapUser = { username: string };

function baseUrl(): string {
	const companyName = process.env.BUSINESSMAP_COMPANY_NAME;
	if (!companyName) {
		throw new Error("BUSINESSMAP_COMPANY_NAME não configurado");
	}
	return `https://${companyName}.kanbanize.com/api/v2`;
}

function authHeaders(): HeadersInit {
	const apiKey = process.env.BUSINESSMAP_API_KEY;
	if (!apiKey) {
		throw new Error("BUSINESSMAP_API_KEY não configurado");
	}
	return { apikey: apiKey };
}

async function getJson<T>(url: string, headers: HeadersInit): Promise<T> {
	const response = await fetch(url, { headers });
	if (!response.ok) {
		throw new Error(`Businessmap respondeu ${response.status} ao chamar ${url}`);
	}
	const body = (await response.json()) as { data: T };
	return body.data;
}

function columnLabel(
	columnId: number,
	columnsById: Map<number, BusinessmapColumn>,
): string {
	const column = columnsById.get(columnId);
	if (!column) return `column-${columnId}`;
	const parent = column.parent_column_id
		? columnsById.get(column.parent_column_id)
		: null;
	return parent ? `${parent.name}.${column.name}` : column.name;
}

export const businessmapCardProvider: ExternalCardProvider = {
	async fetchCard(cardId: string): Promise<ExternalCard> {
		const headers = authHeaders();
		const url = baseUrl();

		const card = await getJson<BusinessmapCard>(`${url}/cards/${cardId}`, headers);
		const columns = await getJson<BusinessmapColumn[]>(
			`${url}/boards/${card.board_id}/columns`,
			headers,
		);
		const columnsById = new Map(columns.map((column) => [column.column_id, column]));

		const revisions = await getJson<BusinessmapRevision[]>(
			`${url}/cards/${cardId}/revisions`,
			headers,
		);
		const snapshots: number[] = [];
		for (const revision of revisions) {
			const snapshot = await getJson<BusinessmapCard>(
				`${url}/cards/${cardId}/revisions/${revision.revision}`,
				headers,
			);
			snapshots.push(snapshot.column_id);
		}

		const steps: { columnLabel: string; changedAt: Date }[] = [];
		if (snapshots.length > 0) {
			steps.push({
				columnLabel: columnLabel(snapshots[0], columnsById),
				changedAt: new Date(card.created_at),
			});
			for (let i = 0; i < snapshots.length - 1; i++) {
				if (snapshots[i] !== snapshots[i + 1]) {
					steps.push({
						columnLabel: columnLabel(snapshots[i + 1], columnsById),
						changedAt: new Date(revisions[i].replaced_at),
					});
				}
			}
			const lastSnapshot = snapshots[snapshots.length - 1];
			if (lastSnapshot !== card.column_id) {
				steps.push({
					columnLabel: columnLabel(card.column_id, columnsById),
					changedAt: new Date(revisions[revisions.length - 1].replaced_at),
				});
			}
		} else {
			steps.push({
				columnLabel: columnLabel(card.column_id, columnsById),
				changedAt: new Date(card.created_at),
			});
		}

		let ownerName: string | null = null;
		if (card.owner_user_id) {
			const owner = await getJson<BusinessmapUser>(
				`${url}/users/${card.owner_user_id}`,
				headers,
			);
			ownerName = owner.username;
		}

		return {
			externalId: String(card.card_id),
			description: card.description,
			ownerName,
			dueDate: card.deadline ? card.deadline.slice(0, 10) : null,
			steps,
		};
	},
};
```

- [ ] **Step 5: Rodar o teste e confirmar que passa**

Run: `npx vitest run src/infrastructure/task/businessmap-card-provider.test.ts`
Expected: PASS (2 testes)

- [ ] **Step 6: Commit**

```bash
git add src/infrastructure/task/businessmap-card-provider.ts \
  src/infrastructure/task/businessmap-card-provider.test.ts \
  src/infrastructure/task/__fixtures__/businessmap-card-415931-revisions-trimmed.json \
  .env.example .gitignore
git commit -m "feat: adiciona adapter HTTP do Businessmap para importação de card"
```

---

### Task 6: Composição (DI)

**Files:**
- Modify: `src/composition/task.ts`

**Interfaces:**
- Consome: `previewCardImport` (Task 4), `businessmapCardProvider` (Task 5), `createHistoricalTask` (já existente), `CardImportPreview` (Task 4).
- Produz: `createTaskUseCases().previewCardImport(teamId, cardId)` e `createTaskUseCases().importCard(teamId, preview, typeId, tagIds)` — consumidos pela Task 7.

- [ ] **Step 1: Adicionar os dois métodos na fábrica**

Adicione os imports no topo de `src/composition/task.ts`:

```typescript
import type { CardImportPreview } from "@/application/task/use-cases/preview-card-import";
import { previewCardImport } from "@/application/task/use-cases/preview-card-import";
import { businessmapCardProvider } from "@/infrastructure/task/businessmap-card-provider";
```

E adicione estes dois métodos dentro do objeto retornado por `createTaskUseCases()` (logo após `createHistoricalTask`):

```typescript
		previewCardImport: (teamId: string, cardId: string) =>
			previewCardImport(businessmapCardProvider, drizzleTeamRepository, teamId, cardId),
		importCard: (
			teamId: string,
			preview: CardImportPreview,
			typeId: string,
			tagIds?: string[],
		) =>
			createHistoricalTask(
				drizzleTaskRepository,
				drizzleTaskTypeRepository,
				drizzleTeamRepository,
				{
					externalId: preview.externalId,
					description: preview.description,
					typeId,
					assigneeId: preview.resolvedAssigneeId,
					teamId,
					dueDate: preview.dueDate,
					steps: preview.steps,
					tagIds,
				},
				drizzleTagRepository,
			),
```

- [ ] **Step 2: Checar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros novos relacionados a `src/composition/task.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/composition/task.ts
git commit -m "feat: expõe previewCardImport e importCard na composição de task"
```

---

### Task 7: Server actions

**Files:**
- Create: `src/app/board/import-card-actions.ts`

**Interfaces:**
- Consome: `createTaskUseCases()` (Task 6), `CardImportPreview` (Task 4), `ActionState`/`ApplicationError`/`isUuid` (já existentes).
- Produz: `previewCardImportAction(cardId): Promise<PreviewCardImportResult>` e `confirmCardImportAction(input): Promise<ActionState>` — consumidos pela Task 8 (modal).

- [ ] **Step 1: Implementar**

```typescript
// src/app/board/import-card-actions.ts
"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/application/shared/action-state";
import { ApplicationError } from "@/application/shared/application-error";
import { isUuid } from "@/application/shared/validation";
import type { CardImportPreview } from "@/application/task/use-cases/preview-card-import";
import { createTaskUseCases } from "@/composition/task";
import { createTeamUseCases } from "@/composition/team";

function toActionState(error: unknown): ActionState {
	if (error instanceof ApplicationError) return { error: error.message };
	console.error(error);
	return { error: "Não foi possível concluir a operação" };
}

async function getCurrentTeamId() {
	const team = await createTeamUseCases().getCurrentTeam();
	if (!team) throw new ApplicationError("Time não encontrado");
	return team.id;
}

export type PreviewCardImportResult =
	| { error: string; preview?: undefined }
	| { error: null; preview: CardImportPreview };

export async function previewCardImportAction(
	cardId: string,
): Promise<PreviewCardImportResult> {
	try {
		if (typeof cardId !== "string") {
			throw new ApplicationError("Id do card é obrigatório");
		}
		const teamId = await getCurrentTeamId();
		const preview = await createTaskUseCases().previewCardImport(teamId, cardId);
		return { error: null, preview };
	} catch (error) {
		return { error: toActionState(error).error ?? "Não foi possível concluir a operação" };
	}
}

export type ConfirmCardImportInput = {
	preview: CardImportPreview;
	typeId: string;
	tagIds?: string[];
};

export async function confirmCardImportAction(
	input: ConfirmCardImportInput,
): Promise<ActionState> {
	try {
		if (!isUuid(input.typeId)) {
			throw new ApplicationError("Selecione o tipo da task");
		}
		const teamId = await getCurrentTeamId();
		await createTaskUseCases().importCard(
			teamId,
			input.preview,
			input.typeId,
			input.tagIds,
		);
		revalidatePath("/board");
		return { error: null };
	} catch (error) {
		return toActionState(error);
	}
}
```

- [ ] **Step 2: Checar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/app/board/import-card-actions.ts
git commit -m "feat: adiciona server actions de preview e confirmação de importação de card"
```

---

### Task 8: Modal de importação (preview + confirmar/cancelar)

**Files:**
- Create: `src/presentation/task/import-card-modal.tsx`

**Interfaces:**
- Consome: `previewCardImportAction`/`confirmCardImportAction` (Task 7), `CardImportPreview` (Task 4), `Modal` e `TagCombobox` (`@/presentation/shared`), `STATUS_LABELS` (`@/presentation/task/task-status-labels`).
- Produz: componente `ImportCardModal` — consumido pela Task 9.

- [ ] **Step 1: Implementar o componente**

```tsx
// src/presentation/task/import-card-modal.tsx
"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import type {
	ConfirmCardImportInput,
	PreviewCardImportResult,
} from "@/app/board/import-card-actions";
import type { ActionState } from "@/application/shared/action-state";
import type { CardImportPreview } from "@/application/task/use-cases/preview-card-import";
import type { Tag } from "@/domain/task/entities/tag";
import type { TaskType } from "@/domain/task/entities/task-type";
import { Modal } from "@/presentation/shared/modal";
import { TagCombobox } from "@/presentation/shared/tag-combobox";
import { STATUS_LABELS } from "@/presentation/task/task-status-labels";

type ImportCardModalProps = {
	taskTypes: TaskType[];
	tags: Tag[];
	previewCardImportAction: (cardId: string) => Promise<PreviewCardImportResult>;
	confirmCardImportAction: (input: ConfirmCardImportInput) => Promise<ActionState>;
};

export function ImportCardModal({
	taskTypes,
	tags,
	previewCardImportAction,
	confirmCardImportAction,
}: ImportCardModalProps) {
	const [open, setOpen] = useState(false);
	const [cardId, setCardId] = useState("");
	const [preview, setPreview] = useState<CardImportPreview | null>(null);
	const [typeId, setTypeId] = useState(taskTypes[0]?.id ?? "");
	const [tagIds, setTagIds] = useState<string[]>([]);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);

	function reset() {
		setCardId("");
		setPreview(null);
		setTagIds([]);
		setError(null);
	}

	async function handleFetch() {
		setPending(true);
		setError(null);
		try {
			const result = await previewCardImportAction(cardId);
			if (result.error) {
				setError(result.error);
				return;
			}
			setPreview(result.preview);
		} catch {
			setError("Não foi possível buscar o card");
		} finally {
			setPending(false);
		}
	}

	async function handleConfirm() {
		if (!preview) return;
		setPending(true);
		setError(null);
		try {
			const result = await confirmCardImportAction({ preview, typeId, tagIds });
			if (result.error) {
				setError(result.error);
				return;
			}
			setOpen(false);
			reset();
		} catch {
			setError("Não foi possível concluir a operação");
		} finally {
			setPending(false);
		}
	}

	return (
		<>
			<button
				type="button"
				onClick={() => setOpen(true)}
				className="flex items-center gap-1 rounded-lg border border-(--border) px-4 py-2"
			>
				<Download size={16} aria-hidden="true" />
				Importar card
			</button>
			{open ? (
				<Modal
					label="Importar card do Businessmap"
					size="lg"
					onClose={() => {
						setOpen(false);
						reset();
					}}
				>
					{!preview ? (
						<div className="flex flex-col gap-4">
							<div className="flex flex-col gap-2">
								<label htmlFor="import-card-id" className="text-sm opacity-70">
									Id do card no Businessmap
								</label>
								<input
									id="import-card-id"
									value={cardId}
									onChange={(event) => setCardId(event.target.value)}
									className="rounded-lg border border-(--border) px-3 py-2"
								/>
							</div>
							{error ? <p role="alert">{error}</p> : null}
							<button
								type="button"
								disabled={pending || !cardId.trim()}
								onClick={handleFetch}
								className="self-start rounded-lg bg-(--accent) px-4 py-2 text-(--accent-fg) disabled:opacity-60"
							>
								Buscar
							</button>
						</div>
					) : (
						<div className="flex flex-col gap-4">
							<div>
								<p className="text-sm opacity-70">Id externo</p>
								<p>{preview.externalId}</p>
							</div>
							<div>
								<p className="text-sm opacity-70">Descrição</p>
								<p className="whitespace-pre-wrap">{preview.description}</p>
							</div>
							<div>
								<p className="text-sm opacity-70">Data prevista</p>
								<p>{preview.dueDate}</p>
							</div>
							<div>
								<p className="text-sm opacity-70">Responsável</p>
								<p>
									{preview.ownerName ?? "Sem responsável"}
									{!preview.resolvedAssigneeId ? " (sem correspondência no time)" : ""}
								</p>
							</div>
							<div>
								<p className="text-sm opacity-70">Etapas importadas</p>
								<ul className="list-disc pl-5">
									{preview.steps.map((step) => (
										<li key={`${step.status}-${step.date}`}>
											{STATUS_LABELS[step.status]} — {step.date}
										</li>
									))}
								</ul>
							</div>
							{preview.warnings.length > 0 ? (
								<ul className="list-disc pl-5 text-sm opacity-80">
									{preview.warnings.map((warning) => (
										<li key={warning}>{warning}</li>
									))}
								</ul>
							) : null}
							<div className="flex flex-col gap-2">
								<label htmlFor="import-typeId" className="text-sm opacity-70">
									Tipo
								</label>
								<select
									id="import-typeId"
									value={typeId}
									onChange={(event) => setTypeId(event.target.value)}
									className="rounded-lg border border-(--border) px-3 py-2"
								>
									{taskTypes.map((taskType) => (
										<option key={taskType.id} value={taskType.id}>
											{taskType.name}
										</option>
									))}
								</select>
							</div>
							<TagCombobox
								id="import-tags"
								label="Tarjas"
								catalog={tags}
								selectedIds={tagIds}
								max={3}
								onChange={setTagIds}
							/>
							{error ? <p role="alert">{error}</p> : null}
							<div className="flex gap-2">
								<button
									type="button"
									disabled={pending}
									onClick={handleConfirm}
									className="rounded-lg bg-(--accent) px-4 py-2 text-(--accent-fg) disabled:opacity-60"
								>
									Confirmar importação
								</button>
								<button
									type="button"
									disabled={pending}
									onClick={reset}
									className="rounded-lg border border-(--border) px-4 py-2"
								>
									Cancelar
								</button>
							</div>
						</div>
					)}
				</Modal>
			) : null}
		</>
	);
}
```

- [ ] **Step 2: Checar tipos e lint**

Run: `npx tsc --noEmit && npx biome check src/presentation/task/import-card-modal.tsx`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/presentation/task/import-card-modal.tsx
git commit -m "feat: adiciona modal de importação de card com preview e confirmação"
```

---

### Task 9: Ligar o modal ao quadro

**Files:**
- Modify: `src/presentation/task/kanban-board.tsx`
- Modify: `src/app/board/page.tsx`

**Interfaces:**
- Consome: `ImportCardModal` (Task 8), `previewCardImportAction`/`confirmCardImportAction` (Task 7).

- [ ] **Step 1: Adicionar o import e as props em `kanban-board.tsx`**

Adicione o import (ordem alfabética, junto aos outros de `@/presentation/task`):

```typescript
import { ImportCardModal } from "@/presentation/task/import-card-modal";
```

E os tipos das novas props em `KanbanBoardProps`, junto aos demais (mesmos tipos usados em `import-card-actions.ts`):

```typescript
	previewCardImportAction: (
		cardId: string,
	) => Promise<import("@/app/board/import-card-actions").PreviewCardImportResult>;
	confirmCardImportAction: (
		input: import("@/app/board/import-card-actions").ConfirmCardImportInput,
	) => Promise<ActionState>;
```

E desestruture as duas novas props na assinatura da função `KanbanBoard`, e renderize o modal logo antes de `<HistoricalTaskFormModal ... />` (linha 121 hoje):

```tsx
					<ImportCardModal
						taskTypes={taskTypes}
						tags={tags}
						previewCardImportAction={previewCardImportAction}
						confirmCardImportAction={confirmCardImportAction}
					/>
```

- [ ] **Step 2: Passar as actions em `board/page.tsx`**

Adicione o import:

```typescript
import {
	confirmCardImportAction,
	previewCardImportAction,
} from "@/app/board/import-card-actions";
```

E as duas props na chamada de `<KanbanBoard ... />`:

```tsx
			previewCardImportAction={previewCardImportAction}
			confirmCardImportAction={confirmCardImportAction}
```

- [ ] **Step 3: Checar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 4: Rodar toda a suíte de testes**

Run: `npm test`
Expected: PASS (todos os testes, incluindo os novos das Tasks 2–5).

- [ ] **Step 5: Testar manualmente**

Suba o app (`npm run dev`), abra `/board`, clique em "Importar card", informe `415931`, confira o preview (descrição, deadline, responsável, etapas, avisos) e teste tanto "Confirmar importação" quanto "Cancelar".

- [ ] **Step 6: Commit**

```bash
git add src/presentation/task/kanban-board.tsx src/app/board/page.tsx
git commit -m "feat: liga o botão de importar card ao quadro"
```

---

## Self-Review

**Cobertura do spec do usuário:**
- Botão "Importar card" → Task 8/9.
- Informar id, buscar dados → Task 7 (`previewCardImportAction`) + Task 5 (adapter real).
- Pedir confirmação mostrando tudo que será importado → Task 8 (tela de preview antes do botão "Confirmar importação").
- OK importa / Cancelar não importa → Task 8 (`handleConfirm` vs `reset`+fechar modal, sem chamada nenhuma no cancelamento).
- Avaliar histórico, mapeamento de status fornecido pelo usuário → Task 3 (`STATUS_ALIASES`) com teste que cobre os 6 mapeamentos exatos do usuário.
- Matching bidirecional (bate um dentro do outro e vice-versa) → Task 2 (`matchesEitherWay`), usado tanto para status (Task 3) quanto para responsável (Task 4).
- Variável de ambiente para url/apikey → Task 5 (`.env.example`, `BUSINESSMAP_COMPANY_NAME`/`BUSINESSMAP_API_KEY`).
- Erro e aviso quando faltar dado obrigatório → Task 4 lança `ApplicationError` para deadline ausente, etapa não mapeável e id vazio; `typeId` é validado na Task 7; responsável não encontrado vira aviso nos `warnings` do preview (decisão consciente — `assigneeId` é opcional no domínio, então não bloqueia a importação, mas é sempre exibido ao usuário antes de confirmar).

**Placeholders:** nenhum — todo passo tem código completo e comandos exatos.

**Consistência de tipos:** `CardImportPreview` (Task 4) é o mesmo tipo usado em `import-card-actions.ts` (Task 7) e em `import-card-modal.tsx` (Task 8); `ExternalCardProvider`/`ExternalCard` (Task 4) é implementado por `businessmapCardProvider` (Task 5) sem alterações de shape.
