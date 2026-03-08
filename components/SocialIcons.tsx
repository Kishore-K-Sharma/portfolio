'use client'

import { Github, Linkedin, Twitter } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

const socialLinks = [
    { name: "GitHub", href: "https://github.com/kishore-kumar-sharma/", icon: Github },
    { name: "LinkedIn", href: "https://www.linkedin.com/in/kishore-kumar-sharma-product-engineer/", icon: Linkedin },
    { name: "Twitter", href: "#", icon: Twitter },
  ];

export const SocialIcons = () => {
  return (
    <div className="flex items-center gap-6">
      {socialLinks.map((social, index) => (
        <motion.div
          key={social.name}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 + index * 0.1 }}
        >
          <Link
            href={social.href}
            aria-label={`Follow on ${social.name}`}
            className="text-muted-foreground transition-colors hover:text-primary"
          >
            <social.icon className="h-6 w-6" />
          </Link>
        </motion.div>
      ))}
    </div>
  );
};