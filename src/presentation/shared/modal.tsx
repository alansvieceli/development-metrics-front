"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";

export function Modal({ children }: { children: ReactNode }) {
	const router = useRouter();

	useEffect(() => {
		function onKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") {
				router.back();
			}
		}
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [router]);

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			<button
				type="button"
				aria-label="Fechar"
				onClick={() => router.back()}
				className="absolute inset-0 bg-black/50"
			/>
			<div className="relative z-10 max-h-[85vh] w-full max-w-md overflow-y-auto rounded-lg bg-(--background) p-6 shadow-xl">
				<button
					type="button"
					aria-label="Fechar"
					onClick={() => router.back()}
					className="absolute top-3 right-3 rounded-lg p-1 hover:bg-black/5"
				>
					<X size={18} aria-hidden="true" />
				</button>
				{children}
			</div>
		</div>
	);
}
