"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
	{ href: "/board", label: "Quadro" },
	{ href: "/metrics", label: "Métricas" },
	{ href: "/sprints", label: "Sprints" },
	{ href: "/task-types", label: "Tipos de task" },
	{ href: "/tags", label: "Tarjas" },
] as const;

export function HeaderNav() {
	const pathname = usePathname();

	return (
		<nav className="flex items-center gap-5 font-mono text-xs uppercase tracking-wide">
			{NAV_LINKS.map((link) => {
				const active =
					link.href === "/metrics"
						? pathname.startsWith("/metrics")
						: pathname === link.href;
				return (
					<Link
						key={link.href}
						href={link.href}
						className={`flex items-center gap-1.5 ${
							active ? "text-(--header-fg)" : "text-(--foreground-muted)"
						}`}
					>
						<span
							aria-hidden="true"
							className={`h-1.5 w-1.5 rounded-full ${
								active ? "bg-(--accent)" : "bg-transparent"
							}`}
						/>
						{link.label}
					</Link>
				);
			})}
		</nav>
	);
}
