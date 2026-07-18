import type { TaskStatus } from "@/domain/task/entities/task";

export const STATUS_LABELS: Record<TaskStatus, string> = {
	TODO: "A Fazer",
	IN_DEVELOPMENT: "Em Desenvolvimento",
	CODE_REVIEW: "Code Review",
	DONE: "Concluído",
};

export const STATUS_ORDER: TaskStatus[] = [
	"TODO",
	"IN_DEVELOPMENT",
	"CODE_REVIEW",
	"DONE",
];
