'use client'

import { motion } from 'framer-motion';
import { Github, Linkedin, Mail, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col justify-center items-center overflow-hidden text-center pt-20">
      <div className="absolute inset-0 -z-10 h-full w-full bg-transparent bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:6rem_4rem]">
        <div className="absolute bottom-0 left-0 right-0 top-0 bg-[radial-gradient(circle_500px_at_50%_200px,#C9EBFF,transparent)]"></div>
      </div>
      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1 className="text-5xl md:text-7xl font-serif font-bold text-primary mb-6">
            Kishore Kumar Sharma
          </h1>
          <p className="text-xl text-secondary max-w-3xl mx-auto mb-10">
            A Senior Consultant specializing in the architecture of scalable cloud-native systems and modern web platforms for global enterprises.
          </p>
        </motion.div>

        <motion.div
          className="flex items-center justify-center gap-4 mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
        >
          <Link
            href="#projects"
            className="group px-6 py-3 bg-primary text-white font-semibold rounded-md hover:bg-opacity-90 transition-all flex items-center gap-2 shadow-interactive"
          >
            View My Work
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="#contact"
            className="px-6 py-3 bg-transparent border border-primary text-primary font-semibold rounded-md hover:bg-primary hover:text-white transition-all"
          >
            Get in Touch
          </Link>
        </motion.div>

        <motion.div
          className="flex items-center justify-center gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.4 }}
        >
          <a href="https://www.linkedin.com/in/kishore-kumar-sharma-product-engineer/" target="_blank" className="text-secondary hover:text-primary transition-colors">
            <Linkedin className="w-5 h-5" />
          </a>
          <a href="https://github.com/kishore-kumar-sharma" target="_blank" className="text-secondary hover:text-primary transition-colors">
            <Github className="w-5 h-5" />
          </a>
          <a href="mailto:kishoresharma914@gmail.com" className="text-secondary hover:text-primary transition-colors">
            <Mail className="w-5 h-5" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}
