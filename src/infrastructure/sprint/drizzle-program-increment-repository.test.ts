import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/infrastructure/db/client";
import { programIncrements } from "./drizzle/schema";
import { drizzleProgramIncrementRepository } from "./drizzle-program-increment-repository";

async function deletePi(id: string) {
	await db.delete(programIncrements).where(eq(programIncrements.id, id));
}

describe("drizzleProgramIncrementRepository", () => {
	it("cria e busca um pi por id", async () => {
		const created = await drizzleProgramIncrementRepository.create({
			teamId: "00000000-0000-0000-0000-000000000001",
			name: "PI 2026.3",
			startDate: "2026-07-01",
			endDate: "2026-09-30",
		});
		try {
			const found = await drizzleProgramIncrementRepository.findById(created.id);
			expect(found).toEqual(created);
		} finally {
			await deletePi(created.id);
		}
	});

	it("retorna null ao buscar um pi inexistente", async () => {
		expect(
			await drizzleProgramIncrementRepository.findById(
				"00000000-0000-0000-0000-000000000000",
			),
		).toBeNull();
	});

	it("lista apenas os pis do time informado", async () => {
		const teamId = "00000000-0000-0000-0000-000000000002";
		const created = await drizzleProgramIncrementRepository.create({
			teamId,
			name: "PI 2026.3",
			startDate: "2026-07-01",
			endDate: "2026-09-30",
		});
		try {
			const list = await drizzleProgramIncrementRepository.listByTeam(teamId);
			expect(list.map((pi) => pi.id)).toEqual([created.id]);
		} finally {
			await deletePi(created.id);
		}
	});
});
