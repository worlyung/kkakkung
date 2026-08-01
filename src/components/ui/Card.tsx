import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

// 앱 전역 카드 규칙 — 배경·라운드·테두리·그림자·안쪽 여백을 한곳에서.
const cardStyles = cva("bg-white", {
  variants: {
    variant: {
      default: "rounded-2xl border border-line shadow-sm",
      raised: "rounded-[22px] shadow-soft",
      flat: "rounded-2xl border-0 bg-paper-2 shadow-none",
    },
    pad: {
      none: "",
      sm: "p-4",
      md: "p-5",
      lg: "p-6",
    },
  },
  defaultVariants: { variant: "default", pad: "md" },
});

type CardProps = HTMLAttributes<HTMLDivElement> & VariantProps<typeof cardStyles>;

export function Card({ variant, pad, className, ...props }: CardProps) {
  return <div className={[cardStyles({ variant, pad }), className].filter(Boolean).join(" ")} {...props} />;
}
