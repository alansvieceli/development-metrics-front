import { redirect } from "next/navigation";
import { createTaskUseCases } from "@/composition/task";
import { createTeamUseCases } from "@/composition/team";
import { TaskTypeForm } from "@/presentation/task/task-type-form";
import { TaskTypeList } from "@/presentation/task/task-type-list";
import {
	createTaskTypeAction,
	deleteTaskTypeAction,
	updateTaskTypeAction,
} from "./actions";

export default async function TaskTypesPage() {
	const teamUseCases = createTeamUseCases();
	const currentTeam = await teamUseCases.getCurrentTeam();
	if (!currentTeam) {
		redirect("/teams");
	}

	const taskUseCases = createTaskUseCases();
	const taskTypes = await taskUseCases.listTaskTypes();

	return (
		<main className="mx-auto flex max-w-md flex-col gap-6 p-6">
			<h1 className="text-xl font-semibold">Tipos de task</h1>
			<TaskTypeList
				taskTypes={taskTypes}
				updateTaskTypeAction={updateTaskTypeAction}
				deleteTaskTypeAction={deleteTaskTypeAction}
			/>
			<TaskTypeForm createTaskTypeAction={createTaskTypeAction} />
		</main>
	);
}
