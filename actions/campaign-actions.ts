"use server";

import { query } from "@/lib/db";
import { revalidatePath } from "next/cache";
import {
  Campaign,
  CampaignStatus,
  CampaignCreateInput,
  CampaignUpdateInput,
  CampaignFilters,
  CampaignWithRates,
  AudienceFilter,
  AudiencePreview,
  CampaignExecutionResult,
  CampaignStats,
  PaginationParams,
  PaginatedResult,
  CampaignLog,
} from "@/lib/types";

// Valid campaign statuses
const VALID_STATUSES: CampaignStatus[] = ['draft', 'scheduled', 'sending', 'completed', 'paused', 'archived'];

/**
 * Get paginated list of campaigns with filters
 */
export async function getCampaigns(
  filters: CampaignFilters = {},
  pagination: PaginationParams = {}
): Promise<PaginatedResult<CampaignWithRates>> {
  const { page = 1, limit = 10, sortBy = "created_at", sortOrder = "desc" } = pagination;

  try {
    const { search, status, template_code } = filters;
    const offset = (page - 1) * limit;

    // Build WHERE clause
    const conditions: string[] = [];
    const params: (string | number | boolean | null | undefined)[] = [];
    let paramIndex = 1;

    if (search && search.trim()) {
      conditions.push(`(name ILIKE $${paramIndex} OR objective ILIKE $${paramIndex})`);
      params.push(`%${search.trim()}%`);
      paramIndex++;
    }

    if (status) {
      conditions.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (template_code) {
      conditions.push(`template_code = $${paramIndex}`);
      params.push(template_code);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Whitelist allowed sort columns
    const allowedSortColumns = [
      "id", "created_at", "updated_at", "name", "status", "scheduled_at",
      "started_at", "finished_at", "total_recipients"
    ];
    const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : "created_at";
    const safeSortOrder = sortOrder === "asc" ? "ASC" : "DESC";

    const [countResult, dataResult] = await Promise.all([
      query(
        `SELECT COUNT(*) FROM marketing_campaigns ${whereClause}`,
        params
      ),
      query(
        `SELECT * FROM marketing_campaigns ${whereClause}
         ORDER BY "${safeSortBy}" ${safeSortOrder}
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, limit, offset]
      ),
    ]);
    const total = parseInt(countResult.rows[0].count, 10);

    // Calculate rates for each campaign
    const campaignsWithRates: CampaignWithRates[] = dataResult.rows.map(row => {
      const campaign = row as Campaign;
      const sent = campaign.stats_sent || 0;
      return {
        ...campaign,
        open_rate: sent > 0 ? (campaign.stats_opened / sent) * 100 : 0,
        click_rate: sent > 0 ? (campaign.stats_clicked / sent) * 100 : 0,
        bounce_rate: sent > 0 ? (campaign.stats_bounced / sent) * 100 : 0,
        delivery_rate: sent > 0 ? (campaign.stats_delivered / sent) * 100 : 0,
      };
    });

    return {
      data: campaignsWithRates,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    console.error("Error fetching campaigns:", error);
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
 * Get a single campaign by ID
 */
export async function getCampaignById(id: string): Promise<CampaignWithRates | null> {
  try {
    const result = await query(
      "SELECT * FROM marketing_campaigns WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const campaign = result.rows[0] as Campaign;
    const sent = campaign.stats_sent || 0;

    return {
      ...campaign,
      open_rate: sent > 0 ? (campaign.stats_opened / sent) * 100 : 0,
      click_rate: sent > 0 ? (campaign.stats_clicked / sent) * 100 : 0,
      bounce_rate: sent > 0 ? (campaign.stats_bounced / sent) * 100 : 0,
      delivery_rate: sent > 0 ? (campaign.stats_delivered / sent) * 100 : 0,
    };
  } catch (error) {
    console.error("Error fetching campaign:", error);
    return null;
  }
}

/**
 * Create a new campaign
 */
export async function createCampaign(
  data: CampaignCreateInput
): Promise<{ success: boolean; campaign?: Campaign; error?: string }> {
  try {
    if (!data.name?.trim()) {
      return { success: false, error: "Campaign name is required" };
    }

    const result = await query(
      `INSERT INTO marketing_campaigns
        (name, objective, template_code, audience_filter, scheduled_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        data.name.trim(),
        data.objective?.trim() || null,
        data.template_code || null,
        JSON.stringify(data.audience_filter || {}),
        data.scheduled_at || null,
      ]
    );

    revalidatePath("/dashboard/campaigns");
    return { success: true, campaign: result.rows[0] as Campaign };
  } catch (error) {
    console.error("Error creating campaign:", error);
    return { success: false, error: "Failed to create campaign" };
  }
}

/**
 * Update an existing campaign
 */
export async function updateCampaign(
  id: string,
  data: CampaignUpdateInput
): Promise<{ success: boolean; error?: string }> {
  try {
    // First check campaign exists and is editable
    const existing = await getCampaignById(id);
    if (!existing) {
      return { success: false, error: "Campaign not found" };
    }

    // Only allow editing draft or scheduled campaigns
    if (!['draft', 'scheduled', 'paused'].includes(existing.status)) {
      return { success: false, error: "Cannot edit campaign in current status" };
    }

    const updates: string[] = [];
    const params: (string | null)[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      params.push(data.name.trim());
      paramIndex++;
    }

    if (data.objective !== undefined) {
      updates.push(`objective = $${paramIndex}`);
      params.push(data.objective?.trim() || null);
      paramIndex++;
    }

    if (data.template_code !== undefined) {
      updates.push(`template_code = $${paramIndex}`);
      params.push(data.template_code || null);
      paramIndex++;
    }

    if (data.audience_filter !== undefined) {
      updates.push(`audience_filter = $${paramIndex}`);
      params.push(JSON.stringify(data.audience_filter));
      paramIndex++;
    }

    if (data.scheduled_at !== undefined) {
      updates.push(`scheduled_at = $${paramIndex}`);
      params.push(data.scheduled_at || null);
      paramIndex++;
    }

    if (data.status !== undefined) {
      if (!VALID_STATUSES.includes(data.status)) {
        return { success: false, error: "Invalid status" };
      }
      updates.push(`status = $${paramIndex}`);
      params.push(data.status);
      paramIndex++;
    }

    if (updates.length === 0) {
      return { success: false, error: "No fields to update" };
    }

    updates.push("updated_at = NOW()");

    const result = await query(
      `UPDATE marketing_campaigns SET ${updates.join(", ")} WHERE id = $${paramIndex}`,
      [...params, id]
    );

    if (result.rowCount === 0) {
      return { success: false, error: "Campaign not found" };
    }

    revalidatePath("/dashboard/campaigns");
    revalidatePath(`/dashboard/campaigns/${id}`);
    return { success: true };
  } catch (error) {
    console.error("Error updating campaign:", error);
    return { success: false, error: "Failed to update campaign" };
  }
}

/**
 * Delete a campaign (only draft campaigns)
 */
export async function deleteCampaign(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if campaign is draft
    const existing = await getCampaignById(id);
    if (!existing) {
      return { success: false, error: "Campaign not found" };
    }

    if (existing.status !== 'draft') {
      return { success: false, error: "Only draft campaigns can be deleted" };
    }

    const result = await query(
      "DELETE FROM marketing_campaigns WHERE id = $1",
      [id]
    );

    if (result.rowCount === 0) {
      return { success: false, error: "Campaign not found" };
    }

    revalidatePath("/dashboard/campaigns");
    return { success: true };
  } catch (error) {
    console.error("Error deleting campaign:", error);
    return { success: false, error: "Failed to delete campaign" };
  }
}

/**
 * Get audience preview based on filters
 */
export async function getAudiencePreview(
  filters: AudienceFilter
): Promise<AudiencePreview> {
  try {
    const conditions: string[] = ["status = 'active'"];
    const params: (string | string[])[] = [];
    let paramIndex = 1;

    // Filter by tags
    if (filters.tags && filters.tags.length > 0) {
      conditions.push(`tags && $${paramIndex}::text[]`);
      params.push(filters.tags);
      paramIndex++;
    }

    // Filter by status
    if (filters.status && filters.status.length > 0) {
      const statusPlaceholders = filters.status.map((_, i) => `$${paramIndex + i}`).join(", ");
      conditions.push(`status IN (${statusPlaceholders})`);
      params.push(...filters.status);
      paramIndex += filters.status.length;
    }

    // Filter by engagement level
    if (filters.engagement_level && filters.engagement_level.length > 0) {
      const engagementPlaceholders = filters.engagement_level.map((_, i) => `$${paramIndex + i}`).join(", ");
      conditions.push(`engagement_level IN (${engagementPlaceholders})`);
      params.push(...filters.engagement_level);
      paramIndex += filters.engagement_level.length;
    }

    // Exclude contacts who received specific templates
    if (filters.exclude_templates && filters.exclude_templates.length > 0) {
      conditions.push(`NOT (templates_received && $${paramIndex}::text[])`);
      params.push(filters.exclude_templates);
      paramIndex++;
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    // Get count
    const countResult = await query(
      `SELECT COUNT(*) FROM marketing_contacts ${whereClause}`,
      params
    );

    // Get sample (first 10)
    const sampleResult = await query<{
      id: string;
      email: string;
      first_name: string | null;
      last_name: string | null;
      tags: string[];
    }>(
      `SELECT id, email, first_name, last_name, tags
       FROM marketing_contacts ${whereClause}
       LIMIT 10`,
      params
    );

    return {
      count: parseInt(countResult.rows[0].count, 10),
      sample: sampleResult.rows,
    };
  } catch (error) {
    console.error("Error getting audience preview:", error);
    return { count: 0, sample: [] };
  }
}

/**
 * Start a campaign (queue emails for sending)
 */
export async function startCampaign(id: string): Promise<CampaignExecutionResult> {
  try {
    // Get campaign
    const campaign = await getCampaignById(id);
    if (!campaign) {
      return { success: false, campaign_id: id, total_queued: 0, error: "Campaign not found" };
    }

    // Check status
    if (!['draft', 'scheduled'].includes(campaign.status)) {
      return { success: false, campaign_id: id, total_queued: 0, error: "Campaign cannot be started in current status" };
    }

    // Check template is set
    if (!campaign.template_code) {
      return { success: false, campaign_id: id, total_queued: 0, error: "Campaign template is not set" };
    }

    // Get audience
    const audience = await getAudiencePreview(campaign.audience_filter);
    if (audience.count === 0) {
      return { success: false, campaign_id: id, total_queued: 0, error: "No contacts match the audience criteria" };
    }

    // Build conditions for audience selection
    const conditions: string[] = ["status = 'active'"];
    const params: (string | string[])[] = [];
    let paramIndex = 1;

    const filters = campaign.audience_filter;

    if (filters.tags && filters.tags.length > 0) {
      conditions.push(`tags && $${paramIndex}::text[]`);
      params.push(filters.tags);
      paramIndex++;
    }

    if (filters.exclude_templates && filters.exclude_templates.length > 0) {
      conditions.push(`NOT (templates_received && $${paramIndex}::text[])`);
      params.push(filters.exclude_templates);
      paramIndex++;
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    // Insert campaign logs for all matching contacts
    const insertResult = await query(
      `INSERT INTO marketing_campaign_logs (campaign_id, contact_id, status)
       SELECT $${paramIndex}, id, 'queued'
       FROM marketing_contacts ${whereClause}
       ON CONFLICT (campaign_id, contact_id) DO NOTHING`,
      [...params, id]
    );

    const queuedCount = insertResult.rowCount || 0;

    // Update campaign status and stats
    await query(
      `UPDATE marketing_campaigns
       SET status = 'sending', started_at = NOW(), total_recipients = $2, updated_at = NOW()
       WHERE id = $1`,
      [id, queuedCount]
    );

    revalidatePath("/dashboard/campaigns");
    revalidatePath(`/dashboard/campaigns/${id}`);

    return { success: true, campaign_id: id, total_queued: queuedCount };
  } catch (error) {
    console.error("Error starting campaign:", error);
    return { success: false, campaign_id: id, total_queued: 0, error: "Failed to start campaign" };
  }
}

/**
 * Pause a campaign
 */
export async function pauseCampaign(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await query(
      `UPDATE marketing_campaigns
       SET status = 'paused', updated_at = NOW()
       WHERE id = $1 AND status = 'sending'
       RETURNING id`,
      [id]
    );

    if (result.rowCount === 0) {
      return { success: false, error: "Campaign not found or cannot be paused" };
    }

    revalidatePath("/dashboard/campaigns");
    revalidatePath(`/dashboard/campaigns/${id}`);
    return { success: true };
  } catch (error) {
    console.error("Error pausing campaign:", error);
    return { success: false, error: "Failed to pause campaign" };
  }
}

/**
 * Resume a paused campaign
 */
export async function resumeCampaign(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await query(
      `UPDATE marketing_campaigns
       SET status = 'sending', updated_at = NOW()
       WHERE id = $1 AND status = 'paused'
       RETURNING id`,
      [id]
    );

    if (result.rowCount === 0) {
      return { success: false, error: "Campaign not found or cannot be resumed" };
    }

    revalidatePath("/dashboard/campaigns");
    revalidatePath(`/dashboard/campaigns/${id}`);
    return { success: true };
  } catch (error) {
    console.error("Error resuming campaign:", error);
    return { success: false, error: "Failed to resume campaign" };
  }
}

/**
 * Archive a campaign
 */
export async function archiveCampaign(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await query(
      `UPDATE marketing_campaigns
       SET status = 'archived', updated_at = NOW()
       WHERE id = $1 AND status IN ('completed', 'paused')
       RETURNING id`,
      [id]
    );

    if (result.rowCount === 0) {
      return { success: false, error: "Campaign not found or cannot be archived" };
    }

    revalidatePath("/dashboard/campaigns");
    return { success: true };
  } catch (error) {
    console.error("Error archiving campaign:", error);
    return { success: false, error: "Failed to archive campaign" };
  }
}

/**
 * Get campaign recipients/logs with pagination
 */
export async function getCampaignRecipients(
  campaignId: string,
  pagination: PaginationParams = {}
): Promise<PaginatedResult<CampaignLog & { email: string; first_name: string | null; last_name: string | null }>> {
  const { page = 1, limit = 10, sortBy = "created_at", sortOrder = "desc" } = pagination;

  try {
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM marketing_campaign_logs WHERE campaign_id = $1`,
      [campaignId]
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Whitelist allowed sort columns
    const allowedSortColumns = ["created_at", "sent_at", "status"];
    const safeSortBy = allowedSortColumns.includes(sortBy) ? `l.${sortBy}` : "l.created_at";
    const safeSortOrder = sortOrder === "asc" ? "ASC" : "DESC";

    // Get paginated data with contact info
    const dataResult = await query<CampaignLog & { email: string; first_name: string | null; last_name: string | null }>(
      `SELECT l.*, c.email, c.first_name, c.last_name
       FROM marketing_campaign_logs l
       JOIN marketing_contacts c ON l.contact_id = c.id
       WHERE l.campaign_id = $1
       ORDER BY ${safeSortBy} ${safeSortOrder}
       LIMIT $2 OFFSET $3`,
      [campaignId, limit, offset]
    );

    return {
      data: dataResult.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    console.error("Error fetching campaign recipients:", error);
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
 * Get campaign statistics
 */
export async function getCampaignStats(campaignId: string): Promise<CampaignStats | null> {
  try {
    const result = await query(
      `SELECT
        total_recipients,
        stats_sent as sent,
        stats_delivered as delivered,
        stats_opened as opened,
        stats_clicked as clicked,
        stats_bounced as bounced
       FROM marketing_campaigns
       WHERE id = $1`,
      [campaignId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const sent = row.sent || 0;

    return {
      total_recipients: row.total_recipients || 0,
      sent,
      delivered: row.delivered || 0,
      opened: row.opened || 0,
      clicked: row.clicked || 0,
      bounced: row.bounced || 0,
      open_rate: sent > 0 ? (row.opened / sent) * 100 : 0,
      click_rate: sent > 0 ? (row.clicked / sent) * 100 : 0,
      bounce_rate: sent > 0 ? (row.bounced / sent) * 100 : 0,
      delivery_rate: sent > 0 ? (row.delivered / sent) * 100 : 0,
    };
  } catch (error) {
    console.error("Error fetching campaign stats:", error);
    return null;
  }
}

/**
 * Update campaign statistics (called by webhook handler)
 */
export async function updateCampaignStats(
  campaignId: string,
  event: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced'
): Promise<{ success: boolean }> {
  try {
    const statColumn = `stats_${event}`;

    await query(
      `UPDATE marketing_campaigns
       SET ${statColumn} = ${statColumn} + 1, updated_at = NOW()
       WHERE id = $1`,
      [campaignId]
    );

    return { success: true };
  } catch (error) {
    console.error("Error updating campaign stats:", error);
    return { success: false };
  }
}

/**
 * Mark campaign as completed
 */
export async function completeCampaign(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await query(
      `UPDATE marketing_campaigns
       SET status = 'completed', finished_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND status = 'sending'
       RETURNING id`,
      [id]
    );

    if (result.rowCount === 0) {
      return { success: false, error: "Campaign not found or already completed" };
    }

    revalidatePath("/dashboard/campaigns");
    revalidatePath(`/dashboard/campaigns/${id}`);
    return { success: true };
  } catch (error) {
    console.error("Error completing campaign:", error);
    return { success: false, error: "Failed to complete campaign" };
  }
}

/**
 * Get all campaigns for dropdown/select
 */
export async function getCampaignOptions(): Promise<Array<{ id: string; name: string; status: CampaignStatus }>> {
  try {
    const result = await query<{ id: string; name: string; status: CampaignStatus }>(
      `SELECT id, name, status FROM marketing_campaigns ORDER BY created_at DESC`
    );
    return result.rows;
  } catch (error) {
    console.error("Error fetching campaign options:", error);
    return [];
  }
}

/**
 * Duplicate a campaign
 */
export async function duplicateCampaign(id: string): Promise<{ success: boolean; campaign?: Campaign; error?: string }> {
  try {
    const original = await getCampaignById(id);
    if (!original) {
      return { success: false, error: "Campaign not found" };
    }

    const result = await query(
      `INSERT INTO marketing_campaigns
        (name, objective, template_code, audience_filter)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        `${original.name} (Copy)`,
        original.objective,
        original.template_code,
        JSON.stringify(original.audience_filter),
      ]
    );

    revalidatePath("/dashboard/campaigns");
    return { success: true, campaign: result.rows[0] as Campaign };
  } catch (error) {
    console.error("Error duplicating campaign:", error);
    return { success: false, error: "Failed to duplicate campaign" };
  }
}
