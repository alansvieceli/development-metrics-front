import type { SprintTaskSnapshotRepository } from "@/application/sprint/ports/sprint-task-snapshot-repository";

export async function getSprintHistory(
	repository: SprintTaskSnapshotRepository,
	sprintId: string,
) {
	return repository.listBySprint(sprintId);
}
