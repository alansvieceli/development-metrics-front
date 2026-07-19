import type { TeamAccess } from "@/application/team/contracts/team-access";
import type { Member } from "@/domain/team/entities/member";
import type { Team } from "@/domain/team/entities/team";

export type TeamRepository = TeamAccess & {
	create(name: string, wipLimit?: number): Promise<Team>;
	rename(teamId: string, name: string): Promise<Team>;
	setWipLimit(teamId: string, wipLimit: number): Promise<Team>;
	delete(teamId: string): Promise<void>;
	listAll(): Promise<Team[]>;
	findById(teamId: string): Promise<Team | null>;
	addMember(teamId: string, name: string): Promise<Member>;
	renameMember(memberId: string, name: string): Promise<Member>;
	removeMember(memberId: string): Promise<void>;
	listMembers(teamId: string): Promise<Member[]>;
};
