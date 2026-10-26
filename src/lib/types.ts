// Row types for the Supabase tables used by the client portal and admin.
// Mirrors supabase/migrations — keep in sync when the schema changes.

export interface Profile {
  id: string;
  full_name: string | null;
  company: string | null;
  role: string;
  email: string | null;
  avatar_initials: string | null;
  phone: string | null;
  job_title: string | null;
  website: string | null;
  platform: string | null;
  onboarding: Record<string, unknown> | null;
  onboarded_at: string | null;
  welcome_sent_at: string | null;
  created_at: string;
}

export interface Inquiry {
  id: string;
  full_name: string;
  work_email: string;
  company: string | null;
  website: string | null;
  platform: string | null;
  revenue: string;
  budget: string;
  timeline: string | null;
  services: string[] | null;
  goal: string;
  status: string;
  plan: string | null;
  admin_note: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  client_id: string;
  inquiry_id: string | null;
  name: string;
  description: string | null;
  status: string;
  plan: string | null;
  started_at: string | null;
  created_at: string;
}

export interface MilestoneTask {
  id: string;
  milestone_id: string;
  name: string;
  status: string;
  sort_order: number;
}

export interface Milestone {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  status: string;
  due_date: string | null;
  sort_order: number;
  created_at: string;
  tasks?: MilestoneTask[];
}

export interface Deliverable {
  id: string;
  project_id: string;
  name: string;
  type: string;
  url: string | null;
  meta: string | null;
  status: string;
  delivered_at: string | null;
  due_date: string | null;
  created_at: string;
}

export interface Ticket {
  id: string;
  project_id: string;
  client_id: string;
  title: string;
  description: string | null;
  category: string | null;
  status: string;
  ticket_ref: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketReply {
  id: string;
  ticket_id: string;
  author_id: string | null;
  author_name: string | null;
  content: string;
  is_admin: boolean | null;
  created_at: string;
}

export interface SupportRequest {
  id: string;
  ref: string;
  full_name: string;
  email: string;
  company: string | null;
  store_url: string | null;
  topic: string;
  priority: string;
  subject: string;
  description: string;
  status: string;
  created_at: string;
}

export interface Activity {
  id: string;
  project_id: string;
  text: string;
  color: string;
  created_at: string;
}

export interface StoreIntegration {
  id: string;
  client_id: string;
  platform: string;
  store_url: string;
  is_active: boolean;
  last_synced_at: string | null;
  created_at: string;
}

export interface StoreMetric {
  id: string;
  client_id: string;
  integration_id: string;
  date: string;
  revenue: number;
  orders: number;
  customers: number;
  avg_order_value: number;
  currency: string;
}

export interface StoreOrder {
  id: string;
  client_id: string;
  integration_id: string;
  external_id: string;
  amount: number;
  currency: string;
  customer_name: string | null;
  customer_email: string | null;
  status: string | null;
  platform: string | null;
  ordered_at: string | null;
  created_at: string;
}

export interface Staff {
  id: string;
  full_name: string;
  title: string;
  email: string | null;
  phone: string | null;
  photo_url: string | null;
  city: string | null;
  bio: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Assignment {
  id: string;
  client_id: string;
  staff_id: string;
  role: string;
  is_primary: boolean;
  created_at: string;
  staff?: Staff | null;
}

export interface Metric {
  id: string;
  client_id: string;
  metric: string;
  label: string | null;
  value: number;
  period: string;
  note: string | null;
  source: string;
  created_by: string | null;
  created_at: string;
}

export interface Goal {
  id: string;
  client_id: string;
  metric: string;
  label: string | null;
  target: number;
  due_date: string | null;
  created_at: string;
}

export interface ClientLink {
  id: string;
  client_id: string;
  label: string;
  url: string;
  category: string;
  added_by: string | null;
  created_at: string;
}
