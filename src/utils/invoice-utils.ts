import type { Invoice } from "@/types/invoice";
import { jsPDF } from "jspdf";
import JSZip from "jszip";

// Generate PDF using jsPDF
export const downloadInvoicePDF = async (invoice: Invoice): Promise<void> => {
  console.log("🚀 Starting PDF download for invoice:", invoice.id);
  
  try {
    // Check if we're in browser environment
    if (typeof window === "undefined") {
      console.error("❌ Not in browser environment");
      throw new Error("PDF generation only works in browser environment");
    }

    console.log("🌐 Browser environment confirmed");

    // Dynamic import of jsPDF
    // const { jsPDF } = await import("jspdf")
    console.log("📦 jsPDF loaded successfully");

    // Create new PDF document
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    console.log("📄 PDF document created");

    // Helper functions
    const formatDate = (dateString: string): string => {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(date);
    };

    // Replace all currency formatting in your PDF generator with:
    const formatCurrency = (amount: number): string => {
      // Handle zero case specially if needed
      if (amount === 0) return "₦0.00";

      const formatter = new Intl.NumberFormat("en-NG", {
        style: "decimal",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      return `₦${formatter.format(amount)}`;
    };

    // Set up colors
    const primaryColor = [37, 99, 235]; // Blue
    const textColor = [51, 51, 51]; // Dark gray
    const lightGray = [243, 244, 246];

    // Page dimensions
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;

    // Header Section
    doc.setFontSize(28);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont("helvetica", "bold");
    doc.text("INVOICE", margin, 30);

    // Invoice details (top right)
    doc.setFontSize(10);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFont("helvetica", "normal");
    const rightAlign = pageWidth - margin;
    doc.text(`Invoice #: ${invoice.id}`, rightAlign, 25, { align: "right" });
    doc.text(`Date: ${formatDate(invoice.date)}`, rightAlign, 32, {
      align: "right",
    });
    doc.text(`Due Date: ${formatDate(invoice.dueDate)}`, rightAlign, 39, {
      align: "right",
    });

    // Status badge
    const statusColors = {
      paid: [34, 197, 94],
      pending: [234, 179, 8],
      overdue: [239, 68, 68],
      draft: [107, 114, 128],
    } as const;
    const badgeColor = [
      ...(statusColors[invoice.status as keyof typeof statusColors] ??
        statusColors.draft),
    ] as [number, number, number];
    doc.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
    doc.roundedRect(rightAlign - 30, 42, 30, 8, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(invoice.status.toUpperCase(), rightAlign - 15, 47, {
      align: "center",
    });

    // Reset text color
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);

    // Company Information (From)
    let yPos = 60;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("From:", margin, yPos);

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Your Company Name", margin, yPos + 8);
    doc.setFont("helvetica", "normal");
    doc.text("123 Business Street", margin, yPos + 15);
    doc.text("City, State 12345", margin, yPos + 22);
    doc.text("Country", margin, yPos + 29);
    doc.text("VAT: XX123456789", margin, yPos + 36);

    // Customer Information (Bill To)
    const billToX = pageWidth / 2 + 10;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Bill To:", billToX, yPos);

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(invoice.customer.name, billToX, yPos + 8);
    doc.setFont("helvetica", "normal");
    doc.text(invoice.customer.email, billToX, yPos + 15);
    doc.text(`Customer ID: ${invoice.customer.id}`, billToX, yPos + 22);
    if (invoice.customer.address) {
      doc.text(invoice.customer.address, billToX, yPos + 29);
    }

    // Items Table
    yPos = 130;
    const tableStartY = yPos;
    const colWidths = [80, 30, 30, 30]; // Description, Quantity, Price, Total
    const colPositions = [
      margin,
      margin + colWidths[0],
      margin + colWidths[0] + colWidths[1],
      margin + colWidths[0] + colWidths[1] + colWidths[2],
    ];

    // Table header
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 10, "F");

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text("Description", colPositions[0] + 2, yPos);
    doc.text("Qty", colPositions[1] + 2, yPos);
    doc.text("Price", colPositions[2] + 2, yPos);
    doc.text("Total", colPositions[3] + 2, yPos);

    // Table rows
    yPos += 10;
    doc.setFont("helvetica", "normal");
    invoice.items.forEach((item, index) => {
      if (yPos > pageHeight - 50) {
        doc.addPage();
        yPos = 30;
      }

      // Alternate row background
      if (index % 2 === 1) {
        doc.setFillColor(248, 249, 250);
        doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 10, "F");
      }

      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text(item.description, colPositions[0] + 2, yPos);
      doc.text(item.quantity.toString(), colPositions[1] + 2, yPos);
      doc.text(formatCurrency(item.price), colPositions[2] + 2, yPos);
      doc.text(formatCurrency(item.total), colPositions[3] + 2, yPos);

      yPos += 10;
    });

    // Table border
    doc.setDrawColor(200, 200, 200);
    doc.rect(
      margin,
      tableStartY - 5,
      pageWidth - 2 * margin,
      yPos - tableStartY
    );

    // Vertical lines for table
    colPositions.slice(1).forEach((pos) => {
      doc.line(pos, tableStartY - 5, pos, yPos - 10);
    });

    // Total Section
    yPos += 10;
    const totalX = pageWidth - 60;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("Total:", totalX - 20, yPos);
    doc.text(formatCurrency(invoice.amount), totalX + 20, yPos, {
      align: "right",
    });

    // Notes Section
    if (invoice.notes) {
      yPos += 20;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text("Notes:", margin, yPos);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const noteLines = doc.splitTextToSize(
        invoice.notes,
        pageWidth - 2 * margin
      );
      doc.text(noteLines, margin, yPos + 8);
      yPos += noteLines.length * 5 + 8;
    }

    // Footer
    yPos = pageHeight - 40;
    doc.setDrawColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.line(margin, yPos, pageWidth - margin, yPos);

    yPos += 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(107, 114, 128);
    doc.text("Thank you for your business!", pageWidth / 2, yPos, {
      align: "center",
    });
    doc.text(
      `Payment Method: ${invoice.paymentMethod}`,
      pageWidth / 2,
      yPos + 7,
      { align: "center" }
    );
    doc.text(
      "Please make payments according to the terms specified above.",
      pageWidth / 2,
      yPos + 14,
      {
        align: "center",
      }
    );

    console.log("✅ PDF content generated successfully");

    // Save the PDF
    const filename = `invoice-${invoice.id}.pdf`;
    doc.save(filename);

    console.log(`✅ PDF saved as: ${filename}`);
  } catch (error) {
    console.error("❌ PDF generation failed:", error);
    if (error instanceof Error) {
      throw new Error(`PDF generation failed: ${error.message}`);
    } else {
      throw new Error("PDF generation failed: Unknown error");
    }
  }
};

// Print invoice using jsPDF
export const printInvoice = async (invoice: Invoice): Promise<void> => {
  console.log("🖨️ Starting print process for invoice:", invoice.id);

  try {
    // Generate PDF blob
    const pdfBlob = await generateInvoicePDFBlob(invoice);

    // Create object URL
    const pdfUrl = URL.createObjectURL(pdfBlob);

    // Open in new window for printing
    const printWindow = window.open(pdfUrl, "_blank");

    if (!printWindow) {
      console.error("❌ Unable to open print window");
      throw new Error(
        "Unable to open print window. Please allow popups and try again."
      );
    }

    console.log("🪟 Print window opened successfully");

    // Wait for PDF to load, then trigger print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        console.log("✅ Print dialog triggered");
      }, 1000);
    };

    // Clean up URL after some time
    setTimeout(() => {
      URL.revokeObjectURL(pdfUrl);
    }, 10000);
  } catch (error) {
    console.error("❌ Print process failed:", error);
    throw error;
  }
};

// Generate PDF as blob for bulk operations
export const generateInvoicePDFBlob = async (
  invoice: Invoice
): Promise<Blob> => {
  console.log("🔧 Generating PDF blob for invoice:", invoice.id);

  try {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    // Helper functions
    const formatDate = (dateString: string): string => {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(date);
    };

// In generateInvoicePDFBlob function, replace the USD formatter with:
const formatCurrency = (amount: number): string => {
    return `₦${amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;
  };

    // Set up colors
    const primaryColor = [37, 99, 235];
    const textColor = [51, 51, 51];
    const lightGray = [243, 244, 246];

    // Page dimensions
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;

    // Header Section
    doc.setFontSize(28);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont("helvetica", "bold");
    doc.text("INVOICE", margin, 30);

    // Invoice details (top right)
    doc.setFontSize(10);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFont("helvetica", "normal");
    const rightAlign = pageWidth - margin;
    doc.text(`Invoice #: ${invoice.id}`, rightAlign, 25, { align: "right" });
    doc.text(`Date: ${formatDate(invoice.date)}`, rightAlign, 32, {
      align: "right",
    });
    doc.text(`Due Date: ${formatDate(invoice.dueDate)}`, rightAlign, 39, {
      align: "right",
    });

    // Status badge
    const statusColors = {
      paid: [34, 197, 94],
      pending: [234, 179, 8],
      overdue: [239, 68, 68],
      draft: [107, 114, 128] as [number, number, number],
    };
    const badgeColor: [number, number, number] =
      (statusColors[invoice.status] as [number, number, number]) ||
      statusColors.draft;
    doc.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
    doc.roundedRect(rightAlign - 30, 42, 30, 8, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(invoice.status.toUpperCase(), rightAlign - 15, 47, {
      align: "center",
    });

    // Reset text color
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);

    // Company Information (From)
    let yPos = 60;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("From:", margin, yPos);

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Your Company Name", margin, yPos + 8);
    doc.setFont("helvetica", "normal");
    doc.text("123 Business Street", margin, yPos + 15);
    doc.text("City, State 12345", margin, yPos + 22);
    doc.text("Country", margin, yPos + 29);
    doc.text("VAT: XX123456789", margin, yPos + 36);

    // Customer Information (Bill To)
    const billToX = pageWidth / 2 + 10;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Bill To:", billToX, yPos);

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(invoice.customer.name, billToX, yPos + 8);
    doc.setFont("helvetica", "normal");
    doc.text(invoice.customer.email, billToX, yPos + 15);
    doc.text(`Customer ID: ${invoice.customer.id}`, billToX, yPos + 22);
    if (invoice.customer.address) {
      doc.text(invoice.customer.address, billToX, yPos + 29);
    }

    // Items Table
    yPos = 130;
    const tableStartY = yPos;
    const colWidths = [80, 30, 30, 30];
    const colPositions = [
      margin,
      margin + colWidths[0],
      margin + colWidths[0] + colWidths[1],
      margin + colWidths[0] + colWidths[1] + colWidths[2],
    ];

    // Table header
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 10, "F");

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text("Description", colPositions[0] + 2, yPos);
    doc.text("Qty", colPositions[1] + 2, yPos);
    doc.text("Price", colPositions[2] + 2, yPos);
    doc.text("Total", colPositions[3] + 2, yPos);

    // Table rows
    yPos += 10;
    doc.setFont("helvetica", "normal");
    invoice.items.forEach((item, index) => {
      if (yPos > pageHeight - 50) {
        doc.addPage();
        yPos = 30;
      }

      if (index % 2 === 1) {
        doc.setFillColor(248, 249, 250);
        doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 10, "F");
      }

      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text(item.description, colPositions[0] + 2, yPos);
      doc.text(item.quantity.toString(), colPositions[1] + 2, yPos);
      doc.text(formatCurrency(item.price), colPositions[2] + 2, yPos);
      doc.text(formatCurrency(item.total), colPositions[3] + 2, yPos);

      yPos += 10;
    });

    // Table border
    doc.setDrawColor(200, 200, 200);
    doc.rect(
      margin,
      tableStartY - 5,
      pageWidth - 2 * margin,
      yPos - tableStartY
    );

    // Vertical lines for table
    colPositions.slice(1).forEach((pos) => {
      doc.line(pos, tableStartY - 5, pos, yPos - 10);
    });

    // Total Section
    yPos += 10;
    const totalX = pageWidth - 60;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("Total:", totalX - 20, yPos);
    doc.text(formatCurrency(invoice.amount), totalX + 20, yPos, {
      align: "right",
    });

    // Notes Section
    if (invoice.notes) {
      yPos += 20;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text("Notes:", margin, yPos);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const noteLines = doc.splitTextToSize(
        invoice.notes,
        pageWidth - 2 * margin
      );
      doc.text(noteLines, margin, yPos + 8);
      yPos += noteLines.length * 5 + 8;
    }

    // Footer
    yPos = pageHeight - 40;
    doc.setDrawColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.line(margin, yPos, pageWidth - margin, yPos);

    yPos += 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(107, 114, 128);
    doc.text("Thank you for your business!", pageWidth / 2, yPos, {
      align: "center",
    });
    doc.text(
      `Payment Method: ${invoice.paymentMethod}`,
      pageWidth / 2,
      yPos + 7,
      { align: "center" }
    );
    doc.text(
      "Please make payments according to the terms specified above.",
      pageWidth / 2,
      yPos + 14,
      {
        align: "center",
      }
    );

    // Return as blob
    const pdfBlob = doc.output("blob");
    console.log("✅ PDF blob generated successfully");
    return pdfBlob;
  } catch (error) {
    console.error("❌ PDF blob generation failed:", error);
    throw error;
  }
};



// Bulk download using JSZip
export const downloadBulkInvoices = async (
  invoices: Invoice[]
): Promise<void> => {
  console.log("📦 Starting bulk download for", invoices.length, "invoices");

  try {
    // Dynamic import of JSZip
    console.log("📦 JSZip loaded successfully");

    const zip = new JSZip();
    const folder = zip.folder("invoices");

    if (!folder) {
      throw new Error("Failed to create ZIP folder");
    }

    console.log("📁 ZIP folder created");

    // Generate PDFs and add to ZIP
    for (let i = 0; i < invoices.length; i++) {
      const invoice = invoices[i];
      console.log(
        `📄 Processing invoice ${i + 1}/${invoices.length}:`,
        invoice.id
      );

      try {
        const pdfBlob = await generateInvoicePDFBlob(invoice);
        folder.file(`invoice-${invoice.id}.pdf`, pdfBlob);
        console.log(`✅ Added ${invoice.id} to ZIP`);
      } catch (error) {
        console.error(`❌ Failed to generate PDF for ${invoice.id}:`, error);
      }
    }

    console.log("🗜️ Generating ZIP file...");
    const zipBlob = await zip.generateAsync({ type: "blob" });

    // Download ZIP file
    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `invoices-${new Date().toISOString().split("T")[0]}.zip`;
    link.style.display = "none";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up
    URL.revokeObjectURL(url);

    console.log("✅ Bulk download completed successfully");
  } catch (error) {
    console.error("❌ Bulk download failed:", error);
    throw error;
  }
};

// Debug function to test PDF generation
export const debugInvoiceHTML = (invoice: Invoice): void => {
  console.log("🐛 Debug: Testing PDF generation...");
  downloadInvoicePDF(invoice)
    .then(() => {
      console.log("✅ Debug: PDF generation successful");
    })
    .catch((error) => {
      console.error("❌ Debug: PDF generation failed:", error);
    });
};

// Environment diagnostics
export const runDiagnostics = async (): Promise<void> => {
  console.log("🔍 Running environment diagnostics...");

  console.log("Browser:", typeof window !== "undefined");
  console.log("User Agent:", navigator?.userAgent || "N/A");
  console.log("Window object:", typeof window);
  console.log("Document object:", typeof document);

  try {
    console.log("✅ jsPDF loaded successfully:", typeof jsPDF);
  } catch (error) {
    console.log("❌ jsPDF load failed:", error);
  }

  try {
    console.log("✅ JSZip loaded successfully:", typeof JSZip);
  } catch (error) {
    console.log("❌ JSZip load failed:", error);
  }

  console.log("✅ Diagnostics completed");
};

// Utility function to check if we're in a browser environment
export const isBrowser = (): boolean => {
  const result = typeof window !== "undefined";
  console.log("🌐 Browser check:", result);
  return result;
};
