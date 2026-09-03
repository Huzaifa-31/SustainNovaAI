import mongoose, { Schema, Document } from "mongoose";

export type NotificationType =
  | "critical_finding"
  | "cap_assigned"
  | "cap_due_soon"
  | "cap_overdue"
  | "cap_approval_needed"
  | "cap_completed"
  | "processing_completed"
  | "processing_failed";

export type NotificationEntityType = "finding" | "cap" | "document" | "audit";

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  entityId?: mongoose.Types.ObjectId;
  entityType?: NotificationEntityType;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        "critical_finding",
        "cap_assigned",
        "cap_due_soon",
        "cap_overdue",
        "cap_approval_needed",
        "cap_completed",
        "processing_completed",
        "processing_failed",
      ],
      index: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    entityId: { type: Schema.Types.ObjectId, index: true },
    entityType: {
      type: String,
      enum: ["finding", "cap", "document", "audit"],
    },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

// Efficient queries for the notification center
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ organizationId: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>(
  "Notification",
  notificationSchema,
);
