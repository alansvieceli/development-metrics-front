"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { selectTeamAction } from "@/app/actions";
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
				className="flex items-center gap-1 rounded-lg border border-white/20 px-3 py-1 text-(--header-fg)"
			>
				{currentTeam.name}
				<ChevronDown size={14} aria-hidden="true" />
			</button>
			{open ? (
				<div className="absolute right-0 z-10 mt-2 flex w-48 flex-col gap-1 rounded-lg border border-(--border) bg-(--background) p-2 text-(--foreground) shadow-xl">
					{otherTeams.map((team) => (
						<button
							key={team.id}
							type="button"
							onClick={() => {
								setOpen(false);
								selectTeamAction(team.id);
							}}
							className="rounded-lg px-2 py-1 text-left hover:bg-black/5"
						>
							{team.name}
						</button>
					))}
					{otherTeams.length > 0 ? <hr className="border-(--border)" /> : null}
					<Link
						href={`/teams/${currentTeam.id}`}
						onClick={() => setOpen(false)}
						className="rounded-lg px-2 py-1 hover:bg-black/5"
					>
						Gerenciar time atual
					</Link>
					<Link
						href="/teams"
						onClick={() => setOpen(false)}
						className="rounded-lg px-2 py-1 hover:bg-black/5"
					>
						+ Criar novo time
					</Link>
				</div>
			) : null}
		</div>
	);
}
