import React, { ReactNode } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Head from 'expo-router/head';
import { Ionicons } from '@expo/vector-icons';

export interface BlogPostProps {
  slug: string;
  title: string;
  description: string;
  keywords: string;
  date: string;
  modified?: string;
  readTime: string;
  category: string;
  ogImage?: string;
  children: ReactNode;
}

export function BlogPostLayout({ slug, title, description, keywords, date, modified, readTime, category, ogImage, children }: BlogPostProps) {
  const router = useRouter();
  const url = `https://docscanpro.app/blog/${slug}`;
  const image = ogImage || `https://docscanpro.app/og-image.png`;

  return (
    <>
      <Head>
        <title>{title} | DocScan Pro Blog</title>
        <meta name="title" content={`${title} | DocScan Pro Blog`} />
        <meta name="description" content={description} />
        <meta name="keywords" content={keywords} />
        <meta name="author" content="DocScan Pro" />
        <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
        <link rel="canonical" href={url} />

        {/* Open Graph */}
        <meta property="og:type" content="article" />
        <meta property="og:url" content={url} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={image} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="DocScan Pro" />
        <meta property="article:published_time" content={date} />
        <meta property="article:modified_time" content={modified || date} />
        <meta property="article:author" content="DocScan Pro" />
        <meta property="article:section" content={category} />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@docscanpro" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={image} />

        {/* Article Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'BlogPosting',
              '@id': `${url}#post`,
              mainEntityOfPage: { '@type': 'WebPage', '@id': url },
              headline: title,
              description,
              image: { '@type': 'ImageObject', url: image, width: 1200, height: 630 },
              datePublished: date,
              dateModified: modified || date,
              author: { '@id': 'https://docscanpro.app/#organization', '@type': 'Organization', name: 'DocScan Pro', url: 'https://docscanpro.app' },
              publisher: { '@id': 'https://docscanpro.app/#organization', '@type': 'Organization', name: 'DocScan Pro', logo: { '@type': 'ImageObject', url: 'https://docscanpro.app/logo.png' } },
              keywords: keywords,
              articleSection: category,
              wordCount: 1200,
              inLanguage: 'en-US',
              speakable: { '@type': 'SpeakableSpecification', cssSelector: ['h1', 'h2', '.intro'] },
            }),
          }}
        />

        {/* Breadcrumb Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://docscanpro.app' },
                { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://docscanpro.app/blog' },
                { '@type': 'ListItem', position: 3, name: title, item: url },
              ],
            }),
          }}
        />
      </Head>

      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>Blog</Text>
          <TouchableOpacity onPress={() => router.push('/auth')} style={styles.tryBtn}>
            <Text style={styles.tryBtnText}>Try Free</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.metaContainer}>
            <Text style={styles.category}>{category.toUpperCase()}</Text>
            <Text style={styles.metaDot}>•</Text>
            <Text style={styles.meta}>{readTime} read</Text>
            <Text style={styles.metaDot}>•</Text>
            <Text style={styles.meta}>{new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
          </View>

          <Text style={styles.title} accessibilityRole="header">{title}</Text>
          <Text style={styles.lead}>{description}</Text>

          <View style={styles.heroImage}>
            <Ionicons name="document-text" size={64} color="#2563EB" />
          </View>

          <View style={styles.contentBody}>{children}</View>

          {/* CTA */}
          <View style={styles.cta}>
            <Text style={styles.ctaTitle}>Try DocScan Pro Free</Text>
            <Text style={styles.ctaSubtitle}>Free for the first 100 beta users — all Pro features included.</Text>
            <TouchableOpacity style={styles.ctaButton} onPress={() => router.push('/auth')}>
              <Text style={styles.ctaButtonText}>Get Started Free</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

// Helper components for blog content
export function H2({ children }: { children: ReactNode }) {
  return <Text style={styles.h2} accessibilityRole="header">{children}</Text>;
}
export function H3({ children }: { children: ReactNode }) {
  return <Text style={styles.h3} accessibilityRole="header">{children}</Text>;
}
export function P({ children }: { children: ReactNode }) {
  return <Text style={styles.p}>{children}</Text>;
}
export function LI({ children }: { children: ReactNode }) {
  return (
    <View style={styles.liRow}>
      <Text style={styles.bullet}>•</Text>
      <Text style={styles.li}>{children}</Text>
    </View>
  );
}
export function Strong({ children }: { children: ReactNode }) {
  return <Text style={styles.strong}>{children}</Text>;
}
export function Quote({ children }: { children: ReactNode }) {
  return (
    <View style={styles.quote}>
      <Text style={styles.quoteText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backBtn: { padding: 8, width: 40 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: '#1F2937' },
  tryBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#2563EB', borderRadius: 999 },
  tryBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  scroll: { padding: 20, paddingBottom: 60 },
  metaContainer: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 },
  category: { fontSize: 11, fontWeight: '700', color: '#2563EB', letterSpacing: 1.4 },
  metaDot: { fontSize: 12, color: '#9CA3AF', marginHorizontal: 8 },
  meta: { fontSize: 12, color: '#6B7280' },
  title: { fontSize: 28, fontWeight: '800', color: '#1F2937', lineHeight: 36, marginBottom: 16 },
  lead: { fontSize: 17, color: '#374151', lineHeight: 26, marginBottom: 24, fontStyle: 'italic' },
  heroImage: { height: 200, backgroundColor: '#EFF6FF', borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  contentBody: { gap: 0 },
  h2: { fontSize: 22, fontWeight: '800', color: '#1F2937', marginTop: 28, marginBottom: 12, lineHeight: 30 },
  h3: { fontSize: 18, fontWeight: '700', color: '#1F2937', marginTop: 20, marginBottom: 8, lineHeight: 26 },
  p: { fontSize: 15, color: '#374151', lineHeight: 24, marginBottom: 14 },
  liRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, paddingLeft: 4 },
  bullet: { fontSize: 14, color: '#2563EB', marginRight: 10, marginTop: 4, fontWeight: '700' },
  li: { flex: 1, fontSize: 15, color: '#374151', lineHeight: 22 },
  strong: { fontWeight: '700', color: '#111827' },
  quote: { borderLeftWidth: 4, borderLeftColor: '#2563EB', paddingLeft: 16, paddingVertical: 8, marginVertical: 16, backgroundColor: '#F3F4F6', borderRadius: 4 },
  quoteText: { fontSize: 15, fontStyle: 'italic', color: '#4B5563', lineHeight: 22 },
  cta: { marginTop: 32, padding: 24, backgroundColor: '#2563EB', borderRadius: 16, alignItems: 'center' },
  ctaTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginBottom: 8, textAlign: 'center' },
  ctaSubtitle: { fontSize: 14, color: '#DBEAFE', textAlign: 'center', marginBottom: 16 },
  ctaButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFFFFF', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 999 },
  ctaButtonText: { color: '#2563EB', fontWeight: '700', fontSize: 15 },
});
