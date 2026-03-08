'use client';
import { motion } from "framer-motion";
import { Github, ExternalLink } from 'lucide-react';
import { sectionVariants, cardVariants } from "@/styles/animations";

const ProjectCard = ({ project }: { project: any }) => (
  <motion.div
    className="group bg-card/60 dark:bg-card/20 border border-border/40 backdrop-blur-sm rounded-xl overflow-hidden shadow-sm hover:shadow-lg hover:border-border/80 transition-all duration-300 flex flex-col h-full"
    variants={cardVariants}
  >
    <div className="p-6 md:p-8 flex-grow flex flex-col">
      <div className="flex justify-between items-start mb-6">
        <div>
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2">Case Study</p>
          <h3 className="text-2xl font-bold font-space-grotesk text-foreground mb-2 group-hover:text-primary transition-colors leading-tight">{project.title}</h3>
        </div>
        <div className="flex items-center gap-2">
          {project.githubUrl && (
            <a href={project.githubUrl} target="_blank" rel="noopener noreferrer" className="p-2 bg-secondary/80 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="View Source">
              <Github className="w-5 h-5" />
            </a>
          )}
          {project.liveUrl && (
            <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" className="p-2 bg-secondary/80 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="Live Demo">
              <ExternalLink className="w-5 h-5" />
            </a>
          )}
        </div>
      </div>

      <p className="text-muted-foreground text-base leading-relaxed mb-8 flex-grow">
        {project.description}
      </p>

      <div>
        <h4 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-3">Tech Stack Architecture</h4>
        <div className="flex flex-wrap gap-2">
          {project.technologies.map((tech: string, index: number) => (
            <span key={index} className="bg-background border border-border/60 text-foreground text-xs font-medium px-3 py-1.5 rounded-md shadow-sm">
              {tech}
            </span>
          ))}
        </div>
      </div>
    </div>
  </motion.div>
);

export function Projects({ projects }: { projects: any[] }) {
  return (
    <motion.section
      id="projects"
      className="py-24 bg-secondary/50 dark:bg-secondary/10"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
      variants={sectionVariants}
    >
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mb-16">
          <h2 className="text-sm font-bold tracking-widest text-primary uppercase mb-3">Portfolio</h2>
          <h3 className="text-3xl md:text-5xl font-bold font-space-grotesk text-foreground mb-6 tracking-tight">
            Selected Engineering Works
          </h3>
          <p className="text-muted-foreground text-lg leading-relaxed">
            A showcase of distributed systems, full-stack applications, and technical architectures I've designed and delivered.
          </p>
        </div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          variants={{
            visible: { transition: { staggerChildren: 0.15 } }
          }}
        >
          {projects && projects.map((project, index) => (
            <ProjectCard key={index} project={project} />
          ))}
        </motion.div>
      </div>
    </motion.section>
  );
}
