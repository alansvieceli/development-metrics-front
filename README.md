# development-metrics-front

Frontend do projeto Development Metrics.

## Stack

- Next.js (App Router)
- TypeScript (modo estrito)
- Biome (lint, formatação e organização de imports)
- Knip (detecção de código não usado)

Ver [techdocs/guidelines.md](./techdocs/guidelines.md) e [techdocs/architecture.md](./techdocs/architecture.md) para as convenções do projeto.

## Como rodar

Pré-requisito: Node.js e um banco Postgres local (ver `devops/docker-compose.yml`).

```sh
npm install
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

## Git hooks

Após clonar o repositório, ativar os hooks de commit:

```sh
git config core.hooksPath .githooks
```
