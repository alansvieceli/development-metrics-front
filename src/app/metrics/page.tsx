import { redirect } from "next/navigation";
import { saveMetricsPeriodPreferenceAction } from "@/app/actions";
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

	const metricsUseCases = createMetricsUseCases();
	const preference = await metricsUseCases.getMetricsPeriodPreference(
		currentTeam.id,
	);
	const resolvedSearchParams = await searchParams;
	const filter = parseMetricsFilter(
		resolvedSearchParams,
		undefined,
		preference,
	);

	const { current, history } =
		filter.periodType === "CUSTOM"
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
			teamId={currentTeam.id}
			saveMetricsPeriodPreferenceAction={saveMetricsPeriodPreferenceAction}
			periodType={filter.periodType}
			referenceDate={filter.referenceDate}
			current={current}
			history={history}
		/>
	);
}
