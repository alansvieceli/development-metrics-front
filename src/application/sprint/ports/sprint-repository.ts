import type { Sprint } from "@/domain/sprint/entities/sprint";

export type CreateSprintData = {
	piId: string;
	teamId: string;
	name: string;
	startDate: string;
	endDate: string;
};

export type SprintRepository = {
	create(data: CreateSprintData): Promise<Sprint>;
	listByPi(piId: string): Promise<Sprint[]>;
	listByTeam(teamId: string): Promise<Sprint[]>;
	findById(id: string): Promise<Sprint | null>;
};
