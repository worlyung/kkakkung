"use client";

import { type FormEvent, type ReactNode } from "react";

// 누르면 한 번 확인창을 띄우고, "예"일 때만 제출하는 폼.
export function ConfirmForm({
  action,
  fields,
  message,
  className,
  children,
}: {
  action: string;
  fields: Record<string, string>;
  message: string;
  className?: string;
  children: ReactNode;
}) {
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (!window.confirm(message)) {
      event.preventDefault();
    }
  }

  return (
    <form action={action} method="post" onSubmit={onSubmit}>
      {Object.entries(fields).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      <button type="submit" className={className}>
        {children}
      </button>
    </form>
  );
}
