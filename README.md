# development-metrics-front

Frontend do projeto Development Metrics.

## Funcionalidades

- Cadastro de equipes e de seus colaboradores, com seleção do time atual.
- Quadro Kanban para cadastrar, editar, excluir e mover tarefas entre `TODO`,
  `IN_DEVELOPMENT`, `CODE_REVIEW`, `TESTING`, `AWAITING_PUBLICATION` e `DONE`;
  o quadro mostra a contagem de cards por coluna e um resumo por responsável e
  de tarefas bloqueadas.
- Cada tarefa pertence a um time e pode ter tipo, responsável e data prevista de
  entrega (`dueDate`). O identificador externo da tarefa é único dentro do time.
- O card de tarefa destaca o prazo (`dueDate`) em amarelo quando está a até 2
  dias do vencimento e em vermelho quando já venceu, exceto para tarefas
  concluídas.
- Cadastro retroativo de card: monta uma sequência de etapas (status + data)
  para reconstruir o histórico de um card já existente fora do app; a task
  nasce com `createdAt` da primeira etapa e status da última.
- Toda mudança de status gera histórico. Bloqueios são registrados como períodos
  com início e fim, que alimentam o cálculo das métricas.
- Dashboard com dez métricas do time atual, filtro semanal ou mensal e séries
  históricas das últimas 8 semanas e dos últimos 6 meses.

## Regras das métricas

### Período e apresentação

- A semana começa na segunda-feira às `00:00 UTC` e termina no início da
  segunda-feira seguinte. O mês começa no primeiro dia às `00:00 UTC` e termina
  no início do mês seguinte. O fim do intervalo é exclusivo.
- Uma tarefa é considerada concluída no período quando possui ao menos uma
  transição para `DONE` dentro dele. Se houver mais de uma, a conclusão usada nos
  cálculos é a última transição para `DONE` no período, mas a tarefa conta uma
  única vez.
- Lead time, cycle time, tempo bloqueado e tempo em code review exibem média e
  mediana das tarefas elegíveis. Os percentuais são arredondados apenas na
  apresentação.
- Sem tarefas elegíveis, as durações, retrabalho e previsibilidade aparecem como
  `sem dados`; throughput e WIP aparecem como `0`.

| Métrica | Regra implementada |
| --- | --- |
| **Lead time** | Para cada tarefa concluída no período: `última entrada em DONE no período - data de criação`. O card mostra média e mediana. |
| **Cycle time** | Para cada tarefa concluída no período: `última entrada em DONE no período - primeira entrada em IN_DEVELOPMENT de todo o histórico`. Tarefas que nunca entraram em desenvolvimento não participam desta métrica. O card mostra média e mediana. |
| **Tempo bloqueado** | Para cada tarefa concluída no período, soma todos os seus períodos de bloqueio. Um bloqueio ainda aberto é contado até o momento do cálculo. O histórico não é recortado pelo início do período selecionado; tarefas sem bloqueio contribuem com zero. O card mostra média e mediana. |
| **Tempo aguardando code review** | Para cada tarefa concluída no período, soma cada intervalo entre a entrada em `CODE_REVIEW` e a mudança de status seguinte. Uma entrada sem mudança posterior ainda não contribui; tarefas que nunca passaram por review contribuem com zero. O histórico não é recortado pelo início do período. O card mostra média e mediana. |
| **Tempo em Testes** | Mesma regra do tempo aguardando code review, aplicada à coluna `TESTING`. O card mostra média e mediana. |
| **Tempo Aguardando Publicação** | Mesma regra do tempo aguardando code review, aplicada à coluna `AWAITING_PUBLICATION`. O card mostra média e mediana. |
| **Taxa de retrabalho** | Percentual das tarefas concluídas no período que tiveram ao menos uma transição para `IN_DEVELOPMENT` vinda de um status diferente de `TODO` ou `IN_DEVELOPMENT` (`CODE_REVIEW`, `TESTING`, `AWAITING_PUBLICATION` ou `DONE`): `tarefas com retrabalho / tarefas concluídas × 100`. Cada tarefa conta no máximo uma vez. |
| **Throughput** | Quantidade de tarefas distintas concluídas no período selecionado. Uma tarefa com múltiplas entradas em `DONE` no mesmo período conta uma vez. No filtro semanal, representa as entregas da semana; no mensal, as entregas do mês. |
| **WIP** | Fotografia atual da quantidade de tarefas do time em qualquer status diferente de `TODO` e `DONE` (`IN_DEVELOPMENT`, `CODE_REVIEW`, `TESTING` ou `AWAITING_PUBLICATION`). Não é média histórica e não é limitado pelo período selecionado. |
| **Previsibilidade** | Considera tarefas cuja `dueDate` está no período selecionado. Calcula `tarefas concluídas pela primeira vez até 23:59:59.999 UTC da dueDate / tarefas com dueDate no período × 100`. Tarefas atrasadas ou não concluídas contam como não atendidas. Portanto, a implementação atual mede cumprimento da data prevista, não um snapshot separado de itens planejados. |

### Manutenção destas regras

As regras executáveis estão nas fórmulas de `src/application/metrics/formulas`,
na orquestração de `src/application/metrics/use-cases/get-metrics-for-period.ts`
e nas consultas de `src/infrastructure/metrics/drizzle-metrics-query-port.ts`.
Qualquer mudança de definição, período, população elegível ou fórmula deve
atualizar esta seção do README e os testes correspondentes na mesma alteração.

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
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/development_metrics_test
```

Os testes recusam bancos cujo nome não termine em `_test`.

Aplicar as migrações e subir o servidor:

```sh
npm run db:migrate
npm run dev
```

Acesse http://localhost:3000.

## Scripts

| Script                  | Descrição                                                           |
| ----------------------- | --------------------------------------------------------------------- |
| `npm run dev`         | Sobe o servidor de desenvolvimento                                    |
| `npm run build`       | Gera o build de produção                                            |
| `npm run start`       | Sobe o build de produção                                            |
| `npm run typecheck`   | Roda`tsc --noEmit`                                                  |
| `npm run lint`        | Roda o Biome em modo de checagem                                      |
| `npm run lint:fix`    | Roda o Biome corrigindo o que for possível                           |
| `npm run knip`        | Detecta arquivos, exports e dependências não usados                 |
| `npm test`            | Roda os testes unitários (Vitest)                                    |
| `npm run test:watch`  | Roda os testes unitários em modo watch                               |
| `npm run db:generate` | Gera uma nova migração a partir do schema do Drizzle                |
| `npm run db:migrate`  | Aplica as migrações pendentes no banco apontado por`DATABASE_URL` |
| `npm run test:e2e`    | Roda os testes de integração/E2E (Playwright)                       |

Antes do primeiro `npm run test:e2e`, instalar o navegador usado pelos testes:

```sh
npx playwright install chromium
```

## Integração contínua

O GitHub Actions executa os jobs `quality` e `e2e` em pushes para `master` e
pull requests, sempre com um Postgres isolado terminado em `_test`.

## Git hooks

Após clonar o repositório, ativar os hooks de commit:

```sh
git config core.hooksPath .githooks
```
