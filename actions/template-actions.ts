"use server";

import { query } from "@/lib/db";
import { revalidatePath } from "next/cache";
import {
  EmailTemplate,
  EmailTemplateCreateInput,
  EmailTemplateSummary,
  EmailTemplateUpdateInput,
} from "@/lib/types";

// Constants for template code generation
const MIN_WORD_LENGTH = 3; // Minimum word length to include in template code
const MAX_WORDS_IN_CODE = 4; // Maximum number of words to use from subject
const MAX_TEMPLATE_CODE_LENGTH = 50; // Maximum length for generated template code
const UUID_SUFFIX_LENGTH = 8; // Length of UUID suffix for uniqueness

export async function getTemplates(search?: string): Promise<EmailTemplate[]> {
  try {
    let sql = "SELECT * FROM email_templates";
    const params: string[] = [];

    if (search && search.trim()) {
      sql += " WHERE template_code ILIKE $1 OR subject ILIKE $1 OR description ILIKE $1";
      params.push(`%${search.trim()}%`);
    }

    sql += " ORDER BY template_code ASC";

    const result = await query(sql, params);
    return result.rows as EmailTemplate[];
  } catch (error) {
    console.error("Error fetching templates:", error);
    return [];
  }
}

export async function getTemplateSummaries(search?: string): Promise<EmailTemplateSummary[]> {
  try {
    let sql = "SELECT template_code, subject, description FROM email_templates";
    const params: string[] = [];

    if (search && search.trim()) {
      sql += " WHERE template_code ILIKE $1 OR subject ILIKE $1 OR description ILIKE $1";
      params.push(`%${search.trim()}%`);
    }

    sql += " ORDER BY template_code ASC";

    const result = await query(sql, params);
    return result.rows as EmailTemplateSummary[];
  } catch (error) {
    console.error("Error fetching template summaries:", error);
    return [];
  }
}

export async function getTemplateByCode(code: string): Promise<EmailTemplate | null> {
  try {
    const result = await query(
      "SELECT * FROM email_templates WHERE template_code = $1",
      [code]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as EmailTemplate;
  } catch (error) {
    console.error("Error fetching template:", error);
    return null;
  }
}

export async function createTemplate(data: EmailTemplateCreateInput): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if template code already exists
    const existing = await getTemplateByCode(data.template_code);
    if (existing) {
      return { success: false, error: "Template code already exists" };
    }

    await query(
      `INSERT INTO email_templates (template_code, subject, html_content, description)
       VALUES ($1, $2, $3, $4)`,
      [data.template_code, data.subject, data.html_content, data.description || null]
    );

    revalidatePath("/dashboard/templates");
    return { success: true };
  } catch (error) {
    console.error("Error creating template:", error);
    return { success: false, error: "Failed to create template" };
  }
}

export async function updateTemplate(
  code: string,
  data: EmailTemplateUpdateInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await query(
      `UPDATE email_templates
       SET subject = $2, html_content = $3, description = $4
       WHERE template_code = $1`,
      [code, data.subject, data.html_content, data.description || null]
    );

    if (result.rowCount === 0) {
      return { success: false, error: "Template not found" };
    }

    revalidatePath("/dashboard/templates");
    revalidatePath(`/dashboard/templates/${code}`);
    return { success: true };
  } catch (error) {
    console.error("Error updating template:", error);
    return { success: false, error: "Failed to update template" };
  }
}

export async function deleteTemplate(code: string): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await query(
      "DELETE FROM email_templates WHERE template_code = $1",
      [code]
    );

    if (result.rowCount === 0) {
      return { success: false, error: "Template not found" };
    }

    revalidatePath("/dashboard/templates");
    return { success: true };
  } catch (error) {
    console.error("Error deleting template:", error);
    return { success: false, error: "Failed to delete template" };
  }
}

/**
 * Check if a template with the same subject and html_content already exists
 */
export async function findTemplateByContent(
  subject: string,
  htmlContent: string
): Promise<EmailTemplate | null> {
  try {
    const result = await query(
      "SELECT * FROM email_templates WHERE subject = $1 AND html_content = $2 LIMIT 1",
      [subject, htmlContent]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as EmailTemplate;
  } catch (error) {
    console.error("Error finding template by content:", error);
    return null;
  }
}

/**
 * Generate a unique template code from subject
 * Uses meaningful words from subject + UUID suffix for guaranteed uniqueness
 */
function generateTemplateCode(subject: string): string {
  // Extract meaningful words from subject, convert to uppercase snake_case
  const words = subject
    .replace(/[^a-zA-Z0-9\s]/g, "") // Remove special characters
    .split(/\s+/)
    .filter((w) => w.length >= MIN_WORD_LENGTH)
    .slice(0, MAX_WORDS_IN_CODE)
    .map((w) => w.toUpperCase());

  const baseCode = words.length > 0 ? words.join("_") : "CUSTOM";

  // Use crypto UUID suffix for guaranteed uniqueness (handles concurrent requests)
  const uuidSuffix = crypto.randomUUID().substring(0, UUID_SUFFIX_LENGTH).toUpperCase();

  // Combine and enforce max length
  const fullCode = `${baseCode}_${uuidSuffix}`;

  // Truncate if exceeds max length (keep UUID suffix intact)
  if (fullCode.length > MAX_TEMPLATE_CODE_LENGTH) {
    const maxBaseLength = MAX_TEMPLATE_CODE_LENGTH - UUID_SUFFIX_LENGTH - 1; // -1 for underscore
    return `${baseCode.substring(0, maxBaseLength)}_${uuidSuffix}`;
  }

  return fullCode;
}

/**
 * Validate template input
 */
function validateTemplateInput(
  subject: string,
  htmlContent: string
): { valid: boolean; error?: string } {
  if (!subject || subject.trim().length === 0) {
    return { valid: false, error: "Subject cannot be empty" };
  }
  if (!htmlContent || htmlContent.trim().length === 0) {
    return { valid: false, error: "HTML content cannot be empty" };
  }
  return { valid: true };
}

/**
 * Save a custom email template (auto-generates template_code)
 * Only saves if no template with same subject + html_content exists
 * Uses ON CONFLICT to handle race conditions atomically
 */
export async function saveCustomTemplate(
  subject: string,
  htmlContent: string,
  description?: string
): Promise<{ success: boolean; templateCode?: string; error?: string; alreadyExists?: boolean }> {
  try {
    // Validate input
    const validation = validateTemplateInput(subject, htmlContent);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Check if template with same content already exists
    const existing = await findTemplateByContent(subject.trim(), htmlContent.trim());
    if (existing) {
      return {
        success: true,
        templateCode: existing.template_code,
        alreadyExists: true,
      };
    }

    // Generate unique template code with UUID for guaranteed uniqueness
    const templateCode = generateTemplateCode(subject.trim());

    // Insert with ON CONFLICT to handle race conditions atomically
    // If code already exists (race condition), do nothing and return error
    const result = await query(
      `INSERT INTO email_templates (template_code, subject, html_content, description)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (template_code) DO NOTHING
       RETURNING template_code`,
      [templateCode, subject.trim(), htmlContent.trim(), description || "Auto-saved custom template"]
    );

    // If no row returned, there was a conflict (very rare with UUID)
    if (result.rows.length === 0) {
      // Retry once with new UUID
      const retryCode = generateTemplateCode(subject.trim());
      const retryResult = await query(
        `INSERT INTO email_templates (template_code, subject, html_content, description)
         VALUES ($1, $2, $3, $4)
         RETURNING template_code`,
        [retryCode, subject.trim(), htmlContent.trim(), description || "Auto-saved custom template"]
      );

      if (retryResult.rows.length === 0) {
        return { success: false, error: "Failed to generate unique template code" };
      }

      revalidatePath("/dashboard/templates");
      return {
        success: true,
        templateCode: retryCode,
        alreadyExists: false,
      };
    }

    revalidatePath("/dashboard/templates");

    return {
      success: true,
      templateCode,
      alreadyExists: false,
    };
  } catch (error) {
    console.error("Error saving custom template:", error);
    return { success: false, error: "Failed to save custom template" };
  }
}
