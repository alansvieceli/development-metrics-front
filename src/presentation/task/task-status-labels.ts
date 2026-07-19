import type { TaskStatus } from "@/domain/task/entities/task";

export const STATUS_LABELS: Record<TaskStatus, string> = {
	TODO: "A Fazer",
	IN_DEVELOPMENT: "Em Desenvolvimento",
	CODE_REVIEW: "Code Review",
	TESTING: "Testes",
	AWAITING_PUBLICATION: "Aguardando Publicação",
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
