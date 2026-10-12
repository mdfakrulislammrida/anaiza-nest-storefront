"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { HONEYPOT_FIELD, msUntilSendable, proofFields, type FormKind, type FormProof } from "@/lib/formGuard";

const noSubscription = () => () => {};

/**
 * False while the page is still being built on the server and until it is running in the browser; true after.
 *
 * A form submitted before that moment is submitted by the browser itself, which puts every field (a phone number, a
 * password) into the address bar and the history. Submit buttons stay disabled until this is true.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(noSubscription, () => true, () => false);
}

/**
 * The bot trap for one form (see lib/formGuard.ts).
 *
 *   const guard = useFormGuard("order");
 *   <form>{guard.trap} ...</form>
 *   const proof = await guard.proof();   // wait out the time trap, then { hp_field, form_rendered_at }
 *
 * The trap is an ordinary text box moved far off screen, out of the tab order and hidden from screen readers, so only a
 * script that fills in every field ever touches it.
 */
export function useFormGuard(kind: FormKind): { trap: ReactNode; proof: () => Promise<FormProof>; ready: boolean } {
  const ready = useHydrated();
  const renderedAt = useRef(0);
  const honeypot = useRef<HTMLInputElement>(null);

  useEffect(() => {
    renderedAt.current = Date.now();
  }, []);

  const proof = useCallback(async (): Promise<FormProof> => {
    // A form that somehow never set its time is treated as just opened: it waits the full minimum, never fails.
    if (renderedAt.current === 0) renderedAt.current = Date.now();

    const wait = msUntilSendable(renderedAt.current, kind);
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));

    return proofFields(renderedAt.current, honeypot.current?.value ?? "");
  }, [kind]);

  const trap = (
    <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", top: "auto", width: 1, height: 1, overflow: "hidden" }}>
      <label>
        Leave this field empty
        <input
          ref={honeypot}
          type="text"
          name={HONEYPOT_FIELD}
          tabIndex={-1}
          autoComplete="off"
          data-lpignore="true"
          data-1p-ignore="true"
          defaultValue=""
        />
      </label>
    </div>
  );

  return { trap, proof, ready };
}
