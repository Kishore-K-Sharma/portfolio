import Image from 'next/image';

export function About({ personal, summary }: { personal: any, summary: string }) {
  return (
    <section 
      id="about"
      className="py-24 sm:py-32 bg-secondary/50 dark:bg-secondary/20"
    >
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 items-center">
          <div className="md:col-span-1">
            <div className="relative w-48 h-48 mx-auto md:mx-0">
              <div 
                className="absolute inset-0 rounded-full bg-gradient-to-br from-primary to-accent opacity-50 dark:opacity-30 blur-xl"
              />
              <Image src="/profile-picture.jpg" alt={personal.name} width={192} height={192} className="relative rounded-full object-cover shadow-2xl" />
            </div>
          </div>
          <div className="md:col-span-2 text-center md:text-left">
            <h2 className="text-3xl md:text-5xl font-bold font-space-grotesk text-primary mb-6">About Me</h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-8">
              {summary}
            </p>
            <div className="flex flex-wrap justify-center md:justify-start gap-x-8 gap-y-4 text-left">
              <div className="text-foreground">
                <span className="text-sm text-muted-foreground">Experience</span>
                <p className="font-semibold">{personal.experienceYears} Years</p>
              </div>
              <div className="text-foreground">
                <span className="text-sm text-muted-foreground">Location</span>
                <p className="font-semibold">{personal.location}</p>
              </div>
              <div className="text-foreground">
                <span className="text-sm text-muted-foreground">Email</span>
                <p className="font-semibold">{personal.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
