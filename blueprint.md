
# Kishore Kumar Sharma - Personal Portfolio

## Overview

This project is a personal portfolio website for Kishore Kumar Sharma, a Senior Full Stack Engineer. The goal is to create a modern, visually appealing, and responsive single-page application that showcases his skills, experience, projects, and certifications. The website is built with Next.js and styled with Tailwind CSS, featuring smooth animations with Framer Motion.

## Project Structure & Features

- **Framework**: Next.js (App Router)
- **Styling**: Tailwind CSS with a custom dark theme.
- **Animations**: Framer Motion for engaging and smooth transitions.
- **Icons**: `lucide-react` for clean and modern iconography.
- **Contact Form**: A functional contact form built with `react-hook-form` and `zod` for validation, backed by a Next.js API route.
- **Theme**: Dark mode by default using `next-themes`.

### Components

- **`Navigation`**: A responsive navigation bar that sticks to the top, providing smooth scrolling to different sections.
- **`Hero`**: An impactful hero section with a headline, social media links, and calls to action.
- **`About`**: A section detailing Kishore's professional background and expertise.
- **`Skills`**: A grid-based layout showcasing technical skills categorized for clarity.
- **`Experience`**: A vertical timeline illustrating work history.
- **`Projects`**: A card-based gallery of key projects with descriptions and technology stacks.
- **`Certifications`**: A section to display certifications and awards.
- **`Contact`**: A contact form for inquiries.
- **`Footer`**: A site footer with social links and copyright information.

## Development Plan

1.  **Project Setup**: Initialize a Next.js project and install all necessary dependencies (`tailwindcss`, `framer-motion`, `lucide-react`, `next-themes`, `react-hook-form`, `zod`).
2.  **Styling and Configuration**:
    *   Configure `tailwind.config.ts` with a custom color palette and animations.
    *   Create a `globals.css` file for base styles.
    *   Create an `animations.ts` file to store reusable `framer-motion` variants.
3.  **Component Creation**: Develop each section of the portfolio as a separate React component in the `components/sections` directory.
4.  **API Route**: Implement a Next.js API route (`app/api/contact/route.ts`) to handle submissions from the contact form.
5.  **Page Assembly**: Assemble all the section components in the main `app/page.tsx` file.
6.  **Layout**: Update the root `app/layout.tsx` to include the `Navigation`, `ThemeProvider`, and global styles.
7.  **Linting and Formatting**: Run `npm run lint -- --fix` to ensure code quality and consistency.
8.  **Review and Deploy**: Thoroughly test the application in the browser preview and prepare for deployment.
