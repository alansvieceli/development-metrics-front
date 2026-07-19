import { expect, test } from "@playwright/test";
import { resetDatabase } from "./reset-db";

test.beforeEach(async ({ page }) => {
	await resetDatabase();
	await page.goto("/teams");
	await page.getByPlaceholder("Nome do time").fill("Time A");
	await page.getByRole("button", { name: "Criar time" }).click();
	await page.getByRole("button", { name: "Time A" }).click();
	await page.getByRole("link", { name: "Tipos de task" }).click();
});

test("lista os tipos padrão e permite criar e editar um tipo", async ({
	page,
}) => {
	await expect(page).toHaveURL("/task-types");
	const names = await page
		.locator('input[name="name"]')
		.evaluateAll((inputs) =>
			inputs.map((input) => (input as HTMLInputElement).value),
		);
	expect(names).toEqual(
		expect.arrayContaining(["História", "Tarefa Técnica", "Bug"]),
	);

	await page.getByPlaceholder("Nome do tipo").fill("Épico");
	await page.getByRole("button", { name: "Adicionar tipo" }).click();

	const epicoRow = page
		.locator("li")
		.filter({ has: page.locator('input[value="Épico"]') });
	await expect(epicoRow).toBeVisible();

	const epicoNameInput = epicoRow.locator('input[name="name"]');
	await epicoNameInput.fill("Épico Grande");
	await epicoRow.getByRole("button", { name: "Salvar" }).click();
	await expect(epicoNameInput).toHaveValue("Épico Grande");
});

test("não permite excluir um tipo em uso por uma task", async ({ page }) => {
	await page.goto("/board");
	await page.getByRole("button", { name: "Task" }).click();
	await page.getByLabel("Id externo").fill("TASK-1");
	await page.getByLabel("Descrição").fill("Primeira task");
	await page.getByLabel("Tipo").selectOption({ label: "História" });
	await page.getByLabel("Data prevista de entrega").fill("2026-12-31");
	await page.getByRole("button", { name: "Salvar" }).click();

	await page.getByRole("link", { name: "Tipos de task" }).click();
	const historiaRow = page
		.locator("li")
		.filter({ has: page.locator('input[value="História"]') });
	await expect(
		historiaRow.getByRole("button", { name: "Excluir tipo" }),
	).toBeDisabled();
});
