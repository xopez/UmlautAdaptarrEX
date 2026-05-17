export type ProwlarrImportStage = "preview" | "empty";
export type EmptyReason = "none" | "auth" | "fetch";

export interface AppRowState {
  apiKey: string;
  status: "untested" | "testing" | "ok" | "fail";
  error?: string | undefined;
  version?: string | undefined;
}

export interface ProwlarrConfig {
  host: string | null;
  configured: boolean;
}

export interface ExistingInstance {
  id: string;
  type: string;
  name: string;
  host: string;
}
