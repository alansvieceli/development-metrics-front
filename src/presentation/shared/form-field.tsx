import type {
	InputHTMLAttributes,
	ReactNode,
	SelectHTMLAttributes,
	TextareaHTMLAttributes,
} from "react";

const CONTROL_CLASS = "rounded-lg border border-(--border) px-3 py-2";

type FieldProps = {
	label: string;
	htmlFor: string;
	className?: string;
	children: ReactNode;
};

export function Field({ label, htmlFor, className, children }: FieldProps) {
	return (
		<div className={`flex flex-col gap-2 ${className ?? ""}`}>
			<label htmlFor={htmlFor} className="text-sm opacity-70">
				{label}
			</label>
			{children}
		</div>
	);
}

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
	id: string;
	label: string;
	fieldClassName?: string;
};

export function TextField({
	id,
	label,
	fieldClassName,
	className,
	...props
}: TextFieldProps) {
	return (
		<Field label={label} htmlFor={id} className={fieldClassName}>
			<input
				id={id}
				className={`${CONTROL_CLASS} ${className ?? ""}`}
				{...props}
			/>
		</Field>
	);
}

type TextareaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
	id: string;
	label: string;
	fieldClassName?: string;
};

export function TextareaField({
	id,
	label,
	fieldClassName,
	className,
	...props
}: TextareaFieldProps) {
	return (
		<Field label={label} htmlFor={id} className={fieldClassName}>
			<textarea
				id={id}
				className={`${CONTROL_CLASS} ${className ?? ""}`}
				{...props}
			/>
		</Field>
	);
}

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
	id: string;
	label: string;
	fieldClassName?: string;
};

export function SelectField({
	id,
	label,
	fieldClassName,
	className,
	children,
	...props
}: SelectFieldProps) {
	return (
		<Field label={label} htmlFor={id} className={fieldClassName}>
			<select
				id={id}
				className={`${CONTROL_CLASS} ${className ?? ""}`}
				{...props}
			>
				{children}
			</select>
		</Field>
	);
}

export function FormSection({
	title,
	icon,
	children,
}: {
	title: string;
	icon?: ReactNode;
	children: ReactNode;
}) {
	return (
		<div className="flex flex-col gap-4 border-(--border) border-t pt-5 first:border-t-0 first:pt-0">
			<h3 className="flex items-center gap-1.5 font-semibold text-(--foreground-muted) text-xs uppercase tracking-wide">
				{icon}
				{title}
			</h3>
			{children}
		</div>
	);
}

export function FormFooter({ children }: { children: ReactNode }) {
	return (
		<div className="flex items-center justify-end gap-2 border-(--border) border-t pt-5">
			{children}
		</div>
	);
}
