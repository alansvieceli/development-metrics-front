"use client";

import { Info } from "lucide-react";
import { useState } from "react";
import { Modal } from "@/presentation/shared/modal";
import { METRIC_DEFINITIONS } from "./metric-definitions";

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
				<Modal
					label="O que significa cada métrica"
					onClose={() => setOpen(false)}
				>
					<h2 className="mb-4 text-lg font-semibold">Métricas</h2>
					<dl className="flex flex-col gap-3">
						{METRIC_DEFINITIONS.map((definition) => (
							<div key={definition.key}>
								<dt className="text-sm font-semibold">{definition.label}</dt>
								<dd className="text-sm opacity-70">{definition.description}</dd>
							</div>
						))}
					</dl>
				</Modal>
			) : null}
		</>
	);
}
