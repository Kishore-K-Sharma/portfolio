import { Briefcase } from 'lucide-react';

const ProjectInExperienceCard = ({ project }: { project: any }) => (
  <div className="bg-background/50 dark:bg-background/20 rounded-lg p-4 mt-4">
      <h4 className="font-bold text-primary">{project.title}</h4>
      <p className="text-sm text-muted-foreground italic mb-2">{project.duration}</p>
      <p className="text-sm text-muted-foreground">{project.description}</p>
  </div>
);

const ExperienceCard = ({ experience, isLeft }: { experience: any, isLeft: boolean }) => (
  <div className={`w-full lg:w-1/2 ${isLeft ? 'lg:pr-8' : 'lg:pl-8'}`}>
    <div className="bg-card dark:bg-card/60 border border-border/20 rounded-lg p-6 shadow-lg hover:shadow-xl hover:border-primary/30 transition-all duration-300 h-full">
      <div className="flex items-start mb-4">
        <div className="bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary/80 p-3 rounded-full mr-4">
          <Briefcase className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-xl font-bold font-space-grotesk text-primary">{experience.role}</h3>
          <p className="text-muted-foreground font-semibold">{experience.company}</p>
          <p className="text-sm text-muted-foreground mt-1">{experience.startDate} - {experience.endDate}</p>
        </div>
      </div>
      <ul className="space-y-3 text-muted-foreground list-disc list-inside mb-4 pl-4">
          {experience.description.map((desc: string, index: number) => (
              <li key={index}>{desc}</li>
          ))}
      </ul>
      <div className="flex flex-wrap gap-2">
          {experience.technologies.map((tech: string, index:number) => (
              <span key={index} className="bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary/80 text-xs font-semibold px-2.5 py-1 rounded-full">
                  {tech}
              </span>
          ))}
      </div>
      {experience.projects && experience.projects.length > 0 && (
          <div className="mt-6">
              <h4 className="text-lg font-bold font-space-grotesk text-primary mb-2">Projects</h4>
              <div className="space-y-4">
                {experience.projects.map((project: any, index: number) => (
                    <ProjectInExperienceCard key={index} project={project} />
                ))}
              </div>
          </div>
      )}
    </div>
  </div>
);

export function Experience({ experience }: { experience: any[] }) {
  return (
    <section id="experience" className="py-32 bg-secondary/50 dark:bg-secondary/20">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold font-space-grotesk text-primary mb-4">Professional Journey</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            A timeline of my career, highlighting key roles, responsibilities, and accomplishments.
          </p>
        </div>

        <div className="relative">
          <div className="hidden lg:block absolute left-1/2 -ml-0.5 w-1 h-full bg-border/40 dark:bg-border/20"></div>
          {experience.map((exp, index) => (
            <div key={index} className={`flex justify-center lg:justify-start ${index % 2 === 0 ? 'lg:flex-row-reverse' : ''} mb-12`}>
              <div className="hidden lg:block absolute left-1/2 -ml-4 w-8 h-8 bg-primary rounded-full border-4 border-background dark:border-background/80 flex items-center justify-center">
                <div className="w-3 h-3 bg-primary-foreground rounded-full"></div>
              </div>
              <ExperienceCard experience={exp} isLeft={index % 2 !== 0} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
