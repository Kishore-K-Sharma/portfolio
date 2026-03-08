'use client';
import { motion } from "framer-motion";
import { Github, Linkedin, Mail, ArrowRight, Download, Briefcase, Users } from 'lucide-react';
import Link from 'next/link';
import { HeroBackground } from '@/components/HeroBackground';
import portfolioData from '@/data/portfolio.json';

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 80,
      damping: 12,
    },
  },
};

const typingContainer = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.5,
    },
  },
};

const typingLetter = {
  hidden: { opacity: 0, display: "none" },
  visible: {
    opacity: 1,
    display: "inline-block",
  },
};

export function Hero() {
  return (
    <>
      <motion.section
        id="hero"
        className="relative min-h-screen flex flex-col justify-center items-center text-left md:text-center overflow-hidden pt-28 pb-16"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
        variants={containerVariants}
      >
        <HeroBackground />

        <div className="container mx-auto px-6 relative z-10 flex flex-col items-center">
          <motion.div variants={itemVariants} className="w-full flex justify-center md:justify-center justify-start mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium shadow-sm transition-all hover:bg-primary/15">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
              </span>
              <span>Available for Consulting Opportunities</span>
            </div>
          </motion.div>

          <div className="w-full text-left md:text-center mb-6">
            <motion.h1
              className="font-space-grotesk text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight text-foreground mb-4 flex flex-wrap justify-start md:justify-center"
              variants={typingContainer}
            >
              {portfolioData.personal.name.split("").map((char, index) => (
                <motion.span key={index} variants={typingLetter}>
                  {char === " " ? "\u00A0" : char}
                </motion.span>
              ))}
              <motion.span
                variants={{
                  hidden: { opacity: 0 },
                  visible: { opacity: [0, 1, 0], transition: { repeat: Infinity, duration: 0.8, ease: "linear" } }
                }}
                className="inline-block w-[4px] h-[1em] bg-primary ml-1"
              />
            </motion.h1>
            <motion.h2 variants={itemVariants} className="text-2xl sm:text-3xl md:text-4xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-primary to-cyan-500 mb-6 pb-2">
              {portfolioData.personal.title}
            </motion.h2>
            <motion.p variants={itemVariants} className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed font-light">
              Architecting and building scalable cloud-native microservices and distributed systems.
              Over <strong className="font-medium text-foreground">{portfolioData.personal.experienceYears}</strong> of experience engineering high-performance applications for the modern web.
            </motion.p>
          </div>

          <motion.div
            className="flex flex-col sm:flex-row items-start sm:items-center justify-center gap-4 mb-12 w-full md:w-auto"
            variants={itemVariants}
          >
            <Link
              href="#projects"
              className="group w-full sm:w-auto relative inline-flex items-center justify-center px-8 py-3.5 bg-primary text-primary-foreground font-semibold rounded-md shadow-md transition-all duration-300 hover:bg-primary/90 hover:-translate-y-0.5"
            >
              <span>View Case Studies</span>
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="#contact"
              className="w-full sm:w-auto px-8 py-3.5 bg-secondary text-secondary-foreground font-medium rounded-md border border-border/50 hover:bg-secondary/80 hover:border-border transition-all duration-300"
            >
              Get in Touch
            </Link>
            <a
              href="/cv.pdf"
              target="_blank"
              download="Kishore_Kumar_Sharma_CV.pdf"
              className="hidden md:inline-flex items-center justify-center px-6 py-3.5 bg-transparent text-muted-foreground font-medium rounded-md hover:text-foreground transition-all duration-200"
            >
              <Download className="w-4 h-4 mr-2" />
              Resume
            </a>
          </motion.div>

          <motion.div
            className="flex items-center justify-start md:justify-center gap-6 w-full"
            variants={itemVariants}
          >
            {portfolioData.personal.github && (
              <a href={portfolioData.personal.github} target="_blank" rel="noopener noreferrer" className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full transition-all">
                <Github className="w-6 h-6" />
                <span className="sr-only">GitHub</span>
              </a>
            )}
            {portfolioData.personal.linkedin && (
              <a href={portfolioData.personal.linkedin} target="_blank" rel="noopener noreferrer" className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full transition-all" aria-label="LinkedIn">
                <Linkedin className="w-6 h-6" />
              </a>
            )}
            {portfolioData.personal.email && (
              <a href={`mailto:${portfolioData.personal.email}`} className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full transition-all" aria-label="Email">
                <Mail className="w-6 h-6" />
              </a>
            )}
          </motion.div>
        </div>
      </motion.section>

      {portfolioData.personal.linkedinPage && (
        <motion.a
          href={portfolioData.personal.linkedinPage}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-[100] flex items-center gap-2 px-5 py-3 text-sm font-bold text-primary-foreground bg-primary rounded-full shadow-lg hover:shadow-primary/20 hover:shadow-2xl transition-colors ring-1 ring-primary/20 hover:ring-primary/50"
          aria-label="LinkedIn Page"
          initial={{ y: 0 }}
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
        >
          <Users className="w-5 h-5" />
          Follow
        </motion.a>
      )}
    </>
  );
}
