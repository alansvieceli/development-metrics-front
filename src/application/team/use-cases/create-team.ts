import type { TeamRepository } from "@/application/team/ports/team-repository";

export async function createTeam(repository: TeamRepository, name: string) {
	const trimmed = name.trim();
	if (!trimmed) {
		throw new Error("Nome do time não pode ser vazio");
	}
	return repository.create(trimmed);
}
