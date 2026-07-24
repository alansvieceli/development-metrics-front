# Sincronização com Businessmap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar dois pontos de checagem de sincronia entre o board local e o Businessmap: um ícone por card que verifica sob demanda se a coluna atual do card no Businessmap mapeia para o mesmo `TaskStatus` local, e um ícone por coluna que compara a lista de `externalId` locais com os cards que o Businessmap tem atualmente mapeados para aquele mesmo status.

**Architecture:** Duas novas capacidades no port `ExternalCardProvider` (`fetchCardColumn`, `listBoardCards`) implementadas pelo adapter HTTP já existente (`businessmap-card-provider.ts`). Dois use-cases novos (`checkCardSync`, `diffColumnWithBusinessmap`) reaproveitam `matchExternalStatus` já existente — nenhuma regra de mapeamento nova. Dois server actions somente-leitura expõem os use-cases para dois componentes client novos (`CardSyncBadge`, `ColumnSyncModal`) chamados sob demanda (clique do usuário), nunca automaticamente ao carregar o board.

**Tech Stack:** Next.js Server Actions, TypeScript, Vitest, `fetch` nativo, mesmo padrão de `import-card-actions.ts`/`businessmap-card-provider.ts` já existentes.

## Global Constraints

- Sem novas dependências de terceiros: `fetch` nativo, ícones de `lucide-react` (já instalada).
- Nenhuma correção automática: o board nunca escreve de volta no Businessmap nem se autocorrige — é checagem pontual, sob demanda (nunca automática ao carregar o board).
- Sem cache/polling em background, sem histórico de divergências.
- Reaproveitar `matchExternalStatus`/`STATUS_ALIASES` já existentes — nenhuma regra de mapeamento nova.
- `fetchCardColumn` não deve reconstruir histórico via revisões — só o estado atual (2 chamadas: card + colunas do board).
- Card não encontrado no Businessmap (404) é resultado válido (`found: false`), nunca uma exceção.
- Nunca commitar o valor real da API key/board id do Businessmap em nenhum arquivo do repo.
- Seguir o padrão de leitura de env var já usado em `businessmap-card-provider.ts` (`process.env.X` direto, sem serviço de config).

---

## Referência — spec completa

`docs/superpowers/specs/2026-07-23-sincronizacao-businessmap-design.md`

---

### Task 1: `fetchCardColumn` no port + adapter infra

**Files:**
- Modify: `src/application/task/ports/external-card-provider.ts`
- Modify: `src/infrastructure/task/businessmap-card-provider.ts`
- Modify: `src/infrastructure/task/businessmap-card-provider.test.ts`

**Interfaces:**
- Produz: `ExternalCardProvider.fetchCardColumn(cardId: string): Promise<{ columnLabel: string } | null>` — consumido pela Task 2.

O card `415931` do fixture já existente (`businessmap-card-415931-details.json`) tem `column_id: 5270`, que no fixture de colunas (`businessmap-board-108-columns.json`) é `"Em Andamento"` com `parent_column_id: 5268` (`"Desenvolvimento"`) — o label esperado é `"Desenvolvimento.Em Andamento"`, igual ao último passo já coberto pelo teste existente de `fetchCard`.

- [ ] **Step 1: Escrever os testes (adicionar ao arquivo existente)**

Adicione este bloco `describe` ao final de `src/infrastructure/task/businessmap-card-provider.test.ts`, antes do fechamento do `describe("businessmapCardProvider", ...)` (ou seja, dentro dele, como um segundo `describe` irmão do existente `it("busca card...")`/`it("lança erro...")`):

```typescript
	describe("fetchCardColumn", () => {
		it("retorna a coluna atual do card", async () => {
			const result = await businessmapCardProvider.fetchCardColumn("415931");
			expect(result).toEqual({ columnLabel: "Desenvolvimento.Em Andamento" });
		});

		it("retorna null quando o card não existe no Businessmap (404)", async () => {
			vi.stubGlobal(
				"fetch",
				vi.fn(async () => new Response(null, { status: 404 })),
			);
			const result = await businessmapCardProvider.fetchCardColumn("999999");
			expect(result).toBeNull();
		});
	});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npx vitest run src/infrastructure/task/businessmap-card-provider.test.ts`
Expected: FAIL — `TypeError: businessmapCardProvider.fetchCardColumn is not a function` (os 2 testes já existentes continuam passando).

- [ ] **Step 3: Adicionar `fetchCardColumn` ao port**

Em `src/application/task/ports/external-card-provider.ts`, adicione o método ao tipo `ExternalCardProvider`:

```typescript
export type ExternalCardProvider = {
	fetchCard(cardId: string): Promise<ExternalCard>;
	fetchCardColumn(cardId: string): Promise<{ columnLabel: string } | null>;
};
```

- [ ] **Step 4: Implementar no adapter**

Em `src/infrastructure/task/businessmap-card-provider.ts`, extraia um helper compartilhado para buscar as colunas de um board (usado tanto pelo `fetchCard` já existente quanto pelo novo `fetchCardColumn`), e adicione o método novo ao objeto exportado.

Substitua a função `columnLabel` existente e o bloco de montagem de `columnsById` dentro de `fetchCard` por este helper adicional (adicione a função, não remova `columnLabel`):

```typescript
async function fetchColumnsById(
	boardId: number,
	headers: HeadersInit,
	url: string,
): Promise<Map<number, BusinessmapColumn>> {
	const columns = await getJson<BusinessmapColumn[]>(
		`${url}/boards/${boardId}/columns`,
		headers,
	);
	return new Map(columns.map((column) => [column.column_id, column]));
}
```

Dentro de `fetchCard`, substitua:

```typescript
		const columns = await getJson<BusinessmapColumn[]>(
			`${url}/boards/${card.board_id}/columns`,
			headers,
		);
		const columnsById = new Map(
			columns.map((column) => [column.column_id, column]),
		);
```

por:

```typescript
		const columnsById = await fetchColumnsById(card.board_id, headers, url);
```

Adicione o método `fetchCardColumn` ao objeto `businessmapCardProvider` (logo após `fetchCard`, antes do fechamento `}`):

```typescript
	async fetchCardColumn(
		cardId: string,
	): Promise<{ columnLabel: string } | null> {
		const headers = authHeaders();
		const url = baseUrl();
		const response = await fetch(`${url}/cards/${cardId}`, { headers });
		if (response.status === 404) return null;
		if (!response.ok) {
			throw new Error(
				`Businessmap respondeu ${response.status} ao chamar ${url}/cards/${cardId}`,
			);
		}
		const body = (await response.json()) as { data: BusinessmapCard };
		const card = body.data;
		const columnsById = await fetchColumnsById(card.board_id, headers, url);
		return { columnLabel: columnLabel(card.column_id, columnsById) };
	},
```

- [ ] **Step 5: Rodar os testes e confirmar que passam**

Run: `npx vitest run src/infrastructure/task/businessmap-card-provider.test.ts`
Expected: PASS (4 testes: os 2 já existentes + os 2 novos).

- [ ] **Step 6: Checar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 7: Commit**

```bash
git add src/application/task/ports/external-card-provider.ts \
  src/infrastructure/task/businessmap-card-provider.ts \
  src/infrastructure/task/businessmap-card-provider.test.ts
git commit -m "feat: adiciona fetchCardColumn ao provider do Businessmap"
```

---

### Task 2: Use-case `checkCardSync`

**Files:**
- Modify: `src/application/task/use-cases/test-helpers/create-fake-external-card-provider.ts`
- Create: `src/application/task/use-cases/check-card-sync.ts`
- Test: `src/application/task/use-cases/check-card-sync.test.ts`

**Interfaces:**
- Consome: `ExternalCardProvider.fetchCardColumn` (Task 1), `matchExternalStatus` (`@/application/task/match-external-status`, já existente).
- Produz: tipo `CardSyncResult` e função `checkCardSync(provider, externalId, localStatus): Promise<CardSyncResult>` — consumidos pela Task 5 (composição) e Task 6 (server action).

- [ ] **Step 1: Adicionar `seedColumn` ao fake provider**

Substitua o conteúdo de `src/application/task/use-cases/test-helpers/create-fake-external-card-provider.ts` por:

```typescript
import type {
	ExternalCard,
	ExternalCardProvider,
} from "@/application/task/ports/external-card-provider";

export type FakeExternalCardProvider = ExternalCardProvider & {
	seed(cardId: string, card: ExternalCard): void;
	seedColumn(cardId: string, column: { columnLabel: string }): void;
};

export function createFakeExternalCardProvider(): FakeExternalCardProvider {
	const cards = new Map<string, ExternalCard>();
	const columns = new Map<string, { columnLabel: string }>();
	return {
		seed(cardId, card) {
			cards.set(cardId, card);
		},
		seedColumn(cardId, column) {
			columns.set(cardId, column);
		},
		async fetchCard(cardId) {
			const card = cards.get(cardId);
			if (!card)
				throw new Error(`Card ${cardId} não encontrado no fake provider`);
			return card;
		},
		async fetchCardColumn(cardId) {
			return columns.get(cardId) ?? null;
		},
	};
}
```

- [ ] **Step 2: Escrever o teste**

```typescript
// src/application/task/use-cases/check-card-sync.test.ts
import { describe, expect, it } from "vitest";
import { createFakeExternalCardProvider } from "./test-helpers/create-fake-external-card-provider";
import { checkCardSync } from "./check-card-sync";

describe("checkCardSync", () => {
	it("retorna inSync=true quando a coluna atual do Businessmap mapeia para o mesmo status local", async () => {
		const provider = createFakeExternalCardProvider();
		provider.seedColumn("415931", {
			columnLabel: "Desenvolvimento.Em Andamento",
		});

		const result = await checkCardSync(provider, "415931", "IN_DEVELOPMENT");

		expect(result).toEqual({
			found: true,
			businessmapColumnLabel: "Desenvolvimento.Em Andamento",
			businessmapStatus: "IN_DEVELOPMENT",
			inSync: true,
		});
	});

	it("retorna inSync=false quando os status divergem", async () => {
		const provider = createFakeExternalCardProvider();
		provider.seedColumn("415931", { columnLabel: "Testes.Para Testar" });

		const result = await checkCardSync(provider, "415931", "IN_DEVELOPMENT");

		expect(result).toEqual({
			found: true,
			businessmapColumnLabel: "Testes.Para Testar",
			businessmapStatus: "TESTING",
			inSync: false,
		});
	});

	it("retorna businessmapStatus=null quando a coluna não mapeia para nenhum status conhecido", async () => {
		const provider = createFakeExternalCardProvider();
		provider.seedColumn("415931", {
			columnLabel: "Refinamento.Refinamento Técnico",
		});

		const result = await checkCardSync(provider, "415931", "TODO");

		expect(result).toEqual({
			found: true,
			businessmapColumnLabel: "Refinamento.Refinamento Técnico",
			businessmapStatus: null,
			inSync: false,
		});
	});

	it("retorna found=false quando o card não existe no Businessmap", async () => {
		const provider = createFakeExternalCardProvider();

		const result = await checkCardSync(provider, "999999", "TODO");

		expect(result).toEqual({ found: false });
	});
});
```

- [ ] **Step 3: Rodar o teste e confirmar que falha**

Run: `npx vitest run src/application/task/use-cases/check-card-sync.test.ts`
Expected: FAIL — `Cannot find module './check-card-sync'`

- [ ] **Step 4: Implementar**

```typescript
// src/application/task/use-cases/check-card-sync.ts
import { matchExternalStatus } from "@/application/task/match-external-status";
import type { ExternalCardProvider } from "@/application/task/ports/external-card-provider";
import type { TaskStatus } from "@/domain/task/entities/task";

export type CardSyncResult =
	| { found: false }
	| {
			found: true;
			businessmapColumnLabel: string;
			businessmapStatus: TaskStatus | null;
			inSync: boolean;
	  };

export async function checkCardSync(
	provider: ExternalCardProvider,
	externalId: string,
	localStatus: TaskStatus,
): Promise<CardSyncResult> {
	const current = await provider.fetchCardColumn(externalId);
	if (!current) return { found: false };

	const businessmapStatus = matchExternalStatus(current.columnLabel);
	return {
		found: true,
		businessmapColumnLabel: current.columnLabel,
		businessmapStatus,
		inSync: businessmapStatus === localStatus,
	};
}
```

- [ ] **Step 5: Rodar o teste e confirmar que passa**

Run: `npx vitest run src/application/task/use-cases/check-card-sync.test.ts`
Expected: PASS (4 testes)

- [ ] **Step 6: Rodar toda a suíte pra garantir que o fake provider não quebrou outros consumidores**

Run: `npx vitest run src/application/task/use-cases/preview-card-import.test.ts`
Expected: PASS (o fake provider ganhou métodos novos, mas manteve os antigos — nada deve quebrar).

- [ ] **Step 7: Commit**

```bash
git add src/application/task/use-cases/test-helpers/create-fake-external-card-provider.ts \
  src/application/task/use-cases/check-card-sync.ts \
  src/application/task/use-cases/check-card-sync.test.ts
git commit -m "feat: adiciona use-case checkCardSync"
```

---

### Task 3: `listBoardCards` no port + adapter infra (com descoberta do contrato real)

**Files:**
- Modify: `src/application/task/ports/external-card-provider.ts`
- Modify: `src/infrastructure/task/businessmap-card-provider.ts`
- Modify: `src/infrastructure/task/businessmap-card-provider.test.ts`
- Create: `src/infrastructure/task/__fixtures__/businessmap-board-108-cards.json` (nome final depende do endpoint descoberto no Step 1)
- Modify: `.env.example`

**Interfaces:**
- Produz: `ExternalCardProvider.listBoardCards(): Promise<{ externalId: string; columnLabel: string }[]>` — consumido pela Task 4.

**⚠️ Contrato do endpoint de listagem ainda não confirmado.** Diferente das Tasks 1/2, esta task começa com uma investigação real contra a API (mesmo padrão usado para descobrir o contrato de histórico do card, documentado no início de `docs/superpowers/plans/2026-07-23-importar-card-businessmap.md`). O board `108` (do card `415931` já usado nos fixtures) serve de board de teste.

- [ ] **Step 1: Descobrir o endpoint real de listagem de cards por board**

Usando as credenciais do `.env` local (`BUSINESSMAP_COMPANY_NAME`, `BUSINESSMAP_API_KEY`), rode:

```bash
source .env
curl -s -H "apikey: $BUSINESSMAP_API_KEY" \
  "https://$BUSINESSMAP_COMPANY_NAME.kanbanize.com/api/v2/cards?board_ids[]=108" | head -c 2000
```

Se retornar 404 ou erro de parâmetro, tente o formato alternativo:

```bash
curl -s -H "apikey: $BUSINESSMAP_API_KEY" \
  "https://$BUSINESSMAP_COMPANY_NAME.kanbanize.com/api/v2/boards/108/cards" | head -c 2000
```

Confirme no corpo da resposta: (a) qual desses dois formatos funciona, (b) se cada item tem `card_id` e `column_id` (mesmos campos já usados em `BusinessmapCard`), (c) se a resposta é paginada (procure por `page`/`per_page`/`next_page` no corpo ou nos headers — se houver paginação, anote quantas páginas o board `108` tem hoje).

Salve a resposta completa (sem a api key) em `src/infrastructure/task/__fixtures__/businessmap-board-108-cards.json`, no mesmo formato `{ "data": [...] }` dos outros fixtures do diretório.

**Depois de confirmar:** atualize este arquivo de plano (Step 1 desta Task) com o endpoint e formato reais encontrados, igual ao que foi feito na Task 1 do plano de importação — isso evita que quem executar os próximos steps assuma o candidato errado.

- [ ] **Step 2: Escrever o teste do adapter**

Ajuste este teste conforme o formato real confirmado no Step 1 (nomes de campo e URL). Adicione a `src/infrastructure/task/businessmap-card-provider.test.ts`:

Import no topo do arquivo:

```typescript
import boardCards from "./__fixtures__/businessmap-board-108-cards.json";
```

E no mock de `fetch` dentro do `beforeEach`, adicione (ajuste a condição de URL para o endpoint confirmado no Step 1):

```typescript
				if (url.endsWith("/cards?board_ids[]=108"))
					return jsonResponse(boardCards);
```

Novo `describe`, dentro de `describe("businessmapCardProvider", ...)`:

```typescript
	describe("listBoardCards", () => {
		it("lança erro quando BUSINESSMAP_BOARD_ID não está configurado", async () => {
			process.env.BUSINESSMAP_BOARD_ID = "";
			await expect(businessmapCardProvider.listBoardCards()).rejects.toThrow(
				"BUSINESSMAP_BOARD_ID não configurado",
			);
		});

		it("lista todos os cards do board com sua coluna atual", async () => {
			process.env.BUSINESSMAP_BOARD_ID = "108";
			const cards = await businessmapCardProvider.listBoardCards();
			expect(cards).toContainEqual({
				externalId: "415931",
				columnLabel: "Desenvolvimento.Em Andamento",
			});
		});
	});
```

- [ ] **Step 3: Rodar os testes e confirmar que falham**

Run: `npx vitest run src/infrastructure/task/businessmap-card-provider.test.ts`
Expected: FAIL — `TypeError: businessmapCardProvider.listBoardCards is not a function`

- [ ] **Step 4: Adicionar `listBoardCards` ao port**

Em `src/application/task/ports/external-card-provider.ts`:

```typescript
export type ExternalCardProvider = {
	fetchCard(cardId: string): Promise<ExternalCard>;
	fetchCardColumn(cardId: string): Promise<{ columnLabel: string } | null>;
	listBoardCards(): Promise<{ externalId: string; columnLabel: string }[]>;
};
```

- [ ] **Step 5: Implementar no adapter**

Ajuste a URL abaixo para o endpoint confirmado no Step 1. Adicione ao final de `src/infrastructure/task/businessmap-card-provider.ts`, dentro do objeto `businessmapCardProvider`:

```typescript
	async listBoardCards(): Promise<
		{ externalId: string; columnLabel: string }[]
	> {
		const headers = authHeaders();
		const url = baseUrl();
		const boardId = process.env.BUSINESSMAP_BOARD_ID;
		if (!boardId) {
			throw new Error("BUSINESSMAP_BOARD_ID não configurado");
		}
		const cards = await getJson<BusinessmapCard[]>(
			`${url}/cards?board_ids[]=${boardId}`,
			headers,
		);
		const columnsById = await fetchColumnsById(Number(boardId), headers, url);
		return cards.map((card) => ({
			externalId: String(card.card_id),
			columnLabel: columnLabel(card.column_id, columnsById),
		}));
	},
```

- [ ] **Step 6: Rodar os testes e confirmar que passam**

Run: `npx vitest run src/infrastructure/task/businessmap-card-provider.test.ts`
Expected: PASS (6 testes: os 4 já existentes + os 2 novos).

- [ ] **Step 7: Adicionar `BUSINESSMAP_BOARD_ID` ao `.env.example`**

```
BUSINESSMAP_COMPANY_NAME=
BUSINESSMAP_API_KEY=
BUSINESSMAP_BOARD_ID=
```

- [ ] **Step 8: Checar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 9: Commit**

```bash
git add src/application/task/ports/external-card-provider.ts \
  src/infrastructure/task/businessmap-card-provider.ts \
  src/infrastructure/task/businessmap-card-provider.test.ts \
  src/infrastructure/task/__fixtures__/businessmap-board-108-cards.json \
  .env.example \
  docs/superpowers/plans/2026-07-23-sincronizacao-businessmap.md
git commit -m "feat: adiciona listBoardCards ao provider do Businessmap"
```

---

### Task 4: Use-case `diffColumnWithBusinessmap`

**Files:**
- Modify: `src/application/task/use-cases/test-helpers/create-fake-external-card-provider.ts`
- Create: `src/application/task/use-cases/diff-column-with-businessmap.ts`
- Test: `src/application/task/use-cases/diff-column-with-businessmap.test.ts`

**Interfaces:**
- Consome: `ExternalCardProvider.listBoardCards` (Task 3), `matchExternalStatus`.
- Produz: tipo `ColumnDiffResult` e função `diffColumnWithBusinessmap(provider, status, localExternalIds): Promise<ColumnDiffResult>` — consumidos pela Task 5 e Task 6.

- [ ] **Step 1: Adicionar `seedBoardCards` ao fake provider**

Substitua o conteúdo de `src/application/task/use-cases/test-helpers/create-fake-external-card-provider.ts` por:

```typescript
import type {
	ExternalCard,
	ExternalCardProvider,
} from "@/application/task/ports/external-card-provider";

export type FakeExternalCardProvider = ExternalCardProvider & {
	seed(cardId: string, card: ExternalCard): void;
	seedColumn(cardId: string, column: { columnLabel: string }): void;
	seedBoardCards(cards: { externalId: string; columnLabel: string }[]): void;
};

export function createFakeExternalCardProvider(): FakeExternalCardProvider {
	const cards = new Map<string, ExternalCard>();
	const columns = new Map<string, { columnLabel: string }>();
	let boardCards: { externalId: string; columnLabel: string }[] = [];
	return {
		seed(cardId, card) {
			cards.set(cardId, card);
		},
		seedColumn(cardId, column) {
			columns.set(cardId, column);
		},
		seedBoardCards(cardsToSeed) {
			boardCards = cardsToSeed;
		},
		async fetchCard(cardId) {
			const card = cards.get(cardId);
			if (!card)
				throw new Error(`Card ${cardId} não encontrado no fake provider`);
			return card;
		},
		async fetchCardColumn(cardId) {
			return columns.get(cardId) ?? null;
		},
		async listBoardCards() {
			return boardCards;
		},
	};
}
```

- [ ] **Step 2: Escrever o teste**

```typescript
// src/application/task/use-cases/diff-column-with-businessmap.test.ts
import { describe, expect, it } from "vitest";
import { createFakeExternalCardProvider } from "./test-helpers/create-fake-external-card-provider";
import { diffColumnWithBusinessmap } from "./diff-column-with-businessmap";

describe("diffColumnWithBusinessmap", () => {
	it("separa ids batendo, só locais e só no Businessmap para o status pedido", async () => {
		const provider = createFakeExternalCardProvider();
		provider.seedBoardCards([
			{ externalId: "1", columnLabel: "Desenvolvimento.Em Andamento" },
			{ externalId: "2", columnLabel: "Desenvolvimento.Em Andamento" },
			{ externalId: "3", columnLabel: "Testes.Para Testar" },
		]);

		const result = await diffColumnWithBusinessmap(
			provider,
			"IN_DEVELOPMENT",
			["1", "4"],
		);

		expect(result).toEqual({
			matched: ["1"],
			onlyLocal: ["4"],
			onlyBusinessmap: ["2"],
		});
	});

	it("ignora cards do Businessmap cuja coluna não mapeia para nenhum status", async () => {
		const provider = createFakeExternalCardProvider();
		provider.seedBoardCards([
			{ externalId: "1", columnLabel: "Refinamento.Refinamento Técnico" },
		]);

		const result = await diffColumnWithBusinessmap(provider, "TODO", []);

		expect(result).toEqual({ matched: [], onlyLocal: [], onlyBusinessmap: [] });
	});

	it("retorna tudo batendo quando as listas são idênticas", async () => {
		const provider = createFakeExternalCardProvider();
		provider.seedBoardCards([
			{ externalId: "1", columnLabel: "Backlog" },
			{ externalId: "2", columnLabel: "Card created" },
		]);

		const result = await diffColumnWithBusinessmap(provider, "TODO", [
			"1",
			"2",
		]);

		expect(result).toEqual({
			matched: ["1", "2"],
			onlyLocal: [],
			onlyBusinessmap: [],
		});
	});
});
```

- [ ] **Step 3: Rodar o teste e confirmar que falha**

Run: `npx vitest run src/application/task/use-cases/diff-column-with-businessmap.test.ts`
Expected: FAIL — `Cannot find module './diff-column-with-businessmap'`

- [ ] **Step 4: Implementar**

```typescript
// src/application/task/use-cases/diff-column-with-businessmap.ts
import { matchExternalStatus } from "@/application/task/match-external-status";
import type { ExternalCardProvider } from "@/application/task/ports/external-card-provider";
import type { TaskStatus } from "@/domain/task/entities/task";

export type ColumnDiffResult = {
	matched: string[];
	onlyLocal: string[];
	onlyBusinessmap: string[];
};

export async function diffColumnWithBusinessmap(
	provider: ExternalCardProvider,
	status: TaskStatus,
	localExternalIds: string[],
): Promise<ColumnDiffResult> {
	const boardCards = await provider.listBoardCards();
	const businessmapIds = new Set(
		boardCards
			.filter((card) => matchExternalStatus(card.columnLabel) === status)
			.map((card) => card.externalId),
	);
	const localIds = new Set(localExternalIds);

	const matched: string[] = [];
	const onlyLocal: string[] = [];
	for (const id of localIds) {
		if (businessmapIds.has(id)) {
			matched.push(id);
		} else {
			onlyLocal.push(id);
		}
	}
	const onlyBusinessmap = [...businessmapIds].filter((id) => !localIds.has(id));

	return { matched, onlyLocal, onlyBusinessmap };
}
```

- [ ] **Step 5: Rodar o teste e confirmar que passa**

Run: `npx vitest run src/application/task/use-cases/diff-column-with-businessmap.test.ts`
Expected: PASS (3 testes)

- [ ] **Step 6: Rodar a suíte inteira**

Run: `npx vitest run`
Expected: PASS (todos os testes, incluindo os pré-existentes).

- [ ] **Step 7: Commit**

```bash
git add src/application/task/use-cases/test-helpers/create-fake-external-card-provider.ts \
  src/application/task/use-cases/diff-column-with-businessmap.ts \
  src/application/task/use-cases/diff-column-with-businessmap.test.ts
git commit -m "feat: adiciona use-case diffColumnWithBusinessmap"
```

---

### Task 5: Composição (DI)

**Files:**
- Modify: `src/composition/task.ts`

**Interfaces:**
- Consome: `checkCardSync` (Task 2), `diffColumnWithBusinessmap` (Task 4), `businessmapCardProvider` (já existente).
- Produz: `createTaskUseCases().checkCardSync(externalId, localStatus)` e `createTaskUseCases().diffColumnWithBusinessmap(status, localExternalIds)` — consumidos pela Task 6.

- [ ] **Step 1: Adicionar os imports**

No topo de `src/composition/task.ts`, junto aos demais imports de `@/application/task/use-cases`, em ordem alfabética:

```typescript
import { checkCardSync } from "@/application/task/use-cases/check-card-sync";
import { diffColumnWithBusinessmap } from "@/application/task/use-cases/diff-column-with-businessmap";
```

- [ ] **Step 2: Adicionar os dois métodos na fábrica**

Dentro do objeto retornado por `createTaskUseCases()`, logo após `importCard`:

```typescript
			checkCardSync: (externalId: string, localStatus: TaskStatus) =>
				checkCardSync(businessmapCardProvider, externalId, localStatus),
			diffColumnWithBusinessmap: (
				status: TaskStatus,
				localExternalIds: string[],
			) =>
				diffColumnWithBusinessmap(
					businessmapCardProvider,
					status,
					localExternalIds,
				),
```

- [ ] **Step 3: Checar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros novos relacionados a `src/composition/task.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/composition/task.ts
git commit -m "feat: expõe checkCardSync e diffColumnWithBusinessmap na composição de task"
```

---

### Task 6: Server actions

**Files:**
- Create: `src/app/board/businessmap-sync-actions.ts`

**Interfaces:**
- Consome: `createTaskUseCases()` (Task 5), `CardSyncResult` (Task 2), `ColumnDiffResult` (Task 4).
- Produz: `checkCardSyncAction(externalId, localStatus): Promise<CheckCardSyncActionResult>` e `diffColumnAction(status, localExternalIds): Promise<DiffColumnActionResult>` — consumidos pelas Tasks 7 e 8.

- [ ] **Step 1: Implementar**

```typescript
// src/app/board/businessmap-sync-actions.ts
"use server";

import type { CardSyncResult } from "@/application/task/use-cases/check-card-sync";
import type { ColumnDiffResult } from "@/application/task/use-cases/diff-column-with-businessmap";
import { ApplicationError } from "@/application/shared/application-error";
import type { TaskStatus } from "@/domain/task/entities/task";
import { createTaskUseCases } from "@/composition/task";

function toErrorMessage(error: unknown): string {
	if (error instanceof ApplicationError) return error.message;
	console.error(error);
	return "Não foi possível concluir a operação";
}

export type CheckCardSyncActionResult =
	| { error: string; sync?: undefined }
	| { error: null; sync: CardSyncResult };

export async function checkCardSyncAction(
	externalId: string,
	localStatus: TaskStatus,
): Promise<CheckCardSyncActionResult> {
	try {
		const sync = await createTaskUseCases().checkCardSync(
			externalId,
			localStatus,
		);
		return { error: null, sync };
	} catch (error) {
		return { error: toErrorMessage(error) };
	}
}

export type DiffColumnActionResult =
	| { error: string; diff?: undefined }
	| { error: null; diff: ColumnDiffResult };

export async function diffColumnAction(
	status: TaskStatus,
	localExternalIds: string[],
): Promise<DiffColumnActionResult> {
	try {
		const diff = await createTaskUseCases().diffColumnWithBusinessmap(
			status,
			localExternalIds,
		);
		return { error: null, diff };
	} catch (error) {
		return { error: toErrorMessage(error) };
	}
}
```

- [ ] **Step 2: Checar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/app/board/businessmap-sync-actions.ts
git commit -m "feat: adiciona server actions de checagem de sincronia com o Businessmap"
```

---

### Task 7: Ícone de sync no card

**Files:**
- Create: `src/presentation/task/card-sync-badge.tsx`
- Modify: `src/presentation/task/task-card.tsx`
- Modify: `src/presentation/task/kanban-board.tsx`
- Modify: `src/app/board/page.tsx`

**Interfaces:**
- Consome: `checkCardSyncAction` (Task 6), `STATUS_LABELS` (`@/presentation/task/task-status-labels`, já existente).
- Produz: componente `CardSyncBadge` — consumido dentro de `TaskCard`.

- [ ] **Step 1: Implementar o componente**

```tsx
// src/presentation/task/card-sync-badge.tsx
"use client";

import {
	AlertTriangle,
	CheckCircle2,
	CircleHelp,
	CircleX,
	RefreshCw,
} from "lucide-react";
import { useState } from "react";
import type { CheckCardSyncActionResult } from "@/app/board/businessmap-sync-actions";
import type { TaskStatus } from "@/domain/task/entities/task";
import { STATUS_LABELS } from "@/presentation/task/task-status-labels";

type CardSyncBadgeProps = {
	externalId: string;
	status: TaskStatus;
	checkCardSyncAction: (
		externalId: string,
		localStatus: TaskStatus,
	) => Promise<CheckCardSyncActionResult>;
};

export function CardSyncBadge({
	externalId,
	status,
	checkCardSyncAction,
}: CardSyncBadgeProps) {
	const [pending, setPending] = useState(false);
	const [result, setResult] = useState<CheckCardSyncActionResult | null>(
		null,
	);

	async function handleCheck() {
		setPending(true);
		try {
			const response = await checkCardSyncAction(externalId, status);
			setResult(response);
		} finally {
			setPending(false);
		}
	}

	if (pending) {
		return (
			<RefreshCw
				size={14}
				className="animate-spin opacity-50"
				aria-label="Verificando Businessmap..."
			/>
		);
	}

	let icon = (
		<RefreshCw size={14} aria-hidden="true" />
	);
	let title = "Verificar Businessmap";

	if (result) {
		if (result.error) {
			icon = <CircleX size={14} className="text-(--critical)" aria-hidden="true" />;
			title = result.error;
		} else if (!result.sync.found) {
			icon = <CircleX size={14} className="text-(--critical)" aria-hidden="true" />;
			title = "Card não encontrado no Businessmap";
		} else if (result.sync.businessmapStatus === null) {
			icon = <CircleHelp size={14} className="opacity-50" aria-hidden="true" />;
			title = `Businessmap: "${result.sync.businessmapColumnLabel}" (coluna não mapeada)`;
		} else if (result.sync.inSync) {
			icon = <CheckCircle2 size={14} className="text-(--accent)" aria-hidden="true" />;
			title = "Em sincronia com o Businessmap";
		} else {
			icon = <AlertTriangle size={14} className="text-(--warn)" aria-hidden="true" />;
			title = `Businessmap: "${result.sync.businessmapColumnLabel}" → ${STATUS_LABELS[result.sync.businessmapStatus]}`;
		}
	}

	return (
		<button
			type="button"
			onClick={handleCheck}
			title={title}
			aria-label={title}
			className="rounded-lg border border-(--border) p-1.5"
		>
			{icon}
		</button>
	);
}
```

- [ ] **Step 2: Ligar ao `TaskCard`**

Em `src/presentation/task/task-card.tsx`, adicione o import (ordem alfabética, junto aos demais de `@/presentation/task`):

```typescript
import { CardSyncBadge } from "@/presentation/task/card-sync-badge";
```

Adicione a prop ao tipo `TaskCardProps` (junto às demais actions):

```typescript
	checkCardSyncAction: (
		externalId: string,
		localStatus: TaskStatus,
	) => Promise<import("@/app/board/businessmap-sync-actions").CheckCardSyncActionResult>;
```

Desestruture a prop na assinatura de `TaskCard` e renderize o badge dentro do `<div className="flex items-start justify-between gap-2">`, antes do `<TaskFormModal mode="edit" ... />`:

```tsx
			<div className="flex items-start justify-between gap-2">
				<span className="font-mono text-xs opacity-70">{task.externalId}</span>
				<div className="flex items-center gap-1">
					<CardSyncBadge
						externalId={task.externalId}
						status={task.status}
						checkCardSyncAction={checkCardSyncAction}
					/>
					<TaskFormModal
						mode="edit"
						task={task}
						taskTypes={taskTypes}
						members={members}
						teamTasks={teamTasks}
						tags={tags}
						sprints={sprints}
						initialTagIds={task.tags.map((tag) => tag.id)}
						updateTaskAction={updateTaskAction}
						deleteTaskAction={deleteTaskAction}
						toggleBlockedAction={toggleBlockedAction}
					/>
				</div>
			</div>
```

- [ ] **Step 3: Propagar a prop por `kanban-board.tsx`**

Em `src/presentation/task/kanban-board.tsx`, adicione o tipo da prop em `KanbanBoardProps` (junto às demais):

```typescript
	checkCardSyncAction: (
		externalId: string,
		localStatus: TaskStatus,
	) => Promise<import("@/app/board/businessmap-sync-actions").CheckCardSyncActionResult>;
```

Desestruture na assinatura de `KanbanBoard` e passe para cada `<TaskCard ... />`:

```tsx
							<TaskCard
								key={task.id}
								task={task}
								taskType={taskTypesById.get(task.typeId)}
								assignee={
									task.assigneeId ? membersById.get(task.assigneeId) : undefined
								}
								taskTypes={taskTypes}
								tags={tags}
								sprints={sprints}
								members={members}
								teamTasks={teamTasks}
								updateTaskAction={updateTaskAction}
								deleteTaskAction={deleteTaskAction}
								moveTaskAction={moveTaskAction}
								toggleBlockedAction={toggleBlockedAction}
								checkCardSyncAction={checkCardSyncAction}
							/>
```

- [ ] **Step 4: Passar a action em `board/page.tsx`**

Adicione o import:

```typescript
import { checkCardSyncAction } from "@/app/board/businessmap-sync-actions";
```

E a prop na chamada de `<KanbanBoard ... />`:

```tsx
			checkCardSyncAction={checkCardSyncAction}
```

- [ ] **Step 5: Checar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 6: Commit**

```bash
git add src/presentation/task/card-sync-badge.tsx \
  src/presentation/task/task-card.tsx \
  src/presentation/task/kanban-board.tsx \
  src/app/board/page.tsx
git commit -m "feat: adiciona icone de sincronia com Businessmap no card"
```

---

### Task 8: Diff por coluna

**Files:**
- Create: `src/presentation/task/column-sync-modal.tsx`
- Modify: `src/presentation/task/kanban-board.tsx`
- Modify: `src/app/board/page.tsx`

**Interfaces:**
- Consome: `diffColumnAction` (Task 6), `Modal` (`@/presentation/shared/modal`, já existente), `STATUS_LABELS`.
- Produz: componente `ColumnSyncModal` — consumido dentro de `KanbanBoard`.

- [ ] **Step 1: Implementar o componente**

```tsx
// src/presentation/task/column-sync-modal.tsx
"use client";

import { GitCompare } from "lucide-react";
import { useState } from "react";
import type { DiffColumnActionResult } from "@/app/board/businessmap-sync-actions";
import type { TaskStatus } from "@/domain/task/entities/task";
import { Modal } from "@/presentation/shared/modal";
import { STATUS_LABELS } from "@/presentation/task/task-status-labels";

type ColumnSyncModalProps = {
	status: TaskStatus;
	localExternalIds: string[];
	diffColumnAction: (
		status: TaskStatus,
		localExternalIds: string[],
	) => Promise<DiffColumnActionResult>;
};

export function ColumnSyncModal({
	status,
	localExternalIds,
	diffColumnAction,
}: ColumnSyncModalProps) {
	const [open, setOpen] = useState(false);
	const [pending, setPending] = useState(false);
	const [result, setResult] = useState<DiffColumnActionResult | null>(null);

	async function handleOpen() {
		setOpen(true);
		setPending(true);
		setResult(null);
		const response = await diffColumnAction(status, localExternalIds);
		setResult(response);
		setPending(false);
	}

	return (
		<>
			<button
				type="button"
				onClick={handleOpen}
				aria-label={`Comparar coluna ${STATUS_LABELS[status]} com o Businessmap`}
				className="rounded-lg p-1 opacity-70 hover:opacity-100"
			>
				<GitCompare size={14} aria-hidden="true" />
			</button>
			{open ? (
				<Modal
					label={`Comparar "${STATUS_LABELS[status]}" com o Businessmap`}
					size="md"
					onClose={() => setOpen(false)}
				>
					<div className="flex flex-col gap-4">
						{pending ? <p className="text-sm opacity-70">Buscando...</p> : null}
						{!pending && result?.error ? (
							<p role="alert">{result.error}</p>
						) : null}
						{!pending && result?.diff ? (
							<>
								<div>
									<p className="text-sm font-semibold text-(--critical)">
										Só aqui ({result.diff.onlyLocal.length})
									</p>
									<p className="text-sm">
										{result.diff.onlyLocal.join(", ") || "—"}
									</p>
								</div>
								<div>
									<p className="text-sm font-semibold text-(--warn)">
										Só no Businessmap ({result.diff.onlyBusinessmap.length})
									</p>
									<p className="text-sm">
										{result.diff.onlyBusinessmap.join(", ") || "—"}
									</p>
								</div>
								<details>
									<summary className="cursor-pointer text-sm opacity-70">
										Batendo ({result.diff.matched.length})
									</summary>
									<p className="text-sm">
										{result.diff.matched.join(", ") || "—"}
									</p>
								</details>
							</>
						) : null}
					</div>
				</Modal>
			) : null}
		</>
	);
}
```

- [ ] **Step 2: Ligar ao cabeçalho de cada coluna em `kanban-board.tsx`**

Adicione o import (ordem alfabética):

```typescript
import { ColumnSyncModal } from "@/presentation/task/column-sync-modal";
```

Adicione o tipo da prop em `KanbanBoardProps`:

```typescript
	diffColumnAction: (
		status: TaskStatus,
		localExternalIds: string[],
	) => Promise<import("@/app/board/businessmap-sync-actions").DiffColumnActionResult>;
```

Desestruture na assinatura de `KanbanBoard`. Substitua o `<h2>` do cabeçalho de cada coluna:

```tsx
						<h2 className="text-sm font-semibold text-balance opacity-70">
							{STATUS_LABELS[status]} ({tasksByStatus[status].length})
						</h2>
```

por:

```tsx
						<div className="flex items-center justify-between gap-2">
							<h2 className="text-sm font-semibold text-balance opacity-70">
								{STATUS_LABELS[status]} ({tasksByStatus[status].length})
							</h2>
							<ColumnSyncModal
								status={status}
								localExternalIds={tasksByStatus[status].map(
									(task) => task.externalId,
								)}
								diffColumnAction={diffColumnAction}
							/>
						</div>
```

- [ ] **Step 3: Passar a action em `board/page.tsx`**

Adicione ao import já existente de `@/app/board/businessmap-sync-actions`:

```typescript
import {
	checkCardSyncAction,
	diffColumnAction,
} from "@/app/board/businessmap-sync-actions";
```

E a prop na chamada de `<KanbanBoard ... />`:

```tsx
			diffColumnAction={diffColumnAction}
```

- [ ] **Step 4: Checar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add src/presentation/task/column-sync-modal.tsx \
  src/presentation/task/kanban-board.tsx \
  src/app/board/page.tsx
git commit -m "feat: adiciona comparacao de coluna com o Businessmap"
```

---

### Task 9: Verificação final

**Files:** nenhum (só validação)

- [ ] **Step 1: Rodar toda a suíte de testes**

Run: `npx vitest run`
Expected: PASS (todos os testes, incluindo os novos das Tasks 1–4).

- [ ] **Step 2: Checar tipos e lint**

Run: `npx tsc --noEmit && npx biome check src/`
Expected: sem erros.

- [ ] **Step 3: Testar manualmente**

Suba o app (`npm run dev`), configure `BUSINESSMAP_BOARD_ID=108` no `.env` local, abra `/board`:
- Clique no ícone de sync de um card com `externalId` real do Businessmap (ex: `415931`, se existir localmente) e confira o resultado (verde/âmbar/cinza/vermelho).
- Clique no ícone de sync de um card com `externalId` que não existe no Businessmap (ex: `TASK-1`) e confira que aparece o ícone vermelho de "não encontrado", sem quebrar a tela.
- Clique no ícone de comparação de uma coluna e confira as três listas (só aqui / só no Businessmap / batendo).
- Remova temporariamente `BUSINESSMAP_BOARD_ID` do `.env` e confirme que o modal de coluna mostra o erro de forma amigável.

- [ ] **Step 4: Commit (se algum ajuste manual foi necessário)**

```bash
git add -A
git commit -m "fix: ajustes finais na sincronizacao com Businessmap"
```

---

## Self-Review

**Cobertura do spec do usuário:**
- Ícone por card checando estado atual vs local → Task 7 (`CardSyncBadge`) + Task 2 (`checkCardSync`) + Task 1 (`fetchCardColumn`).
- Mesma regra de mapeamento da importação → `matchExternalStatus` reaproveitado sem alterações em ambos os use-cases novos.
- Diff por coluna (ids daqui vs ids de lá, sobra de um lado ou do outro) → Task 8 (`ColumnSyncModal`) + Task 4 (`diffColumnWithBusinessmap`) + Task 3 (`listBoardCards`).
- Objetivo "manter o board atualizado" → checagem sob demanda, sem escrita automática (fora de escopo, documentado na spec).

**Placeholders:** a Task 3 contém uma etapa de descoberta real de API (Step 1) porque o contrato de listagem de cards por board não está confirmado — mesmo padrão já usado neste projeto (ver preâmbulo de `docs/superpowers/plans/2026-07-23-importar-card-businessmap.md`). Todo o resto do plano tem código completo.

**Consistência de tipos:** `CardSyncResult` (Task 2) é o mesmo tipo usado em `checkCardSyncAction` (Task 6) e em `CardSyncBadge` (Task 7). `ColumnDiffResult` (Task 4) é o mesmo tipo usado em `diffColumnAction` (Task 6) e em `ColumnSyncModal` (Task 8). `ExternalCardProvider.fetchCardColumn`/`listBoardCards` (Tasks 1 e 3) têm a mesma assinatura no port, no fake e no adapter real.
