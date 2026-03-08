'use client';
import { motion } from "framer-motion";
import { sectionVariants } from "@/styles/animations";
import Image from "next/image";

export function About({ personal, summary }: { personal: any, summary: string }) {
  return (
    <motion.section
      id="about"
      className="py-24 bg-background relative overflow-hidden"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: false, amount: 0.1 }}
      variants={sectionVariants}
    >
      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-3xl mb-16 mx-auto text-center">
          <h2 className="text-sm font-bold tracking-widest text-primary uppercase mb-3">About The Engineer</h2>
          <h3 className="text-3xl md:text-5xl font-bold font-space-grotesk text-foreground mb-6 tracking-tight">
            Architecting Digital Solutions
          </h3>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center max-w-6xl mx-auto">
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-[280px] h-[373px] md:w-[320px] md:h-[426px] rounded-2xl overflow-hidden shadow-2xl border border-border/40 rotate-2 hover:rotate-0 transition-transform duration-500 bg-gradient-to-br from-primary/10 via-background to-background shrink-0">
              <Image
                src="/profile-picture.jpg"
                alt={personal.name}
                fill
                priority
                className="object-cover object-top filter hover:contrast-105 transition-all duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent pointer-events-none mix-blend-overlay"></div>
              <div className="absolute inset-0 ring-1 ring-inset ring-black/10 dark:ring-white/10 rounded-2xl pointer-events-none"></div>
            </div>
          </div>
          <div className="lg:col-span-7">
            <div className="space-y-6 text-muted-foreground text-lg leading-relaxed font-light">
              <p>{summary}</p>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4 border-t border-border/40 pt-8">
              <div>
                <p className="text-sm text-primary font-bold uppercase tracking-wider mb-1">Location</p>
                <p className="font-medium text-foreground">{personal.location}</p>
              </div>
              <div>
                <p className="text-sm text-primary font-bold uppercase tracking-wider mb-1">Experience</p>
                <p className="font-medium text-foreground">{personal.experienceYears} Years</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
