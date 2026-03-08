'use client'

import { motion } from 'framer-motion';
import { ExternalLink, Github } from 'lucide-react';

const projects = [
  {
    title: "DIA Platform",
    category: "Telecom / Enterprise",
    description: "Architected a high-concurrency microservices ecosystem for a national telecom rollout, integrating 30+ legacy and modern services.",
    tech: ["Java 17", "Spring Boot", "AWS", "Redis"],
    link: "#"
  },
  {
    title: "FinTech CRM Engine",
    category: "Financial Services",
    description: "Automated end-to-end loan processing, significantly reducing operational latency and improving data integrity for thousands of users.",
    tech: ["React", "Node.js", "PostgreSQL", "Docker"],
    link: "#"
  },
  {
    title: "Real-time EdTech Core",
    category: "Education",
    description: "Built the foundation for a real-time classroom experience, supporting high-fidelity synchronous interaction and digital whiteboarding.",
    tech: ["Socket.io", "Express", "MongoDB", "React Native"],
    link: "#"
  },
  {
    title: "Network Planning Portal",
    category: "Infrastructure",
    description: "A data-driven visualization and planning tool for telecom network spectrum management and leasing strategies.",
    tech: ["Angular", "Spring Cloud", "MySQL", "AWS Lambda"],
    link: "#"
  }
];

export function Projects() {
  return (
    <motion.section
      id="projects"
      className="py-32"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-serif font-bold text-primary mb-4">Featured Projects</h2>
          <p className="text-secondary max-w-2xl mx-auto text-lg">
            A selection of projects that demonstrate my technical expertise and strategic approach to problem-solving.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {projects.map((project, idx) => (
            <motion.div
              key={idx}
              className="bg-card p-8 rounded-lg shadow-card hover:shadow-lg transition-shadow duration-300 flex flex-col"
              whileHover={{ y: -5 }}
            >
              <h3 className="text-2xl font-bold text-primary mb-2">{project.title}</h3>
              <p className="text-accent font-medium mb-4">{project.category}</p>
              <p className="text-secondary mb-6 flex-grow">{project.description}</p>
              <div className="flex flex-wrap gap-2 mb-6">
                {project.tech.map((t) => (
                  <span key={t} className="px-3 py-1 bg-gray-100 dark:bg-gray-800 border border-border rounded-full text-xs font-medium text-secondary">
                    {t}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-4">
                <a href="#" className="text-secondary hover:text-primary transition-colors">
                  <Github className="w-5 h-5" />
                </a>
                <a href="#" className="text-secondary hover:text-primary transition-colors">
                  <ExternalLink className="w-5 h-5" />
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
