import { Trash2 } from "lucide-react";
import type { TaskTypeWithUsage } from "@/application/task/use-cases/list-task-types";
import { SubmitButton } from "@/presentation/shared/submit-button";

type TaskTypeListProps = {
	taskTypes: TaskTypeWithUsage[];
	updateTaskTypeAction: (
		typeId: string,
		formData: FormData,
	) => void | Promise<void>;
	deleteTaskTypeAction: (typeId: string) => void | Promise<void>;
};

export function TaskTypeList({
	taskTypes,
	updateTaskTypeAction,
	deleteTaskTypeAction,
}: TaskTypeListProps) {
	if (taskTypes.length === 0) {
		return <p className="text-sm opacity-70">Nenhum tipo cadastrado ainda.</p>;
	}

	return (
		<ul className="flex flex-col gap-2">
			{taskTypes.map((taskType) => (
				<li key={taskType.id} className="flex items-center gap-2">
					<form
						action={updateTaskTypeAction.bind(null, taskType.id)}
						className="flex flex-1 items-center gap-2"
					>
						<input
							type="color"
							name="color"
							defaultValue={taskType.color}
							className="h-9 w-9 shrink-0 rounded border border-(--border)"
						/>
						<input
							name="name"
							defaultValue={taskType.name}
							className="flex-1 rounded-lg border border-(--border) px-2 py-1"
							required
						/>
						<SubmitButton className="rounded-lg border border-(--border) px-3 py-1.5 disabled:opacity-60">
							Salvar
						</SubmitButton>
					</form>
					<form action={deleteTaskTypeAction.bind(null, taskType.id)}>
						<SubmitButton
							aria-label="Excluir tipo"
							disabled={taskType.inUse}
							title={
								taskType.inUse
									? "Não é possível excluir: há tasks vinculadas a este tipo"
									: undefined
							}
							confirmMessage={`Excluir o tipo "${taskType.name}"?`}
							className="rounded-lg border border-(--border) p-1.5 disabled:opacity-40"
						>
							<Trash2 size={14} aria-hidden="true" />
						</SubmitButton>
					</form>
				</li>
			))}
		</ul>
	);
}
