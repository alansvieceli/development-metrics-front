"use client";

import { X } from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";

type ModalProps = {
	children: ReactNode;
	label: string;
	onClose: () => void;
	size?: "md" | "lg" | "xl";
};

const SIZE_CLASSES = {
	md: "max-w-md",
	lg: "max-w-lg",
	xl: "max-w-2xl",
} as const;

export function Modal({ children, label, onClose, size = "md" }: ModalProps) {
	const ref = useRef<HTMLDialogElement>(null);

	useEffect(() => {
		ref.current?.showModal();
	}, []);

	function close() {
		ref.current?.close();
		onClose();
	}

	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents: o dialog trata teclado nativamente via onCancel.
		<dialog
			ref={ref}
			aria-label={label}
			onCancel={(event) => {
				event.preventDefault();
				close();
			}}
			onClick={(event) => {
				if (event.target === event.currentTarget) close();
			}}
			className={`m-auto max-h-[85vh] w-full ${SIZE_CLASSES[size]} overflow-y-auto rounded-lg bg-(--background) p-6 text-(--foreground) shadow-xl backdrop:bg-black/50`}
		>
			<div className="mb-4 flex items-center justify-between gap-4 border-b border-(--border) pb-3">
				<h2 className="text-xl font-semibold">{label}</h2>
				<button
					type="button"
					aria-label="Fechar"
					onClick={close}
					className="flex-none cursor-pointer rounded-lg border border-(--border) p-1.5 transition-colors hover:bg-white/10"
				>
					<X size={18} aria-hidden="true" />
				</button>
			</div>
			{children}
		</dialog>
	);
}
