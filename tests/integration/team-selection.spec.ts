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

test("cookie e rota malformados não produzem 500", async ({
	page,
	context,
}) => {
	await context.addCookies([
		{ name: "current-team-id", value: "abc", url: "http://localhost:3100" },
	]);
	await page.goto("/board");
	await expect(page).toHaveURL(/\/teams$/);
	expect((await page.goto("/teams/abc"))?.status()).toBe(404);
});

test("criar e selecionar um time redireciona para /board e mostra o time no header", async ({
	page,
}) => {
	await page.goto("/teams");
	await page.getByPlaceholder("Nome do time").fill("Time A");
	await page.getByRole("button", { name: "Criar time" }).click();
	await page.getByRole("button", { name: "Time A" }).click();
	await expect(page).toHaveURL("/board");
	await expect(
		page.getByRole("button", { name: "Time A", exact: true }),
	).toBeVisible();
});

test("trocar de time pelo dropdown do header", async ({ page }) => {
	await page.goto("/teams");
	await page.getByPlaceholder("Nome do time").fill("Time A");
	await page.getByRole("button", { name: "Criar time" }).click();
	await expect(page.getByRole("button", { name: "Time A" })).toBeVisible();
	await page.getByPlaceholder("Nome do time").fill("Time B");
	await page.getByRole("button", { name: "Criar time" }).click();
	await expect(page.getByRole("button", { name: "Time B" })).toBeVisible();
	await page.getByRole("button", { name: "Time A" }).click();
	await expect(page).toHaveURL("/board");

	await page.getByRole("button", { name: "Time A", exact: true }).click();
	await page.getByRole("button", { name: "Time B" }).click();
	await expect(
		page.getByRole("button", { name: "Time B", exact: true }),
	).toBeVisible();
});

test("abre o gerenciamento em dialog e fecha pelo botão", async ({ page }) => {
	await page.goto("/teams");
	await page.getByPlaceholder("Nome do time").fill("Time A");
	await page.getByRole("button", { name: "Criar time" }).click();
	await page.getByRole("button", { name: "Time A" }).click();
	await page.getByRole("button", { name: "Time A", exact: true }).click();
	await page.getByRole("link", { name: "Gerenciar time atual" }).click();

	const dialog = page.getByRole("dialog", { name: "Gerenciar time" });
	await expect(dialog).toBeVisible();
	await dialog.getByRole("button", { name: "Fechar" }).click();
	await expect(dialog).toBeHidden();
	await expect(page).toHaveURL("/board");
});
