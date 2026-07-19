"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Modal } from "@/presentation/shared/modal";

export function RouteModal({
	children,
	label,
}: {
	children: ReactNode;
	label: string;
}) {
	const router = useRouter();
	return (
		<Modal label={label} onClose={() => router.back()}>
			{children}
		</Modal>
	);
}
