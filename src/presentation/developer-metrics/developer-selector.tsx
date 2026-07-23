"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Member } from "@/domain/team/entities/member";

type DeveloperSelectorProps = {
	members: Member[];
	selectedMemberId: string;
};

export function DeveloperSelector({
	members,
	selectedMemberId,
}: DeveloperSelectorProps) {
	const pathname = usePathname();
	const router = useRouter();
	const searchParams = useSearchParams();

	return (
		<select
			aria-label="Desenvolvedor"
			value={selectedMemberId}
			onChange={(event) => {
				const params = new URLSearchParams(searchParams.toString());
				params.set("developer", event.target.value);
				router.push(`${pathname}?${params.toString()}`);
			}}
			className="h-9 min-w-40 cursor-pointer rounded-lg border border-(--border) bg-(--background) px-3"
		>
			{members.map((member) => (
				<option key={member.id} value={member.id}>
					{member.name}
				</option>
			))}
		</select>
	);
}
