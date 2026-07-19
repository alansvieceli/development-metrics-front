# Graph Report - .  (2026-07-19)

## Corpus Check
- 125 files · ~125,075 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1101 nodes · 1816 edges · 130 communities (68 shown, 62 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- task ts
- Área TeamRepository
- metrics query port ts
- Área createTeamUseCases
- Design Endurecimento do projeto
- drizzle metrics query port ts
- actions ts
- historical task form modal tsx
- Área compilerOptions
- Project Hardening Implementation Plan
- Design Redesenho da página de
- biome json
- Development Metrics Front
- Redesenho da Página de Métricas
- Global Constraints
- metrics dashboard tsx
- Global Constraints
- Área PeriodType
- Área devDependencies
- flow composition chart tsx
- period ts
- get metrics for period ts
- Guia do Projeto
- Global Constraints
- Área dependencies
- Área getTestDatabaseUrl
- charts section tsx
- Global Constraints
- Design Gestão e seleção de
- Design Identidade visual Painel de
- Área scripts
- Área Arquitetura
- guidelines md
- Global Constraints
- page tsx
- Global Constraints
- Global Constraints
- Design do dashboard de métricas
- Global Constraints
- Design do motor de métricas
- Design Cadastro retroativo de card
- Design Informações do quadro contagem
- Design Colunas Testes e Aguardando
- Design Indicador de semana mês
- Design do quadro Kanban e
- Global Constraints
- Global Constraints
- CompletedTaskLimit por equipe
- Design da hierarquia visual do
- 0001 regular venus sql
- commit msg test sh
- package json
- 0000 classy punisher sql
- 0004 validate task status sql
- 0005 task status testing publication
- 0010 robust jack murdock sql
- commit msg
- 0006 task due date required
- 0007 silent midnight sql
- 0008 late hardball sql
- CI Pipeline
- Consulta sobre informações complementares nos
- Consulta sobre limite de WIP
- Consulta sobre ícone de salvar
- Consulta sobre atualização do Graphify
- next config ts
- types react
- types react dom
- Área vitest
- move task test ts
- toggle blocked test ts
- team access ts
- Referência às instruções de agentes
- Serviço Postgres 16
- Plano de implementação de gestão
- Bounded Context Task
- Composição de Task e Team
- Quadro Kanban e Tasks
- Histórico de status e bloqueio
- Gestão global de tipos de
- Dashboard de Métricas
- Oito cards de métricas
- Área MetricsDashboard
- Gráficos de evolução com Recharts
- Séries semanais e mensais pré
- Filtro de período da URL
- Definição unificada de task concluída
- Área MetricsQueryPort
- Motor de Métricas
- Área PeriodMetrics
- Contexto de leitura sem entidades
- Gráficos de Tendência Implementation Plan
- Identidade Visual Implementation Plan
- CurrentTeamStore baseado em cookie
- Gestão e seleção de time
- Navegação nativa após excluir time
- Modais de time com parallel
- SubmitButton compartilhado
- Gate único de time na
- Cadastro Retroativo de Card
- Informações do Quadro
- Colunas Testes e Aguardando Publicação
- Indicador de Semana Mês no
- Endurecimento do Projeto
- Redesenho da Página de Métricas
- Resumo de Métricas em Três
- Janela Histórica de Oito Períodos
- Gráficos de Tendência no Dashboard
- Due Date Obrigatória
- Identidade Visual Painel de Instrumentos
- Área Readout
- Arquitetura do projeto
- Regras de Dependência e Arquitetura

## God Nodes (most connected - your core abstractions)
1. `createTeamUseCases()` - 36 edges
2. `TeamRepository` - 24 edges
3. `TaskRepository` - 23 edges
4. `Global Constraints` - 22 edges
5. `createTaskUseCases()` - 21 edges
6. `TaskStatus` - 20 edges
7. `Global Constraints` - 18 edges
8. `PeriodType` - 17 edges
9. `compilerOptions` - 16 edges
10. `HistoricalPeriodMetrics` - 16 edges

## Surprising Connections (you probably didn't know these)
- `Vínculo de task de origem` --semantically_similar_to--> `Design do vínculo de origem entre tasks`  [INFERRED] [semantically similar]
  README.md → docs/superpowers/specs/2026-07-19-task-parent-link-design.md
- `PeriodType FORTNIGHT` --semantically_similar_to--> `Períodos semanal, quinzenal e mensal`  [INFERRED] [semantically similar]
  graphify-out/memory/query_20260719_174810_adiciona_um_botao_quinzenal_entre_semana_e_mensal.md → README.md
- `Versionar somente graph.json e GRAPH_REPORT.md` --semantically_similar_to--> `Artefatos versionados do Graphify`  [INFERRED] [semantically similar]
  graphify-out/memory/query_20260719_181014_atualize_o_graphy__ajuste_o__gitignore_pra_commita.md → README.md
- `Manutenção conjunta de código, README e testes` --rationale_for--> `Development Metrics Front`  [INFERRED]
  graphify-out/memory/query_20260719_175310_dentro_do_agents_md_tem_explicidamente_pra_ler_gui.md → README.md
- `CI Pipeline` --implements--> `Gates de Qualidade`  [INFERRED]
  .github/workflows/ci.yml → techdocs/guidelines.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Fundação do vínculo e métricas de bugs** — docs_superpowers_specs_2026_07_19_task_parent_link_design_vinculo_task_pai_design, docs_superpowers_specs_2026_07_19_bug_metrics_design_metricas_bugs_design, readme_vinculo_task_origem [INFERRED 0.95]
- **Implementação e documentação do período quinzenal** — graphify_out_memory_query_20260719_174810_adiciona_um_botao_quinzenal_entre_semana_e_mensal_fortnight, graphify_out_memory_query_20260719_175158_revise_se_readme_md_esta_atualizado__se_estiver_po_consulta, readme_regras_periodo [INFERRED 0.95]
- **Configurações de limites da equipe e seus efeitos** — graphify_out_memory_query_20260719_171837_limite_de_wip_fixado_em_6__sem_alteracao_no_banco_wip_limit, graphify_out_memory_query_20260719_173449_coloca_esse_valor_configuavel_na_tela_do_cadastro_completed_task_limit, graphify_out_memory_query_20260719_173927_essa_parte_da_exibicao_das_colunas_concluidas_nao_separacao_board_metricas [INFERRED 0.85]
- **Quatro subprojetos do Development Metrics** — docs_superpowers_specs_2026_07_17_team_management_design_gestao_e_selecao_de_time, docs_superpowers_plans_2026_07_18_kanban_tasks_quadro_kanban_e_tasks, docs_superpowers_plans_2026_07_18_metrics_engine_motor_de_metricas, docs_superpowers_plans_2026_07_18_metrics_dashboard_dashboard_de_metricas [EXTRACTED 1.00]
- **Pipeline do histórico de tasks para o dashboard** — docs_superpowers_plans_2026_07_18_kanban_tasks_task_history, docs_superpowers_plans_2026_07_18_metrics_engine_metrics_query_port, docs_superpowers_plans_2026_07_18_metrics_engine_period_metrics, docs_superpowers_plans_2026_07_18_metrics_dashboard_metrics_dashboard [INFERRED 0.95]

## Communities (130 total, 62 thin omitted)

### Community 0 - "task ts"
Cohesion: 0.06
Nodes (50): ApplicationError, CreateTaskData, TaskRepository, UpdateTaskData, TaskTypeRepository, createHistoricalTask(), CreateHistoricalTaskInput, baseInput (+42 more)

### Community 1 - "Área TeamRepository"
Cohesion: 0.08
Nodes (25): isUuid(), parseDateOnly(), TaskUsageQuery, CurrentTeamStore, TeamRepository, addMember(), createTeam(), deleteTeam() (+17 more)

### Community 2 - "metrics query port ts"
Cohesion: 0.08
Nodes (36): BugRankingEntry, calculateBugsOpened(), calculateBugsRanking(), periodEnd, periodStart, ageInMs(), calculateCurrentWipMetrics(), CurrentWipMetrics (+28 more)

### Community 3 - "Área createTeamUseCases"
Cohesion: 0.10
Nodes (34): selectTeamAction(), toActionState(), metadata, RootLayout(), TeamsModal(), ManageTeamModal(), HomePage(), createTeamAction() (+26 more)

### Community 4 - "Design Endurecimento do projeto"
Cohesion: 0.06
Nodes (35): 10. Erros e pending, 1. Banco exclusivo de testes, 2. CI antecipada, 3. Cookie e parâmetros UUID, 4. Datas reais, 5. Validação e escopo das mutações, 6. Task e histórico atômicos, 7. Exclusão segura de time e membro (+27 more)

### Community 5 - "drizzle metrics query port ts"
Cohesion: 0.12
Nodes (14): TaskHistoryRepository, FakeTaskHistoryRepository, client, db, createDrizzleMetricsQueryPort(), drizzleMetricsQueryPort, parentTasks, taskBlockedPeriods (+6 more)

### Community 6 - "actions ts"
Cohesion: 0.16
Nodes (27): createHistoricalTaskAction(), createTaskAction(), CreateTaskActionInput, deleteTaskAction(), getCurrentTeamId(), moveTaskAction(), runTaskAction(), toActionState() (+19 more)

### Community 7 - "historical task form modal tsx"
Cohesion: 0.09
Nodes (18): CreateHistoricalTaskActionInput, ActionState, INITIAL_ACTION_STATE, Member, Modal(), ModalProps, SIZE_CLASSES, SubmitButton() (+10 more)

### Community 8 - "Área compilerOptions"
Cohesion: 0.06
Nodes (30): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+22 more)

### Community 9 - "Project Hardening Implementation Plan"
Cohesion: 0.07
Nodes (26): Exact file paths for Tasks 5–12, Final Verification, Global Constraints, PR 1 checkpoint, PR 1 — Proteções e automação, PR 2 checkpoint, PR 2 — Integridade das entradas e gravações, PR 3 checkpoint (+18 more)

### Community 10 - "Design Redesenho da página de"
Cohesion: 0.08
Nodes (23): Contexto e objetivo, Definição de cada métrica nova ou alterada, Design: Redesenho da página de métricas (resumo em 3 blocos), Edge cases, Layout, Motor de métricas (`application/metrics`, `infrastructure/metrics`), Presentation (`presentation/metrics-dashboard`), Testes (+15 more)

### Community 11 - "biome json"
Cohesion: 0.08
Nodes (24): source, assist, actions, enabled, css, parser, files, ignoreUnknown (+16 more)

### Community 12 - "Development Metrics Front"
Cohesion: 0.09
Nodes (24): BugEvent no snapshot de métricas, Plano de métricas de bugs, Ranking das cinco tasks que mais geraram bugs, Self-join para resolver task de origem, Indicador imutável isBug, ParentTaskId autorreferenciado, Plano de vínculo de origem entre tasks, Bugs abertos por período (+16 more)

### Community 13 - "Redesenho da Página de Métricas"
Cohesion: 0.08
Nodes (22): Global Constraints, Redesenho da Página de Métricas Implementation Plan, Self-Review Notes, Task 1: Application — tipos do motor (`WipBreakdown`, `dueDate` no evento de conclusão), Task 2: Infrastructure — query de WIP estruturada e `dueDate` no evento de conclusão, Task 3: Application — retrabalho em contagem e não planejados, Task 4: Application — `get-metrics-for-period` expõe os campos novos, Task 5: Application — simplificar `get-metrics-dashboard` (sem séries semanais/mensais) (+14 more)

### Community 14 - "Global Constraints"
Cohesion: 0.09
Nodes (23): Global Constraints, Quadro Kanban e Tasks — Implementation Plan, Task 10: Repositório Drizzle de TaskType, Task 11: Repositório Drizzle de Task, Task 12: Repositório Drizzle de histórico de Task, Task 13: Composition root de Task, Task 14: Header — link "Tipos de task", Task 15: Tela `/task-types` (+15 more)

### Community 15 - "metrics dashboard tsx"
Cohesion: 0.15
Nodes (17): ChartsSection(), ageDetail(), CurrentStatusSection(), CurrentStatusSectionProps, wipLimitDetail(), FlowTimeSection(), FlowTimeSectionProps, METRIC_DEFINITIONS (+9 more)

### Community 16 - "Global Constraints"
Cohesion: 0.10
Nodes (20): Gestão e Seleção de Time — Implementation Plan, Global Constraints, Self-Review, Task 10: Repositório Drizzle de Team, Task 11: Armazenamento do time atual em cookie, Task 12: Composition root de Team, Task 13: Tela `/teams` — seleção e criação de time, Task 14: Tela `/teams/[teamId]` — gerenciar time (+12 more)

### Community 17 - "Área PeriodType"
Cohesion: 0.20
Nodes (14): PeriodType, LeadCycleTimeChart(), LeadCycleTimeChartProps, PlannedDeliveredChart(), PlannedDeliveredChartProps, DurationTrendPoint, toDurationTrendSeries(), PlannedDeliveredPoint (+6 more)

### Community 18 - "Área devDependencies"
Cohesion: 0.11
Nodes (19): @biomejs/biome, drizzle-kit, knip, devDependencies, @biomejs/biome, drizzle-kit, knip, @playwright/test (+11 more)

### Community 19 - "flow composition chart tsx"
Cohesion: 0.18
Nodes (12): PeriodMetrics, FlowCompositionChart(), FlowCompositionChartProps, SEGMENTS, FlowCompositionData, toFlowCompositionData(), DurationTile(), formatAge() (+4 more)

### Community 20 - "period ts"
Cohesion: 0.23
Nodes (11): getFortnightRange(), getMonthRange(), getPeriodRange(), getPreviousPeriods(), getWeekRange(), PeriodRange, buildMetricsUrl(), PeriodFilter() (+3 more)

### Community 21 - "get metrics for period ts"
Cohesion: 0.20
Nodes (5): HistoricalPeriodMetrics, ThroughputChart(), ThroughputChartProps, ThroughputPoint, toThroughputSeries()

### Community 22 - "Guia do Projeto"
Cohesion: 0.12
Nodes (16): Banco de dados, Biome, Commit sem card e sem contexto específico, Commit sem card, mas com contexto, Commit vinculado a um card, Convenções gerais, Código de servidor, Descrição (+8 more)

### Community 23 - "Global Constraints"
Cohesion: 0.13
Nodes (14): Global Constraints, Gráficos de tendência no dashboard de métricas Implementation Plan, Task 10: Seção de gráficos no dashboard, Task 11: Testes E2E dos gráficos, Task 12: Verificação final, Task 1: Dependência do Recharts e cores do gráfico de composição, Task 2: Histórico de períodos no motor de métricas, Task 3: Rótulo curto de período para o eixo X (+6 more)

### Community 24 - "Área dependencies"
Cohesion: 0.13
Nodes (15): drizzle-orm, lucide-react, next, dependencies, drizzle-orm, lucide-react, next, postgres (+7 more)

### Community 25 - "Área getTestDatabaseUrl"
Cohesion: 0.27
Nodes (7): TEST_DATABASE_URL, migrateDatabase(), getTestDatabaseUrl(), globalSetup(), resetDatabase(), TEST_DATABASE_URL, setup()

### Community 26 - "charts section tsx"
Cohesion: 0.22
Nodes (9): BugsOpenedChart(), BugsOpenedChartProps, BugsRankingList(), BugsRankingListProps, ChartCard(), ChartCardProps, ChartsSectionProps, BugsOpenedPoint (+1 more)

### Community 27 - "Global Constraints"
Cohesion: 0.15
Nodes (13): Dashboard de Métricas Implementation Plan, Global Constraints, Task 10: Dashboard, página `/metrics` e navegação no header, Task 11: Testes E2E do dashboard e verificação final, Task 1: Dependência Recharts e cores das séries, Task 2: Parser do filtro de período na URL, Task 3: Deslocamento de período (setas ‹ ›), Task 4: Formatação de duração e percentual (+5 more)

### Community 28 - "Design Gestão e seleção de"
Cohesion: 0.15
Nodes (13): Arquitetura (camadas), Banco de dados, Bug: loop infinito ao excluir o time atual (2026-07-18), Confirmação de exclusão e estado de envio (2026-07-18), Contexto e objetivo, Design: Gestão e seleção de time, Edge cases, Estilização (+5 more)

### Community 29 - "Design Identidade visual Painel de"
Cohesion: 0.15
Nodes (13): Arquitetura, Contexto e objetivo, Cor, Design: Identidade visual — Painel de Instrumentos, Edge cases, Elemento-assinatura, Layout, Movimento (+5 more)

### Community 30 - "Área scripts"
Cohesion: 0.15
Nodes (13): scripts, build, db:generate, db:migrate, dev, knip, lint, lint:fix (+5 more)

### Community 31 - "Área Arquitetura"
Cohesion: 0.17
Nodes (12): Application, Arquitetura, Camadas, Composition root, Domain, Estrutura de pastas, Fronteiras e mapeamento, Infrastructure (+4 more)

### Community 33 - "Global Constraints"
Cohesion: 0.20
Nodes (10): Global Constraints, Motor de Métricas Implementation Plan, Task 1: Cálculo de períodos (semana/mês), Task 2: Port de consulta e fake para testes, Task 3: Fórmulas de duração (lead time, cycle time, bloqueio, code review), Task 4: Fórmulas de taxa (retrabalho e previsibilidade), Task 5: Casos de uso `getMetricsForPeriod` e `getMetricsSeries`, Task 6: Índices de banco para as consultas de métricas (+2 more)

### Community 34 - "page tsx"
Cohesion: 0.31
Nodes (6): MetricsPage(), createMetricsUseCases(), MetricsDashboard(), MetricsFilter, MetricsSearchParams, parseMetricsFilter()

### Community 35 - "Global Constraints"
Cohesion: 0.22
Nodes (8): Cadastro Retroativo de Card Implementation Plan, Final Verification, Global Constraints, Task 1: Port e persistência — `createWithExplicitHistory`, Task 2: Caso de uso `createHistoricalTask`, Task 3: Regressão das métricas para card retroativo em andamento, Task 4: Server Action, composição e modal, Task 5: E2E e README

### Community 36 - "Global Constraints"
Cohesion: 0.22
Nodes (8): Global Constraints, Identidade Visual — Painel de Instrumentos Implementation Plan, Task 1: Paleta grafite única e tokens novos, Task 2: Fontes — JetBrains Mono e IBM Plex Sans, Task 3: Header — marca com cursor e navegação por abas, Task 4: Corrige contraste de elementos que assumiam tema claro, Task 5: Valores de métrica em mono, cores e tooltip do gráfico, Task 6: Verificação final

### Community 37 - "Design do dashboard de métricas"
Cohesion: 0.22
Nodes (9): Arquitetura, Biblioteca de gráficos, Contexto e objetivo, Edge cases, Filtro de período (topo da página), Layout, Design do dashboard de métricas, Navegação entre as 2 áreas (+1 more)

### Community 38 - "Global Constraints"
Cohesion: 0.25
Nodes (7): Colunas Testes e Aguardando Publicação Implementation Plan, Final Verification, Global Constraints, Task 1: Domain e apresentação — novas colunas do quadro, Task 2: Persistência — migração dos CHECK constraints, Task 3: Motor de métricas — generalizar retrabalho e WIP, Task 4: Motor de métricas — tempo em status genérico e métricas novas

### Community 39 - "Design do motor de métricas"
Cohesion: 0.25
Nodes (8): Arquitetura, Contexto e objetivo, Definição de cada métrica, Edge cases, Estratégia de cálculo, Design do motor de métricas, Períodos, Testes

### Community 40 - "Design Cadastro retroativo de card"
Cohesion: 0.25
Nodes (8): Arquitetura, Comportamento de um card "ainda em andamento" (sem chegar em DONE), Contexto e objetivo, Design: Cadastro retroativo de card, Edge cases, Regras, Testes, UI

### Community 41 - "Design Informações do quadro contagem"
Cohesion: 0.25
Nodes (8): Arquitetura, Contagem por coluna, Contexto e objetivo, Design: Informações do quadro (contagem, bloqueios e prazo), Edge cases, Faixa de resumo, Prazo no card, Testes

### Community 42 - "Design Colunas Testes e Aguardando"
Cohesion: 0.25
Nodes (8): Arquitetura (arquivos alterados), Contexto e objetivo, Design: Colunas Testes e Aguardando Publicação, Edge cases, Modelo de dados, Mudanças no motor de métricas, Quadro (Kanban), Testes

### Community 43 - "Design Indicador de semana mês"
Cohesion: 0.25
Nodes (7): Arquitetura, Contexto e objetivo, Design: Indicador de semana/mês no dashboard, Edge cases, Fonte de dados, Formato do rótulo, Testes

### Community 44 - "Design do quadro Kanban e"
Cohesion: 0.29
Nodes (7): Arquitetura (camadas), Contexto e objetivo, Edge cases, Design do quadro Kanban e Tasks, Modelo de dados (domain), Rotas e telas, Testes

### Community 45 - "Global Constraints"
Cohesion: 0.33
Nodes (5): Final Verification, Global Constraints, Informações do Quadro Implementation Plan, Task 1: Prazo no card, Task 2: Faixa de resumo e contagem por coluna

### Community 46 - "Global Constraints"
Cohesion: 0.33
Nodes (5): Final Verification, Global Constraints, Indicador de Semana/Mês no Dashboard Implementation Plan, Task 1: `formatPeriodLabel`, Task 2: Renderizar o rótulo no dashboard

### Community 47 - "CompletedTaskLimit por equipe"
Cohesion: 0.33
Nodes (6): CompletedTaskLimit por equipe, Consulta sobre limite de concluídas e botões de confirmação, Diagnóstico de coluna completed_task_limit ausente, Migração de banco pendente, Consulta sobre impacto do limite de DONE nas métricas, Separação entre limite visual do board e métricas

### Community 48 - "Design da hierarquia visual do"
Cohesion: 0.40
Nodes (5): Plano de hierarquia visual das métricas, Mudança restrita à camada de apresentação, Cores semânticas dos indicadores, Design da hierarquia visual do dashboard, Não criar histórico de WIP decorativo

### Community 50 - "0001 regular venus sql"
Cohesion: 0.40
Nodes (4): "task_blocked_periods", "task_status_changes", "task_types", "tasks"

### Community 51 - "commit msg test sh"
Cohesion: 0.83
Nodes (3): assert_invalid(), assert_valid(), commit-msg.test.sh script

### Community 52 - "package json"
Cohesion: 0.50
Nodes (3): name, private, version

## Knowledge Gaps
- **494 isolated node(s):** `"members"`, `"teams"`, `"task_blocked_periods"`, `"task_status_changes"`, `"task_types"` (+489 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **62 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `TaskStatus` connect `task ts` to `metrics query port ts`, `drizzle metrics query port ts`, `actions ts`, `historical task form modal tsx`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Why does `createTeamUseCases()` connect `Área createTeamUseCases` to `Área TeamRepository`, `page tsx`, `actions ts`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `resetDatabase()` connect `Área getTestDatabaseUrl` to `drizzle metrics query port ts`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **What connects `"members"`, `"teams"`, `"task_blocked_periods"` to the rest of the system?**
  _506 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `task ts` be split into smaller, more focused modules?**
  _Cohesion score 0.060867293625914316 - nodes in this community are weakly interconnected._
- **Should `Área TeamRepository` be split into smaller, more focused modules?**
  _Cohesion score 0.07782898105478751 - nodes in this community are weakly interconnected._
- **Should `metrics query port ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07541478129713423 - nodes in this community are weakly interconnected._