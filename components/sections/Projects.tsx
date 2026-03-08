import { Github, ExternalLink } from 'lucide-react';

const ProjectCard = ({ project }: { project: any }) => (
  <div className="bg-card dark:bg-card/60 border border-border/20 rounded-lg p-6 shadow-lg hover:shadow-xl hover:border-primary/30 transition-all duration-300 flex flex-col h-full">
    <div className="flex-grow">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-bold font-space-grotesk text-primary">{project.title}</h3>
        <div className="flex items-center gap-4">
          {project.githubUrl && (  // Correctly check for githubUrl
            <a href={project.githubUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
              <Github className="w-5 h-5" />
            </a>
          )}
          {project.liveUrl && (  // Correctly check for liveUrl
            <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
              <ExternalLink className="w-5 h-5" />
            </a>
          )}
        </div>
      </div>
      <p className="text-muted-foreground text-sm mb-4">{project.description}</p>
    </div>
    <div className="flex flex-wrap gap-2 mt-auto">
      {project.technologies.map((tech: string, index: number) => (
        <span key={index} className="bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary/80 text-xs font-semibold px-2.5 py-1 rounded-full">
          {tech}
        </span>
      ))}
    </div>
  </div>
);

export function Projects({ projects }: { projects: any[] }) {
  return (
    <section id="projects" className="py-32">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold font-space-grotesk text-primary mb-4">Featured Projects</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            A collection of my work, from personal experiments to client deliverables.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects && projects.map((project, index) => (
            <ProjectCard key={index} project={project} />
          ))}
        </div>
      </div>
    </section>
  );
}
