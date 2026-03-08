'use client';
import { Award, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { sectionVariants, cardVariants } from "@/styles/animations";

const CertificationCard = ({ certification }: { certification: any }) => (
  <motion.div
    variants={cardVariants}
    className="bg-card/50 dark:bg-card/30 border border-border/40 backdrop-blur-md rounded-xl p-4 flex flex-col items-center text-center gap-3 shadow-sm hover:shadow-md transition-all duration-300 hover:border-primary/40 group relative"
  >
    <div className="bg-primary/10 text-primary p-3 rounded-full group-hover:bg-primary group-hover:text-primary-foreground shadow-sm transition-all duration-300">
      <Award className="w-6 h-6" />
    </div>
    <div className="flex-1 flex flex-col justify-between w-full h-full">
      <div>
        <h3 className="text-base font-bold font-space-grotesk text-foreground group-hover:text-primary transition-colors line-clamp-2">{certification.title}</h3>
        <p className="text-[11px] text-muted-foreground uppercase tracking-wider mt-1.5 font-semibold mb-4">
          {certification.issuer ? `${certification.issuer} • ${certification.year}` : 'Certified Professional'}
        </p>
      </div>
      {certification.link && (
        <a
          href={certification.link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-4 py-2 bg-secondary/50 hover:bg-primary hover:text-primary-foreground text-foreground group-hover:bg-primary group-hover:text-primary-foreground rounded-md transition-all duration-200 border border-border/50 hover:border-primary/50 w-full"
        >
          Verify Credential <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  </motion.div>
);

export function Certifications({ certifications }: { certifications: any[] }) {
  return (
    <motion.section
      id="certifications"
      className="py-24 bg-secondary/30 dark:bg-black/20"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: false, amount: 0.1 }}
      variants={sectionVariants}
    >
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mb-16 mx-auto text-center">
          <h2 className="text-sm font-bold tracking-widest text-primary uppercase mb-3">Validation</h2>
          <h3 className="text-3xl md:text-5xl font-bold font-space-grotesk text-foreground mb-6 tracking-tight">
            Licenses & Certifications
          </h3>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Continuous learning and validation of technical expertise against industry standards.
          </p>
        </div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-w-7xl mx-auto"
          variants={{
            visible: { transition: { staggerChildren: 0.15 } }
          }}
        >
          {certifications.map((certification, index) => (
            <CertificationCard
              key={index}
              certification={certification}
            />
          ))}
        </motion.div>
      </div>
    </motion.section>
  )
}
