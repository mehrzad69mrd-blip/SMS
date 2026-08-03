import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory simulated database for SMS and scheduled SMS
interface SimulatedSMS {
  id: string;
  sender: string;
  receiver: string;
  text: string;
  timestamp: string;
  category: "personal" | "transactional" | "promotional" | "otp" | "spam";
  summary?: string;
  senderName?: string;
  extractedInfo?: {
    amount?: string;
    otpCode?: string;
    bankName?: string;
    link?: string;
  };
  isRead: boolean;
  scheduledTime?: string;
  status: "delivered" | "scheduled" | "failed";
}

let smsList: SimulatedSMS[] = [
  {
    id: "sms-1",
    sender: "09123456789",
    receiver: "09998887766",
    text: "سلام مهران جان، فردا ساعت ۵ جلسه کاری داریم. لطفا فایل طرح جدید رو بیار.",
    timestamp: new Date(Date.now() - 3600000 * 24).toISOString(), // 1 day ago
    category: "personal",
    senderName: "مهران",
    summary: "هماهنگی جلسه کاری برای فردا ساعت ۵ و آوردن فایل طرح جدید",
    isRead: true,
    status: "delivered"
  },
  {
    id: "sms-2",
    sender: "BankMelli",
    receiver: "09998887766",
    text: "بانک ملی ایران\nبرداشت مبلغ: ۵,۰۰۰,۰۰۰ ریال\nاز حساب: ***۱۲۳۴\nمانده جدید: ۱۲,۵۰۰,۰۰۰ ریال\n۱۴۰۶/۰۵/۱۲ ۱۲:۳۴",
    timestamp: new Date(Date.now() - 3600000 * 6).toISOString(), // 6 hours ago
    category: "transactional",
    senderName: "بانک ملی",
    summary: "برداشت مبلغ ۵۰,۰۰۰ تومان از حساب بانک ملی",
    extractedInfo: {
      amount: "5,000,000 ریال",
      bankName: "بانک ملی"
    },
    isRead: false,
    status: "delivered"
  },
  {
    id: "sms-3",
    sender: "Digikala",
    receiver: "09998887766",
    text: "کد تایید ورود شما به دیجی‌کالا: ۸۹۴۳۱\nاعتبار کد ۲ دقیقه.",
    timestamp: new Date(Date.now() - 1800000).toISOString(), // 30 mins ago
    category: "otp",
    senderName: "دیجی‌کالا",
    summary: "کد تایید ورود دیجی‌کالا",
    extractedInfo: {
      otpCode: "89431"
    },
    isRead: false,
    status: "delivered"
  },
  {
    id: "sms-4",
    sender: "90001000",
    receiver: "09998887766",
    text: "جشنواره تابستانه آغاز شد! تخفیف تا ۷۰ درصد روی تمام خدمات دندانپزشکی فقط تا فردا شب. ثبت‌نام در: https://dent-promo.ir",
    timestamp: new Date(Date.now() - 900000).toISOString(), // 15 mins ago
    category: "promotional",
    senderName: "جشنواره تابستانه دندانپزشکی",
    summary: "تبلیغ جشنواره تابستانه با ۷۰٪ تخفیف دندانپزشکی و لینک ثبت‌نام",
    extractedInfo: {
      link: "https://dent-promo.ir"
    },
    isRead: true,
    status: "delivered"
  }
];

// Lazy initialization of Gemini API Client
let aiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined. Please configure it in your Secrets panel.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiClient;
}

// REST API Endpoints

// Get all messages
app.get("/api/messages", (req, res) => {
  res.json({ success: true, data: smsList });
});

// Mark SMS as read
app.post("/api/messages/:id/read", (req, res) => {
  const { id } = req.params;
  const sms = smsList.find(item => item.id === id);
  if (sms) {
    sms.isRead = true;
    res.json({ success: true, data: sms });
  } else {
    res.status(404).json({ success: false, error: "SMS not found" });
  }
});

// Delete an SMS
app.delete("/api/messages/:id", (req, res) => {
  const { id } = req.params;
  const index = smsList.findIndex(item => item.id === id);
  if (index !== -1) {
    smsList.splice(index, 1);
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false, error: "SMS not found" });
  }
});

// Clear all messages (reset to initial)
app.post("/api/messages/reset", (req, res) => {
  smsList = [
    {
      id: "sms-1",
      sender: "09123456789",
      receiver: "09998887766",
      text: "سلام مهران جان، فردا ساعت ۵ جلسه کاری داریم. لطفا فایل طرح جدید رو بیار.",
      timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
      category: "personal",
      senderName: "مهران",
      summary: "هماهنگی جلسه کاری برای فردا ساعت ۵ و آوردن فایل طرح جدید",
      isRead: true,
      status: "delivered"
    },
    {
      id: "sms-2",
      sender: "BankMelli",
      receiver: "09998887766",
      text: "بانک ملی ایران\nبرداشت مبلغ: ۵,۰۰۰,۰۰۰ ریال\nاز حساب: ***۱۲۳۴\nمانده جدید: ۱۲,۵۰۰,۰۰۰ ریال\n۱۴۰۶/۰۵/۱۲ ۱۲:۳۴",
      timestamp: new Date(Date.now() - 3600000 * 6).toISOString(),
      category: "transactional",
      senderName: "بانک ملی",
      summary: "برداشت مبلغ ۵۰,۰۰۰ تومان از حساب بانک ملی",
      extractedInfo: {
        amount: "5,000,000 ریال",
        bankName: "بانک ملی"
      },
      isRead: false,
      status: "delivered"
    },
    {
      id: "sms-3",
      sender: "Digikala",
      receiver: "09998887766",
      text: "کد تایید ورود شما به دیجی‌کالا: ۸۹۴۳۱\nاعتبار کد ۲ دقیقه.",
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      category: "otp",
      senderName: "دیجی‌کالا",
      summary: "کد تایید ورود دیجی‌کالا",
      extractedInfo: {
        otpCode: "89431"
      },
      isRead: false,
      status: "delivered"
    },
    {
      id: "sms-4",
      sender: "90001000",
      receiver: "09998887766",
      text: "جشنواره تابستانه آغاز شد! تخفیف تا ۷۰ درصد روی تمام خدمات دندانپزشکی فقط تا فردا شب. ثبت‌نام در: https://dent-promo.ir",
      timestamp: new Date(Date.now() - 900000).toISOString(),
      category: "promotional",
      senderName: "جشنواره تابستانه دندانپزشکی",
      summary: "تبلیغ جشنواره تابستانه با ۷۰٪ تخفیف دندانپزشکی و لینک ثبت‌نام",
      extractedInfo: {
        link: "https://dent-promo.ir"
      },
      isRead: true,
      status: "delivered"
    }
  ];
  res.json({ success: true, data: smsList });
});

// Auto-categorize message using Gemini API
app.post("/api/categorize", async (req, res) => {
  const { text, sender } = req.body;
  if (!text) {
    return res.status(400).json({ success: false, error: "Text is required" });
  }

  try {
    const ai = getGemini();

    const systemPrompt = `You are an expert mobile SMS classifier and data extractor.
Analyze the given text message (which is often in Persian, but could be English or a mix of both) and perform:
1. Classification: Choose exactly one category from: "personal" (شخصی/مکالمات), "transactional" (پیام‌های بانکی و تراکنشی), "promotional" (تبلیغاتی و اطلاع‌رسانی جشنواره‌ها), "otp" (کدهای تایید هویت و رمز موقت), "spam" (هرزنامه یا کلاهبرداری).
2. Summarization: Generate a concise, very natural, single-sentence summary of the message in PERSIAN.
3. Sender Identification: Determine the most natural or corporate sender name in Persian (e.g., if sender is "BankMelli" or text says "بانک ملی", name is "بانک ملی". If it is Ali, name is "علی").
4. Parameter Extraction: Extract key information like amounts (with currency like ریال or تومان), OTP verification codes, bank names, or links if present.

Return response ONLY as valid JSON according to this schema:
{
  "category": "personal" | "transactional" | "promotional" | "otp" | "spam",
  "summary": "concise Persian summary sentence here",
  "senderName": "Sender name in Persian",
  "extractedInfo": {
    "amount": "optional amount string",
    "otpCode": "optional code string",
    "bankName": "optional bank name",
    "link": "optional url link if present"
  }
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: `Sender Identifier: "${sender || 'unknown'}"\nSMS Content:\n"${text}"`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: {
              type: Type.STRING,
              description: "The classified folder category: personal, transactional, promotional, otp, or spam"
            },
            summary: {
              type: Type.STRING,
              description: "Concise summary in Persian (max 12 words)"
            },
            senderName: {
              type: Type.STRING,
              description: "Inferred natural Persian sender name"
            },
            extractedInfo: {
              type: Type.OBJECT,
              properties: {
                amount: { type: Type.STRING, description: "Any money transfer/bank amount extracted" },
                otpCode: { type: Type.STRING, description: "Any OTP code extracted" },
                bankName: { type: Type.STRING, description: "Any bank name extracted" },
                link: { type: Type.STRING, description: "Any website link/URL extracted" }
              }
            }
          },
          required: ["category", "summary", "senderName"]
        }
      }
    });

    const resultText = response.text || "{}";
    const classificationResult = JSON.parse(resultText);

    res.json({ success: true, classification: classificationResult });
  } catch (error: any) {
    console.error("Gemini API error:", error);
    // Fallback classification if API key is not set or errors
    const fallbackCategory = (txt: string) => {
      const lower = txt.toLowerCase();
      if (lower.includes("کد تایید") || lower.includes("رمز یکبار") || lower.includes("otp") || lower.includes("verification")) return "otp";
      if (lower.includes("واریز") || lower.includes("برداشت") || lower.includes("بانک") || lower.includes("melli") || lower.includes("mellat")) return "transactional";
      if (lower.includes("تخفیف") || lower.includes("جشنواره") || lower.includes("تور") || lower.includes("کاهش قیمت") || lower.includes("خرید آنلاین")) return "promotional";
      if (lower.includes("برنده") || lower.includes("قرعه‌کشی") || lower.includes("سود تضامنی") || lower.includes("کلیک کنید")) return "spam";
      return "personal";
    };

    const cat = fallbackCategory(text);
    const mockSender = sender || "فرستنده ناشناس";
    
    res.json({
      success: true,
      classification: {
        category: cat,
        summary: "شبیه‌سازی آفلاین: " + text.slice(0, 40) + "...",
        senderName: mockSender,
        extractedInfo: {
          otpCode: text.match(/\d{4,6}/)?.[0] || undefined,
          bankName: text.includes("بانک") ? "بانک نامشخص" : undefined
        }
      },
      warning: "استفاده از دسته‌بند آفلاین به دلیل عدم دسترسی به کلید هوش مصنوعی."
    });
  }
});

// Simulate incoming message
app.post("/api/messages/simulate", (req, res) => {
  const { sender, text, category, summary, senderName, extractedInfo } = req.body;
  
  if (!sender || !text) {
    return res.status(400).json({ success: false, error: "Sender and text are required" });
  }

  const newSMS: SimulatedSMS = {
    id: `sms-${Date.now()}`,
    sender,
    receiver: "09998887766",
    text,
    timestamp: new Date().toISOString(),
    category: category || "personal",
    summary,
    senderName: senderName || sender,
    extractedInfo,
    isRead: false,
    status: "delivered"
  };

  smsList.unshift(newSMS);
  res.json({ success: true, data: newSMS });
});

// Schedule an SMS for future sending (simulated)
app.post("/api/messages/schedule", (req, res) => {
  const { receiver, text, scheduledTime } = req.body;

  if (!receiver || !text || !scheduledTime) {
    return res.status(400).json({ success: false, error: "Receiver, text, and scheduledTime are required" });
  }

  const newScheduledSMS: SimulatedSMS = {
    id: `sms-sched-${Date.now()}`,
    sender: "من",
    receiver,
    text,
    timestamp: new Date().toISOString(),
    category: "personal",
    summary: "پیام زمان‌بندی شده برای " + receiver,
    isRead: true,
    scheduledTime,
    status: "scheduled"
  };

  smsList.unshift(newScheduledSMS);
  res.json({ success: true, data: newScheduledSMS });
});

// Trigger sending a scheduled message now
app.post("/api/messages/schedule/:id/send", (req, res) => {
  const { id } = req.params;
  const sms = smsList.find(item => item.id === id);
  if (sms && sms.status === "scheduled") {
    sms.status = "delivered";
    sms.timestamp = new Date().toISOString();
    res.json({ success: true, data: sms });
  } else {
    res.status(400).json({ success: false, error: "Scheduled SMS not found or already sent" });
  }
});

// Vite middleware configuration and startup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SMS Hub Server] Listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
