"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import type { CreateHistoricalTaskActionInput } from "@/app/board/actions";
import type { ActionState } from "@/application/shared/action-state";
import type { TaskStatus } from "@/domain/task/entities/task";
import type { TaskType } from "@/domain/task/entities/task-type";
import type { Member } from "@/domain/team/entities/member";
import { Modal } from "@/presentation/shared/modal";
import {
	STATUS_LABELS,
	STATUS_ORDER,
} from "@/presentation/task/task-status-labels";

type Step = { status: TaskStatus; date: string };

type HistoricalTaskFormModalProps = {
	taskTypes: TaskType[];
	members: Member[];
	createHistoricalTaskAction: (
		input: CreateHistoricalTaskActionInput,
	) => Promise<ActionState>;
};

export function HistoricalTaskFormModal({
	taskTypes,
	members,
	createHistoricalTaskAction,
}: HistoricalTaskFormModalProps) {
	const [open, setOpen] = useState(false);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [steps, setSteps] = useState<Step[]>([{ status: "TODO", date: "" }]);

	function updateStep(index: number, patch: Partial<Step>) {
		setSteps((current) =>
			current.map((step, i) => (i === index ? { ...step, ...patch } : step)),
		);
	}

	async function handleSubmit(formData: FormData) {
		const externalId = String(formData.get("externalId") ?? "");
		const description = String(formData.get("description") ?? "");
		const typeId = String(formData.get("typeId") ?? "");
		const assigneeIdValue = String(formData.get("assigneeId") ?? "");
		const assigneeId = assigneeIdValue === "" ? null : assigneeIdValue;
		const dueDateValue = String(formData.get("dueDate") ?? "");
		const dueDate = dueDateValue === "" ? null : dueDateValue;

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
			});
			if (result.error) {
				setError(result.error);
				return;
			}
			setOpen(false);
			setSteps([{ status: "TODO", date: "" }]);
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
				className="flex items-center gap-1 rounded-lg border border-(--border) px-4 py-2"
			>
				<Plus size={16} aria-hidden="true" />
				Card retroativo
			</button>
			{open ? (
				<Modal label="Card retroativo" onClose={() => setOpen(false)}>
					<form action={handleSubmit} className="flex flex-col gap-4">
						<h2 className="text-xl font-semibold">Card retroativo</h2>
						<div className="flex flex-col gap-2">
							<label htmlFor="hist-externalId" className="text-sm opacity-70">
								Id externo
							</label>
							<input
								id="hist-externalId"
								name="externalId"
								className="rounded-lg border border-(--border) px-3 py-2"
								required
							/>
						</div>
						<div className="flex flex-col gap-2">
							<label htmlFor="hist-description" className="text-sm opacity-70">
								Descrição
							</label>
							<textarea
								id="hist-description"
								name="description"
								className="rounded-lg border border-(--border) px-3 py-2"
								required
							/>
						</div>
						<div className="flex flex-col gap-2">
							<label htmlFor="hist-typeId" className="text-sm opacity-70">
								Tipo
							</label>
							<select
								id="hist-typeId"
								name="typeId"
								defaultValue={taskTypes[0]?.id}
								className="rounded-lg border border-(--border) px-3 py-2"
								required
							>
								{taskTypes.map((taskType) => (
									<option key={taskType.id} value={taskType.id}>
										{taskType.name}
									</option>
								))}
							</select>
						</div>
						<div className="flex flex-col gap-2">
							<label htmlFor="hist-assigneeId" className="text-sm opacity-70">
								Responsável
							</label>
							<select
								id="hist-assigneeId"
								name="assigneeId"
								defaultValue=""
								className="rounded-lg border border-(--border) px-3 py-2"
							>
								<option value="">Sem responsável</option>
								{members.map((member) => (
									<option key={member.id} value={member.id}>
										{member.name}
									</option>
								))}
							</select>
						</div>
						<div className="flex flex-col gap-2">
							<label htmlFor="hist-dueDate" className="text-sm opacity-70">
								Data prevista de entrega
							</label>
							<input
								id="hist-dueDate"
								type="date"
								name="dueDate"
								className="rounded-lg border border-(--border) px-3 py-2"
							/>
						</div>
						<div className="flex flex-col gap-2">
							<span className="text-sm opacity-70">Etapas</span>
							{steps.map((step, index) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: linhas não são reordenadas, só adicionadas/removidas do fim ou meio
								<div key={index} className="flex items-center gap-2">
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
							<button
								type="button"
								onClick={() =>
									setSteps((current) => [
										...current,
										{ status: "TODO", date: "" },
									])
								}
								className="self-start rounded-lg border border-(--border) px-3 py-1.5 text-sm"
							>
								+ Adicionar etapa
							</button>
						</div>
						{error ? <p role="alert">{error}</p> : null}
						<button
							type="submit"
							disabled={pending}
							className="rounded-lg bg-(--accent) px-4 py-2 text-(--accent-fg) disabled:opacity-60"
						>
							Salvar
						</button>
					</form>
				</Modal>
			) : null}
		</>
	);
}
