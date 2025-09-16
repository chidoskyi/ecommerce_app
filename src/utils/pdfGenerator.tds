// utils/pdfGenerator.ts
import { jsPDF } from "jspdf";
import type { Order } from "@/types/orders";

export const downloadInvoicePDF = async (order: Order): Promise<void> => {
      console.log("🚀 Starting PDF download for invoice:", order.id);
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
      doc.text(`Invoice #: ${order.id}`, rightAlign, 25, { align: "right" });
      doc.text(`Date: ${formatDate(order.date)}`, rightAlign, 32, {
        align: "right",
      });
      doc.text(`Due Date: ${formatDate(order.dueDate)}`, rightAlign, 39, {
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
        ...(statusColors[order.status as keyof typeof statusColors] ??
          statusColors.draft),
      ] as [number, number, number];
      doc.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
      doc.roundedRect(rightAlign - 30, 42, 30, 8, 2, 2, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(order.status.toUpperCase(), rightAlign - 15, 47, {
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
      doc.text(order.customer.name, billToX, yPos + 8);
      doc.setFont("helvetica", "normal");
      doc.text(order.customer.email, billToX, yPos + 15);
      doc.text(`Customer ID: ${order.customer.id}`, billToX, yPos + 22);
      if (order.customer.address) {
        doc.text(order.customer.address, billToX, yPos + 29);
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
      order.items.forEach((item, index) => {
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
      doc.text(formatCurrency(order.amount), totalX + 20, yPos, {
        align: "right",
      });
  
      // Notes Section
      if (order.notes) {
        yPos += 20;
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        doc.text("Notes:", margin, yPos);
  
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const noteLines = doc.splitTextToSize(
            order.notes,
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
        `Payment Method: ${order.paymentMethod}`,
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
      const filename = `invoice-${order.id}.pdf`;
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