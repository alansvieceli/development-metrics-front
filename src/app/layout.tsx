import type { Metadata } from "next";
import type { ReactNode } from "react";
import { selectTeamAction } from "@/app/actions";
import { createTeamUseCases } from "@/composition/team";
import { Footer } from "@/presentation/shared/footer";
import { HeaderNav } from "@/presentation/shared/header-nav";
import { RootShell } from "@/presentation/shared/root-shell";
import { TeamSwitcher } from "@/presentation/team/team-switcher";

export const metadata: Metadata = {
	title: "Development Metrics",
	description: "Development Metrics",
};

export default async function RootLayout({
	children,
	modal,
}: {
	children: ReactNode;
	modal: ReactNode;
}) {
	const useCases = createTeamUseCases();
	const currentTeam = await useCases.getCurrentTeam();
	const teams = currentTeam ? await useCases.listTeams() : [];

	return (
		<RootShell>
			<header className="flex items-center justify-between bg-(--header-bg) px-6 py-4">
				<span className="font-mono font-bold text-(--header-fg)">
					DEV·METRICS
					<span className="brand-cursor text-(--accent)">_</span>
				</span>
				{currentTeam ? (
					<div className="flex items-center gap-5">
						<HeaderNav />
						<TeamSwitcher
							currentTeam={currentTeam}
							teams={teams}
							selectTeamAction={selectTeamAction}
						/>
					</div>
				) : null}
			</header>
			{children}
			{modal}
			<Footer />
		</RootShell>
	);
}
