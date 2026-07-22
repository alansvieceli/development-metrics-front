# Design: Persistência do filtro de período por time + correção de reset de formulário de task

Data: 2026-07-22

## Contexto

Dois problemas reportados em conversa:

1. Ao escolher Semana/Quinzena/Mês/Personalizado no dashboard de métricas, a seleção não é lembrada — reabrir a tela sempre volta para Semana. Precisa ser lembrada por time.
2. Nas telas de cadastro de task (criar, editar, retroativo), quando o submit dá erro os campos já preenchidos somem, obrigando a redigitar tudo.

## 1. Persistir período por time

Cookie novo `metrics-period-pref`, JSON `{ [teamId]: { period, date, start, end } }` — mesmo padrão de [cookie-current-team-store.ts](../../../src/infrastructure/team/cookie-current-team-store.ts) (porta em `application/metrics/ports`, adapter em `infrastructure/metrics`). Preferência é única por time — vale tanto para `/metrics` quanto `/metrics/developers` (mesmo componente `PeriodFilter`, mesmo cookie).

- `page.tsx` de `/metrics` e `/metrics/developers`: se `searchParams` não tiver `period` (abertura sem query, ex. clicar no menu), usa a preferência salva do time atual como default em `parseMetricsFilter`. Se a URL já especifica `period`, ela sempre vence — link direto/compartilhado não é sobrescrito pelo cookie.
- [period-filter.tsx](../../../src/presentation/metrics-dashboard/period-filter.tsx): `goTo` e `submitCustom`, além do `router.push` atual, disparam uma server action (`"use server"`) que grava o cookie via a porta acima. Sem `revalidatePath`/`router.refresh` nessa action — não pode reintroduzir o reflow removido em `343da31`.
- Troca de time (`selectTeamAction`) já redireciona para `/`; nada muda ali — ao navegar de volta para métricas, o cookie do time selecionado (se existir) já se aplica via `page.tsx`.

## 2. Modal "Personalizado" com hoje pré-selecionado

Mesmo arquivo, `defaultValue` dos dois `<input type="date">` (linhas 160-179): quando `customStart`/`customEnd` não vierem da URL (primeiro uso), cai para a data de hoje em vez de `undefined`. Quando já existe um período custom ativo (reabrindo o modal para ajustar), continua usando os valores existentes — sem mudança nesse caso.

## 3. Campos de task somem no erro — causa raiz e correção

Causa: [task-form-modal.tsx:174](../../../src/presentation/task/task-form-modal.tsx#L174) e o equivalente em `historical-task-form-modal.tsx` usam `<form action={handleSubmit}>` (React 19 form actions). Quando a função passada em `action` termina sem lançar exceção — o que sempre acontece aqui, mesmo no caminho de erro, que é capturado internamente e vira `setError(...)` — o React reseta os campos não controlados do formulário automaticamente, independente do estado de erro da aplicação. O modal permanece aberto mostrando o erro, mas os valores digitados já foram limpos.

Correção nos dois arquivos: trocar `<form action={handleSubmit}>` por `<form onSubmit={handleSubmit}>`, e `handleSubmit` passa a receber `React.FormEvent<HTMLFormElement>`, chamar `event.preventDefault()` e construir o `FormData` via `new FormData(event.currentTarget)`. Resto da lógica interna (validação, chamada da action, `setError`/`setPending`) não muda — só o fio de disparo do submit deixa de acionar o reset automático do React.

Steps controlados da `historical-task-form-modal.tsx` (array de status/data) já não são afetados por esse reset (são `useState`, não uncontrolled), então não precisam de mudança.

## Fora do escopo

- Sem endpoint/backend novo para a preferência de período — cookie client-driven é suficiente (não precisa persistir entre dispositivos).
- Sem preferência separada por tela (`/metrics` vs `/metrics/developers`) — uma só por time.
- Sem mudança em `selectTeamAction` ou no fluxo de troca de time.
