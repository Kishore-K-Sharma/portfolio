'use client'

import Link from 'next/link';
import { ThemeToggle } from './ThemeToggle';

export function Navigation() {
  return (
    <header className="fixed w-full p-4 bg-transparent z-50">
      <nav className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-2xl font-serif font-bold text-primary">
          KKS
        </Link>
        <div className="flex items-center space-x-6">
          <Link href="#projects" className="text-secondary hover:text-primary transition-colors">Projects</Link>
          <Link href="#contact" className="text-secondary hover:text-primary transition-colors">Contact</Link>
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
