import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

// 앱 전역 배지(pill) 규칙 — 필터·태그·상태 표시에 통일된 알약 모양.
const badgeStyles = cva("inline-flex items-center gap-1 rounded-full font-bold", {
  variants: {
    variant: {
      apricot: "bg-apricot-soft text-apricot-deep",
      sage: "bg-sage-soft text-sage-deep",
      dark: "bg-black/50 text-white backdrop-blur-sm",
      outline: "border-2 border-line bg-white text-ink-soft",
    },
    size: {
      sm: "px-2.5 py-1 text-xs",
      md: "px-3.5 py-1.5 text-sm",
    },
  },
  defaultVariants: { variant: "apricot", size: "md" },
});

type BadgeProps = HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeStyles>;

export function Badge({ variant, size, className, ...props }: BadgeProps) {
  return <span className={[badgeStyles({ variant, size }), className].filter(Boolean).join(" ")} {...props} />;
}
