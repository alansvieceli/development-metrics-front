import { and, eq } from "drizzle-orm";
import type { TeamRepository } from "@/application/team/ports/team-repository";
import type { Member } from "@/domain/team/entities/member";
import type { Team } from "@/domain/team/entities/team";
import { db } from "@/infrastructure/db/client";
import { members, teams } from "./drizzle/schema";

export const drizzleTeamRepository: TeamRepository = {
	async teamExists(teamId) {
		const [team] = await db
			.select({ id: teams.id })
			.from(teams)
			.where(eq(teams.id, teamId))
			.limit(1);
		return Boolean(team);
	},
	async memberBelongsToTeam(memberId, teamId) {
		const [member] = await db
			.select({ id: members.id })
			.from(members)
			.where(and(eq(members.id, memberId), eq(members.teamId, teamId)))
			.limit(1);
		return Boolean(member);
	},
	async create(name, wipLimit) {
		const [team] = await db
			.insert(teams)
			.values({ name, wipLimit })
			.returning();
		return team as Team;
	},
	async setWipLimit(teamId, wipLimit) {
		const [team] = await db
			.update(teams)
			.set({ wipLimit })
			.where(eq(teams.id, teamId))
			.returning();
		if (!team) {
			throw new Error("Time não encontrado");
		}
		return team as Team;
	},
	async setCompletedTaskLimit(teamId, completedTaskLimit) {
		const [team] = await db
			.update(teams)
			.set({ completedTaskLimit })
			.where(eq(teams.id, teamId))
			.returning();
		if (!team) {
			throw new Error("Time não encontrado");
		}
		return team as Team;
	},
	async setBusinessmapBoardId(teamId, businessmapBoardId) {
		const [team] = await db
			.update(teams)
			.set({ businessmapBoardId })
			.where(eq(teams.id, teamId))
			.returning();
		if (!team) {
			throw new Error("Time não encontrado");
		}
		return team as Team;
	},
	async rename(teamId, name) {
		const [team] = await db
			.update(teams)
			.set({ name })
			.where(eq(teams.id, teamId))
			.returning();
		if (!team) {
			throw new Error("Time não encontrado");
		}
		return team as Team;
	},
	async delete(teamId) {
		await db.delete(teams).where(eq(teams.id, teamId));
	},
	async listAll() {
		return db.select().from(teams);
	},
	async findById(teamId) {
		const [team] = await db.select().from(teams).where(eq(teams.id, teamId));
		return (team as Team) ?? null;
	},
	async addMember(teamId, name) {
		const [member] = await db
			.insert(members)
			.values({ name, teamId })
			.returning();
		return member as Member;
	},
	async renameMember(memberId, name) {
		const [member] = await db
			.update(members)
			.set({ name })
			.where(eq(members.id, memberId))
			.returning();
		if (!member) {
			throw new Error("Membro não encontrado");
		}
		return member as Member;
	},
	async removeMember(memberId) {
		await db.delete(members).where(eq(members.id, memberId));
	},
	async listMembers(teamId) {
		return db.select().from(members).where(eq(members.teamId, teamId));
	},
};
