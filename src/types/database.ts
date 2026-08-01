export type Album = {
  id: string;
  baby_name: string;
  share_slug: string;
  viewer_passcode_hash: string;
  admin_passcode_hash: string;
  share_expires_at: string | null;
  downloads_enabled: boolean;
  cover_photo_id: string | null;
  created_at: string;
};

export type Child = {
  id: string;
  album_id: string;
  name: string;
  birthdate: string | null;
  created_at: string;
};

export type Photo = {
  id: string;
  album_id: string;
  child_id: string | null;
  child_ids: string[];
  storage_key: string;
  thumb_key: string;
  caption: string | null;
  taken_at: string | null;
  uploaded_at: string;
  width: number;
  height: number;
  original_width: number;
  original_height: number;
  mime_type: string;
  file_size_bytes: number;
  deleted_at: string | null;
};

export type Viewer = {
  id: string;
  album_id: string;
  name: string;
  last_seen_at: string | null;
  replies_checked_at: string | null;
  created_at: string;
};

export type Comment = {
  id: string;
  photo_id: string;
  viewer_id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
};

export type Reaction = {
  id: string;
  photo_id: string;
  viewer_id: string;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      albums: {
        Row: Album;
        Insert: Omit<Album, "id" | "created_at" | "share_expires_at" | "downloads_enabled" | "cover_photo_id"> & {
          id?: string;
          created_at?: string;
          share_expires_at?: string | null;
          downloads_enabled?: boolean;
          cover_photo_id?: string | null;
        };
        Update: Partial<Omit<Album, "id" | "created_at">>;
        Relationships: [];
      };
      children: {
        Row: Child;
        Insert: Omit<Child, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<Child, "id" | "album_id" | "created_at">>;
        Relationships: [
          {
            foreignKeyName: "children_album_id_fkey";
            columns: ["album_id"];
            isOneToOne: false;
            referencedRelation: "albums";
            referencedColumns: ["id"];
          },
        ];
      };
      photos: {
        Row: Photo;
        Insert: Omit<Photo, "uploaded_at" | "child_id" | "child_ids" | "deleted_at"> & {
          uploaded_at?: string;
          child_id?: string | null;
          child_ids?: string[];
          deleted_at?: string | null;
        };
        Update: Partial<Omit<Photo, "id" | "album_id" | "uploaded_at">>;
        Relationships: [
          {
            foreignKeyName: "photos_album_id_fkey";
            columns: ["album_id"];
            isOneToOne: false;
            referencedRelation: "albums";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "photos_child_id_fkey";
            columns: ["child_id"];
            isOneToOne: false;
            referencedRelation: "children";
            referencedColumns: ["id"];
          },
        ];
      };
      viewers: {
        Row: Viewer;
        Insert: Omit<Viewer, "id" | "created_at" | "last_seen_at" | "replies_checked_at"> & {
          id?: string;
          created_at?: string;
          last_seen_at?: string | null;
          replies_checked_at?: string | null;
        };
        Update: Partial<Omit<Viewer, "id" | "album_id" | "created_at">>;
        Relationships: [
          {
            foreignKeyName: "viewers_album_id_fkey";
            columns: ["album_id"];
            isOneToOne: false;
            referencedRelation: "albums";
            referencedColumns: ["id"];
          },
        ];
      };
      comments: {
        Row: Comment;
        Insert: Omit<Comment, "id" | "parent_id" | "created_at"> & {
          id?: string;
          parent_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Omit<Comment, "id" | "photo_id" | "viewer_id" | "created_at">>;
        Relationships: [
          {
            foreignKeyName: "comments_photo_id_fkey";
            columns: ["photo_id"];
            isOneToOne: false;
            referencedRelation: "photos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_viewer_id_fkey";
            columns: ["viewer_id"];
            isOneToOne: false;
            referencedRelation: "viewers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "comments";
            referencedColumns: ["id"];
          },
        ];
      };
      reactions: {
        Row: Reaction;
        Insert: Omit<Reaction, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<Reaction, "id" | "photo_id" | "viewer_id" | "created_at">>;
        Relationships: [
          {
            foreignKeyName: "reactions_photo_id_fkey";
            columns: ["photo_id"];
            isOneToOne: false;
            referencedRelation: "photos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reactions_viewer_id_fkey";
            columns: ["viewer_id"];
            isOneToOne: false;
            referencedRelation: "viewers";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
