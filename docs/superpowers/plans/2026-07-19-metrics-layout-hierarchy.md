# Metrics Layout Hierarchy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Melhorar a hierarquia visual e aplicar cores semânticas ao dashboard de métricas sem alterar os dados, cálculos, filtros ou interações existentes.

**Architecture:** A mudança fica inteiramente em `src/presentation/metrics-dashboard`. Os componentes e props atuais permanecem iguais; somente composição JSX e classes Tailwind são ajustadas. Nenhuma dependência ou token global novo será criado.

**Tech Stack:** Next.js App Router, React, TypeScript estrito, Tailwind CSS v4 e Recharts.

## Global Constraints

- Não alterar `domain`, `application`, `infrastructure`, `composition` ou consultas.
- Não adicionar, remover ou renomear métricas.
- Preservar textos, ações, parâmetros de URL e comportamento responsivo.
- Não adicionar dependências; reutilizar `lucide-react` para os ícones.
- Não desenhar histórico de WIP: o contrato atual fornece somente o snapshot.
- Não criar testes que dependam de classes CSS; usar a suíte existente como regressão.
- Não criar commit: todo o plano deve permanecer visível no worktree para revisão.

---

### Task 1: Reorganizar o cabeçalho e os controles

**Files:**
- Modify: `src/presentation/metrics-dashboard/metrics-dashboard.tsx`
- Modify: `src/presentation/metrics-dashboard/period-filter.tsx`

**Interfaces:**
- Consumes: `periodType`, `referenceDate`, `current` e `history` existentes.
- Produces: as mesmas props e ações de navegação já expostas pelos componentes.

- [ ] **Step 1: Reestruturar o cabeçalho do dashboard**

Separar identificação, título/período e controles em duas áreas responsivas. Usar
um rótulo auxiliar “Visão do time”, título maior, período como readout e controles
agrupados em uma superfície com borda. Manter `MetricInfoButton` e `PeriodFilter`
sem mudanças de dados ou handlers.

- [ ] **Step 2: Tornar o filtro responsivo**

Trocar a altura fixa do contêiner por `flex-wrap`, permitindo que os controles
quebrem linha em telas estreitas. Preservar os cinco botões, seus rótulos,
`aria-pressed`, URLs e callbacks atuais.

- [ ] **Step 3: Verificar a task**

Run: `npm run typecheck && npm run lint`

Expected: ambos passam sem erros.

---

### Task 2: Criar hierarquia entre os blocos de indicadores

**Files:**
- Modify: `src/presentation/metrics-dashboard/current-status-section.tsx`
- Modify: `src/presentation/metrics-dashboard/week-result-section.tsx`
- Modify: `src/presentation/metrics-dashboard/flow-time-section.tsx`
- Modify: `src/presentation/metrics-dashboard/stat-tile.tsx`

**Interfaces:**
- Consumes: `WipBreakdown`, `PeriodMetrics`, `DurationStats` e `MetricKey` atuais.
- Produces: os mesmos componentes e `data-testid` existentes.

- [ ] **Step 1: Padronizar títulos de seção**

Adicionar índice visual (`01`, `02`, `03`) e aumentar o contraste dos títulos,
sem alterar o texto acessível nem a ordem Situação atual → Resultado da semana →
Tempo do fluxo.

- [ ] **Step 2: Destacar o bloco de resultado**

Usar uma linha lateral em `--accent` no bloco Resultado da semana para criar o
ponto focal da página, mantendo a mesma grade e os mesmos quatro valores.

- [ ] **Step 3: Refinar os tiles**

Aumentar o valor para `text-2xl`, reduzir o peso visual do rótulo com caixa alta
e tracking, garantir altura mínima consistente e manter `title`, conteúdo
secundário e `data-testid` intactos.

- [ ] **Step 4: Verificar a task**

Run: `npm run typecheck && npm run lint && npm test -- src/presentation/metrics-dashboard`

Expected: tipos e lint passam; testes focados ficam verdes.

---

### Task 3: Separar visualmente a área de tendências

**Files:**
- Modify: `src/presentation/metrics-dashboard/charts/charts-section.tsx`
- Modify: `src/presentation/metrics-dashboard/charts/chart-card.tsx`

**Interfaces:**
- Consumes: `periodType`, `current`, `history`, `MetricKey` e os quatro gráficos existentes.
- Produces: os mesmos gráficos e `data-testid`, sem mudar séries ou tooltips.

- [ ] **Step 1: Transformar tendências em painel final**

Adicionar índice visual `04`, cabeçalho mais forte e uma superfície externa
`--surface` que diferencie análise histórica do resumo atual.

- [ ] **Step 2: Dar profundidade aos cards de gráficos**

Usar `--background` nos cards internos, padding maior e título mais legível.
Preservar dimensões dos gráficos e todas as props do Recharts.

- [ ] **Step 3: Verificar a task**

Run: `npm run typecheck && npm run lint && npm test -- src/application/metrics src/presentation/metrics-dashboard`

Expected: tipos, lint e testes de métricas passam.

---

### Task 4: Verificação final e entrega da prévia

**Files:** nenhum arquivo novo de produção.

**Interfaces:**
- Consumes: todas as tasks anteriores.
- Produces: diff não commitado pronto para inspeção.

- [ ] **Step 1: Rodar verificações completas aplicáveis**

Run: `npm run typecheck && npm run lint && npm test && npm run knip`

Expected: todos os comandos passam sem erros.

- [ ] **Step 2: Confirmar o escopo do diff**

Run: `git diff --check && git status --short`

Expected: somente a spec, este plano e arquivos de
`src/presentation/metrics-dashboard` aparecem sem commit.

- [ ] **Step 3: Subir a prévia local**

Run: `npm run dev`

Expected: servidor local disponível para o usuário inspecionar `/metrics`.

---

### Task 5: Aplicar cores semânticas e ícones

**Files:**
- Modify: `src/presentation/metrics-dashboard/stat-tile.tsx`
- Modify: `src/presentation/metrics-dashboard/week-result-section.tsx`
- Modify: `src/presentation/metrics-dashboard/metrics-dashboard.tsx`

**Interfaces:**
- Consumes: `MetricKey`, os valores atuais e os tokens CSS já existentes.
- Produces: `StatTile` continua recebendo o mesmo indicador, mas aceita
  `ReactNode` em `value` e `secondary` para destacar partes auxiliares.

- [ ] **Step 1: Mapear indicador para ícone e cor**

Usar um mapa local em `stat-tile.tsx`: desempenho/WIP em `--accent`, bloqueio em
`--critical`, review/cycle time em `--chart-tertiary`, testes em
`--chart-quinary` e publicação em `--accent`. Renderizar o ícone em um círculo
colorido dentro do card.

- [ ] **Step 2: Aplicar fundo e borda coloridos**

Usar `color-mix()` inline para combinar o token semântico com `--background`,
mantendo contraste e evitando novos tokens globais.

- [ ] **Step 3: Destacar partes auxiliares dos resultados**

Em `week-result-section.tsx`, manter os mesmos números e destacar denominador,
`%`, `cards` e taxa de retrabalho com hierarquia tipográfica e cor.

- [ ] **Step 4: Adicionar calendário ao readout do período**

Renderizar `CalendarDays` no readout existente sem alterar o texto do período.

- [ ] **Step 5: Verificar sem commit**

Run: `npm run typecheck && npm run lint && npm test -- src/presentation/metrics-dashboard`

Expected: comandos passam; nenhum arquivo é commitado.
