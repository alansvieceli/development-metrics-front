import type { TaskHistoryRepository } from "@/application/task/ports/task-history-repository";
import type { TaskBlockedPeriod } from "@/domain/task/entities/task-blocked-period";
import type { TaskStatusChange } from "@/domain/task/entities/task-status-change";

export type FakeTaskHistoryRepository = TaskHistoryRepository & {
	statusChanges: TaskStatusChange[];
	blockedPeriods: TaskBlockedPeriod[];
};

export function createFakeTaskHistoryRepository(): FakeTaskHistoryRepository {
	const statusChanges: TaskStatusChange[] = [];
	const blockedPeriods: TaskBlockedPeriod[] = [];
	let nextId = 1;

	return {
		statusChanges,
		blockedPeriods,
		async recordStatusChange(taskId, fromStatus, toStatus) {
			statusChanges.push({
				id: `status-change-${nextId++}`,
				taskId,
				fromStatus,
				toStatus,
				changedAt: new Date(),
			});
		},
		async openBlockedPeriod(taskId) {
			blockedPeriods.push({
				id: `blocked-period-${nextId++}`,
				taskId,
				blockedAt: new Date(),
				unblockedAt: null,
			});
		},
		async closeBlockedPeriod(taskId) {
			const open = [...blockedPeriods]
				.reverse()
				.find((p) => p.taskId === taskId && p.unblockedAt === null);
			if (!open) {
				throw new Error("Não há período de bloqueio aberto para esta task");
			}
			open.unblockedAt = new Date();
		},
		async getStatusChangedAtForTasks(taskIds) {
			const result: Record<string, Date> = {};
			for (const taskId of taskIds) {
				const latest = statusChanges
					.filter((change) => change.taskId === taskId)
					.reduce<Date | undefined>(
						(latestSoFar, change) =>
							!latestSoFar || change.changedAt > latestSoFar
								? change.changedAt
								: latestSoFar,
						undefined,
					);
				if (latest) {
					result[taskId] = latest;
				}
			}
			return result;
		},
	};
}
