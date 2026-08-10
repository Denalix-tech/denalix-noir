/**
 * Hand-maintained database types mirroring supabase/migrations.
 *
 * Regenerate with:
 *   npx supabase gen types typescript --project-id <ref> > src/lib/supabase/database.types.ts
 * Keep this file in sync whenever the migration changes.
 */

export type PostStatus = "draft" | "published";

/** Where a draft originated. Editorial metadata; never an authorization input. */
export type PostSource = "human" | "ai-assisted";

/**
 * owner — full post lifecycle plus granting and revoking access
 * admin — full post lifecycle only
 */
export type ProfileRole = "owner" | "admin";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          role: ProfileRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          // No database default — a role must always be stated explicitly.
          role: ProfileRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          role?: ProfileRole;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      posts: {
        Row: {
          id: string;
          title: string;
          slug: string;
          excerpt: string;
          content: string;
          cover_image_url: string | null;
          cover_image_alt: string | null;
          author_id: string;
          status: PostStatus;
          source: PostSource;
          published_at: string | null;
          seo_title: string | null;
          seo_description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          slug: string;
          excerpt: string;
          content: string;
          cover_image_url?: string | null;
          cover_image_alt?: string | null;
          author_id: string;
          status?: PostStatus;
          source?: PostSource;
          published_at?: string | null;
          seo_title?: string | null;
          seo_description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          slug?: string;
          excerpt?: string;
          content?: string;
          cover_image_url?: string | null;
          cover_image_alt?: string | null;
          author_id?: string;
          status?: PostStatus;
          source?: PostSource;
          published_at?: string | null;
          seo_title?: string | null;
          seo_description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      /** Column-limited projection of profiles used for public attribution. */
      post_authors: {
        Row: {
          id: string | null;
          display_name: string | null;
        };
        Relationships: [];
      };
    };
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};

export type PostRow = Database["public"]["Tables"]["posts"]["Row"];
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
