import { redirect } from "next/navigation";
import { saveMetricsPeriodPreferenceAction } from "@/app/actions";
import { createMetricsUseCases } from "@/composition/metrics";
import { createSprintUseCases } from "@/composition/sprint";
import { createTaskUseCases } from "@/composition/task";
import { createTeamUseCases } from "@/composition/team";
import { MetricsDashboard } from "@/presentation/metrics-dashboard/metrics-dashboard";
import {
	type MetricsSearchParams,
	parseMetricsFilter,
	parseTagIds,
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
	const sprints = await createSprintUseCases().listSprintsByTeam(
		currentTeam.id,
	);
	const tags = await createTaskUseCases().listTags();
	const resolvedSearchParams = await searchParams;

	const selectedSprint = resolvedSearchParams.sprintId
		? sprints.find((sprint) => sprint.id === resolvedSearchParams.sprintId)
		: undefined;

	if (selectedSprint) {
		const { current, history } = await metricsUseCases.getMetricsForSprint(
			selectedSprint.id,
			currentTeam.id,
			currentTeam.wipLimit,
		);
		return (
			<MetricsDashboard
				teamId={currentTeam.id}
				saveMetricsPeriodPreferenceAction={saveMetricsPeriodPreferenceAction}
				periodType="CUSTOM"
				referenceDate={current.periodStart}
				current={current}
				history={history}
				tags={tags}
				selectedTagIds={[]}
				sprints={sprints}
			/>
		);
	}

	const preference = await metricsUseCases.getMetricsPeriodPreference(
		currentTeam.id,
	);
	const filter = parseMetricsFilter(
		resolvedSearchParams,
		undefined,
		preference,
	);
	const tagIds = parseTagIds(resolvedSearchParams);

	const { current, history } =
		filter.periodType === "CUSTOM"
			? await metricsUseCases.getMetricsDashboardForRange(
					currentTeam.id,
					filter.start,
					filter.end,
					currentTeam.wipLimit,
					tagIds,
				)
			: await metricsUseCases.getMetricsDashboard(
					currentTeam.id,
					filter.periodType,
					filter.referenceDate,
					currentTeam.wipLimit,
					tagIds,
				);

	return (
		<MetricsDashboard
			teamId={currentTeam.id}
			saveMetricsPeriodPreferenceAction={saveMetricsPeriodPreferenceAction}
			periodType={filter.periodType}
			referenceDate={filter.referenceDate}
			current={current}
			history={history}
			tags={tags}
			selectedTagIds={tagIds}
			sprints={sprints}
		/>
	);
}
