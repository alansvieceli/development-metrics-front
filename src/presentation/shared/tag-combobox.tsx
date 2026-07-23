"use client";

import type { Tag } from "@/domain/task/entities/tag";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";

type TagComboboxProps = {
	id: string;
	label: string;
	catalog: Tag[];
	selectedIds: string[];
	max: number;
	onChange: (ids: string[]) => void;
	hideLabel?: boolean;
};

type DropdownPosition = { top: number; left: number; width: number };

export function TagCombobox({
	id,
	label,
	catalog,
	selectedIds,
	max,
	onChange,
	hideLabel = false,
}: TagComboboxProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const [query, setQuery] = useState("");
	const [position, setPosition] = useState<DropdownPosition | null>(null);

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
	const open = position !== null;

	function openDropdown() {
		const rect = containerRef.current?.getBoundingClientRect();
		if (!rect) return;
		setPosition({ top: rect.bottom, left: rect.left, width: rect.width });
	}

	function add(tagId: string) {
		onChange([...selectedIds, tagId]);
		setQuery("");
		setPosition(null);
	}

	function remove(tagId: string) {
		onChange(selectedIds.filter((selectedId) => selectedId !== tagId));
	}

	return (
		<div className="flex flex-col gap-2">
			<label
				htmlFor={id}
				className={hideLabel ? "sr-only" : "text-sm opacity-70"}
			>
				{label}
			</label>
			<div
				ref={containerRef}
				className="flex flex-wrap items-center gap-1.5 rounded-lg border border-(--border) bg-(--background) px-2 py-1.5 focus-within:ring-1 focus-within:ring-(--accent)"
			>
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
							onClick={(event) => {
								event.stopPropagation();
								remove(tag.id);
							}}
							className="cursor-pointer leading-none opacity-80 hover:opacity-100"
						>
							×
						</button>
					</span>
				))}
				<input
					id={id}
					ref={inputRef}
					role="combobox"
					aria-expanded={open}
					aria-controls={listboxId}
					autoComplete="off"
					value={query}
					disabled={atMax}
					placeholder={
						atMax ? `Máximo de ${max} tarjas atingido` : "Tarjas..."
					}
					onChange={(event) => {
						setQuery(event.target.value);
						openDropdown();
					}}
					onFocus={openDropdown}
					onBlur={() => setPosition(null)}
					className="min-w-24 flex-1 border-0 bg-transparent py-0.5 text-sm outline-none disabled:opacity-60"
				/>
			</div>
			{open && !atMax && position
				? createPortal(
					<div
						id={listboxId}
						role="listbox"
						style={{
							position: "fixed",
							top: position.top,
							left: position.left,
							width: position.width,
						}}
						className="z-50 mt-1 max-h-52 overflow-y-auto rounded-lg border border-(--border) bg-(--surface) shadow-lg"
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
					</div>,
					inputRef.current?.closest("dialog") ?? document.body,
				)
				: null}
		</div>
	);
}
