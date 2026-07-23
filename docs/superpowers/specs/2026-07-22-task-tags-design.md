# Design: Tarjas nos cards + filtro de tarja nas métricas

Data: 2026-07-22

## Contexto

Cada card (`Task`) precisa poder receber de 0 a 3 tarjas — marcadores livres definidos por um catálogo gerenciado (nome + cor), no mesmo espírito do que já existe para `TaskType` (`task-types` / `/task-types`). As tarjas passam a poder filtrar as métricas em `/metrics`, com até 2 tarjas selecionadas simultaneamente (semântica OR: aparece quem tem qualquer uma das selecionadas).

Internamente o código usa o termo em inglês `Tag` (consistente com `Task`, `TaskType`, `Member`); a UI mostra "Tarja"/"Tarjas" em português, como já acontece com outros termos do domínio.

Tarjas são um catálogo **global**, como `task_types` hoje (sem `teamId`).

## 1. Domínio e schema

`src/domain/task/entities/tag.ts` (novo, ao lado de `task-type.ts`):

```ts
export type Tag = { id: string; name: string; color: string };
```

`src/infrastructure/task/drizzle/schema.ts`:

- `tags` (`id uuid pk`, `name text not null`, `color text not null`) — mesmo shape de `taskTypes`, sem `isBug`.
- `task_tags` (join N:N): `task_id uuid` (FK `tasks.id`, `onDelete: cascade`), `tag_id uuid` (FK `tags.id`, `onDelete: restrict` — não deixa apagar tarja em uso), PK composta `(task_id, tag_id)`, e um **índice dedicado em `tag_id`** (`index("task_tags_tag_id_idx").on(table.tagId)`) — a PK composta já cobre "tarjas de uma task", mas não serve a consulta inversa "tasks com a tarja X", que é exatamente o que o filtro de métricas roda.

Migração gerada via `npm run db:generate` / aplicada via `npm run db:migrate`, seguindo o fluxo já usado no projeto.

Limite de 0–3 tarjas por task é uma regra de aplicação, não constraint de banco (é uma regra sobre o conjunto de linhas em `task_tags`, não sobre uma única linha — um `check` não alcança isso sem trigger, e o único caminho de escrita é a aplicação).

## 2. Application

`src/application/task/ports/tag-repository.ts` (novo, espelha `task-type-repository.ts`):

```ts
export type TagRepository = {
	create(name: string, color: string): Promise<Tag>;
	update(tagId: string, name: string, color: string): Promise<Tag>;
	delete(tagId: string): Promise<void>;
	listAll(): Promise<Tag[]>;
	findById(tagId: string): Promise<Tag | null>;
};
```

Casos de uso `create-tag.ts`, `update-tag.ts`, `delete-tag.ts`, `list-tags.ts` espelham `create-task-type.ts` etc.:

- `delete-tag.ts` bloqueia a exclusão se `TaskRepository.countByTag(tagId) > 0` — mesmo padrão de `delete-task-type.ts`, que usa `countByType` (uma checagem pontual, para o id sendo excluído).
- `list-tags.ts` marca `inUse` em lote pra cada tarja da lista usando `TaskRepository.listUsedTagIds()` — mesmo padrão de `list-task-types.ts`, que usa `listUsedTypeIds` (um `Set` construído uma vez, sem N chamadas de `countByType`).

`TaskRepository` (`src/application/task/ports/task-repository.ts`) ganha:

- `CreateTaskData` e `UpdateTaskData` ganham `tagIds: string[]`.
- `setTagsForTask(taskId: string, tagIds: string[]): Promise<void>` — substitui o conjunto de tarjas da task (delete + insert dentro da mesma transação de create/update).
- `listTagIdsForTasks(taskIds: string[]): Promise<Record<string, string[]>>` — só ids, sem juntar com o catálogo. `listTasksByTeam` já resolve `TaskType` a partir de ids desse jeito hoje (busca `typeRepository.listAll()` e cruza na própria use case pra calcular `bugChildCount`); tarja segue o mesmo padrão: `listTasksByTeam` passa a receber também `TagRepository` e faz `tagRepository.listAll()` + o cruzamento com `listTagIdsForTasks` pra montar `Tag[]` por task. Evita duplicar a resolução id→objeto em infra e em fake de teste.
- `countByTag(tagId: string): Promise<number>` e `listUsedTagIds(): Promise<string[]>` — mesmo papel de `countByType`/`listUsedTypeIds`.

Nova função `src/application/task/validate-tag-ids.ts` (`validateTagIds(tagRepository, tagIds)`) — rejeita mais de 3 ids e rejeita id que não existe no catálogo. Fica separada de `validate-task-references.ts` porque essa função hoje só é chamada por `create-task.ts`; `update-task.ts` faz suas próprias checagens inline (não usa `validateTaskReferences`) e `create-historical-task.ts` (criação de card retroativo) fica fora do escopo desta entrega — não ganha suporte a tarjas agora. `create-task.ts` e `update-task.ts` passam a chamar `validateTagIds` diretamente e a receber `tagIds` no input, repassando pro repositório.

### Filtro de métricas

`MetricsQueryPort.loadSnapshot` (`src/application/metrics/ports/metrics-query-port.ts`) ganha um parâmetro opcional `tagIds?: string[]`, na mesma posição de `assigneeId`.

`drizzle-metrics-query-port.ts`: cada uma das 4 queries do snapshot passa a filtrar (quando `tagIds` não for vazio) por `EXISTS (select 1 from task_tags where task_tags.task_id = tasks.id and task_tags.tag_id in (...))` — semântica OR nativa do `IN`. A query de bugs (`bugRows`) filtra pela tarja do **próprio card de bug** (`tasks.id`, a mesma tabela já usada como `FROM`), não pela tarja do parent — diferente do filtro de desenvolvedor atual, que usa `parentTasks.assigneeId`. Essa é uma escolha deliberada: o filtro de desenvolvedor atribui o bug a quem é dono do trabalho de origem, mas tarja é um atributo do próprio card, então cada query filtra pela tarja do card que ela está de fato contando.

`get-metrics-dashboard.ts` e `get-metrics-for-period.ts` passam `tagIds` adiante até `loadSnapshot`, sem lógica adicional (a filtragem já resolvida na query).

## 3. Presentation

### Gerenciamento do catálogo — `/tags`

Página nova `src/app/tags/page.tsx`, cópia estrutural de `src/app/task-types/page.tsx`: lista (`TagList`, cópia de `TaskTypeList` sem a coluna/flag de bug) + formulário (`TagForm`, cópia de `TaskTypeForm`). Botão de excluir desabilitado com tooltip quando `inUse` (sem o caso especial "não pode excluir o tipo Bug", que não existe pra tarja). Link de navegação adicionado onde já ficam os links pra `/task-types` hoje.

### Combobox de multi-select (`TagCombobox`)

Componente novo `src/presentation/task/tag-combobox.tsx` (client component), reaproveitado em dois lugares com `max` diferente:

- Chips das tarjas já selecionadas (nome + cor de fundo, botão "×" pra remover).
- Campo de texto que filtra o catálogo por nome (`toLowerCase().includes`) — sem chamada de rede, o catálogo completo (`Tag[]`) é passado por prop, já carregado no server component pai.
- Dropdown com as tarjas que batem o filtro e ainda não foram selecionadas (bolinha da cor + nome).
- Ao atingir `max`, o campo de busca desabilita e mostra "Máximo de N tarjas atingido".
- Validado interativamente com o usuário via mockup no companion visual antes de aprovar esta spec — comportamento aprovado: busca por texto, clique adiciona chip, trava sozinho no limite. Estilo final usa as classes Tailwind e variáveis (`--border`, `--surface`, `--accent`) já usadas em `TaskFormModal`/`PeriodFilter`, não as cores soltas do protótipo.

Uso 1 — `TaskFormModal` (`src/presentation/task/task-form-modal.tsx`): novo campo "Tarjas" com `<TagCombobox max={3} />`, alimentado pelas tarjas atuais da task (`mode: "edit"`) ou vazio (`mode: "create"`). Envia os ids selecionados como `tagIds` no `FormData` (múltiplos valores com o mesmo `name`, lidos com `formData.getAll("tagIds")`).

Uso 2 — filtro em `/metrics`: novo componente client `src/presentation/metrics-dashboard/tag-filter.tsx` (mesmo padrão de `DeveloperSelector`: lê/escreve `useSearchParams`/`router.push`), com `<TagCombobox max={2} />`, escrevendo o parâmetro `tags` como ids separados por vírgula. Posicionado ao lado do `PeriodFilter` no cabeçalho de `metrics-dashboard.tsx`.

### `TaskCard`

`src/presentation/task/task-card.tsx`: nova linha de pills coloridas (nome da tarja sobre a cor de fundo, texto branco, `rounded-full`), renderizada quando `task.tags.length > 0` — mesmo lugar/estilo visual do bloco de ícones de bug/link já existente (linha 105-118), mas acima dele.

`TaskWithStatusSince` (`list-tasks-by-team.ts`) ganha `tags: Tag[]`, populado por `TaskRepository.listTagsForTasks`.

### Parsing do filtro

`parse-metrics-search-params.ts`: `MetricsSearchParams` ganha `tags?: string`; nova função (ou extensão de `parseMetricsFilter`) que faz `split(",")`, remove vazios e trunca em 2 — sem gerar erro de validação, já que a UI (combobox travado em `max=2`) nunca produz mais que isso; um link manipulado com mais de 2 ids apenas usa os 2 primeiros.

## Fora do escopo

- Sem suporte a tarjas em `create-historical-task.ts` / `HistoricalTaskFormModal` (criação de card retroativo) — fica pra uma entrega futura, se necessário.
- Sem tela de gerenciamento de tarja por time — catálogo é global, como `task_types`.
- Sem filtro de tarja em `/metrics/developers` (fica só em `/metrics`, decisão explícita).
- Sem herança de tarja do parent pra tasks filhas (bug herda tipo `isBug` do próprio tipo, mas tarja é atribuída card a card, sem propagação automática).
- Sem constraint de banco para o limite de 3 — é regra de aplicação.
