import { Sun } from 'lucide-react';

export function ThemeToggle() {
  return (
    <button
      className="p-2 rounded-full bg-secondary/50 dark:bg-secondary/80 text-secondary-foreground hover:bg-secondary/70 dark:hover:bg-secondary transition-colors"
      aria-label="Toggle theme"
    >
      <Sun className="h-5 w-5" />
    </button>
  );
}
