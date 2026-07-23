"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Tag } from "@/domain/task/entities/tag";
import { TagCombobox } from "@/presentation/shared/tag-combobox";

type TagFilterProps = {
	tags: Tag[];
	selectedTagIds: string[];
};

export function TagFilter({ tags, selectedTagIds }: TagFilterProps) {
	const pathname = usePathname();
	const router = useRouter();
	const searchParams = useSearchParams();

	function handleChange(ids: string[]) {
		const params = new URLSearchParams(searchParams.toString());
		if (ids.length > 0) {
			params.set("tags", ids.join(","));
		} else {
			params.delete("tags");
		}
		router.push(`${pathname}?${params.toString()}`);
	}

	return (
		<TagCombobox
			id="metrics-tag-filter"
			label="Tarjas"
			catalog={tags}
			selectedIds={selectedTagIds}
			max={2}
			onChange={handleChange}
			hideLabel
		/>
	);
}
