"use client";

import { useFormStatus } from "react-dom";

type Props = {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
};

/** Submit button that disables itself while its form is in flight. */
export function SubmitButton({ children, pendingLabel, className = "" }: Props) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}
