import { expect, test } from "@playwright/test";
import { resetDatabase } from "./reset-db";

test.beforeEach(async ({ page }) => {
	await resetDatabase();
	await page.goto("/teams");
	await page.getByPlaceholder("Nome do time").fill("Time A");
	await page.getByRole("button", { name: "Criar time" }).click();
	await page.getByRole("button", { name: "Time A" }).click();
});

test("mostra os 3 blocos com zeros/sem dados quando o time não tem tasks", async ({
	page,
}) => {
	await page.getByRole("link", { name: "Métricas" }).click();
	await expect(page).toHaveURL("/metrics");

	await expect(
		page.getByRole("heading", { name: "Situação atual" }),
	).toBeVisible();
	await expect(
		page.getByRole("heading", { name: "Resultado da semana" }),
	).toBeVisible();
	await expect(
		page.getByRole("heading", { name: "Tempo do fluxo" }),
	).toBeVisible();

	await expect(
		page.getByTestId("metric-tile-wip").getByText("0"),
	).toBeVisible();
	await expect(
		page.getByTestId("metric-tile-leadTime").getByText("sem dados"),
	).toBeVisible();
	await expect(
		page.getByTestId("metric-tile-delivered").getByText("sem dados"),
	).toBeVisible();

	await expect(
		page.getByRole("heading", { name: "Throughput por período" }),
	).toBeVisible();
	await expect(
		page.getByRole("heading", { name: "Planejado x entregue" }),
	).toBeVisible();
	await expect(
		page.getByRole("heading", { name: "Lead time x Cycle time" }),
	).toBeVisible();
	await expect(
		page.getByRole("heading", { name: "Composição do fluxo" }),
	).toBeVisible();
	await expect(
		page.getByTestId("metric-chart-flowComposition").getByText("sem dados"),
	).toBeVisible();
});

test("Situação atual reflete WIP, bloqueados e coluna atual das tasks", async ({
	page,
}) => {
	await page.getByRole("button", { name: "Task" }).click();
	await page.getByLabel("Id externo").fill("TASK-1");
	await page.getByLabel("Descrição").fill("Corrigir bug de login");
	await page
		.getByLabel("Coluna inicial")
		.selectOption({ label: "Desenvolvimento" });
	await page.getByLabel("Data prevista de entrega").fill("2026-12-31");
	await page.getByRole("button", { name: "Salvar" }).click();

	await page.getByRole("button", { name: "Task", exact: true }).click();
	await page.getByLabel("Id externo").fill("TASK-2");
	await page.getByLabel("Descrição").fill("Escrever testes de login");
	await page.getByLabel("Coluna inicial").selectOption({ label: "Testes" });
	await page.getByLabel("Data prevista de entrega").fill("2026-12-31");
	await page.getByRole("button", { name: "Salvar" }).click();

	await page
		.getByTitle("História")
		.filter({ hasText: "TASK-1" })
		.getByRole("button", { name: "Editar task" })
		.click();
	await page.getByRole("checkbox", { name: "⛔ Bloqueado" }).click();
	await page
		.getByRole("dialog")
		.getByRole("button", { name: "Fechar" })
		.click();

	await page.getByRole("link", { name: "Métricas" }).click();

	await expect(
		page.getByTestId("metric-tile-wip").getByText("2"),
	).toBeVisible();
	await expect(
		page.getByTestId("metric-tile-blocked").getByText("1"),
	).toBeVisible();
	await expect(
		page.getByTestId("metric-tile-inTesting").getByText("1"),
	).toBeVisible();
});

test("card retroativo concluído hoje entra em Entregues e Retrabalho", async ({
	page,
}) => {
	const today = new Date().toISOString().slice(0, 10);
	await page.getByRole("button", { name: "Retroativo" }).click();
	await page.getByLabel("Id externo").fill("TASK-HIST-1");
	await page.getByLabel("Descrição").fill("Migração legada");
	await page.getByLabel("Status da etapa 1").selectOption({ label: "Backlog" });
	await page.getByLabel("Data da etapa 1").fill(today);
	await page.getByRole("button", { name: "+ Adicionar etapa" }).click();
	await page
		.getByLabel("Status da etapa 2")
		.selectOption({ label: "Desenvolvimento" });
	await page.getByLabel("Data da etapa 2").fill(today);
	await page.getByRole("button", { name: "+ Adicionar etapa" }).click();
	await page.getByLabel("Status da etapa 3").selectOption({ label: "Revisão" });
	await page.getByLabel("Data da etapa 3").fill(today);
	await page.getByRole("button", { name: "+ Adicionar etapa" }).click();
	// Volta pra Desenvolvimento: essa é a transição que conta como retrabalho.
	await page
		.getByLabel("Status da etapa 4")
		.selectOption({ label: "Desenvolvimento" });
	await page.getByLabel("Data da etapa 4").fill(today);
	await page.getByRole("button", { name: "+ Adicionar etapa" }).click();
	await page.getByLabel("Status da etapa 5").selectOption({ label: "Revisão" });
	await page.getByLabel("Data da etapa 5").fill(today);
	await page.getByRole("button", { name: "+ Adicionar etapa" }).click();
	await page
		.getByLabel("Status da etapa 6")
		.selectOption({ label: "Concluído" });
	await page.getByLabel("Data da etapa 6").fill(today);
	await page.getByLabel("Data prevista de entrega").fill(today);
	await page.getByRole("button", { name: "Salvar" }).click();

	await page.getByRole("link", { name: "Métricas" }).click();
	await expect(
		page.getByTestId("metric-tile-delivered").getByText("1/1"),
	).toBeVisible();
	await expect(
		page.getByTestId("metric-tile-reworkCount").getByText("1 cards"),
	).toBeVisible();
});

test("mostra o rótulo do período no cabeçalho e atualiza ao trocar de mês", async ({
	page,
}) => {
	await page.getByRole("link", { name: "Métricas" }).click();
	await expect(
		page.getByText(/^Semana \d+ · \d{2}\/\d{2} – \d{2}\/\d{2}$/),
	).toBeVisible();

	await page.getByRole("button", { name: "Mês" }).click();
	await expect(page.getByText(/^[A-ZÀ-Ú][a-zà-ú]+ de \d{4}$/)).toBeVisible();
});

test("o filtro de período atualiza a URL ao trocar semana/mês e navegar", async ({
	page,
}) => {
	await page.getByRole("link", { name: "Métricas" }).click();
	await expect(page).toHaveURL("/metrics");

	await page.getByRole("button", { name: "Mês" }).click();
	await page.waitForURL(/period=month/);
	const urlAfterMonth = new URL(page.url());

	await page.getByRole("button", { name: "Período anterior" }).click();
	await page.waitForURL(
		(url) =>
			url.search !== urlAfterMonth.search && /period=month/.test(url.search),
	);
	const urlAfterPrev = new URL(page.url());
	expect(urlAfterPrev.searchParams.get("date")).not.toBe(
		urlAfterMonth.searchParams.get("date"),
	);
});

test("seleciona a visão quinzenal entre semana e mês", async ({ page }) => {
	await page.getByRole("link", { name: "Métricas" }).click();
	const buttons = page
		.locator("button")
		.filter({ hasText: /Semana|Quinzena|Mês/ });
	await expect(buttons).toHaveText(["Semana", "Quinzena", "Mês"]);

	await page.getByRole("button", { name: "Quinzena" }).click();
	await expect(page).toHaveURL(/period=fortnight/);
	await expect(page.getByText(/^[12]ª quinzena ·/)).toBeVisible();
});

test("grafico de throughput mostra o card entregue e o titulo explica o calculo", async ({
	page,
}) => {
	const today = new Date().toISOString().slice(0, 10);
	await page.getByRole("button", { name: "Retroativo" }).click();
	await page.getByLabel("Id externo").fill("TASK-HIST-2");
	await page.getByLabel("Descrição").fill("Ajuste de layout");
	await page.getByLabel("Status da etapa 1").selectOption({ label: "Backlog" });
	await page.getByLabel("Data da etapa 1").fill(today);
	await page.getByRole("button", { name: "+ Adicionar etapa" }).click();
	await page
		.getByLabel("Status da etapa 2")
		.selectOption({ label: "Desenvolvimento" });
	await page.getByLabel("Data da etapa 2").fill(today);
	await page.getByRole("button", { name: "+ Adicionar etapa" }).click();
	await page
		.getByLabel("Status da etapa 3")
		.selectOption({ label: "Concluído" });
	await page.getByLabel("Data da etapa 3").fill(today);
	await page.getByLabel("Data prevista de entrega").fill(today);
	await page.getByRole("button", { name: "Salvar" }).click();

	await page.getByRole("link", { name: "Métricas" }).click();

	const throughputTitle = page.getByRole("heading", {
		name: "Throughput por período",
	});
	await expect(throughputTitle).toBeVisible();
	await expect(throughputTitle).toHaveAttribute(
		"title",
		"Cards entregues em cada um dos últimos 8 períodos (semanas, quinzenas ou meses).",
	);
	await expect(
		page.getByTestId("metric-chart-throughputTrend").locator("svg"),
	).toBeVisible();
});
