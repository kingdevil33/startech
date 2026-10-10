-- Seed data: 1 course, 2 cohorts (enrollment_open + upcoming), weeks, and lessons
-- Run this after migrations

-- ============================================================
-- COURSE: Full-Stack Web Development
-- ============================================================
insert into public.courses (
  id, title, slug, description, long_description, category, level,
  estimated_duration_weeks, is_published, certificate_rules
) values (
  '11111111-1111-1111-1111-111111111111',
  'Full-Stack Web Development',
  'full-stack-web-development',
  'Master modern web development with React, Next.js, Node.js, and databases. Build real-world projects in a cohort-based learning environment.',
  '## What You''ll Learn

This comprehensive program takes you from fundamentals to professional-level full-stack development.

### Technologies Covered
- **Frontend:** HTML, CSS, JavaScript, TypeScript, React, Next.js, Tailwind CSS
- **Backend:** Node.js, Express, REST APIs, GraphQL
- **Databases:** PostgreSQL, Supabase, Prisma
- **DevOps:** Git, GitHub, Vercel, CI/CD
- **Extras:** Authentication, Payments, Real-time features

### Who Is This For?
- Beginners who want a structured learning path
- Self-taught developers looking to fill gaps
- Professionals switching to web development

### How It Works
1. Learn through video lessons and readings at your own pace each week
2. Join live sessions for Q&A and code reviews
3. Build projects and get feedback from peers
4. Complete assignments to earn your certificate',
  'Web Development',
  'beginner',
  8,
  true,
  '{"lessons_complete_percent": 80, "live_attendance_percent": 70, "assignments_submitted_percent": 100, "peer_reviews_completed_percent": 100}'
);

-- ============================================================
-- WEEKS (8 weeks)
-- ============================================================
insert into public.weeks (id, course_id, title, description, week_number, is_published) values
  ('22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111111', 'HTML & CSS Foundations', 'Learn the building blocks of the web — semantic HTML and modern CSS.', 1, true),
  ('22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111111', 'JavaScript Essentials', 'Master JavaScript fundamentals: variables, functions, DOM manipulation.', 2, true),
  ('22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111111', 'TypeScript & Modern JS', 'Level up with TypeScript, ES6+ features, and async programming.', 3, true),
  ('22222222-2222-2222-2222-222222222204', '11111111-1111-1111-1111-111111111111', 'React Fundamentals', 'Build interactive UIs with React components, state, and hooks.', 4, true),
  ('22222222-2222-2222-2222-222222222205', '11111111-1111-1111-1111-111111111111', 'Next.js & Routing', 'Server-side rendering, API routes, and full-stack Next.js apps.', 5, true),
  ('22222222-2222-2222-2222-222222222206', '11111111-1111-1111-1111-111111111111', 'Databases & Supabase', 'PostgreSQL, Supabase Auth, Storage, and real-time subscriptions.', 6, true),
  ('22222222-2222-2222-2222-222222222207', '11111111-1111-1111-1111-111111111111', 'Authentication & Payments', 'Implement user auth, Stripe payments, and protected routes.', 7, true),
  ('22222222-2222-2222-2222-222222222208', '11111111-1111-1111-1111-111111111111', 'Deployment & Final Project', 'Deploy to Vercel, CI/CD, and present your capstone project.', 8, true);

-- ============================================================
-- LESSONS (3 per week = 24 lessons)
-- ============================================================

-- Week 1: HTML & CSS
insert into public.lessons (id, week_id, title, slug, description, lesson_type, sort_order, duration_minutes, is_published, is_free_preview) values
  ('33333333-3333-3333-3333-333333330101', '22222222-2222-2222-2222-222222222201', 'Introduction to HTML', 'intro-html', 'Learn semantic HTML elements and document structure.', 'video', 1, 25, true, true),
  ('33333333-3333-3333-3333-333333330102', '22222222-2222-2222-2222-222222222201', 'CSS Selectors & Box Model', 'css-selectors-box-model', 'Master CSS selectors, specificity, and the box model.', 'video', 2, 30, true, false),
  ('33333333-3333-3333-3333-333333330103', '22222222-2222-2222-2222-222222222201', 'Flexbox & Grid Layout', 'flexbox-grid', 'Build responsive layouts with Flexbox and CSS Grid.', 'video', 3, 35, true, false);

-- Week 2: JavaScript
insert into public.lessons (id, week_id, title, slug, description, lesson_type, sort_order, duration_minutes, is_published) values
  ('33333333-3333-3333-3333-333333330201', '22222222-2222-2222-2222-222222222202', 'JavaScript Variables & Types', 'js-variables-types', 'Variables, data types, operators, and type coercion.', 'video', 1, 25, true),
  ('33333333-3333-3333-3333-333333330202', '22222222-2222-2222-2222-222222222202', 'Functions & Scope', 'js-functions-scope', 'Function declarations, expressions, arrow functions, and closures.', 'video', 2, 30, true),
  ('33333333-3333-3333-3333-333333330203', '22222222-2222-2222-2222-222222222202', 'DOM Manipulation', 'dom-manipulation', 'Selecting elements, event listeners, and dynamic content.', 'video', 3, 35, true);

-- Week 3: TypeScript
insert into public.lessons (id, week_id, title, slug, description, lesson_type, sort_order, duration_minutes, is_published) values
  ('33333333-3333-3333-3333-333333330301', '22222222-2222-2222-2222-222222222203', 'TypeScript Basics', 'ts-basics', 'Types, interfaces, and TypeScript compiler.', 'video', 1, 25, true),
  ('33333333-3333-3333-3333-333333330302', '22222222-2222-2222-2222-222222222203', 'Advanced Types', 'ts-advanced-types', 'Generics, union types, and type guards.', 'video', 2, 30, true),
  ('33333333-3333-3333-3333-333333330303', '22222222-2222-2222-2222-222222222203', 'Async/Await & Promises', 'async-await', 'Asynchronous programming patterns in JavaScript/TypeScript.', 'video', 3, 30, true);

-- Week 4: React
insert into public.lessons (id, week_id, title, slug, description, lesson_type, sort_order, duration_minutes, is_published) values
  ('33333333-3333-3333-3333-333333330401', '22222222-2222-2222-2222-222222222204', 'React Components & JSX', 'react-components-jsx', 'Creating components, JSX syntax, and props.', 'video', 1, 30, true),
  ('33333333-3333-3333-3333-333333330402', '22222222-2222-2222-2222-222222222204', 'State & Hooks', 'react-state-hooks', 'useState, useEffect, and custom hooks.', 'video', 2, 35, true),
  ('33333333-3333-3333-3333-333333330403', '22222222-2222-2222-2222-222222222204', 'Forms & Data Fetching', 'react-forms-data', 'Controlled forms, API calls, and loading states.', 'video', 3, 30, true);

-- Week 5: Next.js
insert into public.lessons (id, week_id, title, slug, description, lesson_type, sort_order, duration_minutes, is_published) values
  ('33333333-3333-3333-3333-333333330501', '22222222-2222-2222-2222-222222222205', 'Next.js App Router', 'nextjs-app-router', 'File-based routing, layouts, and server components.', 'video', 1, 35, true),
  ('33333333-3333-3333-3333-333333330502', '22222222-2222-2222-2222-222222222205', 'Server Actions & API Routes', 'nextjs-server-actions', 'Server-side data mutations and API endpoints.', 'video', 2, 30, true),
  ('33333333-3333-3333-3333-333333330503', '22222222-2222-2222-2222-222222222205', 'SSR, SSG & ISR', 'nextjs-rendering', 'Rendering strategies and when to use each.', 'video', 3, 30, true);

-- Week 6: Databases
insert into public.lessons (id, week_id, title, slug, description, lesson_type, sort_order, duration_minutes, is_published) values
  ('33333333-3333-3333-3333-333333330601', '22222222-2222-2222-2222-222222222206', 'PostgreSQL Fundamentals', 'postgres-fundamentals', 'SQL queries, tables, relationships, and joins.', 'video', 1, 35, true),
  ('33333333-3333-3333-3333-333333330602', '22222222-2222-2222-2222-222222222206', 'Supabase Setup & Queries', 'supabase-setup', 'Setting up Supabase, client library, and CRUD operations.', 'video', 2, 30, true),
  ('33333333-3333-3333-3333-333333330603', '22222222-2222-2222-2222-222222222206', 'Row Level Security', 'supabase-rls', 'Securing your database with RLS policies.', 'video', 3, 30, true);

-- Week 7: Auth & Payments
insert into public.lessons (id, week_id, title, slug, description, lesson_type, sort_order, duration_minutes, is_published) values
  ('33333333-3333-3333-3333-333333330701', '22222222-2222-2222-2222-222222222207', 'Supabase Authentication', 'supabase-auth', 'Email/password, OAuth, and session management.', 'video', 1, 30, true),
  ('33333333-3333-3333-3333-333333330702', '22222222-2222-2222-2222-222222222207', 'Stripe Integration', 'stripe-integration', 'Checkout sessions, webhooks, and payment handling.', 'video', 2, 35, true),
  ('33333333-3333-3333-3333-333333330703', '22222222-2222-2222-2222-222222222207', 'Protected Routes & Middleware', 'protected-routes', 'Implementing auth guards and role-based access.', 'video', 3, 25, true);

-- Week 8: Deployment
insert into public.lessons (id, week_id, title, slug, description, lesson_type, sort_order, duration_minutes, is_published) values
  ('33333333-3333-3333-3333-333333330801', '22222222-2222-2222-2222-222222222208', 'Git & GitHub Workflow', 'git-github', 'Branching, PRs, and collaborative workflows.', 'video', 1, 25, true),
  ('33333333-3333-3333-3333-333333330802', '22222222-2222-2222-2222-222222222208', 'Deploying to Vercel', 'deploy-vercel', 'Environment variables, domains, and CI/CD.', 'video', 2, 25, true),
  ('33333333-3333-3333-3333-333333330803', '22222222-2222-2222-2222-222222222208', 'Final Project Showcase', 'final-project', 'Present your capstone project and get feedback.', 'text', 3, 60, true);

-- ============================================================
-- ASSIGNMENTS (1 per week for weeks 1, 4, 6, 8)
-- ============================================================
insert into public.assignments (id, week_id, title, description, rubric, due_date_offset_days, review_due_offset_days, is_published, is_required) values
  ('44444444-4444-4444-4444-444444440001',
   '22222222-2222-2222-2222-222222222201',
   'Build a Personal Portfolio Page',
   '## Assignment: Personal Portfolio

Build a responsive portfolio page using HTML and CSS only.

### Requirements
- Semantic HTML5 elements
- Responsive design (mobile + desktop)
- At least 3 sections: Hero, About, Projects
- Use Flexbox or Grid for layout
- Accessible (proper headings, alt text, contrast)',
   '[{"name": "HTML Structure", "description": "Proper semantic elements", "max_score": 25, "weight": 1},
     {"name": "CSS Layout", "description": "Responsive Flexbox/Grid usage", "max_score": 25, "weight": 1},
     {"name": "Design Quality", "description": "Visual appeal and consistency", "max_score": 25, "weight": 1},
     {"name": "Accessibility", "description": "WCAG compliance", "max_score": 25, "weight": 1}]',
   7, 10, true, true),

  ('44444444-4444-4444-4444-444444440002',
   '22222222-2222-2222-2222-222222222204',
   'React Todo Application',
   '## Assignment: React Todo App

Build a fully functional Todo application using React.

### Requirements
- Add, edit, delete, and toggle todos
- Filter by status (all, active, completed)
- Persist data in localStorage
- Clean component architecture
- TypeScript types for all props and state',
   '[{"name": "Functionality", "description": "All CRUD operations work correctly", "max_score": 30, "weight": 1.2},
     {"name": "Code Quality", "description": "Clean components, TypeScript, hooks", "max_score": 25, "weight": 1},
     {"name": "UX & Design", "description": "Polished user experience", "max_score": 25, "weight": 1},
     {"name": "Persistence", "description": "Data survives page refresh", "max_score": 20, "weight": 0.8}]',
   7, 10, true, true),

  ('44444444-4444-4444-4444-444444440003',
   '22222222-2222-2222-2222-222222222206',
   'Full-Stack CRUD App with Supabase',
   '## Assignment: Supabase CRUD

Build a full-stack app with Supabase backend.

### Requirements
- At least 2 related tables
- CRUD operations via Supabase client
- Row Level Security policies
- Real-time updates
- Error handling and loading states',
   '[{"name": "Database Design", "description": "Proper schema with relationships", "max_score": 25, "weight": 1},
     {"name": "RLS Policies", "description": "Correct security policies", "max_score": 25, "weight": 1.2},
     {"name": "CRUD Operations", "description": "All operations work correctly", "max_score": 25, "weight": 1},
     {"name": "Real-time", "description": "Live updates via subscriptions", "max_score": 25, "weight": 0.8}]',
   7, 10, true, true),

  ('44444444-4444-4444-4444-444444440004',
   '22222222-2222-2222-2222-222222222208',
   'Capstone: Full-Stack Web Application',
   '## Capstone Project

Build and deploy a complete full-stack web application.

### Requirements
- Next.js with App Router
- Supabase for backend (auth, database, storage)
- At least 3 major features
- Deployed to Vercel
- README with setup instructions
- 5-minute video walkthrough',
   '[{"name": "Functionality", "description": "Features work correctly and completely", "max_score": 30, "weight": 1.5},
     {"name": "Code Quality", "description": "Clean architecture, TypeScript, testing", "max_score": 25, "weight": 1},
     {"name": "Design & UX", "description": "Professional look and feel", "max_score": 20, "weight": 1},
     {"name": "Deployment", "description": "Live and accessible on Vercel", "max_score": 15, "weight": 0.8},
     {"name": "Documentation", "description": "README and video walkthrough", "max_score": 10, "weight": 0.5}]',
   14, 17, true, true);

-- ============================================================
-- COHORTS
-- ============================================================

-- Cohort 1: OPEN enrollment (enrollment window is currently open)
insert into public.cohorts (
  id, course_id, name, slug, description, price, currency, capacity,
  enrollment_opens_at, enrollment_closes_at, starts_at, ends_at,
  timezone, status, post_access_days, coupon_codes
) values (
  '55555555-5555-5555-5555-555555555501',
  '11111111-1111-1111-1111-111111111111',
  'Cohort Alpha — January 2025',
  'cohort-alpha-jan-2025',
  'The first cohort! Join our founding group of learners.',
  450.00,
  'GHS',
  50,
  now() - interval '7 days',        -- enrollment opened 7 days ago
  now() + interval '21 days',       -- closes in 21 days
  now() + interval '30 days',       -- starts in 30 days
  now() + interval '86 days',       -- ends 8 weeks after start
  'Africa/Accra',
  'enrollment_open',
  90,
  '[{"code": "EARLYBIRD", "discount_percent": 20, "max_uses": 10, "used": 2},
    {"code": "STARTECH50", "discount_percent": 50, "max_uses": 5, "used": 0}]'
);

-- Cohort 2: UPCOMING (enrollment hasn't opened yet)
insert into public.cohorts (
  id, course_id, name, slug, description, price, currency, capacity,
  enrollment_opens_at, enrollment_closes_at, starts_at, ends_at,
  timezone, status, post_access_days
) values (
  '55555555-5555-5555-5555-555555555502',
  '11111111-1111-1111-1111-111111111111',
  'Cohort Beta — April 2025',
  'cohort-beta-apr-2025',
  'Our second cohort with improved curriculum and more live sessions.',
  500.00,
  'GHS',
  80,
  now() + interval '60 days',       -- enrollment opens in 60 days
  now() + interval '90 days',       -- closes 90 days from now
  now() + interval '100 days',      -- starts 100 days from now
  now() + interval '156 days',      -- ends 8 weeks after start
  'Africa/Accra',
  'draft',
  90
);

-- ============================================================
-- FORUM CATEGORIES for Cohort Alpha
-- ============================================================
insert into public.forum_categories (id, cohort_id, name, description, sort_order) values
  ('66666666-6666-6666-6666-666666660001', '55555555-5555-5555-5555-555555555501', 'General Discussion', 'Introduce yourself and chat with fellow learners.', 1),
  ('66666666-6666-6666-6666-666666660002', '55555555-5555-5555-5555-555555555501', 'Week 1: HTML & CSS', 'Questions and discussions about Week 1 material.', 2),
  ('66666666-6666-6666-6666-666666660003', '55555555-5555-5555-5555-555555555501', 'Assignments Help', 'Get help with your assignments (no solutions!).', 3),
  ('66666666-6666-6666-6666-666666660004', '55555555-5555-5555-5555-555555555501', 'Career & Resources', 'Job hunting tips, useful resources, and career advice.', 4);
