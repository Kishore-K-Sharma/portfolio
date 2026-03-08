'use client'

import { motion } from 'framer-motion';

const experiences = [
  {
    company: "Tata Consultancy Services",
    role: "Systems Engineer",
    period: "May 2023 – Present",
    achievements: [
      "Architected scalable microservices for a pan-India telecom rollout using Java 17 and Spring Boot 3.",
      "Successfully integrated 30+ disparate enterprise systems into a unified platform.",
      "Drove a 30% improvement in mission-critical API performance through strategic optimization.",
      "Championed engineering best practices and mentored junior development staff."
    ],
  },
  {
    company: "Credenc Web Technologies",
    role: "Software Engineer",
    period: "Oct 2021 – May 2023",
    achievements: [
      "Digital transformation of CRM and loan processing platforms, reducing manual overhead by 70%.",
      "Designed and implemented high-performance RESTful APIs to support complex financial transactions.",
      "Established robust CI/CD pipelines on AWS, accelerating release cycles.",
      "Implemented security protocols to ensure compliance with financial data standards."
    ],
  },
  {
    company: "Skaplink Technologies",
    role: "Full Stack Developer",
    period: "Mar 2020 – Sep 2021",
    achievements: [
      "Built a highly-available real-time tutoring platform leveraging Socket.io for synchronous communication.",
      "Developed cross-platform mobile applications, expanding market reach.",
      "Engineered secure payment gateway integrations for seamless transactions."
    ],
  },
];

export function Experience() {
  return (
    <motion.section
      id="experience"
      className="py-32 bg-white dark:bg-gray-900"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="container mx-auto px-6">
        <h2 className="text-3xl md:text-5xl font-serif font-bold text-primary mb-16 text-center">Professional Journey</h2>
        <div className="relative max-w-4xl mx-auto">
          <div className="absolute left-1/2 -translate-x-1/2 h-full w-px bg-border" />
          {experiences.map((exp, index) => (
            <div key={index} className={`flex items-center w-full mb-16 ${index % 2 === 0 ? 'flex-row-reverse' : ''}`}>
              <div className="w-1/2 px-8">
                <motion.div 
                  className="bg-card p-8 rounded-lg shadow-card"
                  initial={{ opacity: 0, x: index % 2 === 0 ? 50 : -50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                >
                  <h3 className="text-2xl font-bold text-primary mb-2">{exp.company}</h3>
                  <p className="text-accent font-medium mb-2">{exp.role}</p>
                  <p className="text-secondary text-sm mb-4">{exp.period}</p>
                  <ul className="space-y-3 text-secondary">
                    {exp.achievements.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-accent font-bold mt-1">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              </div>
              <div className="w-1/2 flex justify-center">
                <div className="w-4 h-4 bg-accent rounded-full z-10" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
