import React from 'react';
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? '';

// Create a client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (was cacheTime)
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

// API functions
const api = {
  // Documents
  async getDocuments() {
    const res = await fetch(`${BACKEND_URL}/api/documents`);
    if (!res.ok) throw new Error('Failed to fetch documents');
    return res.json();
  },

  async getDocument(id: string) {
    const res = await fetch(`${BACKEND_URL}/api/documents/${id}`);
    if (!res.ok) throw new Error('Failed to fetch document');
    return res.json();
  },

  async deleteDocument(id: string) {
    const res = await fetch(`${BACKEND_URL}/api/documents/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete document');
    return res.json();
  },

  async updateDocument(id: string, data: any) {
    const res = await fetch(`${BACKEND_URL}/api/documents/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update document');
    return res.json();
  },

  // Stats
  async getStats() {
    const res = await fetch(`${BACKEND_URL}/api/stats`);
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
  },

  // Signatures
  async getSignatures() {
    const res = await fetch(`${BACKEND_URL}/api/signatures`);
    if (!res.ok) throw new Error('Failed to fetch signatures');
    return res.json();
  },
};

// Custom hooks
export function useDocuments() {
  return useQuery({
    queryKey: ['documents'],
    queryFn: api.getDocuments,
  });
}

export function useDocument(id: string) {
  return useQuery({
    queryKey: ['document', id],
    queryFn: () => api.getDocument(id),
    enabled: !!id,
  });
}

export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: api.getStats,
  });
}

export function useSignatures() {
  return useQuery({
    queryKey: ['signatures'],
    queryFn: api.getSignatures,
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deleteDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useUpdateDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.updateDocument(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['document', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

// Prefetch functions
export function prefetchDocuments() {
  return queryClient.prefetchQuery({
    queryKey: ['documents'],
    queryFn: api.getDocuments,
  });
}

export function prefetchDocument(id: string) {
  return queryClient.prefetchQuery({
    queryKey: ['document', id],
    queryFn: () => api.getDocument(id),
  });
}

// Provider component
export function QueryProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

export default QueryProvider;
