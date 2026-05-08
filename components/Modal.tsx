"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { X, Award, ExternalLink } from "lucide-react";
import { useEffect, useId, useRef } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  certificate: {
    title: string;
    issuer?: string;
    year?: number | string;
    credentialId?: string;
    link?: string;
    image?: string;
  } | null;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({ isOpen, onClose, certificate }: ModalProps) {
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => !el.hasAttribute("inert") && el.offsetParent !== null);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey && (active === first || !dialogRef.current.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "unset";
      previouslyFocused.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen || !certificate) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[150] flex items-center justify-center bg-background/80 backdrop-blur-md p-4 md:p-8"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <motion.div
          ref={dialogRef}
          initial={{ scale: 0.97, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.97, opacity: 0, y: 12 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-5xl max-h-[88vh] flex flex-col bg-surface border border-subtle rounded-xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-subtle/60 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <span className="eyebrow text-fintech shrink-0">/cert</span>
              <h3 id={titleId} className="font-display text-[1.1rem] truncate text-foreground">
                {certificate.title}
              </h3>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              aria-label="Close certificate dialog"
              className="inline-flex items-center justify-center w-9 h-9 rounded-md border border-subtle text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors shrink-0"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 md:p-10">
            {certificate.image ? (
              <div className="relative w-full h-[60vh] min-h-[40vh]">
                <Image
                  src={certificate.image}
                  alt={certificate.title}
                  fill
                  className="object-contain rounded-lg"
                  quality={100}
                />
              </div>
            ) : (
              <div className="max-w-xl mx-auto py-8 text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full border border-subtle flex items-center justify-center text-fintech">
                  <Award size={32} />
                </div>
                <h2 className="font-display text-display-sm text-foreground mb-3">{certificate.title}</h2>
                <div className="space-y-1.5 text-[0.92rem] text-muted-foreground mb-8 font-mono">
                  {certificate.issuer && <p>Issuer · <span className="text-foreground">{certificate.issuer}</span></p>}
                  {certificate.year && <p>Issued · <span className="text-foreground">{certificate.year}</span></p>}
                  {certificate.credentialId && <p>ID · <span className="text-foreground">{certificate.credentialId}</span></p>}
                </div>
                {certificate.link && (
                  <a
                    href={certificate.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-foreground text-background hover:opacity-90 transition-opacity"
                  >
                    Verify credential <ExternalLink size={14} />
                  </a>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
