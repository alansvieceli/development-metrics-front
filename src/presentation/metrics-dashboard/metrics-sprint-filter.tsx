"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import type { Sprint } from "@/domain/sprint/entities/sprint";

type MetricsSprintFilterProps = {
	sprints: Sprint[];
	periodFilter: ReactNode;
};

function defaultSprintId(sprints: Sprint[]): string {
	const active = sprints.find((sprint) => sprint.status === "ACTIVE");
	if (active) return active.id;
	return [...sprints].sort((a, b) => b.startDate.localeCompare(a.startDate))[0]
		.id;
}

export function MetricsSprintFilter({
	sprints,
	periodFilter,
}: MetricsSprintFilterProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const selectedSprintId = searchParams.get("sprintId");

	if (sprints.length === 0) return <>{periodFilter}</>;

	function goToPeriod() {
		const params = new URLSearchParams(searchParams.toString());
		params.delete("sprintId");
		const query = params.toString();
		router.push(query ? `${pathname}?${query}` : pathname);
	}

	function goToSprint(sprintId: string) {
		const params = new URLSearchParams(searchParams.toString());
		params.set("sprintId", sprintId);
		router.push(`${pathname}?${params.toString()}`);
	}

	return (
		<div className="flex items-center gap-2">
			<div className="flex h-9 shrink-0 rounded-lg border border-(--border)">
				<button
					type="button"
					onClick={goToPeriod}
					aria-pressed={selectedSprintId === null}
					className={`cursor-pointer px-4 text-sm transition-colors ${
						selectedSprintId === null
							? "bg-(--accent) text-(--accent-fg)"
							: "hover:bg-white/10"
					}`}
				>
					Período
				</button>
				<button
					type="button"
					onClick={() =>
						goToSprint(selectedSprintId ?? defaultSprintId(sprints))
					}
					aria-pressed={selectedSprintId !== null}
					className={`cursor-pointer px-4 text-sm transition-colors ${
						selectedSprintId !== null
							? "bg-(--accent) text-(--accent-fg)"
							: "hover:bg-white/10"
					}`}
				>
					Sprint
				</button>
			</div>
			{selectedSprintId === null ? (
				periodFilter
			) : (
				<select
					value={selectedSprintId}
					onChange={(event) => goToSprint(event.target.value)}
					className="h-9 rounded-lg border border-(--border) px-2 text-sm"
				>
					{sprints.map((sprint) => (
						<option key={sprint.id} value={sprint.id}>
							{sprint.name}
						</option>
					))}
				</select>
			)}
		</div>
	);
}
