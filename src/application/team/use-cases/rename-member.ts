import type { TeamRepository } from "@/application/team/ports/team-repository";

export async function renameMember(
	repository: TeamRepository,
	memberId: string,
	name: string,
) {
	const trimmed = name.trim();
	if (!trimmed) {
		throw new Error("Nome do membro não pode ser vazio");
	}
	return repository.renameMember(memberId, trimmed);
}
