'use client'

import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

export function About() {
  return (
    <motion.section
      id="about"
      className="py-32 bg-white dark:bg-gray-900"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-3xl md:text-5xl font-serif font-bold text-primary mb-6">
              Strategic Vision, <br />Technical Expertise.
            </h2>
            <div className="space-y-6 text-secondary text-lg">
              <p>
                I am a Senior Consultant with a passion for building high-quality, scalable software solutions. I have a proven track record of success in designing and implementing complex systems for a variety of clients.
              </p>
              <p>
                My approach is to first understand the business goals and then to design and build a solution that meets those goals. I am a strong believer in the importance of communication and collaboration, and I work closely with my clients to ensure that they are happy with the final product.
              </p>
            </div>
          </div>
          <div className="p-8 bg-card shadow-card rounded-lg">
            <h3 className="text-xl font-bold text-primary mb-4">My Core Principles</h3>
            <ul className="space-y-4">
              <li className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-accent" />
                <span>Architect for scalability and resilience</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-accent" />
                <span>Optimize for performance and observability</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-accent" />
                <span>Automate everything through robust CI/CD</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-accent" />
                <span>Deliver clean, maintainable, and secure code</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
