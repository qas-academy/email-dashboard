"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Upload, AlertCircle, CheckCircle, FileSpreadsheet, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CSVRegistration, CSVValidationError, CSVImportResult, EngagementPool } from "@/lib/types";
import { validateCSVData, importRegistrations } from "@/actions/registration-actions";

// Max file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type ImportStep = "upload" | "preview" | "result";

export function CSVImportModal({ isOpen, onClose, onSuccess }: CSVImportModalProps) {
  const t = useTranslations("registrations");
  const tCommon = useTranslations("common");

  const [step, setStep] = useState<ImportStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<CSVRegistration[]>([]);
  const [validationErrors, setValidationErrors] = useState<CSVValidationError[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<CSVImportResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setStep("upload");
    setFile(null);
    setParsedData([]);
    setValidationErrors([]);
    setIsValidating(false);
    setIsImporting(false);
    setImportResult(null);
    setFileError(null);
  }, []);

  const handleClose = () => {
    resetState();
    onClose();
  };

  const parseCSVFile = (file: File) => {
    return new Promise<CSVRegistration[]>((resolve, reject) => {
      import("papaparse").then(({ default: Papa }) => {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const data = results.data as Record<string, string>[];
            const mappedData: CSVRegistration[] = data.map((row) => ({
              first_name: row["first_name"] || row["First Name"] || "",
              last_name: row["last_name"] || row["Last Name"] || "",
              email: row["email"] || row["Email"] || "",
              phone: row["phone"] || row["Phone"] || undefined,
              course: row["course"] || row["Course"] || undefined,
              sat_score: row["sat_score"] || row["SAT Score"]
                ? Number(row["sat_score"] || row["SAT Score"])
                : undefined,
              birth_year: row["birth_year"] || row["Birth Year"]
                ? Number(row["birth_year"] || row["Birth Year"])
                : undefined,
              facebook_link: row["facebook_link"] || row["Facebook Link"] || undefined,
              discovery_source: row["discovery_source"] || row["Discovery Source"] || undefined,
              test_date: row["test_date"] || row["Test Date"] || undefined,
              target_score: row["target_score"] || row["Target Score"]
                ? Number(row["target_score"] || row["Target Score"])
                : undefined,
              sat_test_status: (row["sat_test_status"] || row["SAT Test Status"] || undefined) as CSVRegistration["sat_test_status"],
              priority_level: row["priority_level"] || row["Priority Level"]
                ? Number(row["priority_level"] || row["Priority Level"])
                : undefined,
              engagement_pool: (row["engagement_pool"] || row["Engagement Pool"] || undefined) as EngagementPool | undefined,
            }));
            resolve(mappedData);
          },
          error: (error) => {
            reject(error);
          },
        });
      }).catch(reject);
    });
  };

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFileError(null);

    // Validate file size
    if (selectedFile.size > MAX_FILE_SIZE) {
      setFileError(`File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
      return;
    }

    setFile(selectedFile);
    setIsValidating(true);

    try {
      const data = await parseCSVFile(selectedFile);
      setParsedData(data);

      // Validate the data
      const errors = await validateCSVData(data);
      setValidationErrors(errors);
      setStep("preview");
    } catch (error) {
      console.error("Parse error:", error);
      setFileError("Failed to parse CSV file. Please check the file format.");
    } finally {
      setIsValidating(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === "text/csv" || droppedFile.name.endsWith(".csv")) {
        handleFileSelect(droppedFile);
      } else {
        setFileError("Please upload a CSV file");
      }
    }
  }, [handleFileSelect]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleImport = async () => {
    setIsImporting(true);
    try {
      const result = await importRegistrations(parsedData);
      setImportResult(result);
      setStep("result");
      if (result.success > 0) {
        onSuccess();
      }
    } catch (error) {
      console.error("Import error:", error);
      setImportResult({
        success: 0,
        failed: parsedData.length,
        errors: [{ row: 0, field: "import", message: "Import failed" }],
      });
      setStep("result");
    } finally {
      setIsImporting(false);
    }
  };

  const renderUploadStep = () => (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? "border-primary bg-primary/5"
            : fileError
            ? "border-destructive"
            : "border-border hover:border-primary/50"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".csv"
          className="hidden"
          id="csv-upload"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file);
          }}
        />
        <label
          htmlFor="csv-upload"
          className="cursor-pointer flex flex-col items-center gap-3"
        >
          {isValidating ? (
            <Loader2 className="h-12 w-12 text-muted-foreground animate-spin" />
          ) : (
            <FileSpreadsheet className="h-12 w-12 text-muted-foreground" />
          )}
          <div>
            <p className="text-sm font-medium text-foreground">
              {isValidating ? "Processing..." : "Drop CSV file here or click to upload"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Supports .csv files (max 5MB)
            </p>
          </div>
        </label>
      </div>

      {fileError && (
        <div className="flex items-center gap-2 text-destructive text-sm">
          <AlertCircle className="h-4 w-4" />
          {fileError}
        </div>
      )}

      <Card className="p-4">
        <h4 className="text-sm font-medium mb-2">Expected CSV format:</h4>
        <code className="text-xs text-muted-foreground block bg-muted p-2 rounded">
          first_name, last_name, email, phone, course, sat_score, birth_year,
          facebook_link, discovery_source, test_date, target_score, sat_test_status,
          priority_level, engagement_pool
        </code>
        <p className="text-xs text-muted-foreground mt-2">
          * first_name, last_name, and email are required. Priority: 1-5. Pool: sales, consulting, experience, nurture, education, giveaway
        </p>
      </Card>
    </div>
  );

  const renderPreviewStep = () => (
    <div className="space-y-4">
      {/* File info */}
      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium">{file?.name}</span>
        </div>
        <span className="text-sm text-muted-foreground">
          {parsedData.length} rows
        </span>
      </div>

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <Card className="p-4 border-destructive">
          <div className="flex items-center gap-2 text-destructive mb-2">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">
              {validationErrors.length} validation errors
            </span>
          </div>
          <ul className="text-xs text-muted-foreground space-y-1 max-h-32 overflow-y-auto">
            {validationErrors.slice(0, 10).map((error, idx) => (
              <li key={idx}>
                Row {error.row}: {error.field} - {error.message}
              </li>
            ))}
            {validationErrors.length > 10 && (
              <li>... and {validationErrors.length - 10} more errors</li>
            )}
          </ul>
        </Card>
      )}

      {/* Preview table */}
      <div className="border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left font-medium">#</th>
              <th className="px-3 py-2 text-left font-medium">Name</th>
              <th className="px-3 py-2 text-left font-medium">Email</th>
              <th className="px-3 py-2 text-left font-medium">Phone</th>
              <th className="px-3 py-2 text-left font-medium">Priority</th>
              <th className="px-3 py-2 text-left font-medium">Pool</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {parsedData.slice(0, 20).map((row, idx) => {
              // Row number matches validation (idx + 2 because row 1 is header)
              const rowNum = idx + 2;
              const hasError = validationErrors.some((e) => e.row === rowNum);
              return (
                <tr
                  key={idx}
                  className={hasError ? "bg-destructive/10" : ""}
                >
                  <td className="px-3 py-2 text-muted-foreground">{rowNum}</td>
                  <td className="px-3 py-2">
                    {row.first_name} {row.last_name}
                  </td>
                  <td className="px-3 py-2">{row.email}</td>
                  <td className="px-3 py-2">{row.phone || "-"}</td>
                  <td className="px-3 py-2">{row.priority_level || "-"}</td>
                  <td className="px-3 py-2">{row.engagement_pool || "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {parsedData.length > 20 && (
          <div className="px-3 py-2 text-xs text-muted-foreground text-center bg-muted">
            ... and {parsedData.length - 20} more rows
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={resetState}>
          {tCommon("back")}
        </Button>
        <Button
          variant="primary"
          onClick={handleImport}
          disabled={isImporting || validationErrors.length > 0}
        >
          {isImporting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Importing...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Import {parsedData.length} rows
            </>
          )}
        </Button>
      </div>
    </div>
  );

  const renderResultStep = () => (
    <div className="space-y-4 text-center py-4">
      {importResult && importResult.success > 0 ? (
        <>
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
          <div>
            <h3 className="text-lg font-medium">Import Complete</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Successfully imported {importResult.success} records
              {importResult.failed > 0 && (
                <span className="text-destructive">
                  , {importResult.failed} failed
                </span>
              )}
            </p>
          </div>
        </>
      ) : (
        <>
          <AlertCircle className="h-16 w-16 text-destructive mx-auto" />
          <div>
            <h3 className="text-lg font-medium">Import Failed</h3>
            <p className="text-sm text-muted-foreground mt-1">
              No records were imported
            </p>
          </div>
        </>
      )}

      {importResult?.errors && importResult.errors.length > 0 && (
        <Card className="p-4 text-left">
          <h4 className="text-sm font-medium mb-2">Errors:</h4>
          <ul className="text-xs text-muted-foreground space-y-1 max-h-32 overflow-y-auto">
            {importResult.errors.map((error, idx) => (
              <li key={idx}>
                Row {error.row}: {error.message}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Button variant="primary" onClick={handleClose}>
        {tCommon("close")}
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t("importCSV")}
      size="lg"
    >
      {step === "upload" && renderUploadStep()}
      {step === "preview" && renderPreviewStep()}
      {step === "result" && renderResultStep()}
    </Modal>
  );
}
