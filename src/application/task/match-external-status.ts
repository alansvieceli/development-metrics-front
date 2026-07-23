import { matchesEitherWay } from "@/application/shared/fuzzy-match";
import { TASK_STATUSES, type TaskStatus } from "@/domain/task/entities/task";

const STATUS_ALIASES: Record<TaskStatus, string[]> = {
	TODO: ["Backlog", "Card created"],
	IN_DEVELOPMENT: ["Desenvolvimento", "Em Andamento"],
	CODE_REVIEW: ["Revisão", "Code Review"],
	TESTING: ["Testes", "Para Testar"],
	AWAITING_PUBLICATION: ["Publicação", "Homologação"],
	DONE: ["Concluído", "Concluido", "Done"],
};

export function matchExternalStatus(rawLabel: string): TaskStatus | null {
	const columnPart = rawLabel.includes(".")
		? rawLabel.slice(rawLabel.lastIndexOf(".") + 1)
		: rawLabel;
	for (const status of TASK_STATUSES) {
		if (
			STATUS_ALIASES[status].some((alias) => matchesEitherWay(columnPart, alias))
		) {
			return status;
		}
	}
	return null;
}
