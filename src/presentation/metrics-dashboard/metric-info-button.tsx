"use client";

import { Info } from "lucide-react";
import { useState } from "react";
import { Modal } from "@/presentation/shared/modal";
import { METRIC_DEFINITIONS, type MetricKey } from "./metric-definitions";

const GROUPS: { title: string; keys: MetricKey[] }[] = [
	{
		title: "Situação atual",
		keys: ["wip", "blocked", "inReview", "inTesting", "inPublication"],
	},
	{
		title: "Resultado da semana",
		keys: ["delivered", "predictability", "unplannedCount", "reworkCount"],
	},
	{
		title: "Tempo do fluxo",
		keys: [
			"leadTime",
			"cycleTime",
			"codeReviewTime",
			"testingTime",
			"blockedTime",
			"awaitingPublicationTime",
		],
	},
	{
		title: "Gráficos",
		keys: [
			"throughputTrend",
			"plannedDeliveredTrend",
			"leadCycleTimeTrend",
			"flowComposition",
		],
	},
];

export function MetricInfoButton() {
	const [open, setOpen] = useState(false);

	return (
		<>
			<button
				type="button"
				aria-label="O que significa cada métrica"
				onClick={() => setOpen(true)}
				className="flex h-9 w-9 items-center justify-center rounded-lg border border-(--border) opacity-70 hover:opacity-100"
			>
				<Info size={16} aria-hidden="true" />
			</button>
			{open ? (
				<Modal label="Métricas" onClose={() => setOpen(false)} size="lg">
					<div className="flex flex-col gap-5">
						{GROUPS.map((group) => (
							<div key={group.title}>
								<p className="mb-2 text-xs font-semibold tracking-wide text-(--accent) uppercase">
									{group.title}
								</p>
								<dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
									{group.keys.map((key) => {
										const definition = METRIC_DEFINITIONS.find(
											(item) => item.key === key,
										);
										if (!definition) return null;
										return (
											<div key={key}>
												<dt className="text-sm font-semibold">
													{definition.label}
												</dt>
												<dd className="text-sm opacity-70">
													{definition.description}
												</dd>
											</div>
										);
									})}
								</dl>
							</div>
						))}
					</div>
				</Modal>
			) : null}
		</>
	);
}
