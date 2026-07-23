# Graph Report - development-metrics-front  (2026-07-23)

## Corpus Check
- 366 files · ~188,551 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1573 nodes · 3247 edges · 187 communities (79 shown, 108 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.69)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f9761a47`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- kanban-board.tsx
- period.ts
- get-metrics-for-period.ts
- client.ts
- Design: Endurecimento do projeto
- createTeamUseCases
- actions.ts
- actions.ts
- compilerOptions
- devops/docker-compose.yml
- Project Hardening Implementation Plan
- Design: Redesenho da página de métricas (resumo em 3 blocos)
- flow-time-section.tsx
- biome.json
- Redesenho da Página de Métricas Implementation Plan
- Global Constraints
- charts-section.tsx
- Global Constraints
- sprint.ts
- devDependencies
- guidelines.md
- task.ts
- create-task.ts
- Guia do Projeto
- Global Constraints
- Design: Vínculo de origem entre tasks (bug ↔ task-pai)
- dependencies
- File Structure
- Global Constraints
- Design: Gestão e seleção de time
- Design: Identidade visual — Painel de Instrumentos
- scripts
- getTestDatabaseUrl
- metrics-query-port.ts
- flow-composition-chart.tsx
- Tarjas nos cards + filtro nas métricas — Implementation Plan
- Arquitetura
- Global Constraints
- Global Constraints
- developer-metrics-dashboard.tsx
- PIs e Sprints no quadro e nas métricas
- Global Constraints
- Global Constraints
- Global Constraints
- Design: Dashboard de métricas
- Global Constraints
- Design: Métricas por desenvolvedor
- Global Constraints
- Global Constraints
- Design: Motor de métricas
- Design: Cadastro retroativo de card
- Design: Informações do quadro (contagem, bloqueios e prazo)
- Design: Colunas Testes e Aguardando Publicação
- Hierarquia visual do dashboard de métricas
- Design: Tarjas nos cards + filtro de tarja nas métricas
- development-metrics-front
- Design: Quadro Kanban e Tasks
- Design: Indicador de semana/mês no dashboard
- ChartCard
- Global Constraints
- Global Constraints
- Global Constraints
- commit-msg.test.sh
- package.json
- layout.tsx
- Design: Polimento do filtro de período, botão de info e rodapé
- task-type.ts
- Design: Persistência do filtro de período por time + correção de reset de formulário de task
- create-fake-task-history-repository.ts
- charts-section.tsx
- commit-msg
- Design do quadro Kanban e Tasks
- Design do dashboard de métricas
- Design do motor de métricas
- Badge de período no cabeçalho repete a palavra já destacada no botão selecionado do filtro — removido o prefixo
- CI Pipeline
- next.config.ts
- Filtro de tarja em bugs usa a tarja do próprio card de bug, não da task de origem — diferente do filtro de desenvolvedor (parentTasks.assigneeId)
- Usar 'bugs associados', nunca 'bugs causados' — não atribui culpa ao desenvolvedor
- File Structure
- Referência às instruções de agentes
- Cookie único metrics-period-pref por time reaproveita o padrão de cookie-current-team-store, sem endpoint novo
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
- BugEvent no snapshot de métricas
- Plano de métricas de bugs
- Ranking das cinco tasks que mais geraram bugs
- Self-join para resolver task de origem
- Plano de hierarquia visual das métricas
- Mudança restrita à camada de apresentação
- Gráficos de Tendência Implementation Plan
- Indicador imutável isBug
- ParentTaskId autorreferenciado
- Plano de vínculo de origem entre tasks
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
- Bugs abertos por período
- Design de métricas de bugs
- Ranking de bugs agrupado por task-pai
- Cores semânticas dos indicadores
- Design da hierarquia visual do dashboard
- Não criar histórico de WIP decorativo
- Redesenho da Página de Métricas
- Resumo de Métricas em Três Blocos
- Janela Histórica de Oito Períodos
- Gráficos de Tendência no Dashboard
- Due Date Obrigatória
- Exclusão da task-pai preserva filhos como órfãos
- Validação de referências entre tasks
- Design do vínculo de origem entre tasks
- Identidade Visual Painel de Instrumentos
- Readout
- React 19 `<form action={fn}>` reseta campos não controlados mesmo no erro tratado internamente; trocar para onSubmit+preventDefault evita o reset
- saveMetricsPeriodPreferenceAction não chama revalidatePath/router.refresh para não reintroduzir o reflow removido no commit 343da31
- Sem nota, ranking, comparação nominal ou avaliação automática de desempenho
- Arquitetura do projeto
- Regras de Dependência e Arquitetura
- Sem TaskRepository.setTagsForTask separado: tagIds já viaja em CreateTaskData/UpdateTaskData e é persistido na mesma transação de escrita
- WIP não entra no histórico por desenvolvedor: banco não reconstrói WIP de data passada com segurança
- Botões Período atual/‹/› renderizados incondicionalmente com disabled para não encolher a barra ao trocar para Personalizado
- Preferência de período é única por time, vale para /metrics e /metrics/developers — não separar por tela
- Exclusão de tarja bloqueada quando countByTag > 0, mesmo padrão de delete-task-type.ts
- Limite de 0–3 tarjas por task é regra de aplicação, não constraint de banco (regra sobre conjunto de linhas em task_tags)
- Métrica: Tempo aguardando publicação
- Métrica: Tempo bloqueado
- Bugs abertos por período e top-5 tasks geradoras de bug
- Métrica: Ranking de bugs (top 5 por task-pai)
- Métrica: Bugs abertos
- Métrica: Tempo aguardando code review
- Métrica: Cycle time
- Métricas por desenvolvedor com evidências (líderes)
- Destaque de prazo (amarelo ≤2 dias, vermelho vencido)
- Workflow graphify: graph.json e GRAPH_REPORT.md versionados, atualizados via `graphify update .`
- Cadastro retroativo de card (sequência status+data)
- Quadro Kanban (TODO..DONE)
- Métrica: Lead time
- Dashboard com 15 indicadores, filtros semanal/quinzenal/mensal, 5 gráficos e ranking
- Regra de manutenção: mudança de fórmula/período atualiza README e testes na mesma alteração
- Filtro por até 2 tarjas no dashboard de métricas (semântica OR)
- Regras de período (semana/quinzena/mês, fim exclusivo, UTC)
- Métrica: Previsibilidade (cumprimento de dueDate)
- Métrica: Taxa de retrabalho
- Histórico de mudança de status e períodos de bloqueio
- Cadastro de tarjas (catálogo global nome+cor, até 3 por card)
- Task de origem opcional (badges de bug e vínculo)
- Cadastro de tipos de task (tipo Bug protegido)
- Cadastro de equipes e colaboradores
- Métrica: Tempo em testes
- Métrica: Throughput
- Métrica: WIP (fotografia atual)
- metrics-dashboard.tsx
- list-tasks-by-team.ts
- task-card.tsx
- tag-filter.tsx
- task.ts
- sprint.ts

## God Nodes (most connected - your core abstractions)
1. `createTeamUseCases()` - 53 edges
2. `createTaskUseCases()` - 39 edges
3. `ApplicationError` - 32 edges
4. `TaskRepository` - 29 edges
5. `ActionState` - 25 edges
6. `getMetricsForRange()` - 24 edges
7. `isUuid()` - 24 edges
8. `TeamRepository` - 24 edges
9. `HistoricalPeriodMetrics` - 23 edges
10. `TaskStatus` - 23 edges

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
- **Fluxo de persistência da preferência de período por time** — src_application_metrics_ports_metrics_period_preference_store, src_infrastructure_metrics_cookie_metrics_period_preference_store, src_application_metrics_use_cases_metrics_period_preference, src_app_actions, src_presentation_metrics_dashboard_period_filter, src_composition_metrics [INFERRED 0.85]
- **Fluxo de métricas por desenvolvedor (port → use-case → página → dashboard)** — src_application_metrics_ports_metrics_query_port, src_application_metrics_use_cases_get_developer_metrics, src_app_metrics_developers_page, src_presentation_developer_metrics_developer_metrics_dashboard, src_presentation_developer_metrics_developer_selector, src_composition_metrics [INFERRED 0.85]
- **Fluxo do catálogo de tarjas e do filtro por tarja nas métricas** — src_domain_task_entities_tag, src_application_task_ports_tag_repository, src_infrastructure_task_drizzle_tag_repository, src_application_task_use_cases_create_tag, src_application_task_use_cases_update_tag, src_application_task_use_cases_delete_tag, src_application_task_use_cases_list_tags, src_presentation_shared_tag_combobox, src_presentation_metrics_dashboard_tag_filter, src_infrastructure_metrics_drizzle_metrics_query_port [INFERRED 0.85]
- **Quatro subprojetos do Development Metrics** — docs_superpowers_specs_2026_07_17_team_management_design_gestao_e_selecao_de_time, docs_superpowers_plans_2026_07_18_kanban_tasks_quadro_kanban_e_tasks, docs_superpowers_plans_2026_07_18_metrics_engine_motor_de_metricas, docs_superpowers_plans_2026_07_18_metrics_dashboard_dashboard_de_metricas [EXTRACTED 1.00]
- **Pipeline do histórico de tasks para o dashboard** — docs_superpowers_plans_2026_07_18_kanban_tasks_task_history, docs_superpowers_plans_2026_07_18_metrics_engine_metrics_query_port, docs_superpowers_plans_2026_07_18_metrics_engine_period_metrics, docs_superpowers_plans_2026_07_18_metrics_dashboard_metrics_dashboard [INFERRED 0.95]

## Communities (187 total, 108 thin omitted)

### Community 0 - "kanban-board.tsx"
Cohesion: 0.16
Nodes (21): CreateHistoricalTaskActionInput, CreateTaskInput, TasksByStatus, UpdateTaskInput, Tag, Task, TaskStatus, TaskType (+13 more)

### Community 1 - "period.ts"
Cohesion: 0.13
Nodes (22): saveMetricsPeriodPreferenceAction(), DeveloperMetricsPage(), MetricsPage(), getFortnightRange(), getMonthRange(), getPeriodRange(), getPreviousPeriods(), getRollingRange() (+14 more)

### Community 2 - "get-metrics-for-period.ts"
Cohesion: 0.09
Nodes (21): File Structure, Global Constraints, PIs e Sprints — Atribuição de card e visão por sprint no quadro Implementation Plan, Próximo plano (fora deste escopo), Task 10: Composition root — wiring de `sprintAccess` e `listSprintsByTeam`, Task 11: Validação de `sprintId` nas Server Actions do quadro, Task 12: Filtro puro de tasks por sprint, Task 13: Seletor de visão "Atual / Por sprint" (+13 more)

### Community 3 - "client.ts"
Cohesion: 0.06
Nodes (31): CreateProgramIncrementData, ProgramIncrementRepository, listProgramIncrementsByTeam(), createFakeProgramIncrementRepository(), TaskHistoryRepository, ProgramIncrement, client, db (+23 more)

### Community 4 - "Design: Endurecimento do projeto"
Cohesion: 0.06
Nodes (35): 10. Erros e pending, 1. Banco exclusivo de testes, 2. CI antecipada, 3. Cookie e parâmetros UUID, 4. Datas reais, 5. Validação e escopo das mutações, 6. Task e histórico atômicos, 7. Exclusão segura de time e membro (+27 more)

### Community 5 - "createTeamUseCases"
Cohesion: 0.05
Nodes (59): selectTeamAction(), toActionState(), metadata, RootLayout(), TeamsModal(), ManageTeamModal(), HomePage(), createTeamAction() (+51 more)

### Community 6 - "actions.ts"
Cohesion: 0.39
Nodes (5): PeriodFilter(), PeriodFilterProps, toDateParam(), shiftReferenceDate(), WINDOW_DAYS

### Community 7 - "actions.ts"
Cohesion: 0.13
Nodes (18): ActionState, INITIAL_ACTION_STATE, TagWithUsage, TaskTypeWithUsage, SubmitButton(), SubmitButtonProps, ProgramIncrementFormProps, SprintFormProps (+10 more)

### Community 8 - "compilerOptions"
Cohesion: 0.06
Nodes (30): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+22 more)

### Community 9 - "devops/docker-compose.yml"
Cohesion: 1.00
Nodes (3): devops/docker-compose.yml, Serviço app (build devops/Dockerfile, porta 3000), Serviço postgres (postgres:16, healthcheck pg_isready)

### Community 10 - "Project Hardening Implementation Plan"
Cohesion: 0.07
Nodes (26): Exact file paths for Tasks 5–12, Final Verification, Global Constraints, PR 1 checkpoint, PR 1 — Proteções e automação, PR 2 checkpoint, PR 2 — Integridade das entradas e gravações, PR 3 checkpoint (+18 more)

### Community 11 - "Design: Redesenho da página de métricas (resumo em 3 blocos)"
Cohesion: 0.08
Nodes (23): Contexto e objetivo, Definição de cada métrica nova ou alterada, Design: Redesenho da página de métricas (resumo em 3 blocos), Edge cases, Layout, Motor de métricas (`application/metrics`, `infrastructure/metrics`), Presentation (`presentation/metrics-dashboard`), Testes (+15 more)

### Community 12 - "flow-time-section.tsx"
Cohesion: 0.10
Nodes (25): DurationStats, MetricTaskEvidence, DeveloperMetricEvidence, DeveloperMetricsDashboard(), DeveloperMetricsDashboardProps, formatDurationOrEmpty(), formatPercentOrEmpty(), nullableCount() (+17 more)

### Community 13 - "biome.json"
Cohesion: 0.08
Nodes (24): source, assist, actions, enabled, css, parser, files, ignoreUnknown (+16 more)

### Community 14 - "Redesenho da Página de Métricas Implementation Plan"
Cohesion: 0.08
Nodes (22): Global Constraints, Redesenho da Página de Métricas Implementation Plan, Self-Review Notes, Task 1: Application — tipos do motor (`WipBreakdown`, `dueDate` no evento de conclusão), Task 2: Infrastructure — query de WIP estruturada e `dueDate` no evento de conclusão, Task 3: Application — retrabalho em contagem e não planejados, Task 4: Application — `get-metrics-for-period` expõe os campos novos, Task 5: Application — simplificar `get-metrics-dashboard` (sem séries semanais/mensais) (+14 more)

### Community 15 - "Global Constraints"
Cohesion: 0.09
Nodes (23): Global Constraints, Quadro Kanban e Tasks — Implementation Plan, Task 10: Repositório Drizzle de TaskType, Task 11: Repositório Drizzle de Task, Task 12: Repositório Drizzle de histórico de Task, Task 13: Composition root de Task, Task 14: Header — link "Tipos de task", Task 15: Tela `/task-types` (+15 more)

### Community 16 - "charts-section.tsx"
Cohesion: 0.15
Nodes (12): Encerramento da spec, File Structure, Global Constraints, PIs e Sprints — Filtro de sprint nas métricas Implementation Plan, Task 1: Corrigir `findBySprint` para reconstruir `Date`, Task 2: Use-case `getMetricsForSprint`, Task 3: Composition root, Task 4: `sprintId` em `MetricsSearchParams` (+4 more)

### Community 17 - "Global Constraints"
Cohesion: 0.10
Nodes (20): Gestão e Seleção de Time — Implementation Plan, Global Constraints, Self-Review, Task 10: Repositório Drizzle de Team, Task 11: Armazenamento do time atual em cookie, Task 12: Composition root de Team, Task 13: Tela `/teams` — seleção e criação de time, Task 14: Tela `/teams/[teamId]` — gerenciar time (+12 more)

### Community 18 - "sprint.ts"
Cohesion: 0.33
Nodes (6): BugRankingEntry, calculateBugsOpened(), calculateBugsRanking(), periodEnd, periodStart, BugEvent

### Community 19 - "devDependencies"
Cohesion: 0.11
Nodes (19): @biomejs/biome, drizzle-kit, knip, devDependencies, @biomejs/biome, drizzle-kit, knip, @playwright/test (+11 more)

### Community 21 - "task.ts"
Cohesion: 0.06
Nodes (65): createTagAction(), deleteTagAction(), getText(), runTagAction(), toActionState(), updateTagAction(), TagsPage(), createTaskTypeAction() (+57 more)

### Community 22 - "create-task.ts"
Cohesion: 0.32
Nodes (5): Member, DeveloperSelector(), DeveloperSelectorProps, BoardSummary(), BoardSummaryProps

### Community 23 - "Guia do Projeto"
Cohesion: 0.12
Nodes (16): Banco de dados, Biome, Commit sem card e sem contexto específico, Commit sem card, mas com contexto, Commit vinculado a um card, Convenções gerais, Código de servidor, Descrição (+8 more)

### Community 24 - "Global Constraints"
Cohesion: 0.13
Nodes (14): Global Constraints, Gráficos de tendência no dashboard de métricas Implementation Plan, Task 10: Seção de gráficos no dashboard, Task 11: Testes E2E dos gráficos, Task 12: Verificação final, Task 1: Dependência do Recharts e cores do gráfico de composição, Task 2: Histórico de períodos no motor de métricas, Task 3: Rótulo curto de período para o eixo X (+6 more)

### Community 25 - "Design: Vínculo de origem entre tasks (bug ↔ task-pai)"
Cohesion: 0.13
Nodes (13): Contexto e objetivo, Design: Métricas de bugs no dashboard, Edge cases, Motor de métricas (`application/metrics`), Presentation (`presentation/metrics-dashboard/`), Testes, Contexto e objetivo, Design: Vínculo de origem entre tasks (bug ↔ task-pai) (+5 more)

### Community 26 - "dependencies"
Cohesion: 0.13
Nodes (15): drizzle-orm, lucide-react, next, dependencies, drizzle-orm, lucide-react, next, postgres (+7 more)

### Community 27 - "File Structure"
Cohesion: 0.10
Nodes (19): File Structure, Global Constraints, PIs e Sprints — Fundação (domínio, persistência e cadastro) Implementation Plan, Próximos planos (fora deste escopo), Task 10: Repositório Drizzle de `Sprint`, Task 11: Composition root do contexto `sprint`, Task 12: Tela de cadastro `/sprints` — actions e página, Task 13: Componentes de apresentação — formulários e lista (+11 more)

### Community 28 - "Global Constraints"
Cohesion: 0.15
Nodes (13): Dashboard de Métricas Implementation Plan, Global Constraints, Task 10: Dashboard, página `/metrics` e navegação no header, Task 11: Testes E2E do dashboard e verificação final, Task 1: Dependência Recharts e cores das séries, Task 2: Parser do filtro de período na URL, Task 3: Deslocamento de período (setas ‹ ›), Task 4: Formatação de duração e percentual (+5 more)

### Community 29 - "Design: Gestão e seleção de time"
Cohesion: 0.15
Nodes (13): Arquitetura (camadas), Banco de dados, Bug: loop infinito ao excluir o time atual (2026-07-18), Confirmação de exclusão e estado de envio (2026-07-18), Contexto e objetivo, Design: Gestão e seleção de time, Edge cases, Estilização (+5 more)

### Community 30 - "Design: Identidade visual — Painel de Instrumentos"
Cohesion: 0.15
Nodes (13): Arquitetura, Contexto e objetivo, Cor, Design: Identidade visual — Painel de Instrumentos, Edge cases, Elemento-assinatura, Layout, Movimento (+5 more)

### Community 31 - "scripts"
Cohesion: 0.15
Nodes (13): scripts, build, db:generate, db:migrate, dev, knip, lint, lint:fix (+5 more)

### Community 32 - "getTestDatabaseUrl"
Cohesion: 0.18
Nodes (7): TEST_DATABASE_URL, migrateDatabase(), getTestDatabaseUrl(), globalSetup(), resetDatabase(), TEST_DATABASE_URL, setup()

### Community 33 - "metrics-query-port.ts"
Cohesion: 0.06
Nodes (53): ageInMs(), calculateCurrentWipMetrics(), oldestAge(), NOW, calculateBlockedTime(), calculateCycleTime(), calculateCycleTimeOutliers(), calculateLeadTime() (+45 more)

### Community 34 - "flow-composition-chart.tsx"
Cohesion: 0.23
Nodes (9): PeriodMetrics, FlowCompositionChart(), FlowCompositionChartProps, SEGMENTS, EMPTY_FLOW_COMPOSITION, FlowCompositionData, FlowCompositionTrendPoint, toFlowCompositionData() (+1 more)

### Community 35 - "Tarjas nos cards + filtro nas métricas — Implementation Plan"
Cohesion: 0.12
Nodes (15): Global Constraints, Tarjas nos cards + filtro nas métricas — Implementation Plan, Task 10: Componente `TagCombobox` (multi-select com busca), Task 11: Tarjas no card (formulário, exibição, quadro), Task 12: Filtro de tarja em `/metrics`, Task 13: Verificação final, Task 1: Entidade Tag, TagRepository e schema de armazenamento, Task 2: `TaskRepository.countByTag` e `listUsedTagIds` (+7 more)

### Community 36 - "Arquitetura"
Cohesion: 0.17
Nodes (12): Application, Arquitetura, Camadas, Composition root, Domain, Estrutura de pastas, Fronteiras e mapeamento, Infrastructure (+4 more)

### Community 37 - "Global Constraints"
Cohesion: 0.18
Nodes (10): Global Constraints, Métricas de bugs no dashboard Implementation Plan, Task 1: `bugEvents` no snapshot do motor de métricas, Task 2: Fórmulas `calculateBugsOpened` e `calculateBugsRanking`, Task 3: `bugsOpened`/`bugsRanking` em `PeriodMetrics`, Task 4: Definições dos indicadores de bugs, Task 5: Série do gráfico de bugs abertos, Task 6: Gráfico de bugs abertos e lista de ranking no painel (+2 more)

### Community 38 - "Global Constraints"
Cohesion: 0.18
Nodes (10): Global Constraints, Task 1: Fundação de dados — `isBug`, `parentTaskId` e tipos, Task 2: Vínculo na criação de tasks, Task 3: Vínculo na edição de tasks, Task 4: Proteger o tipo Bug contra exclusão, Task 5: Contagem de filhos no board (`listTasksByTeam`), Task 6: Campo "Task de origem" no formulário, Task 7: Badges de bugs/vínculos e linha de origem no card (+2 more)

### Community 39 - "developer-metrics-dashboard.tsx"
Cohesion: 0.22
Nodes (11): CurrentWipMetrics, CycleTimeOutlier, CycleTimeOutliersList(), CycleTimeOutliersListProps, ageDetail(), CurrentStatusSection(), CurrentStatusSectionProps, wipLimitDetail() (+3 more)

### Community 40 - "PIs e Sprints no quadro e nas métricas"
Cohesion: 0.14
Nodes (13): Board, Contexto, Escopo, Fora de escopo, Histórico congelado no fechamento, Modelo de domínio (novo contexto `sprint`), Métricas, Persistência (+5 more)

### Community 41 - "Global Constraints"
Cohesion: 0.20
Nodes (10): Global Constraints, Motor de Métricas Implementation Plan, Task 1: Cálculo de períodos (semana/mês), Task 2: Port de consulta e fake para testes, Task 3: Fórmulas de duração (lead time, cycle time, bloqueio, code review), Task 4: Fórmulas de taxa (retrabalho e previsibilidade), Task 5: Casos de uso `getMetricsForPeriod` e `getMetricsSeries`, Task 6: Índices de banco para as consultas de métricas (+2 more)

### Community 42 - "Global Constraints"
Cohesion: 0.22
Nodes (8): Cadastro Retroativo de Card Implementation Plan, Final Verification, Global Constraints, Task 1: Port e persistência — `createWithExplicitHistory`, Task 2: Caso de uso `createHistoricalTask`, Task 3: Regressão das métricas para card retroativo em andamento, Task 4: Server Action, composição e modal, Task 5: E2E e README

### Community 43 - "Global Constraints"
Cohesion: 0.22
Nodes (8): Global Constraints, Identidade Visual — Painel de Instrumentos Implementation Plan, Task 1: Paleta grafite única e tokens novos, Task 2: Fontes — JetBrains Mono e IBM Plex Sans, Task 3: Header — marca com cursor e navegação por abas, Task 4: Corrige contraste de elementos que assumiam tema claro, Task 5: Valores de métrica em mono, cores e tooltip do gráfico, Task 6: Verificação final

### Community 44 - "Design: Dashboard de métricas"
Cohesion: 0.22
Nodes (9): Arquitetura, Biblioteca de gráficos, Contexto e objetivo, Design: Dashboard de métricas, Edge cases, Filtro de período (topo da página), Layout, Navegação entre as 2 áreas (+1 more)

### Community 45 - "Global Constraints"
Cohesion: 0.17
Nodes (11): Global Constraints, Persistência do Filtro de Período + Fix de Reset do Form de Task Implementation Plan, Task 1: `parseMetricsFilter` aceita uma preferência salva como fallback, Task 2: Cookie store, use-cases e wiring da preferência de período, Task 3: Server action para salvar a preferência, Task 4: `PeriodFilter` salva a preferência e abre "Personalizado" com hoje selecionado, Task 5: Wiring em `/metrics` (page + `MetricsDashboard`), Task 6: Wiring em `/metrics/developers` (page + `DeveloperMetricsDashboard`) (+3 more)

### Community 46 - "Design: Métricas por desenvolvedor"
Cohesion: 0.17
Nodes (11): Apoio, Contexto e objetivo, Conteúdo da página, Dados e regras, Design: Métricas por desenvolvedor, Entrega, Estados e erros, Fora do escopo (+3 more)

### Community 47 - "Global Constraints"
Cohesion: 0.25
Nodes (7): Colunas Testes e Aguardando Publicação Implementation Plan, Final Verification, Global Constraints, Task 1: Domain e apresentação — novas colunas do quadro, Task 2: Persistência — migração dos CHECK constraints, Task 3: Motor de métricas — generalizar retrabalho e WIP, Task 4: Motor de métricas — tempo em status genérico e métricas novas

### Community 48 - "Global Constraints"
Cohesion: 0.25
Nodes (7): Global Constraints, Metrics Layout Hierarchy Implementation Plan, Task 1: Reorganizar o cabeçalho e os controles, Task 2: Criar hierarquia entre os blocos de indicadores, Task 3: Separar visualmente a área de tendências, Task 4: Verificação final e entrega da prévia, Task 5: Aplicar cores semânticas e ícones

### Community 49 - "Design: Motor de métricas"
Cohesion: 0.25
Nodes (8): Arquitetura, Contexto e objetivo, Definição de cada métrica, Design: Motor de métricas, Edge cases, Estratégia de cálculo, Períodos, Testes

### Community 50 - "Design: Cadastro retroativo de card"
Cohesion: 0.25
Nodes (8): Arquitetura, Comportamento de um card "ainda em andamento" (sem chegar em DONE), Contexto e objetivo, Design: Cadastro retroativo de card, Edge cases, Regras, Testes, UI

### Community 51 - "Design: Informações do quadro (contagem, bloqueios e prazo)"
Cohesion: 0.25
Nodes (8): Arquitetura, Contagem por coluna, Contexto e objetivo, Design: Informações do quadro (contagem, bloqueios e prazo), Edge cases, Faixa de resumo, Prazo no card, Testes

### Community 52 - "Design: Colunas Testes e Aguardando Publicação"
Cohesion: 0.25
Nodes (8): Arquitetura (arquivos alterados), Contexto e objetivo, Design: Colunas Testes e Aguardando Publicação, Edge cases, Modelo de dados, Mudanças no motor de métricas, Quadro (Kanban), Testes

### Community 53 - "Hierarquia visual do dashboard de métricas"
Cohesion: 0.25
Nodes (7): Cores e informação nos cards, Direção visual, Escopo técnico, Hierarquia visual do dashboard de métricas, Objetivo, Responsividade e acessibilidade, Verificação

### Community 54 - "Design: Tarjas nos cards + filtro de tarja nas métricas"
Cohesion: 0.17
Nodes (11): 1. Domínio e schema, 2. Application, 3. Presentation, Combobox de multi-select (`TagCombobox`), Contexto, Design: Tarjas nos cards + filtro de tarja nas métricas, Filtro de métricas, Fora do escopo (+3 more)

### Community 55 - "development-metrics-front"
Cohesion: 0.18
Nodes (11): Como rodar, development-metrics-front, Funcionalidades, Git hooks, Graphify, Integração contínua, Manutenção destas regras, Período e apresentação (+3 more)

### Community 56 - "Design: Quadro Kanban e Tasks"
Cohesion: 0.20
Nodes (7): Arquitetura (camadas), Contexto e objetivo, Design: Quadro Kanban e Tasks, Edge cases, Modelo de dados (domain), Rotas e telas, Testes

### Community 57 - "Design: Indicador de semana/mês no dashboard"
Cohesion: 0.25
Nodes (7): Arquitetura, Contexto e objetivo, Design: Indicador de semana/mês no dashboard, Edge cases, Fonte de dados, Formato do rótulo, Testes

### Community 58 - "ChartCard"
Cohesion: 0.13
Nodes (31): createHistoricalTaskAction(), createTaskAction(), CreateTaskActionInput, deleteTaskAction(), finishSprintAction(), getCurrentTeamId(), moveTaskAction(), runTaskAction() (+23 more)

### Community 59 - "Global Constraints"
Cohesion: 0.33
Nodes (5): Final Verification, Global Constraints, Informações do Quadro Implementation Plan, Task 1: Prazo no card, Task 2: Faixa de resumo e contagem por coluna

### Community 60 - "Global Constraints"
Cohesion: 0.33
Nodes (5): Final Verification, Global Constraints, Indicador de Semana/Mês no Dashboard Implementation Plan, Task 1: `formatPeriodLabel`, Task 2: Renderizar o rótulo no dashboard

### Community 61 - "Global Constraints"
Cohesion: 0.22
Nodes (8): Global Constraints, Métricas por desenvolvedor Implementation Plan, Self-Review Notes, Task 1: Filtrar o snapshot existente por responsável, Task 2: Calcular métricas individuais e evidências, Task 3: Fazer o filtro de período preservar o desenvolvedor, Task 4: Montar a página e o seletor de desenvolvedor, Task 5: Verificação final

### Community 62 - "commit-msg.test.sh"
Cohesion: 0.83
Nodes (3): assert_invalid(), assert_valid(), commit-msg.test.sh script

### Community 63 - "package.json"
Cohesion: 0.50
Nodes (3): name, private, version

### Community 65 - "Design: Polimento do filtro de período, botão de info e rodapé"
Cohesion: 0.25
Nodes (7): 1. Badge de período sem prefixo, 2. Filtro de período sem reflow, 3. Botão de info: 2 abas + auditoria, 4. Rodapé, Contexto, Design: Polimento do filtro de período, botão de info e rodapé, Fora do escopo

### Community 67 - "Design: Persistência do filtro de período por time + correção de reset de formulário de task"
Cohesion: 0.29
Nodes (6): 1. Persistir período por time, 2. Modal "Personalizado" com hoje pré-selecionado, 3. Campos de task somem no erro — causa raiz e correção, Contexto, Design: Persistência do filtro de período por time + correção de reset de formulário de task, Fora do escopo

### Community 69 - "charts-section.tsx"
Cohesion: 0.14
Nodes (14): HistoricalPeriodMetrics, BugsOpenedChart(), BugsOpenedChartProps, BugsRankingList(), BugsRankingListProps, ChartCard(), ChartCardProps, ChartsSection() (+6 more)

### Community 81 - "File Structure"
Cohesion: 0.10
Nodes (20): File Structure, Global Constraints, PIs e Sprints — Ciclo de vida da sprint (iniciar/finalizar, overflow, histórico) Implementation Plan, Próximo plano (fora deste escopo), Task 10: Composition root, Task 11: Server Actions `startSprintAction` e `finishSprintAction`, Task 12: Controle "Iniciar sprint / Finalizar sprint", Task 13: Visão histórica read-only de sprint fechada (+12 more)

### Community 181 - "metrics-dashboard.tsx"
Cohesion: 0.20
Nodes (12): PeriodRange, PeriodType, ThroughputChart(), ThroughputChartProps, BugsOpenedPoint, ThroughputPoint, toThroughputSeries(), formatDayMonth() (+4 more)

### Community 182 - "list-tasks-by-team.ts"
Cohesion: 0.36
Nodes (4): LeadCycleTimeChart(), LeadCycleTimeChartProps, DurationTrendPoint, toDurationTrendSeries()

### Community 183 - "task-card.tsx"
Cohesion: 0.22
Nodes (11): TaskWithStatusSince, DueDateStatus, getDueDateStatus(), today, dueDateClassName(), formatDate(), formatDueDate(), formatElapsed() (+3 more)

### Community 184 - "tag-filter.tsx"
Cohesion: 0.29
Nodes (7): parseStoredTagIds(), serializeTagIds(), TagFilter(), TagFilterProps, DropdownPosition, TagCombobox(), TagComboboxProps

### Community 185 - "task.ts"
Cohesion: 0.36
Nodes (5): CreateSprintTaskSnapshotData, SprintTaskSnapshotRepository, getSprintHistory(), SprintTaskSnapshot, sprintTaskSnapshots

### Community 186 - "sprint.ts"
Cohesion: 0.20
Nodes (11): isSprintStatus(), Sprint, SPRINT_STATUSES, SprintStatus, defaultSprintId(), MetricsSprintFilter(), MetricsSprintFilterProps, SprintBoardFilter() (+3 more)

## Knowledge Gaps
- **699 isolated node(s):** `$schema`, `enabled`, `clientKind`, `useIgnoreFile`, `ignoreUnknown` (+694 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **108 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createTeamUseCases()` connect `createTeamUseCases` to `period.ts`, `ChartCard`, `task.ts`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `layout.tsx`, `task-type.ts`, `create-fake-task-history-repository.ts`, `package.json`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **What connects `$schema`, `enabled`, `clientKind` to the rest of the system?**
  _724 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `period.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13445378151260504 - nodes in this community are weakly interconnected._
- **Should `get-metrics-for-period.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._
- **Should `client.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06450617283950617 - nodes in this community are weakly interconnected._