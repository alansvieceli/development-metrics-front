# Design: Identidade visual — Painel de Instrumentos

Data: 2026-07-19
Aplica-se a todas as telas existentes e às specs desta rodada ([2026-07-18-kanban-testing-publication-columns-design.md](./2026-07-18-kanban-testing-publication-columns-design.md), [2026-07-18-kanban-board-info-design.md](./2026-07-18-kanban-board-info-design.md), [2026-07-18-metrics-period-label-design.md](./2026-07-18-metrics-period-label-design.md), [2026-07-18-historical-task-entry-design.md](./2026-07-18-historical-task-entry-design.md)). Define só a camada visual — não muda nenhuma regra de negócio, dado ou comportamento já definido nelas.

## Contexto e objetivo

O app hoje usa o visual padrão do `create-next-app` (fonte Geist, header azul-marinho genérico, acento azul `#2563eb`) — o "template" que qualquer projeto novo do Next.js sai com. Definir uma identidade visual própria e coerente com o que a ferramenta é: um painel de acompanhamento do fluxo de trabalho de um time (etapas, tempo, gargalo).

Direção escolhida após comparação visual de 3 propostas (linha de metrô, painel de instrumentos, caderno de bordo): **Painel de Instrumentos** — um console de operação técnico, grafite escuro, leitura tipo telemetria.

## Por que não é o "visual genérico de IA"

Fundo escuro + um acento chamativo é um dos padrões mais repetidos em UI gerada por IA. Diferenciação deliberada em relação a esse padrão:

- Grafite neutro (`#1c1f22`), não preto puro.
- Paleta de **3 estados com significado real** (teal = saudável, âmbar = aviso, vermelho = crítico), não um único acento decorativo usado em tudo.
- Tipografia toda monoespaçada — inclusive títulos, não só dados — reforçando a leitura "telemetria/console", uma escolha específica em vez do sans genérico padrão.
- O elemento-assinatura (readout) é **funcional**, reaproveitado em todo canto que exibe um número ou estado; não é um gradiente/glow decorativo solto.

## Tema

Só escuro — sem tema claro. Remove o bloco `@media (prefers-color-scheme: light)` de `globals.css`; o app sempre usa a paleta grafite, independente da preferência do sistema.

## Token system

### Cor

| Token | Hex | Uso |
| --- | --- | --- |
| `--ink` | `#1c1f22` | Fundo da página |
| `--panel` | `#24282c` | Header, colunas, chips |
| `--panel-raised` | `#2a2f33` | Cards |
| `--foreground` | `#e5e7eb` | Texto primário |
| `--foreground-muted` | `#9ca3af` | Labels, texto secundário |
| `--border` | `#34383c` | Hairlines |
| `--signal` | `#2dd4bf` | Estado saudável/primário (nav ativo, readout neutro-positivo) |
| `--warn` | `#f5a623` | Aviso (prazo perto de vencer) |
| `--critical` | `#ef4444` | Crítico (bloqueado, prazo estourado) |

### Tipografia

- **Display** (marca, títulos de página, cabeçalho de coluna): JetBrains Mono, peso 700.
- **Corpo** (descrição de card, texto corrido): IBM Plex Sans, peso 400/500.
- **Dado/utilitário** (ids, datas, números de métrica, readouts): JetBrains Mono, peso 500.

A fonte Geist (Sans/Mono) do template padrão do Next.js é removida.

### Layout

- **Header**: barra `--panel`, marca "DEV·METRICS_" com cursor piscante sutil (mono), nav como abas mono com a rota ativa indicada por um ponto colorido (`--signal`) em vez de sublinhado.
- **Quadro**: colunas como "baias de painel" com borda hairline (`--border`); cabeçalho da coluna mostra o label + a contagem (spec C) num readout.
- **Card**: mantém a borda colorida à esquerda por tipo de task (já existente); ganha o badge de prazo (spec C) num readout colorido conforme o status de vencimento — neutro / `--warn` / `--critical`.
- **Faixa de resumo** (spec C): chips com ponto indicador; o chip de bloqueados pulsa sutilmente quando a contagem é maior que zero.
- **Dashboard**: cada métrica vira um "gauge" — valor em destaque em mono, gráfico de tendência abaixo. O rótulo de período (spec D) é desenhado como um readout: `SEMANA 29 · 13/07–19/07`.

A paleta exata das linhas do gráfico (Recharts) fica para o momento da implementação, seguindo a skill de dataviz do projeto — aqui só fica definido que o traço primário usa `--signal` e estados de alerta usam `--warn`/`--critical`, consistente com o resto do sistema.

### Elemento-assinatura

O **readout**: chip mono com fundo `--ink`, borda hairline e leve brilho interno (`box-shadow` inset) na cor do estado. Reaproveitado em quatro lugares: contagem de coluna, chips da faixa de resumo, badge de prazo no card, e rótulo de período no dashboard. É o único elemento "ousado" do sistema — o resto é sóbrio, sem gradiente ou sombra decorativa.

### Movimento

Mínimo: cursor piscante na marca do header, pulso sutil no indicador de bloqueados quando > 0. Nada além disso. Ambos respeitam `prefers-reduced-motion: reduce` (ficam estáticos, mantendo a cor/estado).

## Arquitetura

```text
src/app/globals.css
  # novos tokens (--ink, --panel, --panel-raised, --signal, --warn, --critical, --border,
  # --foreground, --foreground-muted); remove o bloco de tema claro

src/presentation/shared/root-shell.tsx
  # troca as fontes Geist Sans/Mono por JetBrains Mono + IBM Plex Sans (next/font/google)

src/app/layout.tsx
  # header com a marca e a nav no novo estilo

src/presentation/task/
  kanban-board.tsx, task-card.tsx, board-summary.tsx, due-date-status.ts
  # aplicam os tokens novos — sem alterar as regras definidas nas specs de Kanban/Tasks, B e C

src/presentation/metrics-dashboard/
  metric-card.tsx, format-period-label.ts, ...
  # aplicam os tokens novos — sem alterar as regras definidas no motor de métricas ou na spec D
```

Nenhuma mudança de dado, caso de uso ou regra de negócio: é só a camada de apresentação (CSS, fontes, classes) por cima do que já foi definido nas specs anteriores.

## Edge cases

- **`prefers-reduced-motion: reduce`**: cursor piscante e pulso do indicador de bloqueados ficam estáticos, sem remover a informação (cor/estado continuam presentes).
- **Contraste**: `--foreground` (`#e5e7eb`) sobre `--ink` (`#1c1f22`) e sobre `--panel` (`#24282c`) atende contraste mínimo AA para texto normal; `--foreground-muted` (`#9ca3af`) é reservado para labels/texto secundário, não para texto de leitura primária.
- **Fonte não carregada** (rede bloqueada/offline): `next/font/google` já gera um fallback local automaticamente — comportamento padrão do Next.js, sem CSS adicional necessário.

## Testes

Mudança puramente visual (CSS, fontes, classes) — sem lógica nova para testar unitariamente. Os testes de integração/E2E existentes (`kanban-board.spec.ts`, `metrics-dashboard.spec.ts`) continuam validando comportamento por `data-testid`/texto, não por cor. Revisão manual (screenshot) confirma a aplicação dos tokens antes de considerar a mudança concluída.
