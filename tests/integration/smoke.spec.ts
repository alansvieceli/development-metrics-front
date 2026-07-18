import { expect, test } from "@playwright/test";

test("smoke: a home responde com sucesso", async ({ page }) => {
	const response = await page.goto("/");
	expect(response?.ok()).toBeTruthy();
});
