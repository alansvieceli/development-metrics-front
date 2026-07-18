import { expect, test } from "@playwright/test";
import { resetDatabase } from "./reset-db";

test.beforeEach(async ({ page }) => {
	await resetDatabase();
	await page.goto("/teams");
	await page.getByPlaceholder("Nome do time").fill("Time A");
	await page.getByRole("button", { name: "Criar time" }).click();
	await page.getByRole("button", { name: "Time A" }).click();
});

test("criar uma task pelo modal a coloca na coluna escolhida", async ({
	page,
}) => {
	await expect(page).toHaveURL("/board");
	await page.getByRole("button", { name: "Nova task" }).click();
	await page.getByLabel("Id externo").fill("TASK-1");
	await page.getByLabel("Descrição").fill("Corrigir bug de login");
	await page.getByLabel("Tipo").selectOption({ label: "Bug" });
	await page
		.getByLabel("Coluna inicial")
		.selectOption({ label: "Code Review" });
	await page.getByRole("button", { name: "Salvar" }).click();

	await expect(
		page.getByTestId("column-CODE_REVIEW").getByText("TASK-1"),
	).toBeVisible();
});

test("mover uma task pelo select atualiza a coluna", async ({ page }) => {
	await page.getByRole("button", { name: "Nova task" }).click();
	await page.getByLabel("Id externo").fill("TASK-2");
	await page.getByLabel("Descrição").fill("Ajustar layout");
	await page.getByRole("button", { name: "Salvar" }).click();

	await expect(
		page.getByTestId("column-TODO").getByText("TASK-2"),
	).toBeVisible();

	await page
		.getByTestId("column-TODO")
		.getByRole("combobox", { name: "Mover para" })
		.selectOption({ label: "Em Desenvolvimento" });

	await expect(
		page.getByTestId("column-IN_DEVELOPMENT").getByText("TASK-2"),
	).toBeVisible();
});

test("a cor do tipo aparece na borda do card", async ({ page }) => {
	await page.getByRole("button", { name: "Nova task" }).click();
	await page.getByLabel("Id externo").fill("TASK-3");
	await page.getByLabel("Descrição").fill("Investigar lentidão");
	await page.getByLabel("Tipo").selectOption({ label: "Bug" });
	await page.getByRole("button", { name: "Salvar" }).click();

	const card = page.getByTitle("Bug").filter({ hasText: "TASK-3" });
	await expect(card).toHaveCSS("border-left-color", "rgb(220, 38, 38)");
});
