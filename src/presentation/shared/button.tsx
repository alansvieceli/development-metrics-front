import type { ComponentProps } from "react";

const VARIANT_CLASS = {
	primary: "bg-(--accent) text-(--accent-fg)",
	danger: "bg-red-700 text-white",
	"danger-ghost": "border border-(--border) text-(--critical)",
	ghost: "border border-(--border) text-(--foreground-muted)",
} as const;

type ButtonProps = ComponentProps<"button"> & {
	variant?: keyof typeof VARIANT_CLASS;
};

export function Button({
	variant = "primary",
	className,
	...props
}: ButtonProps) {
	return (
		<button
			className={`rounded-lg px-4 py-2 disabled:opacity-60 ${VARIANT_CLASS[variant]} ${className ?? ""}`}
			{...props}
		/>
	);
}
