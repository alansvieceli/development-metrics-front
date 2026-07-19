# Design: Indicador de semana/mês no dashboard

Data: 2026-07-18
Estende a spec [2026-07-17-metrics-dashboard-design.md](./2026-07-17-metrics-dashboard-design.md).

## Contexto e objetivo

O dashboard de métricas hoje só mostra os botões "Semana"/"Mês" e as setas de navegação (`PeriodFilter`), sem indicar textualmente qual semana ou mês está sendo exibido. Adicionar um rótulo com essa informação.

## Fonte de dados

Nenhum dado novo é necessário: `PeriodMetrics` (retornado por `get-metrics-for-period.ts`) já carrega `periodStart` e `periodEnd`, calculados por `getPeriodRange` ([period.ts](../../../src/application/metrics/period.ts)) — `periodStart` é sempre a segunda-feira da semana (quando `periodType` é `WEEK`) ou o dia 1 do mês (quando `MONTH`), e `periodEnd` é o limite exclusivo seguinte. `MetricsDashboard` já recebe esse valor via a prop `current`. É puramente uma mudança de apresentação.

## Formato do rótulo

Função pura nova `formatPeriodLabel(periodType, periodStart, periodEnd)`:

- **Semana**: `"Semana {N} · {dd/mm} – {dd/mm}"`, ex. `"Semana 29 · 13/07 – 19/07"`. `{N}` é o número da semana ISO (segunda a domingo, semana que contém a primeira quinta-feira do ano define a semana 1), calculado a partir de `periodStart`. As datas exibidas são `periodStart` e `periodEnd` menos um dia (já que `periodEnd` é exclusivo).
- **Mês**: `"{Mês} de {ano}"`, ex. `"Julho de 2026"`, com o mês por extenso e capitalizado, usando `periodStart`.

## Arquitetura

```text
presentation/metrics-dashboard/
  format-period-label.ts      # formatPeriodLabel(periodType, periodStart, periodEnd) — função pura
  format-period-label.test.ts
  metrics-dashboard.tsx       # renderiza o rótulo no cabeçalho, ao lado do título "Métricas" e antes do PeriodFilter
```

Nenhuma mudança em `application`, `domain` ou `infrastructure`: os dados já chegam prontos em `current.periodStart`/`current.periodEnd`.

## Edge cases

- **Virada de ano na semana ISO**: uma semana que começa em dezembro pode pertencer à semana 1 do ano seguinte (ex.: segunda-feira 29/dez/2025 é semana 1 de 2026); uma semana que começa no início de janeiro pode pertencer à última semana do ano anterior (semana 52 ou 53). O cálculo usa a quinta-feira da semana (padrão ISO 8601) para decidir o ano e o número corretos.
- **Mês com nome em pt-BR**: usar `Intl`/`toLocaleDateString("pt-BR", { month: "long" })`, já usado em outros pontos do dashboard ([metric-trend-chart.tsx](../../../src/presentation/metrics-dashboard/metric-trend-chart.tsx)), e capitalizar a primeira letra (a API retorna em minúsculas).

## Testes

- Unitário de `formatPeriodLabel`: uma semana comum, uma semana que cruza a virada do ano em ambos os sentidos (dezembro → semana 1, janeiro → semana 52/53 do ano anterior), e um mês qualquer.
