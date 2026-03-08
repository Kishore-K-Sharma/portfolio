import { Github, Linkedin, Mail, ArrowRight, Code } from 'lucide-react';
import Link from 'next/link';
import { HeroBackground } from '@/components/HeroBackground';

export function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col justify-center items-center text-center overflow-hidden pt-20">
      <HeroBackground />
      <div className="container mx-auto px-6 relative z-10">
        <div>
          <div className="inline-block bg-secondary rounded-full px-4 py-1.5 text-sm mb-6 shadow-md">
            <span className="flex items-center gap-2 font-medium text-secondary-foreground">
                <Code className="w-4 h-4 text-accent-foreground" />
                <span>Open for new opportunities</span>
            </span>
          </div>
          <h1 className="font-space-grotesk text-5xl md:text-7xl font-bold text-primary mb-4 bg-clip-text text-transparent bg-gradient-to-b from-primary to-primary/60 dark:to-primary/60 py-2">
            Kishore Kumar Sharma
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-10">
            Senior Full Stack Engineer with a passion for building beautiful, performant, and scalable web applications.
          </p>
        </div>

        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
        >
          <Link
            href="#projects"
            className="group relative inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg shadow-2xl shadow-primary/20 overflow-hidden transition-all duration-300 hover:scale-105"
          >
            <span className="relative z-10 flex items-center gap-2">
                View My Work
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </Link>
          <Link
            href="#contact"
            className="px-6 py-3 bg-secondary text-secondary-foreground font-semibold rounded-lg hover:bg-secondary/80 transition-all duration-300 hover:scale-105"
          >
            Get in Touch
          </Link>
        </div>

        <div
          className="flex items-center justify-center gap-8"
        >
          <a href="https://www.linkedin.com/in/kishore-kumar-sharma-product-engineer/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
            <Linkedin className="w-6 h-6" />
          </a>
          <a href="https://github.com/kishore-kumar-sharma" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
            <Github className="w-6 h-6" />
          </a>
          <a href="mailto:kishoresharma914@gmail.com" className="text-muted-foreground hover:text-primary transition-colors">
            <Mail className="w-6 h-6" />
          </a>
        </div>
      </div>
    </section>
  );
}
