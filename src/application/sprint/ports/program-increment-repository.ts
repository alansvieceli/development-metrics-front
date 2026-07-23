import type { ProgramIncrement } from "@/domain/sprint/entities/program-increment";

export type CreateProgramIncrementData = {
	teamId: string;
	name: string;
	startDate: string;
	endDate: string;
};

export type ProgramIncrementRepository = {
	create(data: CreateProgramIncrementData): Promise<ProgramIncrement>;
	listByTeam(teamId: string): Promise<ProgramIncrement[]>;
	findById(id: string): Promise<ProgramIncrement | null>;
};
