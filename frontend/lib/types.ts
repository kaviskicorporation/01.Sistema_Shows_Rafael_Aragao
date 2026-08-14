export type Role = "admin" | "gerente" | "comercial" | "visualizador";

export type ModuleKey =
  | "events"
  | "crm"
  | "leads"
  | "users"
  | "audit"
  | "config"
  | "dashboard";

export interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: Role;
  is_active: boolean;
  permissions: Record<string, boolean>;
  module_permissions?: Record<string, boolean>;
}

export interface EventImage {
  id: number;
  image: string | null;
  image_url: string;
  caption: string;
  order: number;
}

export type EventStatus =
  | "rascunho"
  | "publicado"
  | "realizado"
  | "oculto"
  | "cancelado";

export interface EventItem {
  id: number;
  name: string;
  slug: string;
  date: string;
  time: string | null;
  venue: string;
  city: string;
  state: string;
  tickets_link: string;
  external_link: string;
  description: string;
  banner: string | null;
  banner_url: string;
  banner_display: string;
  card_bg_preset: string;
  card_bg_color: string;
  card_bg_image: string | null;
  card_bg_image_url: string;
  card_bg_image_display?: string;
  status: EventStatus;
  status_display: string;
  internal_notes: string;
  hide_override: string;
  hide_days_after: number;
  parent: number | null;
  gallery: EventImage[];
  session_count: number;
  created_at: string;
  updated_at: string;
}

export interface PublicEvent {
  id: number;
  name: string;
  slug: string;
  date: string;
  time: string | null;
  venue: string;
  city: string;
  state: string;
  tickets_link: string;
  external_link: string;
  description: string;
  banner_display: string;
  card_bg_preset?: string;
  card_bg_color?: string;
  card_bg_image_display?: string;
  gallery: EventImage[];
}

export interface Sponsor {
  id: number;
  name: string;
  text_mark: string;
  image: string | null;
  image_url: string;
  image_display?: string;
  link: string;
  order: number;
  is_active: boolean;
}

export interface Lead {
  id: number;
  name: string;
  area_atuacao: string;
  area_outros: string;
  area_display: string;
  email: string;
  phone: string;
  message: string;
  category: string;
  created_at: string;
}

export interface KanbanColumn {
  id: number;
  title: string;
  order: number;
  color: string;
  is_lost: boolean;
  is_won: boolean;
  card_count: number;
}

export interface Label {
  id: number;
  name: string;
  color: string;
}

export interface CardComment {
  id: number;
  card: number;
  author: number | null;
  author_name: string;
  text: string;
  created_at: string;
}

export interface CardNote {
  id: number;
  card: number;
  author: number | null;
  author_name: string;
  text: string;
  pinned?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface ChecklistItem {
  id: number;
  card: number;
  text: string;
  done: boolean;
  order: number;
}

export interface CardHistory {
  id: number;
  user_name: string;
  text: string;
  created_at: string;
}

export interface CardAttachment {
  id: number;
  card: number;
  file: string;
  file_url?: string;
  name: string;
  uploaded_by?: number | null;
  uploaded_by_name?: string;
  uploaded_at: string;
}

export interface CardItem {
  id: number;
  lead: Lead;
  column: number;
  order: number;
  priority: "alta" | "media" | "baixa";
  labels: Label[];
  follow_up_date: string | null;
  responsible: number | null;
  responsible_name: string;
  color: string;
  loss_reason: string;
  comments: CardComment[];
  notes: CardNote[];
  checklist: ChecklistItem[];
  attachments: CardAttachment[];
  history: CardHistory[];
  created_at: string;
  updated_at: string;
}

export interface SiteConfig {
  hero_title: string;
  hero_subtitle_lead?: string;
  hero_subtitle: string;
  hero_image: string | null;
  hero_image_url: string;
  hero_image_display?: string;
  hero_wordmark?: string;
  hero_badge?: string;
  hero_cta_primary?: string;
  hero_cta_secondary?: string;
  hero_cta_icon_primary?: string;
  hero_cta_icon_secondary?: string;
  hero_next_label?: string;
  hero_scroll_label?: string;
  nav_cta?: string;
  nav_icon_cta?: string;
  nav_label_agenda?: string;
  nav_icon_agenda?: string;
  nav_label_sobre?: string;
  nav_icon_sobre?: string;
  nav_label_video?: string;
  nav_icon_video?: string;
  nav_label_contato?: string;
  nav_icon_contato?: string;
  hero_tag_1?: string;
  hero_tag_2?: string;
  hero_tag_3?: string;
  hero_tag_4?: string;
  primary_color: string;
  secondary_color: string;
  about_title: string;
  about_text: string;
  about_image: string | null;
  about_image_url: string;
  about_image_display?: string;
  instagram: string;
  youtube: string;
  spotify: string;
  tiktok: string;
  facebook: string;
  footer_text: string;
  contact_email: string;
  contact_phone: string;
  seo_title: string;
  seo_description: string;
  og_image?: string | null;
  og_image_url: string;
  og_image_display?: string;
  hide_rule: string;
  hide_days_after: number;
  agenda_default_view?: "calendar" | "list";
  agenda_list_page_size?: number;
  featured_video_url?: string;
  sponsors_title?: string;
  sponsors?: Sponsor[];
  contact_eyebrow?: string;
  contact_title_line1?: string;
  contact_title_line2?: string;
  contact_scroll_hint?: string;
  contact_bg_image?: string | null;
  contact_bg_image_url?: string;
  contact_bg_image_display?: string;
  contact_form_config?: import("@/lib/contactForm").ContactFormConfig;
}

export interface DashboardNextEvent {
  id: number;
  name: string;
  slug: string;
  date: string;
  time: string | null;
  city: string;
  state: string;
  venue: string;
  status: string;
}

export interface DashboardRecentLead {
  id: number;
  name: string;
  email: string;
  area?: string;
  category?: string;
  city?: string;
  created_at: string;
}

export interface DashboardData {
  site_title?: string;
  cards: {
    upcoming_events: number;
    realized_events: number;
    events_total?: number;
    events_draft?: number;
    events_published?: number;
    leads_total: number;
    leads_last_30d: number;
    leads_week?: number;
    leads_today?: number;
    in_progress: number;
    won: number;
    lost: number;
    conversion_rate: number;
    pipeline_total?: number;
  };
  next_events?: DashboardNextEvent[];
  recent_leads?: DashboardRecentLead[];
  events_series: { month: string; count: number }[];
  leads_by_status: { status: string; count: number; color: string }[];
  top_cities: { city: string; count: number }[];
  demo_data_active?: boolean;
}

export interface AuditLog {
  id: number;
  user: number | null;
  user_name: string;
  action: string;
  action_display: string;
  model_name: string;
  object_id: string;
  object_repr: string;
  changes: Record<string, unknown>;
  created_at: string;
}

export interface AppNotification {
  id: number;
  title: string;
  message: string;
  link: string;
  is_read: boolean;
  created_at: string;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
