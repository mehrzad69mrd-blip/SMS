package com.smshub.app

import com.google.ai.client.generativeai.GenerativeModel
import com.google.ai.client.generativeai.type.generationConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

/**
 * Strict SMS classification categories.
 */
@Serializable
enum class SmsCategory {
    BANK, OTP, PROMOTIONAL, PERSONAL
}

/**
 * Parsed structure of the Gemini AI analysis response.
 */
@Serializable
data class SmsAnalysisResult(
    val category: SmsCategory,
    val summary: String,
    val smartReplies: List<String>
)

/**
 * SmsAnalyzerService leverages Google GenAI SDK for Android (Gemini)
 * to perform high-fidelity categorization, smart summaries, and smart replies.
 */
class SmsAnalyzerService(apiKey: String) {

    // Configure the generative model with system instructions and JSON MIME type response format
    private val generativeModel = GenerativeModel(
        modelName = "gemini-1.5-flash", // Using gemini-1.5-flash for maximum client stability and speed
        apiKey = apiKey,
        generationConfig = generationConfig {
            responseMimeType = "application/json"
            temperature = 0.15f // Low temperature for highly deterministic and strict classification output
        },
        systemInstruction = """
            You are an expert mobile inbox intelligence assistant. Your task is to analyze an incoming SMS text message and classify it with high precision.
            
            You must classify the message into one of these four categories:
            1. BANK: Transaction updates, balance alerts, deposit/withdrawal notifications, or account statements from financial institutions.
            2. OTP: One-Time Passwords, verification codes, 2-factor authentication prompts, or security PINs.
            3. PROMOTIONAL: Marketing campaigns, advertisements, coupon codes, retail offers, or unsolicited spam.
            4. PERSONAL: Standard direct chat messages, personal conversations, or direct human-to-human communication.
            
            Return a JSON object matching this schema exactly:
            {
              "category": "BANK" | "OTP" | "PROMOTIONAL" | "PERSONAL",
              "summary": "A highly precise 1-sentence description summarizing the contextual meaning of the message.",
              "smartReplies": ["suggestion 1", "suggestion 2", "suggestion 3"]
            }
            
            Guidelines:
            - For smart replies: Provide exactly 3 short, context-aware reply suggestions or actionable prompt chips (e.g., "Copy OTP", "Check Balance", "Thank you", "Remind me").
            - Ensure any sensitive information like partial PINs, passwords, and accounts are treated safely in summaries.
            - Strictly return ONLY the raw JSON string. Do not wrap in markdown delimiters and do not add commentary.
        """.trimIndent()
    )

    private val json = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
    }

    /**
     * Asynchronously analyzes an incoming SMS message.
     * Combines sender identification and message text to infer context.
     *
     * @param sender The address, telephone number, or brand name sender ID.
     * @param messageBody The content of the incoming message.
     * @return A parsed [SmsAnalysisResult] on success, or null on error.
     */
    suspend fun analyzeSms(sender: String, messageBody: String): SmsAnalysisResult? = withContext(Dispatchers.IO) {
        val userPrompt = """
            Sender ID / Phone Number: $sender
            SMS Message Body: $messageBody
        """.trimIndent()

        try {
            val response = generativeModel.generateContent(userPrompt)
            val jsonText = response.text?.trim() ?: return@withContext null
            
            // Clean markdown block wrappers (```json ... ```) should they be returned
            val cleanedJsonText = jsonText
                .removePrefix("```json")
                .removePrefix("```")
                .removeSuffix("```")
                .trim()

            json.decodeFromString<SmsAnalysisResult>(cleanedJsonText)
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }
}
