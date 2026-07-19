import type { TaskStatus } from "@/domain/task/entities/task";

export const STATUS_LABELS: Record<TaskStatus, string> = {
	TODO: "Backlog",
	IN_DEVELOPMENT: "Desenvolvimento",
	CODE_REVIEW: "Revisão",
	TESTING: "Testes",
	AWAITING_PUBLICATION: "Publicação",
	DONE: "Concluído",
};

export const STATUS_ORDER: TaskStatus[] = [
	"TODO",
	"IN_DEVELOPMENT",
	"CODE_REVIEW",
	"TESTING",
	"AWAITING_PUBLICATION",
	"DONE",
];
