export interface Project {
  id: string;
  name: string;
  description?: string;
  domain?: string;
  settings: ProjectSettings;
  created_at: string;
  updated_at: string;
  created_by: string;
  status: "active" | "inactive" | "suspended";
}

export interface ProjectSettings {
  auth: {
    enabled: boolean;
    methods: ("email" | "phone" | "oauth")[];
    oauth_providers: string[];
    email_verification: boolean;
    phone_verification: boolean;
  };
  storage: {
    max_file_size: number;
    allowed_types: string[];
    compression: boolean;
  };
  api: {
    rate_limit: number;
    cors_origins: string[];
    webhook_url?: string;
  };
  database: {
    max_collections: number;
    max_documents_per_collection: number;
  };
}

export interface Collection {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  schema: CollectionSchema;
  indexes: CollectionIndex[];
  permissions: CollectionPermissions;
  created_at: string;
  updated_at: string;
  document_count: number;
}

export interface CollectionSchema {
  fields: SchemaField[];
  required: string[];
  unique: string[];
  relations?: SchemaRelation[];
}

export interface SchemaField {
  name: string;
  type:
    | "string"
    | "number"
    | "boolean"
    | "array"
    | "object"
    | "datetime"
    | "file"
    | "reference";
  required: boolean;
  default?: any;
  min?: number;
  max?: number;
  pattern?: string;
  enum?: any[];
  array_type?: string;
  reference_collection?: string;
  reference_field?: string;
}

export interface SchemaRelation {
  field: string;
  collection: string;
  type: "one-to-one" | "one-to-many" | "many-to-many";
  cascade_delete: boolean;
}

export interface CollectionIndex {
  name: string;
  fields: string[];
  type: "asc" | "desc" | "unique" | "fulltext";
}

export interface CollectionPermissions {
  read: string[];
  write: string[];
  delete: string[];
  create: string[];
}

export interface Document {
  id: string;
  collection_id: string;
  project_id: string;
  data: Record<string, any>;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export interface ProjectUser {
  id: string;
  project_id: string;
  email: string;
  phone?: string;
  name?: string;
  avatar?: string;
  status: "active" | "inactive" | "suspended";
  email_verified: boolean;
  phone_verified: boolean;
  oauth_providers: string[];
  preferences: Record<string, any>;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

export interface ProjectApiKey {
  id: string;
  project_id: string;
  name: string;
  key: string;
  permissions: string[];
  expires_at?: string;
  last_used?: string;
  created_at: string;
  created_by: string;
  status: "active" | "inactive";
}

export interface ProjectSession {
  id: string;
  project_id: string;
  user_id: string;
  token: string;
  ip_address: string;
  user_agent: string;
  expires_at: string;
  created_at: string;
  last_activity: string;
}

export interface ProjectFile {
  id: string;
  project_id: string;
  name: string;
  original_name: string;
  mime_type: string;
  size: number;
  path: string;
  uploaded_by: string;
  permissions: string[];
  created_at: string;
  updated_at: string;
}

export interface ProjectWebhook {
  id: string;
  project_id: string;
  name: string;
  url: string;
  events: string[];
  headers: Record<string, string>;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
}

export interface ProjectStats {
  total_users: number;
  total_documents: number;
  total_collections: number;
  total_files: number;
  storage_used: number;
  api_requests_today: number;
  api_requests_total: number;
}
