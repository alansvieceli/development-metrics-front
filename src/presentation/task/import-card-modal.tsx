"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import type {
	ConfirmCardImportInput,
	PreviewCardImportResult,
} from "@/app/board/import-card-actions";
import type { ActionState } from "@/application/shared/action-state";
import type { CardImportPreview } from "@/application/task/use-cases/preview-card-import";
import type { Tag } from "@/domain/task/entities/tag";
import type { TaskType } from "@/domain/task/entities/task-type";
import { Modal } from "@/presentation/shared/modal";
import { TagCombobox } from "@/presentation/shared/tag-combobox";
import { STATUS_LABELS } from "@/presentation/task/task-status-labels";

type ImportCardModalProps = {
	taskTypes: TaskType[];
	tags: Tag[];
	previewCardImportAction: (cardId: string) => Promise<PreviewCardImportResult>;
	confirmCardImportAction: (
		input: ConfirmCardImportInput,
	) => Promise<ActionState>;
};

export function ImportCardModal({
	taskTypes,
	tags,
	previewCardImportAction,
	confirmCardImportAction,
}: ImportCardModalProps) {
	const [open, setOpen] = useState(false);
	const [cardId, setCardId] = useState("");
	const [preview, setPreview] = useState<CardImportPreview | null>(null);
	const [typeId, setTypeId] = useState(taskTypes[0]?.id ?? "");
	const [tagIds, setTagIds] = useState<string[]>([]);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);

	function reset() {
		setCardId("");
		setPreview(null);
		setTagIds([]);
		setError(null);
	}

	async function handleFetch() {
		setPending(true);
		setError(null);
		try {
			const result = await previewCardImportAction(cardId);
			if (result.error !== null) {
				setError(result.error);
				return;
			}
			setPreview(result.preview);
			setTypeId(result.preview.resolvedTypeId ?? taskTypes[0]?.id ?? "");
		} catch {
			setError("Não foi possível buscar o card");
		} finally {
			setPending(false);
		}
	}

	async function handleConfirm() {
		if (!preview) return;
		setPending(true);
		setError(null);
		try {
			const result = await confirmCardImportAction({ preview, typeId, tagIds });
			if (result.error) {
				setError(result.error);
				return;
			}
			setOpen(false);
			reset();
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
				<Download size={16} aria-hidden="true" />
				Importar card
			</button>
			{open ? (
				<Modal
					label="Importar card do Businessmap"
					size="lg"
					onClose={() => {
						setOpen(false);
						reset();
					}}
				>
					{!preview ? (
						<div className="flex flex-col gap-4">
							<div className="flex flex-col gap-2">
								<label htmlFor="import-card-id" className="text-sm opacity-70">
									Id do card no Businessmap
								</label>
								<input
									id="import-card-id"
									value={cardId}
									onChange={(event) => setCardId(event.target.value)}
									className="rounded-lg border border-(--border) px-3 py-2"
								/>
							</div>
							{error ? <p role="alert">{error}</p> : null}
							<button
								type="button"
								disabled={pending || !cardId.trim()}
								onClick={handleFetch}
								className="self-start rounded-lg bg-(--accent) px-4 py-2 text-(--accent-fg) disabled:opacity-60"
							>
								Buscar
							</button>
						</div>
					) : (
						<div className="flex flex-col gap-4">
							<div>
								<p className="text-sm opacity-70">Id externo</p>
								<p>{preview.externalId}</p>
							</div>
							<div>
								<p className="text-sm opacity-70">Descrição</p>
								<p className="whitespace-pre-wrap">{preview.description}</p>
							</div>
							<div>
								<p className="text-sm opacity-70">Data prevista</p>
								<p>{preview.dueDate}</p>
							</div>
							<div>
								<p className="text-sm opacity-70">Responsável</p>
								<p>
									{preview.ownerName ?? "Sem responsável"}
									{!preview.resolvedAssigneeId
										? " (sem correspondência no time)"
										: ""}
								</p>
							</div>
							<div>
								<p className="text-sm opacity-70">Bloqueio</p>
								<p>
									{preview.blocked
										? "Bloqueado no Businessmap"
										: "Não bloqueado"}
								</p>
							</div>
							<div>
								<p className="text-sm opacity-70">Etapas importadas</p>
								<ul className="list-disc pl-5">
									{preview.steps.map((step) => (
										<li key={`${step.status}-${step.date}`}>
											{STATUS_LABELS[step.status]} — {step.date}
										</li>
									))}
								</ul>
							</div>
							{preview.warnings.length > 0 ? (
								<ul className="list-disc pl-5 text-sm opacity-80">
									{preview.warnings.map((warning) => (
										<li key={warning}>{warning}</li>
									))}
								</ul>
							) : null}
							<div className="flex flex-col gap-2">
								<label htmlFor="import-typeId" className="text-sm opacity-70">
									Tipo
								</label>
								<select
									id="import-typeId"
									value={typeId}
									onChange={(event) => setTypeId(event.target.value)}
									className="rounded-lg border border-(--border) px-3 py-2"
								>
									{taskTypes.map((taskType) => (
										<option key={taskType.id} value={taskType.id}>
											{taskType.name}
										</option>
									))}
								</select>
							</div>
							<TagCombobox
								id="import-tags"
								label="Tarjas"
								catalog={tags}
								selectedIds={tagIds}
								max={3}
								onChange={setTagIds}
							/>
							{error ? <p role="alert">{error}</p> : null}
							<div className="flex gap-2">
								<button
									type="button"
									disabled={pending}
									onClick={handleConfirm}
									className="rounded-lg bg-(--accent) px-4 py-2 text-(--accent-fg) disabled:opacity-60"
								>
									Confirmar importação
								</button>
								<button
									type="button"
									disabled={pending}
									onClick={reset}
									className="rounded-lg border border-(--border) px-4 py-2"
								>
									Cancelar
								</button>
							</div>
						</div>
					)}
				</Modal>
			) : null}
		</>
	);
}
