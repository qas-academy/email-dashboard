"use server";

import { query } from "@/lib/db";
import { revalidatePath } from "next/cache";
import crypto from "crypto";
import {
  MarketingContact,
  ContactFilters,
  ContactCreateInput,
  ContactUpdateInput,
  CSVContact,
  CSVContactValidationError,
  CSVContactValidationResult,
  ContactImportResult,
  DuplicateCheckResult,
  ContactEvent,
  BulkOperationResult,
  PaginationParams,
  PaginatedResult,
} from "@/lib/types";

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Valid contact statuses
const VALID_STATUSES = ['active', 'unsubscribed', 'bounced', 'complained'] as const;


/**
 * Get paginated list of marketing contacts with filters
 */
export async function getContacts(
  filters: ContactFilters = {},
  pagination: PaginationParams = {}
): Promise<PaginatedResult<MarketingContact>> {
  const { page = 1, limit = 10, sortBy = "created_at", sortOrder = "desc" } = pagination;

  try {
    const { search, status, engagement_level, tags } = filters;
    const offset = (page - 1) * limit;

    // Build WHERE clause
    const conditions: string[] = [];
    const params: (string | number | boolean | null | undefined | string[])[] = [];
    let paramIndex = 1;

    if (search && search.trim()) {
      conditions.push(
        `(email ILIKE $${paramIndex} OR first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex})`
      );
      params.push(`%${search.trim()}%`);
      paramIndex++;
    }

    if (status) {
      conditions.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (engagement_level) {
      conditions.push(`engagement_level = $${paramIndex}`);
      params.push(engagement_level);
      paramIndex++;
    }

    if (tags && tags.length > 0) {
      // Use array overlap operator with explicit casting
      conditions.push(`tags && $${paramIndex}::text[]`);
      params.push(tags);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Whitelist allowed sort columns
    const allowedSortColumns = [
      "id", "created_at", "updated_at", "email", "first_name", "last_name",
      "status", "engagement_level", "last_email_at"
    ];
    const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : "created_at";
    const safeSortOrder = sortOrder === "asc" ? "ASC" : "DESC";

    const [countResult, dataResult] = await Promise.all([
      query(
        `SELECT COUNT(*) FROM marketing_contacts ${whereClause}`,
        params
      ),
      query(
        `SELECT * FROM marketing_contacts ${whereClause}
         ORDER BY "${safeSortBy}" ${safeSortOrder}
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, limit, offset]
      ),
    ]);
    const total = parseInt(countResult.rows[0].count, 10);

    return {
      data: dataResult.rows as MarketingContact[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    console.error("Error fetching contacts:", error);
    return {
      data: [],
      total: 0,
      page,
      limit,
      totalPages: 0,
    };
  }
}

/**
 * Get a single contact by ID
 */
export async function getContactById(id: string): Promise<MarketingContact | null> {
  try {
    const result = await query(
      "SELECT * FROM marketing_contacts WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as MarketingContact;
  } catch (error) {
    console.error("Error fetching contact:", error);
    return null;
  }
}

/**
 * Get a contact by email
 */
export async function getContactByEmail(email: string): Promise<MarketingContact | null> {
  try {
    const result = await query(
      "SELECT * FROM marketing_contacts WHERE LOWER(email) = LOWER($1)",
      [email.trim()]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as MarketingContact;
  } catch (error) {
    console.error("Error fetching contact by email:", error);
    return null;
  }
}

/**
 * Create a new contact
 */
export async function createContact(
  data: ContactCreateInput
): Promise<{ success: boolean; contact?: MarketingContact; error?: string }> {
  try {
    const normalizedEmail = data.email.trim().toLowerCase();

    // Check if email already exists
    const existing = await getContactByEmail(normalizedEmail);
    if (existing) {
      return { success: false, error: "Email already exists" };
    }

    // Generate unsubscribe token
    const unsubscribeToken = generateUnsubscribeToken();

    const result = await query(
      `INSERT INTO marketing_contacts
        (email, first_name, last_name, source, tags, unsubscribe_token)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        normalizedEmail,
        data.first_name?.trim() || null,
        data.last_name?.trim() || null,
        data.source || 'manual',
        data.tags || [],
        unsubscribeToken,
      ]
    );

    revalidatePath("/dashboard/contacts");
    return { success: true, contact: result.rows[0] as MarketingContact };
  } catch (error) {
    console.error("Error creating contact:", error);
    return { success: false, error: "Failed to create contact" };
  }
}

/**
 * Update an existing contact
 */
export async function updateContact(
  id: string,
  data: ContactUpdateInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const updates: string[] = [];
    const params: (string | string[])[] = [];
    let paramIndex = 1;

    if (data.first_name !== undefined) {
      updates.push(`first_name = $${paramIndex}`);
      params.push(data.first_name?.trim() || '');
      paramIndex++;
    }

    if (data.last_name !== undefined) {
      updates.push(`last_name = $${paramIndex}`);
      params.push(data.last_name?.trim() || '');
      paramIndex++;
    }

    if (data.tags !== undefined) {
      updates.push(`tags = $${paramIndex}`);
      params.push(data.tags);
      paramIndex++;
    }

    if (data.status !== undefined) {
      if (!VALID_STATUSES.includes(data.status)) {
        return { success: false, error: "Invalid status" };
      }
      updates.push(`status = $${paramIndex}`);
      params.push(data.status);
      paramIndex++;

      // Set unsubscribed_at if status is unsubscribed
      if (data.status === 'unsubscribed') {
        updates.push(`unsubscribed_at = NOW()`);
      }
    }

    if (updates.length === 0) {
      return { success: false, error: "No fields to update" };
    }

    updates.push("updated_at = NOW()");

    const result = await query(
      `UPDATE marketing_contacts SET ${updates.join(", ")} WHERE id = $${paramIndex}`,
      [...params, id]
    );

    if (result.rowCount === 0) {
      return { success: false, error: "Contact not found" };
    }

    revalidatePath("/dashboard/contacts");
    return { success: true };
  } catch (error) {
    console.error("Error updating contact:", error);
    return { success: false, error: "Failed to update contact" };
  }
}

/**
 * Delete a contact
 */
export async function deleteContact(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await query(
      "DELETE FROM marketing_contacts WHERE id = $1",
      [id]
    );

    if (result.rowCount === 0) {
      return { success: false, error: "Contact not found" };
    }

    revalidatePath("/dashboard/contacts");
    return { success: true };
  } catch (error) {
    console.error("Error deleting contact:", error);
    return { success: false, error: "Failed to delete contact" };
  }
}

/**
 * Validate CSV contact data
 */
export async function validateContactCSV(
  data: CSVContact[]
): Promise<CSVContactValidationResult> {
  const errors: CSVContactValidationError[] = [];
  let validRows = 0;
  let invalidRows = 0;

  data.forEach((row, index) => {
    const rowNum = index + 2; // +2 because row 1 is header, and index starts at 0
    let rowHasError = false;

    // Required: email
    if (!row.email?.trim()) {
      errors.push({ row: rowNum, field: "email", message: "Email is required" });
      rowHasError = true;
    } else if (!EMAIL_REGEX.test(row.email.trim())) {
      errors.push({ row: rowNum, field: "email", message: "Invalid email format" });
      rowHasError = true;
    }

    if (rowHasError) {
      invalidRows++;
    } else {
      validRows++;
    }
  });

  return {
    valid: errors.length === 0,
    validRows,
    invalidRows,
    errors,
  };
}

/**
 * Check for duplicate emails in the database
 */
export async function checkDuplicates(emails: string[]): Promise<DuplicateCheckResult> {
  try {
    const normalizedEmails = emails.map(e => e.trim().toLowerCase());
    const uniqueEmails = [...new Set(normalizedEmails)];

    if (uniqueEmails.length === 0) {
      return { existing: [], new: [] };
    }

    // Build placeholder string for IN clause
    const placeholders = uniqueEmails.map((_, i) => `$${i + 1}`).join(", ");

    const result = await query(
      `SELECT id, email, templates_received FROM marketing_contacts
       WHERE LOWER(email) IN (${placeholders})`,
      uniqueEmails
    );

    const existingEmails = new Set(result.rows.map(r => r.email.toLowerCase()));
    const existingRecords = result.rows.map(r => ({
      email: r.email,
      id: r.id,
      templates_received: r.templates_received || [],
    }));

    const newEmails = uniqueEmails.filter(e => !existingEmails.has(e));

    return {
      existing: existingRecords,
      new: newEmails,
    };
  } catch (error) {
    console.error("Error checking duplicates:", error);
    return { existing: [], new: emails };
  }
}

/**
 * Import contacts from CSV (upsert logic)
 */
export async function importContacts(
  data: CSVContact[],
  source: string
): Promise<ContactImportResult> {
  try {
    // Validate first
    const validation = await validateContactCSV(data);
    if (!validation.valid) {
      return {
        success: false,
        total: data.length,
        inserted: 0,
        updated: 0,
        failed: validation.invalidRows,
        errors: validation.errors,
      };
    }

    // Deduplicate within CSV (keep last occurrence)
    const emailMap = new Map<string, CSVContact>();
    data.forEach(row => {
      const normalizedEmail = row.email.trim().toLowerCase();
      emailMap.set(normalizedEmail, row);
    });
    const uniqueData = Array.from(emailMap.values());

    let insertedCount = 0;
    let updatedCount = 0;
    let failedCount = 0;
    const importErrors: CSVContactValidationError[] = [];

    for (let i = 0; i < uniqueData.length; i++) {
      const row = uniqueData[i];
      const normalizedEmail = row.email.trim().toLowerCase();

      try {
        // Check if email already exists
        const existingResult = await query(
          "SELECT id, templates_received FROM marketing_contacts WHERE LOWER(email) = $1",
          [normalizedEmail]
        );

        // Parse tags from comma-separated string
        const tags = row.tags
          ? row.tags.split(",").map(t => t.trim()).filter(t => t.length > 0)
          : [];

        if (existingResult.rows.length > 0) {
          // Update existing - merge tags
          const existingTags: string[] = existingResult.rows[0].templates_received || [];

          await query(
            `UPDATE marketing_contacts SET
              first_name = COALESCE($2, first_name),
              last_name = COALESCE($3, last_name),
              tags = array_cat(tags, $4::text[]),
              source = $5,
              updated_at = NOW()
            WHERE LOWER(email) = $1`,
            [
              normalizedEmail,
              row.first_name?.trim() || null,
              row.last_name?.trim() || null,
              tags.filter(t => !existingTags.includes(t)), // Only add new tags
              source,
            ]
          );
          updatedCount++;
        } else {
          // Insert new with unsubscribe token
          const unsubscribeToken = generateUnsubscribeToken();

          await query(
            `INSERT INTO marketing_contacts
              (email, first_name, last_name, source, tags, unsubscribe_token)
            VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              normalizedEmail,
              row.first_name?.trim() || null,
              row.last_name?.trim() || null,
              source,
              tags,
              unsubscribeToken,
            ]
          );
          insertedCount++;
        }
      } catch (rowError) {
        failedCount++;
        importErrors.push({
          row: i + 2,
          field: "general",
          message: `Failed to import row: ${rowError instanceof Error ? rowError.message : "Unknown error"}`,
        });
      }
    }

    revalidatePath("/dashboard/contacts");

    return {
      success: failedCount === 0,
      total: uniqueData.length,
      inserted: insertedCount,
      updated: updatedCount,
      failed: failedCount,
      errors: importErrors,
    };
  } catch (error) {
    console.error("Error importing contacts:", error);
    return {
      success: false,
      total: data.length,
      inserted: 0,
      updated: 0,
      failed: data.length,
      errors: [{ row: 0, field: "general", message: "Failed to import contacts" }],
    };
  }
}

/**
 * Get contact history (campaigns they've been sent)
 */
export async function getContactHistory(contactId: string): Promise<ContactEvent[]> {
  try {
    const result = await query(
      `SELECT
        l.id,
        l.campaign_id,
        c.name as campaign_name,
        c.template_code,
        l.status,
        l.sent_at,
        l.opened_at,
        l.clicked_at,
        l.created_at
      FROM marketing_campaign_logs l
      JOIN marketing_campaigns c ON l.campaign_id = c.id
      WHERE l.contact_id = $1
      ORDER BY l.created_at DESC`,
      [contactId]
    );

    return result.rows.map(row => ({
      id: row.id,
      type: row.clicked_at ? 'clicked' : row.opened_at ? 'opened' : 'campaign_sent',
      campaign_id: row.campaign_id,
      campaign_name: row.campaign_name,
      template_code: row.template_code,
      timestamp: row.clicked_at || row.opened_at || row.sent_at || row.created_at,
    })) as ContactEvent[];
  } catch (error) {
    console.error("Error fetching contact history:", error);
    return [];
  }
}

/**
 * Add tags to multiple contacts
 */
export async function addTagsToContacts(
  contactIds: string[],
  tags: string[]
): Promise<BulkOperationResult> {
  try {
    if (contactIds.length === 0 || tags.length === 0) {
      return { success: false, affected: 0, error: "No contacts or tags provided" };
    }

    const placeholders = contactIds.map((_, i) => `$${i + 2}`).join(", ");

    const result = await query(
      `UPDATE marketing_contacts
       SET tags = array_cat(tags, $1::text[]), updated_at = NOW()
       WHERE id IN (${placeholders})`,
      [tags, ...contactIds]
    );

    revalidatePath("/dashboard/contacts");
    return { success: true, affected: result.rowCount || 0 };
  } catch (error) {
    console.error("Error adding tags:", error);
    return { success: false, affected: 0, error: "Failed to add tags" };
  }
}

/**
 * Remove tags from multiple contacts
 */
export async function removeTagsFromContacts(
  contactIds: string[],
  tags: string[]
): Promise<BulkOperationResult> {
  try {
    if (contactIds.length === 0 || tags.length === 0) {
      return { success: false, affected: 0, error: "No contacts or tags provided" };
    }

    const placeholders = contactIds.map((_, i) => `$${i + 2}`).join(", ");

    const result = await query(
      `UPDATE marketing_contacts
       SET tags = array_remove(tags, unnest($1::text[])), updated_at = NOW()
       WHERE id IN (${placeholders})`,
      [tags, ...contactIds]
    );

    revalidatePath("/dashboard/contacts");
    return { success: true, affected: result.rowCount || 0 };
  } catch (error) {
    console.error("Error removing tags:", error);
    return { success: false, affected: 0, error: "Failed to remove tags" };
  }
}

/**
 * Update status for multiple contacts
 */
export async function updateContactsStatus(
  contactIds: string[],
  status: 'active' | 'unsubscribed' | 'bounced' | 'complained'
): Promise<BulkOperationResult> {
  try {
    if (contactIds.length === 0) {
      return { success: false, affected: 0, error: "No contacts provided" };
    }

    if (!VALID_STATUSES.includes(status)) {
      return { success: false, affected: 0, error: "Invalid status" };
    }

    const placeholders = contactIds.map((_, i) => `$${i + 2}`).join(", ");

    let updateQuery = `UPDATE marketing_contacts
       SET status = $1, updated_at = NOW()`;

    if (status === 'unsubscribed') {
      updateQuery += `, unsubscribed_at = NOW()`;
    }

    updateQuery += ` WHERE id IN (${placeholders})`;

    const result = await query(updateQuery, [status, ...contactIds]);

    revalidatePath("/dashboard/contacts");
    return { success: true, affected: result.rowCount || 0 };
  } catch (error) {
    console.error("Error updating status:", error);
    return { success: false, affected: 0, error: "Failed to update status" };
  }
}

/**
 * Get all unique tags used in contacts
 */
export async function getAllTags(): Promise<string[]> {
  try {
    const result = await query(
      `SELECT DISTINCT unnest(tags) as tag FROM marketing_contacts ORDER BY tag`
    );
    return result.rows.map(r => r.tag);
  } catch (error) {
    console.error("Error fetching tags:", error);
    return [];
  }
}

/**
 * Get contact statistics
 */
export async function getContactStats(): Promise<{
  total: number;
  active: number;
  unsubscribed: number;
  bounced: number;
}> {
  try {
    const result = await query(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'unsubscribed') as unsubscribed,
        COUNT(*) FILTER (WHERE status = 'bounced') as bounced
      FROM marketing_contacts`
    );

    const row = result.rows[0];
    return {
      total: parseInt(row.total, 10),
      active: parseInt(row.active, 10),
      unsubscribed: parseInt(row.unsubscribed, 10),
      bounced: parseInt(row.bounced, 10),
    };
  } catch (error) {
    console.error("Error fetching contact stats:", error);
    return { total: 0, active: 0, unsubscribed: 0, bounced: 0 };
  }
}

/**
 * Generate a secure unsubscribe token
 */
function generateUnsubscribeToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Process unsubscribe request
 */
export async function processUnsubscribe(
  token: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await query(
      `UPDATE marketing_contacts
       SET status = 'unsubscribed', unsubscribed_at = NOW(), updated_at = NOW()
       WHERE unsubscribe_token = $1 AND status = 'active'
       RETURNING id`,
      [token]
    );

    if (result.rowCount === 0) {
      return { success: false, error: "Invalid or expired unsubscribe link" };
    }

    return { success: true };
  } catch (error) {
    console.error("Error processing unsubscribe:", error);
    return { success: false, error: "Failed to process unsubscribe request" };
  }
}

/**
 * Update contact engagement after email event
 */
export async function updateContactEngagement(
  contactId: string,
  level: 'sent' | 'opened' | 'clicked',
  templateCode?: string
): Promise<{ success: boolean }> {
  try {
    const updates: string[] = [];
    const params: string[] = [contactId];
    let paramIndex = 2;

    // Update engagement level (only upgrade, never downgrade)
    const levelPriority = { none: 0, sent: 1, opened: 2, clicked: 3 };
    updates.push(`engagement_level = CASE
      WHEN $${paramIndex}::int > (
        CASE engagement_level
          WHEN 'none' THEN 0
          WHEN 'sent' THEN 1
          WHEN 'opened' THEN 2
          WHEN 'clicked' THEN 3
        END
      ) THEN $${paramIndex + 1}
      ELSE engagement_level
    END`);
    params.push(String(levelPriority[level]), level);
    paramIndex += 2;

    // Update last activity timestamps
    if (level === 'sent') {
      updates.push("last_email_at = NOW()");
    } else if (level === 'opened') {
      updates.push("last_opened_at = NOW()");
    } else if (level === 'clicked') {
      updates.push("last_clicked_at = NOW()");
    }

    // Add template to templates_received if provided
    if (templateCode) {
      updates.push(`templates_received = array_append(
        array_remove(templates_received, $${paramIndex}),
        $${paramIndex}
      )`);
      params.push(templateCode);
    }

    updates.push("updated_at = NOW()");

    await query(
      `UPDATE marketing_contacts SET ${updates.join(", ")} WHERE id = $1`,
      params
    );

    return { success: true };
  } catch (error) {
    console.error("Error updating contact engagement:", error);
    return { success: false };
  }
}
