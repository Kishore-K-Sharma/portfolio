import Link from 'next/link';
import { ThemeToggle } from './ThemeToggle';

export function Navigation() {
  return (
    <header 
      className={`fixed w-full p-4 z-50 transition-all duration-300`}>
      <nav className={`container mx-auto flex justify-between items-center transition-all duration-300 rounded-lg p-4 bg-background/80 backdrop-blur-xl border border-border/10 dark:border-border/20 shadow-lg`}>
        <Link href="/" className="text-2xl font-bold font-space-grotesk text-primary">
          KKS
        </Link>
        <div className="hidden md:flex items-center space-x-8 text-lg">
          <Link href="#skills" className="text-muted-foreground hover:text-primary transition-colors duration-300">Skills</Link>
          <Link href="#experience" className="text-muted-foreground hover:text-primary transition-colors duration-300">Experience</Link>
          <Link href="#projects" className="text-muted-foreground hover:text-primary transition-colors duration-300">Projects</Link>
          <Link href="#contact" className="text-muted-foreground hover:text-primary transition-colors duration-300">Contact</Link>
        </div>
        <div className="flex items-center space-x-4">
          <ThemeToggle />
          <Link href="#contact" className="md:hidden px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-md text-sm">
              Contact
          </Link>
        </div>
      </nav>
    </header>
  );
}
