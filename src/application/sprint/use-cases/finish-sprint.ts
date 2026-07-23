import { ApplicationError } from "@/application/shared/application-error";
import { parseDateOnly } from "@/application/shared/validation";
import type { MetricsQueryPort } from "@/application/metrics/ports/metrics-query-port";
import { getMetricsForRange } from "@/application/metrics/use-cases/get-metrics-for-period";
import type { SprintMetricsSnapshotRepository } from "@/application/sprint/ports/sprint-metrics-snapshot-repository";
import type { SprintRepository } from "@/application/sprint/ports/sprint-repository";
import type { SprintTaskSnapshotRepository } from "@/application/sprint/ports/sprint-task-snapshot-repository";
import type { TaskRepository } from "@/application/task/ports/task-repository";

export async function finishSprint(
	sprintRepository: SprintRepository,
	taskRepository: TaskRepository,
	sprintTaskSnapshotRepository: SprintTaskSnapshotRepository,
	sprintMetricsSnapshotRepository: SprintMetricsSnapshotRepository,
	metricsQueryPort: MetricsQueryPort,
	sprintId: string,
	teamId: string,
) {
	const sprint = await sprintRepository.findById(sprintId);
	if (!sprint || sprint.teamId !== teamId) {
		throw new ApplicationError("Sprint não encontrada");
	}
	if (sprint.status !== "ACTIVE") {
		throw new ApplicationError("Somente uma sprint ativa pode ser finalizada");
	}

	const periodStart = parseDateOnly(sprint.startDate) as Date;
	const endDate = parseDateOnly(sprint.endDate) as Date;
	const periodEnd = new Date(
		Date.UTC(
			endDate.getUTCFullYear(),
			endDate.getUTCMonth(),
			endDate.getUTCDate() + 1,
		),
	);
	const metricsSnapshot = await metricsQueryPort.loadSnapshot(
		teamId,
		periodStart,
		periodEnd,
	);
	const metrics = getMetricsForRange(metricsSnapshot, periodStart, periodEnd);
	await sprintMetricsSnapshotRepository.save(sprintId, metrics);

	const [nextSprint] = (await sprintRepository.listByTeam(teamId))
		.filter((candidate) => candidate.status === "PLANNED")
		.sort((a, b) => a.startDate.localeCompare(b.startDate));

	const sprintTasks = await taskRepository.listBySprint(sprintId);
	const snapshotData = sprintTasks.map((task) => ({
		sprintId,
		taskId: task.id,
		externalId: task.externalId,
		description: task.description,
		typeId: task.typeId,
		assigneeId: task.assigneeId,
		statusAtFreeze: task.status,
		carriedOver: task.status !== "DONE",
	}));
	await sprintTaskSnapshotRepository.createMany(snapshotData);

	for (const task of sprintTasks) {
		if (task.status === "DONE") continue;
		await taskRepository.update(task.id, {
			externalId: task.externalId,
			description: task.description,
			typeId: task.typeId,
			assigneeId: task.assigneeId,
			dueDate: task.dueDate,
			parentTaskId: task.parentTaskId,
			sprintId: nextSprint?.id ?? null,
		});
	}

	return sprintRepository.updateStatus(sprintId, "CLOSED");
}
