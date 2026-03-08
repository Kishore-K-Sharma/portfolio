'use client';
import { useRef } from 'react';
import { motion } from 'framer-motion';
import { sectionVariants } from "@/styles/animations";
import { Quote, Linkedin, ChevronLeft, ChevronRight } from 'lucide-react';

export function Testimonials({ testimonials }: { testimonials: any[] }) {
    const scrollRef = useRef<HTMLDivElement>(null);

    if (!testimonials || testimonials.length === 0) return null;

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const { clientWidth } = scrollRef.current;
            const scrollAmount = direction === 'left' ? -clientWidth : clientWidth;
            scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    return (
        <motion.section
            id="testimonials"
            className="py-24 bg-background relative overflow-hidden"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.1 }}
            variants={sectionVariants}
        >
            <div className="container mx-auto px-6 max-w-7xl relative">
                <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
                    <div className="max-w-3xl text-left">
                        <h2 className="text-sm font-bold tracking-widest text-primary uppercase mb-3 flex items-center justify-start gap-2">
                            <Linkedin className="w-4 h-4" /> Endorsements
                        </h2>
                        <h3 className="text-3xl md:text-5xl font-bold font-space-grotesk text-foreground mb-4 tracking-tight">
                            Loved by Coworkers
                        </h3>
                        <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl">
                            Recommendations and testimonials from engineers, founders, and managers I've worked closely with.
                        </p>
                    </div>

                    <div className="flex gap-4 pb-2">
                        <button
                            onClick={() => scroll('left')}
                            className="p-3 rounded-full bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground transition-all shadow-sm border border-border/50"
                            aria-label="Previous testimonials"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => scroll('right')}
                            className="p-3 rounded-full bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground transition-all shadow-sm border border-border/50"
                            aria-label="Next testimonials"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Horizontal Scroll Container */}
                <div
                    ref={scrollRef}
                    className="flex overflow-x-auto gap-6 pb-8 snap-x snap-mandatory hide-scrollbar relative"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {testimonials.map((t, i) => (
                        <div
                            key={i}
                            className="snap-start shrink-0 w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] flex flex-col bg-card/50 dark:bg-card/30 border border-border/40 backdrop-blur-md rounded-2xl p-6 md:p-8 shadow-sm hover:shadow-md transition-all duration-300 hover:border-primary/30 group"
                        >
                            <Quote className="w-8 h-8 text-primary/20 mb-6 group-hover:text-primary transition-colors shrink-0" />
                            <p className="text-muted-foreground text-sm leading-relaxed mb-8 italic flex-grow">"{t.content}"</p>

                            <div className="flex flex-col border-t border-border/40 pt-5 mt-auto">
                                <span className="font-bold text-foreground font-space-grotesk">{t.name}</span>
                                <span className="text-xs text-primary font-medium mt-1 line-clamp-2" title={t.title}>
                                    {t.title}
                                </span>
                                <span className="text-[10px] text-muted-foreground mt-2 opacity-70">
                                    {t.relationship} • {t.date}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </motion.section>
    );
}
