import { ApplicationError } from "@/application/shared/application-error";
import type { SprintAccess } from "@/application/sprint/contracts/sprint-access";

export async function validateSprintId(
	access: SprintAccess,
	sprintId: string,
	teamId: string,
) {
	const sprint = await access.findById(sprintId);
	if (!sprint || sprint.teamId !== teamId) {
		throw new ApplicationError("Sprint não encontrada");
	}
}
