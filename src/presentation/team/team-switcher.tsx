"use client";

import Link from "next/link";
import { useState } from "react";
import { selectTeamAction } from "@/app/(main)/actions";
import type { Team } from "@/domain/team/entities/team";

type TeamSwitcherProps = {
	currentTeam: Team;
	teams: Team[];
};

export function TeamSwitcher({ currentTeam, teams }: TeamSwitcherProps) {
	const [open, setOpen] = useState(false);
	const otherTeams = teams.filter((team) => team.id !== currentTeam.id);

	return (
		<div className="relative">
			<button
				type="button"
				onClick={() => setOpen((value) => !value)}
				className="rounded border px-3 py-1"
			>
				{currentTeam.name} ▾
			</button>
			{open ? (
				<div className="absolute right-0 z-10 mt-2 flex w-48 flex-col gap-1 rounded border bg-[var(--background)] p-2 shadow">
					{otherTeams.map((team) => (
						<button
							key={team.id}
							type="button"
							onClick={() => selectTeamAction(team.id)}
							className="rounded px-2 py-1 text-left hover:bg-black/5"
						>
							{team.name}
						</button>
					))}
					{otherTeams.length > 0 ? <hr /> : null}
					<Link
						href={`/teams/${currentTeam.id}`}
						className="rounded px-2 py-1 hover:bg-black/5"
					>
						Gerenciar time atual
					</Link>
					<Link href="/teams" className="rounded px-2 py-1 hover:bg-black/5">
						+ Criar novo time
					</Link>
				</div>
			) : null}
		</div>
	);
}
