/**
 * E2E Test Suite: Document CRUD Operations
 * Tests full document lifecycle through the API: create, read, update, delete.
 * Also tests advanced features like export, search, and sorting.
 */
import { test, expect } from '@playwright/test';

const API_BASE = (process.env.PLAYWRIGHT_BASE_URL || 'https://document-scanner-pro-7.preview.emergentagent.com') + '/api';

let testDocId: string;

test.describe('Document CRUD Operations', () => {
  test('should create a new document', async ({ request }) => {
    const res = await request.post(`${API_BASE}/documents`, {
      data: {
        title: 'E2E Test Document',
        document_type: 'document',
        raw_text: 'This is an E2E test document created by Playwright.',
        pages: [{
          page_number: 1,
          raw_text: 'This is an E2E test document created by Playwright.',
          confidence: 0.95,
          image: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
          thumbnail: 'data:image/jpeg;base64,/9j/4AAQSkZJRg=='
        }],
        tags: ['test', 'e2e']
      }
    });
    expect(res.ok()).toBeTruthy();
    
    const data = await res.json();
    expect(data).toHaveProperty('id');
    expect(data.title).toBe('E2E Test Document');
    testDocId = data.id;
  });

  test('should retrieve the created document', async ({ request }) => {
    // Skip if creation failed
    test.skip(!testDocId, 'Document creation failed');
    
    const res = await request.get(`${API_BASE}/documents/${testDocId}`);
    expect(res.ok()).toBeTruthy();
    
    const data = await res.json();
    expect(data.id).toBe(testDocId);
    expect(data.title).toBe('E2E Test Document');
    expect(data.document_type).toBe('document');
  });

  test('should list documents including the new one', async ({ request }) => {
    const res = await request.get(`${API_BASE}/documents?page=1&page_size=50`);
    expect(res.ok()).toBeTruthy();
    
    const data = await res.json();
    expect(data.documents.length).toBeGreaterThan(0);
    expect(data.total).toBeGreaterThan(0);
    
    // Verify our test doc is in the list
    if (testDocId) {
      const found = data.documents.some((d: { id: string }) => d.id === testDocId);
      expect(found).toBeTruthy();
    }
  });

  test('should update (rename) the document', async ({ request }) => {
    test.skip(!testDocId, 'Document creation failed');
    
    const res = await request.put(`${API_BASE}/documents/${testDocId}`, {
      data: {
        title: 'E2E Test Document (Updated)',
        tags: ['test', 'e2e', 'updated']
      }
    });
    expect(res.ok()).toBeTruthy();
    
    // Verify the update
    const getRes = await request.get(`${API_BASE}/documents/${testDocId}`);
    const data = await getRes.json();
    expect(data.title).toBe('E2E Test Document (Updated)');
    expect(data.tags).toContain('updated');
  });

  test('should export document to PDF', async ({ request }) => {
    test.skip(!testDocId, 'Document creation failed');
    
    const res = await request.post(`${API_BASE}/documents/${testDocId}/export`, {
      data: { format: 'pdf' }
    });
    expect(res.ok()).toBeTruthy();
    
    const data = await res.json();
    expect(data).toHaveProperty('base64');
    expect(data).toHaveProperty('mime_type');
    expect(data.mime_type).toContain('pdf');
  });

  test('should export document to TXT', async ({ request }) => {
    test.skip(!testDocId, 'Document creation failed');
    
    const res = await request.post(`${API_BASE}/documents/${testDocId}/export`, {
      data: { format: 'txt' }
    });
    expect(res.ok()).toBeTruthy();
    
    const data = await res.json();
    // TXT export might use 'data' or 'base64'
    expect(data).toHaveProperty('mime_type');
  });

  test('should export document to Markdown', async ({ request }) => {
    test.skip(!testDocId, 'Document creation failed');
    
    const res = await request.post(`${API_BASE}/documents/${testDocId}/export`, {
      data: { format: 'md' }
    });
    expect(res.ok()).toBeTruthy();
    
    const data = await res.json();
    expect(data).toHaveProperty('mime_type');
  });

  test('should handle export with invalid format gracefully', async ({ request }) => {
    test.skip(!testDocId, 'Document creation failed');
    
    const res = await request.post(`${API_BASE}/documents/${testDocId}/export`, {
      data: { format: 'invalid_format' }
    });
    // Server either rejects (400) or falls back to default format (200)
    expect(res.status()).toBeLessThan(500);
  });

  test('should set password protection on document', async ({ request }) => {
    test.skip(!testDocId, 'Document creation failed');
    
    const res = await request.post(`${API_BASE}/documents/${testDocId}/password`, {
      data: { password: 'TestPassword123!' }
    });
    expect(res.ok()).toBeTruthy();
  });

  test('should verify correct password', async ({ request }) => {
    test.skip(!testDocId, 'Document creation failed');
    
    const res = await request.post(`${API_BASE}/documents/${testDocId}/verify-password`, {
      data: { password: 'TestPassword123!' }
    });
    expect(res.ok()).toBeTruthy();
    
    const data = await res.json();
    expect(data.verified).toBeTruthy();
  });

  test('should reject incorrect password', async ({ request }) => {
    test.skip(!testDocId, 'Document creation failed');
    
    const res = await request.post(`${API_BASE}/documents/${testDocId}/verify-password`, {
      data: { password: 'WrongPassword!' }
    });
    expect(res.status()).toBe(403);
  });

  test('should add a comment to document', async ({ request }) => {
    test.skip(!testDocId, 'Document creation failed');
    
    const res = await request.post(`${API_BASE}/documents/${testDocId}/comments`, {
      data: {
        content: 'This is a test comment from E2E',
        author: 'E2E Tester'
      }
    });
    expect(res.ok()).toBeTruthy();
  });

  test('should search documents', async ({ request }) => {
    const res = await request.get(`${API_BASE}/documents?search=E2E+Test&page=1&page_size=20`);
    expect(res.ok()).toBeTruthy();
    
    const data = await res.json();
    expect(data).toHaveProperty('documents');
    expect(data).toHaveProperty('total');
  });

  test('should sort documents by title ascending', async ({ request }) => {
    const res = await request.get(`${API_BASE}/documents?sort_by=title&sort_order=asc&page=1&page_size=20`);
    expect(res.ok()).toBeTruthy();
    
    const data = await res.json();
    expect(data.documents.length).toBeGreaterThan(0);
  });

  test('should sort documents by date descending', async ({ request }) => {
    const res = await request.get(`${API_BASE}/documents?sort_by=created_at&sort_order=desc&page=1&page_size=20`);
    expect(res.ok()).toBeTruthy();
    
    const data = await res.json();
    expect(data.documents.length).toBeGreaterThan(0);
    
    // Verify descending order
    if (data.documents.length >= 2) {
      const first = new Date(data.documents[0].created_at).getTime();
      const second = new Date(data.documents[1].created_at).getTime();
      expect(first).toBeGreaterThanOrEqual(second);
    }
  });

  test('should delete the test document', async ({ request }) => {
    test.skip(!testDocId, 'Document creation failed');
    
    const res = await request.delete(`${API_BASE}/documents/${testDocId}`);
    expect(res.ok()).toBeTruthy();
    
    // Verify deletion
    const getRes = await request.get(`${API_BASE}/documents/${testDocId}`);
    expect(getRes.status()).toBe(404);
  });

  test('should return 404 for non-existent document', async ({ request }) => {
    const res = await request.get(`${API_BASE}/documents/nonexistent_id_123`);
    expect(res.status()).toBe(404);
  });
});
