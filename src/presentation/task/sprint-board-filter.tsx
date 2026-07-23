"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Sprint } from "@/domain/sprint/entities/sprint";

type SprintBoardFilterProps = {
	sprints: Sprint[];
};

export function SprintBoardFilter({ sprints }: SprintBoardFilterProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const selectedSprintId = searchParams.get("sprintId");

	function goToCurrent() {
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

	if (sprints.length === 0) return null;

	return (
		<div className="flex items-center gap-2">
			<div className="flex h-9 shrink-0 rounded-lg border border-(--border)">
				<button
					type="button"
					onClick={goToCurrent}
					aria-pressed={selectedSprintId === null}
					className={`cursor-pointer px-4 text-sm transition-colors ${
						selectedSprintId === null
							? "bg-(--accent) text-(--accent-fg)"
							: "hover:bg-white/10"
					}`}
				>
					Atual
				</button>
				<button
					type="button"
					onClick={() => goToSprint(selectedSprintId ?? sprints[0].id)}
					aria-pressed={selectedSprintId !== null}
					className={`cursor-pointer px-4 text-sm transition-colors ${
						selectedSprintId !== null
							? "bg-(--accent) text-(--accent-fg)"
							: "hover:bg-white/10"
					}`}
				>
					Por sprint
				</button>
			</div>
			{selectedSprintId !== null ? (
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
			) : null}
		</div>
	);
}
