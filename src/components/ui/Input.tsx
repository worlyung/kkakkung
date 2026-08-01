import { cva, type VariantProps } from "class-variance-authority";
import type { InputHTMLAttributes } from "react";

// 앱 전역 입력창 규칙 — 테두리·라운드·포커스·크기 통일.
const inputStyles = cva(
  "w-full rounded-2xl border-2 border-line bg-white text-ink focus:border-apricot focus:outline-none placeholder:text-ink-soft/60",
  {
    variants: {
      size: {
        sm: "min-h-10 px-3 text-sm",
        md: "min-h-12 px-4 text-base",
      },
    },
    defaultVariants: { size: "md" },
  },
);

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & VariantProps<typeof inputStyles>;

export function Input({ size, className, ...props }: InputProps) {
  return <input className={[inputStyles({ size }), className].filter(Boolean).join(" ")} {...props} />;
}
