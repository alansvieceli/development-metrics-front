import { ApplicationError } from "@/application/shared/application-error";
import { matchExternalStatus } from "@/application/task/match-external-status";
import type { ExternalCardProvider } from "@/application/task/ports/external-card-provider";
import type { TeamRepository } from "@/application/team/ports/team-repository";
import type { TaskStatus } from "@/domain/task/entities/task";

export type ColumnDiffResult = {
	matched: string[];
	onlyLocal: string[];
	onlyBusinessmap: string[];
};

export async function diffColumnWithBusinessmap(
	provider: ExternalCardProvider,
	teamRepository: TeamRepository,
	teamId: string,
	status: TaskStatus,
	localExternalIds: string[],
): Promise<ColumnDiffResult> {
	const team = await teamRepository.findById(teamId);
	if (!team?.businessmapBoardId) {
		throw new ApplicationError(
			"Id do quadro Businessmap não configurado para este time",
		);
	}
	const boardCards = await provider.listBoardCards(team.businessmapBoardId);
	const businessmapIds = new Set(
		boardCards
			.filter((card) => matchExternalStatus(card.columnLabel) === status)
			.map((card) => card.externalId),
	);
	const localIds = new Set(localExternalIds);

	const matched: string[] = [];
	const onlyLocal: string[] = [];
	for (const id of localIds) {
		if (businessmapIds.has(id)) {
			matched.push(id);
		} else {
			onlyLocal.push(id);
		}
	}
	const onlyBusinessmap = [...businessmapIds].filter((id) => !localIds.has(id));

	return { matched, onlyLocal, onlyBusinessmap };
}
