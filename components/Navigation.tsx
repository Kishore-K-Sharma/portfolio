'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ThemeToggle } from './ThemeToggle';
import { Terminal } from 'lucide-react';
import portfolioData from '@/data/portfolio.json';

export function Navigation() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const firstName = portfolioData.personal.name.split(' ')[0];

  return (
    <header
      className={`fixed top-0 w-full z-50 transition-all duration-300 border-b ${scrolled
        ? 'bg-background/80 backdrop-blur-lg border-border/40 py-3 shadow-sm'
        : 'bg-transparent border-transparent py-5'
        }`}
    >
      <nav className="container mx-auto px-6 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold font-space-grotesk text-foreground tracking-tight group">
          <Terminal className="w-5 h-5 text-primary" />
          <span>{firstName}<span className="text-primary">.dev</span></span>
        </Link>

        <div className="hidden md:flex items-center space-x-8 text-sm font-medium">
          <Link href="#skills" className="text-muted-foreground hover:text-foreground transition-colors">Skills</Link>
          <Link href="#experience" className="text-muted-foreground hover:text-foreground transition-colors">Experience</Link>
          <Link href="#projects" className="text-muted-foreground hover:text-foreground transition-colors">Projects</Link>
          <Link href="#contact" className="text-muted-foreground hover:text-foreground transition-colors">Contact</Link>
        </div>

        <div className="flex items-center space-x-4">
          <ThemeToggle />
          <Link
            href="#contact"
            className="hidden md:inline-flex px-4 py-2 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 font-medium rounded-md text-sm transition-colors"
          >
            <span className="hidden lg:inline">Hire Me</span>
            <span className="lg:hidden">Hire</span>
          </Link>
        </div>
      </nav>
    </header>
  );
}
