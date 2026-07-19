"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ActionState } from "@/application/shared/action-state";
import type { Team } from "@/domain/team/entities/team";

type TeamSwitcherProps = {
	currentTeam: Team;
	teams: Team[];
	selectTeamAction: (teamId: string) => Promise<ActionState>;
};

export function TeamSwitcher({
	currentTeam,
	teams,
	selectTeamAction,
}: TeamSwitcherProps) {
	const [open, setOpen] = useState(false);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const otherTeams = teams.filter((team) => team.id !== currentTeam.id);
	const containerRef = useRef<HTMLDivElement>(null);

	function close() {
		setOpen(false);
		setError(null);
	}

	useEffect(() => {
		if (!open) return;
		function handleClickOutside(event: MouseEvent) {
			if (!containerRef.current?.contains(event.target as Node)) {
				setOpen(false);
				setError(null);
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [open]);

	return (
		<div className="relative" ref={containerRef}>
			<button
				type="button"
				onClick={() => (open ? close() : setOpen(true))}
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
							disabled={pending}
							onClick={async () => {
								setPending(true);
								setError(null);
								try {
									const result = await selectTeamAction(team.id);
									if (result.error) setError(result.error);
								} catch {
									setError("Não foi possível concluir a operação");
								} finally {
									setPending(false);
								}
							}}
							className="rounded-lg px-2 py-1 text-left hover:bg-white/10"
						>
							{team.name}
						</button>
					))}
					{error ? <p role="alert">{error}</p> : null}
					{otherTeams.length > 0 ? <hr className="border-(--border)" /> : null}
					<Link
						href={`/teams/${currentTeam.id}`}
						onClick={close}
						className="rounded-lg px-2 py-1 hover:bg-white/10"
					>
						Gerenciar time atual
					</Link>
					<Link
						href="/teams"
						onClick={close}
						className="rounded-lg px-2 py-1 hover:bg-white/10"
					>
						+ Criar novo time
					</Link>
				</div>
			) : null}
		</div>
	);
}
