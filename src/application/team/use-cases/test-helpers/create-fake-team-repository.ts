import type { TeamRepository } from "@/application/team/ports/team-repository";
import type { Member } from "@/domain/team/entities/member";
import type { Team } from "@/domain/team/entities/team";
import { DEFAULT_WIP_LIMIT } from "@/domain/team/entities/team";

export function createFakeTeamRepository(): TeamRepository {
	let teams: Team[] = [];
	let members: Member[] = [];
	let nextId = 1;

	return {
		async teamExists(teamId) {
			return teams.some((team) => team.id === teamId);
		},
		async memberBelongsToTeam(memberId, teamId) {
			return members.some(
				(member) => member.id === memberId && member.teamId === teamId,
			);
		},
		async create(name, wipLimit = DEFAULT_WIP_LIMIT) {
			const team: Team = { id: `team-${nextId++}`, name, wipLimit };
			teams.push(team);
			return team;
		},
		async rename(teamId, name) {
			const team = teams.find((t) => t.id === teamId);
			if (!team) {
				throw new Error("Time não encontrado");
			}
			team.name = name;
			return team;
		},
		async setWipLimit(teamId, wipLimit) {
			const team = teams.find((item) => item.id === teamId);
			if (!team) {
				throw new Error("Time não encontrado");
			}
			team.wipLimit = wipLimit;
			return team;
		},
		async delete(teamId) {
			teams = teams.filter((t) => t.id !== teamId);
			members = members.filter((m) => m.teamId !== teamId);
		},
		async listAll() {
			return teams;
		},
		async findById(teamId) {
			return teams.find((t) => t.id === teamId) ?? null;
		},
		async addMember(teamId, name) {
			const member: Member = { id: `member-${nextId++}`, name, teamId };
			members.push(member);
			return member;
		},
		async renameMember(memberId, name) {
			const member = members.find((m) => m.id === memberId);
			if (!member) {
				throw new Error("Membro não encontrado");
			}
			member.name = name;
			return member;
		},
		async removeMember(memberId) {
			members = members.filter((m) => m.id !== memberId);
		},
		async listMembers(teamId) {
			return members.filter((m) => m.teamId === teamId);
		},
	};
}
