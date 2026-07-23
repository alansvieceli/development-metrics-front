"use client";

import { useState } from "react";
import type { Tag } from "@/domain/task/entities/tag";

type TagComboboxProps = {
	id: string;
	label: string;
	catalog: Tag[];
	selectedIds: string[];
	max: number;
	onChange: (ids: string[]) => void;
	hideLabel?: boolean;
};

export function TagCombobox({
	id,
	label,
	catalog,
	selectedIds,
	max,
	onChange,
	hideLabel = false,
}: TagComboboxProps) {
	const [query, setQuery] = useState("");
	const [open, setOpen] = useState(false);

	const selected = selectedIds
		.map((tagId) => catalog.find((tag) => tag.id === tagId))
		.filter((tag): tag is Tag => tag !== undefined);
	const atMax = selected.length >= max;
	const matches = catalog.filter(
		(tag) =>
			!selectedIds.includes(tag.id) &&
			tag.name.toLowerCase().includes(query.toLowerCase()),
	);
	const listboxId = `${id}-listbox`;

	function add(tagId: string) {
		onChange([...selectedIds, tagId]);
		setQuery("");
		setOpen(false);
	}

	function remove(tagId: string) {
		onChange(selectedIds.filter((selectedId) => selectedId !== tagId));
	}

	return (
		<div className="relative flex flex-col gap-2">
			<label
				htmlFor={id}
				className={hideLabel ? "sr-only" : "text-sm opacity-70"}
			>
				{label}
			</label>
			{selected.length > 0 ? (
				<div className="flex flex-wrap gap-1.5">
					{selected.map((tag) => (
						<span
							key={tag.id}
							className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs text-white"
							style={{ background: tag.color }}
						>
							{tag.name}
							<button
								type="button"
								aria-label={`Remover tarja ${tag.name}`}
								onClick={() => remove(tag.id)}
								className="cursor-pointer leading-none opacity-80 hover:opacity-100"
							>
								×
							</button>
						</span>
					))}
				</div>
			) : null}
			<input
				id={id}
				role="combobox"
				aria-expanded={open}
				aria-controls={listboxId}
				autoComplete="off"
				value={query}
				disabled={atMax}
				placeholder={
					atMax ? `Máximo de ${max} tarjas atingido` : "Buscar tarja..."
				}
				onChange={(event) => {
					setQuery(event.target.value);
					setOpen(true);
				}}
				onFocus={() => setOpen(true)}
				onBlur={() => setOpen(false)}
				className="rounded-lg border border-(--border) bg-(--background) px-3 py-2 text-sm disabled:opacity-60"
			/>
			{open && !atMax ? (
				<div
					id={listboxId}
					role="listbox"
					aria-label={label}
					className="absolute top-full z-10 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-(--border) bg-(--surface) shadow-lg"
				>
					{matches.length === 0 ? (
						<div className="px-3 py-2 text-sm opacity-60">
							Nenhuma tarja encontrada
						</div>
					) : (
						matches.map((tag) => (
							<button
								key={tag.id}
								type="button"
								role="option"
								aria-selected={false}
								onMouseDown={(event) => event.preventDefault()}
								onClick={() => add(tag.id)}
								className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white/10"
							>
								<span
									aria-hidden="true"
									className="h-2.5 w-2.5 shrink-0 rounded-full"
									style={{ background: tag.color }}
								/>
								{tag.name}
							</button>
						))
					)}
				</div>
			) : null}
		</div>
	);
}
