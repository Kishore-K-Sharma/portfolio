'use client';
import { motion } from "framer-motion";
import { GraduationCap, Building2 } from 'lucide-react';
import { sectionVariants, cardVariants } from "@/styles/animations";

const EducationCard = ({ edu }: { edu: any }) => (
    <motion.div
        variants={cardVariants}
        className="relative pl-8 md:pl-0"
    >
        {/* Timeline Dot (Mobile) */}
        <div className="md:hidden absolute left-0 top-1.5 w-3 h-3 rounded-full bg-primary border-2 border-background z-10" />

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 bg-card/50 dark:bg-card/30 border border-border/40 backdrop-blur-md p-6 rounded-xl transition-all duration-300 hover:shadow-md hover:border-border/80 group">
            <div className="md:col-span-3 pt-1">
                <p className="text-sm font-semibold text-muted-foreground tracking-wide uppercase">
                    {edu.startDate} — {edu.endDate}
                </p>
            </div>

            <div className="md:col-span-9 relative">
                <h3 className="text-2xl font-bold font-space-grotesk text-foreground mb-1 group-hover:text-primary transition-colors">
                    {edu.degree}
                </h3>
                <div className="flex items-center text-primary font-medium mb-4">
                    <Building2 className="w-4 h-4 mr-2" />
                    <span>{edu.institution}</span>
                </div>

                {edu.description && (
                    <p className="text-muted-foreground leading-relaxed mb-6">
                        {edu.description}
                    </p>
                )}

                {edu.skills && edu.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {edu.skills.map((skill: string, index: number) => (
                            <span key={index} className="bg-secondary text-secondary-foreground text-xs font-semibold px-3 py-1 rounded-md border border-border/50">
                                {skill}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    </motion.div>
);

export function Education({ education }: { education: any[] }) {
    if (!education || education.length === 0) return null;

    return (
        <motion.section
            id="education"
            className="py-24 bg-secondary/10 dark:bg-black/10"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.1 }}
            variants={sectionVariants}
        >
            <div className="container mx-auto px-6">
                <div className="max-w-3xl mb-16 mx-auto text-center">
                    <h2 className="text-sm font-bold tracking-widest text-primary uppercase mb-3 flex items-center justify-center gap-2">
                        <GraduationCap className="w-4 h-4" /> Academia
                    </h2>
                    <h3 className="text-3xl md:text-5xl font-bold font-space-grotesk text-foreground mb-6 tracking-tight">
                        Academic Background
                    </h3>
                    <p className="text-muted-foreground text-lg leading-relaxed">
                        Formal education laying the groundwork for software engineering and distributed systems.
                    </p>
                </div>

                <div className="relative w-full max-w-5xl mx-auto">
                    {/* Timeline Line (Mobile format - hidden on md) */}
                    <div className="md:hidden absolute left-1.5 top-2 bottom-2 w-px bg-border/60" />

                    <div className="space-y-8 md:space-y-6">
                        {education.map((edu, index) => (
                            <EducationCard key={index} edu={edu} />
                        ))}
                    </div>
                </div>
            </div>
        </motion.section>
    )
}
