"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { apiClient } from "@/lib/api";
import { FileSpreadsheet, FileText, Download } from "lucide-react";

export default function ExportPage() {
  const { id: auditId } = useParams<{ id: string }>();
  const [loading, setLoading] = useState<string | null>(null);

  async function download(url: string, filename: string) {
    setLoading(url);
    try {
      const response = await apiClient.get(url, {
        responseType: "blob",
      });
      const blob = new Blob([response.data]);
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setLoading(null);
    }
  }

  const exports = [
    {
      id: "findings-csv",
      title: "Findings (CSV)",
      description: "Spreadsheet of all findings with severity, evidence, and recommended actions.",
      icon: <FileSpreadsheet className="h-6 w-6 text-green-600" />,
      action: () =>
        download(
          `/export/findings?auditId=${auditId}&format=csv`,
          `findings-${auditId}.csv`,
        ),
    },
    {
      id: "findings-pdf",
      title: "Findings Report (PDF)",
      description: "Formatted PDF report of all findings for sharing.",
      icon: <FileText className="h-6 w-6 text-red-600" />,
      action: () =>
        download(
          `/export/findings?auditId=${auditId}&format=pdf`,
          `findings-${auditId}.pdf`,
        ),
    },
    {
      id: "caps-csv",
      title: "CAPs (CSV)",
      description: "Spreadsheet of all corrective action plans with status and priority.",
      icon: <FileSpreadsheet className="h-6 w-6 text-green-600" />,
      action: () =>
        download(`/export/caps?auditId=${auditId}&format=csv`, `caps-${auditId}.csv`),
    },
    {
      id: "caps-pdf",
      title: "CAPs Report (PDF)",
      description: "Formatted PDF report of all corrective action plans.",
      icon: <FileText className="h-6 w-6 text-red-600" />,
      action: () =>
        download(`/export/caps?auditId=${auditId}&format=pdf`, `caps-${auditId}.pdf`),
    },
    {
      id: "executive-report",
      title: "Executive Summary (PDF)",
      description: "High-level risk and CAP overview for stakeholders.",
      icon: <FileText className="h-6 w-6 text-blue-600" />,
      action: () =>
        download(`/export/report?auditId=${auditId}`, `executive-summary-${auditId}.pdf`),
    },
  ];

  return (
    <div>
      <h2 className="mb-6 text-lg font-semibold">Export Center</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {exports.map((item) => (
          <div
            key={item.id}
            className="flex flex-col rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
          >
            <div className="mb-3 flex items-center gap-3">
              {item.icon}
              <h3 className="font-medium text-gray-900">{item.title}</h3>
            </div>
            <p className="mb-4 flex-1 text-sm text-gray-500">{item.description}</p>
            <button
              onClick={item.action}
              disabled={loading === item.id}
              className="flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              {loading === item.id ? "Downloading..." : "Download"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
