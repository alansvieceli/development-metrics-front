# Design: Cadastro retroativo de card

Data: 2026-07-18
Estende a spec [2026-07-17-kanban-tasks-design.md](./2026-07-17-kanban-tasks-design.md).

## Contexto e objetivo

Hoje não existe nenhum jeito de registrar um card com histórico "no passado": `create-task` sempre grava `createdAt` como agora, e `move-task` sempre grava `changedAt` como agora — ambos usam `defaultNow()` do Postgres. Sem dados históricos, as métricas do motor (lead time, cycle time, throughput, etc.) não têm nada pra calcular em períodos anteriores ao uso real do app.

Objetivo: um caminho de cadastro alternativo, manual, onde o usuário monta a sequência de etapas (status + data) por onde um card já passou — de qualquer origem (Jira ou não) — reconstruindo de memória o que aconteceu. Depois de criado, o card se comporta como qualquer outro: pode ser movido, editado e bloqueado normalmente pela UI já existente (a partir daí, com timestamps reais de agora).

## Regras

- Uma **etapa** é um par `(status, data)`. O usuário monta uma lista ordenada de etapas, com no mínimo 1.
- Data por dia (sem horário), mesmo tipo de campo usado hoje no prazo (`dueDate`), armazenada como meia-noite UTC daquele dia.
- A 1ª etapa define `createdAt` da task e grava o primeiro `TaskStatusChange` com `fromStatus: null`, `toStatus` = status da 1ª etapa, `changedAt` = data da 1ª etapa.
- Cada etapa seguinte grava um `TaskStatusChange` com `fromStatus` = status da etapa anterior, `toStatus` = seu próprio status, `changedAt` = sua data.
- O **status atual da task = status da última etapa da lista** — o card não precisa chegar em `DONE`; pode "parar" em qualquer coluna, representando um card que ainda está em andamento até hoje.
- Pode pular etapas (ex.: `TODO` → `CODE_REVIEW` direto), já que mover pra qualquer coluna livremente já é regra do board hoje.
- Datas devem ser **não decrescentes** ao longo da lista (etapa N não pode ter data anterior à etapa N-1).
- Duas etapas seguidas com o **mesmo status** são rejeitadas (não representa uma transição real).
- Fora as datas, os demais campos (id externo, descrição, tipo, responsável, time, prazo opcional) seguem as mesmas validações do `create-task` atual (id externo único no time, tipo existente, responsável pertence ao time).
- **Fora de escopo**: bloqueio (`TaskBlockedPeriod`) retroativo. Depois de criado, o card pode ser bloqueado pela ação já existente, mas com data de "agora" — não retroativa.

## Comportamento de um card "ainda em andamento" (sem chegar em DONE)

Um card cuja última etapa não é `DONE` (ex.: etapas até `TESTING@14/07`, sem uma 5ª etapa) fica visível no quadro na coluna correspondente à última etapa, imediatamente após o cadastro, e entra no **WIP** na mesma hora (WIP conta qualquer status diferente de `TODO`/`DONE`, independente de período).

Ele **não conta** em throughput, lead time ou cycle time — essas métricas dependem de um evento `→ DONE` dentro do período, que ainda não existe.

A métrica "tempo em {etapa}" (ex.: tempo em Testes) só soma passagens **concluídas** por aquela coluna (entrada até a saída seguinte) — mesmo comportamento que já existe hoje para "tempo em Code Review". Enquanto o card não tiver uma transição de saída registrada da etapa em que está parado, esse tempo parcial não entra na média/mediana dessa métrica; só o WIP sinaliza que ele está em andamento.

## UI

Botão **"+ Card retroativo"** ao lado de "+ Nova task" no quadro. Abre um modal com os campos normais de task (id externo, descrição, tipo, responsável, prazo opcional) + uma lista dinâmica de linhas "etapa": seletor de status (as colunas do board) + campo de data, com ações de adicionar/remover linha. Primeira linha vem pré-selecionada com `TODO`.

## Arquitetura

```text
application/task/use-cases/
  create-historical-task.ts   # valida os campos normais + a lista de etapas, monta o histórico e delega ao repositório

application/task/ports/task-repository.ts
  createWithExplicitHistory(
    data: CreateTaskData,
    history: { status: TaskStatus; changedAt: Date }[],
  ): Promise<Task>          # novo método no port

infrastructure/task/drizzle-task-repository.ts
  createWithExplicitHistory(...)
    # insere a task com createdAt = history[0].changedAt (explícito, sem defaultNow())
    # insere um registro em taskStatusChanges por etapa, com changedAt explícito
    # status final da task = history[history.length - 1].status

presentation/task/
  historical-task-form-modal.tsx   # modal com os campos normais + lista dinâmica de etapas (status + data)

app/board/page.tsx
  createHistoricalTaskAction   # Server Action análoga à createTaskAction existente
```

Nenhuma tabela nova: `tasks` e `task_status_changes` já suportam valores explícitos de `createdAt`/`changedAt` no insert (o `defaultNow()` do schema só se aplica quando a coluna é omitida). Nenhuma mudança em `domain`.

## Edge cases

- **Lista de etapas vazia**: rejeitado (mínimo 1 etapa).
- **Datas fora de ordem** (etapa N com data anterior à etapa N-1): rejeitado com mensagem clara.
- **Duas etapas seguidas com o mesmo status**: rejeitado.
- **Id externo duplicado no time**: mesma validação do `create-task` normal.
- **Card retroativo com uma única etapa em `DONE`**: válido — task "nasce" já concluída num dia passado, sem detalhar o meio do caminho.
- **Card retroativo "ainda em andamento"** (última etapa não é `DONE`): válido — ver seção "Comportamento de um card ainda em andamento" acima.

## Testes

- Unitário de `create-historical-task`: gera as `TaskStatusChange` certas a partir da lista de etapas (incluindo pular etapas), rejeita lista vazia, datas fora de ordem, status repetido consecutivo, reaproveita as validações de `create-task` (id duplicado, time/tipo/responsável inválidos).
- Unitário confirmando que um card criado retroativamente sem chegar em `DONE` aparece no WIP mas não no throughput/lead time/cycle time do período, e que sua etapa atual (em andamento) não conta ainda em "tempo em {etapa}".
- Integração: modal cria o card na coluna final certa; o histórico gerado aparece corretamente nas métricas do período correspondente (ex.: card com etapa final `DONE` numa data passada aparece no throughput daquela semana).
