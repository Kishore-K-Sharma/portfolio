'use client'

import { Github, Linkedin, Mail } from 'lucide-react';

export function Footer() {
  return (
    <footer className="py-8 bg-card border-t border-border">
      <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center text-secondary">
        <p className="text-sm mb-4 md:mb-0">&copy; {new Date().getFullYear()} Kishore Kumar Sharma. All Rights Reserved.</p>
        <div className="flex justify-center space-x-6">
          <a href="https://www.linkedin.com/in/kishore-kumar-sharma-product-engineer/" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
            <Linkedin className="h-5 w-5" />
          </a>
          <a href="https://github.com/kishore-kumar-sharma" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
            <Github className="h-5 w-5" />
          </a>
          <a href="mailto:kishoresharma914@gmail.com" className="hover:text-primary transition-colors">
            <Mail className="h-5 w-5" />
          </a>
        </div>
      </div>
    </footer>
  );
}
