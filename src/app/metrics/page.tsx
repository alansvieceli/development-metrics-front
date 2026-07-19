import { redirect } from "next/navigation";
import { createMetricsUseCases } from "@/composition/metrics";
import { createTeamUseCases } from "@/composition/team";
import { MetricsDashboard } from "@/presentation/metrics-dashboard/metrics-dashboard";
import {
	type MetricsSearchParams,
	parseMetricsFilter,
} from "@/presentation/metrics-dashboard/parse-metrics-search-params";

export default async function MetricsPage({
	searchParams,
}: {
	searchParams: Promise<MetricsSearchParams>;
}) {
	const teamUseCases = createTeamUseCases();
	const currentTeam = await teamUseCases.getCurrentTeam();
	if (!currentTeam) {
		redirect("/teams");
	}

	const resolvedSearchParams = await searchParams;
	const filter = parseMetricsFilter(resolvedSearchParams);

	const metricsUseCases = createMetricsUseCases();
	const { current, history } =
		filter.periodType === "SPRINT"
			? await metricsUseCases.getMetricsDashboardForRange(
					currentTeam.id,
					filter.start,
					filter.end,
					currentTeam.wipLimit,
				)
			: await metricsUseCases.getMetricsDashboard(
					currentTeam.id,
					filter.periodType,
					filter.referenceDate,
					currentTeam.wipLimit,
				);

	return (
		<MetricsDashboard
			periodType={filter.periodType}
			referenceDate={filter.referenceDate}
			current={current}
			history={history}
		/>
	);
}
