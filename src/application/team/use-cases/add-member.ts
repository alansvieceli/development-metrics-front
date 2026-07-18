import type { TeamRepository } from "@/application/team/ports/team-repository";

export async function addMember(
	repository: TeamRepository,
	teamId: string,
	name: string,
) {
	const trimmed = name.trim();
	if (!trimmed) {
		throw new Error("Nome do membro não pode ser vazio");
	}
	return repository.addMember(teamId, trimmed);
}
