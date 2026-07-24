import { ApplicationError } from "@/application/shared/application-error";
import type { TeamRepository } from "@/application/team/ports/team-repository";

export async function setBusinessmapBoardId(
	repository: TeamRepository,
	teamId: string,
	businessmapBoardId: string,
) {
	const trimmed = businessmapBoardId.trim();
	if (trimmed && !/^\d+$/.test(trimmed)) {
		throw new ApplicationError(
			"Id do quadro Businessmap deve conter apenas números",
		);
	}
	return repository.setBusinessmapBoardId(teamId, trimmed || null);
}
