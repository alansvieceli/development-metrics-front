"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import type { Tag } from "@/domain/task/entities/tag";
import { TagCombobox } from "@/presentation/shared/tag-combobox";
import { parseStoredTagIds, serializeTagIds } from "./tag-filter-storage";

const STORAGE_KEY = "metrics-tag-filter";

type TagFilterProps = {
	tags: Tag[];
	selectedTagIds: string[];
};

export function TagFilter({ tags, selectedTagIds }: TagFilterProps) {
	const pathname = usePathname();
	const router = useRouter();
	const searchParams = useSearchParams();
	const hydrated = useRef(false);

	useEffect(() => {
		if (hydrated.current || searchParams.has("tags")) return;
		hydrated.current = true;
		const storedIds = parseStoredTagIds(localStorage.getItem(STORAGE_KEY));
		if (storedIds.length === 0) return;
		const params = new URLSearchParams(searchParams.toString());
		params.set("tags", storedIds.join(","));
		router.replace(`${pathname}?${params.toString()}`);
	}, [pathname, router, searchParams]);

	function handleChange(ids: string[]) {
		const serialized = serializeTagIds(ids);
		if (serialized) {
			localStorage.setItem(STORAGE_KEY, serialized);
		} else {
			localStorage.removeItem(STORAGE_KEY);
		}
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
