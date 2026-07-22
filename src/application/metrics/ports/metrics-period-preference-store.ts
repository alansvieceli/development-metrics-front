export type MetricsPeriodPreference =
	| { period: "week" | "fortnight" | "month" }
	| { period: "custom"; start: string; end: string };

export type MetricsPeriodPreferenceStore = {
	get(teamId: string): Promise<MetricsPeriodPreference | null>;
	set(teamId: string, preference: MetricsPeriodPreference): Promise<void>;
};
