# Graph Report - developer-metrics  (2026-07-19)

## Corpus Check
- 265 files · ~130,553 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1199 nodes · 2299 edges · 144 communities (65 shown, 79 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.74)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ed8cbfa3`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- task.ts
- createTeamUseCases
- get-metrics-for-period.ts
- lead-cycle-time-chart.tsx
- Design: Endurecimento do projeto
- drizzle-task-repository.ts
- team-manage-view.tsx
- actions.ts
- compilerOptions
- Project Hardening Implementation Plan
- Design: Redesenho da página de métricas (resumo em 3 blocos)
- biome.json
- development-metrics-front
- Redesenho da Página de Métricas Implementation Plan
- Global Constraints
- flow-time-section.tsx
- Global Constraints
- metrics-dashboard.tsx
- devDependencies
- flow-composition-chart.tsx
- period.ts
- charts-section.tsx
- Guia do Projeto
- Global Constraints
- dependencies
- Design: Vínculo de origem entre tasks (bug ↔ task-pai)
- developer-metrics-dashboard.tsx
- Global Constraints
- Design: Gestão e seleção de time
- Design: Identidade visual — Painel de Instrumentos
- scripts
- Arquitetura
- guidelines.md
- Global Constraints
- Design: Métricas por desenvolvedor
- Global Constraints
- Global Constraints
- Design: Dashboard de métricas
- Global Constraints
- Design: Motor de métricas
- Design: Cadastro retroativo de card
- Design: Informações do quadro (contagem, bloqueios e prazo)
- Design: Colunas Testes e Aguardando Publicação
- Design: Indicador de semana/mês no dashboard
- Design: Quadro Kanban e Tasks
- Global Constraints
- Global Constraints
- Global Constraints
- Plano de hierarquia visual das métricas
- 0001_regular_venus.sql
- commit-msg.test.sh
- package.json
- 0000_classy_punisher.sql
- 0004_validate-task-status.sql
- 0005_task-status-testing-publication.sql
- 0010_robust_jack_murdock.sql
- commit-msg
- 0006_task-due-date-required.sql
- 0007_silent_midnight.sql
- 0008_late_hardball.sql
- CI Pipeline
- Global Constraints
- Global Constraints
- Global Constraints
- Hierarquia visual do dashboard de métricas
- next.config.ts
- @types/react
- @types/react-dom
- vitest
- BugEvent no snapshot de métricas
- Plano de métricas de bugs
- Ranking das cinco tasks que mais geraram bugs
- Referência às instruções de agentes
- Serviço Postgres 16
- Plano de implementação de gestão de times
- Bounded Context Task
- Composição de Task e Team na borda
- Quadro Kanban e Tasks
- Histórico de status e bloqueio de tasks
- Gestão global de tipos de task
- Dashboard de Métricas
- Oito cards de métricas
- MetricsDashboard
- Gráficos de evolução com Recharts
- Séries semanais e mensais pré-carregadas no servidor
- Filtro de período da URL como entrada não confiável
- Definição unificada de task concluída no período
- MetricsQueryPort
- Motor de Métricas
- PeriodMetrics
- Contexto de leitura sem entidades de domínio
- Gráficos de Tendência Implementation Plan
- Identidade Visual Implementation Plan
- CurrentTeamStore baseado em cookie
- Gestão e seleção de time
- Navegação nativa após excluir time
- Modais de time com parallel e intercepting routes
- SubmitButton compartilhado
- Gate único de time na home
- Cadastro Retroativo de Card
- Informações do Quadro
- Colunas Testes e Aguardando Publicação
- Indicador de Semana/Mês no Dashboard
- Endurecimento do Projeto
- Redesenho da Página de Métricas
- Resumo de Métricas em Três Blocos
- Janela Histórica de Oito Períodos
- Gráficos de Tendência no Dashboard
- Due Date Obrigatória
- Identidade Visual Painel de Instrumentos
- Readout
- Self-join para resolver task de origem
- Mudança restrita à camada de apresentação
- Arquitetura do projeto
- Regras de Dependência e Arquitetura
- Indicador imutável isBug
- ParentTaskId autorreferenciado
- Plano de vínculo de origem entre tasks
- Design do quadro Kanban e Tasks
- Design do dashboard de métricas
- Design do motor de métricas
- Bugs abertos por período
- Design de métricas de bugs
- Ranking de bugs agrupado por task-pai
- Cores semânticas dos indicadores
- Design da hierarquia visual do dashboard
- Não criar histórico de WIP decorativo
- Exclusão da task-pai preserva filhos como órfãos
- Validação de referências entre tasks
- Design do vínculo de origem entre tasks
- Métricas do dashboard
- Períodos semanal, quinzenal e mensal
- Vínculo de task de origem

## God Nodes (most connected - your core abstractions)
1. `createTeamUseCases()` - 47 edges
2. `createTaskUseCases()` - 27 edges
3. `TeamRepository` - 24 edges
4. `TaskRepository` - 23 edges
5. `ApplicationError` - 22 edges
6. `Global Constraints` - 22 edges
7. `TaskStatus` - 20 edges
8. `getMetricsForRange()` - 19 edges
9. `TaskTypeRepository` - 19 edges
10. `PeriodType` - 18 edges

## Surprising Connections (you probably didn't know these)
- `CI Pipeline` --implements--> `Gates de Qualidade`  [INFERRED]
  .github/workflows/ci.yml → techdocs/guidelines.md
- `globalSetup()` --calls--> `migrateDatabase()`  [EXTRACTED]
  tests/integration/global-setup.ts → scripts/migrate-database.ts
- `setup()` --calls--> `migrateDatabase()`  [EXTRACTED]
  vitest.global-setup.ts → scripts/migrate-database.ts
- `globalSetup()` --calls--> `getTestDatabaseUrl()`  [EXTRACTED]
  tests/integration/global-setup.ts → scripts/test-database-url.ts
- `resetDatabase()` --calls--> `getTestDatabaseUrl()`  [EXTRACTED]
  tests/integration/reset-db.ts → scripts/test-database-url.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Fundação do vínculo e métricas de bugs** — docs_superpowers_specs_2026_07_19_task_parent_link_design_vinculo_task_pai_design, docs_superpowers_specs_2026_07_19_bug_metrics_design_metricas_bugs_design, readme_vinculo_task_origem [INFERRED 0.95]
- **Quatro subprojetos do Development Metrics** — docs_superpowers_specs_2026_07_17_team_management_design_gestao_e_selecao_de_time, docs_superpowers_plans_2026_07_18_kanban_tasks_quadro_kanban_e_tasks, docs_superpowers_plans_2026_07_18_metrics_engine_motor_de_metricas, docs_superpowers_plans_2026_07_18_metrics_dashboard_dashboard_de_metricas [EXTRACTED 1.00]
- **Pipeline do histórico de tasks para o dashboard** — docs_superpowers_plans_2026_07_18_kanban_tasks_task_history, docs_superpowers_plans_2026_07_18_metrics_engine_metrics_query_port, docs_superpowers_plans_2026_07_18_metrics_engine_period_metrics, docs_superpowers_plans_2026_07_18_metrics_dashboard_metrics_dashboard [INFERRED 0.95]

## Communities (144 total, 79 thin omitted)

### Community 0 - "task.ts"
Cohesion: 0.09
Nodes (38): createHistoricalTaskAction(), parseDateOnly(), TaskHistoryRepository, CreateTaskData, TaskRepository, UpdateTaskData, TaskTypeRepository, createHistoricalTask() (+30 more)

### Community 1 - "createTeamUseCases"
Cohesion: 0.06
Nodes (57): selectTeamAction(), toActionState(), metadata, RootLayout(), TeamsModal(), ManageTeamModal(), HomePage(), createTeamAction() (+49 more)

### Community 2 - "get-metrics-for-period.ts"
Cohesion: 0.08
Nodes (47): MetricsPage(), BugRankingEntry, calculateBugsOpened(), calculateBugsRanking(), periodEnd, periodStart, ageInMs(), calculateCurrentWipMetrics() (+39 more)

### Community 3 - "lead-cycle-time-chart.tsx"
Cohesion: 0.19
Nodes (11): CurrentWipMetrics, LeadCycleTimeChart(), LeadCycleTimeChartProps, DurationTrendPoint, toDurationTrendSeries(), ageDetail(), CurrentStatusSection(), CurrentStatusSectionProps (+3 more)

### Community 4 - "Design: Endurecimento do projeto"
Cohesion: 0.06
Nodes (35): 10. Erros e pending, 1. Banco exclusivo de testes, 2. CI antecipada, 3. Cookie e parâmetros UUID, 4. Datas reais, 5. Validação e escopo das mutações, 6. Task e histórico atômicos, 7. Exclusão segura de time e membro (+27 more)

### Community 5 - "drizzle-task-repository.ts"
Cohesion: 0.08
Nodes (21): TEST_DATABASE_URL, migrateDatabase(), getTestDatabaseUrl(), DueDateTaskMetrics, client, db, createDrizzleMetricsQueryPort(), drizzleMetricsQueryPort (+13 more)

### Community 6 - "team-manage-view.tsx"
Cohesion: 0.12
Nodes (19): createTaskTypeAction(), deleteTaskTypeAction(), getText(), runTaskTypeAction(), toActionState(), updateTaskTypeAction(), TaskTypesPage(), INITIAL_ACTION_STATE (+11 more)

### Community 7 - "actions.ts"
Cohesion: 0.08
Nodes (50): CreateHistoricalTaskActionInput, createTaskAction(), CreateTaskActionInput, deleteTaskAction(), getCurrentTeamId(), moveTaskAction(), runTaskAction(), toActionState() (+42 more)

### Community 8 - "compilerOptions"
Cohesion: 0.06
Nodes (30): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+22 more)

### Community 9 - "Project Hardening Implementation Plan"
Cohesion: 0.07
Nodes (26): Exact file paths for Tasks 5–12, Final Verification, Global Constraints, PR 1 checkpoint, PR 1 — Proteções e automação, PR 2 checkpoint, PR 2 — Integridade das entradas e gravações, PR 3 checkpoint (+18 more)

### Community 10 - "Design: Redesenho da página de métricas (resumo em 3 blocos)"
Cohesion: 0.08
Nodes (23): Contexto e objetivo, Definição de cada métrica nova ou alterada, Design: Redesenho da página de métricas (resumo em 3 blocos), Edge cases, Layout, Motor de métricas (`application/metrics`, `infrastructure/metrics`), Presentation (`presentation/metrics-dashboard`), Testes (+15 more)

### Community 11 - "biome.json"
Cohesion: 0.08
Nodes (24): source, assist, actions, enabled, css, parser, files, ignoreUnknown (+16 more)

### Community 12 - "development-metrics-front"
Cohesion: 0.18
Nodes (11): Como rodar, development-metrics-front, Funcionalidades, Git hooks, Graphify, Integração contínua, Manutenção destas regras, Período e apresentação (+3 more)

### Community 13 - "Redesenho da Página de Métricas Implementation Plan"
Cohesion: 0.08
Nodes (22): Global Constraints, Redesenho da Página de Métricas Implementation Plan, Self-Review Notes, Task 1: Application — tipos do motor (`WipBreakdown`, `dueDate` no evento de conclusão), Task 2: Infrastructure — query de WIP estruturada e `dueDate` no evento de conclusão, Task 3: Application — retrabalho em contagem e não planejados, Task 4: Application — `get-metrics-for-period` expõe os campos novos, Task 5: Application — simplificar `get-metrics-dashboard` (sem séries semanais/mensais) (+14 more)

### Community 14 - "Global Constraints"
Cohesion: 0.09
Nodes (23): Global Constraints, Quadro Kanban e Tasks — Implementation Plan, Task 10: Repositório Drizzle de TaskType, Task 11: Repositório Drizzle de Task, Task 12: Repositório Drizzle de histórico de Task, Task 13: Composition root de Task, Task 14: Header — link "Tipos de task", Task 15: Tela `/task-types` (+15 more)

### Community 15 - "flow-time-section.tsx"
Cohesion: 0.16
Nodes (15): MetricTaskEvidence, ChartCard(), ChartCardProps, DurationTile(), FlowTimeSection(), FlowTimeSectionProps, METRIC_DEFINITIONS, MetricDefinition (+7 more)

### Community 16 - "Global Constraints"
Cohesion: 0.10
Nodes (20): Gestão e Seleção de Time — Implementation Plan, Global Constraints, Self-Review, Task 10: Repositório Drizzle de Team, Task 11: Armazenamento do time atual em cookie, Task 12: Composition root de Team, Task 13: Tela `/teams` — seleção e criação de time, Task 14: Tela `/teams/[teamId]` — gerenciar time (+12 more)

### Community 17 - "metrics-dashboard.tsx"
Cohesion: 0.40
Nodes (8): capitalize(), formatDayMonth(), formatPeriodLabel(), formatPeriodShortLabel(), formatSprintLabel(), getIsoWeekNumber(), MetricsDashboard(), MetricsDashboardProps

### Community 18 - "devDependencies"
Cohesion: 0.11
Nodes (19): @biomejs/biome, drizzle-kit, knip, devDependencies, @biomejs/biome, drizzle-kit, knip, @playwright/test (+11 more)

### Community 19 - "flow-composition-chart.tsx"
Cohesion: 0.31
Nodes (6): PeriodMetrics, FlowCompositionChart(), FlowCompositionChartProps, SEGMENTS, FlowCompositionData, toFlowCompositionData()

### Community 20 - "period.ts"
Cohesion: 0.16
Nodes (16): DeveloperMetricsPage(), getFortnightRange(), getMonthRange(), getPeriodRange(), getPreviousPeriods(), getWeekRange(), PeriodRange, buildMetricsUrl() (+8 more)

### Community 21 - "charts-section.tsx"
Cohesion: 0.14
Nodes (16): PeriodType, HistoricalPeriodMetrics, BugsOpenedChart(), BugsOpenedChartProps, ChartsSection(), ChartsSectionProps, PlannedDeliveredChart(), PlannedDeliveredChartProps (+8 more)

### Community 22 - "Guia do Projeto"
Cohesion: 0.12
Nodes (16): Banco de dados, Biome, Commit sem card e sem contexto específico, Commit sem card, mas com contexto, Commit vinculado a um card, Convenções gerais, Código de servidor, Descrição (+8 more)

### Community 23 - "Global Constraints"
Cohesion: 0.13
Nodes (14): Global Constraints, Gráficos de tendência no dashboard de métricas Implementation Plan, Task 10: Seção de gráficos no dashboard, Task 11: Testes E2E dos gráficos, Task 12: Verificação final, Task 1: Dependência do Recharts e cores do gráfico de composição, Task 2: Histórico de períodos no motor de métricas, Task 3: Rótulo curto de período para o eixo X (+6 more)

### Community 24 - "dependencies"
Cohesion: 0.13
Nodes (15): drizzle-orm, lucide-react, next, dependencies, drizzle-orm, lucide-react, next, postgres (+7 more)

### Community 25 - "Design: Vínculo de origem entre tasks (bug ↔ task-pai)"
Cohesion: 0.13
Nodes (13): Contexto e objetivo, Design: Métricas de bugs no dashboard, Edge cases, Motor de métricas (`application/metrics`), Presentation (`presentation/metrics-dashboard/`), Testes, Contexto e objetivo, Design: Vínculo de origem entre tasks (bug ↔ task-pai) (+5 more)

### Community 26 - "developer-metrics-dashboard.tsx"
Cohesion: 0.19
Nodes (11): DeveloperMetricEvidence, DeveloperMetricsDashboard(), DeveloperMetricsDashboardProps, formatDurationOrEmpty(), formatPercentOrEmpty(), nullableCount(), DeveloperSelector(), DeveloperSelectorProps (+3 more)

### Community 27 - "Global Constraints"
Cohesion: 0.15
Nodes (13): Dashboard de Métricas Implementation Plan, Global Constraints, Task 10: Dashboard, página `/metrics` e navegação no header, Task 11: Testes E2E do dashboard e verificação final, Task 1: Dependência Recharts e cores das séries, Task 2: Parser do filtro de período na URL, Task 3: Deslocamento de período (setas ‹ ›), Task 4: Formatação de duração e percentual (+5 more)

### Community 28 - "Design: Gestão e seleção de time"
Cohesion: 0.15
Nodes (13): Arquitetura (camadas), Banco de dados, Bug: loop infinito ao excluir o time atual (2026-07-18), Confirmação de exclusão e estado de envio (2026-07-18), Contexto e objetivo, Design: Gestão e seleção de time, Edge cases, Estilização (+5 more)

### Community 29 - "Design: Identidade visual — Painel de Instrumentos"
Cohesion: 0.15
Nodes (13): Arquitetura, Contexto e objetivo, Cor, Design: Identidade visual — Painel de Instrumentos, Edge cases, Elemento-assinatura, Layout, Movimento (+5 more)

### Community 30 - "scripts"
Cohesion: 0.15
Nodes (13): scripts, build, db:generate, db:migrate, dev, knip, lint, lint:fix (+5 more)

### Community 31 - "Arquitetura"
Cohesion: 0.17
Nodes (12): Application, Arquitetura, Camadas, Composition root, Domain, Estrutura de pastas, Fronteiras e mapeamento, Infrastructure (+4 more)

### Community 33 - "Global Constraints"
Cohesion: 0.20
Nodes (10): Global Constraints, Motor de Métricas Implementation Plan, Task 1: Cálculo de períodos (semana/mês), Task 2: Port de consulta e fake para testes, Task 3: Fórmulas de duração (lead time, cycle time, bloqueio, code review), Task 4: Fórmulas de taxa (retrabalho e previsibilidade), Task 5: Casos de uso `getMetricsForPeriod` e `getMetricsSeries`, Task 6: Índices de banco para as consultas de métricas (+2 more)

### Community 34 - "Design: Métricas por desenvolvedor"
Cohesion: 0.17
Nodes (11): Apoio, Contexto e objetivo, Conteúdo da página, Dados e regras, Design: Métricas por desenvolvedor, Entrega, Estados e erros, Fora do escopo (+3 more)

### Community 35 - "Global Constraints"
Cohesion: 0.22
Nodes (8): Cadastro Retroativo de Card Implementation Plan, Final Verification, Global Constraints, Task 1: Port e persistência — `createWithExplicitHistory`, Task 2: Caso de uso `createHistoricalTask`, Task 3: Regressão das métricas para card retroativo em andamento, Task 4: Server Action, composição e modal, Task 5: E2E e README

### Community 36 - "Global Constraints"
Cohesion: 0.22
Nodes (8): Global Constraints, Identidade Visual — Painel de Instrumentos Implementation Plan, Task 1: Paleta grafite única e tokens novos, Task 2: Fontes — JetBrains Mono e IBM Plex Sans, Task 3: Header — marca com cursor e navegação por abas, Task 4: Corrige contraste de elementos que assumiam tema claro, Task 5: Valores de métrica em mono, cores e tooltip do gráfico, Task 6: Verificação final

### Community 37 - "Design: Dashboard de métricas"
Cohesion: 0.22
Nodes (9): Arquitetura, Biblioteca de gráficos, Contexto e objetivo, Design: Dashboard de métricas, Edge cases, Filtro de período (topo da página), Layout, Navegação entre as 2 áreas (+1 more)

### Community 38 - "Global Constraints"
Cohesion: 0.25
Nodes (7): Colunas Testes e Aguardando Publicação Implementation Plan, Final Verification, Global Constraints, Task 1: Domain e apresentação — novas colunas do quadro, Task 2: Persistência — migração dos CHECK constraints, Task 3: Motor de métricas — generalizar retrabalho e WIP, Task 4: Motor de métricas — tempo em status genérico e métricas novas

### Community 39 - "Design: Motor de métricas"
Cohesion: 0.25
Nodes (8): Arquitetura, Contexto e objetivo, Definição de cada métrica, Design: Motor de métricas, Edge cases, Estratégia de cálculo, Períodos, Testes

### Community 40 - "Design: Cadastro retroativo de card"
Cohesion: 0.25
Nodes (8): Arquitetura, Comportamento de um card "ainda em andamento" (sem chegar em DONE), Contexto e objetivo, Design: Cadastro retroativo de card, Edge cases, Regras, Testes, UI

### Community 41 - "Design: Informações do quadro (contagem, bloqueios e prazo)"
Cohesion: 0.25
Nodes (8): Arquitetura, Contagem por coluna, Contexto e objetivo, Design: Informações do quadro (contagem, bloqueios e prazo), Edge cases, Faixa de resumo, Prazo no card, Testes

### Community 42 - "Design: Colunas Testes e Aguardando Publicação"
Cohesion: 0.25
Nodes (8): Arquitetura (arquivos alterados), Contexto e objetivo, Design: Colunas Testes e Aguardando Publicação, Edge cases, Modelo de dados, Mudanças no motor de métricas, Quadro (Kanban), Testes

### Community 43 - "Design: Indicador de semana/mês no dashboard"
Cohesion: 0.25
Nodes (7): Arquitetura, Contexto e objetivo, Design: Indicador de semana/mês no dashboard, Edge cases, Fonte de dados, Formato do rótulo, Testes

### Community 44 - "Design: Quadro Kanban e Tasks"
Cohesion: 0.29
Nodes (7): Arquitetura (camadas), Contexto e objetivo, Design: Quadro Kanban e Tasks, Edge cases, Modelo de dados (domain), Rotas e telas, Testes

### Community 45 - "Global Constraints"
Cohesion: 0.33
Nodes (5): Final Verification, Global Constraints, Informações do Quadro Implementation Plan, Task 1: Prazo no card, Task 2: Faixa de resumo e contagem por coluna

### Community 46 - "Global Constraints"
Cohesion: 0.33
Nodes (5): Final Verification, Global Constraints, Indicador de Semana/Mês no Dashboard Implementation Plan, Task 1: `formatPeriodLabel`, Task 2: Renderizar o rótulo no dashboard

### Community 47 - "Global Constraints"
Cohesion: 0.18
Nodes (10): Global Constraints, Métricas de bugs no dashboard Implementation Plan, Task 1: `bugEvents` no snapshot do motor de métricas, Task 2: Fórmulas `calculateBugsOpened` e `calculateBugsRanking`, Task 3: `bugsOpened`/`bugsRanking` em `PeriodMetrics`, Task 4: Definições dos indicadores de bugs, Task 5: Série do gráfico de bugs abertos, Task 6: Gráfico de bugs abertos e lista de ranking no painel (+2 more)

### Community 50 - "0001_regular_venus.sql"
Cohesion: 0.40
Nodes (4): "task_blocked_periods", "task_status_changes", "task_types", "tasks"

### Community 51 - "commit-msg.test.sh"
Cohesion: 0.83
Nodes (3): assert_invalid(), assert_valid(), commit-msg.test.sh script

### Community 52 - "package.json"
Cohesion: 0.50
Nodes (3): name, private, version

### Community 62 - "Global Constraints"
Cohesion: 0.18
Nodes (10): Global Constraints, Task 1: Fundação de dados — `isBug`, `parentTaskId` e tipos, Task 2: Vínculo na criação de tasks, Task 3: Vínculo na edição de tasks, Task 4: Proteger o tipo Bug contra exclusão, Task 5: Contagem de filhos no board (`listTasksByTeam`), Task 6: Campo "Task de origem" no formulário, Task 7: Badges de bugs/vínculos e linha de origem no card (+2 more)

### Community 63 - "Global Constraints"
Cohesion: 0.22
Nodes (8): Global Constraints, Métricas por desenvolvedor Implementation Plan, Self-Review Notes, Task 1: Filtrar o snapshot existente por responsável, Task 2: Calcular métricas individuais e evidências, Task 3: Fazer o filtro de período preservar o desenvolvedor, Task 4: Montar a página e o seletor de desenvolvedor, Task 5: Verificação final

### Community 64 - "Global Constraints"
Cohesion: 0.25
Nodes (7): Global Constraints, Metrics Layout Hierarchy Implementation Plan, Task 1: Reorganizar o cabeçalho e os controles, Task 2: Criar hierarquia entre os blocos de indicadores, Task 3: Separar visualmente a área de tendências, Task 4: Verificação final e entrega da prévia, Task 5: Aplicar cores semânticas e ícones

### Community 65 - "Hierarquia visual do dashboard de métricas"
Cohesion: 0.25
Nodes (7): Cores e informação nos cards, Direção visual, Escopo técnico, Hierarquia visual do dashboard de métricas, Objetivo, Responsividade e acessibilidade, Verificação

## Knowledge Gaps
- **553 isolated node(s):** `$schema`, `enabled`, `clientKind`, `useIgnoreFile`, `ignoreUnknown` (+548 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **79 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createTeamUseCases()` connect `createTeamUseCases` to `get-metrics-for-period.ts`, `period.ts`, `team-manage-view.tsx`, `actions.ts`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `TaskStatus` connect `actions.ts` to `task.ts`, `get-metrics-for-period.ts`, `drizzle-task-repository.ts`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **What connects `$schema`, `enabled`, `clientKind` to the rest of the system?**
  _564 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `task.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09151138716356108 - nodes in this community are weakly interconnected._
- **Should `createTeamUseCases` be split into smaller, more focused modules?**
  _Cohesion score 0.06040152301834545 - nodes in this community are weakly interconnected._
- **Should `get-metrics-for-period.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08013640238704177 - nodes in this community are weakly interconnected._
- **Should `Design: Endurecimento do projeto` be split into smaller, more focused modules?**
  _Cohesion score 0.05555555555555555 - nodes in this community are weakly interconnected._