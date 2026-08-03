package com.smshub.app

import java.util.Locale

/**
 * Helper class to automatically detect the category of an SMS message.
 */
object SmsCategorizer {

    /**
     * Categorizes an SMS message based on its sender address and body content.
     */
    fun categorize(address: String, body: String): SmsCategory {
        val addr = address.trim()
        val text = body.lowercase(Locale.getDefault())

        // 1. Check for OTP/Verification Codes
        val otpKeywords = listOf(
            "verification", "verify", "code", "otp", "one-time", "password", "pin", "security code", "auth", "2fa",
            "confirm", "tایید", "رمز پویا", "رمز یکبار", "فعالسازی", "اعتبارسنجی", "کد تایید", "کدتایید", "رمزعبور", "رمز عبور"
        )
        // Numeric shortcodes (usually 4-6 digits) or brand verification senders
        val isShortcode = addr.length in 4..6 && addr.all { it.isDigit() }
        val isOtpKeywordsMatched = otpKeywords.any { text.contains(it) }
        val hasOtpPattern = text.contains(Regex("\\b\\d{4,8}\\b")) // e.g. 4-8 digit number in body
        
        if (isOtpKeywordsMatched && (isShortcode || hasOtpPattern || text.contains("your") || text.contains("use"))) {
            return SmsCategory.OTP
        }
        if (isShortcode && (text.contains("code") || text.contains("pin") || text.contains("otp") || text.contains("کد"))) {
            return SmsCategory.OTP
        }

        // 2. Check for Bank/Transactions
        val bankKeywords = listOf(
            "bank", "credit", "debit", "transaction", "transferred", "deposited", "withdrawn", "account", "balance", 
            "atm", "card", "purchase", "payment", "alert", "shaba", "شبا", "حساب", "واریز", "برداشت", "مانده", 
            "کارت به کارت", "بانک", "انتقال", "موجودی", "برداشت وجه", "خرید", "فروشگاه"
        )
        val isBankSender = addr.lowercase(Locale.getDefault()).contains("bank") || 
                addr.lowercase(Locale.getDefault()).contains("pay") ||
                listOf("chase", "bofa", "wells", "hsbc", "citi", "capitalone").any { addr.lowercase(Locale.getDefault()).contains(it) }
                
        if (isBankSender || bankKeywords.any { text.contains(it) }) {
            return SmsCategory.BANK
        }

        // 3. Check for Promotional
        val promoKeywords = listOf(
            "off", "sale", "discount", "offer", "promo", "deal", "subscribe", "buy", "shop", "gift", "win", "free",
            "tanzil", "تخفیف", "حراج", "تور", "ویژه", "جایزه", "برنده", "جشنواره", "پیشنهاد", "ارسال رایگان"
        )
        val isPromoSender = addr.startsWith("1000") || addr.startsWith("2000") || addr.startsWith("3000") || 
                addr.startsWith("5000") || addr.startsWith("9000") || addr.startsWith("981000") ||
                addr.startsWith("982000") || addr.startsWith("983000") || addr.startsWith("985000") || addr.startsWith("989000")
                
        if (isPromoSender || promoKeywords.any { text.contains(it) }) {
            return SmsCategory.PROMOTIONAL
        }

        // 4. Default to PERSONAL
        return SmsCategory.PERSONAL
    }
}
