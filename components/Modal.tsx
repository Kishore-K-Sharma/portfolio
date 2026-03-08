'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  certificate: {
    title: string;
    issuer: string;
    year: number;
    credentialId: string;
    link: string;
    image: string;
  } | null;
}

export function Modal({ isOpen, onClose, certificate }: ModalProps) {
  if (!isOpen || !certificate) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-4xl p-4 bg-background rounded-lg shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 text-muted-foreground hover:text-primary transition-colors z-10"
          >
            <X size={24} />
          </button>
          <div className="w-full h-[80vh] relative">
            <Image 
              src={certificate.image}
              alt={certificate.title}
              layout="fill"
              objectFit="contain"
              className="rounded-md"
            />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
