"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Upload, AlertCircle, CheckCircle, FileSpreadsheet, Loader2, Info } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CSVContact, CSVContactValidationError, ContactImportResult } from "@/lib/types";
import { getVietnamDateKey } from "@/lib/date-format";
import { validateContactCSV, importContacts, checkDuplicates } from "@/actions/contact-actions";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type ImportStep = "upload" | "preview" | "duplicates" | "result";

interface DuplicateInfo {
  existing: Array<{ email: string; id: string; templates_received: string[] }>;
  new: string[];
}

export function CSVImportModal({ isOpen, onClose, onSuccess }: CSVImportModalProps) {
  const t = useTranslations("contacts");
  const tCommon = useTranslations("common");

  const [step, setStep] = useState<ImportStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<CSVContact[]>([]);
  const [validationErrors, setValidationErrors] = useState<CSVContactValidationError[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ContactImportResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [sourceName, setSourceName] = useState("");
  const [duplicateInfo, setDuplicateInfo] = useState<DuplicateInfo | null>(null);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);

  const resetState = useCallback(() => {
    setStep("upload");
    setFile(null);
    setParsedData([]);
    setValidationErrors([]);
    setIsValidating(false);
    setIsImporting(false);
    setImportResult(null);
    setFileError(null);
    setSourceName("");
    setDuplicateInfo(null);
    setIsCheckingDuplicates(false);
  }, []);

  const handleClose = () => {
    resetState();
    onClose();
  };

  const parseCSVFile = (file: File) => {
    return new Promise<CSVContact[]>((resolve, reject) => {
      import("papaparse").then(({ default: Papa }) => {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const data = results.data as Record<string, string>[];
            const mappedData: CSVContact[] = data.map((row) => ({
              email: row["email"] || row["Email"] || "",
              first_name: row["first_name"] || row["First Name"] || undefined,
              last_name: row["last_name"] || row["Last Name"] || undefined,
              tags: row["tags"] || row["Tags"] || undefined,
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

    if (selectedFile.size > MAX_FILE_SIZE) {
      setFileError(t("fileSizeExceeded"));
      return;
    }

    setFile(selectedFile);
    setIsValidating(true);

    try {
      const data = await parseCSVFile(selectedFile);
      setParsedData(data);

      const result = await validateContactCSV(data);
      setValidationErrors(result.errors);
      setStep("preview");
    } catch (error) {
      console.error("Parse error:", error);
      setFileError(t("parseError"));
    } finally {
      setIsValidating(false);
    }
  }, [t]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === "text/csv" || droppedFile.name.endsWith(".csv")) {
        handleFileSelect(droppedFile);
      } else {
        setFileError(t("csvOnly"));
      }
    }
  }, [handleFileSelect, t]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleCheckDuplicates = async () => {
    setIsCheckingDuplicates(true);
    try {
      const emails = parsedData.map(row => row.email).filter(Boolean);
      const result = await checkDuplicates(emails);
      setDuplicateInfo(result);
      setStep("duplicates");
    } catch (error) {
      console.error("Error checking duplicates:", error);
    } finally {
      setIsCheckingDuplicates(false);
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    try {
      const source = sourceName.trim() || `csv_import_${getVietnamDateKey()}`;
      const result = await importContacts(parsedData, source);
      setImportResult(result);
      setStep("result");
      if (result.inserted > 0 || result.updated > 0) {
        onSuccess();
      }
    } catch (error) {
      console.error("Import error:", error);
      setImportResult({
        success: false,
        total: parsedData.length,
        inserted: 0,
        updated: 0,
        failed: parsedData.length,
        errors: [{ row: 0, field: "import", message: t("importFailed") }],
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
              {isValidating ? t("processing") : t("dropOrClick")}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("supportedFormats")}
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
        <h4 className="text-sm font-medium mb-2">{t("expectedFormat")}:</h4>
        <code className="text-xs text-muted-foreground block bg-muted p-2 rounded">
          email, first_name, last_name, tags
        </code>
        <p className="text-xs text-muted-foreground mt-2">
          {t("formatDescription")}
        </p>
      </Card>
    </div>
  );

  const renderPreviewStep = () => (
    <div className="space-y-4">
      {/* Source name input */}
      <div>
        <label className="text-sm font-medium mb-1 block">{t("sourceName")}</label>
        <Input
          placeholder={t("sourceNamePlaceholder")}
          value={sourceName}
          onChange={(e) => setSourceName(e.target.value)}
        />
        <p className="text-xs text-muted-foreground mt-1">{t("sourceNameHelp")}</p>
      </div>

      {/* File info */}
      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium">{file?.name}</span>
        </div>
        <span className="text-sm text-muted-foreground">
          {parsedData.length} {t("rows")}
        </span>
      </div>

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <Card className="p-4 border-destructive">
          <div className="flex items-center gap-2 text-destructive mb-2">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">
              {validationErrors.length} {t("validationErrors")}
            </span>
          </div>
          <ul className="text-xs text-muted-foreground space-y-1 max-h-32 overflow-y-auto">
            {validationErrors.slice(0, 10).map((error, idx) => (
              <li key={idx}>
                {t("row")} {error.row}: {error.field} - {error.message}
              </li>
            ))}
            {validationErrors.length > 10 && (
              <li>... {t("andMoreErrors", { count: validationErrors.length - 10 })}</li>
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
              <th className="px-3 py-2 text-left font-medium">{t("email")}</th>
              <th className="px-3 py-2 text-left font-medium">{t("name")}</th>
              <th className="px-3 py-2 text-left font-medium">{t("tags")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {parsedData.slice(0, 20).map((row, idx) => {
              const rowNum = idx + 2;
              const hasError = validationErrors.some((e) => e.row === rowNum);
              return (
                <tr key={idx} className={hasError ? "bg-destructive/10" : ""}>
                  <td className="px-3 py-2 text-muted-foreground">{rowNum}</td>
                  <td className="px-3 py-2">{row.email}</td>
                  <td className="px-3 py-2">
                    {row.first_name} {row.last_name}
                  </td>
                  <td className="px-3 py-2">{row.tags || "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {parsedData.length > 20 && (
          <div className="px-3 py-2 text-xs text-muted-foreground text-center bg-muted">
            ... {t("andMoreRows", { count: parsedData.length - 20 })}
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
          onClick={handleCheckDuplicates}
          disabled={isCheckingDuplicates || validationErrors.length > 0}
        >
          {isCheckingDuplicates ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t("checkingDuplicates")}
            </>
          ) : (
            t("checkDuplicates")
          )}
        </Button>
      </div>
    </div>
  );

  const renderDuplicatesStep = () => (
    <div className="space-y-4">
      {duplicateInfo && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="font-medium">{t("newContacts")}</span>
              </div>
              <p className="text-2xl font-bold">{duplicateInfo.new.length}</p>
              <p className="text-xs text-muted-foreground">{t("willBeAdded")}</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Info className="h-5 w-5 text-blue-500" />
                <span className="font-medium">{t("existingContacts")}</span>
              </div>
              <p className="text-2xl font-bold">{duplicateInfo.existing.length}</p>
              <p className="text-xs text-muted-foreground">{t("willBeUpdated")}</p>
            </Card>
          </div>

          {/* Existing contacts list */}
          {duplicateInfo.existing.length > 0 && (
            <Card className="p-4">
              <h4 className="text-sm font-medium mb-2">{t("existingContactsList")}:</h4>
              <div className="max-h-32 overflow-y-auto">
                <ul className="text-xs text-muted-foreground space-y-1">
                  {duplicateInfo.existing.slice(0, 10).map((contact) => (
                    <li key={contact.id}>
                      {contact.email}
                      {contact.templates_received.length > 0 && (
                        <span className="ml-2 text-blue-500">
                          ({contact.templates_received.length} {t("templatesReceived")})
                        </span>
                      )}
                    </li>
                  ))}
                  {duplicateInfo.existing.length > 10 && (
                    <li>... {t("andMore", { count: duplicateInfo.existing.length - 10 })}</li>
                  )}
                </ul>
              </div>
            </Card>
          )}

          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <Info className="h-4 w-4 inline mr-2" />
              {t("duplicateExplanation")}
            </p>
          </div>
        </>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => setStep("preview")}>
          {tCommon("back")}
        </Button>
        <Button variant="primary" onClick={handleImport} disabled={isImporting}>
          {isImporting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t("importing")}
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              {t("importRows", { count: parsedData.length })}
            </>
          )}
        </Button>
      </div>
    </div>
  );

  const renderResultStep = () => (
    <div className="space-y-4 text-center py-4">
      {importResult && (importResult.inserted > 0 || importResult.updated > 0) ? (
        <>
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
          <div>
            <h3 className="text-lg font-medium">{t("importComplete")}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {t("importedCount", { inserted: importResult.inserted, updated: importResult.updated })}
              {importResult.failed > 0 && (
                <span className="text-destructive">
                  , {importResult.failed} {t("failed")}
                </span>
              )}
            </p>
          </div>
        </>
      ) : (
        <>
          <AlertCircle className="h-16 w-16 text-destructive mx-auto" />
          <div>
            <h3 className="text-lg font-medium">{t("importFailed")}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {t("noRecordsImported")}
            </p>
          </div>
        </>
      )}

      {importResult?.errors && importResult.errors.length > 0 && (
        <Card className="p-4 text-left">
          <h4 className="text-sm font-medium mb-2">{t("errors")}:</h4>
          <ul className="text-xs text-muted-foreground space-y-1 max-h-32 overflow-y-auto">
            {importResult.errors.map((error, idx) => (
              <li key={idx}>
                {t("row")} {error.row}: {error.message}
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
    <Modal isOpen={isOpen} onClose={handleClose} title={t("importCSV")} size="lg">
      {step === "upload" && renderUploadStep()}
      {step === "preview" && renderPreviewStep()}
      {step === "duplicates" && renderDuplicatesStep()}
      {step === "result" && renderResultStep()}
    </Modal>
  );
}
