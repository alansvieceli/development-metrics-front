# Design: Dashboard de métricas

Data: 2026-07-17
Sub-projeto 4 de 4 do produto Development Metrics (Times → Kanban/Tasks → Motor de métricas → **Dashboard**).

Depende da spec [2026-07-17-metrics-engine-design.md](./2026-07-17-metrics-engine-design.md): consome `get-metrics-for-period` e `get-metrics-series`. Não recalcula nada — só formata e exibe.

## Contexto e objetivo

Área visual (`/metrics`) com as 8 métricas do time selecionado, filtráveis por semana/mês (padrão: semana atual), e um gráfico de evolução por métrica comparando semanas e meses passados.

## Navegação entre as 2 áreas

O header ganha uma navegação "Quadro" (`/board`) / "Métricas" (`/metrics`), além do seletor de time já definido na spec de Times.

## Filtro de período (topo da página)

- Alternador **Semana | Mês** define a granularidade dos 8 números exibidos.
- Setas **‹ ›** navegam para o período anterior/seguinte a partir do atual (sem limite — é possível navegar para um período futuro, que simplesmente aparece sem dados).
- Estado do filtro (tipo de período + data de referência) vive na **URL** (`/metrics?period=week&date=2026-07-14`), lido pelo Server Component da página via `searchParams` — favoritável e compartilhável. Padrão sem parâmetros: semana atual.

## Layout

Grid sempre visível com um card por métrica (sem accordion/expansão), na ordem: Lead time, Cycle time, Tempo bloqueado, Tempo aguardando code review, Taxa de retrabalho, Throughput, WIP, Previsibilidade.

Cada card mostra:

- Nome da métrica e valor(es) atual(is) do período filtrado.
- Um **gráfico de evolução** com seu próprio alternador **semanal/mensal** (independente do filtro de período do topo — esse alternador só troca a granularidade do histórico exibido no gráfico daquele card). Janela: **últimas 8 semanas** ou **últimos 6 meses**, conforme o alternador do card.

Especificação por métrica (forma do gráfico, conforme o método do dataviz skill: a forma segue o trabalho do dado):

- **Lead time, Cycle time, Tempo bloqueado, Tempo aguardando code review**: valor atual mostra média e mediana lado a lado, identificadas. Gráfico de linha com **2 séries** (média e mediana), com legenda — permite ver quando elas divergem (outliers puxando a média).
- **Taxa de retrabalho, Previsibilidade**: valor atual em %. Gráfico de linha, série única, eixo 0–100%.
- **Throughput**: valor atual = contagem do período. Gráfico de barras, série única (contagem por período passado).
- **WIP**: só o número atual (sempre "agora", não varia com o filtro nem tem histórico) — **sem gráfico**, para não reconstruir artificialmente um "WIP em cada semana passada" a partir do histórico de transições.

Cores seguem a paleta de marca do app (`#E4FD97` claro / `#2D3E2C` escuro) como hue principal das séries; a paleta final (incluindo o par usado para média/mediana) é validada com `scripts/validate_palette.js` do dataviz skill durante a implementação, não nesta spec.

## Arquitetura

```text
application/metrics já expõe get-metrics-for-period e get-metrics-series (spec 3) — nenhum novo caso de uso de aplicação é necessário aqui.

presentation/metrics-dashboard/
  metrics-page.tsx         # server component: lê searchParams, chama os casos de uso, monta os dados dos 8 cards
  period-filter.tsx        # client component: toggle semana/mês + setas, navega via router (atualiza a URL)
  metric-card.tsx          # tile com valor(es) atuais
  metric-trend-chart.tsx   # client component (Recharts): linha (1 ou 2 séries) ou barra, com alternador semanal/mensal próprio

app/metrics/page.tsx
```

## Biblioteca de gráficos

**Recharts** é adotado para os gráficos do dashboard. Registrado em [guidelines.md](../../../techdocs/guidelines.md).

## Edge cases

- **Nenhuma task no período filtrado**: cards mostram "sem dados" no lugar do valor, sem quebrar layout.
- **Navegar para período futuro**: permitido; mostra "sem dados".
- **Métrica sem histórico suficiente para preencher a janela** (ex: time criado há 3 semanas, gráfico pede 8): mostra só os períodos que existem, sem preencher com zero.

## Testes

- Integração de `metrics-page`: dado um retorno mockado de `get-metrics-for-period`/`get-metrics-series`, os 8 cards renderizam os valores e o gráfico correto (linha 2 séries, linha 1 série, barra, ou nenhum gráfico para WIP).
- `period-filter`: trocar semana/mês e navegar ‹ › atualiza a URL corretamente.
