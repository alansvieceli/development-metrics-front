import type { TeamRepository } from "@/application/team/ports/team-repository";

export async function removeMember(
	repository: TeamRepository,
	memberId: string,
) {
	await repository.removeMember(memberId);
}
