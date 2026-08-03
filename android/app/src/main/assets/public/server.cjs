var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_url = require("url");
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
var import_meta = {};
import_dotenv.default.config();
var __filename = (0, import_url.fileURLToPath)(import_meta.url);
var __dirname = import_path.default.dirname(__filename);
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json());
var smsList = [
  {
    id: "sms-1",
    sender: "09123456789",
    receiver: "09998887766",
    text: "\u0633\u0644\u0627\u0645 \u0645\u0647\u0631\u0627\u0646 \u062C\u0627\u0646\u060C \u0641\u0631\u062F\u0627 \u0633\u0627\u0639\u062A \u06F5 \u062C\u0644\u0633\u0647 \u06A9\u0627\u0631\u06CC \u062F\u0627\u0631\u06CC\u0645. \u0644\u0637\u0641\u0627 \u0641\u0627\u06CC\u0644 \u0637\u0631\u062D \u062C\u062F\u06CC\u062F \u0631\u0648 \u0628\u06CC\u0627\u0631.",
    timestamp: new Date(Date.now() - 36e5 * 24).toISOString(),
    // 1 day ago
    category: "personal",
    senderName: "\u0645\u0647\u0631\u0627\u0646",
    summary: "\u0647\u0645\u0627\u0647\u0646\u06AF\u06CC \u062C\u0644\u0633\u0647 \u06A9\u0627\u0631\u06CC \u0628\u0631\u0627\u06CC \u0641\u0631\u062F\u0627 \u0633\u0627\u0639\u062A \u06F5 \u0648 \u0622\u0648\u0631\u062F\u0646 \u0641\u0627\u06CC\u0644 \u0637\u0631\u062D \u062C\u062F\u06CC\u062F",
    isRead: true,
    status: "delivered"
  },
  {
    id: "sms-2",
    sender: "BankMelli",
    receiver: "09998887766",
    text: "\u0628\u0627\u0646\u06A9 \u0645\u0644\u06CC \u0627\u06CC\u0631\u0627\u0646\n\u0628\u0631\u062F\u0627\u0634\u062A \u0645\u0628\u0644\u063A: \u06F5,\u06F0\u06F0\u06F0,\u06F0\u06F0\u06F0 \u0631\u06CC\u0627\u0644\n\u0627\u0632 \u062D\u0633\u0627\u0628: ***\u06F1\u06F2\u06F3\u06F4\n\u0645\u0627\u0646\u062F\u0647 \u062C\u062F\u06CC\u062F: \u06F1\u06F2,\u06F5\u06F0\u06F0,\u06F0\u06F0\u06F0 \u0631\u06CC\u0627\u0644\n\u06F1\u06F4\u06F0\u06F6/\u06F0\u06F5/\u06F1\u06F2 \u06F1\u06F2:\u06F3\u06F4",
    timestamp: new Date(Date.now() - 36e5 * 6).toISOString(),
    // 6 hours ago
    category: "transactional",
    senderName: "\u0628\u0627\u0646\u06A9 \u0645\u0644\u06CC",
    summary: "\u0628\u0631\u062F\u0627\u0634\u062A \u0645\u0628\u0644\u063A \u06F5\u06F0,\u06F0\u06F0\u06F0 \u062A\u0648\u0645\u0627\u0646 \u0627\u0632 \u062D\u0633\u0627\u0628 \u0628\u0627\u0646\u06A9 \u0645\u0644\u06CC",
    extractedInfo: {
      amount: "5,000,000 \u0631\u06CC\u0627\u0644",
      bankName: "\u0628\u0627\u0646\u06A9 \u0645\u0644\u06CC"
    },
    isRead: false,
    status: "delivered"
  },
  {
    id: "sms-3",
    sender: "Digikala",
    receiver: "09998887766",
    text: "\u06A9\u062F \u062A\u0627\u06CC\u06CC\u062F \u0648\u0631\u0648\u062F \u0634\u0645\u0627 \u0628\u0647 \u062F\u06CC\u062C\u06CC\u200C\u06A9\u0627\u0644\u0627: \u06F8\u06F9\u06F4\u06F3\u06F1\n\u0627\u0639\u062A\u0628\u0627\u0631 \u06A9\u062F \u06F2 \u062F\u0642\u06CC\u0642\u0647.",
    timestamp: new Date(Date.now() - 18e5).toISOString(),
    // 30 mins ago
    category: "otp",
    senderName: "\u062F\u06CC\u062C\u06CC\u200C\u06A9\u0627\u0644\u0627",
    summary: "\u06A9\u062F \u062A\u0627\u06CC\u06CC\u062F \u0648\u0631\u0648\u062F \u062F\u06CC\u062C\u06CC\u200C\u06A9\u0627\u0644\u0627",
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
    text: "\u062C\u0634\u0646\u0648\u0627\u0631\u0647 \u062A\u0627\u0628\u0633\u062A\u0627\u0646\u0647 \u0622\u063A\u0627\u0632 \u0634\u062F! \u062A\u062E\u0641\u06CC\u0641 \u062A\u0627 \u06F7\u06F0 \u062F\u0631\u0635\u062F \u0631\u0648\u06CC \u062A\u0645\u0627\u0645 \u062E\u062F\u0645\u0627\u062A \u062F\u0646\u062F\u0627\u0646\u067E\u0632\u0634\u06A9\u06CC \u0641\u0642\u0637 \u062A\u0627 \u0641\u0631\u062F\u0627 \u0634\u0628. \u062B\u0628\u062A\u200C\u0646\u0627\u0645 \u062F\u0631: https://dent-promo.ir",
    timestamp: new Date(Date.now() - 9e5).toISOString(),
    // 15 mins ago
    category: "promotional",
    senderName: "\u062C\u0634\u0646\u0648\u0627\u0631\u0647 \u062A\u0627\u0628\u0633\u062A\u0627\u0646\u0647 \u062F\u0646\u062F\u0627\u0646\u067E\u0632\u0634\u06A9\u06CC",
    summary: "\u062A\u0628\u0644\u06CC\u063A \u062C\u0634\u0646\u0648\u0627\u0631\u0647 \u062A\u0627\u0628\u0633\u062A\u0627\u0646\u0647 \u0628\u0627 \u06F7\u06F0\u066A \u062A\u062E\u0641\u06CC\u0641 \u062F\u0646\u062F\u0627\u0646\u067E\u0632\u0634\u06A9\u06CC \u0648 \u0644\u06CC\u0646\u06A9 \u062B\u0628\u062A\u200C\u0646\u0627\u0645",
    extractedInfo: {
      link: "https://dent-promo.ir"
    },
    isRead: true,
    status: "delivered"
  }
];
var aiClient = null;
function getGemini() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined. Please configure it in your Secrets panel.");
    }
    aiClient = new import_genai.GoogleGenAI({
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
app.get("/api/messages", (req, res) => {
  res.json({ success: true, data: smsList });
});
app.post("/api/messages/:id/read", (req, res) => {
  const { id } = req.params;
  const sms = smsList.find((item) => item.id === id);
  if (sms) {
    sms.isRead = true;
    res.json({ success: true, data: sms });
  } else {
    res.status(404).json({ success: false, error: "SMS not found" });
  }
});
app.delete("/api/messages/:id", (req, res) => {
  const { id } = req.params;
  const index = smsList.findIndex((item) => item.id === id);
  if (index !== -1) {
    smsList.splice(index, 1);
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false, error: "SMS not found" });
  }
});
app.post("/api/messages/reset", (req, res) => {
  smsList = [
    {
      id: "sms-1",
      sender: "09123456789",
      receiver: "09998887766",
      text: "\u0633\u0644\u0627\u0645 \u0645\u0647\u0631\u0627\u0646 \u062C\u0627\u0646\u060C \u0641\u0631\u062F\u0627 \u0633\u0627\u0639\u062A \u06F5 \u062C\u0644\u0633\u0647 \u06A9\u0627\u0631\u06CC \u062F\u0627\u0631\u06CC\u0645. \u0644\u0637\u0641\u0627 \u0641\u0627\u06CC\u0644 \u0637\u0631\u062D \u062C\u062F\u06CC\u062F \u0631\u0648 \u0628\u06CC\u0627\u0631.",
      timestamp: new Date(Date.now() - 36e5 * 24).toISOString(),
      category: "personal",
      senderName: "\u0645\u0647\u0631\u0627\u0646",
      summary: "\u0647\u0645\u0627\u0647\u0646\u06AF\u06CC \u062C\u0644\u0633\u0647 \u06A9\u0627\u0631\u06CC \u0628\u0631\u0627\u06CC \u0641\u0631\u062F\u0627 \u0633\u0627\u0639\u062A \u06F5 \u0648 \u0622\u0648\u0631\u062F\u0646 \u0641\u0627\u06CC\u0644 \u0637\u0631\u062D \u062C\u062F\u06CC\u062F",
      isRead: true,
      status: "delivered"
    },
    {
      id: "sms-2",
      sender: "BankMelli",
      receiver: "09998887766",
      text: "\u0628\u0627\u0646\u06A9 \u0645\u0644\u06CC \u0627\u06CC\u0631\u0627\u0646\n\u0628\u0631\u062F\u0627\u0634\u062A \u0645\u0628\u0644\u063A: \u06F5,\u06F0\u06F0\u06F0,\u06F0\u06F0\u06F0 \u0631\u06CC\u0627\u0644\n\u0627\u0632 \u062D\u0633\u0627\u0628: ***\u06F1\u06F2\u06F3\u06F4\n\u0645\u0627\u0646\u062F\u0647 \u062C\u062F\u06CC\u062F: \u06F1\u06F2,\u06F5\u06F0\u06F0,\u06F0\u06F0\u06F0 \u0631\u06CC\u0627\u0644\n\u06F1\u06F4\u06F0\u06F6/\u06F0\u06F5/\u06F1\u06F2 \u06F1\u06F2:\u06F3\u06F4",
      timestamp: new Date(Date.now() - 36e5 * 6).toISOString(),
      category: "transactional",
      senderName: "\u0628\u0627\u0646\u06A9 \u0645\u0644\u06CC",
      summary: "\u0628\u0631\u062F\u0627\u0634\u062A \u0645\u0628\u0644\u063A \u06F5\u06F0,\u06F0\u06F0\u06F0 \u062A\u0648\u0645\u0627\u0646 \u0627\u0632 \u062D\u0633\u0627\u0628 \u0628\u0627\u0646\u06A9 \u0645\u0644\u06CC",
      extractedInfo: {
        amount: "5,000,000 \u0631\u06CC\u0627\u0644",
        bankName: "\u0628\u0627\u0646\u06A9 \u0645\u0644\u06CC"
      },
      isRead: false,
      status: "delivered"
    },
    {
      id: "sms-3",
      sender: "Digikala",
      receiver: "09998887766",
      text: "\u06A9\u062F \u062A\u0627\u06CC\u06CC\u062F \u0648\u0631\u0648\u062F \u0634\u0645\u0627 \u0628\u0647 \u062F\u06CC\u062C\u06CC\u200C\u06A9\u0627\u0644\u0627: \u06F8\u06F9\u06F4\u06F3\u06F1\n\u0627\u0639\u062A\u0628\u0627\u0631 \u06A9\u062F \u06F2 \u062F\u0642\u06CC\u0642\u0647.",
      timestamp: new Date(Date.now() - 18e5).toISOString(),
      category: "otp",
      senderName: "\u062F\u06CC\u062C\u06CC\u200C\u06A9\u0627\u0644\u0627",
      summary: "\u06A9\u062F \u062A\u0627\u06CC\u06CC\u062F \u0648\u0631\u0648\u062F \u062F\u06CC\u062C\u06CC\u200C\u06A9\u0627\u0644\u0627",
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
      text: "\u062C\u0634\u0646\u0648\u0627\u0631\u0647 \u062A\u0627\u0628\u0633\u062A\u0627\u0646\u0647 \u0622\u063A\u0627\u0632 \u0634\u062F! \u062A\u062E\u0641\u06CC\u0641 \u062A\u0627 \u06F7\u06F0 \u062F\u0631\u0635\u062F \u0631\u0648\u06CC \u062A\u0645\u0627\u0645 \u062E\u062F\u0645\u0627\u062A \u062F\u0646\u062F\u0627\u0646\u067E\u0632\u0634\u06A9\u06CC \u0641\u0642\u0637 \u062A\u0627 \u0641\u0631\u062F\u0627 \u0634\u0628. \u062B\u0628\u062A\u200C\u0646\u0627\u0645 \u062F\u0631: https://dent-promo.ir",
      timestamp: new Date(Date.now() - 9e5).toISOString(),
      category: "promotional",
      senderName: "\u062C\u0634\u0646\u0648\u0627\u0631\u0647 \u062A\u0627\u0628\u0633\u062A\u0627\u0646\u0647 \u062F\u0646\u062F\u0627\u0646\u067E\u0632\u0634\u06A9\u06CC",
      summary: "\u062A\u0628\u0644\u06CC\u063A \u062C\u0634\u0646\u0648\u0627\u0631\u0647 \u062A\u0627\u0628\u0633\u062A\u0627\u0646\u0647 \u0628\u0627 \u06F7\u06F0\u066A \u062A\u062E\u0641\u06CC\u0641 \u062F\u0646\u062F\u0627\u0646\u067E\u0632\u0634\u06A9\u06CC \u0648 \u0644\u06CC\u0646\u06A9 \u062B\u0628\u062A\u200C\u0646\u0627\u0645",
      extractedInfo: {
        link: "https://dent-promo.ir"
      },
      isRead: true,
      status: "delivered"
    }
  ];
  res.json({ success: true, data: smsList });
});
app.post("/api/categorize", async (req, res) => {
  const { text, sender } = req.body;
  if (!text) {
    return res.status(400).json({ success: false, error: "Text is required" });
  }
  try {
    const ai = getGemini();
    const systemPrompt = `You are an expert mobile SMS classifier and data extractor.
Analyze the given text message (which is often in Persian, but could be English or a mix of both) and perform:
1. Classification: Choose exactly one category from: "personal" (\u0634\u062E\u0635\u06CC/\u0645\u06A9\u0627\u0644\u0645\u0627\u062A), "transactional" (\u067E\u06CC\u0627\u0645\u200C\u0647\u0627\u06CC \u0628\u0627\u0646\u06A9\u06CC \u0648 \u062A\u0631\u0627\u06A9\u0646\u0634\u06CC), "promotional" (\u062A\u0628\u0644\u06CC\u063A\u0627\u062A\u06CC \u0648 \u0627\u0637\u0644\u0627\u0639\u200C\u0631\u0633\u0627\u0646\u06CC \u062C\u0634\u0646\u0648\u0627\u0631\u0647\u200C\u0647\u0627), "otp" (\u06A9\u062F\u0647\u0627\u06CC \u062A\u0627\u06CC\u06CC\u062F \u0647\u0648\u06CC\u062A \u0648 \u0631\u0645\u0632 \u0645\u0648\u0642\u062A), "spam" (\u0647\u0631\u0632\u0646\u0627\u0645\u0647 \u06CC\u0627 \u06A9\u0644\u0627\u0647\u0628\u0631\u062F\u0627\u0631\u06CC).
2. Summarization: Generate a concise, very natural, single-sentence summary of the message in PERSIAN.
3. Sender Identification: Determine the most natural or corporate sender name in Persian (e.g., if sender is "BankMelli" or text says "\u0628\u0627\u0646\u06A9 \u0645\u0644\u06CC", name is "\u0628\u0627\u0646\u06A9 \u0645\u0644\u06CC". If it is Ali, name is "\u0639\u0644\u06CC").
4. Parameter Extraction: Extract key information like amounts (with currency like \u0631\u06CC\u0627\u0644 or \u062A\u0648\u0645\u0627\u0646), OTP verification codes, bank names, or links if present.

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
      contents: `Sender Identifier: "${sender || "unknown"}"
SMS Content:
"${text}"`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: import_genai.Type.OBJECT,
          properties: {
            category: {
              type: import_genai.Type.STRING,
              description: "The classified folder category: personal, transactional, promotional, otp, or spam"
            },
            summary: {
              type: import_genai.Type.STRING,
              description: "Concise summary in Persian (max 12 words)"
            },
            senderName: {
              type: import_genai.Type.STRING,
              description: "Inferred natural Persian sender name"
            },
            extractedInfo: {
              type: import_genai.Type.OBJECT,
              properties: {
                amount: { type: import_genai.Type.STRING, description: "Any money transfer/bank amount extracted" },
                otpCode: { type: import_genai.Type.STRING, description: "Any OTP code extracted" },
                bankName: { type: import_genai.Type.STRING, description: "Any bank name extracted" },
                link: { type: import_genai.Type.STRING, description: "Any website link/URL extracted" }
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
  } catch (error) {
    console.error("Gemini API error:", error);
    const fallbackCategory = (txt) => {
      const lower = txt.toLowerCase();
      if (lower.includes("\u06A9\u062F \u062A\u0627\u06CC\u06CC\u062F") || lower.includes("\u0631\u0645\u0632 \u06CC\u06A9\u0628\u0627\u0631") || lower.includes("otp") || lower.includes("verification")) return "otp";
      if (lower.includes("\u0648\u0627\u0631\u06CC\u0632") || lower.includes("\u0628\u0631\u062F\u0627\u0634\u062A") || lower.includes("\u0628\u0627\u0646\u06A9") || lower.includes("melli") || lower.includes("mellat")) return "transactional";
      if (lower.includes("\u062A\u062E\u0641\u06CC\u0641") || lower.includes("\u062C\u0634\u0646\u0648\u0627\u0631\u0647") || lower.includes("\u062A\u0648\u0631") || lower.includes("\u06A9\u0627\u0647\u0634 \u0642\u06CC\u0645\u062A") || lower.includes("\u062E\u0631\u06CC\u062F \u0622\u0646\u0644\u0627\u06CC\u0646")) return "promotional";
      if (lower.includes("\u0628\u0631\u0646\u062F\u0647") || lower.includes("\u0642\u0631\u0639\u0647\u200C\u06A9\u0634\u06CC") || lower.includes("\u0633\u0648\u062F \u062A\u0636\u0627\u0645\u0646\u06CC") || lower.includes("\u06A9\u0644\u06CC\u06A9 \u06A9\u0646\u06CC\u062F")) return "spam";
      return "personal";
    };
    const cat = fallbackCategory(text);
    const mockSender = sender || "\u0641\u0631\u0633\u062A\u0646\u062F\u0647 \u0646\u0627\u0634\u0646\u0627\u0633";
    res.json({
      success: true,
      classification: {
        category: cat,
        summary: "\u0634\u0628\u06CC\u0647\u200C\u0633\u0627\u0632\u06CC \u0622\u0641\u0644\u0627\u06CC\u0646: " + text.slice(0, 40) + "...",
        senderName: mockSender,
        extractedInfo: {
          otpCode: text.match(/\d{4,6}/)?.[0] || void 0,
          bankName: text.includes("\u0628\u0627\u0646\u06A9") ? "\u0628\u0627\u0646\u06A9 \u0646\u0627\u0645\u0634\u062E\u0635" : void 0
        }
      },
      warning: "\u0627\u0633\u062A\u0641\u0627\u062F\u0647 \u0627\u0632 \u062F\u0633\u062A\u0647\u200C\u0628\u0646\u062F \u0622\u0641\u0644\u0627\u06CC\u0646 \u0628\u0647 \u062F\u0644\u06CC\u0644 \u0639\u062F\u0645 \u062F\u0633\u062A\u0631\u0633\u06CC \u0628\u0647 \u06A9\u0644\u06CC\u062F \u0647\u0648\u0634 \u0645\u0635\u0646\u0648\u0639\u06CC."
    });
  }
});
app.post("/api/messages/simulate", (req, res) => {
  const { sender, text, category, summary, senderName, extractedInfo } = req.body;
  if (!sender || !text) {
    return res.status(400).json({ success: false, error: "Sender and text are required" });
  }
  const newSMS = {
    id: `sms-${Date.now()}`,
    sender,
    receiver: "09998887766",
    text,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
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
app.post("/api/messages/schedule", (req, res) => {
  const { receiver, text, scheduledTime } = req.body;
  if (!receiver || !text || !scheduledTime) {
    return res.status(400).json({ success: false, error: "Receiver, text, and scheduledTime are required" });
  }
  const newScheduledSMS = {
    id: `sms-sched-${Date.now()}`,
    sender: "\u0645\u0646",
    receiver,
    text,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    category: "personal",
    summary: "\u067E\u06CC\u0627\u0645 \u0632\u0645\u0627\u0646\u200C\u0628\u0646\u062F\u06CC \u0634\u062F\u0647 \u0628\u0631\u0627\u06CC " + receiver,
    isRead: true,
    scheduledTime,
    status: "scheduled"
  };
  smsList.unshift(newScheduledSMS);
  res.json({ success: true, data: newScheduledSMS });
});
app.post("/api/messages/schedule/:id/send", (req, res) => {
  const { id } = req.params;
  const sms = smsList.find((item) => item.id === id);
  if (sms && sms.status === "scheduled") {
    sms.status = "delivered";
    sms.timestamp = (/* @__PURE__ */ new Date()).toISOString();
    res.json({ success: true, data: sms });
  } else {
    res.status(400).json({ success: false, error: "Scheduled SMS not found or already sent" });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SMS Hub Server] Listening on http://0.0.0.0:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
