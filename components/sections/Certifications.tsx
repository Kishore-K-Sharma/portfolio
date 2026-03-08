import { Award } from 'lucide-react';

const CertificationCard = ({ certification }: { certification: any }) => (
  <div 
    className="bg-card dark:bg-card/60 border border-border/20 rounded-lg p-6 flex items-center gap-6 shadow-lg transition-all duration-300 hover:shadow-xl hover:border-primary/30"
  >
    <div className="bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary/80 p-4 rounded-full">
      <Award className="w-8 h-8" />
    </div>
    <div>
      <h3 className="text-lg font-bold font-space-grotesk text-primary">{certification.title}</h3>
    </div>
  </div>
);

export function Certifications({ certifications }: { certifications: any[] }) {
  return (
    <section 
      id="certifications"
      className="py-32 bg-secondary/50 dark:bg-secondary/20"
    >
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold font-space-grotesk text-primary mb-4">Licenses & Certifications</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Validation of my skills and knowledge through professional certifications.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {certifications.map((certification, index) => (
                <CertificationCard key={index} certification={certification} />
            ))}
        </div>
      </div>
    </section>
  )
}
