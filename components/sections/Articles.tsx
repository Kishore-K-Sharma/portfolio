'use client';
import { motion } from 'framer-motion';
import { sectionVariants, cardVariants } from "@/styles/animations";
import { BookOpen, ExternalLink, ArrowRight } from 'lucide-react';

export function Articles({ articles }: { articles: any[] }) {
    if (!articles || articles.length === 0) return null;

    return (
        <motion.section
            id="articles"
            className="py-24 bg-secondary/10 dark:bg-black/10 relative overflow-hidden"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.1 }}
            variants={sectionVariants}
        >
            <div className="container mx-auto px-6">
                <div className="max-w-3xl mb-16 mx-auto text-center">
                    <h2 className="text-sm font-bold tracking-widest text-primary uppercase mb-3 flex items-center justify-center gap-2">
                        <BookOpen className="w-4 h-4" /> Publications
                    </h2>
                    <h3 className="text-3xl md:text-5xl font-bold font-space-grotesk text-foreground mb-6 tracking-tight">
                        Articles & Blogs
                    </h3>
                    <p className="text-muted-foreground text-lg leading-relaxed">
                        Exploring software architecture, development practices, and technical deep-dives.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
                    {articles.map((article, index) => (
                        <motion.a
                            key={index}
                            href={article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            variants={cardVariants}
                            className="group bg-card/50 dark:bg-card/30 border border-border/40 backdrop-blur-md rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:border-primary/50 flex flex-col h-full cursor-pointer"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-xs font-semibold text-primary uppercase tracking-wider bg-primary/10 px-3 py-1 rounded-full">
                                    {article.platform}
                                </span>
                                <span className="text-muted-foreground text-xs">{article.date}</span>
                            </div>

                            <h4 className="text-xl font-bold font-space-grotesk text-foreground group-hover:text-primary transition-colors mb-3">
                                {article.title}
                            </h4>

                            {article.description && (
                                <p className="text-muted-foreground text-sm leading-relaxed mb-6 flex-grow">
                                    {article.description}
                                </p>
                            )}

                            <div className="mt-auto pt-4 border-t border-border/40 flex flex-row items-center font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                                Read Article <ExternalLink className="w-4 h-4 ml-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                            </div>
                        </motion.a>
                    ))}
                </div>
            </div>
        </motion.section>
    );
}
