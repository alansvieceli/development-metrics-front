import { db } from "../../db/client";
import { taskTypes } from "./schema";

const DEFAULT_TASK_TYPES = [
	{ name: "História", color: "#2563eb", isBug: false },
	{ name: "Tarefa Técnica", color: "#64748b", isBug: false },
	{ name: "Bug", color: "#dc2626", isBug: true },
] as const;

export async function seedDefaultTaskTypes() {
	await db.insert(taskTypes).values([...DEFAULT_TASK_TYPES]);
}
