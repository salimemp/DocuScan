# 🚀 Complete Deployment & SEO Verification Guide
## DocScan Pro — Domain: www.docscanpro.app (Cloudflare)

This guide walks you through:
1. **Deploying** your app so `www.docscanpro.app` resolves to it
2. **Cloudflare DNS** configuration
3. **Adding verification tokens** to all 5 search engines
4. **Submitting sitemaps** to Google + Bing
5. **Requesting indexing** for fastest SERP appearance

⏱️ **Total time:** ~45 minutes (most is waiting for DNS/verification propagation)

---

## ✅ Phase 1: Deploy the App (Required Before Verification)

> ⚠️ Search engines can only verify ownership AFTER your domain serves the app. Do this first.

### Step 1.1 — Click Preview First (Sanity Check)
- In your Emergent dashboard, click the **Preview** button (top-right)
- Verify the app works as expected on the preview URL
- This is a quick sanity check — no cost

### Step 1.2 — Click Deploy
- Click the **Deploy** button (top-right of the project view)
- Click **"Deploy Now"** to publish
- ⏱️ Wait **10-15 minutes** for the build to finish
- 💰 **Cost**: 50 credits/month per deployed app
- ✅ Both **FastAPI backend** and **Expo frontend** deploy together — no separate steps

### Step 1.3 — Get the Default Emergent URL
- Once deployment finishes, you'll receive a default URL like `docscan-pro-prod.emergent.app`
- View it: **Home tab** → your app's "Deployed Apps" section
- Test it: open the URL in a browser to confirm everything works

### Step 1.4 — Link Your Custom Domain via Entri
1. In Emergent dashboard → your deployed app → **"Link domain"** button
2. Type domain name: `docscanpro.app`
3. Click **"Entri"** (Emergent's domain integration tool)
4. Entri will detect your registrar (Cloudflare) and walk you through:
   - The exact CNAME / A records to set
   - One-click DNS automation (if you authorize Entri to access Cloudflare)
   - OR manual setup instructions if you prefer to add records yourself
5. Repeat for `www.docscanpro.app` if you want both apex and www to work

---

## ✅ Phase 2: Configure Cloudflare DNS

> If you used Entri's auto-setup in Phase 1.4, you can skip this section — Entri already added the records. Jump to Phase 3.

> If you prefer manual setup, follow these steps:

### Step 2.1 — Sign in to Cloudflare
- Go to https://dash.cloudflare.com
- Select the `docscanpro.app` domain

### Step 2.2 — IMPORTANT: Remove Existing A Records First
> ⚠️ Per Emergent's instructions: **Remove all existing A records** from Cloudflare DNS before adding new ones. Old records cause conflicts.

1. Cloudflare → **DNS** → **Records**
2. Delete any existing A records pointing to other servers
3. Keep MX records (email) and TXT records (verification) untouched

### Step 2.3 — Add Records from Emergent's Entri Flow

Use the exact CNAME/A record values that Emergent's Entri tool displayed to you. The format will look like:

```
Type: CNAME (or A — whatever Emergent provides)
Name: @  (apex / root)
Target: <emergent-provided-target>
Proxy status: ⚪ DNS only (gray cloud OFF)  ← Important for Emergent
TTL: Auto
```

```
Type: CNAME
Name: www
Target: <emergent-provided-target>
Proxy status: ⚪ DNS only (gray cloud OFF)
TTL: Auto
```

> 🟠 **Cloudflare Proxy**: Per Emergent's official guidance, **start with proxy OFF (gray cloud)**. If everything works, you can try turning it ON later for Cloudflare CDN benefits. If you turn it ON and the site breaks, switch back to OFF.

### Step 2.4 — Set Up www → apex Redirect

After both `docscanpro.app` and `www.docscanpro.app` resolve, pick ONE canonical domain.

Cloudflare → **Rules** → **Redirect Rules** → **Create rule**:
- **Rule name**: `www to apex`
- **When incoming requests match...**: Hostname equals `www.docscanpro.app`
- **Then**: Static redirect → 301 Permanent → `https://docscanpro.app/$1`
- **Preserve query string**: ON

> ✅ Best practice: Use the **apex** (`docscanpro.app`) as canonical. Our codebase already uses this in all schemas/sitemaps.

### Step 2.5 — SSL/TLS (only if proxy is ON)

If you decide to enable Cloudflare proxy (orange cloud) later:
- Cloudflare → **SSL/TLS** → **Overview** → set to **Full (strict)**
- Enable: ✅ Always Use HTTPS, ✅ HTTP/3, ✅ Min TLS 1.2

### Step 2.6 — Verify DNS Propagation
Wait 5-15 minutes (sometimes up to 24h max), then test:
```bash
curl -I https://docscanpro.app
curl -I https://www.docscanpro.app
```
You should see `200 OK` (or `301 Moved Permanently` for the redirect direction).

If site isn't live within 15 minutes:
1. Re-check DNS records in Cloudflare match what Entri said
2. Confirm proxy is OFF (gray cloud)
3. In Emergent dashboard → click **"Entri"** again and re-link the domain

---

## ✅ Phase 3: Get Verification Tokens

Once `https://docscanpro.app` is live, get tokens from each service.

### 🔵 Google Search Console (Most Important — Do This First)

1. Go to https://search.google.com/search-console
2. Click **Add property** → **URL prefix** → enter `https://docscanpro.app`
3. Choose verification method: **HTML tag**
4. Copy the token from this snippet:
   ```html
   <meta name="google-site-verification" content="ABC123-XyZ_DEF456-MNO789..." />
   ```
   👉 **Copy only the value** between `content="..."` (e.g., `ABC123-XyZ_DEF456-MNO789`)

### 🟦 Bing Webmaster Tools

1. Go to https://www.bing.com/webmasters/
2. Click **Add a site** → enter `https://docscanpro.app`
3. Choose **HTML Meta Tag** verification
4. Copy the token from:
   ```html
   <meta name="msvalidate.01" content="A1B2C3D4E5F6..." />
   ```

> 💡 **Pro tip**: Bing offers "Import from Google Search Console" — saves time. Click it after GSC is verified.

### 🟥 Yandex Webmaster (Optional but useful for global SEO)

1. Go to https://webmaster.yandex.com
2. Add site `https://docscanpro.app`
3. Choose **Meta tag** verification
4. Copy the value from `<meta name="yandex-verification" content="..." />`

### 📌 Pinterest Domain Verification (For Rich Pins)

1. Go to https://www.pinterest.com/settings/claim
2. Add domain `docscanpro.app`
3. Choose **Add HTML tag** method
4. Copy the value from `<meta name="p:domain_verify" content="..." />`

### 📘 Facebook Domain Verification (For Open Graph)

1. Go to https://business.facebook.com/settings/owned-domains
2. Click **Add** → enter `docscanpro.app`
3. Choose **Meta-tag verification**
4. Copy the value from `<meta name="facebook-domain-verification" content="..." />`

---

## ✅ Phase 4: Add Tokens to the App

The verification meta tags are **environment-driven** — paste tokens once and they auto-render.

### Step 4.1 — Update Environment Variables

You have two ways to set env vars:

#### Option A — Via Emergent Dashboard (Recommended for production)
1. In your Emergent project → **Settings** / **Environment Variables**
2. Add these 6 variables one-by-one (paste each token's value):

| Variable Name                                  | Value                                                     |
|------------------------------------------------|-----------------------------------------------------------|
| `EXPO_PUBLIC_SITE_URL`                         | `https://docscanpro.app`                                  |
| `EXPO_PUBLIC_GOOGLE_SITE_VERIFICATION`         | (Google token, e.g., `ABC123-XyZ_DEF456...`)              |
| `EXPO_PUBLIC_BING_SITE_VERIFICATION`           | (Bing token)                                              |
| `EXPO_PUBLIC_YANDEX_VERIFICATION`              | (Yandex token, optional)                                  |
| `EXPO_PUBLIC_PINTEREST_VERIFICATION`           | (Pinterest token, optional)                               |
| `EXPO_PUBLIC_FACEBOOK_DOMAIN_VERIFICATION`     | (Facebook token, optional)                                |

3. Click **Save** for each

#### Option B — Edit `/app/frontend/.env` directly (also works)
The placeholders are already in your `.env`. Just paste values:

```bash
EXPO_PUBLIC_SITE_URL=https://docscanpro.app

EXPO_PUBLIC_GOOGLE_SITE_VERIFICATION=PASTE_YOUR_GOOGLE_TOKEN_HERE
EXPO_PUBLIC_BING_SITE_VERIFICATION=PASTE_YOUR_BING_TOKEN_HERE
EXPO_PUBLIC_YANDEX_VERIFICATION=PASTE_YOUR_YANDEX_TOKEN_HERE
EXPO_PUBLIC_PINTEREST_VERIFICATION=PASTE_YOUR_PINTEREST_TOKEN_HERE
EXPO_PUBLIC_FACEBOOK_DOMAIN_VERIFICATION=PASTE_YOUR_FB_TOKEN_HERE
```

### Step 4.2 — Re-Deploy

After saving env vars, **re-deploy** to apply them:
- In Emergent → click **Deploy** button again → **Deploy Now**
- Re-deployments are **free** (no extra credits)
- Wait 5-10 minutes for the build

### Step 4.3 — Verify the Tags Are Live

```bash
curl -s https://docscanpro.app | grep -E 'google-site-verification|msvalidate|yandex-verification|p:domain_verify|facebook-domain-verification'
```

You should see all 5 meta tags with your real tokens. If a token is missing, the tag won't render (this is intentional — empty tokens are skipped).

---

## ✅ Phase 5: Click "Verify" in Each Service

Now go back to each search console and click the **Verify** button:

| Service              | Verify URL                                                  |
|----------------------|-------------------------------------------------------------|
| Google Search Console | https://search.google.com/search-console                    |
| Bing Webmaster Tools  | https://www.bing.com/webmasters/                            |
| Yandex Webmaster     | https://webmaster.yandex.com                                |
| Pinterest            | https://www.pinterest.com/settings/claim                    |
| Facebook Business    | https://business.facebook.com/settings/owned-domains       |

Each should show ✅ **Verified** within 30 seconds.

---

## ✅ Phase 6: Submit Sitemaps

### Google Search Console
1. Open the verified property
2. Left sidebar → **Sitemaps**
3. **Add a new sitemap** → enter `sitemap.xml` → Submit
4. Add another → `sitemap-images.xml` → Submit
5. Status should show **Success** within 24 hours
6. Sitemap URL: `https://docscanpro.app/sitemap.xml`

### Bing Webmaster Tools
1. Left sidebar → **Sitemaps**
2. **Submit sitemap** → `https://docscanpro.app/sitemap.xml`
3. Repeat for `sitemap-images.xml`

### Yandex Webmaster
1. Indexing → **Sitemap files**
2. Add → `https://docscanpro.app/sitemap.xml`

---

## ✅ Phase 7: Force Faster Indexing (Highly Recommended)

Don't wait weeks for natural crawling — request immediate indexing for top pages.

### Google: URL Inspection Tool

For each of these URLs, do:
1. GSC → **URL Inspection** (top search bar)
2. Paste URL → press Enter
3. Click **"Request Indexing"** → wait 1-2 minutes

Priority URLs to submit:
- `https://docscanpro.app/`
- `https://docscanpro.app/blog`
- `https://docscanpro.app/blog/best-document-scanner-app-2026`
- `https://docscanpro.app/blog/scan-to-pdf-with-ocr`
- `https://docscanpro.app/blog/business-card-scanner-guide`
- `https://docscanpro.app/blog/math-equation-solver-camera`
- `https://docscanpro.app/auth`
- `https://docscanpro.app/feedback`

⚠️ **Limit**: 10 URL requests per day. Spread across days for all sub-pages.

### Bing: Submit URLs

1. Bing Webmaster → **Submit URLs**
2. Paste up to 10 URLs at once → Submit
3. Bing typically indexes within 24-48 hours

---

## ✅ Phase 8: Validate Rich Snippets (Schema)

Test that Google can read all 13+ JSON-LD schemas:

1. Go to https://search.google.com/test/rich-results
2. Enter `https://docscanpro.app`
3. Click **Test URL**
4. Verify these schemas show as **valid**:
   - ✅ FAQ
   - ✅ Product
   - ✅ HowTo (Scan to PDF)
   - ✅ HowTo (Math Solver)
   - ✅ VideoObject
   - ✅ Speakable
   - ✅ ItemList
   - ✅ Service
   - ✅ Organization
   - ✅ WebSite
   - ✅ Event (Beta Launch)
   - ✅ BreadcrumbList

5. For each blog post (`/blog/*`), test that the **BlogPosting** + **BreadcrumbList** schemas are valid.

---

## ✅ Phase 9: Performance & Core Web Vitals

Google ranks faster sites higher. Test:

1. https://pagespeed.web.dev/ → Enter `https://docscanpro.app`
2. Aim for **all green** scores:
   - **LCP** (Largest Contentful Paint): < 2.5s
   - **FID/INP** (Input Delay): < 100ms
   - **CLS** (Layout Shift): < 0.1
3. If scores are low, enable in Cloudflare:
   - **Speed** → **Optimization** → enable Auto Minify (HTML/CSS/JS)
   - **Speed** → **Optimization** → enable Brotli compression
   - **Speed** → **Optimization** → enable Early Hints
   - **Caching** → **Configuration** → Browser TTL: 4 hours, Cache Level: Standard

---

## ✅ Phase 10: Ongoing SEO Monitoring

### Weekly:
- GSC → **Performance** → check clicks, impressions, CTR
- GSC → **Coverage** → check for indexing errors
- Bing → **Search Performance** → similar metrics

### Monthly:
- Update blog with 1-2 new articles targeting new keywords
- Refresh existing articles (update dates, add new sections)
- Build backlinks: post articles on Reddit, Hacker News, ProductHunt

### Tools to Track Rankings:
- **Free**: Google Search Console (already covered)
- **Free**: https://www.semrush.com/free-tools/keyword-rank-checker/
- **Paid (optional)**: Ahrefs ($99/mo), SEMrush ($129/mo)

---

## 🎯 Expected Timeline to Top SERP Rankings

| Milestone                              | Time         |
|----------------------------------------|--------------|
| DNS propagation                        | 5-30 min     |
| All 5 verifications complete           | Same day     |
| Sitemap submitted & approved           | 24-72 hours  |
| First pages indexed by Google          | 3-7 days     |
| All blog pages indexed                 | 1-2 weeks    |
| Rich snippets show in SERPs            | 2-4 weeks    |
| Ranking for long-tail keywords (e.g., "best document scanner app 2026") | 4-8 weeks |
| Ranking on page 1 for primary keywords | 3-6 months   |

⚡ **Speed boosters**: Internal linking (already done via Dashboard CTAs), backlinks from social media, Reddit posts, ProductHunt launch.

---

## 🆘 Troubleshooting

### "Verification failed"
- Wait 5 minutes after deployment, then click Verify again
- Check the meta tag is visible in the rendered HTML: `curl -s https://docscanpro.app | grep verification`
- Make sure no extra spaces or quotes around the token in `.env`

### "DNS not resolving"
- Check Cloudflare DNS shows green status (proxied)
- Test with: `dig docscanpro.app +short` — should return Cloudflare IP
- Wait up to 24 hours for global propagation (usually faster)

### "Sitemap returns 404"
- Confirm `/app/frontend/public/sitemap.xml` was included in the deployment
- Test: `curl https://docscanpro.app/sitemap.xml`
- For Cloudflare Pages, ensure `_headers` file allows `.xml`

### "Schema validation errors"
- Use https://validator.schema.org/ to validate each schema individually
- Check the production deploy actually has the schemas: `curl -s https://docscanpro.app | grep 'application/ld+json' | wc -l` — should return ≥13

---

## 📋 Quick Checklist

- [ ] App deployed to production (Emergent / Cloudflare Pages / Vercel)
- [ ] DNS records added in Cloudflare (apex + www)
- [ ] HTTPS enabled (Full strict mode)
- [ ] Domain resolves: `curl -I https://docscanpro.app` returns 200
- [ ] Got Google Search Console token
- [ ] Got Bing Webmaster token
- [ ] Got Yandex token (optional)
- [ ] Got Pinterest token (optional)
- [ ] Got Facebook token (optional)
- [ ] Pasted all tokens into `/app/frontend/.env`
- [ ] Re-deployed app
- [ ] Verified meta tags appear in HTML
- [ ] Clicked "Verify" in each service
- [ ] Submitted `sitemap.xml` to Google + Bing
- [ ] Requested indexing for top 8 URLs
- [ ] Tested rich results in Schema Test Tool
- [ ] Tested page speed on PageSpeed Insights

---

**Need help?** Drop a screenshot of any error and I'll diagnose it. After deployment, I can also automate the rest (sitemap submission via API, etc.) if you provide GSC OAuth credentials.
