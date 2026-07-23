import { ApplicationError } from "@/application/shared/application-error";
import type {
	CreateSprintData,
	SprintRepository,
} from "@/application/sprint/ports/sprint-repository";
import type { Sprint } from "@/domain/sprint/entities/sprint";

export function createFakeSprintRepository(): SprintRepository {
	const sprints: Sprint[] = [];
	let nextId = 1;

	return {
		async create(data: CreateSprintData) {
			const sprint: Sprint = {
				id: `sprint-${nextId++}`,
				status: "PLANNED",
				...data,
			};
			sprints.push(sprint);
			return sprint;
		},
		async listByPi(piId) {
			return sprints.filter((sprint) => sprint.piId === piId);
		},
		async listByTeam(teamId) {
			return sprints.filter((sprint) => sprint.teamId === teamId);
		},
		async findById(id) {
			return sprints.find((sprint) => sprint.id === id) ?? null;
		},
		async updateStatus(sprintId, status) {
			const sprint = sprints.find((item) => item.id === sprintId);
			if (!sprint) throw new ApplicationError("Sprint não encontrada");
			sprint.status = status;
			return sprint;
		},
	};
}
