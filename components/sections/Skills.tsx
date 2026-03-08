'use client'

import { motion } from 'framer-motion';
import { Server, Layout, Database, Cloud, Shield, BarChart3 } from 'lucide-react';

const skillCategories = [
  {
    title: "Backend Architecture",
    icon: <Server className="w-6 h-6 text-accent" />,
    skills: ["Java 17+", "Spring Boot 3", "Spring Cloud", "Node.js", "NestJS", "Microservices"]
  },
  {
    title: "Frontend Engineering",
    icon: <Layout className="w-6 h-6 text-accent" />,
    skills: ["React", "Angular", "TypeScript", "Next.js", "State Management", "Performance"]
  },
  {
    title: "Cloud & DevOps",
    icon: <Cloud className="w-6 h-6 text-accent" />,
    skills: ["AWS", "Docker", "Jenkins", "GitHub Actions", "CI/CD Pipelines", "Kubernetes"]
  },
  {
    title: "Data Strategy",
    icon: <Database className="w-6 h-6 text-accent" />,
    skills: ["PostgreSQL", "MySQL", "MongoDB", "Redis", "Caching", "Indexing"]
  },
  {
    title: "Security & Ops",
    icon: <Shield className="w-6 h-6 text-accent" />,
    skills: ["OAuth2/JWT", "API Security", "SonarQube", "Grafana", "Prometheus", "Logging"]
  },
  {
    title: "Consulting",
    icon: <BarChart3 className="w-6 h-6 text-accent" />,
    skills: ["System Design", "Distributed Systems", "Clean Architecture", "Performance Tuning"]
  }
];

export function Skills() {
  return (
    <motion.section
      id="skills"
      className="py-32"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-serif font-bold text-primary mb-4">Core Competencies</h2>
          <p className="text-secondary max-w-2xl mx-auto text-lg">
            A curated selection of my technical skills, covering the full stack of modern software development and strategic consulting.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {skillCategories.map((cat, idx) => (
            <motion.div
              key={idx}
              className="p-8 bg-card shadow-card rounded-lg hover:shadow-lg transition-shadow duration-300"
              whileHover={{ y: -5 }}
            >
              <div className="flex items-center gap-4 mb-6">
                {cat.icon}
                <h3 className="text-xl font-bold text-primary">{cat.title}</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {cat.skills.map((skill) => (
                  <span key={skill} className="px-3 py-1 bg-gray-100 dark:bg-gray-800 border border-border rounded-full text-sm font-medium text-secondary">
                    {skill}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
