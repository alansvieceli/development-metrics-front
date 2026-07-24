import { describe, expect, it } from "vitest";
import { setBusinessmapBoardId } from "./set-businessmap-board-id";
import { createFakeTeamRepository } from "./test-helpers/create-fake-team-repository";

describe("setBusinessmapBoardId", () => {
	it("altera o id do quadro Businessmap do time", async () => {
		const repository = createFakeTeamRepository();
		const team = await repository.create("Time A");

		const updated = await setBusinessmapBoardId(repository, team.id, "108");

		expect(updated.businessmapBoardId).toBe("108");
	});

	it("limpa o id do quadro quando recebe string vazia", async () => {
		const repository = createFakeTeamRepository();
		const team = await repository.create("Time A");
		await setBusinessmapBoardId(repository, team.id, "108");

		const updated = await setBusinessmapBoardId(repository, team.id, "  ");

		expect(updated.businessmapBoardId).toBeNull();
	});

	it("rejeita id não numérico", async () => {
		const repository = createFakeTeamRepository();
		const team = await repository.create("Time A");

		await expect(
			setBusinessmapBoardId(repository, team.id, "abc"),
		).rejects.toThrow("Id do quadro Businessmap deve conter apenas números");
	});
});
