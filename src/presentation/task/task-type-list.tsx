"use client";

import { Trash2 } from "lucide-react";
import { useActionState } from "react";
import {
	type ActionState,
	INITIAL_ACTION_STATE,
} from "@/application/shared/action-state";
import type { TaskTypeWithUsage } from "@/application/task/use-cases/list-task-types";
import { SubmitButton } from "@/presentation/shared/submit-button";

type TaskTypeListProps = {
	taskTypes: TaskTypeWithUsage[];
	updateTaskTypeAction: (
		typeId: string,
		previousState: ActionState,
		formData: FormData,
	) => Promise<ActionState>;
	deleteTaskTypeAction: (
		typeId: string,
		previousState: ActionState,
		formData: FormData,
	) => Promise<ActionState>;
};

function TaskTypeRow({
	taskType,
	updateTaskTypeAction,
	deleteTaskTypeAction,
}: {
	taskType: TaskTypeWithUsage;
	updateTaskTypeAction: TaskTypeListProps["updateTaskTypeAction"];
	deleteTaskTypeAction: TaskTypeListProps["deleteTaskTypeAction"];
}) {
	const [updateState, updateAction] = useActionState(
		updateTaskTypeAction.bind(null, taskType.id),
		INITIAL_ACTION_STATE,
	);
	const [deleteState, deleteAction] = useActionState(
		deleteTaskTypeAction.bind(null, taskType.id),
		INITIAL_ACTION_STATE,
	);

	return (
		<li className="flex flex-col gap-1">
			<div className="flex items-center gap-2">
				<form action={updateAction} className="flex flex-1 items-center gap-2">
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
				<form action={deleteAction}>
					<SubmitButton
						aria-label="Excluir tipo"
						disabled={taskType.inUse}
						title={
							taskType.inUse
								? "Não é possível excluir: há tasks vinculadas a este tipo"
								: undefined
						}
						confirmMessage={`Excluir o tipo ${taskType.name}?`}
						className="rounded-lg border border-(--border) p-1.5 disabled:opacity-40"
					>
						<Trash2 size={14} aria-hidden="true" />
					</SubmitButton>
				</form>
			</div>
			{updateState.error ? <p role="alert">{updateState.error}</p> : null}
			{deleteState.error ? <p role="alert">{deleteState.error}</p> : null}
		</li>
	);
}

export function TaskTypeList(props: TaskTypeListProps) {
	if (props.taskTypes.length === 0) {
		return <p className="text-sm opacity-70">Nenhum tipo cadastrado ainda.</p>;
	}

	return (
		<ul className="flex flex-col gap-2">
			{props.taskTypes.map((taskType) => (
				<TaskTypeRow
					key={taskType.id}
					taskType={taskType}
					updateTaskTypeAction={props.updateTaskTypeAction}
					deleteTaskTypeAction={props.deleteTaskTypeAction}
				/>
			))}
		</ul>
	);
}
