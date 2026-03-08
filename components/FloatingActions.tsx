'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, Users } from 'lucide-react';
import portfolioData from '@/data/portfolio.json';

export function FloatingActions() {
    const [showScrollTop, setShowScrollTop] = useState(false);

    useEffect(() => {
        const onScroll = () => setShowScrollTop(window.scrollY > 400);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const scrollUp = () => window.scrollTo({ top: 0, behavior: 'smooth' });

    return (
        <div className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-[100] flex items-center gap-2">
            {/* Scroll to top — appears after 400px scroll */}
            <AnimatePresence>
                {showScrollTop && (
                    <motion.button
                        key="scroll-top"
                        onClick={scrollUp}
                        aria-label="Scroll to top"
                        initial={{ opacity: 0, scale: 0.7, x: 16 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.7, x: 16 }}
                        transition={{ duration: 0.22, ease: 'easeOut' }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.92 }}
                        className="p-3 rounded-full bg-secondary border border-border/60 text-foreground shadow-md hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                    >
                        <ArrowUp className="w-5 h-5" />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* LinkedIn Follow — always visible, bobs gently */}
            {portfolioData.personal.linkedinPage && (
                <motion.a
                    href={portfolioData.personal.linkedinPage}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="LinkedIn Page — Follow"
                    initial={{ y: 0 }}
                    animate={{ y: [0, -8, 0] }}
                    transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' }}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-2 px-5 py-3 text-sm font-bold text-primary-foreground bg-primary rounded-full shadow-lg ring-1 ring-primary/20 hover:shadow-primary/20 hover:shadow-2xl hover:ring-primary/50 transition-colors"
                >
                    <Users className="w-5 h-5" />
                    Follow
                </motion.a>
            )}
        </div>
    );
}
