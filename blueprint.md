# Project Blueprint

## Overview

This project is a personal portfolio website for Kishore Kumar Sharma, a Senior Full Stack Engineer. The portfolio showcases his skills, experience, and projects in a modern and visually appealing way. The design, dubbed the "Aurora" theme, is a dark, futuristic theme with glowing elements and frosted glass effects, creating an immersive and engaging user experience.

## Design & Features

### General
- **Theme**: Dark theme by default, with a system theme toggle.
- **Font**: `Space Grotesk` for a modern, technical feel.
- **Background**: Animated "Aurora" background with a subtle dot pattern.
- **Effects**: Frosted glass, glowing borders, and shimmer effects on interactive elements.

### Components
- **Navigation**: A sticky navigation bar that becomes a frosted glass element on scroll.
- **Hero Section**: A dynamic hero section with an animated background, spotlight effect, and glowing buttons.
- **Skills Section**: A grid of frosted glass cards showcasing skills, with a shimmer effect on hover.
- **Experience Section**: A vertical timeline with glowing, animated lines and frosted glass cards for each experience entry.
- **Projects Section**: A grid of frosted glass cards for projects, with a shimmer effect on hover.
- **Contact Section**: A contact form with a frosted glass effect and glowing elements.

## Current Plan

- **Task**: Implement the "Aurora" theme across the entire portfolio website.
- **Status**: Completed.
- **Steps Taken**:
    1. Updated `tailwind.config.ts` with the new theme colors and animations.
    2. Updated `app/globals.css` with the new theme styles.
    3. Refactored `app/layout.tsx` to use the new theme and font.
    4. Created `components/DotPattern.tsx` for the hero section background.
    5. Refactored `components/sections/Hero.tsx` to use the new theme and dot pattern.
    6. Created `components/ShimmerButton.tsx` for the new CTA button.
    7. Refactored `components/sections/Skills.tsx` to use the new frosted glass card style.
    8. Refactored `components/sections/Experience.tsx` to use a vertical timeline with frosted glass cards.
    9. Refactored `components/sections/Projects.tsx` to use frosted glass cards.
    10. Refactored `components/sections/Contact.tsx` to use a frosted glass form.
    11. Refactored `components/Navigation.tsx` to use a frosted glass navigation bar.
    12. Updated `app/actions.ts` to match the new theme.