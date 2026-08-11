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

/** Access tokens are short-lived; refresh tokens rotate on every use. */
export type OAuthTokenKind = "access" | "refresh";

/**
 * Triage state for a contact-form submission. There is no "deleted" — a request
 * someone took the trouble to send is archived, not dropped.
 */
export type ConsultationStatus = "new" | "contacted" | "archived";

/** An access request is a request, not an account. Approval creates the account. */
export type AccessRequestStatus = "pending" | "approved" | "declined";

/** Postgres `jsonb`, as far as the client is concerned. */
export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

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

      // -------------------------------------------------------------------
      // OAuth 2.1 authorization-server storage.
      //
      // RLS is enabled with no policies, so these are reachable only with the
      // service-role key. See 20260810120000_add_mcp_oauth.sql.
      // -------------------------------------------------------------------

      /**
       * Admin-access requests from /admin/signup. Holds no credentials: the
       * password is set by the person against Supabase Auth after approval.
       */
      access_requests: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          reason: string | null;
          status: AccessRequestStatus;
          requested_at: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
        };
        Insert: {
          id?: string;
          email: string;
          name?: string | null;
          reason?: string | null;
          status?: AccessRequestStatus;
          requested_at?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
        };
        Update: {
          status?: AccessRequestStatus;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
        };
        Relationships: [];
      };

      /**
       * Public contact-form submissions. RLS gives anon no policy at all — the
       * only writer is the Server Action using the service role.
       */
      consultation_requests: {
        Row: {
          id: string;
          name: string;
          email: string;
          company: string | null;
          phone: string | null;
          business_description: string;
          help_needed: string;
          status: ConsultationStatus;
          created_at: string;
          handled_at: string | null;
          handled_by: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          company?: string | null;
          phone?: string | null;
          business_description: string;
          help_needed: string;
          status?: ConsultationStatus;
          created_at?: string;
          handled_at?: string | null;
          handled_by?: string | null;
        };
        Update: {
          status?: ConsultationStatus;
          handled_at?: string | null;
          handled_by?: string | null;
        };
        Relationships: [];
      };

      oauth_clients: {
        Row: {
          client_id: string;
          client_name: string | null;
          redirect_uris: string[];
          grant_types: string[];
          response_types: string[];
          token_endpoint_auth_method: string;
          scope: string | null;
          client_uri: string | null;
          logo_uri: string | null;
          software_id: string | null;
          software_version: string | null;
          raw_metadata: Json;
          created_at: string;
        };
        Insert: {
          client_id: string;
          client_name?: string | null;
          redirect_uris: string[];
          grant_types?: string[];
          response_types?: string[];
          token_endpoint_auth_method?: string;
          scope?: string | null;
          client_uri?: string | null;
          logo_uri?: string | null;
          software_id?: string | null;
          software_version?: string | null;
          raw_metadata?: Json;
          created_at?: string;
        };
        Update: {
          client_name?: string | null;
          redirect_uris?: string[];
          scope?: string | null;
        };
        Relationships: [];
      };

      oauth_authorization_codes: {
        Row: {
          code_hash: string;
          client_id: string;
          user_id: string;
          redirect_uri: string;
          code_challenge: string;
          code_challenge_method: string;
          scopes: string[];
          resource: string | null;
          expires_at: string;
          consumed_at: string | null;
          created_at: string;
        };
        Insert: {
          code_hash: string;
          client_id: string;
          user_id: string;
          redirect_uri: string;
          code_challenge: string;
          code_challenge_method?: string;
          scopes: string[];
          resource?: string | null;
          expires_at: string;
          consumed_at?: string | null;
          created_at?: string;
        };
        Update: {
          consumed_at?: string | null;
        };
        Relationships: [];
      };

      oauth_tokens: {
        Row: {
          token_hash: string;
          kind: OAuthTokenKind;
          client_id: string;
          user_id: string;
          scopes: string[];
          resource: string | null;
          expires_at: string;
          revoked_at: string | null;
          parent_hash: string | null;
          created_at: string;
        };
        Insert: {
          token_hash: string;
          kind: OAuthTokenKind;
          client_id: string;
          user_id: string;
          scopes: string[];
          resource?: string | null;
          expires_at: string;
          revoked_at?: string | null;
          parent_hash?: string | null;
          created_at?: string;
        };
        Update: {
          revoked_at?: string | null;
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
    Functions: {
      purge_expired_oauth_artifacts: {
        Args: Record<never, never>;
        Returns: undefined;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};

export type PostRow = Database["public"]["Tables"]["posts"]["Row"];
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type OAuthClientRow = Database["public"]["Tables"]["oauth_clients"]["Row"];
export type OAuthCodeRow = Database["public"]["Tables"]["oauth_authorization_codes"]["Row"];
export type OAuthTokenRow = Database["public"]["Tables"]["oauth_tokens"]["Row"];
