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
      viewport={{ once: true, amount: 0.1 }}
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
            <div className="relative w-64 h-64 md:w-80 md:h-80 rounded-2xl overflow-hidden shadow-2xl border border-border/40 rotate-2 hover:rotate-0 transition-all duration-300">
              <Image
                src="/profile-picture.jpg"
                alt={personal?.name || "Kishore Kumar Sharma"}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 ring-1 ring-inset ring-black/10 rounded-2xl"></div>
            </div>
          </div>
          <div className="lg:col-span-7">
            <div className="space-y-6 text-muted-foreground text-lg leading-relaxed font-light">
              {summary ? (
                <p>{summary}</p>
              ) : (
                <>
                  <p>
                    Hello! I&apos;m Kishore Kumar Sharma, a passionate and results-oriented Senior Full Stack Engineer with over 6 years of experience in designing, developing, and deploying high-performance web applications. My journey in tech has been driven by a relentless curiosity and a desire to build things that make a difference.
                  </p>
                  <p>
                    I specialize in the MERN stack (MongoDB, Express.js, React, Node.js) and have a strong command of modern front-end and back-end technologies. I&apos;m adept at creating seamless user experiences and robust server-side logic.
                  </p>
                </>
              )}
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4 border-t border-border/40 pt-8">
              <div>
                <p className="text-sm text-primary font-bold uppercase tracking-wider mb-1">Location</p>
                <p className="font-medium text-foreground">{personal?.location || "Bangalore, India"}</p>
              </div>
              <div>
                <p className="text-sm text-primary font-bold uppercase tracking-wider mb-1">Experience</p>
                <p className="font-medium text-foreground">{personal?.experienceYears || "6+"} Years</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
