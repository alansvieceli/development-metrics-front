import { matchExternalStatus } from "@/application/task/match-external-status";
import type { ExternalCardProvider } from "@/application/task/ports/external-card-provider";
import type { TaskStatus } from "@/domain/task/entities/task";

export type ColumnDiffResult = {
	matched: string[];
	onlyLocal: string[];
	onlyBusinessmap: string[];
};

export async function diffColumnWithBusinessmap(
	provider: ExternalCardProvider,
	status: TaskStatus,
	localExternalIds: string[],
): Promise<ColumnDiffResult> {
	const boardCards = await provider.listBoardCards();
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
