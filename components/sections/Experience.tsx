'use client';
import { motion } from "framer-motion";
import { Briefcase, Calendar, ChevronRight } from 'lucide-react';
import { sectionVariants, cardVariants } from "@/styles/animations";

const ProjectInExperienceCard = ({ project }: { project: any }) => (
  <div className="bg-background/80 dark:bg-background/50 border border-border/40 rounded-md p-4 mt-4">
    <h4 className="font-semibold text-foreground text-sm mb-1">{project.title}</h4>
    <p className="text-xs text-muted-foreground mb-2 flex flex-row items-center">
      <Calendar className="w-3 h-3 mr-1" /> {project.duration}
    </p>
    <p className="text-sm text-muted-foreground leading-relaxed">{project.description}</p>
  </div>
);

const ExperienceCard = ({ experience }: { experience: any }) => (
  <motion.div
    variants={cardVariants}
    className="relative pl-8 md:pl-0"
  >
    {/* Timeline Dot (Mobile) */}
    <div className="md:hidden absolute left-0 top-1.5 w-3 h-3 rounded-full bg-primary border-2 border-background z-10" />

    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 hover:bg-muted/30 p-4 md:p-6 rounded-xl transition-colors duration-300">
      <div className="md:col-span-3 pt-1">
        <p className="text-sm font-semibold text-muted-foreground tracking-wide uppercase">
          {experience.startDate} — {experience.endDate}
        </p>
      </div>

      <div className="md:col-span-9 relative">
        <h3 className="text-2xl font-bold font-space-grotesk text-foreground mb-1 group-hover:text-primary transition-colors">
          {experience.role}
        </h3>
        <div className="flex items-center text-primary font-medium mb-4">
          <Briefcase className="w-4 h-4 mr-2" />
          <span>{experience.company}</span>
        </div>

        <ul className="space-y-3 text-muted-foreground mb-6">
          {experience.description.map((desc: string, index: number) => (
            <li key={index} className="flex">
              <ChevronRight className="w-4 h-4 mr-2 mt-1 text-primary shrink-0" />
              <span className="leading-relaxed">{desc}</span>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap gap-2 mb-6">
          {experience.technologies.map((tech: string, index: number) => (
            <span key={index} className="bg-secondary text-secondary-foreground text-xs font-semibold px-3 py-1 rounded-md border border-border/50">
              {tech}
            </span>
          ))}
        </div>

        {experience.projects && experience.projects.length > 0 && (
          <div className="mt-4 border-t border-border/40 pt-4">
            <h4 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase mb-3">Key Projects Involved</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {experience.projects.map((project: any, index: number) => (
                <ProjectInExperienceCard key={index} project={project} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  </motion.div>
);

export function Experience({ experience }: { experience: any[] }) {
  return (
    <motion.section
      id="experience"
      className="py-24"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
      variants={sectionVariants}
    >
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mb-16">
          <h2 className="text-sm font-bold tracking-widest text-primary uppercase mb-3">Career Path</h2>
          <h3 className="text-3xl md:text-5xl font-bold font-space-grotesk text-foreground mb-6 tracking-tight">
            Professional Experience
          </h3>
          <p className="text-muted-foreground text-lg leading-relaxed">
            My journey from individual contributor to engineering leader, architecting robust systems at scale.
          </p>
        </div>

        <div className="relative w-full">
          {/* Timeline Line (Mobile format - hidden on md) */}
          <div className="md:hidden absolute left-1.5 top-2 bottom-2 w-px bg-border/60" />

          <div className="space-y-8 md:space-y-12">
            {experience.map((exp, index) => (
              <ExperienceCard key={index} experience={exp} />
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  )
}
