import { Order } from "./orders";
import { BankDetail, DeliveryInfo } from "./checkout";
import { InvoiceStatus } from "@prisma/client";

export interface Invoice {
  id?: string
  invoiceNumber: string
  orderDate?: Date
  dueDate: Date
  customer: {
    name: string
    email: string
    phone: string
  }
  items: Array<{
    name: string
    quantity: number
    price: number
    total: number
  }>
  subtotal: number
  tax: number
  shipping: number
  discount: number
  total: number
  currency: string
  bankDetails?: BankDetail[]
  deliveryInfo?: DeliveryInfo
  paymentInstructions?: string[]
  status?: string
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
  order: Order;
}

// export interface Invoice {
//   id: string;
//   invoiceNumber: string;
//   orderId: string;
//   userId: string;
//   issueDate: Date;
//   dueDate: Date;
//   status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';

//   notes: string | null;

//   user: UserWithoutPassword;
// }

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateInvoiceData {
  orderId: string;
  dueDate: Date;
  notes?: string;
}

export interface UpdateInvoiceData {
  status?: Invoice['status'];
  dueDate?: Date;
  notes?: string;
}


export interface InvoiceDetailsDialogProps {
  invoice: Invoice | null
  isOpen: boolean
  onClose: () => void
  onStatusChange: (invoiceId: string, status: InvoiceStatus) => void
}
export interface InvoiceFilters {
  status?: Invoice['status'];
  dateFrom?: Date;
  dateTo?: Date;
  userId?: string;
}

export interface InvoiceTableProps {
  invoices: Invoice[];
  loading: boolean;
  onStatusChange: (invoiceId: string, status: Invoice['status']) => void;
  onView: (invoice: Invoice) => void;
  onEdit: (invoice: Invoice) => void;
  onDelete: (invoiceId: string) => void;
}

export interface InvoiceDetailsProps {
  invoice: Invoice;
  onStatusChange: (status: Invoice['status']) => void;
  onEdit: () => void;
}