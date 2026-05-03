import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, Link } from 'expo-router';
import Head from 'expo-router/head';
import { Ionicons } from '@expo/vector-icons';

const POSTS = [
  {
    slug: 'best-document-scanner-app-2026',
    title: 'Best Document Scanner App 2026: The Ultimate Buyer\'s Guide',
    description: 'Compare the top 10 document scanner apps of 2026. Discover why DocScan Pro tops the list with AI OCR, math solver, encrypted vault, and 18+ export formats.',
    date: '2026-02-10',
    readTime: '8 min',
    category: 'Buyer\'s Guide',
    image: '/blog/best-scanner-2026.png',
    keyword: 'best document scanner app',
  },
  {
    slug: 'scan-to-pdf-with-ocr',
    title: 'How to Scan Documents to PDF with OCR (Complete 2026 Guide)',
    description: 'Step-by-step tutorial: convert paper documents to searchable PDFs in 30 seconds using AI-powered OCR. Works on iPhone, Android, and web.',
    date: '2026-02-08',
    readTime: '6 min',
    category: 'Tutorial',
    image: '/blog/scan-to-pdf.png',
    keyword: 'scan to PDF with OCR',
  },
  {
    slug: 'business-card-scanner-guide',
    title: 'The Ultimate Business Card Scanner Guide for Creators & Networkers',
    description: 'Stop typing contacts manually. Learn how AI business card scanners extract names, emails, phones, and websites in seconds — plus our top picks for 2026.',
    date: '2026-02-05',
    readTime: '7 min',
    category: 'Guide',
    image: '/blog/business-card.png',
    keyword: 'business card scanner app',
  },
  {
    slug: 'math-equation-solver-camera',
    title: 'AI Math Solver: Solve Equations with Your Camera (2026)',
    description: 'Use AI camera technology to solve handwritten and printed math equations instantly. Step-by-step solutions for algebra, calculus, geometry, and more.',
    date: '2026-02-12',
    readTime: '5 min',
    category: 'AI Tools',
    image: '/blog/math-solver.png',
    keyword: 'math equation solver camera',
  },
];

export default function BlogIndex() {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>DocScan Pro Blog — AI Document Scanner Tips, Guides & Tutorials | 2026</title>
        <meta name="description" content="Learn how to scan documents, extract text with OCR, solve math equations, and digitize your workflow. Expert guides from DocScan Pro covering 100+ document scanning topics." />
        <meta name="keywords" content="document scanner blog, OCR tutorials, PDF scanning guide, AI document tools, paperless office tips, business card scanning, scan to PDF, productivity tools 2026" />
        <link rel="canonical" href="https://docscanpro.app/blog" />
        <meta property="og:title" content="DocScan Pro Blog — Document Scanning Tips & Tutorials" />
        <meta property="og:description" content="Expert guides on AI document scanning, OCR, math solving, and creator productivity." />
        <meta property="og:url" content="https://docscanpro.app/blog" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />

        {/* Blog Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Blog',
              '@id': 'https://docscanpro.app/blog/#blog',
              name: 'DocScan Pro Blog',
              description: 'Expert guides on AI document scanning, OCR, and creator productivity',
              url: 'https://docscanpro.app/blog',
              publisher: { '@id': 'https://docscanpro.app/#organization' },
              blogPost: POSTS.map((p) => ({
                '@type': 'BlogPosting',
                '@id': `https://docscanpro.app/blog/${p.slug}#post`,
                headline: p.title,
                description: p.description,
                datePublished: p.date,
                dateModified: p.date,
                url: `https://docscanpro.app/blog/${p.slug}`,
                image: `https://docscanpro.app${p.image}`,
                author: { '@id': 'https://docscanpro.app/#organization' },
              })),
            }),
          }}
        />
      </Head>

      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />

        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Blog</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.hero}>
            <Text style={styles.heroBadge} accessibilityRole="header">DOCSCAN PRO BLOG</Text>
            <Text style={styles.heroTitle} accessibilityRole="header">
              Master Document Scanning, OCR &amp; AI Tools
            </Text>
            <Text style={styles.heroSubtitle}>
              Expert guides, tutorials, and tips to help creators, students, and professionals digitize their workflow with AI-powered document scanning.
            </Text>
          </View>

          <View style={styles.postsGrid}>
            {POSTS.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}` as never} asChild>
                <TouchableOpacity style={styles.postCard} activeOpacity={0.85}>
                  <View style={styles.postImagePlaceholder}>
                    <Ionicons name="document-text" size={48} color="#2563EB" />
                  </View>
                  <View style={styles.postBody}>
                    <View style={styles.metaRow}>
                      <Text style={styles.category}>{post.category}</Text>
                      <Text style={styles.dot}>•</Text>
                      <Text style={styles.readTime}>{post.readTime} read</Text>
                    </View>
                    <Text style={styles.postTitle} numberOfLines={3}>{post.title}</Text>
                    <Text style={styles.postDescription} numberOfLines={3}>{post.description}</Text>
                    <View style={styles.readMore}>
                      <Text style={styles.readMoreText}>Read article</Text>
                      <Ionicons name="arrow-forward" size={16} color="#2563EB" />
                    </View>
                  </View>
                </TouchableOpacity>
              </Link>
            ))}
          </View>

          <View style={styles.cta}>
            <Text style={styles.ctaTitle}>Ready to start scanning?</Text>
            <Text style={styles.ctaSubtitle}>Free for the first 100 beta users — no credit card required.</Text>
            <TouchableOpacity style={styles.ctaButton} onPress={() => router.push('/auth')}>
              <Text style={styles.ctaButtonText}>Get DocScan Pro Free</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: { padding: 8, width: 40 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  scroll: { paddingBottom: 40 },
  hero: { paddingHorizontal: 24, paddingVertical: 32, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  heroBadge: { fontSize: 12, fontWeight: '700', color: '#2563EB', letterSpacing: 2, marginBottom: 12 },
  heroTitle: { fontSize: 28, fontWeight: '800', color: '#1F2937', lineHeight: 36, marginBottom: 12 },
  heroSubtitle: { fontSize: 15, color: '#6B7280', lineHeight: 22 },
  postsGrid: { padding: 16, gap: 16 },
  postCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  postImagePlaceholder: {
    height: 160,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  postBody: { padding: 16 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  category: { fontSize: 11, fontWeight: '700', color: '#2563EB', letterSpacing: 1.2, textTransform: 'uppercase' },
  dot: { fontSize: 12, color: '#9CA3AF', marginHorizontal: 8 },
  readTime: { fontSize: 12, color: '#6B7280' },
  postTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937', lineHeight: 24, marginBottom: 8 },
  postDescription: { fontSize: 14, color: '#6B7280', lineHeight: 20, marginBottom: 12 },
  readMore: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  readMoreText: { fontSize: 13, fontWeight: '600', color: '#2563EB' },
  cta: { margin: 16, padding: 24, backgroundColor: '#2563EB', borderRadius: 16, alignItems: 'center' },
  ctaTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginBottom: 8, textAlign: 'center' },
  ctaSubtitle: { fontSize: 14, color: '#DBEAFE', textAlign: 'center', marginBottom: 16 },
  ctaButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFFFFF', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 999 },
  ctaButtonText: { color: '#2563EB', fontWeight: '700', fontSize: 15 },
});
