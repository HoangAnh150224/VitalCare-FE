/** FE-04: what `/vital_signs` and `/my_vital_signs` return. */

export type VitalReading = {
  id: number;
  measuredAt: string;
  receivedAt: string;
  heartRate: number | null;
  spo2: number | null;
  skinTemperature: number | null;
  /** Estimated from the skin temperature, mouth-equivalent. */
  bodyTemperature: number | null;
  source: "REST" | "MQTT" | "SIMULATOR";
  validationStatus: "VALID" | "INVALID";
  validationError: string | null;
  deviceId: number | null;
  deviceCode: string | null;
};

export type VitalDetail = VitalReading & {
  clientRecordId: string | null;
  deviceModel: string | null;
  customerId: number | null;
  customerCode: string | null;
  customerName: string | null;
  sessionId: number | null;
  sessionStatus: "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | null;
  sessionStartedAt: string | null;
  sessionEndedAt: string | null;
};

/** A patient's latest value of each measure, each with its own time. */
export type VitalLatest = {
  heartRate: number | null;
  heartRateAt: string | null;
  spo2: number | null;
  spo2At: string | null;
  skinTemperature: number | null;
  skinTemperatureAt: string | null;
  bodyTemperature: number | null;
  bodyTemperatureAt: string | null;
  lastMeasuredAt: string | null;
  readings24h: number;
};

export type MonitoredPatient = {
  customerId: number;
  customerCode: string;
  customerName: string;
  deviceId: number;
  deviceCode: string;
  connectivity: "ONLINE" | "OFFLINE";
  batteryLevel: number | null;
  assignedAt: string | null;
  latest: VitalLatest;
};

export type VitalTrendPoint = {
  /** Local time of the bucket's start, without an offset. */
  at: string;
  readings: number;
  heartRateMin: number | null;
  heartRateAvg: number | null;
  heartRateMax: number | null;
  spo2Min: number | null;
  spo2Avg: number | null;
  spo2Max: number | null;
  skinTemperatureMin: number | null;
  skinTemperatureAvg: number | null;
  skinTemperatureMax: number | null;
  bodyTemperatureAvg: number | null;
  /** Not sent by every server; the chart falls back to the average. */
  bodyTemperatureMin?: number | null;
  bodyTemperatureMax?: number | null;
};

export type VitalTrend = {
  unit: "hour" | "day";
  from: string;
  to: string;
  points: VitalTrendPoint[];
};

export const SESSION_STATUS_LABELS: Record<
  NonNullable<VitalDetail["sessionStatus"]>,
  string
> = {
  IN_PROGRESS: "Đang đo",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã huỷ",
};
