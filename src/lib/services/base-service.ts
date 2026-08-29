import type { SupabaseClient } from "@supabase/supabase-js";

export abstract class BaseService {
  protected supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  protected handleError(error: { message: string; code?: string }): never {
    throw new ServiceError(error.message, error.code);
  }
}

export class ServiceError extends Error {
  readonly code: string | undefined;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "ServiceError";
    this.code = code;
  }
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ServiceResult<T> {
  success: boolean;
  error?: string;
  data?: T;
}
