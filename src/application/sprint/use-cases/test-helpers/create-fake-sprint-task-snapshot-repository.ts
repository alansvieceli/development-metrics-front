import type {
	CreateSprintTaskSnapshotData,
	SprintTaskSnapshotRepository,
} from "@/application/sprint/ports/sprint-task-snapshot-repository";
import type { SprintTaskSnapshot } from "@/domain/sprint/entities/sprint-task-snapshot";

export function createFakeSprintTaskSnapshotRepository(): SprintTaskSnapshotRepository {
	const snapshots: SprintTaskSnapshot[] = [];
	let nextId = 1;

	return {
		async createMany(data: CreateSprintTaskSnapshotData[]) {
			for (const item of data) {
				snapshots.push({ id: `snapshot-${nextId++}`, ...item });
			}
		},
		async listBySprint(sprintId) {
			return snapshots.filter((snapshot) => snapshot.sprintId === sprintId);
		},
	};
}
