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
	await page.getByRole("button", { name: "Task" }).click();
	await page.getByLabel("Id externo").fill("TASK-1");
	await page.getByLabel("Descrição").fill("Corrigir bug de login");
	await page.getByLabel("Tipo").selectOption({ label: "Bug" });
	await page.getByLabel("Coluna inicial").selectOption({ label: "Revisão" });
	await page.getByRole("button", { name: "Salvar" }).click();

	await expect(
		page.getByTestId("column-CODE_REVIEW").getByText("TASK-1"),
	).toBeVisible();
});

test("mover uma task pelo select atualiza a coluna", async ({ page }) => {
	await page.getByRole("button", { name: "Task" }).click();
	await page.getByLabel("Id externo").fill("TASK-2");
	await page.getByLabel("Descrição").fill("Ajustar layout");
	await page.getByRole("button", { name: "Salvar" }).click();

	await expect(
		page.getByTestId("column-TODO").getByText("TASK-2"),
	).toBeVisible();

	await page
		.getByTestId("column-TODO")
		.getByRole("combobox", { name: "Mover para" })
		.selectOption({ label: "Desenvolvimento" });

	await expect(
		page.getByTestId("column-IN_DEVELOPMENT").getByText("TASK-2"),
	).toBeVisible();
});

test("a cor do tipo aparece na borda do card", async ({ page }) => {
	await page.getByRole("button", { name: "Task" }).click();
	await page.getByLabel("Id externo").fill("TASK-3");
	await page.getByLabel("Descrição").fill("Investigar lentidão");
	await page.getByLabel("Tipo").selectOption({ label: "Bug" });
	await page.getByRole("button", { name: "Salvar" }).click();

	const card = page.getByTitle("Bug").filter({ hasText: "TASK-3" });
	await expect(card).toHaveCSS("border-left-color", "rgb(220, 38, 38)");
});

test("fecha o modal de task com Escape e devolve o foco", async ({ page }) => {
	const trigger = page.getByRole("button", { name: "Task" });
	await trigger.click();
	const dialog = page.getByRole("dialog", { name: "Nova task" });
	await expect(dialog).toBeVisible();

	await page.keyboard.press("Escape");
	await expect(dialog).toBeHidden();
	await expect(trigger).toBeFocused();
});

test("fecha o modal de task pelo botão Fechar", async ({ page }) => {
	await page.getByRole("button", { name: "Task" }).click();
	const dialog = page.getByRole("dialog", { name: "Nova task" });
	await dialog.getByRole("button", { name: "Fechar" }).click();
	await expect(dialog).toBeHidden();
});

test("fecha o modal de task ao clicar no backdrop", async ({ page }) => {
	await page.getByRole("button", { name: "Task" }).click();
	const dialog = page.getByRole("dialog", { name: "Nova task" });
	await expect(dialog).toBeVisible();
	await page.mouse.click(5, 5);
	await expect(dialog).toBeHidden();
});

test("restaura o status quando a movimentação é rejeitada", async ({
	page,
}) => {
	await page.getByRole("button", { name: "Task" }).click();
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

test("a contagem da coluna reflete o número de cards", async ({ page }) => {
	await page.getByRole("button", { name: "Task" }).click();
	await page.getByLabel("Id externo").fill("TASK-COUNT-1");
	await page.getByLabel("Descrição").fill("Primeira task");
	await page.getByRole("button", { name: "Salvar" }).click();

	await expect(
		page.getByRole("heading", { name: "Backlog (1)" }),
	).toBeVisible();

	await page.getByRole("button", { name: "Task" }).click();
	await page.getByLabel("Id externo").fill("TASK-COUNT-2");
	await page.getByLabel("Descrição").fill("Segunda task");
	await page.getByRole("button", { name: "Salvar" }).click();

	await expect(
		page.getByRole("heading", { name: "Backlog (2)" }),
	).toBeVisible();
	await expect(
		page.getByRole("heading", { name: "Desenvolvimento (0)" }),
	).toBeVisible();
});

test("o chip de responsável mostra a contagem de cards ativos", async ({
	page,
}) => {
	await expect(page).toHaveURL("/board");
	await page.getByRole("button", { name: "Time A", exact: true }).click();
	await page.getByRole("link", { name: "Gerenciar time atual" }).click();
	await page.getByPlaceholder("Nome do novo membro").fill("Ana");
	await page.getByRole("button", { name: "Adicionar membro" }).click();
	await page
		.getByRole("dialog", { name: "Gerenciar time" })
		.getByRole("button", { name: "Fechar" })
		.click();

	await page.getByRole("button", { name: "Task" }).click();
	await page.getByLabel("Id externo").fill("TASK-ANA-1");
	await page.getByLabel("Descrição").fill("Task da Ana");
	await page.getByLabel("Responsável").selectOption({ label: "Ana" });
	await page.getByRole("button", { name: "Salvar" }).click();

	await expect(page.getByText("Ana: 1")).toBeVisible();
});

test("o chip de bloqueados aparece e some conforme o card é bloqueado", async ({
	page,
}) => {
	await page.getByRole("button", { name: "Task" }).click();
	await page.getByLabel("Id externo").fill("TASK-BLOCK-1");
	await page.getByLabel("Descrição").fill("Task a bloquear");
	await page.getByLabel("Tipo").selectOption({ label: "Bug" });
	await page.getByRole("button", { name: "Salvar" }).click();

	await expect(page.getByText("bloqueados")).toHaveCount(0);

	await page
		.getByTitle("Bug")
		.filter({ hasText: "TASK-BLOCK-1" })
		.getByRole("button", { name: "Editar task" })
		.click();
	const checkbox = page.getByRole("checkbox", { name: "⛔ Bloqueado" });
	await checkbox.click();

	await expect(page.getByText("⛔ 1 bloqueados")).toBeVisible();
	await expect(checkbox).toBeChecked();

	await checkbox.click();
	await expect(page.getByText("⛔ 1 bloqueados")).toHaveCount(0);
});

test("cadastro retroativo cria o card já na coluna da última etapa", async ({
	page,
}) => {
	await page.getByRole("button", { name: "Retroativo" }).click();
	await page.getByLabel("Id externo").fill("TASK-HIST-1");
	await page.getByLabel("Descrição").fill("Migração legada");
	await page.getByLabel("Status da etapa 1").selectOption({ label: "Backlog" });
	await page.getByLabel("Data da etapa 1").fill("2026-07-01");
	await page.getByRole("button", { name: "+ Adicionar etapa" }).click();
	await page.getByLabel("Status da etapa 2").selectOption({ label: "Revisão" });
	await page.getByLabel("Data da etapa 2").fill("2026-07-05");
	await page.getByRole("button", { name: "Salvar" }).click();

	await expect(
		page.getByTestId("column-CODE_REVIEW").getByText("TASK-HIST-1"),
	).toBeVisible();
});
