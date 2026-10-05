import type { SealMessage } from "@/lib/brand";

// The brand kit's seal: a small round badge that carries one of exactly three messages. One per
// layout. The type system keeps it to those messages, so no other claim can end up in a seal.
export default function Seal({ message, className = "" }: { message: SealMessage; className?: string }) {
  return (
    <span
      className={`inline-flex h-[5.5rem] w-[5.5rem] shrink-0 items-center justify-center rounded-full border border-gold bg-ivory p-2 text-center text-caption font-medium leading-tight text-navy shadow-[inset_0_0_0_3px_var(--ivory),inset_0_0_0_4px_var(--gold)] ${className}`}
    >
      {message}
    </span>
  );
}
