"use client";

import {
	AlertTriangle,
	CheckCircle2,
	CircleHelp,
	CircleX,
	RefreshCw,
} from "lucide-react";
import { useState } from "react";
import type { CheckCardSyncActionResult } from "@/app/board/businessmap-sync-actions";
import type { TaskStatus } from "@/domain/task/entities/task";
import { STATUS_LABELS } from "@/presentation/task/task-status-labels";

type CardSyncBadgeProps = {
	externalId: string;
	status: TaskStatus;
	checkCardSyncAction: (
		externalId: string,
		localStatus: TaskStatus,
	) => Promise<CheckCardSyncActionResult>;
};

export function CardSyncBadge({
	externalId,
	status,
	checkCardSyncAction,
}: CardSyncBadgeProps) {
	const [pending, setPending] = useState(false);
	const [result, setResult] = useState<CheckCardSyncActionResult | null>(null);

	async function handleCheck() {
		setPending(true);
		try {
			const response = await checkCardSyncAction(externalId, status);
			setResult(response);
		} finally {
			setPending(false);
		}
	}

	if (pending) {
		return (
			<RefreshCw
				size={14}
				className="animate-spin opacity-50"
				aria-label="Verificando Businessmap..."
			/>
		);
	}

	let icon = <RefreshCw size={14} aria-hidden="true" />;
	let title = "Verificar Businessmap";

	if (result) {
		if (!result.sync) {
			icon = (
				<CircleX size={14} className="text-(--critical)" aria-hidden="true" />
			);
			title = result.error;
		} else {
			const { sync } = result;
			if (!sync.found) {
				icon = (
					<CircleX size={14} className="text-(--critical)" aria-hidden="true" />
				);
				title = "Card não encontrado no Businessmap";
			} else if (sync.businessmapStatus === null) {
				icon = (
					<CircleHelp size={14} className="opacity-50" aria-hidden="true" />
				);
				title = `Businessmap: "${sync.businessmapColumnLabel}" (coluna não mapeada)`;
			} else if (sync.inSync) {
				icon = (
					<CheckCircle2
						size={14}
						className="text-(--accent)"
						aria-hidden="true"
					/>
				);
				title = "Em sincronia com o Businessmap";
			} else {
				icon = (
					<AlertTriangle
						size={14}
						className="text-(--warn)"
						aria-hidden="true"
					/>
				);
				title = `Businessmap: "${sync.businessmapColumnLabel}" → ${STATUS_LABELS[sync.businessmapStatus]}`;
			}
		}
	}

	return (
		<button
			type="button"
			onClick={handleCheck}
			title={title}
			aria-label={title}
			className="rounded-lg border border-(--border) p-1.5"
		>
			{icon}
		</button>
	);
}
