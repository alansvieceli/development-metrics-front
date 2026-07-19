import { ArrowUp } from "lucide-react";
import type { CurrentWipMetrics } from "@/application/metrics/formulas/current-wip-metrics";
import { formatAge } from "./format-metric-value";
import { StatTile } from "./stat-tile";

type CurrentStatusSectionProps = {
	wip: CurrentWipMetrics;
};

function ageDetail(prefix: string, age: number | null) {
	return age === null
		? "Nenhum card nesta etapa"
		: `${prefix}${prefix === "Há" ? " " : ": "}${formatAge(age)}`;
}

function wipLimitDetail(total: number, limit: number) {
	if (total === limit) {
		return "No limite";
	}
	return `${Math.abs(total - limit)} ${total > limit ? "acima" : "abaixo"} do limite`;
}

export function CurrentStatusSection({ wip }: CurrentStatusSectionProps) {
	return (
		<section className="flex flex-col gap-4 rounded-2xl border border-(--border) bg-(--surface) p-4 shadow-[inset_0_3px_0_var(--accent)] sm:p-5">
			<div>
				<p className="mb-1 font-mono text-xs font-semibold tracking-[0.16em] text-(--accent) uppercase">
					Agora
				</p>
				<h2 className="text-lg font-semibold">Situação atual</h2>
			</div>
			<div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-6">
				<div className="col-span-2">
					<StatTile
						metricKey="wip"
						value={
							<>
								{wip.total}
								<span className="text-lg text-(--foreground-muted)">
									/{wip.limit}
								</span>
							</>
						}
						detail={wipLimitDetail(wip.total, wip.limit)}
						detailIcon={ArrowUp}
						featured
					/>
				</div>
				<div className="sm:col-span-2">
					<StatTile
						metricKey="blocked"
						value={String(wip.blocked)}
						detail={ageDetail("Mais antigo", wip.oldestBlockedAgeMs)}
					/>
				</div>
				<div className="sm:col-span-2">
					<StatTile
						metricKey="inReview"
						value={String(wip.inReview)}
						detail={ageDetail("Média", wip.averageReviewAgeMs)}
					/>
				</div>
				<div className="sm:col-span-3">
					<StatTile
						metricKey="inTesting"
						value={String(wip.inTesting)}
						detail={ageDetail(
							wip.inTesting === 1 ? "Há" : "Mais antigo",
							wip.oldestTestingAgeMs,
						)}
					/>
				</div>
				<div className="sm:col-span-3">
					<StatTile
						metricKey="inPublication"
						value={String(wip.inPublication)}
						detail={ageDetail("Mais antigo", wip.oldestPublicationAgeMs)}
					/>
				</div>
			</div>
		</section>
	);
}
