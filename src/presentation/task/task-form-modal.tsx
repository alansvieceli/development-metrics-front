"use client";

import { Pencil, Plus } from "lucide-react";
import { useState } from "react";
import type { ActionState } from "@/application/shared/action-state";
import type { CreateTaskInput } from "@/application/task/use-cases/create-task";
import type { UpdateTaskInput } from "@/application/task/use-cases/update-task";
import type { Task, TaskStatus } from "@/domain/task/entities/task";
import type { TaskType } from "@/domain/task/entities/task-type";
import type { Member } from "@/domain/team/entities/member";
import { Modal } from "@/presentation/shared/modal";
import {
	STATUS_LABELS,
	STATUS_ORDER,
} from "@/presentation/task/task-status-labels";

type TaskFormModalProps =
	| {
			mode: "create";
			taskTypes: TaskType[];
			members: Member[];
			createTaskAction: (
				input: Omit<CreateTaskInput, "teamId">,
			) => Promise<ActionState>;
	  }
	| {
			mode: "edit";
			task: Task;
			taskTypes: TaskType[];
			members: Member[];
			updateTaskAction: (
				taskId: string,
				input: UpdateTaskInput,
			) => Promise<ActionState>;
			deleteTaskAction: (taskId: string) => Promise<ActionState>;
			toggleBlockedAction: (
				taskId: string,
				blocked: boolean,
			) => Promise<ActionState>;
	  };

export function TaskFormModal(props: TaskFormModalProps) {
	const [open, setOpen] = useState(false);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const isEdit = props.mode === "edit";

	async function handleSubmit(formData: FormData) {
		const externalId = String(formData.get("externalId") ?? "");
		const description = String(formData.get("description") ?? "");
		const typeId = String(formData.get("typeId") ?? "");
		const assigneeIdValue = String(formData.get("assigneeId") ?? "");
		const assigneeId = assigneeIdValue === "" ? null : assigneeIdValue;
		const dueDate = String(formData.get("dueDate") ?? "");

		setPending(true);
		setError(null);
		try {
			let result: ActionState;
			if (props.mode === "create") {
				const status = String(formData.get("status") ?? "TODO") as TaskStatus;
				result = await props.createTaskAction({
					externalId,
					description,
					typeId,
					assigneeId,
					dueDate,
					status,
				});
			} else {
				result = await props.updateTaskAction(props.task.id, {
					externalId,
					description,
					typeId,
					assigneeId,
					dueDate,
				});
			}
			if (result.error) {
				setError(result.error);
				return;
			}
			setOpen(false);
		} catch {
			setError("Não foi possível concluir a operação");
		} finally {
			setPending(false);
		}
	}

	async function handleDelete() {
		if (props.mode !== "edit") {
			return;
		}
		const confirmed = window.confirm(
			`Excluir a task "${props.task.externalId}"? Essa ação não pode ser desfeita.`,
		);
		if (!confirmed) {
			return;
		}
		setPending(true);
		setError(null);
		try {
			const result = await props.deleteTaskAction(props.task.id);
			if (result.error) {
				setError(result.error);
				return;
			}
			setOpen(false);
		} catch {
			setError("Não foi possível concluir a operação");
		} finally {
			setPending(false);
		}
	}

	async function handleToggleBlocked() {
		if (props.mode !== "edit") {
			return;
		}
		setPending(true);
		setError(null);
		try {
			const result = await props.toggleBlockedAction(
				props.task.id,
				!props.task.blocked,
			);
			if (result.error) setError(result.error);
		} catch {
			setError("Não foi possível concluir a operação");
		} finally {
			setPending(false);
		}
	}

	return (
		<>
			{isEdit ? (
				<button
					type="button"
					aria-label="Editar task"
					onClick={() => setOpen(true)}
					className="rounded-lg border border-(--border) p-1.5"
				>
					<Pencil size={14} aria-hidden="true" />
				</button>
			) : (
				<button
					type="button"
					onClick={() => setOpen(true)}
					className="flex items-center gap-1 rounded-lg bg-(--accent) px-4 py-2 text-(--accent-fg)"
				>
					<Plus size={16} aria-hidden="true" />
					Task
				</button>
			)}
			{open ? (
				<Modal
					label={isEdit ? "Editar task" : "Nova task"}
					onClose={() => setOpen(false)}
				>
					<form action={handleSubmit} className="flex flex-col gap-4">
						<h2 className="text-xl font-semibold">
							{isEdit ? "Editar task" : "Nova task"}
						</h2>
						<div className="flex flex-col gap-2">
							<label htmlFor="externalId" className="text-sm opacity-70">
								Id externo
							</label>
							<input
								id="externalId"
								name="externalId"
								defaultValue={isEdit ? props.task.externalId : ""}
								className="rounded-lg border border-(--border) px-3 py-2"
								required
							/>
						</div>
						<div className="flex flex-col gap-2">
							<label htmlFor="description" className="text-sm opacity-70">
								Descrição
							</label>
							<textarea
								id="description"
								name="description"
								defaultValue={isEdit ? props.task.description : ""}
								className="rounded-lg border border-(--border) px-3 py-2"
								required
							/>
						</div>
						<div className="flex flex-col gap-2">
							<label htmlFor="typeId" className="text-sm opacity-70">
								Tipo
							</label>
							<select
								id="typeId"
								name="typeId"
								defaultValue={
									isEdit ? props.task.typeId : props.taskTypes[0]?.id
								}
								className="rounded-lg border border-(--border) px-3 py-2"
								required
							>
								{props.taskTypes.map((taskType) => (
									<option key={taskType.id} value={taskType.id}>
										{taskType.name}
									</option>
								))}
							</select>
						</div>
						<div className="flex flex-col gap-2">
							<label htmlFor="assigneeId" className="text-sm opacity-70">
								Responsável
							</label>
							<select
								id="assigneeId"
								name="assigneeId"
								defaultValue={isEdit ? (props.task.assigneeId ?? "") : ""}
								className="rounded-lg border border-(--border) px-3 py-2"
							>
								<option value="">Sem responsável</option>
								{props.members.map((member) => (
									<option key={member.id} value={member.id}>
										{member.name}
									</option>
								))}
							</select>
						</div>
						<div className="flex flex-col gap-2">
							<label htmlFor="dueDate" className="text-sm opacity-70">
								Data prevista de entrega
							</label>
							<input
								id="dueDate"
								type="date"
								name="dueDate"
								defaultValue={isEdit ? props.task.dueDate : ""}
								className="rounded-lg border border-(--border) px-3 py-2"
								required
							/>
						</div>
						{!isEdit ? (
							<div className="flex flex-col gap-2">
								<label htmlFor="status" className="text-sm opacity-70">
									Coluna inicial
								</label>
								<select
									id="status"
									name="status"
									defaultValue="TODO"
									className="rounded-lg border border-(--border) px-3 py-2"
								>
									{STATUS_ORDER.map((status) => (
										<option key={status} value={status}>
											{STATUS_LABELS[status]}
										</option>
									))}
								</select>
							</div>
						) : null}
						{isEdit ? (
							<label className="flex items-center gap-2 text-sm">
								<input
									type="checkbox"
									checked={props.task.blocked}
									onChange={handleToggleBlocked}
									disabled={pending}
								/>
								⛔ Bloqueado
							</label>
						) : null}
						{error ? <p role="alert">{error}</p> : null}
						<button
							type="submit"
							disabled={pending}
							className="rounded-lg bg-(--accent) px-4 py-2 text-(--accent-fg) disabled:opacity-60"
						>
							Salvar
						</button>
						{isEdit ? (
							<button
								type="button"
								onClick={handleDelete}
								disabled={pending}
								className="rounded-lg bg-red-700 px-4 py-2 text-white disabled:opacity-60"
							>
								Excluir task
							</button>
						) : null}
					</form>
				</Modal>
			) : null}
		</>
	);
}
