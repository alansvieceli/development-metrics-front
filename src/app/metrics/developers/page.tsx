import Link from "next/link";
import { redirect } from "next/navigation";
import { saveMetricsPeriodPreferenceAction } from "@/app/actions";
import {
	getPeriodRange,
	getPreviousPeriods,
} from "@/application/metrics/period";
import { createMetricsUseCases } from "@/composition/metrics";
import { createTeamUseCases } from "@/composition/team";
import { DeveloperMetricsDashboard } from "@/presentation/developer-metrics/developer-metrics-dashboard";
import {
	type MetricsSearchParams,
	parseMetricsFilter,
} from "@/presentation/metrics-dashboard/parse-metrics-search-params";

export default async function DeveloperMetricsPage({
	searchParams,
}: {
	searchParams: Promise<MetricsSearchParams>;
}) {
	const teamUseCases = createTeamUseCases();
	const currentTeam = await teamUseCases.getCurrentTeam();
	if (!currentTeam) redirect("/teams");

	const teamDetails = await teamUseCases.getTeam(currentTeam.id);
	const members = teamDetails?.members ?? [];
	if (members.length === 0) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
				<h1 className="text-2xl font-semibold">
					Nenhum desenvolvedor cadastrado
				</h1>
				<p className="text-(--foreground-muted)">
					Adicione um membro ao time para consultar as métricas individuais.
				</p>
				<Link
					href={`/teams/${currentTeam.id}`}
					className="rounded-lg bg-(--accent) px-4 py-2 text-(--accent-fg)"
				>
					Gerenciar time
				</Link>
			</div>
		);
	}

	const resolvedSearchParams = await searchParams;
	const selectedMember = members.find(
		(member) => member.id === resolvedSearchParams.developer,
	);
	if (!selectedMember) {
		const params = new URLSearchParams();
		for (const [key, value] of Object.entries(resolvedSearchParams)) {
			if (typeof value === "string") params.set(key, value);
		}
		params.set("developer", members[0].id);
		redirect(`/metrics/developers?${params.toString()}`);
	}

	const metricsUseCases = createMetricsUseCases();
	const preference = await metricsUseCases.getMetricsPeriodPreference(
		currentTeam.id,
	);
	const filter = parseMetricsFilter(
		resolvedSearchParams,
		undefined,
		preference,
	);
	const range =
		filter.periodType === "CUSTOM"
			? { start: filter.start, end: filter.end }
			: getPeriodRange(filter.periodType, filter.referenceDate);
	const previousStart =
		filter.periodType === "CUSTOM"
			? new Date(
					range.start.getTime() - (range.end.getTime() - range.start.getTime()),
				)
			: getPreviousPeriods(filter.periodType, filter.referenceDate, 2)[0].start;
	const metrics = await metricsUseCases.getDeveloperMetrics(
		currentTeam.id,
		selectedMember.id,
		previousStart,
		range.start,
		range.end,
	);

	return (
		<DeveloperMetricsDashboard
			teamId={currentTeam.id}
			saveMetricsPeriodPreferenceAction={saveMetricsPeriodPreferenceAction}
			periodType={filter.periodType}
			referenceDate={filter.referenceDate}
			members={members}
			selectedMember={selectedMember}
			{...metrics}
		/>
	);
}
