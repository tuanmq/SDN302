import mongoose, { Document, Schema } from 'mongoose';

export type AuditAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'VIEW'
  | 'EXPORT';

export interface IAuditLog extends Document {
  user_id: mongoose.Types.ObjectId | null;
  username: string;
  action: AuditAction;
  resource: string;
  details: string;
  ip_address?: string | null;
  created_at: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    username: { type: String, required: true },
    action: { type: String, required: true, enum: ['LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', 'VIEW', 'EXPORT'] },
    resource: { type: String, required: true },
    details: { type: String, default: '' },
    ip_address: { type: String, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

AuditLogSchema.index({ created_at: -1 });
AuditLogSchema.index({ action: 1, created_at: -1 });
AuditLogSchema.index({ user_id: 1, created_at: -1 });

export const AuditLogModel = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

export interface AuditLogCreateDto {
  user_id?: string | null;
  username: string;
  action: AuditAction;
  resource: string;
  details?: string;
  ip_address?: string | null;
}
