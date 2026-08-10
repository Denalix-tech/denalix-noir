# Blog and admin panel — reusable build specification

> **This is a template, not a task.** It was written to build the blog and admin
> panel on `denalixtech.com`, and that work is **done** — for how the finished
> system actually behaves, read
> [`../features/PUBLISHING_BLOGS.md`](../features/PUBLISHING_BLOGS.md) and the
> README, not this file.
>
> It is kept because it is a good starting brief for standing the same feature up
> on **another site** (a client project). When reusing it, replace "Denalix Tech"
> with the target brand and re-check §2 against that repository.
>
> Note what the finished implementation added beyond this spec: an `owner` role
> distinct from `admin`, an `/admin/people` invite screen, a `source` column
> marking AI-assisted drafts, bulk "Approve & publish", and a local MCP server
> for drafting. Treat those as expected scope on the next build, not extras.

## 1. Objective

Add a production-ready blog and a protected administrative publishing panel to a
marketing website.

The finished feature must allow an authorized Denalix administrator to:

- Sign in securely.
- View all draft and published posts.
- Create a post.
- Edit an existing post.
- Preview a draft.
- Publish and unpublish a post.
- Delete a post after explicit confirmation.
- Upload and select a cover image.
- Edit search-engine metadata.

Public visitors must be able to:

- Browse published posts at `/blog`.
- Read a published post at `/blog/[slug]`.
- See appropriate metadata and social sharing metadata for every post.
- Receive a real 404 response for missing, draft, or unpublished posts.

## 2. Assumed starting point

Confirm these against the target repository before starting; they describe the
shape this spec was written for, not a guarantee about any particular project.

The repository is an existing Next.js 16 App Router application using:

- React 19
- TypeScript
- Tailwind CSS 4
- Framer Motion and GSAP
- Lucide React icons
- The `src/app` App Router structure
- Shared marketing content in `src/lib/site-config.ts`
- Existing reusable components under `src/components`

This spec assumes the target site starts with **no** database, authentication
provider, API layer, blog routes, or admin routes. If any of those already exist,
extend them rather than following this document literally.

Read and obey `AGENTS.md` before changing code. This project uses a version of Next.js with potentially unfamiliar APIs. Consult the locally installed documentation under `node_modules/next/dist/docs/` before implementing framework-specific behavior.

The working tree may contain unrelated uncommitted changes. Preserve them. Do not reset, revert, reformat, or overwrite unrelated files.

## 3. Required Architecture

Use Supabase for all blog backend concerns:

- Supabase Postgres for posts.
- Supabase Auth for administrator authentication.
- Supabase Storage for cover images.
- Row Level Security for database and storage authorization.

Use Next.js Server Components for public data loading wherever practical. Use Server Actions for authenticated mutations unless a Route Handler is technically required. Treat every Server Action and Route Handler as a public endpoint: authenticate and authorize inside the mutation itself.

Do not build custom password storage, custom session cryptography, or a second backend service.

## 4. Dependency Requirements

Add only the dependencies needed for the feature. Expected dependencies are:

- `@supabase/supabase-js`
- `@supabase/ssr`
- `zod`
- A safe Markdown renderer, such as `react-markdown`
- `remark-gfm` if GitHub-flavored Markdown is supported

Do not add a large component library or CMS framework. Reuse the site's existing visual system.

## 5. Environment Variables

Support these environment variables:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Use the current Supabase publishable-key convention. Never expose a service-role key to the browser. The initial implementation should not require a service-role key at runtime.

Add `.env.example` with placeholder values. Do not commit real credentials.

Validate required server-side environment variables and provide a clear development error when they are missing.

## 6. Database Model

Create a migration under a clearly named Supabase migrations directory. Use UUID primary keys and timezone-aware timestamps.

### `profiles`

| Column | Type | Rules |
| --- | --- | --- |
| `id` | `uuid` | Primary key; references `auth.users(id)` with cascade delete |
| `display_name` | `text` | Optional |
| `role` | `text` | Required; allowed value for this version: `admin` |
| `created_at` | `timestamptz` | Required; default `now()` |
| `updated_at` | `timestamptz` | Required; default `now()` |

Do not make every newly registered user an administrator. Public registration must not be exposed. The first administrator should be created through the Supabase dashboard or a documented SQL/manual setup step.

### `posts`

| Column | Type | Rules |
| --- | --- | --- |
| `id` | `uuid` | Primary key; generated automatically |
| `title` | `text` | Required; 1–160 characters |
| `slug` | `text` | Required; unique; lowercase URL-safe format |
| `excerpt` | `text` | Required; maximum 320 characters |
| `content` | `text` | Required Markdown source |
| `cover_image_url` | `text` | Optional |
| `cover_image_alt` | `text` | Required when a cover image exists |
| `author_id` | `uuid` | Required; references `auth.users(id)` |
| `status` | `text` | Required; `draft` or `published`; default `draft` |
| `published_at` | `timestamptz` | Null for a never-published draft; set on first publish |
| `seo_title` | `text` | Optional; maximum 60 characters |
| `seo_description` | `text` | Optional; maximum 160 characters |
| `created_at` | `timestamptz` | Required; default `now()` |
| `updated_at` | `timestamptz` | Required; default `now()` |

Add database constraints for status, slug format, and relevant length limits. Add indexes that support:

- Looking up a post by slug.
- Listing published posts by publication date.
- Listing all posts by most recently updated.

Add a database trigger or equivalent database mechanism to maintain `updated_at`.

## 7. Row Level Security

Enable RLS on every application table.

Required behavior:

- Anonymous users can select only posts whose status is `published` and whose `published_at` is not in the future.
- Authenticated administrators can select all posts.
- Only authenticated users with a `profiles.role = 'admin'` row can insert, update, or delete posts.
- A post insert must associate `author_id` with the authenticated user.
- Users must not be able to grant themselves the admin role through the public client.

Do not depend only on hiding `/admin` in the interface. Enforce authorization in RLS and in all server-side mutation entry points.

## 8. Supabase Storage

Create a bucket named `blog-images`.

Required behavior:

- Published image files can be read publicly.
- Only authenticated administrators can upload, replace, or delete files.
- Store files under a predictable admin-owned path, using generated collision-resistant filenames.
- Accept JPEG, PNG, and WebP only.
- Enforce a maximum upload size of 5 MB in the application and, where available, in bucket configuration.
- Never trust the client-provided MIME type alone.
- Give every displayed cover image meaningful alt text.

Avoid deleting an existing image automatically when a post changes cover image; another post may reference it. Image cleanup can be manual in version one.

## 9. Supabase Client Structure

Create distinct browser and server utilities, for example:

```text
src/lib/supabase/client.ts
src/lib/supabase/server.ts
src/lib/supabase/proxy.ts
```

Follow the current official Supabase SSR pattern for Next.js cookie-based sessions. Use the current Next.js 16 request interception convention described by the installed documentation; do not assume an older `middleware.ts` convention is correct.

Create a small data-access layer for blog queries and authorization rather than scattering raw Supabase queries across UI components.

Generate or define TypeScript database types so posts are strongly typed.

## 10. Routes

### Public routes

```text
/blog
/blog/[slug]
```

### Authentication and admin routes

```text
/admin/login
/admin
/admin/posts
/admin/posts/new
/admin/posts/[id]/edit
/admin/posts/[id]/preview
```

`/admin` should redirect to `/admin/posts` for an authenticated administrator.

Unauthenticated users visiting a protected admin route must be redirected to `/admin/login` with a safe return URL. An authenticated non-admin must receive an access-denied response or page, not the admin interface.

An authenticated administrator visiting `/admin/login` should be redirected to `/admin/posts`.

Do not add the admin routes to the public navigation or sitemap.

## 11. Public Blog Index

The `/blog` page must:

- Match the existing Denalix dark visual language.
- Reuse `Navbar`, `Footer`, and appropriate shared UI components.
- Include page metadata.
- Show published posts newest first.
- Display cover image, title, excerpt, publication date, and reading time.
- Link each card to `/blog/[slug]`.
- Handle an empty state cleanly.
- Work well on mobile, tablet, and desktop.

Add a `Blog` link to `navLinks` in `src/lib/site-config.ts` and ensure the mobile navigation continues to work.

Update the existing “Read simple guides” placeholder link to `/blog` if that content remains present.

Pagination is not required for the first version unless it is trivial to add. Structure the query so pagination can be added later.

## 12. Public Post Page

The `/blog/[slug]` page must:

- Query only a publicly visible published post.
- Return `notFound()` for missing, draft, or future-dated content.
- Render the title, excerpt, publication date, author display name, cover image, and Markdown content.
- Use readable typography consistent with the site's design.
- Render Markdown safely. Do not allow arbitrary raw HTML from post content.
- Support headings, lists, links, block quotes, inline code, code blocks, and tables.
- Add reasonable styles for long-form content.
- Calculate or display reading time without storing it in the database.
- Generate per-post metadata with title, description, canonical URL where a canonical base URL is configured, and Open Graph fields.

Links inside Markdown should be visually distinct. External links should use safe attributes where appropriate.

## 13. Admin Login

The login page must:

- Use email and password authentication through Supabase Auth.
- Not expose public sign-up.
- Show clear invalid-credential and configuration errors without leaking sensitive detail.
- Disable submission while pending.
- Redirect only to validated same-origin admin paths.
- Include a sign-out action in the admin shell.

Password reset is optional for version one and may be handled through the Supabase dashboard initially. Document this limitation.

## 14. Admin Post List

The `/admin/posts` page must show:

- Title.
- Status.
- Slug.
- Publication date where applicable.
- Last updated date.
- Edit action.
- Preview action.
- Publish or unpublish action.
- Delete action.
- A clear “New post” action.

Provide useful empty, loading, and error states. Draft and published states must be visually distinguishable without relying only on color.

## 15. Post Editor

Use a practical split editor rather than a complex WYSIWYG editor.

Required fields:

- Title.
- Slug.
- Excerpt.
- Markdown content.
- Cover image upload/selection.
- Cover image alt text.
- SEO title.
- SEO description.

Required behavior:

- Generate a slug from the title for new posts.
- Allow the slug to be edited before publishing.
- Do not silently change an existing slug when its title changes.
- Validate slug uniqueness and display a useful inline error.
- Show field lengths for excerpt and SEO fields.
- Provide Markdown preview.
- Provide explicit “Save draft” and “Publish” actions.
- Disable duplicate submissions and show progress.
- Confirm before navigating away with unsaved edits where practical.
- Preserve entered data when validation fails.

Validation must run on both client and server, with the server schema treated as authoritative.

Publishing rules:

- A post cannot be published without title, unique slug, excerpt, and non-empty content.
- If a cover image is set, alt text is required.
- Set `published_at` when first changing from draft to published.
- Retain the original `published_at` when editing or republishing an already published post.
- Unpublishing changes status to draft but does not erase the original publication timestamp.

Deletion must require explicit confirmation that identifies the post. After deletion, redirect to the post list with success feedback.

## 16. Draft Preview

Draft preview must be available only to authenticated administrators. It should render the post with the same presentation component used by the public page so preview and production output do not drift apart.

Do not make drafts accessible through an obscure public URL or rely on robots directives as access control.

## 17. Caching and Revalidation

After creating, editing, publishing, unpublishing, or deleting a post, invalidate the relevant public and admin routes using the current Next.js 16 APIs documented in the installed framework version.

At minimum, account for:

- `/blog`
- The affected `/blog/[slug]` route.
- `/admin/posts`
- Old and new slug routes when a slug changes.

Do not serve a formerly published post indefinitely after it is unpublished or deleted.

## 18. Accessibility

The feature must:

- Be fully keyboard accessible.
- Use visible focus indicators.
- Associate labels and validation messages with form fields.
- Announce important form results where appropriate.
- Provide sufficient contrast.
- Use semantic heading order.
- Provide accessible names for icon-only controls.
- Never rely only on color for status or errors.

## 19. Error Handling and Observability

- Show user-friendly errors in the UI.
- Log enough server-side context to diagnose failures without logging passwords, tokens, cookies, or private post content.
- Distinguish validation, authentication, authorization, not-found, and unexpected errors.
- Handle unavailable Supabase configuration without crashing unrelated public marketing pages.
- Do not reveal raw database errors to visitors.

## 20. SEO and Discovery

- Include blog pages in the sitemap if the project has or gains a sitemap implementation.
- Include only published, non-future posts in sitemap output.
- Add blog metadata and per-post metadata.
- Ensure draft preview and every `/admin` route use `noindex` metadata.
- Add canonical URLs only when the site's production origin is reliably configured.
- Consider adding an RSS feed as a documented follow-up; it is not required for version one.

## 21. Expected File Organization

Exact filenames may be adapted to current Next.js 16 conventions, but keep responsibilities separated. A reasonable structure is:

```text
src/app/blog/page.tsx
src/app/blog/[slug]/page.tsx
src/app/admin/layout.tsx
src/app/admin/login/page.tsx
src/app/admin/posts/page.tsx
src/app/admin/posts/new/page.tsx
src/app/admin/posts/[id]/edit/page.tsx
src/app/admin/posts/[id]/preview/page.tsx
src/components/blog/BlogCard.tsx
src/components/blog/PostArticle.tsx
src/components/blog/MarkdownContent.tsx
src/components/admin/PostEditor.tsx
src/components/admin/PostList.tsx
src/lib/blog/queries.ts
src/lib/blog/actions.ts
src/lib/blog/schema.ts
src/lib/blog/slug.ts
src/lib/blog/reading-time.ts
src/lib/supabase/client.ts
src/lib/supabase/server.ts
src/lib/supabase/proxy.ts
supabase/migrations/<timestamp>_create_blog.sql
.env.example
```

Prefer small cohesive modules. Avoid placing the entire admin feature in one client component.

## 22. Setup Documentation

Replace or extend the generic README with a focused section explaining:

1. How to create or connect a Supabase project.
2. How to set environment variables locally and in deployment.
3. How to run the migration.
4. How to create the `blog-images` bucket if it is not created by migration.
5. How to create the first Auth user.
6. How to grant that user an admin profile safely.
7. How to start the application.
8. How to run lint, type checking, tests, and production build.
9. The initial password-reset limitation.

Provide the exact SQL needed to grant the known Auth user administrator access by UUID or email lookup, with a warning to verify the target user.

## 23. Testing and Verification

At minimum, verify:

- TypeScript passes without errors.
- ESLint passes.
- The production build succeeds.
- Public marketing routes still render.
- `/blog` renders with zero and multiple posts.
- A published post is publicly readable.
- A draft is not publicly readable and returns 404.
- A future-dated post is not publicly readable.
- Unauthenticated users cannot access admin pages.
- A non-admin authenticated user cannot read drafts or mutate posts.
- An administrator can create, edit, preview, publish, unpublish, and delete a post.
- Duplicate slugs are rejected cleanly.
- Image type and size validation work.
- Changing a published slug invalidates the old URL.
- Markdown raw HTML is not executed.
- Mobile navigation includes the Blog link and still behaves correctly.

Add automated tests for pure utilities and validation logic where the repository's tooling permits it. Do not introduce a heavy end-to-end test framework solely for this feature unless explicitly approved.

## 24. Definition of Done

The feature is complete only when:

- The public blog index and post routes are implemented and match the existing site.
- Authentication and role-based authorization are enforced server-side and by RLS.
- The admin can complete the full post lifecycle.
- Drafts cannot be accessed publicly.
- Images can be uploaded securely.
- Metadata is generated correctly.
- Setup instructions and migration files are committed to the repository.
- Lint, type checking, and production build pass.
- Existing unrelated modifications remain intact.
- No real credentials, admin passwords, service-role keys, or tokens are committed.

## 25. Non-Goals for Version One

Do not add these unless separately requested:

- Public user registration.
- Reader accounts or comments.
- Multiple author roles or an approval workflow.
- Categories and tags.
- Scheduled publishing UI.
- Newsletter delivery.
- Analytics dashboard.
- Full WYSIWYG or block editor.
- Automatic deletion of unused images.
- Content revision history.
- Localization.

Keep the data model and module boundaries clean enough for these to be added later.

## 26. Implementation Sequence

Implement in this order:

1. Review repository rules, current code conventions, and Next.js 16 local documentation.
2. Add dependencies and environment documentation.
3. Add the database migration, constraints, indexes, triggers, and RLS policies.
4. Add Supabase server/browser/session utilities.
5. Add authorization and blog data-access helpers.
6. Implement public blog routes and shared article rendering.
7. Implement admin login and protected admin layout.
8. Implement post list and editor actions.
9. Implement image upload.
10. Add metadata, cache invalidation, navigation links, and polish.
11. Run verification and fix all regressions.
12. Report changed files, setup steps that require human action, test results, and any remaining limitations.

Do not claim the feature is fully operational until Supabase credentials and an admin user have been configured. Code may be complete while external setup remains pending; state that distinction clearly.
