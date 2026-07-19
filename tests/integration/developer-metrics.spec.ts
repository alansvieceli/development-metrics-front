import { expect, type Page, test } from "@playwright/test";
import { resetDatabase } from "./reset-db";

test.setTimeout(120_000);

async function createDeliveredTask(
	page: Page,
	externalId: string,
	assignee: string,
) {
	const today = new Date().toISOString().slice(0, 10);
	await page.getByRole("button", { name: "Retroativo" }).click();
	await page.getByLabel("Id externo").fill(externalId);
	await page.getByLabel("Descrição").fill(`Entrega de ${assignee}`);
	await page.getByLabel("Responsável").selectOption({ label: assignee });
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
}

test.beforeEach(async ({ page }) => {
	await resetDatabase();
	await page.goto("/teams");
	await page.getByPlaceholder("Nome do time").fill("Time A");
	await page.getByRole("button", { name: "Criar time" }).click();
	await page.getByRole("button", { name: "Time A" }).click();
	await page.waitForURL("/board");
	await page.getByRole("button", { name: "Time A", exact: true }).click();
	await page.getByRole("link", { name: "Gerenciar time atual" }).click();
	for (const name of ["Ana", "Bruno"]) {
		await page.getByPlaceholder("Nome do novo membro").fill(name);
		await page.getByRole("button", { name: "Adicionar membro" }).click();
		await expect(page.locator(`input[value="${name}"]`)).toBeVisible();
	}
	await page.goto("/board");
	await createDeliveredTask(page, "TASK-ANA", "Ana");
	await createDeliveredTask(page, "TASK-BRUNO-1", "Bruno");
	await createDeliveredTask(page, "TASK-BRUNO-2", "Bruno");
});

test("troca o desenvolvedor sem perder o período", async ({ page }) => {
	await page.goto("/metrics");
	await page.getByRole("link", { name: "Por desenvolvedor" }).click();
	await expect(page).toHaveURL(/\/metrics\/developers\?developer=/);

	await page.getByRole("button", { name: "Quinzena" }).click();
	await expect(page).toHaveURL(/period=fortnight/);
	const firstUrl = new URL(page.url());
	await expect(
		page.getByTestId("metric-tile-delivered").getByText("1", { exact: true }),
	).toBeVisible();
	await page
		.getByTestId("metric-tile-delivered")
		.getByText("Ver tasks (1)")
		.click();
	await expect(
		page.getByTestId("metric-tile-delivered").getByText("TASK-ANA"),
	).toBeVisible();

	await page.getByLabel("Desenvolvedor").selectOption({ label: "Bruno" });
	await expect(page).toHaveURL((url) => {
		return (
			url.searchParams.get("developer") !==
			firstUrl.searchParams.get("developer")
		);
	});
	const secondUrl = new URL(page.url());
	expect(secondUrl.searchParams.get("developer")).not.toBe(
		firstUrl.searchParams.get("developer"),
	);
	expect(secondUrl.searchParams.get("period")).toBe("fortnight");
	await expect(
		page.getByTestId("metric-tile-delivered").getByText("2", { exact: true }),
	).toBeVisible();
	await expect(page.getByRole("heading", { name: "Apoio" })).toBeVisible();
	await expect(page.getByRole("heading", { name: "Entrega" })).toBeVisible();
	await expect(page.getByRole("heading", { name: "Qualidade" })).toBeVisible();
});
