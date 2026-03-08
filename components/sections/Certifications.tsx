'use client'

import { motion } from 'framer-motion';
import { Award, Star } from 'lucide-react';

const certifications = [
  "IBM Full Stack Developer Specialization",
  "IBM DevOps & Software Engineering",
  "Java 17 Masterclass",
  "Generative AI Foundation",
];

const awards = [
  "Best Employee of the Year",
  "Star Performer Award",
  "Technical Excellence Award",
];

export function Certifications() {
  return (
    <motion.section
      id="certifications"
      className="py-32 bg-white dark:bg-gray-900"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="container mx-auto px-6">
        <h2 className="text-3xl md:text-5xl font-serif font-bold text-primary mb-16 text-center">Accolades & Recognition</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
          <div>
            <h3 className="flex items-center gap-3 text-2xl font-bold text-primary mb-8">
              <Award className="w-6 h-6 text-accent" />
              Certifications
            </h3>
            <div className="space-y-4">
              {certifications.map((cert) => (
                <div key={cert} className="bg-card p-4 rounded-lg shadow-card">
                  <p className="text-lg text-secondary">{cert}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="flex items-center gap-3 text-2xl font-bold text-primary mb-8">
              <Star className="w-6 h-6 text-accent" />
              Awards
            </h3>
            <div className="space-y-4">
              {awards.map((award) => (
                <div key={award} className="bg-card p-4 rounded-lg shadow-card">
                  <p className="text-lg text-secondary">{award}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
