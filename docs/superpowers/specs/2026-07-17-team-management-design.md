# Design: Gestão e seleção de time

Data: 2026-07-17
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
- **Gate único**: o root layout (Server Component) lê o cookie, chama o caso de uso `getCurrentTeam` (valida no Postgres se o time do cookie ainda existe) e faz `redirect("/teams")` quando não há time válido. Não há middleware/`proxy.ts` envolvido — um único ponto de verificação evita duplicar a validação entre edge e Node runtime.
- Se o time atualmente selecionado for excluído, a próxima navegação detecta o cookie órfão pelo gate e redireciona para `/teams`.

## Rotas e telas

- `/` — redireciona para `/board` quando há um time válido selecionado (rota definida na spec de Kanban/Tasks). Sem time selecionado, o gate redireciona para `/teams` antes disso.
- `/teams` — **selecionar/criar time**. Layout: lista vertical simples de times existentes (cada linha clicável seleciona o time, seta o cookie e redireciona para `/`) com um formulário de criação (campo "nome") abaixo. Se não houver nenhum time cadastrado, mostra só o formulário de criação com uma mensagem indicando a ausência de times. É a rota de entrada quando não há cookie válido, e também acessível pelo header.
- `/teams/[teamId]` — **gerenciar time**. Layout: tudo em uma página só — campo de nome do time, lista de membros (cada um com ações de renomear/remover), campo para adicionar novo membro, e um botão de excluir o time ao final.
- **Header** (presente em todas as páginas exceto `/teams`): mostra o nome do time atual como um botão/dropdown no canto. O dropdown lista os outros times (clicar troca, via Server Action que seta o cookie), e tem as opções "Gerenciar time atual" (→ `/teams/[teamId]` do time corrente) e "Criar novo time" (→ `/teams`).

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
  team-list.tsx
  member-list.tsx

composition/team.ts        # factories dos casos de uso, injetando as implementações concretas

app/layout.tsx              # gate: chama get-current-team, redirect("/teams") se inválido
app/teams/page.tsx           # lista + formulário de criação (Server Component + Server Action)
app/teams/[teamId]/page.tsx  # gestão de nome/membros/exclusão (Server Component + Server Actions)
```

## Estilização

- **Tailwind CSS** é adotado neste sub-projeto como biblioteca de estilização (primeira necessidade real de CSS além do placeholder atual). Registrado em [guidelines.md](../../../techdocs/guidelines.md).
- Paleta de cores do tema:
  - Tema claro: fundo `#E4FD97`, texto `#2D3E2C`.
  - Tema escuro: fundo `#2D3E2C`, texto `#E4FD97`.
  - Substituem as variáveis `--background`/`--foreground` atuais em `globals.css` (hoje branco/preto), mantendo a alternância por `prefers-color-scheme` já existente.

## Banco de dados

- **Drizzle ORM** é adotado para acesso ao Postgres (`devops/docker-compose.yml`). Registrado em [guidelines.md](../../../techdocs/guidelines.md).
- Schema e queries do Drizzle ficam confinados a `infrastructure/team/drizzle`.

## Edge cases

- **Excluir o time atualmente selecionado**: cookie fica órfão; o gate do layout detecta e redireciona para `/teams` na próxima navegação.
- **Excluir membro**: sem restrição — uso interno, e neste sub-projeto ainda não existem tasks vinculadas a membros (isso é tratado no sub-projeto de Kanban/Tasks).
- **Nome de time ou membro vazio**: validação simples na Server Action (sem biblioteca de validação, conforme guidelines.md — a complexidade não justifica).
- **Nenhum time cadastrado**: `/teams` mostra apenas o formulário de criação.
- Toda edição (nome de time, membros) pode ser feita a qualquer momento, sem restrição de papel/permissão — consistente com o caráter interno da aplicação.

## Testes

- Unitários em `application/team`: casos de uso de criar/renomear/excluir time e membro; `get-current-team` com cookie válido, inválido (time não existe mais) e ausente.
- Integração para os fluxos críticos de `presentation`/`app`: selecionar time seta cookie e redireciona para `/`; gate redireciona para `/teams` quando não há time válido; troca de time pelo header.
