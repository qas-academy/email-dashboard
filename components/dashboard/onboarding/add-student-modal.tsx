"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { createOnboardingStudent } from "@/actions/onboarding-actions";
import { formatVietnamDate } from "@/lib/date-format";
import type { CreateOnboardingInput } from "@/lib/types";

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const COURSE_OPTIONS = [
  { value: "", label: "-- Select --" },
  { value: "PSAT", label: "PSAT" },
  { value: "BSAT", label: "BSAT" },
  { value: "SSAT", label: "SSAT" },
  { value: "SAT 1-1", label: "SAT 1-1" },
];

function getTodayString(): string {
  return formatVietnamDate(new Date());
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

export function AddStudentModal({ isOpen, onClose, onSuccess }: AddStudentModalProps) {
  const t = useTranslations("onboarding");

  const [studentName, setStudentName] = useState("");
  const [diagnosticMathScore, setDiagnosticMathScore] = useState("");
  const [diagnosticVerbalScore, setDiagnosticVerbalScore] = useState("");
  const [diagnosticTotalScore, setDiagnosticTotalScore] = useState("");
  const [courseMathName, setCourseMathName] = useState("");
  const [mathCode, setMathCode] = useState("");
  const [courseVerbalName, setCourseVerbalName] = useState("");
  const [verbalCode, setVerbalCode] = useState("");
  const [outputCommitmentMath, setOutputCommitmentMath] = useState(true);
  const [outputCommitmentVerbal, setOutputCommitmentVerbal] = useState(true);
  const [signDate, setSignDate] = useState(getTodayString());
  const [studentEmail, setStudentEmail] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setStudentName("");
    setDiagnosticMathScore("");
    setDiagnosticVerbalScore("");
    setDiagnosticTotalScore("");
    setCourseMathName("");
    setMathCode("");
    setCourseVerbalName("");
    setVerbalCode("");
    setOutputCommitmentMath(true);
    setOutputCommitmentVerbal(true);
    setSignDate(getTodayString());
    setStudentEmail("");
    setParentName("");
    setParentEmail("");
    setPhone("");
    setFieldErrors({});
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validate = (): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!studentName.trim()) {
      errors.studentName = t("validation.nameRequired");
    } else if (studentName.trim().length < 2) {
      errors.studentName = t("validation.nameMinLength");
    } else if (/^\d+$/.test(studentName.trim())) {
      errors.studentName = t("validation.nameNotNumber");
    }

    if (!courseMathName) {
      errors.courseMathName = t("validation.mathCourseRequired");
    }
    if (!mathCode.trim()) {
      errors.mathCode = t("validation.mathCodeRequired");
    }
    if (!courseVerbalName) {
      errors.courseVerbalName = t("validation.verbalCourseRequired");
    }
    if (!verbalCode.trim()) {
      errors.verbalCode = t("validation.verbalCodeRequired");
    }

    if (!studentEmail.trim()) {
      errors.studentEmail = t("validation.emailRequired");
    } else if (!isValidEmail(studentEmail.trim())) {
      errors.studentEmail = t("validation.emailFormat");
    }

    if (!signDate.trim()) {
      errors.signDate = t("validation.signDateRequired");
    } else if (!isValidDateDDMMYYYY(signDate.trim())) {
      errors.signDate = t("validation.signDateFormat");
    }

    const validateScore = (
      rawValue: string,
      fieldName: string,
      requiredKey: string,
      rangeKey: string,
      min: number,
      max: number
    ) => {
      if (!rawValue.trim()) {
        errors[fieldName] = t(requiredKey);
        return;
      }

      const scoreNum = Number(rawValue);
      if (isNaN(scoreNum) || scoreNum < min || scoreNum > max) {
        errors[fieldName] = t(rangeKey, { min, max });
      } else if (!Number.isInteger(scoreNum)) {
        errors[fieldName] = t("validation.scoreInteger");
      }
    };

    validateScore(
      diagnosticMathScore,
      "diagnosticMathScore",
      "validation.mathScoreRequired",
      "validation.mathScoreRange",
      0,
      800
    );
    validateScore(
      diagnosticVerbalScore,
      "diagnosticVerbalScore",
      "validation.verbalScoreRequired",
      "validation.verbalScoreRange",
      0,
      800
    );
    validateScore(
      diagnosticTotalScore,
      "diagnosticTotalScore",
      "validation.totalScoreRequired",
      "validation.totalScoreRange",
      0,
      1600
    );

    if (parentName.trim() && parentName.trim().length < 2) {
      errors.parentName = t("validation.nameMinLength");
    } else if (parentName.trim() && /^\d+$/.test(parentName.trim())) {
      errors.parentName = t("validation.nameNotNumber");
    }
    if (parentEmail.trim() && !isValidEmail(parentEmail.trim())) {
      errors.parentEmail = t("validation.parentEmailFormat");
    }
    if (phone.trim() && !isValidVietnamesePhone(phone.trim())) {
      errors.phone = t("validation.phoneFormat");
    }

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      const input: CreateOnboardingInput = {
        student_name: studentName.trim(),
        diagnostic_math_score: Number(diagnosticMathScore),
        diagnostic_verbal_score: Number(diagnosticVerbalScore),
        diagnostic_total_score: Number(diagnosticTotalScore),
        course_math_name: courseMathName,
        math_code: mathCode.trim(),
        course_verbal_name: courseVerbalName,
        verbal_code: verbalCode.trim(),
        output_commitment_math: outputCommitmentMath,
        output_commitment_verbal: outputCommitmentVerbal,
        sign_date: signDate.trim(),
        representative_name: "QAS Academy",
        student_email: studentEmail.trim(),
        parent_name: parentName.trim() || null,
        parent_email: parentEmail.trim() || null,
        phone: phone.trim() || null,
      };

      const result = await createOnboardingStudent(input);
      if (result.success) {
        resetForm();
        onSuccess();
        onClose();
      } else {
        setError(result.error || t("createFailed"));
      }
    } catch {
      setError(t("createFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t("addStudent")} size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            {t("sectionPdf")}
          </h3>
          <div className="space-y-4">
            <Input
              label={t("studentName") + " *"}
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder={t("studentNamePlaceholder")}
              error={fieldErrors.studentName}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Input
                    label={t("diagnosticMathScore") + " *"}
                    type="number"
                    min={0}
                    max={800}
                    value={diagnosticMathScore}
                    onChange={(e) => setDiagnosticMathScore(e.target.value)}
                    placeholder="0"
                    error={fieldErrors.diagnosticMathScore}
                  />
                </div>
                <span className="pb-2 text-sm text-muted-foreground">/ 800</span>
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Input
                    label={t("diagnosticVerbalScore") + " *"}
                    type="number"
                    min={0}
                    max={800}
                    value={diagnosticVerbalScore}
                    onChange={(e) => setDiagnosticVerbalScore(e.target.value)}
                    placeholder="0"
                    error={fieldErrors.diagnosticVerbalScore}
                  />
                </div>
                <span className="pb-2 text-sm text-muted-foreground">/ 800</span>
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Input
                    label={t("diagnosticTotalScore") + " *"}
                    type="number"
                    min={0}
                    max={1600}
                    value={diagnosticTotalScore}
                    onChange={(e) => setDiagnosticTotalScore(e.target.value)}
                    placeholder="0"
                    error={fieldErrors.diagnosticTotalScore}
                  />
                </div>
                <span className="pb-2 text-sm text-muted-foreground">/ 1600</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_180px] gap-4 items-start">
              <Select
                label={t("mathCourse") + " *"}
                options={COURSE_OPTIONS}
                value={courseMathName}
                onChange={(e) => setCourseMathName(e.target.value)}
                error={fieldErrors.courseMathName}
              />
              <Input
                label={t("mathCode") + " *"}
                value={mathCode}
                onChange={(e) => setMathCode(e.target.value)}
                placeholder={t("mathCodePlaceholder")}
                error={fieldErrors.mathCode}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_180px] gap-4 items-start">
              <Select
                label={t("verbalCourse") + " *"}
                options={COURSE_OPTIONS}
                value={courseVerbalName}
                onChange={(e) => setCourseVerbalName(e.target.value)}
                error={fieldErrors.courseVerbalName}
              />
              <Input
                label={t("verbalCode") + " *"}
                value={verbalCode}
                onChange={(e) => setVerbalCode(e.target.value)}
                placeholder={t("verbalCodePlaceholder")}
                error={fieldErrors.verbalCode}
              />
            </div>

            <div className="flex items-center gap-3">
              <Checkbox
                checked={outputCommitmentMath}
                onCheckedChange={() => setOutputCommitmentMath(!outputCommitmentMath)}
              />
              <span className="text-sm font-medium text-foreground">
                {t("outputCommitmentMath")}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Checkbox
                checked={outputCommitmentVerbal}
                onCheckedChange={() => setOutputCommitmentVerbal(!outputCommitmentVerbal)}
              />
              <span className="text-sm font-medium text-foreground">
                {t("outputCommitmentVerbal")}
              </span>
            </div>

            <Input
              label={t("signDate") + " *"}
              value={signDate}
              onChange={(e) => setSignDate(e.target.value)}
              placeholder="DD/MM/YYYY"
              error={fieldErrors.signDate}
            />

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t("representativeName")}
              </label>
              <div className="px-3 py-2 text-sm rounded-md border border-input bg-muted text-muted-foreground">
                QAS Academy
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            {t("sectionEmail")}
          </h3>
          <div className="space-y-4">
            <Input
              label={t("studentEmail") + " *"}
              type="email"
              value={studentEmail}
              onChange={(e) => setStudentEmail(e.target.value)}
              placeholder={t("studentEmailPlaceholder")}
              error={fieldErrors.studentEmail}
            />
            <Input
              label={t("parentName")}
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
              placeholder={t("parentNamePlaceholder")}
              error={fieldErrors.parentName}
            />
            <Input
              label={t("parentEmail")}
              type="email"
              value={parentEmail}
              onChange={(e) => setParentEmail(e.target.value)}
              placeholder={t("parentEmailPlaceholder")}
              error={fieldErrors.parentEmail}
            />
            <Input
              label={t("phone")}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t("phonePlaceholder")}
              error={fieldErrors.phone}
            />
          </div>
        </div>

        {error && (
          <div className="text-sm text-destructive">{error}</div>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={handleClose}>
            {t("cancel")}
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? t("creating") : t("addStudentBtn")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
