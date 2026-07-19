# Design: Informações do quadro (contagem, bloqueios e prazo)

Data: 2026-07-18
Estende a spec [2026-07-17-kanban-tasks-design.md](./2026-07-17-kanban-tasks-design.md).

## Contexto e objetivo

O quadro hoje mostra as colunas e os cards, mas nenhuma visão agregada do que está acontecendo: quantos cards por coluna, quem está com quantos cards, quantos estão bloqueados, e se algum prazo está vencendo. Adicionar essas três informações sem criar nova busca de dados — tudo é derivado do que o quadro já carrega (`tasksByStatus`, `members`).

## Faixa de resumo

Novo componente, renderizado entre o título "Quadro" e as colunas:

- **Chip por responsável**: `"{nome}: {N}"`, contando cards ativos (todo status exceto `DONE`) atribuídos a cada membro. Só aparece um chip para responsáveis que têm ao menos 1 card ativo.
- **Chip "Sem responsável"**: mesma regra, para cards ativos sem `assigneeId`. Só aparece se houver ao menos 1.
- **Chip de bloqueios**: `"⛔ {N} bloqueados"`, contando todos os cards com `blocked === true` no quadro inteiro (qualquer coluna). Só aparece se `N > 0`.

Nenhum chip com contagem zero é exibido.

## Contagem por coluna

Cabeçalho de cada coluna passa a mostrar a contagem: `"{label} ({N})"`, ex. `"Code Review (4)"`. `N = tasksByStatus[status].length`, sempre exibido (mesmo com 0).

## Prazo no card

O card passa a exibir `dueDate` (quando não for `null`), com cor conforme a proximidade:

- **sem destaque** (cor padrão do texto): faltam mais de 2 dias para o prazo.
- **aviso (amarelo)**: faltam 2 dias ou menos, prazo ainda não passou.
- **estourado (vermelho)**: prazo já passou e a task não está em `DONE`.

Tasks em `DONE` não recebem destaque de prazo (já concluídas, independentemente de terem estourado durante o percurso — essa informação já é coberta pela métrica de previsibilidade).

## Arquitetura

```text
presentation/task/
  board-summary.tsx        # recebe tasksByStatus + members, calcula e renderiza os chips
  due-date-status.ts        # getDueDateStatus(dueDate, today) => "none" | "ok" | "warning" | "overdue" — função pura
  task-card.tsx              # usa due-date-status.ts para exibir o prazo com a cor certa
  kanban-board.tsx           # renderiza <BoardSummary> acima das colunas; cabeçalho da coluna ganha a contagem
```

Nenhuma mudança em `application`, `domain` ou `infrastructure`: `tasksByStatus` e `members` já chegam prontos em `KanbanBoard`; contagens e cor de prazo são agregação/formatação de apresentação sobre dado já carregado, sem invariante de negócio nova.

## Edge cases

- **Membro sem nenhum card ativo**: não aparece na faixa de resumo (evita lista de chips zerados para o time todo).
- **Todos os chips zerados** (quadro vazio ou sem bloqueios/responsáveis): faixa de resumo fica vazia — sem placeholder "nada aqui", simplesmente não renderiza chip nenhum.
- **`dueDate` exatamente hoje**: entra na faixa de aviso (2 dias ou menos), não em estourado.
- **Task bloqueada e com prazo estourado ao mesmo tempo**: os dois indicadores aparecem juntos (não são mutuamente exclusivos).

## Testes

- Unitário de `getDueDateStatus`: sem prazo, prazo distante, prazo em exatamente 2 dias, prazo hoje, prazo ontem (estourado), prazo estourado mas status `DONE` (não deve destacar).
- Integração/E2E em `kanban-board.spec.ts`: contagem da coluna reflete o número de cards, chip de responsável aparece com a contagem certa, chip de bloqueados aparece/some conforme cards são bloqueados/desbloqueados.
