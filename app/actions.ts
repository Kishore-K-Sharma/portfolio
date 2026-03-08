'use server'

import { z } from 'zod'

const contactFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  message: z.string().min(1, 'Message is required'),
});

export async function submitContactForm(prevState: any, formData: FormData) {
    const validatedFields = contactFormSchema.safeParse({
        name: formData.get('name'),
        email: formData.get('email'),
        message: formData.get('message'),
    });

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Please correct the errors and try again.',
            success: false,
        };
    }

    // In a real-world application, you would integrate a service like Resend or SendGrid to send an email,
    // or save the form data to a database. For this demo, we'll just log the data.
    console.log("New inquiry received:", validatedFields.data);

    return {
        message: 'Thank you for your message! I will get back to you soon.',
        success: true,
        errors: undefined,
    };
}
