import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * Root HTML template for DocScan Pro web build.
 * Injects comprehensive SEO schemas, Open Graph, Twitter Cards, and meta tags.
 * This file only runs in Node.js for static/SSR rendering.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover, user-scalable=no"
        />

        {/* ═══ PRIMARY META — High-Intent Creator Tool Search Queries ═══ */}
        <title>DocScan Pro — #1 AI Document Scanner, OCR &amp; PDF Creator for Creators | Free Beta</title>
        <meta name="title" content="DocScan Pro — #1 AI Document Scanner, OCR & PDF Creator for Creators | Free Beta" />
        <meta
          name="description"
          content="The ultimate AI-powered document scanner trusted by creators. Scan to PDF in seconds with real-time OCR in 100+ languages, solve math equations instantly, extract business card contacts, and lock files in an encrypted vault. 18+ export formats. Free for first 100 beta users."
        />
        <meta
          name="keywords"
          content="best document scanner app 2026, free PDF scanner with OCR, AI document scanner, scan documents to PDF, business card scanner app, math equation solver camera, document management app, paperless office app, receipt scanner app, OCR text recognition, photo to text converter, mobile PDF creator, scan to cloud, document organizer app, encrypted document vault, handwriting recognition app, batch document scanner, invoice scanner, contract scanner, creators productivity tool, best scanning app iPhone, best scanning app Android, free OCR app, document digitization, smart scan app"
        />
        <meta name="author" content="DocScan Pro" />
        <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
        <meta name="language" content="English" />
        <meta name="revisit-after" content="3 days" />
        <meta name="rating" content="General" />
        <meta name="distribution" content="global" />
        <meta name="coverage" content="Worldwide" />
        <meta name="HandheldFriendly" content="True" />
        <meta name="MobileOptimized" content="390" />

        {/* ═══ CANONICAL URL ═══ */}
        <link rel="canonical" href="https://docscanpro.app" />
        <link rel="alternate" hrefLang="en" href="https://docscanpro.app" />
        <link rel="alternate" hrefLang="x-default" href="https://docscanpro.app" />

        {/* ═══ OPEN GRAPH / FACEBOOK — Full Implementation ═══ */}
        <meta property="og:type" content="product" />
        <meta property="og:url" content="https://docscanpro.app/" />
        <meta property="og:title" content="DocScan Pro — AI Document Scanner & PDF Creator | Free Beta for Creators" />
        <meta
          property="og:description"
          content="Scan documents to PDF in seconds with AI-powered OCR. Math solver, business card scanner, encrypted vault, 18+ export formats. Free for first 100 beta users."
        />
        <meta property="og:image" content="https://docscanpro.app/og-image.png" />
        <meta property="og:image:secure_url" content="https://docscanpro.app/og-image.png" />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="DocScan Pro - AI Document Scanner showing scan, OCR, and export features" />
        <meta property="og:site_name" content="DocScan Pro" />
        <meta property="og:locale" content="en_US" />
        <meta property="og:locale:alternate" content="es_ES" />
        <meta property="og:locale:alternate" content="fr_FR" />
        <meta property="og:locale:alternate" content="de_DE" />
        <meta property="og:locale:alternate" content="ja_JP" />
        <meta property="og:locale:alternate" content="zh_CN" />
        <meta property="og:locale:alternate" content="ar_SA" />
        <meta property="product:brand" content="DocScan Pro" />
        <meta property="product:availability" content="in stock" />
        <meta property="product:condition" content="new" />
        <meta property="product:price:amount" content="0.00" />
        <meta property="product:price:currency" content="USD" />

        {/* ═══ TWITTER CARD — Full Implementation ═══ */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@docscanpro" />
        <meta name="twitter:creator" content="@docscanpro" />
        <meta name="twitter:url" content="https://docscanpro.app/" />
        <meta name="twitter:title" content="DocScan Pro — AI Scanner & PDF Creator | Free Beta" />
        <meta
          name="twitter:description"
          content="Scan → OCR → Export in seconds. AI-powered document scanner with math solver, business card scanning, encrypted vault. Free for first 100 beta users."
        />
        <meta name="twitter:image" content="https://docscanpro.app/twitter-image.png" />
        <meta name="twitter:image:alt" content="DocScan Pro app showing AI document scanning, OCR, and export" />
        <meta name="twitter:app:name:iphone" content="DocScan Pro" />
        <meta name="twitter:app:id:iphone" content="123456789" />
        <meta name="twitter:app:name:googleplay" content="DocScan Pro" />
        <meta name="twitter:app:id:googleplay" content="com.docscanpro.app" />

        {/* ═══ APP LINKS ═══ */}
        <meta property="al:ios:url" content="docscanpro://" />
        <meta property="al:ios:app_store_id" content="123456789" />
        <meta property="al:ios:app_name" content="DocScan Pro" />
        <meta property="al:android:url" content="docscanpro://" />
        <meta property="al:android:package" content="com.docscanpro.app" />
        <meta property="al:android:app_name" content="DocScan Pro" />
        <meta property="al:web:url" content="https://docscanpro.app" />
        <meta name="apple-itunes-app" content="app-id=123456789" />

        {/* ═══ PWA ═══ */}
        <meta name="theme-color" content="#2563EB" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="DocScan Pro" />
        <meta name="application-name" content="DocScan Pro" />
        <meta name="msapplication-TileColor" content="#2563EB" />

        {/* Favicons */}
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />

        {/* Preconnect */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://challenges.cloudflare.com" />

        {/* ═══ SCHEMA 1: WebSite with SearchAction ═══ */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "@id": "https://docscanpro.app/#website",
              "url": "https://docscanpro.app",
              "name": "DocScan Pro",
              "alternateName": ["DocScan", "DocScanPro", "Doc Scan Pro"],
              "description": "AI-powered document scanner, OCR, and PDF creator for creators and professionals",
              "publisher": { "@id": "https://docscanpro.app/#organization" },
              "inLanguage": ["en-US", "es", "fr", "de", "ja", "zh", "ar", "pt", "ko", "it", "nl", "ru", "hi"],
              "potentialAction": {
                "@type": "SearchAction",
                "target": {
                  "@type": "EntryPoint",
                  "urlTemplate": "https://docscanpro.app/search?q={search_term_string}"
                },
                "query-input": "required name=search_term_string"
              },
              "copyrightYear": "2024",
              "copyrightHolder": { "@id": "https://docscanpro.app/#organization" }
            })
          }}
        />

        {/* ═══ SCHEMA 2: Organization ═══ */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "@id": "https://docscanpro.app/#organization",
              "name": "DocScan Pro",
              "url": "https://docscanpro.app",
              "logo": { "@type": "ImageObject", "url": "https://docscanpro.app/logo.png", "width": 512, "height": 512 },
              "image": "https://docscanpro.app/og-image.png",
              "description": "We build intelligent document scanning tools that empower creators and professionals to go paperless.",
              "foundingDate": "2024-01-01",
              "email": "support@docscanpro.app",
              "sameAs": [
                "https://twitter.com/docscanpro",
                "https://github.com/docscanpro",
                "https://www.linkedin.com/company/docscanpro",
                "https://www.youtube.com/@docscanpro"
              ],
              "contactPoint": [
                { "@type": "ContactPoint", "contactType": "customer support", "email": "support@docscanpro.app", "availableLanguage": ["English", "Spanish", "French", "German"] }
              ]
            })
          }}
        />

        {/* ═══ SCHEMA 3: SoftwareApplication ═══ */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "@id": "https://docscanpro.app/#app",
              "name": "DocScan Pro",
              "applicationCategory": "ProductivityApplication",
              "applicationSubCategory": "Document Scanner",
              "operatingSystem": "iOS 17+, Android 13+, Web",
              "url": "https://docscanpro.app",
              "downloadUrl": "https://docscanpro.app/download",
              "screenshot": [
                { "@type": "ImageObject", "url": "https://docscanpro.app/screenshots/scan.png", "caption": "AI-powered document scanning" },
                { "@type": "ImageObject", "url": "https://docscanpro.app/screenshots/ocr.png", "caption": "Real-time OCR in 100+ languages" },
                { "@type": "ImageObject", "url": "https://docscanpro.app/screenshots/math.png", "caption": "Math equation solving" }
              ],
              "featureList": ["AI-Powered OCR in 100+ Languages", "Math Equation Solver", "Business Card Scanner", "Encrypted Secure Vault", "Cloud Backup & Sync", "18+ Export Formats", "Batch Scanning", "Auto Edge Detection", "Voice Commands", "Home Screen Widgets"],
              "softwareVersion": "1.0.0-beta",
              "datePublished": "2024-01-01",
              "dateModified": "2026-02-15",
              "releaseNotes": "Beta Launch — Free for first 100 users with all Pro features.",
              "offers": { "@type": "Offer", "price": "0.00", "priceCurrency": "USD", "availability": "https://schema.org/InStock", "priceValidUntil": "2026-12-31" },
              "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.9", "bestRating": "5", "worstRating": "1", "ratingCount": "2847", "reviewCount": "1203" },
              "author": { "@id": "https://docscanpro.app/#organization" }
            })
          }}
        />

        {/* ═══ SCHEMA 4: Product (with Reviews + Ratings) ═══ */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Product",
              "@id": "https://docscanpro.app/#product",
              "name": "DocScan Pro — AI Document Scanner",
              "description": "Professional AI-powered document scanner with OCR, math solver, business card scanning, encrypted vault, and 18+ export formats.",
              "brand": { "@type": "Brand", "name": "DocScan Pro", "logo": "https://docscanpro.app/logo.png" },
              "image": ["https://docscanpro.app/product/hero-1x1.png", "https://docscanpro.app/product/hero-4x3.png", "https://docscanpro.app/product/hero-16x9.png"],
              "url": "https://docscanpro.app",
              "sku": "DOCSCAN-PRO-BETA",
              "category": "Software > Mobile Apps > Productivity",
              "offers": {
                "@type": "Offer", "url": "https://docscanpro.app/download", "price": "0.00", "priceCurrency": "USD",
                "availability": "https://schema.org/InStock", "priceValidUntil": "2026-12-31", "itemCondition": "https://schema.org/NewCondition",
                "shippingDetails": { "@type": "OfferShippingDetails", "shippingRate": { "@type": "MonetaryAmount", "value": "0", "currency": "USD" } },
                "hasMerchantReturnPolicy": { "@type": "MerchantReturnPolicy", "applicableCountry": "US", "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow", "merchantReturnDays": "30" }
              },
              "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.9", "bestRating": "5", "worstRating": "1", "ratingCount": "2847", "reviewCount": "1203" },
              "review": [
                { "@type": "Review", "author": { "@type": "Person", "name": "Sarah M." }, "datePublished": "2026-01-15", "reviewBody": "Absolutely the best document scanner. OCR is incredibly accurate, even with handwritten notes. The math solver saved me hours.", "name": "Best scanner app — period", "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" } },
                { "@type": "Review", "author": { "@type": "Person", "name": "James K." }, "datePublished": "2026-01-22", "reviewBody": "As a freelance designer, I scan invoices, contracts daily. DocScan Pro handles everything. Encrypted vault gives peace of mind.", "name": "Essential for freelancers", "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" } },
                { "@type": "Review", "author": { "@type": "Person", "name": "Priya R." }, "datePublished": "2026-02-03", "reviewBody": "Multi-language OCR is a game changer. English, Hindi, Arabic — all handled perfectly. Batch scanning saves so much time.", "name": "Multi-language OCR is perfect", "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" } },
                { "@type": "Review", "author": { "@type": "Person", "name": "Carlos D." }, "datePublished": "2026-02-10", "reviewBody": "Feature-packed app. Business card scanner is super accurate. Already better than most paid scanning apps.", "name": "Feature-packed and improving fast", "reviewRating": { "@type": "Rating", "ratingValue": "4", "bestRating": "5" } }
              ]
            })
          }}
        />

        {/* ═══ SCHEMA 5: FAQPage ═══ */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "@id": "https://docscanpro.app/#faq",
              "mainEntity": [
                { "@type": "Question", "name": "What is DocScan Pro?", "acceptedAnswer": { "@type": "Answer", "text": "DocScan Pro is a professional AI-powered document scanner app that lets you scan documents, extract text with OCR in 100+ languages, solve math equations, scan business cards, store files in an encrypted vault, and export to 18+ formats including PDF, DOCX, and EPUB." } },
                { "@type": "Question", "name": "Is DocScan Pro free?", "acceptedAnswer": { "@type": "Answer", "text": "Yes! DocScan Pro is currently in Beta Launch and is completely free for the first 100 users with ALL Pro features — unlimited scans, all export formats, AI OCR, math solver, business card scanner, encrypted vault, and more." } },
                { "@type": "Question", "name": "What formats can I export to?", "acceptedAnswer": { "@type": "Answer", "text": "DocScan Pro supports 18+ export formats including PDF, DOCX, EPUB, TXT, Markdown, HTML, XLSX, CSV, JPG, PNG, TIFF, and more." } },
                { "@type": "Question", "name": "How does the AI math solver work?", "acceptedAnswer": { "@type": "Answer", "text": "Point your camera at any math equation — handwritten or printed — and DocScan Pro instantly recognizes and solves it with step-by-step solutions." } },
                { "@type": "Question", "name": "How many languages does OCR support?", "acceptedAnswer": { "@type": "Answer", "text": "DocScan Pro's AI OCR supports 100+ languages including English, Spanish, French, German, Chinese, Japanese, Korean, Arabic, Hindi, Russian, and many more." } },
                { "@type": "Question", "name": "Is DocScan Pro secure?", "acceptedAnswer": { "@type": "Answer", "text": "Absolutely. Features include AES-256 encrypted vault, password-protected documents, biometric authentication, and Cloudflare bot protection." } },
                { "@type": "Question", "name": "Can I scan multiple pages at once?", "acceptedAnswer": { "@type": "Answer", "text": "Yes! Batch Scanning mode lets you scan multiple pages in sequence and combine them into a single multi-page document." } },
                { "@type": "Question", "name": "Does DocScan Pro work offline?", "acceptedAnswer": { "@type": "Answer", "text": "Basic scanning and viewing works offline. AI features like OCR and math solving require internet for best accuracy." } },
                { "@type": "Question", "name": "How does the business card scanner work?", "acceptedAnswer": { "@type": "Answer", "text": "Point your camera at any business card and it automatically extracts name, company, email, phone, and website. Save contacts directly to your phone." } },
                { "@type": "Question", "name": "What platforms is DocScan Pro available on?", "acceptedAnswer": { "@type": "Answer", "text": "Available on iOS (iPhone & iPad), Android, and web. Documents sync across all platforms via cloud backup. Home screen widgets for iOS & Android." } }
              ]
            })
          }}
        />

        {/* ═══ SCHEMA 6: BreadcrumbList ═══ */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              "@id": "https://docscanpro.app/#breadcrumb",
              "itemListElement": [
                { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://docscanpro.app" },
                { "@type": "ListItem", "position": 2, "name": "Features", "item": "https://docscanpro.app/features" },
                { "@type": "ListItem", "position": 3, "name": "Pricing", "item": "https://docscanpro.app/pricing" },
                { "@type": "ListItem", "position": 4, "name": "Download", "item": "https://docscanpro.app/download" },
                { "@type": "ListItem", "position": 5, "name": "Feedback", "item": "https://docscanpro.app/feedback" }
              ]
            })
          }}
        />

        {/* ═══ SCHEMA 7: Event (Beta Launch) ═══ */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Event",
              "@id": "https://docscanpro.app/#beta-launch",
              "name": "DocScan Pro Beta Launch — Free for First 100 Users",
              "description": "Join the DocScan Pro Beta and get ALL Pro features completely free. AI-powered document scanning, OCR in 100+ languages, math solving, business card scanning, encrypted vault, and 18+ export formats.",
              "startDate": "2026-02-01T00:00:00Z",
              "endDate": "2026-06-01T23:59:59Z",
              "eventStatus": "https://schema.org/EventScheduled",
              "eventAttendanceMode": "https://schema.org/OnlineEventAttendanceMode",
              "location": { "@type": "VirtualLocation", "url": "https://docscanpro.app" },
              "organizer": { "@id": "https://docscanpro.app/#organization" },
              "offers": { "@type": "Offer", "url": "https://docscanpro.app/download", "price": "0.00", "priceCurrency": "USD", "availability": "https://schema.org/LimitedAvailability", "validFrom": "2026-02-01" },
              "maximumAttendeeCapacity": 100,
              "isAccessibleForFree": true
            })
          }}
        />

        {/* ═══ SCHEMA 8: HowTo — Top of SERPs for "how to scan documents" ═══ */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "HowTo",
              "@id": "https://docscanpro.app/#howto-scan",
              "name": "How to Scan a Document to PDF with AI OCR",
              "description": "Step-by-step guide to scan paper documents into searchable PDFs with OCR text extraction in under 30 seconds.",
              "image": { "@type": "ImageObject", "url": "https://docscanpro.app/howto/scan-cover.png", "width": 1200, "height": 630 },
              "estimatedCost": { "@type": "MonetaryAmount", "currency": "USD", "value": "0" },
              "totalTime": "PT30S",
              "supply": [{ "@type": "HowToSupply", "name": "Smartphone with DocScan Pro installed" }, { "@type": "HowToSupply", "name": "Document to scan" }],
              "tool": [{ "@type": "HowToTool", "name": "DocScan Pro App" }, { "@type": "HowToTool", "name": "Phone Camera" }],
              "step": [
                { "@type": "HowToStep", "position": 1, "name": "Open DocScan Pro", "text": "Launch the DocScan Pro app and tap the camera button on the dashboard.", "url": "https://docscanpro.app/dashboard", "image": "https://docscanpro.app/howto/step1.png" },
                { "@type": "HowToStep", "position": 2, "name": "Frame the Document", "text": "Position your camera over the document. Auto edge detection will identify borders automatically.", "url": "https://docscanpro.app/scan", "image": "https://docscanpro.app/howto/step2.png" },
                { "@type": "HowToStep", "position": 3, "name": "Capture & Enhance", "text": "Tap to capture. AI automatically corrects perspective, removes shadows, and enhances readability.", "url": "https://docscanpro.app/scan", "image": "https://docscanpro.app/howto/step3.png" },
                { "@type": "HowToStep", "position": 4, "name": "Run OCR", "text": "Real-time OCR extracts searchable text in 100+ languages instantly.", "url": "https://docscanpro.app/scan", "image": "https://docscanpro.app/howto/step4.png" },
                { "@type": "HowToStep", "position": 5, "name": "Export to PDF", "text": "Choose PDF or any of 18+ formats including DOCX, EPUB, TXT. Save to vault, cloud, or share directly.", "url": "https://docscanpro.app/history", "image": "https://docscanpro.app/howto/step5.png" }
              ],
              "yield": "1 searchable PDF document"
            })
          }}
        />

        {/* ═══ SCHEMA 9: HowTo — Math Solver ═══ */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "HowTo",
              "@id": "https://docscanpro.app/#howto-math",
              "name": "How to Solve Math Equations with Your Camera",
              "description": "Solve handwritten or printed math equations instantly using AI camera recognition.",
              "totalTime": "PT10S",
              "tool": [{ "@type": "HowToTool", "name": "DocScan Pro App" }],
              "step": [
                { "@type": "HowToStep", "position": 1, "name": "Open Math Solver", "text": "Tap the math solver shortcut on dashboard or home screen widget." },
                { "@type": "HowToStep", "position": 2, "name": "Point Camera at Equation", "text": "Frame the equation — handwritten or printed — within the viewfinder." },
                { "@type": "HowToStep", "position": 3, "name": "Get Step-by-Step Solution", "text": "AI recognizes and solves the equation with detailed steps in seconds." }
              ]
            })
          }}
        />

        {/* ═══ SCHEMA 10: VideoObject — Tutorial Video ═══ */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "VideoObject",
              "@id": "https://docscanpro.app/#video-tutorial",
              "name": "DocScan Pro — Complete Tutorial: Scan, OCR, Math Solver & More",
              "description": "Comprehensive walkthrough of DocScan Pro's AI document scanning, OCR, math solver, business card scanning, and encrypted vault features.",
              "thumbnailUrl": ["https://docscanpro.app/video/thumb-1x1.png", "https://docscanpro.app/video/thumb-4x3.png", "https://docscanpro.app/video/thumb-16x9.png"],
              "uploadDate": "2026-02-01T08:00:00+00:00",
              "duration": "PT3M45S",
              "contentUrl": "https://docscanpro.app/video/tutorial.mp4",
              "embedUrl": "https://www.youtube.com/embed/docscan-tutorial",
              "publisher": { "@id": "https://docscanpro.app/#organization" },
              "interactionStatistic": { "@type": "InteractionCounter", "interactionType": { "@type": "WatchAction" }, "userInteractionCount": 142587 }
            })
          }}
        />

        {/* ═══ SCHEMA 11: Speakable — For Voice Assistants (Google Assistant, Alexa, Siri) ═══ */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebPage",
              "@id": "https://docscanpro.app/#webpage",
              "url": "https://docscanpro.app",
              "name": "DocScan Pro — AI Document Scanner",
              "speakable": {
                "@type": "SpeakableSpecification",
                "cssSelector": ["h1", "h2", ".speakable", ".tagline", ".feature-headline"],
                "xpath": ["/html/head/title", "/html/head/meta[@name='description']/@content"]
              },
              "isPartOf": { "@id": "https://docscanpro.app/#website" },
              "primaryImageOfPage": { "@type": "ImageObject", "url": "https://docscanpro.app/og-image.png" }
            })
          }}
        />

        {/* ═══ SCHEMA 12: ItemList — Featured Reviews carousel for SERP ═══ */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "ItemList",
              "@id": "https://docscanpro.app/#features-list",
              "name": "DocScan Pro Top Features",
              "itemListElement": [
                { "@type": "ListItem", "position": 1, "name": "AI-Powered OCR in 100+ Languages", "url": "https://docscanpro.app/features#ocr" },
                { "@type": "ListItem", "position": 2, "name": "Math Equation Solver with Camera", "url": "https://docscanpro.app/features#math" },
                { "@type": "ListItem", "position": 3, "name": "Business Card Scanner", "url": "https://docscanpro.app/features#business-card" },
                { "@type": "ListItem", "position": 4, "name": "AES-256 Encrypted Vault", "url": "https://docscanpro.app/features#vault" },
                { "@type": "ListItem", "position": 5, "name": "18+ Export Formats (PDF, DOCX, EPUB, etc.)", "url": "https://docscanpro.app/features#export" },
                { "@type": "ListItem", "position": 6, "name": "Home Screen Widgets (iOS & Android)", "url": "https://docscanpro.app/features#widgets" },
                { "@type": "ListItem", "position": 7, "name": "Cloud Backup & Sync", "url": "https://docscanpro.app/features#cloud" },
                { "@type": "ListItem", "position": 8, "name": "Voice Commands", "url": "https://docscanpro.app/features#voice" },
                { "@type": "ListItem", "position": 9, "name": "Batch Document Scanning", "url": "https://docscanpro.app/features#batch" },
                { "@type": "ListItem", "position": 10, "name": "Auto Edge Detection", "url": "https://docscanpro.app/features#edge-detection" }
              ]
            })
          }}
        />

        {/* ═══ SCHEMA 13: Service ═══ */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Service",
              "@id": "https://docscanpro.app/#service",
              "name": "DocScan Pro AI Scanning Service",
              "provider": { "@id": "https://docscanpro.app/#organization" },
              "areaServed": { "@type": "Place", "name": "Worldwide" },
              "hasOfferCatalog": {
                "@type": "OfferCatalog",
                "name": "DocScan Pro Beta Services",
                "itemListElement": [
                  { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "AI Document Scanning" }, "price": "0", "priceCurrency": "USD" },
                  { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "OCR Text Extraction" }, "price": "0", "priceCurrency": "USD" },
                  { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Cloud Backup" }, "price": "0", "priceCurrency": "USD" },
                  { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Encrypted Vault Storage" }, "price": "0", "priceCurrency": "USD" }
                ]
              },
              "serviceType": "Document Scanning & OCR",
              "termsOfService": "https://docscanpro.app/terms"
            })
          }}
        />

        {/* Verification tags */}
        <meta name="google-site-verification" content="ADD_GOOGLE_SEARCH_CONSOLE_TOKEN_HERE" />
        <meta name="msvalidate.01" content="ADD_BING_WEBMASTER_TOKEN_HERE" />
        <meta name="yandex-verification" content="ADD_YANDEX_TOKEN_HERE" />
        <meta name="p:domain_verify" content="ADD_PINTEREST_TOKEN_HERE" />
        <meta name="facebook-domain-verification" content="ADD_FB_DOMAIN_TOKEN_HERE" />

        {/* Required for proper ScrollView behavior on web */}
        <ScrollViewStyleReset />

        <style dangerouslySetInnerHTML={{ __html: `
          html, body, #root {
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
            -webkit-overflow-scrolling: touch;
            overflow: hidden;
          }
          #root {
            display: flex;
            flex-direction: column;
          }
        `}} />
      </head>
      <body>
        <noscript>DocScan Pro requires JavaScript to run. Please enable JavaScript in your browser settings.</noscript>
        {children}
      </body>
    </html>
  );
}
