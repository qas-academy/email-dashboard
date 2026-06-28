"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Loader2, X, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { importContacts } from "@/actions/contact-actions";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface CSVRecipient {
  email: string;
  name?: string;
  first_name?: string;
  last_name?: string;
}

interface CSVRecipientUploadProps {
  onRecipientsLoaded: (emails: string[], names: string[]) => void;
}

export function CSVRecipientUpload({ onRecipientsLoaded }: CSVRecipientUploadProps) {
  const t = useTranslations("emailSender");

  const [isExpanded, setIsExpanded] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<CSVRecipient[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveToContacts, setSaveToContacts] = useState(true);
  const [importResult, setImportResult] = useState<{ inserted: number; updated: number } | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const resetState = useCallback(() => {
    setFile(null);
    setParsedData([]);
    setError(null);
    setImportResult(null);
  }, []);

  const parseCSVFile = (file: File): Promise<CSVRecipient[]> => {
    return new Promise((resolve, reject) => {
      import("papaparse").then(({ default: Papa }) => {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const data = results.data as Record<string, string>[];
            const mappedData: CSVRecipient[] = data
              .map((row) => {
                const email = row["email"] || row["Email"] || row["EMAIL"] || "";
                const name = row["name"] || row["Name"] || row["NAME"] || "";
                const firstName = row["first_name"] || row["First Name"] || row["firstName"] || "";
                const lastName = row["last_name"] || row["Last Name"] || row["lastName"] || "";

                return {
                  email: email.trim().toLowerCase(),
                  name: name.trim(),
                  first_name: firstName.trim(),
                  last_name: lastName.trim(),
                };
              })
              .filter((row) => row.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email));

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
    setError(null);
    setImportResult(null);

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError(t("csvFileSizeExceeded"));
      return;
    }

    setFile(selectedFile);
    setIsProcessing(true);

    try {
      const data = await parseCSVFile(selectedFile);

      if (data.length === 0) {
        setError(t("csvNoValidEmails"));
        setFile(null);
        setIsProcessing(false);
        return;
      }

      // Deduplicate by email
      const emailMap = new Map<string, CSVRecipient>();
      data.forEach((row) => {
        if (!emailMap.has(row.email)) {
          emailMap.set(row.email, row);
        }
      });

      const uniqueData = Array.from(emailMap.values());
      setParsedData(uniqueData);
    } catch (err) {
      console.error("Parse error:", err);
      setError(t("csvParseError"));
      setFile(null);
    } finally {
      setIsProcessing(false);
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
        setError(t("csvOnly"));
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

  const handleUseRecipients = async () => {
    if (parsedData.length === 0) return;

    setIsProcessing(true);

    try {
      // Extract emails and names
      const emails = parsedData.map((r) => r.email);
      const names = parsedData.map((r) => {
        if (r.name) return r.name;
        if (r.first_name || r.last_name) {
          return `${r.first_name || ""} ${r.last_name || ""}`.trim();
        }
        return "";
      });

      // Save to contacts if checked
      if (saveToContacts) {
        const contactsData = parsedData.map((r) => ({
          email: r.email,
          first_name: r.first_name || r.name?.split(" ")[0] || undefined,
          last_name: r.last_name || r.name?.split(" ").slice(1).join(" ") || undefined,
        }));

        const result = await importContacts(
          contactsData,
          `email_sender_${new Date().toISOString().split("T")[0]}`
        );

        setImportResult({
          inserted: result.inserted,
          updated: result.updated,
        });
      }

      // Pass to parent component
      onRecipientsLoaded(emails, names);

      // Collapse after use
      setIsExpanded(false);
    } catch (err) {
      console.error("Error processing recipients:", err);
      setError(t("csvProcessError"));
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isExpanded) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setIsExpanded(true)}
        className="gap-2"
      >
        <Upload className="h-4 w-4" />
        {t("uploadCSV")}
      </Button>
    );
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{t("csvRecipients")}</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setIsExpanded(false);
            resetState();
          }}
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* File upload area */}
      {!file && (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragActive
              ? "border-primary bg-primary/5"
              : error
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
            id="csv-recipient-upload"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
            }}
          />
          <label
            htmlFor="csv-recipient-upload"
            className="cursor-pointer flex flex-col items-center gap-2"
          >
            {isProcessing ? (
              <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
            ) : (
              <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
            )}
            <div>
              <p className="text-sm font-medium">
                {isProcessing ? t("csvProcessing") : t("csvDropOrClick")}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("csvFormatHint")}
              </p>
            </div>
          </label>
        </div>
      )}

      {/* File preview */}
      {file && parsedData.length > 0 && (
        <div className="space-y-3">
          {/* File info */}
          <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{file.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {parsedData.length} {t("csvRecipientCount")}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetState}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Preview table */}
          <div className="border rounded-lg overflow-hidden max-h-40 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">{t("email")}</th>
                  <th className="px-3 py-2 text-left font-medium">{t("names")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {parsedData.slice(0, 10).map((row, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-1.5">{row.email}</td>
                    <td className="px-3 py-1.5">
                      {row.name || `${row.first_name || ""} ${row.last_name || ""}`.trim() || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {parsedData.length > 10 && (
              <div className="px-3 py-1.5 text-xs text-muted-foreground text-center bg-muted">
                ... {t("csvAndMore", { count: parsedData.length - 10 })}
              </div>
            )}
          </div>

          {/* Save to contacts checkbox */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="save-to-contacts"
              checked={saveToContacts}
              onCheckedChange={(checked) => setSaveToContacts(checked as boolean)}
            />
            <label htmlFor="save-to-contacts" className="text-sm text-muted-foreground cursor-pointer">
              {t("csvSaveToContacts")}
            </label>
          </div>

          {/* Import result */}
          {importResult && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              {t("csvImportResult", { inserted: importResult.inserted, updated: importResult.updated })}
            </div>
          )}

          {/* Use button */}
          <Button
            type="button"
            onClick={handleUseRecipients}
            disabled={isProcessing}
            className="w-full gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("csvProcessing")}
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                {t("csvUseRecipients", { count: parsedData.length })}
              </>
            )}
          </Button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-destructive text-sm">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
    </Card>
  );
}
