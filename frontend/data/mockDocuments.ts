export type DocumentType = 'PDF' | 'JPG' | 'PNG' | 'DOCX' | 'XLSX';

export interface Document {
  id: string;
  name: string;
  type: DocumentType;
  date: string;
  size: string;
  pages?: number;
  color: string;
  icon: string;
}

export const mockDocuments: Document[] = [
  { id: '1', name: 'Invoice Q1 2025', type: 'PDF', date: '2 hours ago', size: '1.2 MB', pages: 3, color: '#EF4444', icon: 'document-text-outline' },
  { id: '2', name: 'ID Card Front', type: 'JPG', date: 'Yesterday', size: '342 KB', color: '#F59E0B', icon: 'image-outline' },
  { id: '3', name: 'Meeting Notes', type: 'DOCX', date: 'Jan 15, 2025', size: '86 KB', pages: 5, color: '#2563EB', icon: 'document-outline' },
  { id: '4', name: 'Budget Report', type: 'XLSX', date: 'Jan 14, 2025', size: '215 KB', pages: 2, color: '#10B981', icon: 'grid-outline' },
  { id: '5', name: 'Passport Scan', type: 'PNG', date: 'Jan 12, 2025', size: '1.8 MB', color: '#8B5CF6', icon: 'image-outline' },
  { id: '6', name: 'Contract Draft', type: 'PDF', date: 'Jan 10, 2025', size: '3.1 MB', pages: 12, color: '#EF4444', icon: 'document-text-outline' },
  { id: '7', name: 'Receipt Amazon', type: 'JPG', date: 'Jan 8, 2025', size: '190 KB', color: '#F59E0B', icon: 'image-outline' },
  { id: '8', name: 'Project Proposal', type: 'DOCX', date: 'Jan 5, 2025', size: '512 KB', pages: 8, color: '#2563EB', icon: 'document-outline' },
  { id: '9', name: 'Tax Form 2024', type: 'PDF', date: 'Dec 28, 2024', size: '2.4 MB', pages: 6, color: '#EF4444', icon: 'document-text-outline' },
  { id: '10', name: 'Business Card', type: 'PNG', date: 'Dec 20, 2024', size: '256 KB', color: '#8B5CF6', icon: 'image-outline' },
  { id: '11', name: 'Expense Sheet', type: 'XLSX', date: 'Dec 18, 2024', size: '98 KB', pages: 1, color: '#10B981', icon: 'grid-outline' },
  { id: '12', name: 'Rental Agreement', type: 'PDF', date: 'Dec 10, 2024', size: '4.7 MB', pages: 18, color: '#EF4444', icon: 'document-text-outline' },
];
