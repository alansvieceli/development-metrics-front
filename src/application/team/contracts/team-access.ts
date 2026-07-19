export type TeamAccess = {
	teamExists(teamId: string): Promise<boolean>;
	memberBelongsToTeam(memberId: string, teamId: string): Promise<boolean>;
};
