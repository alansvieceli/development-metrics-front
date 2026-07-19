import type { BugRankingEntry } from "@/application/metrics/formulas/bug-metrics";
import { ChartCard } from "./chart-card";

type BugsRankingListProps = {
	ranking: BugRankingEntry[];
};

export function BugsRankingList({ ranking }: BugsRankingListProps) {
	return (
		<ChartCard metricKey="bugsRanking">
			{ranking.length === 0 ? (
				<p className="text-sm opacity-70">sem dados</p>
			) : (
				<ol className="flex flex-col gap-2 text-sm">
					{ranking.map((entry) => (
						<li
							key={entry.taskId}
							className="rounded-lg border border-(--border) px-3 py-2"
						>
							#{entry.externalId} — {entry.bugCount} bugs
						</li>
					))}
				</ol>
			)}
		</ChartCard>
	);
}
