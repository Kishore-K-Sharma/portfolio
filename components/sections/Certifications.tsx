'use client';
import { useState } from 'react';
import { Award } from 'lucide-react';
import { motion } from 'framer-motion';
import { sectionVariants, cardVariants } from "@/styles/animations";
import { Modal } from '@/components/Modal';

const CertificationCard = ({ certification, onClick }: { certification: any, onClick: () => void }) => (
  <motion.div
    variants={cardVariants}
    onClick={onClick}
    className="bg-card/50 dark:bg-card/30 border border-border/40 backdrop-blur-md rounded-xl p-6 flex items-center gap-6 shadow-sm hover:shadow-md transition-all duration-300 hover:border-border/80 group cursor-pointer"
  >
    <div className="bg-primary/10 text-primary p-4 rounded-lg group-hover:bg-primary/20 transition-colors">
      <Award className="w-8 h-8" />
    </div>
    <div>
      <h3 className="text-xl font-bold font-space-grotesk text-foreground group-hover:text-primary transition-colors">{certification.title}</h3>
      <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1.5 font-semibold">Certified Professional</p>
    </div>
  </motion.div>
);

export function Certifications({ certifications }: { certifications: any[] }) {
  const [selectedCert, setSelectedCert] = useState<any | null>(null);

  return (
    <>
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
            className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto"
            variants={{
              visible: { transition: { staggerChildren: 0.15 } }
            }}
          >
            {certifications.map((certification, index) => (
              <CertificationCard
                key={index}
                certification={certification}
                onClick={() => setSelectedCert(certification)}
              />
            ))}
          </motion.div>
        </div>
      </motion.section>

      <Modal
        isOpen={selectedCert !== null}
        onClose={() => setSelectedCert(null)}
        certificate={selectedCert}
      />
    </>
  )
}
