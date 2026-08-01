import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes, ReactNode } from "react";

// 앱 전역 버튼 규칙 — 색·라운드·그림자·크기를 한곳에서 관리한다.
const buttonStyles = cva(
  "inline-flex items-center justify-center gap-2 rounded-2xl font-bold transition-colors disabled:cursor-default disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-apricot text-white shadow-soft",
        secondary: "border-2 border-line bg-white text-ink shadow-sm",
        soft: "bg-sage-soft text-sage-deep",
        ghost: "bg-transparent text-apricot-deep",
        danger: "border border-red-200 bg-red-50 text-red-700",
      },
      size: {
        sm: "min-h-10 px-4 text-sm",
        md: "min-h-12 px-5 text-base",
        lg: "min-h-14 px-6 text-lg",
      },
      block: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: { variant: "primary", size: "md", block: false },
  },
);

type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> &
  VariantProps<typeof buttonStyles> & {
    className?: string;
    href?: string;
    children?: ReactNode;
  };

export function Button({ variant, size, block, className, href, children, ...props }: ButtonProps) {
  const cls = [buttonStyles({ variant, size, block }), className].filter(Boolean).join(" ");
  if (href) {
    return (
      <Link href={href} className={`cta ${cls}`}>
        {children}
      </Link>
    );
  }
  return (
    <button className={cls} {...props}>
      {children}
    </button>
  );
}
