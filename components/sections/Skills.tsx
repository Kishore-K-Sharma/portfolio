'use client';
import { motion } from "framer-motion";
import { Server, Layout, Cloud, Database, Layers, BrainCircuit, Users, Terminal } from 'lucide-react';
import { sectionVariants, cardVariants } from "@/styles/animations";

const categoryMap: Record<string, { label: string, icon: any }> = {
  backend: { label: "Backend Engineering", icon: Server },
  frontend: { label: "Frontend Engineering", icon: Layout },
  cloudDevOps: { label: "Cloud & DevOps", icon: Cloud },
  databases: { label: "Databases", icon: Database },
  architecturePractices: { label: "Architecture & Systems Design", icon: Layers },
  aiDeveloperProductivity: { label: "AI & Productivity", icon: BrainCircuit },
  softwareEngineering: { label: "Software Engineering", icon: Terminal },
  softSkills: { label: "Leadership & Delivery", icon: Users }
};

const SkillCard = ({ category, skills }: { category: string, skills: string[] }) => {
  const config = categoryMap[category] || { label: category.replace(/([A-Z])/g, ' $1').trim(), icon: Server };
  const Icon = config.icon;

  return (
    <motion.div
      className="bg-card/50 dark:bg-card/30 border border-border/40 backdrop-blur-md rounded-xl p-6 shadow-sm hover:shadow-md hover:border-border/80 transition-all duration-300 group"
      variants={cardVariants}
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-primary/10 rounded-lg text-primary group-hover:bg-primary/20 transition-colors">
          <Icon className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-semibold font-space-grotesk text-foreground">{config.label}</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {skills.map((skill: string, index: number) => (
          <span
            key={index}
            className="px-3 py-1.5 bg-secondary/80 text-secondary-foreground text-sm font-medium rounded-md border border-border/50 group-hover:bg-secondary group-hover:border-border/80 transition-colors duration-300"
          >
            {skill}
          </span>
        ))}
      </div>
    </motion.div>
  );
};

export function Skills({ skills }: { skills: any }) {
  const skillCategories = Object.keys(skills);

  return (
    <motion.section
      id="skills"
      className="py-24 bg-secondary/30 dark:bg-black/20"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: false, amount: 0.1 }}
      variants={sectionVariants}
    >
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mb-16">
          <h2 className="text-sm font-bold tracking-widest text-primary uppercase mb-3">Technical Arsenal</h2>
          <h3 className="text-3xl md:text-5xl font-bold font-space-grotesk text-foreground mb-6 tracking-tight">
            Engineering Depth & Breadth
          </h3>
          <p className="text-muted-foreground text-lg leading-relaxed">
            I specialize in building full-stack systems from the ground up, combining robust backend architecture with intuitive frontend interfaces.
          </p>
        </div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, amount: 0.1 }}
          variants={{
            visible: { transition: { staggerChildren: 0.1 } }
          }}
        >
          {skillCategories.map((category, index) => (
            <SkillCard key={index} category={category} skills={skills[category]} />
          ))}
        </motion.div>
      </div>
    </motion.section>
  )
}
