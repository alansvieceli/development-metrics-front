export type CurrentTeamStore = {
	get(): Promise<string | null>;
	set(teamId: string): Promise<void>;
};
