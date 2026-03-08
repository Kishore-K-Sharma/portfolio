'use client'

import { motion } from "framer-motion";
import { SocialIcons } from "./SocialIcons";

export function Footer() {
  return (
    <motion.footer
      className="py-12 mt-32 border-t border-border/20 bg-secondary/20"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="text-center md:text-left">
          <p className="font-bold text-primary text-lg">Kishore Kumar Sharma</p>
          <p className="text-muted-foreground">Senior Full Stack Engineer</p>
        </div>
        <SocialIcons />
        <div className="text-center md:text-right text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} All rights reserved.</p>
            <p>Designed & Built with Next.js</p>
        </div>
      </div>
    </motion.footer>
  );
}
