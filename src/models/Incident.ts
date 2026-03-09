import { Schema, model, models } from "mongoose";

export type IncidentType = "Women" | "Children" | "Women & Children";
export type IncidentSeverity = "Low" | "Medium" | "High" | "Critical";

export interface IncidentDocument {
  victim: string;
  dateTime: Date;
  location: string;
  description: string;
  language: string;
  incidentType: IncidentType;
  severity: IncidentSeverity;
}

const incidentSchema = new Schema<IncidentDocument>(
  {
    victim: {
      type: String,
      required: true,
      trim: true,
    },
    dateTime: {
      type: Date,
      required: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    language: {
      type: String,
      trim: true,
    },
    incidentType: {
      type: String,
      enum: ["Women", "Children", "Women & Children"],
      required: true,
    },
    severity: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

incidentSchema.index({ dateTime: -1 });
incidentSchema.index({ severity: 1 });

const Incident =
  models.Incident || model<IncidentDocument>("Incident", incidentSchema);

export default Incident;
