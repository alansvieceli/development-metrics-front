# Design: Endurecimento do projeto

Data: 2026-07-18

Esta spec consolida a revisão técnica feita após a implementação inicial de times, Kanban e métricas. O trabalho será entregue em 12 mudanças coerentes distribuídas em cinco PRs, preservando Clean Architecture, DDD proporcional e o menor código que satisfaça segurança, integridade, acessibilidade e desempenho.

## Objetivo

Eliminar os riscos confirmados de uso do banco real em testes, entrada externa sem validação, divergência entre task e histórico, exclusões que deixam referências lógicas inválidas, dependência `presentation → app`, Promises não tratadas, modais sem semântica nativa, ausência de CI e consultas repetidas no dashboard.

## Fora de escopo

- autenticação e autorização por usuário;
- exclusão em cascata de times ou membros;
- FKs entre os contextos `team` e `task`;
- biblioteca externa de validação, modal, toast ou injeção de dependência;
- histórico de WIP por período;
- cache ou tabelas pré-agregadas de métricas;
- configuração de branch protection do GitHub, que permanece uma ação administrativa externa ao repositório.

## Restrições globais

- Seguir `techdocs/guidelines.md` e `techdocs/architecture.md` em todas as tarefas.
- Localizar todos os chamadores antes de remover ou alterar uma interface.
- Escrever primeiro o menor teste que falha pelo motivo esperado.
- Não adicionar dependências.
- Usar APIs nativas de JavaScript, React, Next.js, Postgres e Drizzle já disponíveis.
- Manter ORM, SQL e tipos do Drizzle em `infrastructure`.
- Manter regras de negócio e autorização definitiva em `application`; `app` apenas valida a forma da entrada, resolve contexto da requisição, converte erros e chama casos de uso.
- Executar testes focados por tarefa e, ao fechar cada PR, TypeScript, Biome, Knip, Vitest, build e Playwright.
- Aplicar migrações em banco `_test` criado do zero nos PRs que alterarem schema ou infraestrutura de banco.
- Cada uma das 12 tarefas gera um commit coerente no formato definido pelo projeto.

## Estratégias consideradas

### Uma spec e um plano para cinco PRs — escolhida

Mantém as dependências entre segurança, integridade, UI, CI e desempenho visíveis em um único lugar, sem misturar as mudanças nos commits. É a opção que atende ao pedido de um artefato de design e um plano de execução.

### Cinco specs e cinco planos

Isolaria cada PR, mas repetiria restrições, contratos e contexto. O custo documental não melhora a implementação deste repositório pequeno.

### Corrigir somente riscos críticos agora

Reduziria o primeiro lote, mas deixaria problemas já confirmados de arquitetura, acessibilidade e consultas. Foi descartada porque o escopo completo já foi aprovado.

## Arquitetura da solução

### Validação compartilhada

Validações pequenas ficam em funções puras, sem Zod:

- `isUuid(value: unknown): value is string` reconhece o formato canônico de UUID usado pelo projeto;
- `parseDateOnly(value: unknown): Date | null` reconhece `YYYY-MM-DD`, constrói em UTC e rejeita normalizações como `2026-02-31`;
- `TASK_STATUSES` e `isTaskStatus(value: unknown)` ficam junto de `TaskStatus` no domínio de task.

`parseDateOnly` será reutilizada pelo filtro de métricas e pela validação de `dueDate`. Não haverá Value Object enquanto a data não possuir comportamento de domínio adicional.

### Erros esperados

Regras de aplicação que podem falhar por entrada ou estado conhecido lançam `ApplicationError`, com mensagem segura para o usuário. Erros de infraestrutura permanecem erros inesperados.

Na borda, Server Actions convertem somente `ApplicationError` para:

```ts
export type ActionState = { error: string | null };
```

Erros inesperados retornam uma mensagem genérica e são registrados no servidor. Formulários usam `useActionState`; controles imperativos aguardam a Promise, tratam o resultado e sempre restauram `pending` em `finally`. Nenhuma mensagem crua de Postgres, Drizzle ou stack trace chega ao cliente.

### Contratos públicos entre contextos

O contexto `team` expõe um contrato público mínimo para o contexto `task`:

```ts
export type TeamAccess = {
	teamExists(teamId: string): Promise<boolean>;
	memberBelongsToTeam(memberId: string, teamId: string): Promise<boolean>;
};
```

O contexto `task` expõe um contrato público mínimo para exclusões no contexto `team`:

```ts
export type TaskUsageQuery = {
	hasTasksForTeam(teamId: string): Promise<boolean>;
	hasTasksForAssignee(assigneeId: string): Promise<boolean>;
};
```

Os contratos são tipos de `application`; as implementações Drizzle continuam em `infrastructure`, e o composition root conecta as implementações concretas. Consultas de existência usam `SELECT 1 ... LIMIT 1`, não `count(*)`.

Sem FK entre os contextos, a proteção de exclusão é uma garantia dos fluxos da aplicação, não uma garantia contra uma corrida envolvendo gravações externas ou concorrentes. Essa limitação é deliberada para preservar a arquitetura atual; uma garantia absoluta exigiria rever a decisão de não usar FK cruzada.

## Marco 1 — Proteções e automação

### 1. Banco exclusivo de testes

Todo processo de teste lê `TEST_DATABASE_URL`. `DATABASE_URL` da aplicação nunca serve de fallback. Um único helper:

- aceita somente `postgres:` ou `postgresql:`;
- exige um único nome de banco no pathname;
- exige sufixo exato `_test`;
- falha antes de criar client, migrar, semear ou truncar.

Vitest e Playwright validam `TEST_DATABASE_URL` e somente depois a repassam como `DATABASE_URL` aos processos que ainda consomem o nome legado. O migrador genérico continua aceitando qualquer URL porque também é usado fora de testes.

### 2. CI antecipada

O primeiro PR adiciona `.github/workflows/ci.yml`, para proteger os PRs seguintes. A workflow possui:

- job principal com Node.js 20, Postgres 16 e `TEST_DATABASE_URL`;
- `npm ci`, `npm run typecheck`, Biome em modo `ci`, Knip, Vitest e build;
- job E2E independente com Postgres 16, instalação do Chromium com dependências e Playwright;
- cache nativo do npm e permissões somente de leitura.

O script `npm run lint` passa a executar `biome ci .`; `lint:fix` continua sendo o comando de correção local. O README acompanha a mudança de script. Branch protection não faz parte do arquivo YAML.

### 3. Cookie e parâmetros UUID

`getCurrentTeam()` retorna `null` sem consultar o banco quando o cookie está ausente ou malformado. Cookie UUID inexistente também resulta em `null` após uma consulta válida.

As páginas normal e interceptada de `[teamId]` chamam `notFound()` antes do repositório quando o parâmetro não é UUID. `selectTeamAction` somente grava o cookie depois de confirmar que o time existe.

### 4. Datas reais

O filtro de métricas usa `parseDateOnly`. Datas válidas, inclusive 29 de fevereiro em ano bissexto, são preservadas; formato inválido e datas inexistentes usam o fallback atual.

## Marco 2 — Integridade das entradas e gravações

### 5. Validação e escopo das mutações

O Client Component deixa de enviar `teamId` ao criar task. A Action resolve o time pelo cookie validado. Sem time atual, a mutação retorna erro esperado.

As Actions validam a forma de UUIDs, status, booleanos, datas e textos. Os casos de uso validam:

- existência do tipo de task;
- existência do time na criação;
- pertencimento do membro ao time;
- pertencimento da task ao time atual em update, delete, move e bloqueio;
- pertencimento do membro ao time da rota em rename e remove;
- existência do time antes de seleção e demais mutações de time.

O schema Postgres adiciona `CHECK` para os status de `tasks.status`, `task_status_changes.from_status` quando não nulo e `task_status_changes.to_status`. A FK já existente continua protegendo `typeId`.

### 6. Task e histórico atômicos

`TaskRepository` passa a expor três operações de gravação atômicas:

```ts
createWithInitialHistory(data: CreateTaskData): Promise<Task>;
moveWithHistory(taskId: string, toStatus: TaskStatus): Promise<Task>;
setBlockedWithHistory(taskId: string, blocked: boolean): Promise<Task>;
```

Na implementação Drizzle:

- criação insere task e mudança inicial de status na mesma transação;
- movimentação seleciona a task com `FOR UPDATE`, retorna sem escrita quando o status já é o desejado, atualiza a task e insere a transição;
- bloqueio seleciona a task com `FOR UPDATE`, retorna sem escrita quando o estado já coincide, atualiza a task e abre ou fecha o período na mesma transação;
- desbloqueio sem período aberto falha e reverte a atualização;
- duas chamadas concorrentes para bloquear a mesma task abrem no máximo um período.

As escritas públicas do repositório de histórico são removidas depois que todos os chamadores de produção e fixtures forem migrados. A consulta `getStatusChangedAtForTasks()` permanece separada. Fakes expõem helpers de seed próprios, sem manter métodos de produção apenas para preparar testes.

### 7. Exclusão segura de time e membro

`deleteTeam` consulta `TaskUsageQuery.hasTasksForTeam()` antes de excluir. `removeMember` consulta `hasTasksForAssignee()`. Havendo uso, ambos lançam `ApplicationError` e nenhum dado é alterado.

O comportamento de produto é bloquear a operação, nunca apagar tasks em cascata nem desatribuir automaticamente.

## Marco 3 — Fronteira e experiência da UI

### 8. Remover `presentation → app`

`task-form-modal.tsx`, `task-move-select.tsx` e `team-switcher.tsx` deixam de importar Server Actions. As Actions entram por props a partir de `app/` e atravessam somente os componentes intermediários necessários: layout, página do board, Kanban e card.

Não será criado Context, provider ou registry de Actions; a profundidade atual não justifica essa abstração.

### 9. Modal nativo

O componente compartilhado usa `<dialog>` e recebe `onClose` e nome acessível. Ele abre com `showModal()`, fecha pelo botão, Escape ou clique no backdrop quando o próprio dialog é o alvo, e chama `close()` antes de notificar o consumidor.

O modal de task passa a usar esse componente. O modal de rota usa `router.back()` como `onClose`; o modal local altera seu estado. A restauração nativa de foco é aceita como padrão e só recebe código adicional se o E2E demonstrar falha.

### 10. Erros e pending

Formulários exibem `ActionState.error` em elemento com `role="alert"`. Botões e selects ficam desabilitados durante a mutação. Falhas preservam o formulário aberto; movimento de task restaura o status anterior; delete, toggle de bloqueio e troca de time sempre limpam `pending`.

Não haverá toast global. Falhas inesperadas recebem mensagem genérica e permanecem observáveis no servidor.

## Marco 4 — N+1 dos tipos

`TaskRepository` adiciona `listUsedTypeIds(): Promise<string[]>`. `listTaskTypes()` executa uma consulta de tipos e uma consulta `SELECT DISTINCT type_id`, cria um `Set` e marca `inUse` em memória.

`countByType()` permanece porque `deleteTaskType()` ainda precisa dele. A quantidade de consultas de uso independe da quantidade de tipos.

## Marco 5 — Snapshot de métricas

### Contrato

`MetricsQueryPort` substitui as três operações por uma única operação de aplicação:

```ts
loadSnapshot(
	teamId: string,
	periodStart: Date,
	periodEnd: Date,
): Promise<MetricsSnapshot>;
```

O adapter executa no máximo cinco queries:

1. eventos `→ DONE` no intervalo total e data de criação das tasks;
2. histórico completo de status das tasks encontradas;
3. períodos de bloqueio completos das tasks encontradas;
4. tasks com `dueDate` no intervalo e sua primeira conclusão histórica;
5. WIP atual.

O intervalo total começa no início mais antigo entre as oito semanas, seis meses e período selecionado, e termina no maior fim desses períodos. Histórico anterior ao intervalo continua sendo carregado para as tasks relevantes quando necessário às fórmulas e à primeira conclusão.

### Agregação

Um novo caso de uso monta em uma chamada:

- métricas do período selecionado;
- série de oito semanas;
- série de seis meses;
- WIP atual.

Cada período preserva a semântica atual: uma task conta no máximo uma vez por período, usando sua última transição `→ DONE` dentro daquele período. A mesma task pode contar em períodos distintos se foi reaberta e concluída novamente.

WIP não faz parte das séries históricas. O dashboard já exibe WIP como cartão sem gráfico; o snapshot fornece apenas o valor atual. Não será reconstruído WIP histórico.

As fórmulas existentes permanecem inalteradas; somente a origem e o particionamento dos dados mudam. O limite testável é de no máximo cinco queries SQL para carregar o dashboard, independentemente da quantidade de períodos.

## Testes

### Unitários

- URL de teste válida, protocolo inválido, URL inválida, banco ausente e banco sem `_test`;
- UUID válido, ausente, malformado e inexistente;
- datas normais, inexistentes e anos bissextos;
- todos os status válidos e valor adulterado;
- tipo inexistente, membro de outro time e task de outro time;
- operação idempotente sem histórico duplicado;
- exclusões permitidas e bloqueadas sem alteração de dados;
- uma única consulta de IDs usados para qualquer quantidade de tipos;
- equivalência entre métricas antigas e snapshot para os mesmos datasets.

### Infraestrutura com Postgres

- validação ocorre antes de migração ou truncate;
- falha na escrita do histórico reverte a task ou sua alteração;
- duas operações concorrentes não abrem dois bloqueios;
- constraints rejeitam status inválidos;
- snapshot respeita o teto de cinco queries;
- migrações aplicam em banco `_test` vazio.

### E2E

- cookie malformado não produz 500;
- parâmetro `[teamId]` malformado produz 404;
- criação, edição, movimentação, bloqueio e exclusão continuam funcionando;
- erro esperado aparece localmente e o controle volta a habilitar;
- movimento com falha restaura o select;
- modal possui nome acessível, fecha por Escape, botão e backdrop, e devolve foco ao disparador;
- seleção e administração de time continuam funcionando.

## Ordem e entregas

1. PR Proteções: banco de teste, CI, UUID/cookie e datas.
2. PR Integridade: validação/autorização, transações e exclusões.
3. PR UI: Actions por props, dialog nativo e estados de erro/pending.
4. PR N+1: tipos usados em lote.
5. PR Métricas: snapshot único e agregação em memória.

O PR de métricas é o último porque possui o maior raio de mudança. O CI entra no primeiro PR para validar todos os seguintes.

## Critérios finais de aceite

- Nenhum teste aceita ou reutiliza `DATABASE_URL` como banco de teste.
- Entrada externa inválida não alcança Postgres quando pode ser rejeitada pela forma.
- Nenhuma mutação de task atravessa o limite do time atual.
- Task e histórico não divergem nas três operações compostas.
- Time com tasks e membro responsável não podem ser removidos pelos fluxos da aplicação.
- `rg 'from "@/app/' src/presentation` não retorna ocorrências.
- Toda mutação imperativa aguarda sua Promise e restaura `pending`.
- Modais usam `<dialog>` com nome acessível.
- CI executa os gates do projeto em banco `_test`.
- Listagem de tipos não cresce em consultas conforme a quantidade de tipos.
- Dashboard de métricas usa no máximo cinco queries e mantém os resultados das fórmulas existentes.
