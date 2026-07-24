"use client";

import { IdCard, ListOrdered, Plus, Tags, X } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import type { CreateHistoricalTaskActionInput } from "@/app/board/actions";
import type { ActionState } from "@/application/shared/action-state";
import type { Tag } from "@/domain/task/entities/tag";
import type { TaskStatus } from "@/domain/task/entities/task";
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

type Step = { status: TaskStatus; date: string };

type HistoricalTaskFormModalProps = {
	taskTypes: TaskType[];
	members: Member[];
	tags: Tag[];
	createHistoricalTaskAction: (
		input: CreateHistoricalTaskActionInput,
	) => Promise<ActionState>;
};

export function HistoricalTaskFormModal({
	taskTypes,
	members,
	tags,
	createHistoricalTaskAction,
}: HistoricalTaskFormModalProps) {
	const [open, setOpen] = useState(false);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [steps, setSteps] = useState<Step[]>([{ status: "TODO", date: "" }]);
	const [tagIds, setTagIds] = useState<string[]>([]);

	function updateStep(index: number, patch: Partial<Step>) {
		setSteps((current) =>
			current.map((step, i) => (i === index ? { ...step, ...patch } : step)),
		);
	}

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const formData = new FormData(event.currentTarget);
		const externalId = String(formData.get("externalId") ?? "");
		const description = String(formData.get("description") ?? "");
		const typeId = String(formData.get("typeId") ?? "");
		const assigneeIdValue = String(formData.get("assigneeId") ?? "");
		const assigneeId = assigneeIdValue === "" ? null : assigneeIdValue;
		const dueDate = String(formData.get("dueDate") ?? "");

		setPending(true);
		setError(null);
		try {
			const result = await createHistoricalTaskAction({
				externalId,
				description,
				typeId,
				assigneeId,
				dueDate,
				steps,
				tagIds,
			});
			if (result.error) {
				setError(result.error);
				return;
			}
			setOpen(false);
			setSteps([{ status: "TODO", date: "" }]);
			setTagIds([]);
		} catch {
			setError("Não foi possível concluir a operação");
		} finally {
			setPending(false);
		}
	}

	return (
		<>
			<button
				type="button"
				onClick={() => setOpen(true)}
				className="flex items-center gap-1 rounded-lg bg-(--accent) px-4 py-2 text-(--accent-fg)"
			>
				<Plus size={16} aria-hidden="true" />
				Retroativo
			</button>
			{open ? (
				<Modal label="Card retroativo" onClose={() => setOpen(false)} size="xl">
					<form onSubmit={handleSubmit} className="flex flex-col gap-5">
						<FormSection
							title="Identificação"
							icon={<IdCard size={14} aria-hidden="true" />}
						>
							<div className="grid grid-cols-2 gap-4">
								<TextField
									id="hist-externalId"
									name="externalId"
									label="Id externo"
									required
								/>
								<SelectField
									id="hist-typeId"
									name="typeId"
									label="Tipo"
									defaultValue={taskTypes[0]?.id}
									required
								>
									{taskTypes.map((taskType) => (
										<option key={taskType.id} value={taskType.id}>
											{taskType.name}
										</option>
									))}
								</SelectField>
								<SelectField
									id="hist-assigneeId"
									name="assigneeId"
									label="Responsável"
									defaultValue=""
								>
									<option value="">Sem responsável</option>
									{members.map((member) => (
										<option key={member.id} value={member.id}>
											{member.name}
										</option>
									))}
								</SelectField>
								<TextField
									id="hist-dueDate"
									type="date"
									name="dueDate"
									label="Data prevista de entrega"
									required
								/>
							</div>
							<TextareaField
								id="hist-description"
								name="description"
								label="Descrição"
								required
							/>
						</FormSection>

						<FormSection
							title="Etapas — histórico de status"
							icon={<ListOrdered size={14} aria-hidden="true" />}
						>
							<div className="flex flex-col gap-2">
								{steps.map((step, index) => (
									<div
										// biome-ignore lint/suspicious/noArrayIndexKey: linhas não são reordenadas, só adicionadas/removidas do fim ou meio
										key={index}
										className="grid grid-cols-[1.5rem_1fr_1fr_1.5rem] items-center gap-3 rounded-lg border border-(--border) bg-(--surface) px-3 py-2"
									>
										<span className="text-center font-mono text-(--foreground-muted) text-xs">
											{index + 1}
										</span>
										<select
											aria-label={`Status da etapa ${index + 1}`}
											value={step.status}
											onChange={(event) =>
												updateStep(index, {
													status: event.target.value as TaskStatus,
												})
											}
											className="rounded-lg border border-(--border) px-2 py-1"
										>
											{STATUS_ORDER.map((status) => (
												<option key={status} value={status}>
													{STATUS_LABELS[status]}
												</option>
											))}
										</select>
										<input
											aria-label={`Data da etapa ${index + 1}`}
											type="date"
											value={step.date}
											onChange={(event) =>
												updateStep(index, { date: event.target.value })
											}
											className="rounded-lg border border-(--border) px-2 py-1"
											required
										/>
										{steps.length > 1 ? (
											<button
												type="button"
												aria-label={`Remover etapa ${index + 1}`}
												onClick={() =>
													setSteps((current) =>
														current.filter((_, i) => i !== index),
													)
												}
												className="rounded-lg border border-(--border) p-1.5"
											>
												<X size={14} aria-hidden="true" />
											</button>
										) : null}
									</div>
								))}
							</div>
							<button
								type="button"
								onClick={() =>
									setSteps((current) => [
										...current,
										{ status: "TODO", date: "" },
									])
								}
								className="flex items-center gap-1 self-start rounded-lg border border-(--border) border-dashed px-3 py-1.5 text-(--accent) text-sm"
							>
								<Plus size={14} aria-hidden="true" />
								Adicionar etapa
							</button>
						</FormSection>

						<FormSection
							title="Tarjas"
							icon={<Tags size={14} aria-hidden="true" />}
						>
							<TagCombobox
								id="hist-tags"
								label="Tarjas"
								catalog={tags}
								selectedIds={tagIds}
								max={3}
								onChange={setTagIds}
								hideLabel
							/>
						</FormSection>

						{error ? <p role="alert">{error}</p> : null}
						<FormFooter>
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
