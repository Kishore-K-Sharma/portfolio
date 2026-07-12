import { Hero } from "@/components/sections/Hero";
import { Manifesto } from "@/components/sections/Manifesto";
import { TestimonialBand } from "@/components/TestimonialBand";
import { Capability } from "@/components/sections/Capability";
import { CaseStudies } from "@/components/sections/CaseStudies";
import { ProofGrid } from "@/components/sections/ProofGrid";
import { Education } from "@/components/sections/Education";
import { Contact } from "@/components/sections/Contact";
import { SectionRail } from "@/components/SectionRail";
import { listNotes } from "@/lib/notes";

export default function Home() {
  const latestNotes = listNotes().slice(0, 4).map((n) => ({
    slug: n.slug,
    title: n.title,
    description: n.description,
    date: n.date,
    category: n.category,
    readMin: n.readMin,
  }));

  return (
    <>
      <SectionRail />
      <Hero />
      <Manifesto />
      <TestimonialBand />
      <Capability />
      <CaseStudies />
      <ProofGrid latestNotes={latestNotes} />
      <Education />
      <Contact />
    </>
  );
}
