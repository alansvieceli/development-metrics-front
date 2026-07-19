import { redirect } from "next/navigation";
import { createMetricsUseCases } from "@/composition/metrics";
import { createTeamUseCases } from "@/composition/team";
import { MetricsDashboard } from "@/presentation/metrics-dashboard/metrics-dashboard";
import { parseMetricsFilter } from "@/presentation/metrics-dashboard/parse-metrics-search-params";

export default async function MetricsPage({
	searchParams,
}: {
	searchParams: Promise<{ period?: string; date?: string }>;
}) {
	const teamUseCases = createTeamUseCases();
	const currentTeam = await teamUseCases.getCurrentTeam();
	if (!currentTeam) {
		redirect("/teams");
	}

	const resolvedSearchParams = await searchParams;
	const { periodType, referenceDate } =
		parseMetricsFilter(resolvedSearchParams);

	const metricsUseCases = createMetricsUseCases();
	const { current } = await metricsUseCases.getMetricsDashboard(
		currentTeam.id,
		periodType,
		referenceDate,
	);

	return (
		<MetricsDashboard
			periodType={periodType}
			referenceDate={referenceDate}
			current={current}
		/>
	);
}
