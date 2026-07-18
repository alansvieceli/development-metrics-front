import { expect, test } from "@playwright/test";
import { resetDatabase } from "./reset-db";

test.beforeEach(async () => {
	await resetDatabase();
});

test("sem time selecionado, acessar / redireciona para /teams", async ({
	page,
}) => {
	await page.goto("/");
	await expect(page).toHaveURL("/teams");
	await expect(page.getByText("Nenhum time cadastrado ainda.")).toBeVisible();
});

test("criar e selecionar um time redireciona para / e mostra o time no header", async ({
	page,
}) => {
	await page.goto("/teams");
	await page.getByPlaceholder("Nome do time").fill("Time A");
	await page.getByRole("button", { name: "Criar time" }).click();
	await page.getByRole("button", { name: "Time A" }).click();
	await expect(page).toHaveURL("/");
	await expect(page.getByText("Time A ▾")).toBeVisible();
});

test("trocar de time pelo dropdown do header", async ({ page }) => {
	await page.goto("/teams");
	await page.getByPlaceholder("Nome do time").fill("Time A");
	await page.getByRole("button", { name: "Criar time" }).click();
	await page.getByPlaceholder("Nome do time").fill("Time B");
	await page.getByRole("button", { name: "Criar time" }).click();
	await page.getByRole("button", { name: "Time A" }).click();
	await expect(page).toHaveURL("/");

	await page.getByRole("button", { name: "Time A ▾" }).click();
	await page.getByRole("button", { name: "Time B" }).click();
	await expect(page.getByText("Time B ▾")).toBeVisible();
});
