import { db } from "@/infrastructure/db/client";
import { taskTypes } from "./schema";

const DEFAULT_TASK_TYPES = [
	{ name: "História", color: "#2563eb" },
	{ name: "Tarefa Técnica", color: "#64748b" },
	{ name: "Bug", color: "#dc2626" },
] as const;

export async function seedDefaultTaskTypes() {
	await db.insert(taskTypes).values([...DEFAULT_TASK_TYPES]);
}
