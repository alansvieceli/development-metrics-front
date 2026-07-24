# Sincronização com Businessmap — Design

## Contexto

Hoje o board local só recebe dados do Businessmap na importação (`previewCardImport`/`createHistoricalTask`, ver `docs/superpowers/plans/2026-07-23-importar-card-businessmap.md`). Depois disso, o card local e o card do Businessmap podem divergir silenciosamente: alguém move o card lá e ninguém atualiza aqui (ou vice-versa). Não existe hoje nenhuma forma de detectar essa divergência.

## Objetivo

Detectar drift entre o board local e o Businessmap, em dois níveis:

1. **Por card:** um ícone no card que checa se a coluna atual dele no Businessmap mapeia para o mesmo `TaskStatus` da coluna onde ele está localmente.
2. **Por coluna:** um ícone no cabeçalho de cada coluna que compara a lista de `externalId` dos cards locais daquela coluna com a lista de cards que o Businessmap tem atualmente mapeados para o mesmo `TaskStatus`, mostrando o que sobra de um lado ou do outro.

Ambos reaproveitam a mesma regra de mapeamento de coluna → `TaskStatus` já usada na importação (`matchExternalStatus`, `STATUS_ALIASES`) — nenhuma regra nova é criada.

**Fora de escopo:** correção automática (o board nunca escreve de volta no Businessmap nem se autocorrige), cache ou polling em background, histórico de divergências. É uma checagem pontual, sob demanda.

## Arquitetura

### Port estendido — `src/application/task/ports/external-card-provider.ts`

Dois métodos novos além do `fetchCard` já existente:

```ts
export type ExternalCardProvider = {
	fetchCard(cardId: string): Promise<ExternalCard>; // já existe, sem mudanças

	fetchCardColumn(cardId: string): Promise<{ columnLabel: string } | null>;
	// null = card não encontrado no Businessmap (404)

	listBoardCards(): Promise<{ externalId: string; columnLabel: string }[]>;
	// todos os cards do board configurado em BUSINESSMAP_BOARD_ID
};
```

`fetchCardColumn` é deliberadamente mais leve que `fetchCard`: apenas `GET /cards/{id}` + `GET /boards/{board_id}/columns` (2 chamadas), sem reconstruir histórico via revisões — só precisamos saber onde o card está agora.

`listBoardCards` retorna dados crus (id + label da coluna), sem nenhuma tradução para `TaskStatus` — a tradução é responsabilidade da camada de aplicação, mantendo a mesma separação já usada em `previewCardImport`.

### Use-case 1 — `checkCardSync`

`src/application/task/use-cases/check-card-sync.ts`

```ts
export type CardSyncResult =
	| { found: false }
	| {
			found: true;
			businessmapColumnLabel: string;
			businessmapStatus: TaskStatus | null; // null = coluna não mapeável
			inSync: boolean; // businessmapStatus === localStatus
	  };

checkCardSync(
	provider: ExternalCardProvider,
	externalId: string,
	localStatus: TaskStatus,
): Promise<CardSyncResult>
```

Recebe `externalId` e `localStatus` diretamente (já disponíveis no client via o `Task` renderizado) — sem round-trip ao `TaskRepository`. Chama `provider.fetchCardColumn`, traduz com `matchExternalStatus`, compara.

### Use-case 2 — `diffColumnWithBusinessmap`

`src/application/task/use-cases/diff-column-with-businessmap.ts`

```ts
export type ColumnDiffResult = {
	matched: string[];
	onlyLocal: string[];
	onlyBusinessmap: string[];
};

diffColumnWithBusinessmap(
	provider: ExternalCardProvider,
	status: TaskStatus,
	localExternalIds: string[],
): Promise<ColumnDiffResult>
```

Recebe `status` e a lista de `externalId` locais dessa coluna (já disponíveis no client, sem round-trip ao repositório). Chama `provider.listBoardCards()`, traduz a `columnLabel` de cada card com `matchExternalStatus`, filtra os que caem no `status` pedido, e faz diferença de conjuntos contra os ids locais.

**Nota de escala (ponytail):** busca todos os cards do board a cada clique de diff, mesmo que só um `status` seja pedido — simples e correto para um board de dezenas de cards. Se o board crescer para milhares de cards, considerar filtrar a busca por `column_id` na infra antes de retornar. Não implementar agora — não há sinal de que o board tenha esse volume.

### Infra — `src/infrastructure/task/businessmap-card-provider.ts`

- `fetchCardColumn`: reaproveita o helper `columnLabel()` já existente no arquivo. Se `GET /cards/{id}` retornar 404, retorna `null` em vez de lançar.
- `listBoardCards`: usa `BUSINESSMAP_BOARD_ID` (env var nova) + `GET /boards/{board_id}/columns` (já usado) + endpoint de listagem de cards do board.
  - **Contrato do endpoint de listagem ainda não verificado.** Sabemos, pelo comportamento do MCP `businessmap-cards` (`search_cards` aceita `board_names`/`column_names`), que a plataforma suporta esse filtro, mas o formato exato da API v2 crua (`GET /cards?...`) precisa ser confirmado via curl antes de implementar — mesmo padrão da Task 1 do plano de importação (que descobriu que a API v2 não tinha endpoint de histórico pronto e mudou o design em cima disso).

### Composição — `src/composition/task.ts`

Dois métodos novos em `createTaskUseCases()`:
```ts
checkCardSync: (externalId: string, localStatus: TaskStatus) =>
	checkCardSync(businessmapCardProvider, externalId, localStatus),
diffColumnWithBusinessmap: (status: TaskStatus, localExternalIds: string[]) =>
	diffColumnWithBusinessmap(businessmapCardProvider, status, localExternalIds),
```

### Server actions — `src/app/board/businessmap-sync-actions.ts` (novo arquivo)

Módulo separado de `import-card-actions.ts` porque é uma responsabilidade distinta (leitura/comparação, não criação).

```ts
checkCardSyncAction(externalId: string, localStatus: TaskStatus): Promise<CheckCardSyncActionResult>
diffColumnAction(status: TaskStatus, localExternalIds: string[]): Promise<DiffColumnActionResult>
```

Seguem o mesmo padrão `toActionState`/`ApplicationError` de `import-card-actions.ts`. Nenhuma chama `revalidatePath` — são leituras, não alteram o board.

## UI

### Ícone de sync no card (`src/presentation/task/task-card.tsx`)

Botão pequeno ao lado do ícone de editar (`Pencil`), estado inicial neutro:
- Neutro: `RefreshCw` cinza, `aria-label="Verificar Businessmap"`.
- Ao clicar: estado de carregamento (spinner ou opacidade reduzida), chama `checkCardSyncAction`.
- Resultado vira ícone colorido com `title` explicando:
  - `CheckCircle2` verde — `inSync: true`.
  - `AlertTriangle` âmbar — `inSync: false`, `title` mostra `Businessmap: "<businessmapColumnLabel>" → <STATUS_LABELS[businessmapStatus]>`.
  - `CircleHelp` cinza — `businessmapStatus: null` (coluna do BM não mapeia para nenhum status conhecido).
  - `CircleX` vermelho — `found: false` (card não encontrado; comum quando o `externalId` local não é um id real do Businessmap).

Sem cache: cada clique refaz a chamada, consistente com a decisão de ser sob demanda (nunca automático ao carregar o board).

### Diff por coluna (`src/presentation/task/kanban-board.tsx`)

Ícone pequeno (`GitCompare`) ao lado do contador `(N)` no cabeçalho de cada coluna (`<h2>` em `kanban-board.tsx`). Ao clicar, abre um `Modal` (`size="md"`, reaproveitando `@/presentation/shared/modal`) com três listas:

- **Só aqui** (`onlyLocal`) — vermelho, cards locais que o Businessmap não tem mapeados para esse status.
- **Só no Businessmap** (`onlyBusinessmap`) — âmbar, cards do Businessmap mapeados para esse status que não existem localmente.
- **Batendo** (`matched`) — verde, colapsada por padrão (`<details>`).

Erros (ex: `BUSINESSMAP_BOARD_ID` não configurado) aparecem como `<p role="alert">` dentro do modal, igual aos outros formulários do projeto.

## Erros tratados

- `BUSINESSMAP_BOARD_ID`/`BUSINESSMAP_COMPANY_NAME`/`BUSINESSMAP_API_KEY` ausentes → `ApplicationError`, vira alerta no modal/tooltip.
- Card não encontrado no Businessmap (404) → não é exceção, é resultado válido (`found: false`), tratado pelo ícone `CircleX`.
- Falha de rede/5xx → erro genérico, mesmo tratamento já usado nos outros formulários ("Não foi possível concluir a operação").

## Testes

Segue o padrão já estabelecido no projeto (TDD, Vitest):
- `check-card-sync.test.ts` e `diff-column-with-businessmap.test.ts` com fake provider (estendendo `create-fake-external-card-provider.ts` com `fetchCardColumn`/`listBoardCards`).
- Teste do adapter infra (`businessmap-card-provider.test.ts`, casos novos) com `fetch` mockado.
- Sem testes E2E de UI — não é o padrão do projeto.

## Variáveis de ambiente novas

```
BUSINESSMAP_BOARD_ID=
```

Adicionar a `.env.example`, seguindo o padrão de `BUSINESSMAP_COMPANY_NAME`/`BUSINESSMAP_API_KEY` já documentado.
