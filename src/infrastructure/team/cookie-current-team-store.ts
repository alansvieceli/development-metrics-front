import { cookies } from "next/headers";
import type { CurrentTeamStore } from "@/application/team/ports/current-team-store";

const COOKIE_NAME = "current-team-id";

export const cookieCurrentTeamStore: CurrentTeamStore = {
	async get() {
		const store = await cookies();
		return store.get(COOKIE_NAME)?.value ?? null;
	},
	async set(teamId) {
		const store = await cookies();
		store.set(COOKIE_NAME, teamId, { path: "/" });
	},
};
