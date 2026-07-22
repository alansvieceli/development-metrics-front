import type {
	MetricsPeriodPreference,
	MetricsPeriodPreferenceStore,
} from "@/application/metrics/ports/metrics-period-preference-store";

export function getMetricsPeriodPreference(
	store: MetricsPeriodPreferenceStore,
	teamId: string,
): Promise<MetricsPeriodPreference | null> {
	return store.get(teamId);
}

export function setMetricsPeriodPreference(
	store: MetricsPeriodPreferenceStore,
	teamId: string,
	preference: MetricsPeriodPreference,
): Promise<void> {
	return store.set(teamId, preference);
}
