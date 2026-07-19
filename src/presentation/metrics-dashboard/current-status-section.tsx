import type { WipBreakdown } from "@/application/metrics/ports/metrics-query-port";
import { StatTile } from "./stat-tile";

type CurrentStatusSectionProps = {
	wip: WipBreakdown;
};

export function CurrentStatusSection({ wip }: CurrentStatusSectionProps) {
	return (
		<section className="flex flex-col gap-3">
			<h2 className="text-sm font-semibold opacity-70">Situação atual</h2>
			<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
				<StatTile metricKey="wip" value={String(wip.total)} />
				<StatTile metricKey="blocked" value={String(wip.blocked)} />
				<StatTile metricKey="inReview" value={String(wip.inReview)} />
				<StatTile metricKey="inTesting" value={String(wip.inTesting)} />
				<StatTile metricKey="inPublication" value={String(wip.inPublication)} />
			</div>
		</section>
	);
}
