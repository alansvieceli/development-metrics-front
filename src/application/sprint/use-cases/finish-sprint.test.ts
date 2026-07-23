import { describe, expect, it } from "vitest";
import type { MetricsQueryPort } from "@/application/metrics/ports/metrics-query-port";
import { createFakeTaskRepository } from "@/application/task/use-cases/test-helpers/create-fake-task-repository";
import { finishSprint } from "./finish-sprint";
import { createFakeSprintMetricsSnapshotRepository } from "./test-helpers/create-fake-sprint-metrics-snapshot-repository";
import { createFakeSprintRepository } from "./test-helpers/create-fake-sprint-repository";
import { createFakeSprintTaskSnapshotRepository } from "./test-helpers/create-fake-sprint-task-snapshot-repository";

const emptyMetricsQueryPort: MetricsQueryPort = {
	async loadSnapshot() {
		return {
			completionEvents: [],
			statusChanges: [],
			blockedPeriods: [],
			dueDateTasks: [],
			currentWipTasks: [],
			bugEvents: [],
		};
	},
};

async function setup() {
	const sprintRepository = createFakeSprintRepository();
	const taskRepository = createFakeTaskRepository();
	const sprintTaskSnapshotRepository = createFakeSprintTaskSnapshotRepository();
	const sprintMetricsSnapshotRepository =
		createFakeSprintMetricsSnapshotRepository();
	const sprint = await sprintRepository.create({
		piId: "pi-1",
		teamId: "team-1",
		name: "Sprint 1",
		startDate: "2026-07-01",
		endDate: "2026-07-14",
	});
	await sprintRepository.updateStatus(sprint.id, "ACTIVE");
	return {
		sprintRepository,
		taskRepository,
		sprintTaskSnapshotRepository,
		sprintMetricsSnapshotRepository,
		sprint,
	};
}

describe("finishSprint", () => {
	it("rejeita sprint que não está ativa", async () => {
		const {
			sprintRepository,
			taskRepository,
			sprintTaskSnapshotRepository,
			sprintMetricsSnapshotRepository,
			sprint,
		} = await setup();
		await sprintRepository.updateStatus(sprint.id, "CLOSED");
		await expect(
			finishSprint(
				sprintRepository,
				taskRepository,
				sprintTaskSnapshotRepository,
				sprintMetricsSnapshotRepository,
				emptyMetricsQueryPort,
				sprint.id,
				"team-1",
			),
		).rejects.toThrow("Somente uma sprint ativa pode ser finalizada");
	});

	it("rejeita sprint de outro time", async () => {
		const {
			sprintRepository,
			taskRepository,
			sprintTaskSnapshotRepository,
			sprintMetricsSnapshotRepository,
			sprint,
		} = await setup();
		await expect(
			finishSprint(
				sprintRepository,
				taskRepository,
				sprintTaskSnapshotRepository,
				sprintMetricsSnapshotRepository,
				emptyMetricsQueryPort,
				sprint.id,
				"team-2",
			),
		).rejects.toThrow("Sprint não encontrada");
	});

	it("fecha a sprint e grava o snapshot de métricas", async () => {
		const {
			sprintRepository,
			taskRepository,
			sprintTaskSnapshotRepository,
			sprintMetricsSnapshotRepository,
			sprint,
		} = await setup();
		const closed = await finishSprint(
			sprintRepository,
			taskRepository,
			sprintTaskSnapshotRepository,
			sprintMetricsSnapshotRepository,
			emptyMetricsQueryPort,
			sprint.id,
			"team-1",
		);
		expect(closed.status).toBe("CLOSED");
		expect(
			await sprintMetricsSnapshotRepository.findBySprint(sprint.id),
		).not.toBeNull();
	});

	it("transborda tasks não concluídas para a próxima sprint planejada", async () => {
		const {
			sprintRepository,
			taskRepository,
			sprintTaskSnapshotRepository,
			sprintMetricsSnapshotRepository,
			sprint,
		} = await setup();
		const nextSprint = await sprintRepository.create({
			piId: "pi-1",
			teamId: "team-1",
			name: "Sprint 2",
			startDate: "2026-07-15",
			endDate: "2026-07-28",
		});
		const pending = await taskRepository.seed({
			externalId: "TASK-1",
			description: "Em andamento",
			typeId: "type-1",
			assigneeId: null,
			teamId: "team-1",
			status: "IN_DEVELOPMENT",
			dueDate: "2026-07-10",
			parentTaskId: null,
			sprintId: sprint.id,
		});
		const done = await taskRepository.seed({
			externalId: "TASK-2",
			description: "Concluída",
			typeId: "type-1",
			assigneeId: null,
			teamId: "team-1",
			status: "DONE",
			dueDate: "2026-07-10",
			parentTaskId: null,
			sprintId: sprint.id,
		});

		await finishSprint(
			sprintRepository,
			taskRepository,
			sprintTaskSnapshotRepository,
			sprintMetricsSnapshotRepository,
			emptyMetricsQueryPort,
			sprint.id,
			"team-1",
		);

		expect((await taskRepository.findById(pending.id))?.sprintId).toBe(
			nextSprint.id,
		);
		expect((await taskRepository.findById(done.id))?.sprintId).toBe(sprint.id);

		const snapshots = await sprintTaskSnapshotRepository.listBySprint(
			sprint.id,
		);
		expect(snapshots).toHaveLength(2);
		expect(
			snapshots.find((snapshot) => snapshot.taskId === pending.id),
		).toMatchObject({ statusAtFreeze: "IN_DEVELOPMENT", carriedOver: true });
		expect(
			snapshots.find((snapshot) => snapshot.taskId === done.id),
		).toMatchObject({ statusAtFreeze: "DONE", carriedOver: false });
	});

	it("desassocia tasks não concluídas quando não há próxima sprint planejada", async () => {
		const {
			sprintRepository,
			taskRepository,
			sprintTaskSnapshotRepository,
			sprintMetricsSnapshotRepository,
			sprint,
		} = await setup();
		const pending = await taskRepository.seed({
			externalId: "TASK-1",
			description: "Em andamento",
			typeId: "type-1",
			assigneeId: null,
			teamId: "team-1",
			status: "TODO",
			dueDate: "2026-07-10",
			parentTaskId: null,
			sprintId: sprint.id,
		});

		await finishSprint(
			sprintRepository,
			taskRepository,
			sprintTaskSnapshotRepository,
			sprintMetricsSnapshotRepository,
			emptyMetricsQueryPort,
			sprint.id,
			"team-1",
		);

		expect((await taskRepository.findById(pending.id))?.sprintId).toBeNull();
	});
});
