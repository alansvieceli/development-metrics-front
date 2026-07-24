"use client";

import {
	Ban,
	CalendarClock,
	IdCard,
	Pencil,
	Plus,
	Tags,
	Trash2,
} from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import type { ActionState } from "@/application/shared/action-state";
import type { CreateTaskInput } from "@/application/task/use-cases/create-task";
import type { UpdateTaskInput } from "@/application/task/use-cases/update-task";
import type { Sprint } from "@/domain/sprint/entities/sprint";
import type { Tag } from "@/domain/task/entities/tag";
import type { Task, TaskStatus } from "@/domain/task/entities/task";
import type { TaskType } from "@/domain/task/entities/task-type";
import type { Member } from "@/domain/team/entities/member";
import { Button } from "@/presentation/shared/button";
import {
	FormFooter,
	FormSection,
	SelectField,
	TextareaField,
	TextField,
} from "@/presentation/shared/form-field";
import { Modal } from "@/presentation/shared/modal";
import { TagCombobox } from "@/presentation/shared/tag-combobox";
import {
	STATUS_LABELS,
	STATUS_ORDER,
} from "@/presentation/task/task-status-labels";

export type TeamTaskOption = {
	id: string;
	externalId: string;
	description: string;
};

type TaskFormModalProps =
	| {
			mode: "create";
			taskTypes: TaskType[];
			members: Member[];
			teamTasks: TeamTaskOption[];
			tags: Tag[];
			sprints: Sprint[];
			createTaskAction: (
				input: Omit<CreateTaskInput, "teamId">,
			) => Promise<ActionState>;
	  }
	| {
			mode: "edit";
			task: Task;
			taskTypes: TaskType[];
			members: Member[];
			teamTasks: TeamTaskOption[];
			tags: Tag[];
			sprints: Sprint[];
			initialTagIds: string[];
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
	const [tagIds, setTagIds] = useState<string[]>(
		props.mode === "edit" ? props.initialTagIds : [],
	);

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const formData = new FormData(event.currentTarget);
		const externalId = String(formData.get("externalId") ?? "");
		const description = String(formData.get("description") ?? "");
		const typeId = String(formData.get("typeId") ?? "");
		const assigneeIdValue = String(formData.get("assigneeId") ?? "");
		const assigneeId = assigneeIdValue === "" ? null : assigneeIdValue;
		const dueDate = String(formData.get("dueDate") ?? "");
		const parentTaskIdValue = String(formData.get("parentTaskId") ?? "");
		const parentTaskId = parentTaskIdValue === "" ? null : parentTaskIdValue;
		const sprintIdValue = String(formData.get("sprintId") ?? "");
		const sprintId = sprintIdValue === "" ? null : sprintIdValue;

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
					parentTaskId,
					sprintId,
					tagIds,
				});
			} else {
				result = await props.updateTaskAction(props.task.id, {
					externalId,
					description,
					typeId,
					assigneeId,
					dueDate,
					parentTaskId,
					sprintId,
					tagIds,
				});
			}
			if (result.error) {
				setError(result.error);
				return;
			}
			setOpen(false);
			if (props.mode === "create") {
				setTagIds([]);
			}
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
					size="xl"
				>
					<form onSubmit={handleSubmit} className="flex flex-col gap-5">
						<FormSection
							title="Identificação"
							icon={<IdCard size={14} aria-hidden="true" />}
						>
							<div className="grid grid-cols-2 gap-4">
								<TextField
									id="externalId"
									name="externalId"
									label="Id externo"
									defaultValue={isEdit ? props.task.externalId : ""}
									required
								/>
								<SelectField
									id="typeId"
									name="typeId"
									label="Tipo"
									defaultValue={
										isEdit ? props.task.typeId : props.taskTypes[0]?.id
									}
									required
								>
									{props.taskTypes.map((taskType) => (
										<option key={taskType.id} value={taskType.id}>
											{taskType.name}
										</option>
									))}
								</SelectField>
							</div>
							<TextareaField
								id="description"
								name="description"
								label="Descrição"
								defaultValue={isEdit ? props.task.description : ""}
								required
							/>
						</FormSection>

						<FormSection
							title="Planejamento"
							icon={<CalendarClock size={14} aria-hidden="true" />}
						>
							<div className="grid grid-cols-2 gap-4">
								<SelectField
									id="assigneeId"
									name="assigneeId"
									label="Responsável"
									defaultValue={isEdit ? (props.task.assigneeId ?? "") : ""}
								>
									<option value="">Sem responsável</option>
									{props.members.map((member) => (
										<option key={member.id} value={member.id}>
											{member.name}
										</option>
									))}
								</SelectField>
								<TextField
									id="dueDate"
									type="date"
									name="dueDate"
									label="Data prevista de entrega"
									defaultValue={isEdit ? props.task.dueDate : ""}
									required
								/>
								{!isEdit ? (
									<SelectField
										id="status"
										name="status"
										label="Coluna inicial"
										defaultValue="TODO"
									>
										{STATUS_ORDER.map((status) => (
											<option key={status} value={status}>
												{STATUS_LABELS[status]}
											</option>
										))}
									</SelectField>
								) : null}
								<SelectField
									id="sprintId"
									name="sprintId"
									label="Sprint (opcional)"
									defaultValue={isEdit ? (props.task.sprintId ?? "") : ""}
								>
									<option value="">Sem sprint</option>
									{props.sprints.map((sprint) => (
										<option key={sprint.id} value={sprint.id}>
											{sprint.name}
										</option>
									))}
								</SelectField>
								<SelectField
									id="parentTaskId"
									name="parentTaskId"
									label="Task de origem (opcional)"
									defaultValue={isEdit ? (props.task.parentTaskId ?? "") : ""}
									fieldClassName="col-span-2"
								>
									<option value="">Nenhuma</option>
									{props.teamTasks
										.filter(
											(teamTask) => !isEdit || teamTask.id !== props.task.id,
										)
										.map((teamTask) => (
											<option key={teamTask.id} value={teamTask.id}>
												{teamTask.externalId} — {teamTask.description}
											</option>
										))}
								</SelectField>
							</div>
						</FormSection>

						<FormSection
							title="Tarjas & status"
							icon={<Tags size={14} aria-hidden="true" />}
						>
							<TagCombobox
								id="task-tags"
								label="Tarjas"
								catalog={props.tags}
								selectedIds={tagIds}
								max={3}
								onChange={setTagIds}
							/>
							{isEdit ? (
								<label className="flex w-fit items-center gap-2 rounded-lg border border-(--warn)/40 bg-(--warn)/10 px-3 py-2 text-sm">
									<input
										type="checkbox"
										checked={props.task.blocked}
										onChange={handleToggleBlocked}
										disabled={pending}
									/>
									<Ban size={14} aria-hidden="true" />
									Bloqueado
								</label>
							) : null}
						</FormSection>

						{error ? <p role="alert">{error}</p> : null}
						<FormFooter>
							{isEdit ? (
								<Button
									type="button"
									variant="danger-ghost"
									onClick={handleDelete}
									disabled={pending}
									className="flex items-center gap-1.5"
								>
									<Trash2 size={14} aria-hidden="true" />
									Excluir task
								</Button>
							) : null}
							<Button type="submit" disabled={pending}>
								Salvar
							</Button>
						</FormFooter>
					</form>
				</Modal>
			) : null}
		</>
	);
}
