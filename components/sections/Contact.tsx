'use client'

import { useFormState, useFormStatus } from 'react-dom';
import { submitContactForm } from '@/app/actions';
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Send, Loader2, CheckCircle2 } from 'lucide-react';
import { sectionVariants, cardVariants } from "@/styles/animations";

const initialState = {
  message: '',
  success: false,
  errors: undefined,
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <motion.button
      type="submit"
      disabled={pending}
      className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 text-sm font-medium text-primary-foreground bg-primary rounded-md shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
      whileHover={{ y: -1 }}
      whileTap={{ y: 1 }}
    >
      {pending ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          <span>Sending out...</span>
        </>
      ) : (
        <>
          <Send className="w-4 h-4 mr-2" />
          <span>Send Message</span>
        </>
      )}
    </motion.button>
  );
}

const InputField = ({ name, label, type = 'text', errors, ...props }: any) => (
  <motion.div className="mb-6" variants={cardVariants}>
    <label htmlFor={name} className="block mb-2 text-sm font-medium text-foreground">{label}</label>
    <input
      name={name}
      id={name}
      type={type}
      className={`w-full px-4 py-3 rounded-md bg-secondary/50 border ${errors ? 'border-destructive' : 'border-border/60'} focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 text-foreground placeholder:text-muted-foreground`}
      {...props}
    />
    {errors && <p className="text-destructive text-sm mt-1.5">{errors[0]}</p>}
  </motion.div>
);

export function Contact() {
  const [state, formAction] = useFormState(submitContactForm, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <motion.section
      id="contact"
      className="py-24"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: false, amount: 0.1 }}
      variants={sectionVariants}
    >
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mb-16 mx-auto text-center">
          <h2 className="text-sm font-bold tracking-widest text-primary uppercase mb-3">Get in Touch</h2>
          <h3 className="text-3xl md:text-5xl font-bold font-space-grotesk text-foreground mb-6 tracking-tight">
            Let's Build Something Great
          </h3>
          <p className="text-muted-foreground text-lg leading-relaxed">
            I'm currently open for new opportunities and consulting. Whether you have a question or just want to engineer a solution, I'll try my best to get back to you.
          </p>
        </div>

        <motion.div
          className="max-w-xl mx-auto"
          variants={{
            visible: { transition: { staggerChildren: 0.1 } }
          }}
        >
          <motion.div className="bg-card/50 border border-border/40 backdrop-blur-sm rounded-xl p-8 shadow-sm" variants={cardVariants}>
            <form ref={formRef} action={formAction}>
              <InputField name="name" label="Full Name" placeholder="John Doe" errors={state.errors?.name} />
              <InputField name="email" label="Email Address" type="email" placeholder="john@example.com" errors={state.errors?.email} />
              <motion.div className="mb-8" variants={cardVariants}>
                <label htmlFor="message" className="block mb-2 text-sm font-medium text-foreground">Message</label>
                <textarea
                  name="message"
                  id="message"
                  rows={5}
                  placeholder="Tell me about your project architecture..."
                  className={`w-full px-4 py-3 rounded-md bg-secondary/50 border ${state.errors?.message ? 'border-destructive' : 'border-border/60'} focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 text-foreground placeholder:text-muted-foreground resize-none`}
                />
                {state.errors?.message && <p className="text-destructive text-sm mt-1.5">{state.errors.message[0]}</p>}
              </motion.div>

              <div className="flex flex-col sm:flex-row items-center gap-4 justify-between transition-all">
                <SubmitButton />

                {state.message && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`flex items-center text-sm font-medium ${state.success ? 'text-emerald-500' : 'text-destructive'}`}
                  >
                    {state.success && <CheckCircle2 className="w-4 h-4 mr-1.5" />}
                    {state.message}
                  </motion.div>
                )}
              </div>
            </form>
          </motion.div>
        </motion.div>
      </div>
    </motion.section>
  );
}
