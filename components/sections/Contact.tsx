"use client";

import { useFormStatus } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { submitContactForm, type ContactFormState } from "@/app/actions";
import portfolioData from "@/data/portfolio.json";
import { Section } from "@/components/editorial/Section";
import { Reveal } from "@/components/editorial/Reveal";
import { useActionState, useEffect, useRef, useState } from "react";

const initialState: ContactFormState = {
  message: "",
  errors: undefined,
  success: false,
};

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const TURNSTILE_SCRIPT_ID = "cf-turnstile-script";

function useTurnstileScript(enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof document === "undefined") return;
    if (document.getElementById(TURNSTILE_SCRIPT_ID)) return;
    const s = document.createElement("script");
    s.id = TURNSTILE_SCRIPT_ID;
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    s.async = true;
    s.defer = true;
    document.body.appendChild(s);
  }, [enabled]);
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="group inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md bg-foreground text-background text-[0.9rem] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? (
        <>
          <span className="font-mono">sending</span>
          <span className="font-mono animate-caret-blink">_</span>
        </>
      ) : (
        <>
          Send message <span aria-hidden>→</span>
        </>
      )}
    </button>
  );
}

export function Contact() {
  const { personal } = portfolioData;
  const [state, formAction] = useActionState(submitContactForm, initialState);
  const [message, setMessage] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  useTurnstileScript(Boolean(TURNSTILE_SITE_KEY));

  useEffect(() => {
    if (state.success && formRef.current) {
      formRef.current.reset();
      setMessage("");
      // Reset the Turnstile widget so the next submission gets a fresh token.
      window.turnstile?.reset();
    }
  }, [state.success]);

  return (
    <Section id="contact" index="06" eyebrow="Contact · let's build something hard">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-16">
        {/* Left: invitation */}
        <div className="md:col-span-5">
          <Reveal>
            <h2 className="font-display text-display text-foreground text-balance leading-[1] tracking-[-0.03em]">
              You don&apos;t ship by <span className="font-display-soft italic text-accent">accident</span>.
            </h2>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="mt-6 max-w-[44ch] text-body-lg text-muted-foreground text-pretty">
              If you&apos;re hiring a senior full-stack engineer, looking for someone who can own a feature end-to-end, or building a product that needs both depth and delivery — I&apos;d like to hear about it.
            </p>
          </Reveal>

          <Reveal delay={0.16}>
            <dl className="mt-10 space-y-5 font-mono text-[0.85rem]">
              <div className="flex items-baseline gap-3">
                <dt className="text-muted-foreground w-24 shrink-0">linkedin</dt>
                <dd>
                  <a href={personal.linkedin} target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-accent transition-colors">
                    /in/kishore-kumar-sharma
                  </a>
                </dd>
              </div>
              <div className="flex items-baseline gap-3">
                <dt className="text-muted-foreground w-24 shrink-0">based</dt>
                <dd className="text-foreground">{personal.location}</dd>
              </div>
            </dl>
          </Reveal>
        </div>

        {/* Right: form */}
        <div className="md:col-span-7 md:pl-10 md:border-l md:border-subtle/60">
          <Reveal>
            <p className="eyebrow mb-6">Or write — I read every one</p>
          </Reveal>

          <form ref={formRef} action={formAction} className="space-y-6" noValidate>
            <Field
              label="What should I call you?"
              name="name"
              type="text"
              required
              placeholder="First name is fine"
              error={state.errors?.name?.[0]}
            />
            <Field
              label="Where do I reply?"
              name="email"
              type="email"
              required
              placeholder="you@company.com"
              error={state.errors?.email?.[0]}
            />
            <div>
              <label htmlFor="message" className="flex items-baseline justify-between mb-2">
                <span className="font-mono text-[0.78rem] text-muted-foreground">What are you working on?</span>
                <span className="font-mono text-[0.7rem] text-muted-foreground num">
                  {message.length} / 5000
                </span>
              </label>
              <textarea
                id="message"
                name="message"
                rows={5}
                required
                maxLength={5000}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full bg-transparent border-b border-subtle focus:border-foreground transition-colors py-2 text-base outline-none resize-none placeholder:text-muted-foreground/50"
                placeholder="Project, timeline, what's making it hard. Or just a hello."
              />
              {state.errors?.message?.[0] && (
                <p className="mt-2 font-mono text-[0.75rem] text-destructive">{state.errors.message[0]}</p>
              )}
            </div>

            {TURNSTILE_SITE_KEY && (
              <div
                className="cf-turnstile"
                data-sitekey={TURNSTILE_SITE_KEY}
                data-theme="auto"
                data-size="flexible"
              />
            )}

            <div className="flex items-center justify-between gap-4 pt-2">
              <SubmitButton />
              <AnimatePresence mode="wait">
                {state.message && (
                  <motion.p
                    key={state.message}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className={`font-mono text-[0.78rem] ${
                      state.success ? "text-edtech" : "text-destructive"
                    }`}
                  >
                    {state.success ? "✓ " : "× "}
                    {state.message}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </form>
        </div>
      </div>
    </Section>
  );
}

function Field({
  label,
  name,
  type,
  required,
  placeholder,
  error,
}: {
  label: string;
  name: string;
  type: string;
  required?: boolean;
  placeholder?: string;
  error?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="block font-mono text-[0.78rem] text-muted-foreground mb-2">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="w-full bg-transparent border-b border-subtle focus:border-foreground transition-colors py-2 text-base outline-none placeholder:text-muted-foreground/50"
      />
      {error && <p className="mt-2 font-mono text-[0.75rem] text-destructive">{error}</p>}
    </div>
  );
}
