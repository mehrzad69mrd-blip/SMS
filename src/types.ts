export type SMSCategory = "personal" | "transactional" | "promotional" | "otp" | "spam";

export interface ExtractedInfo {
  amount?: string;
  otpCode?: string;
  bankName?: string;
  link?: string;
}

export interface SimulatedSMS {
  id: string;
  sender: string;
  receiver: string;
  text: string;
  timestamp: string;
  category: SMSCategory;
  summary?: string;
  senderName?: string;
  extractedInfo?: ExtractedInfo;
  isRead: boolean;
  scheduledTime?: string;
  status: "delivered" | "scheduled" | "failed";
}

export interface SMSCategoryConfig {
  id: SMSCategory;
  labelFa: string;
  labelEn: string;
  color: string;
  bgLight: string;
  borderLight: string;
  iconName: string;
}

export interface PresetSMSTemplate {
  id: string;
  sender: string;
  senderName: string;
  text: string;
  category: SMSCategory;
  descriptionFa: string;
}
