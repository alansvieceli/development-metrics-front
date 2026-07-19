import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { db } from "@/infrastructure/db/client";
import { drizzleTeamRepository } from "./drizzle-team-repository";

async function resetDatabase() {
	await db.execute(sql`TRUNCATE TABLE members, teams RESTART IDENTITY CASCADE`);
}

describe("drizzleTeamRepository", () => {
	afterEach(async () => {
		await resetDatabase();
	});

	it("cria e busca um time por id", async () => {
		const created = await drizzleTeamRepository.create("Time A");
		const found = await drizzleTeamRepository.findById(created.id);
		expect(found).toEqual(created);
		expect(found?.wipLimit).toBe(6);
		expect(found?.completedTaskLimit).toBe(10);
	});

	it("atualiza o limite de tarefas concluídas exibidas", async () => {
		const created = await drizzleTeamRepository.create("Time A");

		const updated = await drizzleTeamRepository.setCompletedTaskLimit(
			created.id,
			3,
		);

		expect(updated.completedTaskLimit).toBe(3);
	});

	it("cria e atualiza um limite de WIP específico", async () => {
		const created = await drizzleTeamRepository.create("Time A", 8);
		expect(created.wipLimit).toBe(8);

		const updated = await drizzleTeamRepository.setWipLimit(created.id, 10);
		expect(updated.wipLimit).toBe(10);
	});

	it("retorna null ao buscar um time inexistente", async () => {
		expect(
			await drizzleTeamRepository.findById(
				"00000000-0000-0000-0000-000000000000",
			),
		).toBeNull();
	});

	it("informa se o time existe", async () => {
		const team = await drizzleTeamRepository.create("Time A");
		expect(await drizzleTeamRepository.teamExists(team.id)).toBe(true);
		expect(
			await drizzleTeamRepository.teamExists(
				"00000000-0000-0000-0000-000000000000",
			),
		).toBe(false);
	});

	it("rejeita membro de outro time", async () => {
		const teamA = await drizzleTeamRepository.create("Time A");
		const teamB = await drizzleTeamRepository.create("Time B");
		const member = await drizzleTeamRepository.addMember(teamA.id, "Ana");

		expect(
			await drizzleTeamRepository.memberBelongsToTeam(member.id, teamA.id),
		).toBe(true);
		expect(
			await drizzleTeamRepository.memberBelongsToTeam(member.id, teamB.id),
		).toBe(false);
	});

	it("renomeia um time", async () => {
		const team = await drizzleTeamRepository.create("Time A");
		const renamed = await drizzleTeamRepository.rename(team.id, "Time B");
		expect(renamed.name).toBe("Time B");
	});

	it("adiciona e lista membros de um time", async () => {
		const team = await drizzleTeamRepository.create("Time A");
		await drizzleTeamRepository.addMember(team.id, "Ana");
		const teamMembers = await drizzleTeamRepository.listMembers(team.id);
		expect(teamMembers).toHaveLength(1);
		expect(teamMembers[0].name).toBe("Ana");
	});

	it("excluir o time remove os membros (cascade)", async () => {
		const team = await drizzleTeamRepository.create("Time A");
		await drizzleTeamRepository.addMember(team.id, "Ana");
		await drizzleTeamRepository.delete(team.id);
		expect(await drizzleTeamRepository.listMembers(team.id)).toHaveLength(0);
	});
});
