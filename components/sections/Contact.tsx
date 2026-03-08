'use client'

import { useFormState, useFormStatus } from 'react-dom';
import { submitContactForm } from '@/app/actions';
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Send } from 'lucide-react';

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
      className="w-full relative inline-flex items-center justify-center p-0.5 mb-2 me-2 overflow-hidden text-sm font-medium text-primary-foreground dark:text-white rounded-lg group bg-primary dark:bg-gradient-to-br dark:from-cyan-500 dark:to-blue-500 hover:bg-primary/90 dark:hover:text-white focus:ring-4 focus:outline-none focus:ring-primary/50 dark:focus:ring-cyan-800 disabled:opacity-50 disabled:cursor-not-allowed"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
        <span className="w-full relative px-5 py-2.5 transition-all ease-in duration-75 bg-primary dark:bg-gray-900 rounded-md group-hover:bg-opacity-0">
            <div className="flex items-center justify-center gap-2">
                {pending ? (
                    <>
                        <div className="w-4 h-4 border-2 border-dashed rounded-full animate-spin border-white"></div>
                        <span>Submitting...</span>
                    </>
                ) : (
                    <>
                        <Send className="w-4 h-4"/>
                        <span>Send Inquiry</span>
                    </>
                )}
            </div>
        </span>
    </motion.button>
  );
}

const InputField = ({ name, label, type = 'text', errors, ...props }: any) => (
    <div className="mb-6">
        <label htmlFor={name} className="block mb-2 text-sm font-medium text-muted-foreground dark:text-primary/80">{label}</label>
        <input 
            name={name} 
            id={name} 
            type={type}
            className={`w-full p-3 rounded-md bg-background dark:bg-background/70 border ${errors ? 'border-destructive' : 'border-border/30'} focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300 shadow-inner`}
            {...props}
        />
        {errors && <p className="text-destructive text-sm mt-1">{errors[0]}</p>}
    </div>
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
      className="py-32"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold font-space-grotesk text-primary mb-4">Let&apos;s Build Together</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Have a project in mind, a question, or just want to connect? I&apos;m here to listen. Drop me a line and I&apos;ll get back to you soon.
          </p>
        </div>

        <div className="relative max-w-2xl mx-auto">
          <div className="absolute -inset-2 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 dark:from-cyan-500 dark:to-blue-500 dark:opacity-25 dark:group-hover:opacity-75 animate-tilt"></div>
          <div className="relative bg-card dark:bg-background/80 backdrop-blur-xl border border-border/20 rounded-lg p-8 shadow-2xl">
            <form ref={formRef} action={formAction}>
              <InputField name="name" label="Your Name" errors={state.errors?.name} />
              <InputField name="email" label="Your Email" type="email" errors={state.errors?.email} />
              <div className="mb-6">
                <label htmlFor="message" className="block mb-2 text-sm font-medium text-muted-foreground dark:text-primary/80">Your Message</label>
                <textarea 
                  name="message" 
                  id="message" 
                  rows={5} 
                  className={`w-full p-3 rounded-md bg-background dark:bg-background/70 border ${state.errors?.message ? 'border-destructive' : 'border-border/30'} focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300 shadow-inner`}
                />
                {state.errors?.message && <p className="text-destructive text-sm mt-1">{state.errors.message[0]}</p>}
              </div>
              <SubmitButton />
              {state.message && (
                <p className={`mt-4 text-center text-sm ${state.success ? 'text-green-400' : 'text-destructive'}`}>
                  {state.message}
                </p>
              )}
            </form>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
