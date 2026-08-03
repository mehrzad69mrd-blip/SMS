package com.smshub.app

import kotlinx.serialization.Serializable

/**
 * Enum representing the different categories of SMS messages.
 */
@Serializable
enum class SmsCategory {
    ALL,
    PERSONAL,
    BANK,
    OTP,
    PROMOTIONAL
}
