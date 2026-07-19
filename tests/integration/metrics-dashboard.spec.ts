import { expect, test } from "@playwright/test";
import { resetDatabase } from "./reset-db";

test.beforeEach(async ({ page }) => {
	await resetDatabase();
	await page.goto("/teams");
	await page.getByPlaceholder("Nome do time").fill("Time A");
	await page.getByRole("button", { name: "Criar time" }).click();
	await page.getByRole("button", { name: "Time A" }).click();
});

test("mostra os 10 cards de métricas sem dados quando o time não tem tasks", async ({
	page,
}) => {
	await page.getByRole("link", { name: "Métricas" }).click();
	await expect(page).toHaveURL("/metrics");

	await expect(page.getByRole("heading", { name: "Lead time" })).toBeVisible();
	await expect(page.getByRole("heading", { name: "Cycle time" })).toBeVisible();
	await expect(
		page.getByRole("heading", { name: "Tempo bloqueado" }),
	).toBeVisible();
	await expect(
		page.getByRole("heading", { name: "Tempo aguardando code review" }),
	).toBeVisible();
	await expect(
		page.getByRole("heading", { name: "Tempo em testes" }),
	).toBeVisible();
	await expect(
		page.getByRole("heading", { name: "Tempo aguardando publicação" }),
	).toBeVisible();
	await expect(
		page.getByRole("heading", { name: "Taxa de retrabalho" }),
	).toBeVisible();
	await expect(page.getByRole("heading", { name: "Throughput" })).toBeVisible();
	await expect(page.getByRole("heading", { name: "WIP" })).toBeVisible();
	await expect(
		page.getByRole("heading", { name: "Previsibilidade" }),
	).toBeVisible();

	const leadTimeCard = page.getByTestId("metric-card-leadTime");
	await expect(leadTimeCard.getByText("sem dados")).toBeVisible();

	const wipCard = page.getByTestId("metric-card-wip");
	await expect(wipCard.getByText("0")).toBeVisible();
});

test("WIP reflete tasks fora de todo e concluído", async ({ page }) => {
	await page.getByRole("button", { name: "Nova task" }).click();
	await page.getByLabel("Id externo").fill("TASK-1");
	await page.getByLabel("Descrição").fill("Corrigir bug de login");
	await page
		.getByLabel("Coluna inicial")
		.selectOption({ label: "Em Desenvolvimento" });
	await page.getByRole("button", { name: "Salvar" }).click();

	await page.getByRole("button", { name: "Nova task" }).click();
	await page.getByLabel("Id externo").fill("TASK-2");
	await page.getByLabel("Descrição").fill("Escrever testes de login");
	await page.getByLabel("Coluna inicial").selectOption({ label: "Testes" });
	await page.getByRole("button", { name: "Salvar" }).click();

	await page.getByRole("link", { name: "Métricas" }).click();

	const wipCard = page.getByTestId("metric-card-wip");
	await expect(wipCard.getByText("2")).toBeVisible();
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
