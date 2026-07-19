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

test("mostra erros ao remover vínculos usados por task", async ({ page }) => {
	await page.goto("/teams");
	await page.getByPlaceholder("Nome do time").fill("Time A");
	await page.getByRole("button", { name: "Criar time" }).click();
	await page.getByRole("button", { name: "Time A" }).click();
	await page.getByRole("button", { name: "Time A", exact: true }).click();
	await page.getByRole("link", { name: "Gerenciar time atual" }).click();
	await page.getByPlaceholder("Nome do novo membro").fill("Ana");
	await page.getByRole("button", { name: "Adicionar membro" }).click();

	await page.goto("/board");
	await page.getByRole("button", { name: "Nova task" }).click();
	await page.getByLabel("Id externo").fill("TASK-1");
	await page.getByLabel("Descrição").fill("Task da Ana");
	await page.getByLabel("Responsável").selectOption({ label: "Ana" });
	await page.getByRole("button", { name: "Salvar" }).click();
	await page.getByRole("button", { name: "Time A", exact: true }).click();
	await page.getByRole("link", { name: "Gerenciar time atual" }).click();

	page.once("dialog", (dialog) => dialog.accept());
	const removeMember = page.getByRole("button", { name: "Remover membro" });
	await removeMember.click();
	await expect(
		page
			.getByRole("alert")
			.filter({ hasText: "Membro é responsável por tasks" }),
	).toHaveText("Membro é responsável por tasks");
	await expect(removeMember).toBeEnabled();

	page.once("dialog", (dialog) => dialog.accept());
	const deleteTeam = page.getByRole("button", { name: "Excluir time" });
	await deleteTeam.click();
	await expect(
		page.getByRole("alert").filter({ hasText: "Time possui tasks" }),
	).toHaveText("Time possui tasks");
	await expect(deleteTeam).toBeEnabled();
});
