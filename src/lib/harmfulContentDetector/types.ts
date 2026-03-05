export type Severity = "LOW" | "MED" | "HIGH" | "CRITICAL";

export interface AlertSummary {
  id: number;
  post_id: number;
  category: string;
  severity: Severity;
  fusion_score: number;
  status: string;
  created_at: string;
}

export interface AlertDetail {
  id: number;
  status: string;
  assigned_to?: number | null;
  created_at: string;
  updated_at: string;
  post: Record<string, unknown>;
  analysis: Record<string, unknown>;
}

export interface User {
  id: number;
  email: string;
  role: "ADMIN" | "MODERATOR" | "POLICE";
}

export interface DebugModelCheckRequest {
  text: string;
  lang?: string;
  video_path?: string;
  run_audio: boolean;
}

export interface PostSummary {
  id: number;
  platform: string;
  platform_post_id: string;
  author: string | null;
  text: string;
  url: string | null;
  created_at: string | null;
}
