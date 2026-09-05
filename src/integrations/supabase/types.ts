export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      applications: {
        Row: {
          cover_note: string | null
          created_at: string
          id: string
          job_id: string
          match_score: number
          status: Database["public"]["Enums"]["application_status"]
          user_id: string
        }
        Insert: {
          cover_note?: string | null
          created_at?: string
          id?: string
          job_id: string
          match_score?: number
          status?: Database["public"]["Enums"]["application_status"]
          user_id: string
        }
        Update: {
          cover_note?: string | null
          created_at?: string
          id?: string
          job_id?: string
          match_score?: number
          status?: Database["public"]["Enums"]["application_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          certificate_number: string
          id: string
          issued_at: string
          learner_name: string
          module_id: string
          module_title: string
          provider: string
          score: number | null
          user_id: string
        }
        Insert: {
          certificate_number: string
          id?: string
          issued_at?: string
          learner_name: string
          module_id: string
          module_title: string
          provider: string
          score?: number | null
          user_id: string
        }
        Update: {
          certificate_number?: string
          id?: string
          issued_at?: string
          learner_name?: string
          module_id?: string
          module_title?: string
          provider?: string
          score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "training_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          joined_at: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          joined_at?: string
          last_read_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          joined_at?: string
          last_read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_settings: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          is_muted: boolean
          is_pinned: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          is_muted?: boolean
          is_pinned?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          is_muted?: boolean
          is_pinned?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_settings_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          area_key: string | null
          avatar_url: string | null
          created_at: string
          created_by: string | null
          id: string
          is_group: boolean
          last_message_at: string
          title: string | null
        }
        Insert: {
          area_key?: string | null
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_group?: boolean
          last_message_at?: string
          title?: string | null
        }
        Update: {
          area_key?: string | null
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_group?: boolean
          last_message_at?: string
          title?: string | null
        }
        Relationships: []
      }
      data_purchase_requests: {
        Row: {
          company_name: string
          contact_email: string
          contact_name: string
          created_at: string
          dataset: string
          id: string
          phone: string | null
          purpose: string | null
          record_count: number | null
          status: string
        }
        Insert: {
          company_name: string
          contact_email: string
          contact_name: string
          created_at?: string
          dataset: string
          id?: string
          phone?: string | null
          purpose?: string | null
          record_count?: number | null
          status?: string
        }
        Update: {
          company_name?: string
          contact_email?: string
          contact_name?: string
          created_at?: string
          dataset?: string
          id?: string
          phone?: string | null
          purpose?: string | null
          record_count?: number | null
          status?: string
        }
        Relationships: []
      }
      device_tokens: {
        Row: {
          created_at: string
          id: string
          platform: string
          token: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform?: string
          token: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          token?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      donation_campaigns: {
        Row: {
          beneficiaries: number
          category: string
          cover_url: string | null
          created_at: string
          created_by: string | null
          currency: string
          description: string
          ends_at: string | null
          goal_amount: number
          id: string
          is_active: boolean
          slug: string
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          beneficiaries?: number
          category?: string
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string
          ends_at?: string | null
          goal_amount?: number
          id?: string
          is_active?: boolean
          slug: string
          starts_at?: string
          title: string
          updated_at?: string
        }
        Update: {
          beneficiaries?: number
          category?: string
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string
          ends_at?: string | null
          goal_amount?: number
          id?: string
          is_active?: boolean
          slug?: string
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      donations: {
        Row: {
          amount: number
          campaign_id: string | null
          created_at: string
          currency: string
          donor_name: string
          donor_type: Database["public"]["Enums"]["donor_type"]
          donor_user_id: string | null
          id: string
          is_anonymous: boolean
          is_recurring: boolean
          message: string | null
          method: string
          reference: string | null
          status: Database["public"]["Enums"]["donation_status"]
        }
        Insert: {
          amount: number
          campaign_id?: string | null
          created_at?: string
          currency?: string
          donor_name?: string
          donor_type?: Database["public"]["Enums"]["donor_type"]
          donor_user_id?: string | null
          id?: string
          is_anonymous?: boolean
          is_recurring?: boolean
          message?: string | null
          method?: string
          reference?: string | null
          status?: Database["public"]["Enums"]["donation_status"]
        }
        Update: {
          amount?: number
          campaign_id?: string | null
          created_at?: string
          currency?: string
          donor_name?: string
          donor_type?: Database["public"]["Enums"]["donor_type"]
          donor_user_id?: string | null
          id?: string
          is_anonymous?: boolean
          is_recurring?: boolean
          message?: string | null
          method?: string
          reference?: string | null
          status?: Database["public"]["Enums"]["donation_status"]
        }
        Relationships: [
          {
            foreignKeyName: "donations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "donation_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      donor_contacts: {
        Row: {
          company_registration: string | null
          contact_name: string | null
          created_at: string
          donation_id: string
          email: string | null
          id: string
          phone: string | null
        }
        Insert: {
          company_registration?: string | null
          contact_name?: string | null
          created_at?: string
          donation_id: string
          email?: string | null
          id?: string
          phone?: string | null
        }
        Update: {
          company_registration?: string | null
          contact_name?: string | null
          created_at?: string
          donation_id?: string
          email?: string | null
          id?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "donor_contacts_donation_id_fkey"
            columns: ["donation_id"]
            isOneToOne: false
            referencedRelation: "donations"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          completed_at: string | null
          id: string
          module_id: string
          progress: number
          score: number | null
          started_at: string
          status: Database["public"]["Enums"]["enrollment_status"]
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          module_id: string
          progress?: number
          score?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["enrollment_status"]
          user_id: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          module_id?: string
          progress?: number
          score?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["enrollment_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "training_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          category: string
          city: string | null
          closes_at: string | null
          company: string
          created_at: string
          description: string
          disability_friendly: boolean
          employment_type: string
          id: string
          is_active: boolean
          max_age: number
          min_age: number
          min_experience: number
          positions: number
          posted_by: string | null
          province: string | null
          required_qualification: string | null
          required_skills: string[]
          salary_max: number | null
          salary_min: number | null
          title: string
        }
        Insert: {
          category?: string
          city?: string | null
          closes_at?: string | null
          company: string
          created_at?: string
          description?: string
          disability_friendly?: boolean
          employment_type?: string
          id?: string
          is_active?: boolean
          max_age?: number
          min_age?: number
          min_experience?: number
          positions?: number
          posted_by?: string | null
          province?: string | null
          required_qualification?: string | null
          required_skills?: string[]
          salary_max?: number | null
          salary_min?: number | null
          title: string
        }
        Update: {
          category?: string
          city?: string | null
          closes_at?: string | null
          company?: string
          created_at?: string
          description?: string
          disability_friendly?: boolean
          employment_type?: string
          id?: string
          is_active?: boolean
          max_age?: number
          min_age?: number
          min_experience?: number
          positions?: number
          posted_by?: string | null
          province?: string | null
          required_qualification?: string | null
          required_skills?: string[]
          salary_max?: number | null
          salary_min?: number | null
          title?: string
        }
        Relationships: []
      }
      live_locations: {
        Row: {
          accuracy: number | null
          conversation_id: string
          created_at: string
          expires_at: string
          id: string
          latitude: number
          longitude: number
          updated_at: string
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          conversation_id: string
          created_at?: string
          expires_at: string
          id?: string
          latitude: number
          longitude: number
          updated_at?: string
          user_id: string
        }
        Update: {
          accuracy?: number | null
          conversation_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          latitude?: number
          longitude?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_locations_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      message_receipts: {
        Row: {
          conversation_id: string
          delivered_at: string
          id: string
          message_id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          delivered_at?: string
          id?: string
          message_id: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          delivered_at?: string
          id?: string
          message_id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_receipts_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_receipts_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string | null
          conversation_id: string
          created_at: string
          deleted_at: string | null
          duration_ms: number | null
          id: string
          kind: Database["public"]["Enums"]["message_kind"]
          latitude: number | null
          longitude: number | null
          media_mime: string | null
          media_path: string | null
          media_size: number | null
          reply_to: string | null
          sender_id: string
        }
        Insert: {
          body?: string | null
          conversation_id: string
          created_at?: string
          deleted_at?: string | null
          duration_ms?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["message_kind"]
          latitude?: number | null
          longitude?: number | null
          media_mime?: string | null
          media_path?: string | null
          media_size?: number | null
          reply_to?: string | null
          sender_id: string
        }
        Update: {
          body?: string | null
          conversation_id?: string
          created_at?: string
          deleted_at?: string | null
          duration_ms?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["message_kind"]
          latitude?: number | null
          longitude?: number | null
          media_mime?: string | null
          media_path?: string | null
          media_size?: number | null
          reply_to?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          availability: string | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          company_name: string | null
          created_at: string
          cv_path: string | null
          date_of_birth: string | null
          disability_detail: string | null
          drivers_licence: boolean
          email: string | null
          experience_years: number
          field_of_study: string | null
          full_name: string
          gender: string | null
          has_disability: boolean
          highest_qualification: string | null
          id: string
          is_public: boolean
          languages: string[]
          last_seen_at: string
          member_type: Database["public"]["Enums"]["member_type"]
          phone: string | null
          province: string | null
          skills: string[]
          suburb: string | null
          updated_at: string
        }
        Insert: {
          availability?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string
          cv_path?: string | null
          date_of_birth?: string | null
          disability_detail?: string | null
          drivers_licence?: boolean
          email?: string | null
          experience_years?: number
          field_of_study?: string | null
          full_name?: string
          gender?: string | null
          has_disability?: boolean
          highest_qualification?: string | null
          id: string
          is_public?: boolean
          languages?: string[]
          last_seen_at?: string
          member_type?: Database["public"]["Enums"]["member_type"]
          phone?: string | null
          province?: string | null
          skills?: string[]
          suburb?: string | null
          updated_at?: string
        }
        Update: {
          availability?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string
          cv_path?: string | null
          date_of_birth?: string | null
          disability_detail?: string | null
          drivers_licence?: boolean
          email?: string | null
          experience_years?: number
          field_of_study?: string | null
          full_name?: string
          gender?: string | null
          has_disability?: boolean
          highest_qualification?: string | null
          id?: string
          is_public?: boolean
          languages?: string[]
          last_seen_at?: string
          member_type?: Database["public"]["Enums"]["member_type"]
          phone?: string | null
          province?: string | null
          skills?: string[]
          suburb?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reel_likes: {
        Row: {
          created_at: string
          id: string
          reel_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reel_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reel_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reel_likes_reel_id_fkey"
            columns: ["reel_id"]
            isOneToOne: false
            referencedRelation: "talent_reels"
            referencedColumns: ["id"]
          },
        ]
      }
      service_ratings: {
        Row: {
          area: string
          comment: string | null
          created_at: string
          id: string
          stars: number
          user_id: string | null
        }
        Insert: {
          area?: string
          comment?: string | null
          created_at?: string
          id?: string
          stars: number
          user_id?: string | null
        }
        Update: {
          area?: string
          comment?: string | null
          created_at?: string
          id?: string
          stars?: number
          user_id?: string | null
        }
        Relationships: []
      }
      status_posts: {
        Row: {
          background: string | null
          body: string | null
          created_at: string
          expires_at: string
          id: string
          kind: string
          media_mime: string | null
          media_path: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          background?: string | null
          body?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          kind?: string
          media_mime?: string | null
          media_path?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          background?: string | null
          body?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          kind?: string
          media_mime?: string | null
          media_path?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      talent_reels: {
        Row: {
          area: string | null
          caption: string | null
          created_at: string
          duration_ms: number | null
          id: string
          is_public: boolean
          kind: string
          media_mime: string | null
          media_path: string
          skill_tag: string | null
          title: string
          updated_at: string
          user_id: string
          views: number
        }
        Insert: {
          area?: string | null
          caption?: string | null
          created_at?: string
          duration_ms?: number | null
          id?: string
          is_public?: boolean
          kind?: string
          media_mime?: string | null
          media_path: string
          skill_tag?: string | null
          title: string
          updated_at?: string
          user_id: string
          views?: number
        }
        Update: {
          area?: string | null
          caption?: string | null
          created_at?: string
          duration_ms?: number | null
          id?: string
          is_public?: boolean
          kind?: string
          media_mime?: string | null
          media_path?: string
          skill_tag?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          views?: number
        }
        Relationships: []
      }
      training_modules: {
        Row: {
          accrediting_body: string | null
          category: string
          created_at: string
          credits: number | null
          description: string
          duration_hours: number
          id: string
          is_accredited: boolean
          is_active: boolean
          manual_url: string | null
          max_age: number
          min_age: number
          nqf_level: number | null
          provider: string
          required_qualification: string | null
          tags: string[]
          title: string
        }
        Insert: {
          accrediting_body?: string | null
          category?: string
          created_at?: string
          credits?: number | null
          description?: string
          duration_hours?: number
          id?: string
          is_accredited?: boolean
          is_active?: boolean
          manual_url?: string | null
          max_age?: number
          min_age?: number
          nqf_level?: number | null
          provider: string
          required_qualification?: string | null
          tags?: string[]
          title: string
        }
        Update: {
          accrediting_body?: string | null
          category?: string
          created_at?: string
          credits?: number | null
          description?: string
          duration_hours?: number
          id?: string
          is_accredited?: boolean
          is_active?: boolean
          manual_url?: string | null
          max_age?: number
          min_age?: number
          nqf_level?: number | null
          provider?: string
          required_qualification?: string | null
          tags?: string[]
          title?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      allocate_area_group: { Args: { _user_id: string }; Returns: string }
      area_key_of: { Args: { _city: string; _suburb: string }; Returns: string }
      area_label_of: {
        Args: { _city: string; _suburb: string }
        Returns: string
      }
      auto_allocate_area: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_participant: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      start_direct_chat: {
        Args: { _other_id: string; _title?: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "recruiter" | "caterer" | "student" | "jobseeker"
      application_status:
        | "submitted"
        | "shortlisted"
        | "interview"
        | "offered"
        | "placed"
        | "rejected"
      donation_status: "pending" | "completed" | "failed" | "refunded"
      donor_type: "individual" | "company" | "foundation" | "government" | "ngo"
      enrollment_status: "enrolled" | "in_progress" | "completed" | "withdrawn"
      member_type: "student" | "jobseeker" | "recruiter" | "caterer"
      message_kind:
        | "text"
        | "image"
        | "video"
        | "audio"
        | "file"
        | "location"
        | "contact"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "recruiter", "caterer", "student", "jobseeker"],
      application_status: [
        "submitted",
        "shortlisted",
        "interview",
        "offered",
        "placed",
        "rejected",
      ],
      donation_status: ["pending", "completed", "failed", "refunded"],
      donor_type: ["individual", "company", "foundation", "government", "ngo"],
      enrollment_status: ["enrolled", "in_progress", "completed", "withdrawn"],
      member_type: ["student", "jobseeker", "recruiter", "caterer"],
      message_kind: [
        "text",
        "image",
        "video",
        "audio",
        "file",
        "location",
        "contact",
      ],
    },
  },
} as const
