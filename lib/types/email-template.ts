export interface EmailTemplate {
  template_code: string;
  subject: string;
  html_content: string;
  description: string | null;
}

export type EmailTemplateSummary = Omit<EmailTemplate, "html_content">;

export interface EmailTemplateFormData {
  template_code: string;
  subject: string;
  html_content: string;
  description?: string;
}

export interface EmailTemplateCreateInput {
  template_code: string;
  subject: string;
  html_content: string;
  description?: string;
}

export interface EmailTemplateUpdateInput {
  subject: string;
  html_content: string;
  description?: string;
}
