import { About } from "@/components/sections/About";
import { Certifications } from "@/components/sections/Certifications";
import { Contact } from "@/components/sections/Contact";
import { Experience } from "@/components/sections/Experience";
import { Education } from "@/components/sections/Education";
import { Hero } from "@/components/sections/Hero";
import { Projects } from "@/components/sections/Projects";
import { Skills } from "@/components/sections/Skills";
import { Testimonials } from "@/components/sections/Testimonials";
import portfolioData from "@/data/portfolio.json";

export default function Home() {
  return (
    <>
      <Hero />
      <About personal={portfolioData.personal} summary={portfolioData.summary} />
      <Skills skills={portfolioData.skills} />
      <Experience experience={portfolioData.experience} />
      <Education education={portfolioData.education} />
      <Projects projects={portfolioData.projects} />
      <Certifications certifications={portfolioData.certifications} />
      <Testimonials testimonials={portfolioData.testimonials} />
      <Contact />
    </>
  );
}
