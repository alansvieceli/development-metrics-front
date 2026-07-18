# development-metrics-front

Frontend do projeto Development Metrics.

## Stack

- Next.js (App Router)
- TypeScript (modo estrito)
- Tailwind CSS (estilização)
- Drizzle ORM + Postgres (persistência)
- Biome (lint, formatação e organização de imports)
- Knip (detecção de código não usado)

Ver [techdocs/guidelines.md](./techdocs/guidelines.md) e [techdocs/architecture.md](./techdocs/architecture.md) para as convenções do projeto.

## Como rodar

Pré-requisito: Node.js e um banco Postgres local (ver `devops/docker-compose.yml`).

```sh
npm install
docker compose -f devops/docker-compose.yml up -d
```

Criar um arquivo `.env` na raiz com:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/development_metrics
```

Aplicar as migrações e subir o servidor:

```sh
npm run db:migrate
npm run dev
```

Acesse http://localhost:3000.

## Scripts

| Script | Descrição |
| --- | --- |
| `npm run dev` | Sobe o servidor de desenvolvimento |
| `npm run build` | Gera o build de produção |
| `npm run start` | Sobe o build de produção |
| `npm run typecheck` | Roda `tsc --noEmit` |
| `npm run lint` | Roda o Biome em modo de checagem |
| `npm run lint:fix` | Roda o Biome corrigindo o que for possível |
| `npm run knip` | Detecta arquivos, exports e dependências não usados |
| `npm test` | Roda os testes unitários (Vitest) |
| `npm run test:watch` | Roda os testes unitários em modo watch |
| `npm run db:generate` | Gera uma nova migração a partir do schema do Drizzle |
| `npm run db:migrate` | Aplica as migrações pendentes no banco apontado por `DATABASE_URL` |

## Git hooks

Após clonar o repositório, ativar os hooks de commit:

```sh
git config core.hooksPath .githooks
```
