import type { TasksByStatus } from "@/application/task/use-cases/list-tasks-by-team";
import type { Member } from "@/domain/team/entities/member";

type BoardSummaryProps = {
	tasksByStatus: TasksByStatus;
	members: Member[];
};

export function BoardSummary({ tasksByStatus, members }: BoardSummaryProps) {
	const allTasks = Object.values(tasksByStatus).flat();
	const activeTasks = allTasks.filter((task) => task.status !== "DONE");
	const blockedCount = allTasks.filter((task) => task.blocked).length;

	const countByAssignee = new Map<string, number>();
	let unassignedCount = 0;
	for (const task of activeTasks) {
		if (task.assigneeId) {
			countByAssignee.set(
				task.assigneeId,
				(countByAssignee.get(task.assigneeId) ?? 0) + 1,
			);
		} else {
			unassignedCount += 1;
		}
	}

	const assigneeChips = members
		.filter((member) => (countByAssignee.get(member.id) ?? 0) > 0)
		.map((member) => `${member.name}: ${countByAssignee.get(member.id)}`);
	if (unassignedCount > 0) {
		assigneeChips.push(`Sem responsável: ${unassignedCount}`);
	}

	if (assigneeChips.length === 0 && blockedCount === 0) {
		return null;
	}

	return (
		<div className="flex flex-wrap gap-2 text-xs">
			{assigneeChips.map((chip) => (
				<span
					key={chip}
					className="rounded-full border border-(--border) px-3 py-1"
				>
					{chip}
				</span>
			))}
			{blockedCount > 0 ? (
				<span className="rounded-full border border-(--critical) px-3 py-1 text-(--critical)">
					⛔ {blockedCount} bloqueados
				</span>
			) : null}
		</div>
	);
}
