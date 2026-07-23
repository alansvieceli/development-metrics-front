import type { CreateProgramIncrementData } from "@/application/sprint/ports/program-increment-repository";
import type { CreateSprintData } from "@/application/sprint/ports/sprint-repository";
import { createProgramIncrement } from "@/application/sprint/use-cases/create-program-increment";
import { createSprint } from "@/application/sprint/use-cases/create-sprint";
import { finishSprint } from "@/application/sprint/use-cases/finish-sprint";
import { getSprintHistory } from "@/application/sprint/use-cases/get-sprint-history";
import { listProgramIncrementsByTeam } from "@/application/sprint/use-cases/list-program-increments-by-team";
import { listSprintsByPi } from "@/application/sprint/use-cases/list-sprints-by-pi";
import { listSprintsByTeam } from "@/application/sprint/use-cases/list-sprints-by-team";
import { startSprint } from "@/application/sprint/use-cases/start-sprint";
import { drizzleMetricsQueryPort } from "@/infrastructure/metrics/drizzle-metrics-query-port";
import { drizzleProgramIncrementRepository } from "@/infrastructure/sprint/drizzle-program-increment-repository";
import { drizzleSprintMetricsSnapshotRepository } from "@/infrastructure/sprint/drizzle-sprint-metrics-snapshot-repository";
import { drizzleSprintRepository } from "@/infrastructure/sprint/drizzle-sprint-repository";
import { drizzleSprintTaskSnapshotRepository } from "@/infrastructure/sprint/drizzle-sprint-task-snapshot-repository";
import { drizzleTaskRepository } from "@/infrastructure/task/drizzle-task-repository";

export function createSprintUseCases() {
	return {
		createProgramIncrement: (data: CreateProgramIncrementData) =>
			createProgramIncrement(drizzleProgramIncrementRepository, data),
		listProgramIncrementsByTeam: (teamId: string) =>
			listProgramIncrementsByTeam(drizzleProgramIncrementRepository, teamId),
		createSprint: (data: CreateSprintData) =>
			createSprint(
				drizzleSprintRepository,
				drizzleProgramIncrementRepository,
				data,
			),
		listSprintsByPi: (piId: string) =>
			listSprintsByPi(drizzleSprintRepository, piId),
		listSprintsByTeam: (teamId: string) =>
			listSprintsByTeam(drizzleSprintRepository, teamId),
		startSprint: (teamId: string) =>
			startSprint(drizzleSprintRepository, teamId),
		finishSprint: (sprintId: string, teamId: string) =>
			finishSprint(
				drizzleSprintRepository,
				drizzleTaskRepository,
				drizzleSprintTaskSnapshotRepository,
				drizzleSprintMetricsSnapshotRepository,
				drizzleMetricsQueryPort,
				sprintId,
				teamId,
			),
		getSprintHistory: (sprintId: string) =>
			getSprintHistory(drizzleSprintTaskSnapshotRepository, sprintId),
	};
}
