package expo.modules.smssender

import android.telephony.SmsManager
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class SendSmsException(cause: Throwable) :
  CodedException("Failed to send SMS: ${cause.message}", cause)

class SmsSenderModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("SmsSender")

    // Sends a plain SMS directly via Android's SmsManager - no compose UI,
    // no user tap required. Requires the SEND_SMS permission to already be
    // granted (checked/requested on the JS side before calling this).
    AsyncFunction("sendSmsAsync") { phoneNumber: String, message: String ->
      try {
        val smsManager = SmsManager.getDefault()
        val parts = smsManager.divideMessage(message)
        if (parts.size > 1) {
          smsManager.sendMultipartTextMessage(phoneNumber, null, parts, null, null)
        } else {
          smsManager.sendTextMessage(phoneNumber, null, message, null, null)
        }
      } catch (e: Exception) {
        throw SendSmsException(e)
      }
    }
  }
}
