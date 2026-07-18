import { redirect } from "next/navigation";
import { createMetricsUseCases } from "@/composition/metrics";
import { createTeamUseCases } from "@/composition/team";
import { MetricsDashboard } from "@/presentation/metrics-dashboard/metrics-dashboard";
import { parseMetricsFilter } from "@/presentation/metrics-dashboard/parse-metrics-search-params";

const WEEKLY_SERIES_LENGTH = 8;
const MONTHLY_SERIES_LENGTH = 6;

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
	const [current, weeklySeries, monthlySeries] = await Promise.all([
		metricsUseCases.getMetricsForPeriod(
			currentTeam.id,
			periodType,
			referenceDate,
		),
		metricsUseCases.getMetricsSeries(
			currentTeam.id,
			"WEEK",
			referenceDate,
			WEEKLY_SERIES_LENGTH,
		),
		metricsUseCases.getMetricsSeries(
			currentTeam.id,
			"MONTH",
			referenceDate,
			MONTHLY_SERIES_LENGTH,
		),
	]);

	return (
		<MetricsDashboard
			periodType={periodType}
			referenceDate={referenceDate}
			current={current}
			weeklySeries={weeklySeries}
			monthlySeries={monthlySeries}
		/>
	);
}
