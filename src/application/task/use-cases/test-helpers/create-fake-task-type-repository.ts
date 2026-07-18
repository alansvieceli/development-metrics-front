import type { TaskTypeRepository } from "@/application/task/ports/task-type-repository";
import type { TaskType } from "@/domain/task/entities/task-type";

export function createFakeTaskTypeRepository(): TaskTypeRepository {
	let taskTypes: TaskType[] = [];
	let nextId = 1;

	return {
		async create(name, color) {
			const taskType: TaskType = { id: `task-type-${nextId++}`, name, color };
			taskTypes.push(taskType);
			return taskType;
		},
		async update(typeId, name, color) {
			const taskType = taskTypes.find((t) => t.id === typeId);
			if (!taskType) {
				throw new Error("Tipo de task não encontrado");
			}
			taskType.name = name;
			taskType.color = color;
			return taskType;
		},
		async delete(typeId) {
			taskTypes = taskTypes.filter((t) => t.id !== typeId);
		},
		async listAll() {
			return taskTypes;
		},
		async findById(typeId) {
			return taskTypes.find((t) => t.id === typeId) ?? null;
		},
	};
}
