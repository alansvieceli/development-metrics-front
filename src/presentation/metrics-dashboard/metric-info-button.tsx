"use client";

import { Info } from "lucide-react";
import { useState } from "react";
import { Modal } from "@/presentation/shared/modal";
import { METRIC_DEFINITIONS, type MetricKey } from "./metric-definitions";

type Tab = "metrics" | "charts";

const TABS: { key: Tab; label: string }[] = [
	{ key: "metrics", label: "Métricas" },
	{ key: "charts", label: "Gráficos" },
];

const GROUPS: { tab: Tab; title: string; keys: MetricKey[] }[] = [
	{
		tab: "metrics",
		title: "Situação atual",
		keys: ["wip", "blocked", "inReview", "inTesting", "inPublication"],
	},
	{
		tab: "metrics",
		title: "Resultado da semana",
		keys: [
			"delivered",
			"predictability",
			"unplannedCount",
			"reworkCount",
			"bugsAssociated",
		],
	},
	{
		tab: "metrics",
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
		tab: "charts",
		title: "Gráficos",
		keys: [
			"throughputTrend",
			"plannedDeliveredTrend",
			"leadCycleTimeTrend",
			"flowComposition",
			"cycleTimeOutliers",
			"bugsOpenedTrend",
			"bugsRanking",
		],
	},
];

export function MetricInfoButton() {
	const [open, setOpen] = useState(false);
	const [tab, setTab] = useState<Tab>("metrics");

	return (
		<>
			<button
				type="button"
				aria-label="O que significa cada métrica"
				onClick={() => setOpen(true)}
				className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-(--border) opacity-70 transition-colors hover:bg-white/10 hover:opacity-100"
			>
				<Info size={16} aria-hidden="true" />
			</button>
			{open ? (
				<Modal label="Métricas" onClose={() => setOpen(false)} size="lg">
					<div className="flex flex-col gap-5">
						<div className="flex h-9 w-fit rounded-lg border border-(--border)">
							{TABS.map((item) => (
								<button
									key={item.key}
									type="button"
									onClick={() => setTab(item.key)}
									aria-pressed={tab === item.key}
									className={`cursor-pointer px-4 text-sm transition-colors ${
										tab === item.key
											? "bg-(--accent) text-(--accent-fg)"
											: "hover:bg-white/10"
									}`}
								>
									{item.label}
								</button>
							))}
						</div>
						{GROUPS.filter((group) => group.tab === tab).map((group) => (
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
												{tab === "charts" && definition.howToRead ? (
													<dd className="mt-1 text-sm opacity-50">
														{definition.howToRead}
													</dd>
												) : null}
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
