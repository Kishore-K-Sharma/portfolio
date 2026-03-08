'use client'

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { useState } from 'react';

const contactFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  message: z.string().min(1, 'Message is required'),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

export function Contact() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{ success: boolean; message: string } | null>(null);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
  });

  const onSubmit = async (data: ContactFormValues) => {
    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        setSubmitStatus({ success: true, message: result.message });
        reset();
      } else {
        setSubmitStatus({ success: false, message: result.error || 'Something went wrong' });
      }
    } catch (error) {
      setSubmitStatus({ success: false, message: 'Something went wrong' });
    }

    setIsSubmitting(false);
  };

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
          <h2 className="text-3xl md:text-5xl font-serif font-bold text-primary mb-4">Let&apos;s Connect</h2>
          <p className="text-secondary max-w-2xl mx-auto text-lg">
            I&apos;m always open to discussing new projects, creative ideas, or opportunities to be part of an ambitious vision. 
          </p>
        </div>

        <div className="max-w-xl mx-auto bg-card p-8 rounded-lg shadow-card">
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="mb-6">
              <label htmlFor="name" className="block mb-2 text-sm font-medium text-primary">Name</label>
              <input {...register('name')} id="name" className={`w-full p-3 rounded-md bg-gray-100 dark:bg-gray-800 border ${errors.name ? 'border-red-500' : 'border-border'} focus:ring-accent focus:border-accent transition`} />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
            </div>
            <div className="mb-6">
              <label htmlFor="email" className="block mb-2 text-sm font-medium text-primary">Email</label>
              <input {...register('email')} id="email" className={`w-full p-3 rounded-md bg-gray-100 dark:bg-gray-800 border ${errors.email ? 'border-red-500' : 'border-border'} focus:ring-accent focus:border-accent transition`} />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
            </div>
            <div className="mb-6">
              <label htmlFor="message" className="block mb-2 text-sm font-medium text-primary">Message</label>
              <textarea {...register('message')} id="message" rows={5} className={`w-full p-3 rounded-md bg-gray-100 dark:bg-gray-800 border ${errors.message ? 'border-red-500' : 'border-border'} focus:ring-accent focus:border-accent transition`} />
              {errors.message && <p className="text-red-500 text-sm mt-1">{errors.message.message}</p>}
            </div>
            <button type="submit" disabled={isSubmitting} className="w-full py-3 px-6 bg-primary text-white font-semibold rounded-md hover:bg-opacity-90 transition-all disabled:bg-gray-500 shadow-interactive">
              {isSubmitting ? 'Submitting...' : 'Send Inquiry'}
            </button>
            {submitStatus && (
              <p className={`mt-4 text-center ${submitStatus.success ? 'text-green-500' : 'text-red-500'}`}>
                {submitStatus.message}
              </p>
            )}
          </form>
        </div>
      </div>
    </motion.section>
  );
}
