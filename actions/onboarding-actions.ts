"use server";

import { query } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { Resend } from "resend";
import { fillPdfTemplate } from "@/lib/pdf-fill";
import { removeDiacritics } from "@/lib/diacritics";
import { DEFAULT_ONBOARDING_FROM } from "@/lib/email-addresses";
import * as fs from "fs/promises";
import * as path from "path";
import type {
  StudentOnboarding,
  OnboardingFilters,
  OnboardingStats,
  CreateOnboardingInput,
  PaginationParams,
  PaginatedResult,
  SenderInfo,
} from "@/lib/types";

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

function isValidFromField(from: string): boolean {
  const emailOnlyRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const nameEmailRegex = /^.+\s*<[^\s@]+@[^\s@]+\.[^\s@]+>$/;
  return emailOnlyRegex.test(from) || nameEmailRegex.test(from);
}

function getOnboardingFromEmail(): string {
  const from = (process.env.ONBOARDING_FROM_EMAIL || DEFAULT_ONBOARDING_FROM).trim();

  if (!isValidFromField(from)) {
    throw new Error(
      "ONBOARDING_FROM_EMAIL must use 'Display Name <email@domain.com>' or 'email@domain.com' format"
    );
  }

  return from;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidVietnamesePhone(phone: string): boolean {
  return /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/.test(phone);
}

function isValidDateDDMMYYYY(dateStr: string): boolean {
  const match = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return false;
  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function buildCourseLabel(courseName: string | null, code: string | null): string {
  return [courseName?.trim(), code?.trim()].filter(Boolean).join(" ");
}

function formatCourseSummary(
  student: Pick<StudentOnboarding, "course_math_name" | "math_code" | "course_verbal_name" | "verbal_code">
): string {
  const mathCourse = buildCourseLabel(student.course_math_name, student.math_code);
  const verbalCourse = buildCourseLabel(student.course_verbal_name, student.verbal_code);

  if (mathCourse && verbalCourse && mathCourse === verbalCourse) {
    return mathCourse;
  }

  const parts: string[] = [];
  if (mathCourse) {
    parts.push(`${mathCourse} (Math)`);
  }
  if (verbalCourse) {
    parts.push(`${verbalCourse} (Verbal)`);
  }

  return parts.join(" và ");
}

function formatCourseSummaryForEmailHtml(
  student: Pick<StudentOnboarding, "course_math_name" | "math_code" | "course_verbal_name" | "verbal_code">
): string {
  const mathCourse = buildCourseLabel(student.course_math_name, student.math_code);
  const verbalCourse = buildCourseLabel(student.course_verbal_name, student.verbal_code);

  if (mathCourse && verbalCourse && mathCourse === verbalCourse) {
    return mathCourse;
  }

  const parts: string[] = [];
  if (mathCourse) {
    parts.push(`${mathCourse} (Math)`);
  }
  if (verbalCourse) {
    parts.push(`${verbalCourse} (Verbal)`);
  }

  return parts.join(" và<br />");
}

function validateRequiredInteger(
  value: number,
  fieldLabel: string,
  min: number,
  max: number
): string | null {
  if (!Number.isInteger(value)) {
    return `${fieldLabel} must be a whole number`;
  }
  if (value < min || value > max) {
    return `${fieldLabel} must be between ${min} and ${max}`;
  }
  return null;
}

function validateOnboardingInput(input: CreateOnboardingInput): string | null {
  if (!input.student_name.trim()) {
    return "Student name is required";
  }
  if (input.student_name.trim().length < 2) {
    return "Name must be at least 2 characters";
  }
  if (/^\d+$/.test(input.student_name.trim())) {
    return "Name must not be a number";
  }
  if (!input.course_math_name.trim()) {
    return "Math course is required";
  }
  if (!input.math_code.trim()) {
    return "Math code is required";
  }
  if (!input.course_verbal_name.trim()) {
    return "Verbal course is required";
  }
  if (!input.verbal_code.trim()) {
    return "Verbal code is required";
  }
  if (!input.student_email.trim() || !isValidEmail(input.student_email)) {
    return "Valid student email is required";
  }
  if (!input.sign_date.trim()) {
    return "Sign date is required";
  }
  if (!isValidDateDDMMYYYY(input.sign_date.trim())) {
    return "Sign date must be a valid date in DD/MM/YYYY format";
  }

  const mathError = validateRequiredInteger(input.diagnostic_math_score, "Math diagnostic score", 0, 800);
  if (mathError) return mathError;

  const verbalError = validateRequiredInteger(input.diagnostic_verbal_score, "Verbal diagnostic score", 0, 800);
  if (verbalError) return verbalError;

  const totalError = validateRequiredInteger(input.diagnostic_total_score, "Total diagnostic score", 0, 1600);
  if (totalError) return totalError;

  if (input.parent_email && !isValidEmail(input.parent_email)) {
    return "Invalid parent email format";
  }
  if (input.parent_name && input.parent_name.trim().length < 2) {
    return "Parent name must be at least 2 characters";
  }
  if (input.parent_name && /^\d+$/.test(input.parent_name.trim())) {
    return "Parent name must not be a number";
  }
  if (input.phone && !isValidVietnamesePhone(input.phone.trim())) {
    return "Phone must be a valid Vietnamese number";
  }

  return null;
}

async function loadFile(relativePath: string): Promise<Buffer> {
  const fullPath = path.join(process.cwd(), relativePath);
  return fs.readFile(fullPath);
}

function renderOnboardingEmailTemplate(template: string, student: StudentOnboarding): string {
  const courseSummary = formatCourseSummaryForEmailHtml(student);

  return template
    .replace(/\[Tên học viên\]/g, student.student_name)
    .replace(/\[Tổng hợp khóa học\]/g, courseSummary)
    .replace(/\[Tên khóa học – ví dụ: BSAT \/ SSAT\]/g, courseSummary);
}

export async function getOnboardingStudents(
  filters: OnboardingFilters,
  pagination: PaginationParams = {}
): Promise<PaginatedResult<StudentOnboarding>> {
  const { page = 1, limit = 10, sortBy = "created_at", sortOrder = "desc" } = pagination;

  try {
    const { search, status, sent_by } = filters;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: (string | number | boolean)[] = [];
    let paramIndex = 1;

    if (search && search.trim()) {
      conditions.push(
        `(student_name ILIKE $${paramIndex}
          OR student_email ILIKE $${paramIndex}
          OR course_math_name ILIKE $${paramIndex}
          OR course_verbal_name ILIKE $${paramIndex}
          OR math_code ILIKE $${paramIndex}
          OR verbal_code ILIKE $${paramIndex})`
      );
      params.push(`%${search.trim()}%`);
      paramIndex++;
    }

    if (status) {
      conditions.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (sent_by) {
      conditions.push(`sent_by = $${paramIndex}`);
      params.push(sent_by);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const allowedSortColumns = [
      "created_at", "updated_at", "student_name", "course_math_name",
      "student_email", "status", "sign_date", "sent_at",
    ];
    const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : "created_at";
    const safeSortOrder = sortOrder === "asc" ? "ASC" : "DESC";

    const [countResult, dataResult] = await Promise.all([
      query(
        `SELECT COUNT(*) FROM student_onboarding ${whereClause}`,
        params
      ),
      query(
        `SELECT * FROM student_onboarding ${whereClause}
         ORDER BY "${safeSortBy}" ${safeSortOrder}
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, limit, offset]
      ),
    ]);
    const total = parseInt(countResult.rows[0].count, 10);

    return {
      data: dataResult.rows as StudentOnboarding[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    console.error("Error fetching onboarding students:", error);
    return { data: [], total: 0, page, limit, totalPages: 0 };
  }
}

export async function getOnboardingStats(): Promise<OnboardingStats> {
  try {
    const result = await query(
      `SELECT status, COUNT(*)::int as count FROM student_onboarding GROUP BY status`
    );

    const stats: OnboardingStats = { total: 0, pending: 0, sent: 0, failed: 0 };
    for (const row of result.rows) {
      const count = row.count as number;
      stats.total += count;
      if (row.status === "pending") stats.pending = count;
      else if (row.status === "sent") stats.sent = count;
      else if (row.status === "failed") stats.failed = count;
    }
    return stats;
  } catch (error) {
    console.error("Error fetching onboarding stats:", error);
    return { total: 0, pending: 0, sent: 0, failed: 0 };
  }
}

export async function getDistinctSenders(): Promise<SenderInfo[]> {
  try {
    const result = await query<{ sent_by: string; email: string; full_name: string | null }>(
      `SELECT DISTINCT ON (so.sent_by)
         so.sent_by,
         COALESCE(au_by_email.email, au_by_name.email, so.sent_by) AS email,
         COALESCE(au_by_email.full_name, au_by_name.full_name)     AS full_name
       FROM student_onboarding so
       LEFT JOIN app_users au_by_email ON au_by_email.email     = so.sent_by
       LEFT JOIN app_users au_by_name  ON au_by_name.full_name  = so.sent_by
       WHERE so.sent_by IS NOT NULL
       ORDER BY so.sent_by, (au_by_email.email IS NOT NULL) DESC`
    );
    return result.rows.map((r) => ({ sentBy: r.sent_by, email: r.email, full_name: r.full_name }));
  } catch (error) {
    console.error("Error fetching distinct senders:", error);
    return [];
  }
}

export async function createOnboardingStudent(
  input: CreateOnboardingInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const validationError = validateOnboardingInput(input);
    if (validationError) {
      return { success: false, error: validationError };
    }

    await query(
      `INSERT INTO student_onboarding
        (student_name, diagnostic_math_score, diagnostic_verbal_score, diagnostic_total_score,
         course_math_name, math_code, course_verbal_name, verbal_code,
         output_commitment_math, output_commitment_verbal, sign_date,
         representative_name, student_email, parent_name, parent_email, phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        input.student_name.trim(),
        input.diagnostic_math_score,
        input.diagnostic_verbal_score,
        input.diagnostic_total_score,
        input.course_math_name.trim(),
        input.math_code.trim(),
        input.course_verbal_name.trim(),
        input.verbal_code.trim(),
        input.output_commitment_math,
        input.output_commitment_verbal,
        input.sign_date.trim(),
        input.representative_name?.trim() || null,
        input.student_email.trim().toLowerCase(),
        input.parent_name?.trim() || null,
        input.parent_email?.trim().toLowerCase() || null,
        input.phone?.trim() || null,
      ]
    );

    revalidatePath("/dashboard/onboarding");
    return { success: true };
  } catch (error) {
    console.error("Error creating onboarding student:", error);
    return { success: false, error: "Failed to create student" };
  }
}

export async function deleteOnboardingStudent(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const existing = await query<{ status: string }>(
      `SELECT status FROM student_onboarding WHERE id = $1`,
      [id]
    );

    if (existing.rows.length === 0) {
      return { success: false, error: "Student not found" };
    }

    if (existing.rows[0].status !== "pending") {
      return { success: false, error: "Cannot delete a student that has already been sent or failed" };
    }

    await query(`DELETE FROM student_onboarding WHERE id = $1`, [id]);

    revalidatePath("/dashboard/onboarding");
    return { success: true };
  } catch (error) {
    console.error("Error deleting onboarding student:", error);
    return { success: false, error: "Failed to delete student" };
  }
}

export async function updateOnboardingStudent(
  id: string,
  input: CreateOnboardingInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const existing = await query<{ status: string }>(
      `SELECT status FROM student_onboarding WHERE id = $1`,
      [id]
    );

    if (existing.rows.length === 0) {
      return { success: false, error: "Student not found" };
    }

    if (existing.rows[0].status !== "pending") {
      return { success: false, error: "Cannot edit a student that has already been sent" };
    }

    const validationError = validateOnboardingInput(input);
    if (validationError) {
      return { success: false, error: validationError };
    }

    await query(
      `UPDATE student_onboarding SET
        student_name = $2, diagnostic_math_score = $3, diagnostic_verbal_score = $4,
        diagnostic_total_score = $5, course_math_name = $6, math_code = $7,
        course_verbal_name = $8, verbal_code = $9, output_commitment_math = $10,
        output_commitment_verbal = $11, sign_date = $12, representative_name = $13,
        student_email = $14, parent_name = $15, parent_email = $16,
        phone = $17, updated_at = NOW()
       WHERE id = $1`,
      [
        id,
        input.student_name.trim(),
        input.diagnostic_math_score,
        input.diagnostic_verbal_score,
        input.diagnostic_total_score,
        input.course_math_name.trim(),
        input.math_code.trim(),
        input.course_verbal_name.trim(),
        input.verbal_code.trim(),
        input.output_commitment_math,
        input.output_commitment_verbal,
        input.sign_date.trim(),
        input.representative_name?.trim() || null,
        input.student_email.trim().toLowerCase(),
        input.parent_name?.trim() || null,
        input.parent_email?.trim().toLowerCase() || null,
        input.phone?.trim() || null,
      ]
    );

    revalidatePath("/dashboard/onboarding");
    return { success: true };
  } catch (error) {
    console.error("Error updating onboarding student:", error);
    return { success: false, error: "Failed to update student" };
  }
}

export async function generateOnboardingPdfs(
  studentId: string
): Promise<{ success: boolean; luuY?: string; baoLuu?: string; error?: string }> {
  try {
    const result = await query<StudentOnboarding>(
      `SELECT * FROM student_onboarding WHERE id = $1`,
      [studentId]
    );

    const student = result.rows[0];
    if (!student) {
      return { success: false, error: "Student not found" };
    }

    const [luuYTemplate, baoLuuTemplate, fontBytes] = await Promise.all([
      loadFile("templates/QAS_LuuY_HocVien.pdf"),
      loadFile("templates/QAS_QuyDinh_BaoLuu.pdf"),
      loadFile("fonts/NotoSerif-Regular.ttf"),
    ]);

    const luuYBytes = await fillPdfTemplate(
      new Uint8Array(luuYTemplate),
      {
        diagnostic_math_score:
          student.diagnostic_math_score !== null ? `${student.diagnostic_math_score}` : "",
        diagnostic_verbal_score:
          student.diagnostic_verbal_score !== null ? `${student.diagnostic_verbal_score}` : "",
        diagnostic_total_score:
          student.diagnostic_total_score !== null ? `${student.diagnostic_total_score}` : "",
        course_math_name: student.course_math_name || "",
        math_code: student.math_code || "",
        course_verbal_name: student.course_verbal_name || "",
        verbal_code: student.verbal_code || "",
        output_commitment_math_yes: student.output_commitment_math ? "X" : "",
        output_commitment_math_no: student.output_commitment_math ? "" : "X",
        output_commitment_verbal_yes: student.output_commitment_verbal ? "X" : "",
        output_commitment_verbal_no: student.output_commitment_verbal ? "" : "X",
        student_name: student.student_name,
        sign_date: student.sign_date,
        representative_name: student.representative_name || "",
        representative_sign_date: student.sign_date,
      },
      new Uint8Array(fontBytes)
    );

    const baoLuuBytes = await fillPdfTemplate(
      new Uint8Array(baoLuuTemplate),
      {
        agree_checkbox: "X",
        student_name: student.student_name,
        sign_date: student.sign_date,
      },
      new Uint8Array(fontBytes)
    );

    return {
      success: true,
      luuY: Buffer.from(luuYBytes).toString("base64"),
      baoLuu: Buffer.from(baoLuuBytes).toString("base64"),
    };
  } catch (error) {
    console.error("Error generating PDFs:", error);
    return { success: false, error: "Failed to generate PDFs" };
  }
}

export async function previewOnboardingEmail(
  studentId: string
): Promise<{ success: boolean; html?: string; error?: string }> {
  try {
    const result = await query<StudentOnboarding>(
      `SELECT * FROM student_onboarding WHERE id = $1`,
      [studentId]
    );

    const student = result.rows[0];
    if (!student) {
      return { success: false, error: "Student not found" };
    }

    const templateBuffer = await loadFile("templates/QAS_Email_Template.html");
    const html = renderOnboardingEmailTemplate(templateBuffer.toString("utf-8"), student);

    return { success: true, html };
  } catch (error) {
    console.error("Error previewing email:", error);
    return { success: false, error: "Failed to preview email" };
  }
}

export async function sendOnboardingEmail(
  studentId: string,
  senderEmail: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await query<StudentOnboarding>(
      `SELECT * FROM student_onboarding WHERE id = $1`,
      [studentId]
    );

    const student = result.rows[0];
    if (!student) {
      return { success: false, error: "Student not found" };
    }

    if (student.status === "sent") {
      return { success: false, error: "Email already sent for this student" };
    }

    const pdfResult = await generateOnboardingPdfs(studentId);
    if (!pdfResult.success || !pdfResult.luuY || !pdfResult.baoLuu) {
      return { success: false, error: pdfResult.error || "Failed to generate PDFs" };
    }

    const templateBuffer = await loadFile("templates/QAS_Email_Template.html");
    const html = renderOnboardingEmailTemplate(templateBuffer.toString("utf-8"), student);

    const safeName = removeDiacritics(student.student_name);
    const courseSummary = formatCourseSummary(student);
    const subject = `QAS Academy — Thông tin đăng ký khóa ${courseSummary}`;

    const cc: string[] = [];
    if (student.parent_email) {
      cc.push(student.parent_email);
    }

    const { data, error } = await getResendClient().emails.send({
      from: getOnboardingFromEmail(),
      to: student.student_email,
      cc: cc.length > 0 ? cc : undefined,
      subject,
      html,
      attachments: [
        {
          filename: `QAS_LuuY_HocVien_${safeName}.pdf`,
          content: pdfResult.luuY,
        },
        {
          filename: `QAS_QuyDinh_BaoLuu_${safeName}.pdf`,
          content: pdfResult.baoLuu,
        },
      ],
    });

    if (error) {
      await query(
        `UPDATE student_onboarding
         SET status = 'failed', error_message = $2, sent_by = $3, updated_at = NOW()
         WHERE id = $1`,
        [studentId, error.message, senderEmail]
      );
      revalidatePath("/dashboard/onboarding");
      return { success: false, error: error.message };
    }

    await query(
      `UPDATE student_onboarding
       SET status = 'sent', resend_message_id = $2, sent_by = $3, sent_at = NOW(), error_message = NULL, updated_at = NOW()
       WHERE id = $1`,
      [studentId, data?.id || null, senderEmail]
    );

    revalidatePath("/dashboard/onboarding");
    return { success: true };
  } catch (error) {
    console.error("Error sending onboarding email:", error);

    await query(
      `UPDATE student_onboarding
       SET status = 'failed', error_message = $2, sent_by = $3, updated_at = NOW()
       WHERE id = $1`,
      [studentId, error instanceof Error ? error.message : "Unknown error", senderEmail]
    ).catch(() => {});

    revalidatePath("/dashboard/onboarding");
    return { success: false, error: error instanceof Error ? error.message : "Failed to send email" };
  }
}

export async function sendBulkOnboardingEmails(
  studentIds: string[],
  senderEmail: string
): Promise<{ sent: number; failed: number; results: { id: string; success: boolean; error?: string }[] }> {
  const results: { id: string; success: boolean; error?: string }[] = [];
  let sent = 0;
  let failed = 0;

  for (const id of studentIds) {
    const result = await sendOnboardingEmail(id, senderEmail);
    results.push({ id, success: result.success, error: result.error });
    if (result.success) {
      sent++;
    } else {
      failed++;
    }
  }

  return { sent, failed, results };
}
