import { Request } from "express";

export interface AuthenticatedRequest extends Request {
  user: { id: number; name: string }; // The authenticated user
}
