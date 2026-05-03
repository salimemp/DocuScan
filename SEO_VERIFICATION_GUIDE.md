# Search Engine Verification & Indexing Setup Guide

This guide explains how to verify ownership of `docscanpro.app` with major search engines and submit your sitemap for indexing.

## 1. Google Search Console (GSC) — Most Important

**Why:** Required for Google to index your site, monitor SERP performance, and detect issues.

### Setup Steps:

1. Go to https://search.google.com/search-console
2. Click **Add Property** → Enter `https://docscanpro.app` (URL prefix)
3. Choose the **HTML tag** verification method
4. Copy the verification token (e.g., `Y_KdHj3...EvA`)
5. Edit `/app/frontend/app/+html.tsx` line ~290 and replace:
   ```html
   <meta name="google-site-verification" content="ADD_GOOGLE_SEARCH_CONSOLE_TOKEN_HERE" />
   ```
   with:
   ```html
   <meta name="google-site-verification" content="YOUR_ACTUAL_TOKEN" />
   ```
6. Deploy site (Expo static export → host on Vercel/Netlify/Emergent)
7. Click **Verify** in GSC

### Submit Sitemap:
- After verification: GSC → Sitemaps → Add new → `sitemap.xml`
- Also add: `sitemap-images.xml`
- Status should show "Success" within 24h

### Performance Reports:
- Coverage → see all indexed pages
- Performance → see clicks, impressions, CTR, average position
- Enhancements → check FAQ, HowTo, Product schema rich results

---

## 2. Bing Webmaster Tools

**Why:** Bing powers ~10% of US searches. ChatGPT also uses Bing for web access.

### Setup Steps:

1. Go to https://www.bing.com/webmasters/
2. Add site: `https://docscanpro.app`
3. Choose **XML File** verification (drop into `/public/BingSiteAuth.xml`)
4. Or use **Meta tag** — replace in `+html.tsx`:
   ```html
   <meta name="msvalidate.01" content="YOUR_BING_TOKEN" />
   ```
5. Submit sitemap at: Sitemaps → Submit sitemap → `https://docscanpro.app/sitemap.xml`

---

## 3. Yandex Webmaster (Russia/CIS Markets)

1. Go to https://webmaster.yandex.com
2. Add site, verify via meta tag
3. Replace in `+html.tsx`:
   ```html
   <meta name="yandex-verification" content="YOUR_YANDEX_TOKEN" />
   ```
4. Submit sitemap

---

## 4. Pinterest Domain Verification

**Why:** Rich Pins for blog content, drives traffic from creators searching "best document scanner".

1. Go to https://www.pinterest.com/settings/claim
2. Add domain: `docscanpro.app`
3. Replace in `+html.tsx`:
   ```html
   <meta name="p:domain_verify" content="YOUR_PINTEREST_TOKEN" />
   ```

---

## 5. Facebook Domain Verification

**Why:** Required for using Open Graph data in Facebook ads & posts.

1. Go to https://business.facebook.com/settings/owned-domains
2. Add domain → choose Meta tag verification
3. Replace in `+html.tsx`:
   ```html
   <meta name="facebook-domain-verification" content="YOUR_FB_TOKEN" />
   ```

---

## 6. After All Verifications

### Force Re-Indexing (Speed Up Initial Indexing):

**Google:**
- GSC → URL Inspection → enter URL → "Request Indexing"
- Do this for: `/`, `/blog`, `/auth`, all 4 blog post URLs

**Bing:**
- Webmaster Tools → Submit URLs → paste up to 10 URLs

### Schema Validation:
- Test rich results: https://search.google.com/test/rich-results
- Test FAQ schema: https://validator.schema.org/

### Site Speed (Critical for Ranking):
- Test on PageSpeed: https://pagespeed.web.dev/
- Aim for Core Web Vitals: LCP < 2.5s, FID < 100ms, CLS < 0.1

---

## Current Verification Status (as of 2026-02-15)

| Service                       | Token Placeholder                            | Status        |
|-------------------------------|----------------------------------------------|---------------|
| Google Search Console         | `ADD_GOOGLE_SEARCH_CONSOLE_TOKEN_HERE`       | ⏳ Pending     |
| Bing Webmaster                | `ADD_BING_WEBMASTER_TOKEN_HERE`              | ⏳ Pending     |
| Yandex Webmaster              | `ADD_YANDEX_TOKEN_HERE`                      | ⏳ Pending     |
| Pinterest Domain              | `ADD_PINTEREST_TOKEN_HERE`                   | ⏳ Pending     |
| Facebook Domain               | `ADD_FB_DOMAIN_TOKEN_HERE`                   | ⏳ Pending     |

**Action Required from User:**
Once `docscanpro.app` is purchased and pointed at the live deployment, complete the verifications above. All meta tags are pre-installed in `+html.tsx` — just replace the placeholder values.
