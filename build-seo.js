#!/usr/bin/env node

/**
 * build-seo.js - Pre-render static HTML pages for SEO
 *
 * Reads content JSON files and detail.html template, then generates
 * one HTML file per published item under section directories (inspire/, grow/, create/)
 * with pre-filled meta tags, OG tags, structured data, and corrected asset paths.
 * Also regenerates sitemap.xml with clean URLs.
 *
 * Usage: node build-seo.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SITE_URL = 'https://kids.thetranquilheart.com';
const SITE_NAME = 'The Tranquil Heart Kids';
const DEFAULT_IMAGE = 'images/og-default.webp';
const SECTIONS = ['inspire', 'grow', 'create'];

// ---- Helpers ----

function stripMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/^#{1,6}\s+/gm, '')       // headings
    .replace(/\*\*(.+?)\*\*/g, '$1')    // bold
    .replace(/\*(.+?)\*/g, '$1')        // italic
    .replace(/_(.+?)_/g, '$1')          // italic underscore
    .replace(/`(.+?)`/g, '$1')          // inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
    .replace(/[>\-\[\]]+/g, ' ')        // blockquotes, list markers, brackets
    .replace(/\n+/g, ' ')              // newlines
    .replace(/\s+/g, ' ')              // collapse whitespace
    .trim();
}

function makeDescription(content, maxLen) {
  maxLen = maxLen || 155;
  var plain = stripMarkdown(content);
  if (plain.length <= maxLen) return plain;
  // Cut at last space before maxLen
  var cut = plain.substring(0, maxLen);
  var lastSpace = cut.lastIndexOf(' ');
  if (lastSpace > 100) cut = cut.substring(0, lastSpace);
  return cut + '...';
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeJsonString(str) {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

function getImageUrl(item) {
  if (!item.image) return SITE_URL + '/' + DEFAULT_IMAGE;
  if (item.image.startsWith('http')) return item.image;
  return SITE_URL + '/' + item.image;
}

function getCleanUrl(section, itemId) {
  return SITE_URL + '/' + section + '/' + itemId + '.html';
}

// Add <base href="../"> so all relative paths (CSS, JS, images, fetch calls)
// resolve correctly from subdirectory pages
function addBaseTag(html) {
  html = html.replace(
    '<meta charset="UTF-8">',
    '<base href="../">\n  <meta charset="UTF-8">'
  );
  return html;
}

// ---- Main ----

function main() {
  // Read the template
  var templatePath = path.join(ROOT, 'detail.html');
  if (!fs.existsSync(templatePath)) {
    console.error('Error: detail.html not found');
    process.exit(1);
  }
  var template = fs.readFileSync(templatePath, 'utf8');

  var allItems = []; // { section, item } for sitemap
  var counts = { inspire: 0, grow: 0, create: 0 };

  for (var s = 0; s < SECTIONS.length; s++) {
    var section = SECTIONS[s];
    var jsonPath = path.join(ROOT, 'content', section + '.json');

    if (!fs.existsSync(jsonPath)) {
      console.warn('Warning: ' + jsonPath + ' not found, skipping');
      continue;
    }

    var raw = fs.readFileSync(jsonPath, 'utf8');
    var data = JSON.parse(raw);
    var items = data[section];

    if (!Array.isArray(items)) {
      console.warn('Warning: No array found at key "' + section + '" in ' + jsonPath);
      continue;
    }

    // Ensure output directory exists
    var outDir = path.join(ROOT, section);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    for (var i = 0; i < items.length; i++) {
      var item = items[i];

      // Skip unpublished items
      if (item.published === false) continue;

      var cleanUrl = getCleanUrl(section, item.id);
      var description = makeDescription(item.content);
      var fullTitle = item.title + ' | ' + SITE_NAME;
      var imageUrl = getImageUrl(item);
      var datePublished = item.date || new Date().toISOString().split('T')[0];

      // Build structured data JSON-LD
      var structuredData = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": item.title,
        "description": description,
        "image": imageUrl,
        "datePublished": datePublished,
        "publisher": {
          "@type": "Organization",
          "name": SITE_NAME,
          "logo": {
            "@type": "ImageObject",
            "url": SITE_URL + "/images/favicon.svg"
          }
        },
        "mainEntityOfPage": {
          "@type": "WebPage",
          "@id": cleanUrl
        }
      }, null, 2);

      // Start from the template and make replacements
      var html = template;

      // Replace <title>
      html = html.replace(
        /<title>[^<]*<\/title>/,
        '<title>' + escapeHtml(fullTitle) + '</title>'
      );

      // Replace meta description
      html = html.replace(
        /<meta name="description" content="[^"]*">/,
        '<meta name="description" content="' + escapeHtml(description) + '">'
      );

      // Replace canonical URL
      html = html.replace(
        /<link rel="canonical" id="canonical-url" href="[^"]*">/,
        '<link rel="canonical" id="canonical-url" href="' + cleanUrl + '">'
      );

      // Replace OG tags
      html = html.replace(
        /<meta property="og:title" id="og-title" content="[^"]*">/,
        '<meta property="og:title" id="og-title" content="' + escapeHtml(fullTitle) + '">'
      );
      html = html.replace(
        /<meta property="og:description" id="og-description" content="[^"]*">/,
        '<meta property="og:description" id="og-description" content="' + escapeHtml(description) + '">'
      );
      html = html.replace(
        /<meta property="og:url" id="og-url" content="[^"]*">/,
        '<meta property="og:url" id="og-url" content="' + cleanUrl + '">'
      );
      html = html.replace(
        /<meta property="og:image" id="og-image" content="[^"]*">/,
        '<meta property="og:image" id="og-image" content="' + imageUrl + '">'
      );

      // Replace Twitter tags
      html = html.replace(
        /<meta name="twitter:title" id="twitter-title" content="[^"]*">/,
        '<meta name="twitter:title" id="twitter-title" content="' + escapeHtml(fullTitle) + '">'
      );
      html = html.replace(
        /<meta name="twitter:description" id="twitter-description" content="[^"]*">/,
        '<meta name="twitter:description" id="twitter-description" content="' + escapeHtml(description) + '">'
      );
      html = html.replace(
        /<meta name="twitter:image" id="twitter-image" content="[^"]*">/,
        '<meta name="twitter:image" id="twitter-image" content="' + imageUrl + '">'
      );

      // Replace structured data
      html = html.replace(
        /<script type="application\/ld\+json" id="structured-data">[\s\S]*?<\/script>/,
        '<script type="application/ld+json" id="structured-data">\n' + structuredData + '\n  </script>'
      );

      // Add data-item-id to body tag
      html = html.replace(
        '<body data-page="detail">',
        '<body data-page="detail" data-item-id="' + escapeHtml(item.id) + '">'
      );

      // Add <base> tag so all relative paths resolve from the root
      html = addBaseTag(html);

      // Write the file
      var outPath = path.join(outDir, item.id + '.html');
      fs.writeFileSync(outPath, html, 'utf8');
      counts[section]++;
      allItems.push({ section: section, item: item });
    }
  }

  // Generate sitemap.xml
  generateSitemap(allItems);

  // Summary
  var total = counts.inspire + counts.grow + counts.create;
  console.log('\n=== SEO Build Complete ===');
  console.log('Inspire: ' + counts.inspire + ' pages');
  console.log('Grow:    ' + counts.grow + ' pages');
  console.log('Create:  ' + counts.create + ' pages');
  console.log('Total:   ' + total + ' pages generated');
  console.log('Sitemap: sitemap.xml updated with ' + (total + 5) + ' URLs');
  console.log('');
}

function generateSitemap(allItems) {
  var lines = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');

  // Main pages
  lines.push('  <!-- Main Pages -->');
  var mainPages = [
    { loc: '/', freq: 'weekly', priority: '1.0' },
    { loc: '/inspire.html', freq: 'weekly', priority: '0.9' },
    { loc: '/grow.html', freq: 'weekly', priority: '0.9' },
    { loc: '/create.html', freq: 'weekly', priority: '0.9' },
    { loc: '/bookmarks.html', freq: 'monthly', priority: '0.5' }
  ];
  for (var m = 0; m < mainPages.length; m++) {
    var pg = mainPages[m];
    lines.push('  <url>');
    lines.push('    <loc>' + SITE_URL + pg.loc + '</loc>');
    lines.push('    <changefreq>' + pg.freq + '</changefreq>');
    lines.push('    <priority>' + pg.priority + '</priority>');
    lines.push('  </url>');
  }

  // Content pages by section
  var currentSection = '';
  for (var i = 0; i < allItems.length; i++) {
    var entry = allItems[i];
    if (entry.section !== currentSection) {
      currentSection = entry.section;
      var sectionLabel = currentSection.charAt(0).toUpperCase() + currentSection.slice(1);
      lines.push('');
      lines.push('  <!-- ' + sectionLabel + ' Content -->');
    }
    var loc = SITE_URL + '/' + entry.section + '/' + entry.item.id + '.html';
    lines.push('  <url>');
    lines.push('    <loc>' + loc + '</loc>');
    if (entry.item.date) {
      lines.push('    <lastmod>' + entry.item.date + '</lastmod>');
    }
    lines.push('    <changefreq>monthly</changefreq>');
    lines.push('    <priority>0.8</priority>');
    lines.push('  </url>');
  }

  lines.push('</urlset>');

  var sitemapPath = path.join(ROOT, 'sitemap.xml');
  fs.writeFileSync(sitemapPath, lines.join('\n') + '\n', 'utf8');
}

main();
