'use client'

import { Terminal } from "lucide-react";
import { SocialIcons } from "./SocialIcons";

export function Footer() {
  return (
    <footer className="py-12 border-t border-border/40 bg-background">
      <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-2 text-xl font-bold font-space-grotesk text-foreground tracking-tight">
          <Terminal className="w-5 h-5 text-primary" />
          <span>Kishore<span className="text-primary">.dev</span></span>
        </div>

        <SocialIcons />

        <div className="text-center md:text-right text-sm text-muted-foreground font-medium">
          <p>&copy; {new Date().getFullYear()} Kishore Kumar Sharma.</p>
          <p>Built with Next.js & Tailwind</p>
        </div>
      </div>
    </footer>
  );
}
