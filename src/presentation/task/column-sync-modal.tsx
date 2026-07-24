"use client";

import { GitCompare } from "lucide-react";
import { useState } from "react";
import type { DiffColumnActionResult } from "@/app/board/businessmap-sync-actions";
import type { TaskStatus } from "@/domain/task/entities/task";
import { Modal } from "@/presentation/shared/modal";
import { STATUS_LABELS } from "@/presentation/task/task-status-labels";

type ColumnSyncModalProps = {
	status: TaskStatus;
	localExternalIds: string[];
	diffColumnAction: (
		status: TaskStatus,
		localExternalIds: string[],
	) => Promise<DiffColumnActionResult>;
};

export function ColumnSyncModal({
	status,
	localExternalIds,
	diffColumnAction,
}: ColumnSyncModalProps) {
	const [open, setOpen] = useState(false);
	const [pending, setPending] = useState(false);
	const [result, setResult] = useState<DiffColumnActionResult | null>(null);

	async function handleOpen() {
		setOpen(true);
		setPending(true);
		setResult(null);
		const response = await diffColumnAction(status, localExternalIds);
		setResult(response);
		setPending(false);
	}

	return (
		<>
			<button
				type="button"
				onClick={handleOpen}
				aria-label={`Comparar coluna ${STATUS_LABELS[status]} com o Businessmap`}
				className="rounded-lg p-1 opacity-70 hover:opacity-100"
			>
				<GitCompare size={14} aria-hidden="true" />
			</button>
			{open ? (
				<Modal
					label={`Comparar "${STATUS_LABELS[status]}" com o Businessmap`}
					size="md"
					onClose={() => setOpen(false)}
				>
					<div className="flex flex-col gap-4">
						{pending ? <p className="text-sm opacity-70">Buscando...</p> : null}
						{!pending && result?.error ? (
							<p role="alert">{result.error}</p>
						) : null}
						{!pending && result?.diff ? (
							<>
								<div>
									<p className="text-sm font-semibold text-(--critical)">
										Só aqui ({result.diff.onlyLocal.length})
									</p>
									<p className="text-sm">
										{result.diff.onlyLocal.join(", ") || "—"}
									</p>
								</div>
								<div>
									<p className="text-sm font-semibold text-(--warn)">
										Só no Businessmap ({result.diff.onlyBusinessmap.length})
									</p>
									<p className="text-sm">
										{result.diff.onlyBusinessmap.join(", ") || "—"}
									</p>
								</div>
								<details>
									<summary className="cursor-pointer text-sm opacity-70">
										Batendo ({result.diff.matched.length})
									</summary>
									<p className="text-sm">
										{result.diff.matched.join(", ") || "—"}
									</p>
								</details>
							</>
						) : null}
					</div>
				</Modal>
			) : null}
		</>
	);
}
