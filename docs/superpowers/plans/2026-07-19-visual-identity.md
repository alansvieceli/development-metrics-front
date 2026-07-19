# Identidade Visual — Painel de Instrumentos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o visual padrão do `create-next-app` (fonte Geist, header azul genérico) pela identidade "Painel de Instrumentos" definida em [docs/superpowers/specs/2026-07-19-visual-identity-design.md](../specs/2026-07-19-visual-identity-design.md): paleta grafite escura única, tipografia monoespaçada para títulos/dados, e um novo header com marca e navegação por abas.

**Architecture:** Mudança puramente de apresentação (CSS + fontes + duas telas de composição). A maior parte do app (`kanban-board.tsx`, `period-filter.tsx`, `task-move-select.tsx`, `task-form-modal.tsx`, telas de `team`/`task-type`) já consome cor exclusivamente via variáveis CSS centralizadas em `globals.css` (`--surface`, `--border`, `--accent`, etc.) — repontar essas variáveis para a nova paleta atualiza essas telas automaticamente, sem editar cada arquivo. Este plano só edita arquivos onde (a) a variável não cobre o caso (fontes, header), (b) uma classe Tailwind hardcoded assumia tema claro (`hover:bg-black/5`, texto `text-red-600`), ou (c) a spec pede um tratamento tipográfico que a variável sozinha não dá (`font-mono` nos valores de métrica).

**Tech Stack:** Next.js App Router, TypeScript estrito, Tailwind CSS v4 (variáveis CSS `--(--nome)`), `next/font/google`, Recharts.

## Global Constraints

- **Nomes de variável reaproveitados, não renomeados.** A spec define os tokens como `--ink`/`--panel`/`--panel-raised`/`--signal`, mas o código já usa `--background`/`--surface`/`--header-bg`/`--accent` em ~14 arquivos. Este plano repontua os nomes **existentes** para os hex da spec (`--background` = ink `#1c1f22`, `--header-bg` = panel `#24282c`, `--surface` = panel-raised `#2a2f33`, `--accent` = signal `#2dd4bf`) em vez de renomear em cada arquivo — mesmo resultado visual, menor diff. Só entram variáveis **novas** de fato: `--foreground-muted`, `--chart-primary`, `--warn`, `--critical`.
- **Tema único.** O bloco `@media (prefers-color-scheme: light)`/`dark` de `globals.css` é removido; `color-scheme: dark` fica fixo em `:root`. Não existe mais alternância por preferência do sistema.
- **Cores do gráfico de tendência validadas com o skill `dataviz`** (script `scripts/validate_palette.js`, relativo à base do skill), porque `--accent` (brilhante, `#2dd4bf`, L≈0.785) falha a faixa de luminosidade de modo escuro (L 0.48–0.67) quando usado como traço de série — por isso o gráfico ganha um par dedicado, mais escuro, em vez de reaproveitar `--accent` da UI:
  - Comando: `node scripts/validate_palette.js "#0d9488,#d97706" --mode dark --surface "#2a2f33"`
  - Resultado: `ALL CHECKS PASS` — faixa de luminosidade OK, CVD ΔE 12.5 (protan), piso de visão normal ΔE 24.3, contraste ≥ 3:1 nos dois.
  - `--accent` (`#2dd4bf`) continua sendo usado só na UI (botões, pílulas ativas, indicador de navegação) — não em marcas de gráfico.
- **Contraste de texto verificado com a função `contrast()` do mesmo script** (não é checagem categórica, é WCAG texto-sobre-fundo):
  - `--foreground` (`#e5e7eb`) vs `--background`/`--header-bg`/`--surface`: 13.4:1 / 12.0:1 / 10.9:1.
  - `--foreground-muted` (`#9ca3af`) vs `--background`: 6.5:1; vs `--surface`: 5.3:1.
  - `--accent-fg` (`#0b1a18`) vs `--accent` (`#2dd4bf`): 9.6:1.
  - `--critical` vs `--background`/`--surface`: 5.99:1 / 4.89:1 — por isso o token usa `#f87171` (vermelho mais claro) em vez do `#ef4444` da spec original, que dava só 2.8:1 no card (`#dc2626`, cor atual do "⛔ Bloqueado") e 4.4:1 no fundo da página — ambos abaixo do mínimo de leitura confortável de texto.
  - Tick padrão do Recharts (`#666666`) vs `--surface`: só 2.36:1 — por isso a Task 5 sobrescreve a cor dos ticks dos eixos para `--foreground-muted`.
- Nenhuma mudança em `domain`, `application` ou `infrastructure` — só `presentation`, `app/layout.tsx`, `app/globals.css` e fontes.
- Sem teste unitário novo: mudança é CSS/composição de JSX, sem lógica de ramificação nova. Segue a convenção já usada em `task-move-select.tsx`/`team-switcher.tsx` (Client Components de composição/roteamento não têm teste isolado — sem `@testing-library/react`/jsdom no projeto). A verificação final (Task 6) roda a suíte completa existente (unit + E2E) para garantir zero regressão, mais uma checagem visual manual via `npm run dev`.
- Arquivos em `kebab-case`; componentes React e tipos em `PascalCase`. Ver [guidelines.md](../../../techdocs/guidelines.md).
- Mensagens de commit seguem `tipo(contexto)!: descrição` — português, minúsculo, verbo no presente, sem ponto final, sem corpo. Contexto usado neste plano: `layout`.
- Banco local via `docker compose -f devops/docker-compose.yml up -d`, necessário só para `npm run test:e2e` na Task 6 (as demais tasks não tocam nada que dependa do banco).

---

### Task 1: Paleta grafite única e tokens novos

**Files:**
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: nada (primeira task).
- Produces: variáveis CSS `--background`, `--surface`, `--foreground`, `--foreground-muted` (nova), `--header-bg`, `--header-fg`, `--accent`, `--accent-fg`, `--border`, `--chart-primary` (nova), `--chart-secondary`, `--warn` (nova), `--critical` (nova); classes utilitárias `.brand-cursor` e `.pulse-dot` (usadas pela Task 3 e por specs futuras); regra `h1, h2, h3` em fonte mono; tokens de tema `--font-mono`/`--font-sans` (Tailwind `@theme inline`) — ambos usam `--font-jetbrains-mono`/`--font-ibm-plex-sans`, definidas pela Task 2 (sem essa variável ainda, cai no fallback `ui-monospace, monospace` / `Arial` até a Task 2).

**Nota importante descoberta na revisão desta task:** a utilitária Tailwind `font-mono` já é usada hoje em `task-card.tsx` (id externo da task), mas o projeto nunca conectou `--font-geist-mono` ao tema do Tailwind — `font-mono` sempre renderizou a pilha mono padrão do sistema, nunca a fonte carregada. Esta task corrige isso de graça (a task-card.tsx passa a exibir o id em JetBrains Mono de verdade, sem precisar editar aquele arquivo) e a Task 5 depende dessa correção para exibir os valores de métrica em mono.

- [ ] **Step 1: Substituir o conteúdo de `globals.css`**

```css
@import "tailwindcss";

@theme inline {
	--font-sans: var(--font-ibm-plex-sans);
	--font-mono: var(--font-jetbrains-mono);
}

:root {
	--background: #1c1f22;
	--surface: #2a2f33;
	--foreground: #e5e7eb;
	--foreground-muted: #9ca3af;
	--header-bg: #24282c;
	--header-fg: #e5e7eb;
	--accent: #2dd4bf;
	--accent-fg: #0b1a18;
	--border: #34383c;
	--chart-primary: #0d9488;
	--chart-secondary: #d97706;
	--warn: #f5a623;
	--critical: #f87171;
	color-scheme: dark;
}

html {
	height: 100%;
}

html,
body {
	max-width: 100vw;
	overflow-x: hidden;
}

body {
	min-height: 100%;
	display: flex;
	flex-direction: column;
	color: var(--foreground);
	background: var(--background);
	font-family: var(--font-ibm-plex-sans), Arial, Helvetica, sans-serif;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
}

h1,
h2,
h3 {
	font-family: var(--font-jetbrains-mono), ui-monospace, monospace;
}

a {
	color: inherit;
	text-decoration: none;
}

.brand-cursor {
	animation: blink 1.1s step-end infinite;
}

@keyframes blink {
	50% {
		opacity: 0;
	}
}

.pulse-dot {
	animation: pulse-dot 1.4s ease-in-out infinite;
}

@keyframes pulse-dot {
	0%,
	100% {
		opacity: 1;
	}
	50% {
		opacity: 0.4;
	}
}

@media (prefers-reduced-motion: reduce) {
	.brand-cursor,
	.pulse-dot {
		animation: none;
	}
}
```

- [ ] **Step 2: Verificar tipos e lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS sem erros (mudança é só CSS, não deve afetar TypeScript/Biome).

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(layout)!: aplica paleta grafite unica e novos tokens visuais"
```

---

### Task 2: Fontes — JetBrains Mono e IBM Plex Sans

**Files:**
- Modify: `src/presentation/shared/root-shell.tsx`

**Interfaces:**
- Consumes: nada de outras tasks.
- Produces: variáveis CSS `--font-jetbrains-mono` e `--font-ibm-plex-sans` no elemento `<html>` — consumidas por `globals.css` (Task 1, já commitado) e pela marca do header (Task 3).

- [ ] **Step 1: Trocar as fontes em `root-shell.tsx`**

```tsx
import { IBM_Plex_Sans, JetBrains_Mono } from "next/font/google";
import "@/app/globals.css";

const jetbrainsMono = JetBrains_Mono({
	variable: "--font-jetbrains-mono",
	subsets: ["latin"],
	weight: ["500", "700"],
});

const ibmPlexSans = IBM_Plex_Sans({
	variable: "--font-ibm-plex-sans",
	subsets: ["latin"],
	weight: ["400", "500", "600"],
});

export function RootShell({ children }: { children: React.ReactNode }) {
	return (
		<html
			lang="pt-BR"
			className={`${jetbrainsMono.variable} ${ibmPlexSans.variable}`}
		>
			<body>{children}</body>
		</html>
	);
}
```

- [ ] **Step 2: Verificar tipos e lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 3: Checagem visual manual**

Run: `npm run dev`
Abrir `http://localhost:3000` (redireciona pra `/teams` ou `/board`) e confirmar que o texto do corpo mudou de fonte (sem serifa, levemente diferente da Geist) e que títulos (`h1`/`h2`) aparecem em monoespaçada.

- [ ] **Step 4: Commit**

```bash
git add src/presentation/shared/root-shell.tsx
git commit -m "feat(layout)!: troca fontes padrao por jetbrains mono e ibm plex sans"
```

---

### Task 3: Header — marca com cursor e navegação por abas

**Files:**
- Create: `src/presentation/shared/header-nav.tsx`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Consumes: `--header-fg`, `--foreground-muted`, `--accent`, `.brand-cursor` (Task 1).
- Produces: `HeaderNav()` — Client Component sem props, renderiza os 3 links de navegação (`/board`, `/metrics`, `/task-types`) com indicador de rota ativa.

- [ ] **Step 1: Criar `header-nav.tsx`**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
	{ href: "/board", label: "Quadro" },
	{ href: "/metrics", label: "Métricas" },
	{ href: "/task-types", label: "Tipos de task" },
] as const;

export function HeaderNav() {
	const pathname = usePathname();

	return (
		<nav className="flex items-center gap-5 font-mono text-xs uppercase tracking-wide">
			{NAV_LINKS.map((link) => {
				const active = pathname === link.href;
				return (
					<Link
						key={link.href}
						href={link.href}
						className={`flex items-center gap-1.5 ${
							active ? "text-(--header-fg)" : "text-(--foreground-muted)"
						}`}
					>
						<span
							aria-hidden="true"
							className={`h-1.5 w-1.5 rounded-full ${
								active ? "bg-(--accent)" : "bg-transparent"
							}`}
						/>
						{link.label}
					</Link>
				);
			})}
		</nav>
	);
}
```

- [ ] **Step 2: Atualizar `layout.tsx`**

```tsx
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { selectTeamAction } from "@/app/actions";
import { createTeamUseCases } from "@/composition/team";
import { HeaderNav } from "@/presentation/shared/header-nav";
import { RootShell } from "@/presentation/shared/root-shell";
import { TeamSwitcher } from "@/presentation/team/team-switcher";

export const metadata: Metadata = {
	title: "Development Metrics",
	description: "Development Metrics",
};

export default async function RootLayout({
	children,
	modal,
}: {
	children: ReactNode;
	modal: ReactNode;
}) {
	const useCases = createTeamUseCases();
	const currentTeam = await useCases.getCurrentTeam();
	const teams = currentTeam ? await useCases.listTeams() : [];

	return (
		<RootShell>
			<header className="flex items-center justify-between bg-(--header-bg) px-6 py-4">
				<span className="font-mono font-bold text-(--header-fg)">
					DEV·METRICS
					<span className="brand-cursor text-(--accent)">_</span>
				</span>
				{currentTeam ? (
					<div className="flex items-center gap-5">
						<HeaderNav />
						<TeamSwitcher
							currentTeam={currentTeam}
							teams={teams}
							selectTeamAction={selectTeamAction}
						/>
					</div>
				) : null}
			</header>
			{children}
			{modal}
		</RootShell>
	);
}
```

Nota: `Link` deixa de ser importado diretamente aqui (os links migraram para `HeaderNav`) — o import antigo de `next/link` é removido. "Tipos de task" deixa de ser um link solto fora do `<nav>` e passa a ser a terceira aba, junto de "Quadro"/"Métricas" — mesmas 3 rotas, mesmo destino, só a apresentação muda.

- [ ] **Step 3: Verificar tipos, lint e knip**

Run: `npm run typecheck && npm run lint && npm run knip`
Expected: PASS — `knip` não deve acusar `header-nav.tsx` como não utilizado (é importado por `layout.tsx`).

- [ ] **Step 4: Rodar a suíte E2E existente**

Run: `docker compose -f devops/docker-compose.yml up -d && npm run test:e2e`
Expected: PASS — os testes existentes buscam os links por `getByRole("link", { name: "Métricas" })`/`"Quadro"` (nome acessível = texto do link), que continua idêntico; nenhuma asserção depende da estrutura do `<nav>` nem da cor.

- [ ] **Step 5: Checagem visual manual**

Com `npm run dev` rodando, abrir `/board`: confirmar que a marca "DEV·METRICS_" aparece com o cursor piscando, e que a aba da rota atual ("Quadro") mostra o ponto colorido enquanto as outras ficam em cinza-claro (`--foreground-muted`).

- [ ] **Step 6: Commit**

```bash
git add src/presentation/shared/header-nav.tsx src/app/layout.tsx
git commit -m "feat(layout)!: redesenha header com marca e navegacao por abas"
```

---

### Task 4: Corrige contraste de elementos que assumiam tema claro

**Files:**
- Modify: `src/presentation/team/team-switcher.tsx:54,64,71`
- Modify: `src/presentation/team/team-select-view.tsx:60`
- Modify: `src/presentation/shared/modal.tsx:42`
- Modify: `src/presentation/task/task-card.tsx:75`

**Interfaces:**
- Consumes: `--critical` (Task 1).
- Produces: nenhuma interface nova — só corrige contraste visual.

- [ ] **Step 1: Trocar `hover:bg-black/5` por `hover:bg-white/10` nos 5 lugares**

Esses hovers usavam preto a 5% de opacidade, pensado pra um fundo claro — no fundo grafite novo isso é quase invisível. `white/10` dá o mesmo tipo de destaque sutil, mas visível em fundo escuro.

Em `src/presentation/team/team-switcher.tsx`, três ocorrências (linhas 54, 64, 71) — cada uma trocando `hover:bg-black/5` por `hover:bg-white/10` mantendo o resto da className igual, por exemplo a da linha 54:

```tsx
className="rounded-lg px-2 py-1 text-left hover:bg-white/10"
```

e as linhas 64 e 71 (idênticas entre si):

```tsx
className="rounded-lg px-2 py-1 hover:bg-white/10"
```

Em `src/presentation/team/team-select-view.tsx`, linha 60:

```tsx
className="w-full rounded-lg border border-(--border) px-4 py-2 text-left hover:bg-white/10 disabled:opacity-60"
```

Em `src/presentation/shared/modal.tsx`, linha 42:

```tsx
className="absolute top-3 right-3 rounded-lg p-1 hover:bg-white/10"
```

- [ ] **Step 2: Trocar a cor do texto "Bloqueado" em `task-card.tsx`**

`text-red-600` (`#dc2626`) dá só 2.8:1 de contraste contra o novo fundo do card (`--surface`, `#2a2f33`) — abaixo do mínimo de leitura confortável. Trocar pelo token `--critical` (`#f87171`, validado em 4.89:1 contra `--surface` na Task 1):

Linha 75, de:

```tsx
{task.blocked ? (
	<p className="text-xs font-semibold text-red-600">⛔ Bloqueado</p>
) : null}
```

para:

```tsx
{task.blocked ? (
	<p className="text-xs font-semibold text-(--critical)">⛔ Bloqueado</p>
) : null}
```

- [ ] **Step 3: Verificar tipos e lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 4: Checagem visual manual**

Com `npm run dev` rodando: abrir o seletor de time no header e passar o mouse sobre um item da lista (deve destacar visivelmente); criar/editar uma task e marcá-la como bloqueada — o texto "⛔ Bloqueado" deve ficar claramente legível no card.

- [ ] **Step 5: Commit**

```bash
git add src/presentation/team/team-switcher.tsx src/presentation/team/team-select-view.tsx src/presentation/shared/modal.tsx src/presentation/task/task-card.tsx
git commit -m "fix(layout)!: corrige contraste de hover e texto bloqueado no tema escuro"
```

---

### Task 5: Valores de métrica em mono, cores e tooltip do gráfico

**Files:**
- Modify: `src/presentation/metrics-dashboard/metric-card.tsx`
- Modify: `src/presentation/metrics-dashboard/metric-trend-chart.tsx`

**Interfaces:**
- Consumes: `--chart-primary`, `--chart-secondary`, `--surface`, `--border`, `--foreground`, `--foreground-muted` (Task 1), utilitária Tailwind `font-mono` corrigida (Task 1).
- Produces: nenhuma interface nova — os componentes continuam `MetricCard({ definition, current, weeklySeries, monthlySeries })` e `MetricTrendChart({ variant, weeklyPoints, monthlyPoints, format })`.

- [ ] **Step 1: Exibir os valores de métrica em fonte mono**

A spec pede "valor em destaque em mono" pro gauge de cada métrica — hoje `CurrentValue` em `metric-card.tsx` usa a fonte de corpo. Em `src/presentation/metrics-dashboard/metric-card.tsx`, na função `CurrentValue`, adicionar `font-mono` às três classes que exibem números (não à mensagem "sem dados", que continua em texto normal):

```tsx
function CurrentValue({
	definition,
	value,
}: {
	definition: MetricDefinition;
	value: PeriodMetrics[keyof PeriodMetrics];
}) {
	if (definition.shape === "duration-dual") {
		const stats = value as DurationStats | null;
		if (!stats) {
			return <p className="text-sm opacity-60">sem dados</p>;
		}
		return (
			<p className="flex gap-4 font-mono text-lg font-semibold">
				<span>Média: {formatDuration(stats.averageMs)}</span>
				<span>Mediana: {formatDuration(stats.medianMs)}</span>
			</p>
		);
	}
	if (definition.shape === "percent-single") {
		const percent = value as number | null;
		if (percent === null) {
			return <p className="text-sm opacity-60">sem dados</p>;
		}
		return (
			<p className="font-mono text-lg font-semibold">
				{formatPercent(percent)}
			</p>
		);
	}
	return <p className="font-mono text-lg font-semibold">{value as number}</p>;
}
```

- [ ] **Step 2: Trocar a cor da série primária de `--accent` para `--chart-primary`**

`--accent` (`#2dd4bf`, brilhante) é pensado pra UI (botões, indicadores) e falha a checagem de luminosidade de modo escuro do skill `dataviz` quando usado como traço de gráfico (ver Global Constraints). `--chart-primary` (`#0d9488`) é o par validado pra esse uso. Duas ocorrências:

Linha ~103, no `<Bar>`:

```tsx
<Bar
	dataKey="primary"
	name="Throughput"
	fill="var(--chart-primary)"
	radius={[4, 4, 0, 0]}
/>
```

Linha ~124, no `<Line>` primário:

```tsx
<Line
	type="monotone"
	dataKey="primary"
	name={variant === "dual-line" ? "Média" : "Valor"}
	stroke="var(--chart-primary)"
	strokeWidth={2}
	dot={{ r: 4 }}
	connectNulls
/>
```

A `<Line>` secundária (mediana) continua usando `var(--chart-secondary)` — só o hex por trás da variável mudou na Task 1, sem precisar editar esse trecho.

- [ ] **Step 3: Estilizar o `Tooltip` do Recharts pro tema escuro**

Sem estilo customizado, o `Tooltip` do Recharts renderiza uma caixa branca com texto preto por padrão — quebra a identidade escura. Adicionar `contentStyle`/`itemStyle`/`labelStyle` nos dois `<Tooltip>` (um no `BarChart`, um no `LineChart`):

```tsx
<Tooltip
	contentStyle={{
		background: "var(--surface)",
		border: "1px solid var(--border)",
		borderRadius: 6,
		fontSize: 12,
	}}
	itemStyle={{ color: "var(--foreground)" }}
	labelStyle={{ color: "var(--foreground-muted)" }}
	formatter={(value) =>
		typeof value === "number" ? formatValue(format, value) : String(value)
	}
/>
```

(mesmo bloco nos dois `<Tooltip>` — o `formatter` já existente permanece igual, só ganham as três props de estilo antes dele.)

- [ ] **Step 4: Corrigir a cor dos ticks dos eixos**

A cor padrão do texto dos eixos do Recharts (`#666`) dá só 2.36:1 de contraste contra `--surface` — sobrescrever pra `--foreground-muted` (5.3:1) nos 4 `tick=` (2 no `BarChart`, 2 no `LineChart`):

```tsx
<XAxis
	dataKey="label"
	tick={{ fontSize: 11, fill: "var(--foreground-muted)" }}
/>
<YAxis width={32} tick={{ fontSize: 11, fill: "var(--foreground-muted)" }} />
```

(mesmo par de props nos dois `XAxis`/`YAxis`, tanto no `BarChart` quanto no `LineChart`.)

- [ ] **Step 5: Verificar tipos e lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 6: Checagem visual manual**

Com `npm run dev` rodando e ao menos uma task concluída no time atual: abrir `/metrics` e confirmar que os números de cada card (médias, medianas, percentuais, WIP) aparecem em fonte mono; passar o mouse sobre um ponto do gráfico de qualquer card de duração (ex.: "Lead time") e confirmar que o tooltip aparece com fundo escuro (não branco) e texto legível; confirmar que os rótulos dos eixos (datas) são legíveis, não cinza-escuro quase invisível.

- [ ] **Step 7: Commit**

```bash
git add src/presentation/metrics-dashboard/metric-card.tsx src/presentation/metrics-dashboard/metric-trend-chart.tsx
git commit -m "fix(layout)!: exibe valores de metrica em mono e ajusta grafico pro tema escuro"
```

---

### Task 6: Verificação final

**Files:** nenhum (só verificação).

**Interfaces:**
- Consumes: todas as tasks anteriores.
- Produces: nada — task de fechamento do plano.

- [ ] **Step 1: Rodar toda a verificação do projeto**

Run: `npm run typecheck && npm run lint && npm test && npm run test:e2e && npm run knip`
Expected: tudo passa sem erros — nenhuma regressão nos testes unitários (`vitest`) nem E2E (`playwright`) já existentes, `knip` não acusa nada novo como não utilizado.

- [ ] **Step 2: Revisão visual manual final**

Com `npm run dev` rodando, percorrer as telas principais e confirmar a identidade grafite/mono aplicada de ponta a ponta, sem resíduo do tema claro/azul antigo nem texto ilegível:

- `/teams` (seleção e criação de time)
- `/board` (quadro, cards, modal de criar/editar task)
- `/metrics` (dashboard, filtro de período, gráficos)
- `/task-types` (lista e formulário de tipos)

Nenhum commit nesta task — é só a verificação de que as 5 tasks anteriores, juntas, entregam a spec [2026-07-19-visual-identity-design.md](../specs/2026-07-19-visual-identity-design.md) sem regressão.
