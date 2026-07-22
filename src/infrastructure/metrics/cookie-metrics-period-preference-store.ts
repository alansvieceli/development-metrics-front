import { cookies } from "next/headers";
import type {
	MetricsPeriodPreference,
	MetricsPeriodPreferenceStore,
} from "@/application/metrics/ports/metrics-period-preference-store";

const COOKIE_NAME = "metrics-period-pref";

type PreferenceMap = Record<string, MetricsPeriodPreference>;

function parsePreferenceMap(raw: string | undefined): PreferenceMap {
	if (!raw) return {};
	try {
		const parsed = JSON.parse(raw);
		return parsed && typeof parsed === "object" ? parsed : {};
	} catch {
		return {};
	}
}

export const cookieMetricsPeriodPreferenceStore: MetricsPeriodPreferenceStore =
	{
		async get(teamId) {
			const store = await cookies();
			const map = parsePreferenceMap(store.get(COOKIE_NAME)?.value);
			return map[teamId] ?? null;
		},
		async set(teamId, preference) {
			const store = await cookies();
			const map = parsePreferenceMap(store.get(COOKIE_NAME)?.value);
			map[teamId] = preference;
			store.set(COOKIE_NAME, JSON.stringify(map), { path: "/" });
		},
	};
