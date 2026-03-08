'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { X, Award, ExternalLink } from 'lucide-react';
import { useEffect } from 'react';

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

export function Modal({ isOpen, onClose, certificate }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !certificate) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 md:p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ duration: 0.3, type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-5xl h-full max-h-[90vh] flex flex-col bg-background/95 border border-border/50 rounded-2xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 shrink-0 bg-secondary/20">
            <h3 className="font-space-grotesk font-bold text-xl text-foreground truncate pr-4">
              {certificate.title}
            </h3>
            <button
              onClick={onClose}
              className="p-2 bg-background hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors rounded-full shrink-0 shadow-sm border border-border/50"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto w-full p-6 flex flex-col items-center justify-center bg-dot-pattern">
            {certificate.image ? (
              <div className="relative w-full h-full min-h-[50vh]">
                <Image
                  src={certificate.image}
                  alt={certificate.title}
                  fill
                  className="object-contain rounded-lg shadow-sm"
                  quality={100}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center text-center max-w-xl mx-auto py-12 px-6 bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50 shadow-lg">
                <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6 text-primary ring-1 ring-primary/20">
                  <Award size={48} />
                </div>
                <h2 className="text-3xl font-space-grotesk font-bold mb-4 text-foreground">
                  {certificate.title}
                </h2>
                <div className="space-y-2 text-muted-foreground mb-8">
                  {certificate.issuer && <p>Issuer: <span className="text-foreground font-medium">{certificate.issuer}</span></p>}
                  {certificate.year && <p>Issued: <span className="text-foreground font-medium">{certificate.year}</span></p>}
                  {certificate.credentialId && <p>Credential ID: <span className="text-foreground font-medium">{certificate.credentialId}</span></p>}
                </div>

                {certificate.link && (
                  <a
                    href={certificate.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
                  >
                    Verify Credential <ExternalLink size={16} />
                  </a>
                )}
                {!certificate.link && !certificate.issuer && (
                  <p className="text-sm text-primary/80 italic bg-primary/5 px-4 py-2 rounded-md">Certificate placeholder. Please add media or links to portfolio.json.</p>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
