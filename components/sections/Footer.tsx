export function Footer() {
  return (
    <footer className="bg-background border-t border-border/10">
      <div className="container mx-auto px-6 py-8">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} Kishore Kumar Sharma. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
