export const SPRINT_STATUSES = ["PLANNED", "ACTIVE", "CLOSED"] as const;
export type SprintStatus = (typeof SPRINT_STATUSES)[number];
export const isSprintStatus = (value: unknown): value is SprintStatus =>
	typeof value === "string" && SPRINT_STATUSES.includes(value as SprintStatus);

export type Sprint = {
	id: string;
	piId: string;
	teamId: string;
	name: string;
	startDate: string;
	endDate: string;
	status: SprintStatus;
};
