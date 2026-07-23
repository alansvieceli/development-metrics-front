import type { Sprint } from "@/domain/sprint/entities/sprint";
import type { SprintTaskSnapshot } from "@/domain/sprint/entities/sprint-task-snapshot";
import { SprintBoardFilter } from "@/presentation/task/sprint-board-filter";
import {
	STATUS_LABELS,
	STATUS_ORDER,
} from "@/presentation/task/task-status-labels";

type SprintHistoryBoardProps = {
	sprint: Sprint;
	snapshots: SprintTaskSnapshot[];
	sprints: Sprint[];
};

export function SprintHistoryBoard({
	sprint,
	snapshots,
	sprints,
}: SprintHistoryBoardProps) {
	return (
		<div className="flex flex-1 flex-col gap-4 p-6">
			<div className="flex items-center justify-between">
				<div className="flex flex-col gap-1">
					<h1 className="text-xl font-semibold">
						{sprint.name} <span className="text-sm opacity-60">(fechada)</span>
					</h1>
					<p className="text-sm opacity-70">
						{sprint.startDate} até {sprint.endDate}
					</p>
				</div>
				<SprintBoardFilter sprints={sprints} />
			</div>
			<hr className="border-(--border)" />
			<div className="flex flex-1 gap-2 overflow-x-auto md:gap-4">
				{STATUS_ORDER.map((status, index) => {
					const columnSnapshots = snapshots.filter(
						(snapshot) => snapshot.statusAtFreeze === status,
					);
					return (
						<div
							key={status}
							className={`flex min-w-0 flex-1 flex-col gap-3 p-2 ${
								index > 0 ? "border-l border-(--border)" : ""
							}`}
						>
							<h2 className="text-sm font-semibold text-balance opacity-70">
								{STATUS_LABELS[status]} ({columnSnapshots.length})
							</h2>
							{columnSnapshots.map((snapshot) => (
								<div
									key={snapshot.id}
									className="flex flex-col gap-2 rounded-lg border border-(--border) bg-(--surface) p-3 shadow-sm opacity-90"
								>
									<span className="font-mono text-xs opacity-70">
										{snapshot.externalId}
									</span>
									<p className="text-sm">{snapshot.description}</p>
									{snapshot.carriedOver ? (
										<p className="text-xs font-semibold text-(--warn)">
											Transbordou para a próxima sprint
										</p>
									) : null}
								</div>
							))}
						</div>
					);
				})}
			</div>
		</div>
	);
}
