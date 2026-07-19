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

test("fecha o modal de task com Escape e devolve o foco", async ({ page }) => {
	const trigger = page.getByRole("button", { name: "Nova task" });
	await trigger.click();
	const dialog = page.getByRole("dialog", { name: "Nova task" });
	await expect(dialog).toBeVisible();

	await page.keyboard.press("Escape");
	await expect(dialog).toBeHidden();
	await expect(trigger).toBeFocused();
});

test("fecha o modal de task pelo botão Fechar", async ({ page }) => {
	await page.getByRole("button", { name: "Nova task" }).click();
	const dialog = page.getByRole("dialog", { name: "Nova task" });
	await dialog.getByRole("button", { name: "Fechar" }).click();
	await expect(dialog).toBeHidden();
});

test("fecha o modal de task ao clicar no backdrop", async ({ page }) => {
	await page.getByRole("button", { name: "Nova task" }).click();
	const dialog = page.getByRole("dialog", { name: "Nova task" });
	await expect(dialog).toBeVisible();
	await page.mouse.click(5, 5);
	await expect(dialog).toBeHidden();
});

test("restaura o status quando a movimentação é rejeitada", async ({
	page,
}) => {
	await page.getByRole("button", { name: "Nova task" }).click();
	await page.getByLabel("Id externo").fill("TASK-INVALID-MOVE");
	await page.getByLabel("Descrição").fill("Testar status inválido");
	await page.getByRole("button", { name: "Salvar" }).click();
	const select = page
		.getByTestId("column-TODO")
		.getByRole("combobox", { name: "Mover para" });

	await select.evaluate((element) => {
		const selectElement = element as HTMLSelectElement;
		const option = document.createElement("option");
		option.value = "INVALID";
		option.textContent = "Inválido";
		selectElement.append(option);
		selectElement.value = "INVALID";
		selectElement.dispatchEvent(new Event("change", { bubbles: true }));
	});

	await expect(
		page.getByRole("alert").filter({ hasText: "Status inválido" }),
	).toHaveText("Status inválido");
	await expect(select).toHaveValue("TODO");
	await expect(select).toBeEnabled();
});
