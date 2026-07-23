import { expect, test } from "@playwright/test";
import { resetDatabase } from "./reset-db";

test.beforeEach(async ({ page }) => {
	await resetDatabase();
	await page.goto("/teams");
	await page.getByPlaceholder("Nome do time").fill("Time A");
	await page.getByRole("button", { name: "Criar time" }).click();
	await page.getByRole("button", { name: "Time A" }).click();
	await page.getByRole("link", { name: "Tarjas" }).click();
});

test("permite criar e editar uma tarja", async ({ page }) => {
	await expect(page).toHaveURL("/tags");
	await expect(page.getByText("Nenhuma tarja cadastrada ainda.")).toBeVisible();

	await page.getByPlaceholder("Nome da tarja").fill("Cliente Acme");
	await page.getByRole("button", { name: "Adicionar tarja" }).click();

	const row = page
		.locator("li")
		.filter({ has: page.locator('input[value="Cliente Acme"]') });
	await expect(row).toBeVisible();

	const nameInput = row.locator('input[name="name"]');
	await nameInput.fill("Cliente Globex");
	await row.getByRole("button", { name: "Salvar tarja" }).click();
	await expect(nameInput).toHaveValue("Cliente Globex");
});

test("não permite excluir uma tarja em uso por uma task", async ({ page }) => {
	await page.getByPlaceholder("Nome da tarja").fill("Cliente Acme");
	await page.getByRole("button", { name: "Adicionar tarja" }).click();

	await page.goto("/board");
	await page.getByRole("button", { name: "Task" }).click();
	await page.getByLabel("Id externo").fill("TASK-1");
	await page.getByLabel("Descrição").fill("Primeira task");
	await page.getByLabel("Tarjas").fill("Cliente");
	await page.getByRole("option", { name: "Cliente Acme" }).click();
	await page.getByLabel("Data prevista de entrega").fill("2026-12-31");
	await page.getByRole("button", { name: "Salvar" }).click();

	await page.getByRole("link", { name: "Tarjas" }).click();
	const row = page
		.locator("li")
		.filter({ has: page.locator('input[value="Cliente Acme"]') });
	await expect(
		row.getByRole("button", { name: "Excluir tarja" }),
	).toBeDisabled();
});
