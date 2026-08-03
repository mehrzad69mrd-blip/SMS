import { PresetSMSTemplate } from "./types";

export const PRESET_TEMPLATES: PresetSMSTemplate[] = [
  {
    id: "preset-bank-1",
    sender: "BankMellat",
    senderName: "بانک ملت",
    text: "بانک ملت\nواریز مبلغ: ۱۲,۴۰۰,۰۰۰ ریال\nبه حساب: ***۹۸۷۶\nمانده جدید: ۷۸,۳۰۰,۰۰۰ ریال\n۱۴۰۶/۰۵/۱۳ ۱۱:۴۰",
    category: "transactional",
    descriptionFa: "پیامک واریز وجه بانکی (بانک ملت)"
  },
  {
    id: "preset-bank-2",
    sender: "BankMelli",
    senderName: "بانک ملی",
    text: "بانک ملی ایران\nبرداشت مبلغ: ۸۵۰,۰۰۰ ریال\nاز حساب: ***۱۱۱۲\nمانده جدید: ۵,۴۰۰,۰۰۰ ریال\n۱۴۰۶/۰۵/۱۳ ۱۷:۰۵",
    category: "transactional",
    descriptionFa: "پیامک برداشت وجه بانکی (بانک ملی)"
  },
  {
    id: "preset-otp-1",
    sender: "Snap",
    senderName: "اسنپ",
    text: "کد تایید اسنپ: ۷۳۲۹\nممنون از همراهی شما. لطفا این کد را با دیگران به اشتراک نگذارید.",
    category: "otp",
    descriptionFa: "کد تایید هویت ورود (اسنپ)"
  },
  {
    id: "preset-otp-2",
    sender: "Divar",
    senderName: "دیوار",
    text: "کد تایید ورود به دیوار: ۳۸۹۲۱\nپشتیبانی دیوار هیچگاه این کد را از شما درخواست نخواهد کرد.",
    category: "otp",
    descriptionFa: "رمز یکبار مصرف امنیتی (دیوار)"
  },
  {
    id: "preset-promo-1",
    sender: "HamrahAval",
    senderName: "همراه اول",
    text: "جشنواره عید تا عید همراه اول! ۵۰ گیگابایت اینترنت هدیه با فعالسازی بسته رویایی. همین حالا با شماره‌گیری #۱۰۰* فعال کنید یا وارد لینک زیر شوید:\nhttps://mci.ir/eid",
    category: "promotional",
    descriptionFa: "پیامک جشنواره همراه اول"
  },
  {
    id: "preset-promo-2",
    sender: "Tapsi",
    senderName: "تپسی",
    text: "تپسی سفرهای شما را نصف قیمت کرد! ۵۰٪ تخفیف روی ۳ سفر بعدی شما با وارد کردن کد تخفیف: TAP50. فقط تا پایان هفته.",
    category: "promotional",
    descriptionFa: "کد تخفیف و آفر تبلیغاتی (تپسی)"
  },
  {
    id: "preset-personal-1",
    sender: "09121234567",
    senderName: "علی (دوست)",
    text: "سلام داداش، شب ساعت ۸ فوتبال رزرو کردم سالن تندرستی. حتما بیا گلر نداریم منتظرتیم ها!",
    category: "personal",
    descriptionFa: "پیامک صمیمی هماهنگی فوتبال"
  },
  {
    id: "preset-personal-2",
    sender: "09199998877",
    senderName: "مادر",
    text: "سلام پسرم، رسیدی به من زنگ بزن نگران نشم. ناهار هم قورمه سبزی درست کردم برات گذاشتم توی یخچال گرم کن بخور.",
    category: "personal",
    descriptionFa: "پیامک خانوادگی صمیمانه"
  },
  {
    id: "preset-spam-1",
    sender: "09300001122",
    senderName: "تبلیغات ناشناس",
    text: "کسب درآمد روزانه ۵ میلیون تومان در خانه بدون نیاز به سرمایه اولیه! فرصت محدود، فقط با کلیک روی لینک زیر شروع کنید:\nhttps://pool-dar-sho.com/scam",
    category: "spam",
    descriptionFa: "تبلیغ کلاهبرداری و سودجو (هرزنامه)"
  },
  {
    id: "preset-spam-2",
    sender: "90008888",
    senderName: "املاک برتر",
    text: "فروش ویژه ویلا در شمال با اقساط ۲۴ ماهه بدون بهره! با منظره ابدی جنگل و دریا. سند تک برگ. جهت بازدید عدد ۱ را ارسال کنید.",
    category: "spam",
    descriptionFa: "تبلیغات املاک انبوه ناخواسته"
  }
];
