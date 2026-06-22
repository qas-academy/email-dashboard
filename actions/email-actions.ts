"use server";

import { Resend } from "resend";
import type {
  EmailFormData,
  EmailRecipient,
  PreparedEmail,
  BatchEmailResult,
  SingleEmailResult,
} from "@/lib/types";

// Lazy initialization of Resend client to avoid build-time errors
let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY environment variable is not configured");
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

/**
 * Parse comma-separated emails into array
 */
function parseEmails(emailString: string): string[] {
  return emailString
    .split(",")
    .map((e) => e.trim())
    .filter((e) => e.length > 0);
}

/**
 * Parse comma-separated names into array
 */
function parseNames(nameString: string): string[] {
  return nameString.split(",").map((n) => n.trim());
}

/**
 * Build recipients with names matched by position
 */
function buildRecipients(emails: string[], names: string[]): EmailRecipient[] {
  return emails.map((email, index) => ({
    email,
    name: names[index] || undefined,
  }));
}

/**
 * Replace {{email}} and {{name}} placeholders in content
 */
function replacePlaceholders(
  content: string,
  email: string,
  name?: string
): string {
  let result = content.replace(/\{\{email\}\}/gi, email);
  result = result.replace(/\{\{name\}\}/gi, name || email.split("@")[0]);
  return result;
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate "From" field format: "Display Name <email@domain.com>" or plain email
 */
function isValidFromField(from: string): boolean {
  const emailOnlyRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const nameEmailRegex = /^.+\s*<[^\s@]+@[^\s@]+\.[^\s@]+>$/;
  return emailOnlyRegex.test(from) || nameEmailRegex.test(from);
}

/**
 * Prepare a single email with placeholders replaced
 */
function prepareEmail(
  formData: EmailFormData,
  recipient: EmailRecipient,
  ccEmails: string[]
): PreparedEmail {
  return {
    from: formData.from,
    to: recipient.email,
    cc: ccEmails.length > 0 ? ccEmails : undefined,
    subject: replacePlaceholders(
      formData.subject,
      recipient.email,
      recipient.name
    ),
    html: replacePlaceholders(
      formData.htmlContent,
      recipient.email,
      recipient.name
    ),
    text: formData.plainText
      ? replacePlaceholders(formData.plainText, recipient.email, recipient.name)
      : undefined,
  };
}

/**
 * Send emails - handles both single and batch
 */
export async function sendEmails(
  formData: EmailFormData
): Promise<BatchEmailResult> {
  try {
    const normalizedFormData = {
      ...formData,
      from: formData.from.trim(),
    };

    // Validation
    if (!normalizedFormData.from || !isValidFromField(normalizedFormData.from)) {
      return {
        success: false,
        totalSent: 0,
        totalFailed: 0,
        results: [],
        error:
          "Invalid 'From' field format. Use 'Display Name <email@domain.com>' or 'email@domain.com'",
      };
    }

    if (!normalizedFormData.to) {
      return {
        success: false,
        totalSent: 0,
        totalFailed: 0,
        results: [],
        error: "At least one recipient email is required",
      };
    }

    if (!normalizedFormData.subject) {
      return {
        success: false,
        totalSent: 0,
        totalFailed: 0,
        results: [],
        error: "Subject is required",
      };
    }

    if (!normalizedFormData.htmlContent) {
      return {
        success: false,
        totalSent: 0,
        totalFailed: 0,
        results: [],
        error: "HTML content is required",
      };
    }

    // Parse recipients
    const emails = parseEmails(normalizedFormData.to);
    const names = parseNames(normalizedFormData.names || "");
    const ccEmails = normalizedFormData.cc ? parseEmails(normalizedFormData.cc) : [];

    // Validate all recipient emails
    const invalidEmails = emails.filter((e) => !isValidEmail(e));
    if (invalidEmails.length > 0) {
      return {
        success: false,
        totalSent: 0,
        totalFailed: 0,
        results: [],
        error: `Invalid email addresses: ${invalidEmails.join(", ")}`,
      };
    }

    // Validate CC emails
    const invalidCc = ccEmails.filter((e) => !isValidEmail(e));
    if (invalidCc.length > 0) {
      return {
        success: false,
        totalSent: 0,
        totalFailed: 0,
        results: [],
        error: `Invalid CC email addresses: ${invalidCc.join(", ")}`,
      };
    }

    // Build recipients
    const recipients = buildRecipients(emails, names);

    // Single email - use simple send
    if (recipients.length === 1) {
      const prepared = prepareEmail(normalizedFormData, recipients[0], ccEmails);

      try {
        const { data, error } = await getResendClient().emails.send({
          from: prepared.from,
          to: prepared.to,
          cc: prepared.cc,
          subject: prepared.subject,
          html: prepared.html,
          text: prepared.text,
        });

        if (error) {
          return {
            success: false,
            totalSent: 0,
            totalFailed: 1,
            results: [
              {
                email: recipients[0].email,
                success: false,
                error: error.message,
              },
            ],
          };
        }

        return {
          success: true,
          totalSent: 1,
          totalFailed: 0,
          results: [
            {
              email: recipients[0].email,
              success: true,
              messageId: data?.id,
            },
          ],
        };
      } catch (err) {
        return {
          success: false,
          totalSent: 0,
          totalFailed: 1,
          results: [
            {
              email: recipients[0].email,
              success: false,
              error: err instanceof Error ? err.message : "Unknown error",
            },
          ],
        };
      }
    }

    // Batch emails - prepare all emails with personalization
    const preparedEmails = recipients.map((recipient) =>
      prepareEmail(normalizedFormData, recipient, ccEmails)
    );

    const results: SingleEmailResult[] = [];
    let totalSent = 0;
    let totalFailed = 0;

    try {
      const { data, error } = await getResendClient().batch.send(
        preparedEmails.map((email) => ({
          from: email.from,
          to: email.to,
          cc: email.cc,
          subject: email.subject,
          html: email.html,
          text: email.text,
        }))
      );

      if (error) {
        // All failed
        recipients.forEach((r) => {
          results.push({
            email: r.email,
            success: false,
            error: error.message,
          });
          totalFailed++;
        });
      } else if (data) {
        // Map results back to recipients
        data.data?.forEach((result, index) => {
          if (result.id) {
            results.push({
              email: recipients[index].email,
              success: true,
              messageId: result.id,
            });
            totalSent++;
          } else {
            results.push({
              email: recipients[index].email,
              success: false,
              error: "Failed to send",
            });
            totalFailed++;
          }
        });
      }
    } catch (err) {
      // All failed due to exception
      recipients.forEach((r) => {
        results.push({
          email: r.email,
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        });
        totalFailed++;
      });
    }

    return {
      success: totalFailed === 0,
      totalSent,
      totalFailed,
      results,
    };
  } catch (error) {
    console.error("Error sending emails:", error);
    return {
      success: false,
      totalSent: 0,
      totalFailed: 0,
      results: [],
      error: error instanceof Error ? error.message : "Failed to send emails",
    };
  }
}

/**
 * Preview email with placeholder replacement (for UI preview)
 */
export async function previewEmail(
  htmlContent: string,
  subject: string,
  sampleEmail: string,
  sampleName?: string
): Promise<{ html: string; subject: string }> {
  return {
    html: replacePlaceholders(htmlContent, sampleEmail, sampleName),
    subject: replacePlaceholders(subject, sampleEmail, sampleName),
  };
}
