import React, { useState, useEffect, useRef } from "react";
import { 
  MessageSquare, Send, Calendar, User, CreditCard, Tag, KeyRound, ShieldAlert, 
  Trash2, Check, RefreshCw, Smartphone, Search, Plus, X, BarChart3, Clock, Copy, 
  ChevronRight, Info, AlertCircle, Bell, ShieldCheck, Sparkles, Filter, CheckCircle2,
  ListFilter
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { PRESET_TEMPLATES } from "./presets";
import { SMSCategory, SimulatedSMS } from "./types";

export default function App() {
  // App-wide Language
  const [lang, setLang] = useState<"fa" | "en">("fa");

  // State Management
  const [messages, setMessages] = useState<SimulatedSMS[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<SMSCategory | "all">("all");
  const [selectedSMS, setSelectedSMS] = useState<SimulatedSMS | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Custom SMS input simulation
  const [simSender, setSimSender] = useState("");
  const [simText, setSimText] = useState("");
  const [selectedPresetId, setSelectedPresetId] = useState("");

  // Schedule input simulation
  const [schedReceiver, setSchedReceiver] = useState("");
  const [schedText, setSchedText] = useState("");
  const [schedTime, setSchedTime] = useState("");
  const [scheduling, setScheduling] = useState(false);

  // Notifications & UI feedback
  const [notification, setNotification] = useState<{title: string, body: string} | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"phone" | "analytics">("phone");
  const [showAddModal, setShowAddModal] = useState(false);

  // Fetch messages from backend
  const fetchMessages = async () => {
    try {
      const res = await fetch("/api/messages");
      const result = await res.json();
      if (result.success) {
        setMessages(result.data);
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
      setErrorMsg(lang === "fa" ? "خطا در برقراری ارتباط با سرور" : "Error connecting to server");
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  // Poll for scheduled messages every 2.5 seconds to deliver them if current time is past scheduledTime
  useEffect(() => {
    const interval = setInterval(async () => {
      const now = new Date();
      let updatedAny = false;

      for (const msg of messages) {
        if (msg.status === "scheduled" && msg.scheduledTime) {
          const targetTime = new Date(msg.scheduledTime);
          if (now >= targetTime) {
            // Trigger delivery on backend
            try {
              const res = await fetch(`/api/messages/schedule/${msg.id}/send`, { method: "POST" });
              const result = await res.json();
              if (result.success) {
                updatedAny = true;
                // Trigger simulated Android sound / visual notification
                setNotification({
                  title: lang === "fa" ? "پیامک زمان‌بندی شده ارسال شد" : "Scheduled SMS Sent",
                  body: `${lang === "fa" ? "به:" : "To:"} ${msg.receiver} \n ${msg.text.slice(0, 40)}...`
                });
                setTimeout(() => setNotification(null), 5000);
              }
            } catch (err) {
              console.error("Error sending scheduled message:", err);
            }
          }
        }
      }

      if (updatedAny) {
        fetchMessages();
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [messages, lang]);

  // Handle preset selection
  const handlePresetChange = (presetId: string) => {
    setSelectedPresetId(presetId);
    if (!presetId) {
      setSimSender("");
      setSimText("");
      return;
    }
    const preset = PRESET_TEMPLATES.find(p => p.id === presetId);
    if (preset) {
      setSimSender(preset.sender);
      setSimText(preset.text);
    }
  };

  // Perform AI categorization and simulate incoming SMS
  const handleSimulateIncoming = async () => {
    if (!simSender.trim() || !simText.trim()) {
      setErrorMsg(lang === "fa" ? "لطفا شماره فرستنده و متن پیامک را وارد کنید." : "Please fill out sender and text.");
      return;
    }
    setErrorMsg(null);
    setLoading(true);

    try {
      // Step 1: Request categorization from our backend (using Gemini)
      const catRes = await fetch("/api/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sender: simSender, text: simText })
      });
      const catResult = await catRes.json();

      if (catResult.success) {
        const { category, summary, senderName, extractedInfo } = catResult.classification;

        // Step 2: Inject the newly categorized message into our simulated feed
        const simRes = await fetch("/api/messages/simulate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sender: simSender,
            text: simText,
            category,
            summary,
            senderName,
            extractedInfo
          })
        });
        const simResult = await simRes.json();

        if (simResult.success) {
          // Add notification
          setNotification({
            title: `${lang === "fa" ? "پیامک جدید از" : "New SMS from"} ${senderName || simSender}`,
            body: simText.slice(0, 60) + (simText.length > 60 ? "..." : "")
          });
          setTimeout(() => setNotification(null), 5000);

          // Clear form and reload
          setSimSender("");
          setSimText("");
          setSelectedPresetId("");
          setShowAddModal(false);
          await fetchMessages();
        }
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(lang === "fa" ? "خطا در دسته‌بندی با هوش مصنوعی" : "AI categorization error");
    } finally {
      setLoading(false);
    }
  };

  // Handle scheduling an SMS
  const handleScheduleSMS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedReceiver.trim() || !schedText.trim() || !schedTime) {
      setErrorMsg(lang === "fa" ? "لطفا تمام فیلدهای زمان‌بندی را پر کنید." : "Please fill out all schedule fields.");
      return;
    }
    setErrorMsg(null);
    setScheduling(true);

    try {
      const res = await fetch("/api/messages/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiver: schedReceiver,
          text: schedText,
          scheduledTime: new Date(schedTime).toISOString()
        })
      });
      const result = await res.json();
      if (result.success) {
        // Reset scheduling fields
        setSchedReceiver("");
        setSchedText("");
        setSchedTime("");
        await fetchMessages();
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(lang === "fa" ? "خطا در زمان‌بندی پیامک" : "Error scheduling SMS");
    } finally {
      setScheduling(false);
    }
  };

  // Mark SMS as read
  const handleMarkAsRead = async (id: string) => {
    try {
      const res = await fetch(`/api/messages/${id}/read`, { method: "POST" });
      const result = await res.json();
      if (result.success) {
        setMessages(prev => prev.map(m => m.id === id ? { ...m, isRead: true } : m));
        if (selectedSMS && selectedSMS.id === id) {
          setSelectedSMS(prev => prev ? { ...prev, isRead: true } : null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete an SMS
  const handleDeleteSMS = async (id: string) => {
    try {
      const res = await fetch(`/api/messages/${id}`, { method: "DELETE" });
      const result = await res.json();
      if (result.success) {
        setMessages(prev => prev.filter(m => m.id !== id));
        if (selectedSMS && selectedSMS.id === id) {
          setSelectedSMS(null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Reset database to preset defaults
  const handleResetDatabase = async () => {
    if (!window.confirm(lang === "fa" ? "آیا می‌خواهید سامانه پیامک‌ها را به حالت اولیه برگردانید؟" : "Are you sure you want to reset the messages?")) return;
    try {
      setLoading(true);
      const res = await fetch("/api/messages/reset", { method: "POST" });
      const result = await res.json();
      if (result.success) {
        setMessages(result.data);
        setSelectedSMS(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Helper copy text to clipboard
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter messages based on search query and category tab
  const filteredMessages = messages.filter(m => {
    const matchCat = selectedCategory === "all" || m.category === selectedCategory;
    const matchSearch = searchQuery.trim() === "" || 
      m.text.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (m.senderName && m.senderName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      m.sender.includes(searchQuery);
    return matchCat && matchSearch;
  });

  // Calculate stats
  const totalSMS = messages.length;
  const categoryCounts = messages.reduce((acc, m) => {
    acc[m.category] = (acc[m.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const scheduledCount = messages.filter(m => m.status === "scheduled").length;

  // Extract transaction values to display custom wallet intelligence
  const extractTransactionSum = () => {
    let sum = 0;
    messages.forEach(m => {
      if (m.category === "transactional" && m.text) {
        // Regex to match Iranian Rial amount pattern like ۱۲,۴۰۰,۰۰۰ or 5,000,000 or ۵۰۰۰۰۰
        const match = m.text.replace(/,/g, "").match(/\d+/);
        if (match) {
          const val = parseInt(match[0]);
          if (!isNaN(val) && val > 1000) {
            // Check if it's برداشت (withdrawal) or واریز (deposit)
            if (m.text.includes("واریز")) {
              sum += val;
            } else if (m.text.includes("برداشت")) {
              sum -= val;
            }
          }
        }
      }
    });
    return sum;
  };

  const transactionBalance = extractTransactionSum();

  const categoriesConfig: { id: SMSCategory; labelFa: string; labelEn: string; bgLight: string; text: string; icon: any }[] = [
    { id: "personal", labelFa: "شخصی", labelEn: "Personal", bgLight: "bg-blue-50 text-blue-700 border-blue-100", text: "text-blue-700", icon: User },
    { id: "transactional", labelFa: "تراکنشی", labelEn: "Financial", bgLight: "bg-emerald-50 text-emerald-700 border-emerald-100", text: "text-emerald-700", icon: CreditCard },
    { id: "otp", labelFa: "رمز یکبار مصرف", labelEn: "OTP / Auth", bgLight: "bg-amber-50 text-amber-700 border-amber-100", text: "text-amber-700", icon: KeyRound },
    { id: "promotional", labelFa: "تبلیغاتی", labelEn: "Promotions", bgLight: "bg-purple-50 text-purple-700 border-purple-100", text: "text-purple-700", icon: Tag },
    { id: "spam", labelFa: "هرزنامه", labelEn: "Spam Blocked", bgLight: "bg-rose-50 text-rose-700 border-rose-100", text: "text-rose-700", icon: ShieldAlert }
  ];

  const getCategoryConfig = (cat: SMSCategory) => {
    return categoriesConfig.find(c => c.id === cat) || categoriesConfig[0];
  };

  return (
    <div 
      className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans" 
      dir={lang === "fa" ? "rtl" : "ltr"}
      id="root-container"
    >
      {/* Dynamic Native-Like Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -80, scale: 0.9 }}
            animate={{ opacity: 1, y: 16, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm bg-white/95 backdrop-blur-md shadow-xl rounded-2xl border border-slate-100 p-4 flex items-start gap-3 cursor-pointer"
            onClick={() => setActiveTab("phone")}
            id="simulated-notification"
          >
            <div className="bg-blue-500 text-white p-2.5 rounded-xl">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-xs text-blue-600 tracking-wider">
                  {lang === "fa" ? "پیام‌رسان اندروید" : "Android Messenger"}
                </span>
                <span className="text-[10px] text-slate-400">
                  {lang === "fa" ? "هم‌اکنون" : "Now"}
                </span>
              </div>
              <p className="font-bold text-sm text-slate-800 mt-1">{notification.title}</p>
              <p className="text-xs text-slate-600 mt-0.5 line-clamp-2 leading-relaxed">{notification.body}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Professional Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 px-6 py-4 shadow-xs" id="app-header">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2.5 rounded-xl text-white shadow-md shadow-blue-100">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                {lang === "fa" ? "سامانه پیامک هوشمند اندروید" : "Android Smart SMS Hub"}
                <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100 font-semibold">
                  {lang === "fa" ? "هوش مصنوعی فعال" : "Gemini AI Live"}
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                {lang === "fa" 
                  ? "شبیه‌ساز پیام‌رسان بومی همراه با دسته‌بندی هوشمند خودکار و زمان‌بندی دقیق" 
                  : "Native Android SMS client simulator with automated classification and outbox scheduler"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            {/* Reset Defaults button */}
            <button 
              onClick={handleResetDatabase}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5 border border-slate-200"
              title={lang === "fa" ? "بازنشانی پیامک‌های نمونه" : "Reset demo messages"}
              id="reset-db-btn"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{lang === "fa" ? "بازنشانی داده‌ها" : "Reset Demo"}</span>
            </button>

            {/* Language Switcher */}
            <button 
              onClick={() => setLang(lang === "fa" ? "en" : "fa")}
              className="px-3.5 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50/50 rounded-lg transition-colors border border-blue-100 flex items-center gap-1"
              id="lang-switcher"
            >
              <span>{lang === "fa" ? "English" : "فارسی"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6" id="app-main-grid">
        
        {/* Left Side: Simulation Controls & Analytics (7 columns in LTR, let's divide nicely) */}
        <div className="lg:col-span-7 flex flex-col gap-6" id="left-column-panels">
          
          {/* Tabs for Desktop to switch Mobile View or Analytics panel easily */}
          <div className="bg-white p-1 rounded-xl border border-slate-100 flex gap-1 shadow-xs" id="navigation-tabs">
            <button
              onClick={() => setActiveTab("phone")}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                activeTab === "phone"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
              id="tab-phone-view"
            >
              <Smartphone className="w-4 h-4" />
              <span>{lang === "fa" ? "شبیه‌ساز تلفن همراه" : "Smartphone Simulator"}</span>
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                activeTab === "analytics"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
              id="tab-analytics-view"
            >
              <BarChart3 className="w-4 h-4" />
              <span>{lang === "fa" ? "داشبورد تحلیلی و زمان‌بندی" : "Analytics & Outbox"}</span>
            </button>
          </div>

          {activeTab === "phone" ? (
            /* CONTROL PANEL: Incoming SMS trigger & presets */
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex flex-col gap-5" id="ai-control-panel">
              <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                <div className="flex items-center gap-2">
                  <div className="bg-blue-50 text-blue-600 p-1.5 rounded-lg">
                    <Sparkles className="w-4.5 h-4.5 text-blue-600 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      {lang === "fa" ? "شبیه‌ساز و هوش مصنوعی دسته‌بندی پیامک" : "AI SMS Classifier & Simulator"}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {lang === "fa" ? "پیام جدید بفرستید تا هوش مصنوعی آن را تحلیل کند" : "Simulate and instantly categorize with Gemini API"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Template Choice */}
              <div className="flex flex-col gap-1.5" id="template-selector-container">
                <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                  <span>{lang === "fa" ? "انتخاب قالب‌های آماده پیامک:" : "Quick Preset Templates:"}</span>
                  <span className="text-[10px] text-blue-500 font-semibold bg-blue-50 px-1.5 py-0.5 rounded-full">
                    {PRESET_TEMPLATES.length} {lang === "fa" ? "پیام" : "Items"}
                  </span>
                </label>
                <div className="relative">
                  <select
                    value={selectedPresetId}
                    onChange={(e) => handlePresetChange(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer appearance-none"
                    id="preset-sms-select"
                  >
                    <option value="">
                      {lang === "fa" ? "✍️ نوشتن پیامک سفارشی..." : "✍️ Write a custom SMS message..."}
                    </option>
                    {PRESET_TEMPLATES.map((tpl) => (
                      <option key={tpl.id} value={tpl.id} className="text-xs">
                        {lang === "fa" ? `[${getCategoryConfig(tpl.category).labelFa}] ${tpl.descriptionFa}` : `[${tpl.category.toUpperCase()}] ${tpl.sender}`}
                      </option>
                    ))}
                  </select>
                  <div className={`absolute inset-y-0 ${lang === "fa" ? "left-3" : "right-3"} flex items-center pointer-events-none text-slate-400 text-xs`}>
                    ▼
                  </div>
                </div>
              </div>

              {/* Form Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="sim-form-fields">
                <div className="md:col-span-1 flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600">{lang === "fa" ? "فرستنده (شماره یا عنوان):" : "Sender Title / Phone:"}</label>
                  <input
                    type="text"
                    value={simSender}
                    onChange={(e) => setSimSender(e.target.value)}
                    placeholder="e.g. BankMelli, Snap, Ali"
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    id="sim-sender-input"
                  />
                </div>
                <div className="md:col-span-2 flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600">{lang === "fa" ? "متن پیامک (فارسی یا انگلیسی):" : "SMS Text Content:"}</label>
                  <textarea
                    value={simText}
                    onChange={(e) => setSimText(e.target.value)}
                    rows={2}
                    placeholder={lang === "fa" ? "متن پیامک را در این بخش بنویسید..." : "Write SMS body here..."}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none leading-relaxed"
                    id="sim-text-input"
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="bg-rose-50 border border-rose-100 text-rose-700 p-3 rounded-xl flex items-center gap-2 text-xs font-medium" id="error-alert">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Analyze Button */}
              <button
                onClick={handleSimulateIncoming}
                disabled={loading}
                className={`w-full py-3 px-4 rounded-xl text-xs font-bold text-white shadow-md transition-all flex items-center justify-center gap-2 ${
                  loading 
                    ? "bg-slate-400 cursor-not-allowed" 
                    : "bg-blue-600 hover:bg-blue-700 shadow-blue-100 hover:shadow-lg"
                }`}
                id="analyze-sms-btn"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{lang === "fa" ? "هوش مصنوعی در حال تحلیل و دسته‌بندی..." : "Gemini AI Analyzing & Categorizing..."}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{lang === "fa" ? "ارسال پیامک شبیه‌سازی شده و دسته‌بندی هوشمند" : "Receive Simulated SMS & Auto-Categorize"}</span>
                  </>
                )}
              </button>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-[11px] text-slate-500 flex items-start gap-2 leading-relaxed" id="gemini-explanation">
                <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                <span>
                  {lang === "fa" 
                    ? "سیستم به کلید رسمی Gemini متصل است. هوش مصنوعی به طور خودکار پیام را به عنوان شخصی، تراکنش بانکی، رمز موقت (OTP)، هرزنامه یا تبلیغاتی دسته‌بندی کرده، اطلاعات مالی و کدهای اعتبارسنجی را استخراج می‌کند."
                    : "The system is connected to Gemini API. It automatically detects banking withdrawal/deposits, extracts OTP pins, maps commercial campaign links, and blocks fraudulent spams."}
                </span>
              </div>
            </div>
          ) : (
            /* ANALYTICS & SCHEDULER OUTBOX PANELS */
            <div className="flex flex-col gap-6" id="analytics-section">
              
              {/* SMART OUTBOX SCHEDULER FORM */}
              <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex flex-col gap-5" id="scheduler-panel">
                <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
                  <div className="bg-amber-50 text-amber-600 p-1.5 rounded-lg">
                    <Calendar className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      {lang === "fa" ? "زمان‌بندی ارسال خودکار پیامک (Outbox)" : "SMS Outbox Schedule Manager"}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {lang === "fa" ? "پیامک‌های خروجی را برای تاریخ و ساعت مشخص رزرو کنید" : "Schedule SMS delivery automatically based on selected times"}
                    </p>
                  </div>
                </div>

                <form onSubmit={handleScheduleSMS} className="flex flex-col gap-4" id="scheduler-form">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-600">{lang === "fa" ? "شماره یا نام گیرنده:" : "Receiver Phone / Contact Name:"}</label>
                      <input
                        type="text"
                        value={schedReceiver}
                        onChange={(e) => setSchedReceiver(e.target.value)}
                        placeholder="e.g. 09121112233, Ali"
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-700 focus:outline-hidden"
                        id="sched-receiver"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-600">{lang === "fa" ? "تاریخ و زمان ارسال:" : "Delivery Date & Time:"}</label>
                      <input
                        type="datetime-local"
                        value={schedTime}
                        onChange={(e) => setSchedTime(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-700 focus:outline-hidden cursor-pointer"
                        id="sched-datetime"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-600">{lang === "fa" ? "متن پیام خروجی:" : "Outgoing SMS Text:"}</label>
                    <textarea
                      value={schedText}
                      onChange={(e) => setSchedText(e.target.value)}
                      rows={2}
                      placeholder={lang === "fa" ? "پیامی که مایل هستید در زمان مشخص ارسال شود را تایپ کنید..." : "Type the text message to schedule..."}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-hidden resize-none leading-relaxed"
                      id="sched-text"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={scheduling}
                    className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-md shadow-amber-50 transition-all flex items-center justify-center gap-1.5"
                    id="sched-submit-btn"
                  >
                    <Clock className="w-4.5 h-4.5" />
                    <span>{lang === "fa" ? "افزودن به صف زمان‌بندی خروجی" : "Add to Scheduling Outbox"}</span>
                  </button>
                </form>

                {/* Scheduled Messages List inside Scheduler panel */}
                <div className="mt-2" id="scheduled-queue-container">
                  <h4 className="text-xs font-bold text-slate-600 mb-2.5 flex items-center gap-1">
                    <span>{lang === "fa" ? "پیامک‌های در صف زمان‌بندی:" : "Active Scheduled Queue:"}</span>
                    <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                      {scheduledCount} {lang === "fa" ? "پیام" : "SMS"}
                    </span>
                  </h4>

                  {messages.filter(m => m.status === "scheduled").length === 0 ? (
                    <div className="border border-dashed border-slate-200 rounded-xl p-4 text-center text-xs text-slate-400">
                      {lang === "fa" ? "هیچ پیامی در صف زمان‌بندی وجود ندارد." : "No messages scheduled currently."}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                      {messages.filter(m => m.status === "scheduled").map((m) => {
                        const target = new Date(m.scheduledTime || "");
                        const countdown = Math.max(0, Math.round((target.getTime() - Date.now()) / 1000));
                        
                        return (
                          <div key={m.id} className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex justify-between items-center gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-bold text-slate-700">
                                  {lang === "fa" ? "به:" : "To:"} {m.receiver}
                                </span>
                                <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5" />
                                  <span>
                                    {countdown > 60 
                                      ? `${Math.floor(countdown / 60)}m ${countdown % 60}s` 
                                      : `${countdown}s`
                                    }
                                  </span>
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 truncate leading-relaxed">{m.text}</p>
                              <p className="text-[10px] text-slate-400 mt-1">
                                {lang === "fa" ? "زمان ارسال:" : "Delivery time:"} {target.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </p>
                            </div>
                            <div className="flex gap-1.5">
                              {/* Trigger Send Now */}
                              <button
                                onClick={async () => {
                                  const res = await fetch(`/api/messages/schedule/${m.id}/send`, { method: "POST" });
                                  const result = await res.json();
                                  if (result.success) {
                                    setNotification({
                                      title: lang === "fa" ? "ارسال فوری با موفقیت انجام شد" : "Sent Instantly",
                                      body: `${lang === "fa" ? "به:" : "To:"} ${m.receiver}\n${m.text}`
                                    });
                                    setTimeout(() => setNotification(null), 4000);
                                    fetchMessages();
                                  }
                                }}
                                className="bg-emerald-600 text-white hover:bg-emerald-700 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                                title={lang === "fa" ? "ارسال فوری همین حالا" : "Send immediately now"}
                              >
                                {lang === "fa" ? "ارسال فوری" : "Send Now"}
                              </button>
                              <button
                                onClick={() => handleDeleteSMS(m.id)}
                                className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* STATS AND INTELLIGENCE HUB */}
              <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex flex-col gap-4" id="stats-panel">
                <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
                  <div className="bg-blue-50 text-blue-600 p-1.5 rounded-lg">
                    <BarChart3 className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      {lang === "fa" ? "داشبورد هوشمندی و آمار پیامک‌ها" : "SMS Intelligence Analytics"}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {lang === "fa" ? "نمودار توزیع دسته‌ها و تحلیل خودکار اطلاعات مالی" : "Message distribution and financial balance tracking"}
                    </p>
                  </div>
                </div>

                {/* Metrics Row */}
                <div className="grid grid-cols-3 gap-3" id="stats-metrics-grid">
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{lang === "fa" ? "کل پیامک‌ها" : "Total SMS"}</p>
                    <p className="text-xl font-extrabold text-slate-800 mt-1">{totalSMS}</p>
                  </div>
                  <div className="bg-emerald-50/50 border border-emerald-100/50 rounded-xl p-3 text-center">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">{lang === "fa" ? "گردش تراکنش" : "Extracted Balance"}</p>
                    <p className="text-xs font-bold text-emerald-800 mt-2 truncate" dir="ltr">
                      {transactionBalance === 0 ? "0 Rial" : `${transactionBalance.toLocaleString()} R`}
                    </p>
                  </div>
                  <div className="bg-rose-50/50 border border-rose-100/50 rounded-xl p-3 text-center">
                    <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">{lang === "fa" ? "هرزنامه‌های بلاک شده" : "Blocked Spam"}</p>
                    <p className="text-xl font-extrabold text-rose-800 mt-1">{categoryCounts["spam"] || 0}</p>
                  </div>
                </div>

                {/* Visual Bar Chart */}
                <div className="mt-2 flex flex-col gap-3" id="bar-chart-container">
                  <h4 className="text-xs font-bold text-slate-600">{lang === "fa" ? "نمودار درصد فراوانی پیامک‌ها به تفکیک دسته:" : "SMS Frequency by Category:"}</h4>
                  
                  <div className="flex flex-col gap-2.5">
                    {categoriesConfig.map((cfg) => {
                      const count = categoryCounts[cfg.id] || 0;
                      const percentage = totalSMS > 0 ? Math.round((count / totalSMS) * 100) : 0;
                      const Icon = cfg.icon;

                      return (
                        <div key={cfg.id} className="flex items-center gap-3">
                          <div className={`p-1.5 rounded-lg border ${cfg.bgLight} flex items-center gap-1.5 w-28 md:w-32`}>
                            <Icon className="w-3.5 h-3.5 shrink-0" />
                            <span className="text-[10px] font-bold truncate">{lang === "fa" ? cfg.labelFa : cfg.labelEn}</span>
                          </div>
                          
                          <div className="flex-1 bg-slate-100 h-2.5 rounded-full overflow-hidden relative">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                              className={`h-full rounded-full ${
                                cfg.id === "personal" ? "bg-blue-500" :
                                cfg.id === "transactional" ? "bg-emerald-500" :
                                cfg.id === "otp" ? "bg-amber-500" :
                                cfg.id === "promotional" ? "bg-purple-500" : "bg-rose-500"
                              }`}
                            />
                          </div>

                          <div className="w-10 text-end">
                            <span className="text-xs font-bold text-slate-600">{percentage}%</span>
                            <span className="text-[10px] text-slate-400 block font-semibold">({count})</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Visual Android Smartphone Mockup (5 columns in LTR) */}
        <div className="lg:col-span-5 flex justify-center items-start" id="right-column-phone">
          
          {/* Sveltest smartphone wrapper container */}
          <div className="relative w-full max-w-[360px] bg-slate-900 rounded-[44px] p-3.5 shadow-2xl border-4 border-slate-800" id="phone-shell">
            
            {/* Camera notch */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 w-28 h-5 bg-slate-900 rounded-full z-30 flex items-center justify-center gap-1">
              <div className="w-2 h-2 bg-slate-800 rounded-full" />
              <div className="w-10 h-1 bg-slate-800 rounded-full" />
            </div>

            {/* Simulated Glass Screen Area */}
            <div className="bg-slate-50 w-full h-[620px] rounded-[32px] overflow-hidden flex flex-col relative border border-slate-700 select-none" id="phone-screen-display">
              
              {/* Phone Status bar */}
              <div className="bg-slate-100 text-slate-600 px-5 pt-3.5 pb-1 flex justify-between items-center text-[10px] font-bold z-20" id="phone-status-bar">
                <span>03:49</span>
                <div className="flex items-center gap-1.5">
                  <span>5G</span>
                  <div className="w-3.5 h-2 bg-slate-600 rounded-xs relative">
                    <div className="absolute right-0 top-0.5 bottom-0.5 left-0.5 bg-slate-100" />
                  </div>
                </div>
              </div>

              {/* Android Message App Header */}
              <div className="bg-white border-b border-slate-100 px-4 py-3 shrink-0 flex flex-col gap-2.5" id="app-internal-header">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-blue-600" />
                    <span className="font-extrabold text-sm text-slate-800">{lang === "fa" ? "پیامک‌ها" : "Messages"}</span>
                  </div>
                  {/* Floating Action / Trigger button inside Header */}
                  <button 
                    onClick={() => {
                      setActiveTab("phone");
                      setShowAddModal(true);
                    }}
                    className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-full transition-colors"
                    title={lang === "fa" ? "دریافت پیامک جدید" : "Receive New SMS"}
                    id="trigger-modal-btn"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Mobile App Search Bar */}
                <div className="relative" id="phone-search-wrapper">
                  <Search className="absolute right-3 top-2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={lang === "fa" ? "جستجوی مخاطب یا متن..." : "Search sender or text..."}
                    className="w-full bg-slate-100/80 border-0 rounded-lg pr-9 pl-3 py-1.5 text-xs text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-blue-500 focus:bg-white"
                    id="phone-search-input"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery("")}
                      className="absolute left-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Categories Tab in Smartphone */}
                <div className="flex gap-1 overflow-x-auto py-1 scrollbar-none" id="phone-categories-scroll">
                  <button
                    onClick={() => setSelectedCategory("all")}
                    className={`px-3 py-1 rounded-full text-[10px] font-bold shrink-0 transition-all ${
                      selectedCategory === "all"
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {lang === "fa" ? "همه" : "All"}
                  </button>
                  {categoriesConfig.map((cfg) => (
                    <button
                      key={cfg.id}
                      onClick={() => setSelectedCategory(cfg.id)}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold shrink-0 transition-all flex items-center gap-1 ${
                        selectedCategory === cfg.id
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {lang === "fa" ? cfg.labelFa : cfg.labelEn}
                    </button>
                  ))}
                </div>
              </div>

              {/* SMS List Area Inside Smartphone */}
              <div className="flex-1 overflow-y-auto px-2 py-3 flex flex-col gap-2 relative" id="phone-sms-list">
                
                {filteredMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-center text-slate-400 px-4">
                    <MessageSquare className="w-8 h-8 text-slate-300 mb-2" />
                    <p className="text-xs font-semibold">{lang === "fa" ? "پیامکی یافت نشد" : "No Messages Found"}</p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {lang === "fa" 
                        ? "می‌توانید از منوی بالا پیامک جدیدی شبیه‌سازی کنید." 
                        : "Try simulating or sending a test SMS from the control room."}
                    </p>
                  </div>
                ) : (
                  filteredMessages.map((msg) => {
                    const cfg = getCategoryConfig(msg.category);
                    const IconComponent = cfg.icon;
                    const dateObj = new Date(msg.timestamp);

                    return (
                      <div
                        key={msg.id}
                        onClick={() => {
                          setSelectedSMS(msg);
                          handleMarkAsRead(msg.id);
                        }}
                        className={`p-3 rounded-2xl border transition-all duration-150 cursor-pointer flex gap-2.5 relative ${
                          selectedSMS?.id === msg.id
                            ? "bg-white border-blue-500 shadow-sm"
                            : msg.isRead
                            ? "bg-white/70 border-slate-100 hover:bg-white"
                            : "bg-blue-50/40 border-blue-100/50 hover:bg-blue-50/60"
                        }`}
                        id={`sms-card-${msg.id}`}
                      >
                        {/* New Unread Badge dot */}
                        {!msg.isRead && (
                          <div className={`absolute top-3 ${lang === "fa" ? "left-3" : "right-3"} w-2 h-2 bg-blue-600 rounded-full`} />
                        )}

                        {/* Category Left Icon */}
                        <div className={`p-2 rounded-xl border ${cfg.bgLight} shrink-0 self-start`}>
                          <IconComponent className="w-4 h-4" />
                        </div>

                        {/* Content text */}
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-0.5">
                            <span className="font-bold text-xs text-slate-800 truncate">
                              {msg.senderName || msg.sender}
                            </span>
                            <span className="text-[9px] text-slate-400">
                              {dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>

                          <p className="text-slate-600 text-xs truncate leading-normal">
                            {msg.text}
                          </p>

                          {/* Quick AI category badge inside the feed */}
                          <div className="flex items-center gap-1 mt-1.5">
                            <span className={`text-[9px] px-2 py-0.25 rounded-full font-bold border ${cfg.bgLight}`}>
                              {lang === "fa" ? cfg.labelFa : cfg.labelEn}
                            </span>
                            {msg.status === "scheduled" && (
                              <span className="text-[9px] px-2 py-0.25 rounded-full font-bold border border-amber-200 bg-amber-50 text-amber-700">
                                {lang === "fa" ? "زمان‌بندی شده" : "Scheduled"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Bottom Nav Simulation of Android */}
              <div className="bg-white border-t border-slate-100 py-2.5 shrink-0 flex justify-around text-slate-400 text-xs font-semibold z-20" id="phone-navigation-buttons">
                <button className="flex flex-col items-center gap-0.5 text-blue-600" onClick={() => setSelectedCategory("all")}>
                  <MessageSquare className="w-4 h-4" />
                  <span className="text-[9px]">{lang === "fa" ? "پیام‌ها" : "Inbox"}</span>
                </button>
                <button className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-slate-600" onClick={() => setActiveTab("analytics")}>
                  <Clock className="w-4 h-4" />
                  <span className="text-[9px]">{lang === "fa" ? "صف زمان‌بندی" : "Outbox"}</span>
                </button>
              </div>

              {/* SIMULATED DETAILED BOTTOM SHEET IF AN SMS IS CLICKED */}
              <AnimatePresence>
                {selectedSMS && (
                  <motion.div
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", damping: 25, stiffness: 220 }}
                    className="absolute inset-x-0 bottom-0 bg-white/95 backdrop-blur-md border-t border-slate-200 rounded-t-[28px] z-30 shadow-2xl p-4 flex flex-col gap-4 max-h-[85%] overflow-y-auto"
                    id="phone-bottom-sheet"
                  >
                    {/* Handlebar drag indicator */}
                    <div className="w-12 h-1 bg-slate-300 rounded-full self-center shrink-0 cursor-pointer" onClick={() => setSelectedSMS(null)} />
                    
                    {/* Sender detail head */}
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2.5 rounded-xl border ${getCategoryConfig(selectedSMS.category).bgLight}`}>
                          {(() => {
                            const Icon = getCategoryConfig(selectedSMS.category).icon;
                            return <Icon className="w-5 h-5" />;
                          })()}
                        </div>
                        <div>
                          <p className="font-extrabold text-sm text-slate-900">{selectedSMS.senderName || selectedSMS.sender}</p>
                          <p className="text-[10px] text-slate-400" dir="ltr">{selectedSMS.sender}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setSelectedSMS(null)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-500 p-1 rounded-full transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Full Content Text Box */}
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5">
                      <p className="text-slate-700 text-xs leading-relaxed font-mono whitespace-pre-wrap select-text">{selectedSMS.text}</p>
                      
                      <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-slate-100">
                        <span className="text-[10px] text-slate-400">
                          {new Date(selectedSMS.timestamp).toLocaleString(lang === "fa" ? "fa-IR" : "en-US")}
                        </span>
                        
                        {/* Copy button */}
                        <button
                          onClick={() => copyToClipboard(selectedSMS.text, selectedSMS.id)}
                          className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{copiedId === selectedSMS.id ? (lang === "fa" ? "کپی شد!" : "Copied!") : (lang === "fa" ? "کپی متن" : "Copy text")}</span>
                        </button>
                      </div>
                    </div>

                    {/* AI INTELLIGENCE DEEP ANALYSIS CARD */}
                    <div className="bg-gradient-to-br from-indigo-50/50 to-blue-50/50 border border-indigo-100/50 rounded-2xl p-4 flex flex-col gap-2.5 shadow-xs">
                      <div className="flex items-center gap-1.5 text-indigo-900 font-bold text-xs border-b border-indigo-100 pb-2">
                        <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
                        <span>{lang === "fa" ? "تحلیل هوشمند هوش مصنوعی" : "AI Cognitive Analysis"}</span>
                      </div>

                      {/* Summary Sentence */}
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-bold text-indigo-500 uppercase">{lang === "fa" ? "خلاصه مفهوم پیام:" : "Contextual Summary:"}</span>
                        <p className="text-xs text-indigo-950 font-semibold leading-relaxed">
                          {selectedSMS.summary || (lang === "fa" ? "در حال استخراج خلاصه..." : "Inferred personal text message context.")}
                        </p>
                      </div>

                      {/* Categorization result */}
                      <div className="flex justify-between items-center bg-white/70 rounded-xl p-2 border border-indigo-50/50 mt-1">
                        <span className="text-[10px] text-slate-500 font-medium">{lang === "fa" ? "دسته‌بندی خودکار:" : "Auto Classified Folder:"}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getCategoryConfig(selectedSMS.category).bgLight}`}>
                          {lang === "fa" ? getCategoryConfig(selectedSMS.category).labelFa : getCategoryConfig(selectedSMS.category).labelEn}
                        </span>
                      </div>

                      {/* Extracted Structured Parameters */}
                      {selectedSMS.extractedInfo && Object.values(selectedSMS.extractedInfo).some(x => x !== undefined) && (
                        <div className="flex flex-col gap-2 mt-1 pt-1.5 border-t border-indigo-100/30">
                          <span className="text-[10px] font-bold text-indigo-500 uppercase">{lang === "fa" ? "اطلاعات استخراج شده:" : "Extracted Structured Data:"}</span>
                          
                          <div className="grid grid-cols-2 gap-2">
                            {selectedSMS.extractedInfo.bankName && (
                              <div className="bg-white/80 rounded-xl p-2 border border-indigo-50/50">
                                <span className="text-[9px] text-slate-400 block">{lang === "fa" ? "نام بانک" : "Bank Name"}</span>
                                <span className="text-xs font-bold text-slate-700">{selectedSMS.extractedInfo.bankName}</span>
                              </div>
                            )}
                            {selectedSMS.extractedInfo.amount && (
                              <div className="bg-white/80 rounded-xl p-2 border border-indigo-50/50">
                                <span className="text-[9px] text-slate-400 block">{lang === "fa" ? "مبلغ تراکنش" : "Transaction Amount"}</span>
                                <span className="text-xs font-bold text-emerald-700">{selectedSMS.extractedInfo.amount}</span>
                              </div>
                            )}
                            {selectedSMS.extractedInfo.otpCode && (
                              <div className="bg-white/80 rounded-xl p-2 border border-indigo-50/50 flex justify-between items-center">
                                <div>
                                  <span className="text-[9px] text-slate-400 block">{lang === "fa" ? "کد تایید ورود" : "OTP Code PIN"}</span>
                                  <span className="text-xs font-extrabold text-amber-700 tracking-wider font-mono">{selectedSMS.extractedInfo.otpCode}</span>
                                </div>
                                <button
                                  onClick={() => copyToClipboard(selectedSMS.extractedInfo?.otpCode || "", "otp")}
                                  className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-sm hover:bg-blue-100"
                                >
                                  {copiedId === "otp" ? "✓" : "Copy"}
                                </button>
                              </div>
                            )}
                            {selectedSMS.extractedInfo.link && (
                              <div className="bg-white/80 rounded-xl p-2 border border-indigo-50/50 col-span-2 flex justify-between items-center">
                                <div className="min-w-0 flex-1">
                                  <span className="text-[9px] text-slate-400 block">{lang === "fa" ? "لینک شناسایی شده" : "Recognized Link"}</span>
                                  <span className="text-xs text-blue-600 truncate block font-mono" dir="ltr">{selectedSMS.extractedInfo.link}</span>
                                </div>
                                <a
                                  href={selectedSMS.extractedInfo.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[9px] font-bold text-white bg-blue-500 hover:bg-blue-600 px-2.5 py-1 rounded-md transition-colors shrink-0 ml-1.5"
                                >
                                  {lang === "fa" ? "باز کردن" : "Open"}
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action buttons (Delete, Spam, etc.) */}
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleDeleteSMS(selectedSMS.id)}
                        className="flex-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold py-2 px-3 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                        id="delete-sms-from-sheet"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{lang === "fa" ? "حذف پیامک" : "Delete Message"}</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          </div>

        </div>

      </main>

      {/* MODAL SIMULATOR FROM PHONE PLUS ICON */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col border border-slate-100"
              id="simulate-sms-modal"
            >
              <div className="bg-slate-950 text-white p-4 flex justify-between items-center">
                <span className="font-bold text-sm">{lang === "fa" ? "شبیه‌ساز پیامک دریافتی جدید" : "Simulate New Incoming SMS"}</span>
                <button 
                  onClick={() => {
                    setShowAddModal(false);
                    setErrorMsg(null);
                  }}
                  className="hover:bg-white/10 p-1 rounded-full transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 flex flex-col gap-4">
                {/* Modal templates selector */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600">{lang === "fa" ? "بارگذاری سریع از لیست الگوها:" : "Quick Preset Templates:"}</label>
                  <select
                    value={selectedPresetId}
                    onChange={(e) => handlePresetChange(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-hidden"
                    id="modal-preset-select"
                  >
                    <option value="">-- {lang === "fa" ? "نوشتن دستی پیامک..." : "Custom Out-of-the-Box SMS"} --</option>
                    {PRESET_TEMPLATES.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {lang === "fa" ? `[${getCategoryConfig(tpl.category).labelFa}] ${tpl.descriptionFa}` : `[${tpl.category.toUpperCase()}] ${tpl.sender}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600">{lang === "fa" ? "فرستنده:" : "Sender title:"}</label>
                  <input
                    type="text"
                    value={simSender}
                    onChange={(e) => setSimSender(e.target.value)}
                    placeholder="e.g. BankMelli, Snap, Ali"
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-700 focus:outline-hidden"
                    id="modal-sender-input"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600">{lang === "fa" ? "متن پیام:" : "Text content:"}</label>
                  <textarea
                    value={simText}
                    onChange={(e) => setSimText(e.target.value)}
                    rows={4}
                    placeholder={lang === "fa" ? "متن دلخواه پیامک دریافتی را تایپ کنید..." : "Type custom message..."}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-hidden resize-none"
                    id="modal-text-input"
                  />
                </div>

                {errorMsg && (
                  <div className="bg-rose-50 text-rose-700 p-2.5 rounded-lg text-xs" id="modal-error-alert">
                    {errorMsg}
                  </div>
                )}

                <button
                  onClick={handleSimulateIncoming}
                  disabled={loading}
                  className={`py-3 px-4 rounded-xl text-xs font-bold text-white shadow-md transition-all flex items-center justify-center gap-2 ${
                    loading ? "bg-slate-400" : "bg-blue-600 hover:bg-blue-700"
                  }`}
                  id="modal-simulate-btn"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{lang === "fa" ? "در حال دسته‌بندی با هوش مصنوعی..." : "AI Categorizing..."}</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>{lang === "fa" ? "دریافت پیامک و تحلیل فوری" : "Receive & Analyze Now"}</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 py-4 px-6 text-center text-xs text-slate-400 font-medium" id="app-footer">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-2">
          <p>{lang === "fa" ? "طراحی شده با عشق و هوش مصنوعی" : "Powered by Google Gemini & Express + React Framework"}</p>
          <p dir="ltr">© 2026 SMS Hub. All simulation environments active.</p>
        </div>
      </footer>
    </div>
  );
}
