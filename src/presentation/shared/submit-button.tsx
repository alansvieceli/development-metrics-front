"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";

type SubmitButtonProps = ComponentProps<"button"> & {
	confirmMessage?: string;
};

export function SubmitButton({
	confirmMessage,
	onClick,
	children,
	disabled,
	...props
}: SubmitButtonProps) {
	const { pending } = useFormStatus();

	return (
		<button
			{...props}
			type="submit"
			disabled={pending || disabled}
			onClick={(event) => {
				if (confirmMessage && !window.confirm(confirmMessage)) {
					event.preventDefault();
					return;
				}
				onClick?.(event);
			}}
		>
			{children}
		</button>
	);
}
