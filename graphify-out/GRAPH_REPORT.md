# Graph Report - .  (2026-07-23)

## Corpus Check
- 126 files · ~157,946 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1296 nodes · 2460 edges · 148 communities (71 shown, 77 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 21 edges (avg confidence: 0.78)
- Token cost: 202,934 input · 0 output

## Community Hubs (Navigation)
- Cadastro e Filtro de Tarjas
- Métricas por Desenvolvedor e Filtro de Período
- Métricas de Duração e Bugs (testes)
- Filtro de Tarja em Bugs e Regras de Exclusão
- Design Endurecimento do Projeto
- TeamRepository e Create Team
- Actions de Task
- Actions de TaskType
- Configuração TypeScript/Next
- Docker Compose e Métrica de Publicação
- Plano Endurecimento do Projeto
- Design Redesenho da Página de Métricas
- Chart Card e Flow Time Section
- Biome Config
- Plano Redesenho da Página de Métricas
- Plano Quadro Kanban e Tasks
- Charts de Bugs e Planned/Delivered
- Plano Gestão e Seleção de Time
- ManageTeamModal e Home Page
- DevDependencies do Projeto
- Índice de Specs e Plans
- Task Domain
- ApplicationError e Validation
- Guia do Projeto e Convenções de Commit
- Plano Gráficos de Tendência
- Design Métricas de Bugs
- Dependencies do package.json
- CurrentTeamStore e AddMember
- Plano Dashboard de Métricas
- Design Gestão e Seleção de Time
- Design Identidade Visual
- Scripts do package.json
- Test Database URL e Migration
- Current WIP Metrics
- Flow Composition Chart
- Charts Section e Cycle Time Outliers
- Arquitetura em Camadas
- Plano Métricas de Bugs
- Plano Vínculo Task-Pai (isBug/parentTaskId)
- Lead/Cycle Time Chart
- Tag Filter e Storage
- Plano Motor de Métricas
- Plano Cadastro Retroativo de Card
- Plano Identidade Visual
- Design Dashboard de Métricas
- Period Utilities
- Helpers de Testes E2E
- Plano Colunas Testes e Aguardando Publicação
- Plano Hierarquia Visual das Métricas
- Design Motor de Métricas
- Design Cadastro Retroativo de Card
- Design Informações do Quadro
- Design Colunas Testes e Aguardando Publicação
- Design Hierarquia Visual do Dashboard
- TeamsModal e CreateTeamAction
- TaskUsageQuery e DeleteTeam
- Design Quadro Kanban e Tasks
- Design Indicador de Semana/Mês
- Bug Metrics e Bugs Ranking List
- Plano Informações do Quadro
- Plano Indicador de Semana/Mês
- Migration 0001 (task_blocked_periods)
- Testes do Commit-msg Hook
- package.json (metadados)
- RootShell e Fontes
- Migration 0000 (members/teams)
- Migration 0004 (validate task status)
- Migration 0005 (testing publication)
- Migration 0010 (task_types)
- Migration 0011 (tags/task_tags)
- Commit-msg Hook
- drizzle-kit
- Migration 0006 (due date)
- Migration 0007
- Migration 0008
- CI Pipeline e Gates de Qualidade
- next.config.ts
- @types/react-dom
- vitest
- TaskBlockedPeriod
- Referência às Instruções de Agentes
- Plano de Gestão de Times
- Bounded Context Task
- Composição de Task e Team
- Quadro Kanban e Tasks (Design)
- Histórico de Status e Bloqueio
- Gestão Global de Tipos de Task
- Dashboard de Métricas (Design)
- Oito Cards de Métricas
- MetricsDashboard
- Gráficos com Recharts
- Séries Pré-carregadas no Servidor
- Filtro de Período da URL
- Definição de Task Concluída no Período
- MetricsQueryPort
- Motor de Métricas
- PeriodMetrics
- Contexto de Leitura sem Domínio
- BugEvent no Snapshot
- Plano de Métricas de Bugs
- Ranking das Cinco Tasks com Mais Bugs
- Self-join de Task de Origem
- Plano de Hierarquia Visual
- Mudança Restrita à Apresentação
- Plano Gráficos de Tendência (Implementação)
- Indicador Imutável isBug
- ParentTaskId Autorreferenciado
- Plano de Vínculo de Origem entre Tasks
- Plano Identidade Visual (Implementação)
- CurrentTeamStore por Cookie
- Gestão e Seleção de Time
- Navegação Nativa após Excluir Time
- Modais de Time (Parallel Routes)
- SubmitButton Compartilhado
- Gate Único de Time na Home
- Cadastro Retroativo de Card
- Informações do Quadro
- Colunas Testes e Aguardando Publicação
- Indicador de Semana/Mês
- Endurecimento do Projeto
- Bugs Abertos por Período
- Design de Métricas de Bugs
- Ranking de Bugs por Task-Pai
- Cores Semânticas dos Indicadores
- Design da Hierarquia Visual
- Sem Histórico de WIP Decorativo
- Redesenho da Página de Métricas
- Resumo de Métricas em Três Blocos
- Janela Histórica de Oito Períodos
- Gráficos de Tendência no Dashboard
- Due Date Obrigatória
- Exclusão de Task-Pai Preserva Filhos
- Validação de Referências entre Tasks
- Design do Vínculo de Origem entre Tasks
- Identidade Visual Painel de Instrumentos
- Readout
- Arquitetura do Projeto
- Regras de Dependência e Arquitetura

## God Nodes (most connected - your core abstractions)
1. `Plan: Tarjas nos cards + filtro nas métricas` - 39 edges
2. `createTeamUseCases()` - 35 edges
3. `createTaskUseCases()` - 33 edges
4. `TaskRepository` - 27 edges
5. `TeamRepository` - 24 edges
6. `Global Constraints` - 22 edges
7. `PeriodType` - 21 edges
8. `HistoricalPeriodMetrics` - 20 edges
9. `Plan: Métricas por desenvolvedor` - 20 edges
10. `TaskTypeRepository` - 19 edges

## Surprising Connections (you probably didn't know these)
- `Dashboard com 15 indicadores, filtros semanal/quinzenal/mensal, 5 gráficos e ranking` --conceptually_related_to--> `Design: Polimento do filtro de período, botão de info e rodapé`  [INFERRED]
  README.md → docs/superpowers/specs/2026-07-22-metrics-polish-design.md
- `Filtro por até 2 tarjas no dashboard de métricas (semântica OR)` --conceptually_related_to--> `Plan: Tarjas nos cards + filtro nas métricas`  [INFERRED]
  README.md → docs/superpowers/plans/2026-07-22-task-tags.md
- `CI Pipeline` --implements--> `Gates de Qualidade`  [INFERRED]
  .github/workflows/ci.yml → techdocs/guidelines.md
- `Plan: Métricas por desenvolvedor` --references--> `README.md — development-metrics-front`  [EXTRACTED]
  docs/superpowers/plans/2026-07-19-developer-metrics.md → README.md
- `Métricas por desenvolvedor com evidências (líderes)` --conceptually_related_to--> `Plan: Métricas por desenvolvedor`  [INFERRED]
  README.md → docs/superpowers/plans/2026-07-19-developer-metrics.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Fluxo de persistência da preferência de período por time** — src_application_metrics_ports_metrics_period_preference_store, src_infrastructure_metrics_cookie_metrics_period_preference_store, src_application_metrics_use_cases_metrics_period_preference, src_app_actions, src_presentation_metrics_dashboard_period_filter, src_composition_metrics [INFERRED 0.85]
- **Fluxo de métricas por desenvolvedor (port → use-case → página → dashboard)** — src_application_metrics_ports_metrics_query_port, src_application_metrics_use_cases_get_developer_metrics, src_app_metrics_developers_page, src_presentation_developer_metrics_developer_metrics_dashboard, src_presentation_developer_metrics_developer_selector, src_composition_metrics [INFERRED 0.85]
- **Fluxo do catálogo de tarjas e do filtro por tarja nas métricas** — src_domain_task_entities_tag, src_application_task_ports_tag_repository, src_infrastructure_task_drizzle_tag_repository, src_application_task_use_cases_create_tag, src_application_task_use_cases_update_tag, src_application_task_use_cases_delete_tag, src_application_task_use_cases_list_tags, src_presentation_shared_tag_combobox, src_presentation_metrics_dashboard_tag_filter, src_infrastructure_metrics_drizzle_metrics_query_port [INFERRED 0.85]
- **Fundação do vínculo e métricas de bugs** — docs_superpowers_specs_2026_07_19_task_parent_link_design_vinculo_task_pai_design, docs_superpowers_specs_2026_07_19_bug_metrics_design_metricas_bugs_design, readme_vinculo_task_origem [INFERRED 0.95]
- **Quatro subprojetos do Development Metrics** — docs_superpowers_specs_2026_07_17_team_management_design_gestao_e_selecao_de_time, docs_superpowers_plans_2026_07_18_kanban_tasks_quadro_kanban_e_tasks, docs_superpowers_plans_2026_07_18_metrics_engine_motor_de_metricas, docs_superpowers_plans_2026_07_18_metrics_dashboard_dashboard_de_metricas [EXTRACTED 1.00]
- **Pipeline do histórico de tasks para o dashboard** — docs_superpowers_plans_2026_07_18_kanban_tasks_task_history, docs_superpowers_plans_2026_07_18_metrics_engine_metrics_query_port, docs_superpowers_plans_2026_07_18_metrics_engine_period_metrics, docs_superpowers_plans_2026_07_18_metrics_dashboard_metrics_dashboard [INFERRED 0.95]

## Communities (148 total, 77 thin omitted)

### Community 0 - "Cadastro e Filtro de Tarjas"
Cohesion: 0.06
Nodes (62): Plan: Tarjas nos cards + filtro nas métricas, Sem TaskRepository.setTagsForTask separado: tagIds já viaja em CreateTaskData/UpdateTaskData e é persistido na mesma transação de escrita, Filtro por até 2 tarjas no dashboard de métricas (semântica OR), Cadastro de tarjas (catálogo global nome+cor, até 3 por card), CreateHistoricalTaskActionInput, TagRepository, CreateTaskData, TaskRepository (+54 more)

### Community 1 - "Métricas por Desenvolvedor e Filtro de Período"
Cohesion: 0.06
Nodes (49): Plan: Métricas por desenvolvedor, Plan: Persistência do filtro de período + fix de reset do form de task, Design: Métricas por desenvolvedor, Design: Persistência do filtro de período + correção de reset de formulário de task, Design: Polimento do filtro de período, botão de info e rodapé, Badge de período no cabeçalho repete a palavra já destacada no botão selecionado do filtro — removido o prefixo, Usar 'bugs associados', nunca 'bugs causados' — não atribui culpa ao desenvolvedor, Cookie único metrics-period-pref por time reaproveita o padrão de cookie-current-team-store, sem endpoint novo (+41 more)

### Community 2 - "Métricas de Duração e Bugs (testes)"
Cohesion: 0.08
Nodes (40): Regra de manutenção: mudança de fórmula/período atualiza README e testes na mesma alteração, periodEnd, periodStart, calculateBlockedTime(), calculateCycleTime(), calculateCycleTimeOutliers(), calculateLeadTime(), calculateTimeInStatus() (+32 more)

### Community 3 - "Filtro de Tarja em Bugs e Regras de Exclusão"
Cohesion: 0.08
Nodes (23): Design: Tarjas nos cards + filtro de tarja nas métricas, Filtro de tarja em bugs usa a tarja do próprio card de bug, não da task de origem — diferente do filtro de desenvolvedor (parentTasks.assigneeId), Exclusão de tarja bloqueada quando countByTag > 0, mesmo padrão de delete-task-type.ts, Limite de 0–3 tarjas por task é regra de aplicação, não constraint de banco (regra sobre conjunto de linhas em task_tags), TaskHistoryRepository, FakeTaskHistoryRepository, TaskStatusChange, client (+15 more)

### Community 4 - "Design Endurecimento do Projeto"
Cohesion: 0.06
Nodes (35): 10. Erros e pending, 1. Banco exclusivo de testes, 2. CI antecipada, 3. Cookie e parâmetros UUID, 4. Datas reais, 5. Validação e escopo das mutações, 6. Task e histórico atômicos, 7. Exclusão segura de time e membro (+27 more)

### Community 5 - "TeamRepository e Create Team"
Cohesion: 0.14
Nodes (16): TeamRepository, createTeam(), getTeam(), TeamWithMembers, listTeams(), renameMember(), renameTeam(), setWipLimit() (+8 more)

### Community 6 - "Actions de Task"
Cohesion: 0.15
Nodes (28): createHistoricalTaskAction(), createTaskAction(), CreateTaskActionInput, deleteTaskAction(), getCurrentTeamId(), moveTaskAction(), runTaskAction(), toActionState() (+20 more)

### Community 7 - "Actions de TaskType"
Cohesion: 0.12
Nodes (20): createTaskTypeAction(), deleteTaskTypeAction(), getText(), runTaskTypeAction(), toActionState(), updateTaskTypeAction(), TaskTypesPage(), ActionState (+12 more)

### Community 8 - "Configuração TypeScript/Next"
Cohesion: 0.06
Nodes (30): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+22 more)

### Community 9 - "Docker Compose e Métrica de Publicação"
Cohesion: 0.08
Nodes (29): devops/docker-compose.yml, Serviço app (build devops/Dockerfile, porta 3000), Serviço postgres (postgres:16, healthcheck pg_isready), WIP não entra no histórico por desenvolvedor: banco não reconstrói WIP de data passada com segurança, README.md — development-metrics-front, Métrica: Tempo aguardando publicação, Métrica: Tempo bloqueado, Bugs abertos por período e top-5 tasks geradoras de bug (+21 more)

### Community 10 - "Plano Endurecimento do Projeto"
Cohesion: 0.07
Nodes (26): Exact file paths for Tasks 5–12, Final Verification, Global Constraints, PR 1 checkpoint, PR 1 — Proteções e automação, PR 2 checkpoint, PR 2 — Integridade das entradas e gravações, PR 3 checkpoint (+18 more)

### Community 11 - "Design Redesenho da Página de Métricas"
Cohesion: 0.08
Nodes (23): Contexto e objetivo, Definição de cada métrica nova ou alterada, Design: Redesenho da página de métricas (resumo em 3 blocos), Edge cases, Layout, Motor de métricas (`application/metrics`, `infrastructure/metrics`), Presentation (`presentation/metrics-dashboard`), Testes (+15 more)

### Community 12 - "Chart Card e Flow Time Section"
Cohesion: 0.12
Nodes (19): MetricTaskEvidence, ChartCard(), ChartCardProps, DurationTile(), FlowTimeSectionProps, METRIC_DEFINITIONS, MetricDefinition, MetricKey (+11 more)

### Community 13 - "Biome Config"
Cohesion: 0.08
Nodes (24): source, assist, actions, enabled, css, parser, files, ignoreUnknown (+16 more)

### Community 14 - "Plano Redesenho da Página de Métricas"
Cohesion: 0.08
Nodes (22): Global Constraints, Redesenho da Página de Métricas Implementation Plan, Self-Review Notes, Task 1: Application — tipos do motor (`WipBreakdown`, `dueDate` no evento de conclusão), Task 2: Infrastructure — query de WIP estruturada e `dueDate` no evento de conclusão, Task 3: Application — retrabalho em contagem e não planejados, Task 4: Application — `get-metrics-for-period` expõe os campos novos, Task 5: Application — simplificar `get-metrics-dashboard` (sem séries semanais/mensais) (+14 more)

### Community 15 - "Plano Quadro Kanban e Tasks"
Cohesion: 0.09
Nodes (23): Global Constraints, Quadro Kanban e Tasks — Implementation Plan, Task 10: Repositório Drizzle de TaskType, Task 11: Repositório Drizzle de Task, Task 12: Repositório Drizzle de histórico de Task, Task 13: Composition root de Task, Task 14: Header — link "Tipos de task", Task 15: Tela `/task-types` (+15 more)

### Community 16 - "Charts de Bugs e Planned/Delivered"
Cohesion: 0.19
Nodes (15): PeriodType, HistoricalPeriodMetrics, BugsOpenedChart(), BugsOpenedChartProps, PlannedDeliveredChart(), PlannedDeliveredChartProps, ThroughputChart(), ThroughputChartProps (+7 more)

### Community 17 - "Plano Gestão e Seleção de Time"
Cohesion: 0.10
Nodes (20): Gestão e Seleção de Time — Implementation Plan, Global Constraints, Self-Review, Task 10: Repositório Drizzle de Team, Task 11: Armazenamento do time atual em cookie, Task 12: Composition root de Team, Task 13: Tela `/teams` — seleção e criação de time, Task 14: Tela `/teams/[teamId]` — gerenciar time (+12 more)

### Community 18 - "ManageTeamModal e Home Page"
Cohesion: 0.36
Nodes (16): ManageTeamModal(), HomePage(), addMemberAction(), deleteTeamAction(), getName(), removeMemberAction(), renameMemberAction(), renameTeamAction() (+8 more)

### Community 19 - "DevDependencies do Projeto"
Cohesion: 0.11
Nodes (19): @biomejs/biome, knip, devDependencies, @biomejs/biome, knip, @playwright/test, postcss, tailwindcss (+11 more)

### Community 21 - "Task Domain"
Cohesion: 0.19
Nodes (10): isTaskStatus(), Task, TASK_STATUSES, TaskStatus, DueDateStatus, getDueDateStatus(), today, TaskMoveSelectProps (+2 more)

### Community 22 - "ApplicationError e Validation"
Cohesion: 0.28
Nodes (7): ApplicationError, parseDateOnly(), createHistoricalTask(), CreateHistoricalTaskInput, validateTaskReferences(), TeamAccess, setCompletedTaskLimit()

### Community 23 - "Guia do Projeto e Convenções de Commit"
Cohesion: 0.12
Nodes (16): Banco de dados, Biome, Commit sem card e sem contexto específico, Commit sem card, mas com contexto, Commit vinculado a um card, Convenções gerais, Código de servidor, Descrição (+8 more)

### Community 24 - "Plano Gráficos de Tendência"
Cohesion: 0.13
Nodes (14): Global Constraints, Gráficos de tendência no dashboard de métricas Implementation Plan, Task 10: Seção de gráficos no dashboard, Task 11: Testes E2E dos gráficos, Task 12: Verificação final, Task 1: Dependência do Recharts e cores do gráfico de composição, Task 2: Histórico de períodos no motor de métricas, Task 3: Rótulo curto de período para o eixo X (+6 more)

### Community 25 - "Design Métricas de Bugs"
Cohesion: 0.13
Nodes (13): Contexto e objetivo, Design: Métricas de bugs no dashboard, Edge cases, Motor de métricas (`application/metrics`), Presentation (`presentation/metrics-dashboard/`), Testes, Contexto e objetivo, Design: Vínculo de origem entre tasks (bug ↔ task-pai) (+5 more)

### Community 26 - "Dependencies do package.json"
Cohesion: 0.13
Nodes (15): drizzle-orm, lucide-react, next, dependencies, drizzle-orm, lucide-react, next, postgres (+7 more)

### Community 27 - "CurrentTeamStore e AddMember"
Cohesion: 0.26
Nodes (5): CurrentTeamStore, addMember(), getCurrentTeam(), selectTeam(), cookieCurrentTeamStore

### Community 28 - "Plano Dashboard de Métricas"
Cohesion: 0.15
Nodes (13): Dashboard de Métricas Implementation Plan, Global Constraints, Task 10: Dashboard, página `/metrics` e navegação no header, Task 11: Testes E2E do dashboard e verificação final, Task 1: Dependência Recharts e cores das séries, Task 2: Parser do filtro de período na URL, Task 3: Deslocamento de período (setas ‹ ›), Task 4: Formatação de duração e percentual (+5 more)

### Community 29 - "Design Gestão e Seleção de Time"
Cohesion: 0.15
Nodes (13): Arquitetura (camadas), Banco de dados, Bug: loop infinito ao excluir o time atual (2026-07-18), Confirmação de exclusão e estado de envio (2026-07-18), Contexto e objetivo, Design: Gestão e seleção de time, Edge cases, Estilização (+5 more)

### Community 30 - "Design Identidade Visual"
Cohesion: 0.15
Nodes (13): Arquitetura, Contexto e objetivo, Cor, Design: Identidade visual — Painel de Instrumentos, Edge cases, Elemento-assinatura, Layout, Movimento (+5 more)

### Community 31 - "Scripts do package.json"
Cohesion: 0.15
Nodes (13): scripts, build, db:generate, db:migrate, dev, knip, lint, lint:fix (+5 more)

### Community 32 - "Test Database URL e Migration"
Cohesion: 0.31
Nodes (6): TEST_DATABASE_URL, migrateDatabase(), getTestDatabaseUrl(), globalSetup(), TEST_DATABASE_URL, setup()

### Community 33 - "Current WIP Metrics"
Cohesion: 0.24
Nodes (10): ageInMs(), calculateCurrentWipMetrics(), CurrentWipMetrics, oldestAge(), NOW, CurrentWipTaskMetrics, ageDetail(), CurrentStatusSection() (+2 more)

### Community 34 - "Flow Composition Chart"
Cohesion: 0.23
Nodes (9): PeriodMetrics, FlowCompositionChart(), FlowCompositionChartProps, SEGMENTS, EMPTY_FLOW_COMPOSITION, FlowCompositionData, FlowCompositionTrendPoint, toFlowCompositionData() (+1 more)

### Community 35 - "Charts Section e Cycle Time Outliers"
Cohesion: 0.23
Nodes (8): ChartsSection(), ChartsSectionProps, CycleTimeOutliersList(), CycleTimeOutliersListProps, formatDayMonth(), formatPeriodRangeLabel(), MetricsDashboard(), MetricsDashboardProps

### Community 36 - "Arquitetura em Camadas"
Cohesion: 0.17
Nodes (12): Application, Arquitetura, Camadas, Composition root, Domain, Estrutura de pastas, Fronteiras e mapeamento, Infrastructure (+4 more)

### Community 37 - "Plano Métricas de Bugs"
Cohesion: 0.18
Nodes (10): Global Constraints, Métricas de bugs no dashboard Implementation Plan, Task 1: `bugEvents` no snapshot do motor de métricas, Task 2: Fórmulas `calculateBugsOpened` e `calculateBugsRanking`, Task 3: `bugsOpened`/`bugsRanking` em `PeriodMetrics`, Task 4: Definições dos indicadores de bugs, Task 5: Série do gráfico de bugs abertos, Task 6: Gráfico de bugs abertos e lista de ranking no painel (+2 more)

### Community 38 - "Plano Vínculo Task-Pai (isBug/parentTaskId)"
Cohesion: 0.18
Nodes (10): Global Constraints, Task 1: Fundação de dados — `isBug`, `parentTaskId` e tipos, Task 2: Vínculo na criação de tasks, Task 3: Vínculo na edição de tasks, Task 4: Proteger o tipo Bug contra exclusão, Task 5: Contagem de filhos no board (`listTasksByTeam`), Task 6: Campo "Task de origem" no formulário, Task 7: Badges de bugs/vínculos e linha de origem no card (+2 more)

### Community 39 - "Lead/Cycle Time Chart"
Cohesion: 0.33
Nodes (7): LeadCycleTimeChart(), LeadCycleTimeChartProps, DurationTrendPoint, toDurationTrendSeries(), formatAge(), formatDuration(), formatPercent()

### Community 40 - "Tag Filter e Storage"
Cohesion: 0.29
Nodes (7): parseStoredTagIds(), serializeTagIds(), TagFilter(), TagFilterProps, DropdownPosition, TagCombobox(), TagComboboxProps

### Community 41 - "Plano Motor de Métricas"
Cohesion: 0.20
Nodes (10): Global Constraints, Motor de Métricas Implementation Plan, Task 1: Cálculo de períodos (semana/mês), Task 2: Port de consulta e fake para testes, Task 3: Fórmulas de duração (lead time, cycle time, bloqueio, code review), Task 4: Fórmulas de taxa (retrabalho e previsibilidade), Task 5: Casos de uso `getMetricsForPeriod` e `getMetricsSeries`, Task 6: Índices de banco para as consultas de métricas (+2 more)

### Community 42 - "Plano Cadastro Retroativo de Card"
Cohesion: 0.22
Nodes (8): Cadastro Retroativo de Card Implementation Plan, Final Verification, Global Constraints, Task 1: Port e persistência — `createWithExplicitHistory`, Task 2: Caso de uso `createHistoricalTask`, Task 3: Regressão das métricas para card retroativo em andamento, Task 4: Server Action, composição e modal, Task 5: E2E e README

### Community 43 - "Plano Identidade Visual"
Cohesion: 0.22
Nodes (8): Global Constraints, Identidade Visual — Painel de Instrumentos Implementation Plan, Task 1: Paleta grafite única e tokens novos, Task 2: Fontes — JetBrains Mono e IBM Plex Sans, Task 3: Header — marca com cursor e navegação por abas, Task 4: Corrige contraste de elementos que assumiam tema claro, Task 5: Valores de métrica em mono, cores e tooltip do gráfico, Task 6: Verificação final

### Community 44 - "Design Dashboard de Métricas"
Cohesion: 0.22
Nodes (9): Arquitetura, Biblioteca de gráficos, Contexto e objetivo, Edge cases, Filtro de período (topo da página), Layout, Design do dashboard de métricas, Navegação entre as 2 áreas (+1 more)

### Community 45 - "Period Utilities"
Cohesion: 0.47
Nodes (7): getFortnightRange(), getMonthRange(), getPeriodRange(), getPreviousPeriods(), getRollingRange(), getWeekRange(), PeriodRange

### Community 47 - "Plano Colunas Testes e Aguardando Publicação"
Cohesion: 0.25
Nodes (7): Colunas Testes e Aguardando Publicação Implementation Plan, Final Verification, Global Constraints, Task 1: Domain e apresentação — novas colunas do quadro, Task 2: Persistência — migração dos CHECK constraints, Task 3: Motor de métricas — generalizar retrabalho e WIP, Task 4: Motor de métricas — tempo em status genérico e métricas novas

### Community 48 - "Plano Hierarquia Visual das Métricas"
Cohesion: 0.25
Nodes (7): Global Constraints, Metrics Layout Hierarchy Implementation Plan, Task 1: Reorganizar o cabeçalho e os controles, Task 2: Criar hierarquia entre os blocos de indicadores, Task 3: Separar visualmente a área de tendências, Task 4: Verificação final e entrega da prévia, Task 5: Aplicar cores semânticas e ícones

### Community 49 - "Design Motor de Métricas"
Cohesion: 0.25
Nodes (8): Arquitetura, Contexto e objetivo, Definição de cada métrica, Edge cases, Estratégia de cálculo, Design do motor de métricas, Períodos, Testes

### Community 50 - "Design Cadastro Retroativo de Card"
Cohesion: 0.25
Nodes (8): Arquitetura, Comportamento de um card "ainda em andamento" (sem chegar em DONE), Contexto e objetivo, Design: Cadastro retroativo de card, Edge cases, Regras, Testes, UI

### Community 51 - "Design Informações do Quadro"
Cohesion: 0.25
Nodes (8): Arquitetura, Contagem por coluna, Contexto e objetivo, Design: Informações do quadro (contagem, bloqueios e prazo), Edge cases, Faixa de resumo, Prazo no card, Testes

### Community 52 - "Design Colunas Testes e Aguardando Publicação"
Cohesion: 0.25
Nodes (8): Arquitetura (arquivos alterados), Contexto e objetivo, Design: Colunas Testes e Aguardando Publicação, Edge cases, Modelo de dados, Mudanças no motor de métricas, Quadro (Kanban), Testes

### Community 53 - "Design Hierarquia Visual do Dashboard"
Cohesion: 0.25
Nodes (7): Cores e informação nos cards, Direção visual, Escopo técnico, Hierarquia visual do dashboard de métricas, Objetivo, Responsividade e acessibilidade, Verificação

### Community 54 - "TeamsModal e CreateTeamAction"
Cohesion: 0.39
Nodes (5): TeamsModal(), createTeamAction(), toActionState(), TeamsPage(), TeamSelectView()

### Community 55 - "TaskUsageQuery e DeleteTeam"
Cohesion: 0.46
Nodes (3): TaskUsageQuery, deleteTeam(), removeMember()

### Community 56 - "Design Quadro Kanban e Tasks"
Cohesion: 0.29
Nodes (7): Arquitetura (camadas), Contexto e objetivo, Edge cases, Design do quadro Kanban e Tasks, Modelo de dados (domain), Rotas e telas, Testes

### Community 57 - "Design Indicador de Semana/Mês"
Cohesion: 0.29
Nodes (7): Arquitetura, Contexto e objetivo, Design: Indicador de semana/mês no dashboard, Edge cases, Fonte de dados, Formato do rótulo, Testes

### Community 59 - "Plano Informações do Quadro"
Cohesion: 0.33
Nodes (5): Final Verification, Global Constraints, Informações do Quadro Implementation Plan, Task 1: Prazo no card, Task 2: Faixa de resumo e contagem por coluna

### Community 60 - "Plano Indicador de Semana/Mês"
Cohesion: 0.33
Nodes (5): Final Verification, Global Constraints, Indicador de Semana/Mês no Dashboard Implementation Plan, Task 1: `formatPeriodLabel`, Task 2: Renderizar o rótulo no dashboard

### Community 61 - "Migration 0001 (task_blocked_periods)"
Cohesion: 0.40
Nodes (4): "task_blocked_periods", "task_status_changes", "task_types", "tasks"

### Community 62 - "Testes do Commit-msg Hook"
Cohesion: 0.83
Nodes (3): assert_invalid(), assert_valid(), commit-msg.test.sh script

### Community 63 - "package.json (metadados)"
Cohesion: 0.50
Nodes (3): name, private, version

## Knowledge Gaps
- **558 isolated node(s):** `$schema`, `enabled`, `clientKind`, `useIgnoreFile`, `ignoreUnknown` (+553 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **77 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Plan: Tarjas nos cards + filtro nas métricas` connect `Cadastro e Filtro de Tarjas` to `Métricas por Desenvolvedor e Filtro de Período`, `Métricas de Duração e Bugs (testes)`, `Filtro de Tarja em Bugs e Regras de Exclusão`, `Charts Section e Cycle Time Outliers`, `Actions de Task`, `Tag Filter e Storage`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Why does `Design: Polimento do filtro de período, botão de info e rodapé` connect `Métricas por Desenvolvedor e Filtro de Período` to `Docker Compose e Métrica de Publicação`, `Charts Section e Cycle Time Outliers`, `Chart Card e Flow Time Section`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Dependencies do package.json` to `package.json (metadados)`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `Plan: Tarjas nos cards + filtro nas métricas` (e.g. with `Plan: Métricas por desenvolvedor` and `Design: Tarjas nos cards + filtro de tarja nas métricas`) actually correct?**
  _`Plan: Tarjas nos cards + filtro nas métricas` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `enabled`, `clientKind` to the rest of the system?**
  _570 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Cadastro e Filtro de Tarjas` be split into smaller, more focused modules?**
  _Cohesion score 0.05844376486578321 - nodes in this community are weakly interconnected._
- **Should `Métricas por Desenvolvedor e Filtro de Período` be split into smaller, more focused modules?**
  _Cohesion score 0.06277665995975855 - nodes in this community are weakly interconnected._