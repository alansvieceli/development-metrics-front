"use client";

import { X } from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";

type ModalProps = {
	children: ReactNode;
	label: string;
	onClose: () => void;
};

export function Modal({ children, label, onClose }: ModalProps) {
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
			className="m-auto max-h-[85vh] w-full max-w-md overflow-y-auto rounded-lg bg-(--background) p-6 text-(--foreground) shadow-xl backdrop:bg-black/50"
		>
			<button
				type="button"
				aria-label="Fechar"
				onClick={close}
				className="absolute top-3 right-3 rounded-lg p-1 hover:bg-black/5"
			>
				<X size={18} aria-hidden="true" />
			</button>
			{children}
		</dialog>
	);
}
