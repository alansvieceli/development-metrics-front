# Design: Gestão e seleção de time

Data: 2026-07-17 (revisado em 2026-07-18 — correção de UX: header ausente, sem botão de voltar, impossível trocar de time, visual amador)
Sub-projeto 1 de 4 do produto Development Metrics (Times → Kanban/Tasks → Motor de métricas → Dashboard).

## Contexto e objetivo

A aplicação é multi-time e não tem autenticação de usuário (uso interno). Antes de usar qualquer outra funcionalidade (Kanban, métricas), a pessoa precisa indicar de qual time faz parte. Se nenhum time existir ainda, a aplicação deve pedir para cadastrar um.

Este sub-projeto cobre: cadastro/seleção/troca de time e gestão de membros do time. Não cobre tasks, kanban, métricas ou dashboards — esses são sub-projetos futuros que vão consumir o time selecionado.

## Modelo de dados (domain)

- **Team**: `id` (gerado automaticamente), `name`.
- **Member**: `id` (gerado automaticamente), `name`, `teamId`.

Não há invariantes de negócio além de nome não vazio. Não há entidade rica de domínio nem value objects: cabe como função de aplicação simples + port de repositório, conforme a seção "Quando simplificar" de [architecture.md](../../../techdocs/architecture.md).

## Persistência do time selecionado

- O time selecionado é guardado em **cookie** no navegador.
- Cookie é lido/escrito através de um port (`CurrentTeamStore`) em `application`, implementado em `infrastructure` — `application` não conhece a API de cookies do Next.js.
- **Gate único**: a home (`app/page.tsx`, Server Component) lê o cookie, chama o caso de uso `getCurrentTeam` (valida no Postgres se o time do cookie ainda existe) e faz `redirect("/teams")` quando não há time válido. Não fica no layout raiz porque o layout raiz envolve `/teams` também — faria loop de redirect. Não há middleware/`proxy.ts` envolvido — um único ponto de verificação evita duplicar a validação entre edge e Node runtime.
- Se o time atualmente selecionado for excluído, a próxima navegação detecta o cookie órfão pelo gate e redireciona para `/teams`.

## Rotas e telas

- `/` — redireciona para `/board` quando há um time válido selecionado (rota definida na spec de Kanban/Tasks). Sem time selecionado, o gate redireciona para `/teams` antes disso.
- `/teams` — **selecionar/criar time**. Layout: lista vertical simples de times existentes (cada linha clicável seleciona o time, seta o cookie e redireciona para `/`) com um formulário de criação (campo "nome") abaixo. Se não houver nenhum time cadastrado, mostra só o formulário de criação com uma mensagem indicando a ausência de times.
- `/teams/[teamId]` — **gerenciar time**. Layout: tudo em uma página só — campo de nome do time, lista de membros (cada um com ações de renomear/remover), campo para adicionar novo membro, e um botão de excluir o time ao final.
- **Header** (presente em **todas** as páginas, incluindo `/teams` e `/teams/[teamId]`): mostra o nome do app e, quando há time selecionado, o nome do time atual como um botão/dropdown no canto. O dropdown lista os outros times (clicar troca, via Server Action que seta o cookie), e tem as opções "Gerenciar time atual" (→ `/teams/[teamId]` do time corrente) e "Criar novo time" (→ `/teams`). Por viver no layout raiz, fica sempre visível e clicável — inclusive com um modal de time aberto por cima.

### `/teams` e `/teams/[teamId]` como modal

Correção de UX (2026-07-18): essas duas telas não tinham header nem forma de voltar quando abertas a partir do app (dead end). Em vez de adicionar um botão "voltar" avulso, elas passam a abrir **como modal por cima da tela atual** quando acessadas por navegação interna (clique em link/botão dentro do app), usando os recursos nativos do App Router — *parallel route* (`@modal`) + *intercepting route* (`(.)`):

- Navegação interna (header → "Gerenciar time atual" / "Criar novo time"; membro → "Adicionar membro") abre a tela como modal (overlay), sem sair da página atual. Fechar o modal (X, clique fora ou Esc) chama `router.back()`.
- Acesso direto por URL, refresh, ou o `redirect("/teams")` do gate (quando não há cookie válido) renderizam a página cheia normalmente — sem modal, já que não há "por cima de quê" abrir.
- `/teams` sem nenhum time cadastrado é sempre a página de entrada cheia (não faz sentido como modal, é o próprio ponto de partida).

## Arquitetura (camadas)

```text
domain/team/entities/team.ts        # Team { id, name }
domain/team/entities/member.ts      # Member { id, name, teamId }

application/team/use-cases/
  create-team.ts
  rename-team.ts
  delete-team.ts
  list-teams.ts
  get-team.ts
  add-member.ts
  rename-member.ts
  remove-member.ts
  get-current-team.ts    # lê o cookie via CurrentTeamStore + valida existência via TeamRepository

application/team/ports/
  team-repository.ts      # port de persistência de Team e Member
  current-team-store.ts   # port para ler/escrever qual time está selecionado (abstrai cookie)

infrastructure/team/
  drizzle/schema.ts
  drizzle-team-repository.ts
  cookie-current-team-store.ts

presentation/team/
  team-switcher.tsx        # client component (dropdown do header)
  team-select-view.tsx     # NOVO: conteúdo de "selecionar/criar time", reaproveitado pela página cheia e pelo modal
  team-manage-view.tsx     # NOVO: conteúdo de "gerenciar time", reaproveitado pela página cheia e pelo modal

presentation/shared/
  modal.tsx                 # NOVO: client component genérico (overlay + fechar via router.back()/Esc/clique fora)

composition/team.ts        # factories dos casos de uso, injetando as implementações concretas

app/layout.tsx               # chama get-current-team (só para o header) e renderiza o header global + {children} + {modal}; NÃO faz gate (rodaria em toda rota, inclusive /teams, e criaria loop de redirect)
app/page.tsx                  # home; mantém o gate: chama get-current-team, redirect("/teams") se inválido
app/teams/page.tsx            # página cheia de "/teams" (usa team-select-view.tsx)
app/teams/[teamId]/page.tsx   # página cheia de "/teams/[teamId]" (usa team-manage-view.tsx)
app/@modal/default.tsx                  # retorna null (sem modal em navegação direta)
app/@modal/(.)teams/page.tsx            # versão modal de /teams (mesma view, dentro de <Modal>)
app/@modal/(.)teams/[teamId]/page.tsx   # versão modal de /teams/[teamId] (mesma view, dentro de <Modal>)
```

## Estilização

- **Tailwind CSS** é adotado neste sub-projeto como biblioteca de estilização (primeira necessidade real de CSS além do placeholder atual). Registrado em [guidelines.md](../../../techdocs/guidelines.md).
- Paleta de cores do tema (revisada em 2026-07-18 — a paleta verde-limão original lia como "amadora"; validada com o usuário via mockup):
  - Header: azul-marinho `#0f1b33`, texto branco.
  - Acento/ação (botões primários, links, foco do seletor de time): azul `#2563eb`.
  - Fundo do conteúdo: cinza-azulado claro `#f5f7fb` (tema claro); mantém alternância por `prefers-color-scheme` para o tema escuro, espelhando os mesmos tons em versão escura.
  - Substituem as variáveis `--background`/`--foreground` atuais em `globals.css`.
- Tipografia: usar a fonte **Geist** (`next/font/google`, já carregada em `root-shell.tsx` mas não aplicada) em vez do fallback Arial atual em `body`.
- Ícones: **lucide-react** (padrão de facto em projetos Next.js/Tailwind, tree-shakable, sem configuração). Uso: X para fechar modal, lápis (renomear), lixeira (remover/excluir), chevron (seletor de time).

## Banco de dados

- **Drizzle ORM** é adotado para acesso ao Postgres (`devops/docker-compose.yml`). Registrado em [guidelines.md](../../../techdocs/guidelines.md).
- Schema e queries do Drizzle ficam confinados a `infrastructure/team/drizzle`.

## Edge cases

- **Excluir o time atualmente selecionado**: cookie fica órfão; o gate da home detecta e redireciona para `/teams` na próxima navegação.
- **Excluir membro**: sem restrição — uso interno, e neste sub-projeto ainda não existem tasks vinculadas a membros (isso é tratado no sub-projeto de Kanban/Tasks).
- **Nome de time ou membro vazio**: validação simples na Server Action (sem biblioteca de validação, conforme guidelines.md — a complexidade não justifica).
- **Nenhum time cadastrado**: `/teams` mostra apenas o formulário de criação.
- Toda edição (nome de time, membros) pode ser feita a qualquer momento, sem restrição de papel/permissão — consistente com o caráter interno da aplicação.

### Confirmação de exclusão e estado de envio (2026-07-18)

Correção de UX/bug: ações destrutivas (excluir time, remover membro) pedem confirmação nativa (`window.confirm`) antes de enviar o formulário — sem lib nova. Investigação encontrou também um bug real de duplicação: sem nenhum estado de "enviando", cliques rápidos em "Adicionar membro" (ou qualquer outro botão de submit) disparavam a Server Action mais de uma vez, criando linhas duplicadas no banco. A correção cobre os dois problemas com um único componente:

- `presentation/shared/submit-button.tsx` — client component que usa `useFormStatus()` (React/Next nativo) para desabilitar o botão enquanto o formulário está em trânsito, e aceita uma prop opcional `confirmMessage` que intercepta o clique com `window.confirm` antes de deixar o submit prosseguir. Usado em salvar nome, renomear/remover membro e adicionar membro.
- Cascata de exclusão já é garantida pelo banco: `members.teamId` tem `ON DELETE CASCADE` (migração `0000_classy_punisher.sql`), então excluir um time já remove seus membros automaticamente. Excluir um membro remove só a linha do membro — não há hoje nenhuma outra tabela referenciando membro individualmente.
- O modal (`presentation/shared/modal.tsx`) ganhou `max-h-[85vh] overflow-y-auto` no card de conteúdo — sem isso, um time com muitos membros podia crescer além da viewport e deixar o botão "Excluir time" inalcançável sem scroll.

### Bug: loop infinito ao excluir o time atual (2026-07-18)

Excluir o time selecionado (a partir de `/teams/[teamId]`, cheio ou modal) entrava em loop infinito de navegação em `/teams`. Causa raiz isolada removendo o slot `@modal` temporariamente: o loop desaparecia por completo, mesmo em cenários sem nenhum modal visível. É uma interação específica do Next.js 16.2.10 entre `redirect()` de Server Action e *intercepting routes* — só ocorre quando o redirect cruza de uma rota com interceptação (`/teams/[teamId]`) para outra rota irmã também interceptada (`/teams`); as demais actions (criar, selecionar, renomear, adicionar/remover membro) redirecionam para o mesmo segmento onde já estão e nunca disparam o problema.

Correção: `deleteTeamAction` (`app/teams/[teamId]/actions.ts`) não chama mais `redirect()` — só deleta e revalida. A navegação para `/teams` foi movida para `presentation/team/delete-team-button.tsx`, um client component que chama a action diretamente (não via `<form action>`) e navega com `window.location.href` após o `await` resolver — uma navegação de browser genuína, fora do router client-side do Next, que não aciona a interceptação. É a única ação do fluxo de time que precisa desse contorno.

## Testes

- Unitários em `application/team`: casos de uso de criar/renomear/excluir time e membro; `get-current-team` com cookie válido, inválido (time não existe mais) e ausente.
- Integração para os fluxos críticos de `presentation`/`app`: selecionar time seta cookie e redireciona para `/`; gate redireciona para `/teams` quando não há time válido; troca de time pelo header.
- `tests/integration/team-selection.spec.ts` já existente usa `page.goto` direto para `/teams`, então sempre exercita a página cheia (não o modal) — continua válido sem mudança estrutural; ajustar apenas seletores que hoje buscam texto (ex. `▾`) se algum virar ícone.
