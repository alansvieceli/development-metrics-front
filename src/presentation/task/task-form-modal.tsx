"use client";

import { Pencil, Plus, X } from "lucide-react";
import { useState } from "react";
import {
	createTaskAction,
	deleteTaskAction,
	toggleBlockedAction,
	updateTaskAction,
} from "@/app/board/actions";
import type { Task, TaskStatus } from "@/domain/task/entities/task";
import type { TaskType } from "@/domain/task/entities/task-type";
import type { Member } from "@/domain/team/entities/member";
import { STATUS_LABELS, STATUS_ORDER } from "@/presentation/task/task-status-labels";

type TaskFormModalProps =
	| {
			mode: "create";
			teamId: string;
			taskTypes: TaskType[];
			members: Member[];
	  }
	| {
			mode: "edit";
			task: Task;
			taskTypes: TaskType[];
			members: Member[];
	  };

export function TaskFormModal(props: TaskFormModalProps) {
	const [open, setOpen] = useState(false);
	const [pending, setPending] = useState(false);
	const isEdit = props.mode === "edit";

	async function handleSubmit(formData: FormData) {
		const externalId = String(formData.get("externalId") ?? "");
		const description = String(formData.get("description") ?? "");
		const typeId = String(formData.get("typeId") ?? "");
		const assigneeIdValue = String(formData.get("assigneeId") ?? "");
		const assigneeId = assigneeIdValue === "" ? null : assigneeIdValue;
		const dueDateValue = String(formData.get("dueDate") ?? "");
		const dueDate = dueDateValue === "" ? null : dueDateValue;

		setPending(true);
		try {
			if (props.mode === "create") {
				const status = String(formData.get("status") ?? "TODO") as TaskStatus;
				await createTaskAction({
					externalId,
					description,
					typeId,
					assigneeId,
					dueDate,
					teamId: props.teamId,
					status,
				});
			} else {
				await updateTaskAction(props.task.id, {
					externalId,
					description,
					typeId,
					assigneeId,
					dueDate,
				});
			}
			setOpen(false);
		} catch (error) {
			window.alert(
				error instanceof Error ? error.message : "Erro ao salvar a task",
			);
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
		await deleteTaskAction(props.task.id);
		setOpen(false);
	}

	async function handleToggleBlocked() {
		if (props.mode !== "edit") {
			return;
		}
		setPending(true);
		await toggleBlockedAction(props.task.id, !props.task.blocked);
		setPending(false);
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
					Nova task
				</button>
			)}
			{open ? (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
					<button
						type="button"
						aria-label="Fechar"
						onClick={() => setOpen(false)}
						className="absolute inset-0 bg-black/50"
					/>
					<div className="relative z-10 max-h-[85vh] w-full max-w-md overflow-y-auto rounded-lg bg-(--background) p-6 shadow-xl">
						<button
							type="button"
							aria-label="Fechar"
							onClick={() => setOpen(false)}
							className="absolute top-3 right-3 rounded-lg p-1 hover:bg-black/5"
						>
							<X size={18} aria-hidden="true" />
						</button>
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
									defaultValue={isEdit ? props.task.typeId : props.taskTypes[0]?.id}
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
									defaultValue={isEdit ? (props.task.dueDate ?? "") : ""}
									className="rounded-lg border border-(--border) px-3 py-2"
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
					</div>
				</div>
			) : null}
		</>
	);
}
