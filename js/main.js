// THE TRANQUIL HEART KIDS - Main JavaScript (Enhanced with Download Functionality)
var state = { inspire: [], grow: [], create: [], categories: { inspire: [], grow: [], create: [] }, currentFilter: 'all' };
const DATA_SOURCES = {
  inspire: 'data/inspire.json',
  grow: 'data/grow.json',
  create: 'data/create.json'
};

// ========== CATEGORY HELPER FUNCTIONS ==========
// Support for both string and array categories

function getCategories(item) {
  if (!item || !item.category) return [];
  return Array.isArray(item.category) ? item.category : [item.category];
}

function hasCategory(item, categoryName) {
  return getCategories(item).indexOf(categoryName) !== -1;
}

function getPrimaryCategory(item) {
  var cats = getCategories(item);
  return cats.length > 0 ? cats[0] : null;
}

// Get appropriate image based on current filter (for multi-category items)
function getItemImage(item, categories) {
  if (!item) return null;

  // If item has categoryImages and current filter matches one
  if (item.categoryImages && state.currentFilter && state.currentFilter !== 'all') {
    // Find the category name from the filter id
    var cat = categories ? categories.find(function(c) { return c.id === state.currentFilter; }) : null;
    if (cat && item.categoryImages[cat.name]) {
      return item.categoryImages[cat.name];
    }
  }

  // Fallback to default image
  return item.image || null;
}

// ========== ALLAH NAMES HELPER FUNCTIONS ==========

function isAllahNameContent(item) {
  return item && hasCategory(item, "Names of Allah");
}

function getAllahNameFromContent(contentItem) {
  if (!contentItem || !hasCategory(contentItem, "Names of Allah")) {
    return null;
  }
  
  if (!window.allahNames) {
    console.error('❌ allahNames data not loaded!');
    return null;
  }
  
  const title = contentItem.title.toLowerCase();
  
  const allahName = window.allahNames.find(name => {
    const transLower = name.transliteration.toLowerCase();
    
    if (title.includes(transLower)) return true;
    if ((title === 'allah' || title.startsWith('allah ')) && transLower === 'allah') return true;
    if (title.includes('ahad') && transLower.includes('ahad')) return true;
    if ((title.includes("a'la") || title.includes('ala')) && name.number === 36) return true;
    
    return false;
  });
  
  if (allahName) {
    console.log('✅ Matched:', contentItem.title, '→', allahName.transliteration);
  }
  
  return allahName;
}

document.addEventListener('DOMContentLoaded', async function() {
  await loadComponents();
  await loadContent();
  var page = document.body.dataset.page || getCurrentPage();
  initializePage(page);
  initializeFeatures();
});

function getCurrentPage() {
  var p = window.location.pathname;
  if (p.includes('inspire')) return 'inspire';
  if (p.includes('grow')) return 'grow';
  if (p.includes('create')) return 'create';
  if (p.includes('detail')) return 'detail';
  if (p.includes('bookmarks')) return 'bookmarks';
  return 'home';
}

function initializePage(page) {
  var handlers = { home: renderHomePage, inspire: renderInspirePage, grow: renderGrowPage, create: renderCreatePage, detail: renderDetailPage, bookmarks: renderBookmarksPage };
  if (handlers[page]) handlers[page]();
  setActiveNavLink(page);
  BookmarkSystem.updateBookmarkCount();
}

function initializeFeatures() {
  initSearch();
  initDarkMode();
  initFontSize();
  initMobileMenu();
}

// Load Components
async function loadComponents() {
  await loadComponent('header', 'header-placeholder');
  await loadComponent('footer', 'footer-placeholder');
  populateSiteConfig();
}

// Populate site config values into DOM elements with data attributes
function populateSiteConfig() {
  if (!window.SITE_CONFIG) return;
  var config = window.SITE_CONFIG;

  // Site name (text only)
  document.querySelectorAll('[data-site-name]').forEach(function(el) {
    el.textContent = config.name;
  });

  // Site name with HTML (for logo with span)
  document.querySelectorAll('[data-site-name-html]').forEach(function(el) {
    el.innerHTML = config.nameHtml;
  });

  // Tagline
  document.querySelectorAll('[data-site-tagline]').forEach(function(el) {
    el.textContent = config.tagline;
  });

  // Email
  document.querySelectorAll('[data-site-email]').forEach(function(el) {
    el.textContent = config.email;
    el.href = 'mailto:' + config.email;
  });

  // Copyright
  document.querySelectorAll('[data-site-copyright]').forEach(function(el) {
    el.textContent = config.year + ' ' + config.name + '. All rights reserved.';
  });
}

async function loadComponent(name, id) {
  var el = document.getElementById(id);
  if (!el) return;
  try {
    var res = await fetch('components/' + name + '.html?v=' + Date.now());
    if (res.ok) el.innerHTML = await res.text();
  } catch (e) { console.warn('Could not load ' + name); }
}

function setActiveNavLink(page) {
  document.querySelectorAll('.nav-link').forEach(function(l) {
    var lp = l.dataset.page;
    l.classList.toggle('active', lp === page);
  });
}

// Load Content from JSON files in content/ folder
async function loadContent() {
  try {
    var results = await Promise.all([
      fetchJSON('content/inspire.json'),
      fetchJSON('content/grow.json'),
      fetchJSON('content/categories.json'),
      fetchJSON('content/create.json')
    ]);
    state.inspire = (results[0] && results[0].inspire) ? results[0].inspire.filter(function(i) { return i.published !== false; }) : [];
    state.grow = (results[1] && results[1].grow) ? results[1].grow.filter(function(i) { return i.published !== false; }) : [];
    state.categories = results[2] || { inspire: [], grow: [], create: [] };
    state.create = (results[3] && results[3].create) ? results[3].create.filter(function(i) { return i.published !== false; }) : [];
    enrichCategoriesWithCounts();
    console.log('Content loaded:', state.inspire.length, 'inspire,', state.grow.length, 'grow,', state.create.length, 'create');
  } catch (e) { console.error('Error loading content:', e); }
}

function enrichCategoriesWithCounts() {
  if (state.categories.inspire) {
    state.categories.inspire = state.categories.inspire.map(function(c) {
      return Object.assign({}, c, { count: state.inspire.filter(function(i) { return hasCategory(i, c.name); }).length });
    });
  }
  if (state.categories.grow) {
    state.categories.grow = state.categories.grow.map(function(c) {
      return Object.assign({}, c, { count: state.grow.filter(function(i) { return hasCategory(i, c.name); }).length });
    });
  }
  if (state.categories.create) {
    state.categories.create = state.categories.create.map(function(c) {
      return Object.assign({}, c, { count: state.create.filter(function(i) { return hasCategory(i, c.name); }).length });
    });
  }
}

async function fetchJSON(path) {
  try {
    var res = await fetch(path);
    if (!res.ok) throw new Error('Failed to fetch ' + path);
    return await res.json();
  } catch (e) { 
    console.error('Error fetching', path, e);
    return null; 
  }
}

//Allah names
// =====================================================
// MODIFIED SOLUTION: Use grow.json instead of markdown files
// Add these functions to your existing main.js
// =====================================================

// Check if content is an Allah name based on category
function isAllahNameContent(item) {
  return item && hasCategory(item, "Names of Allah");
}

// Get Allah name data from content slug/id
function getAllahNameData(slug) {
  if (!window.allahNames) {
    console.warn('allahNames data not loaded');
    return null;
  }
  
  // Extract number from slug patterns like:
  // "1-ar-rahman", "allah", "al-ahad-the-one", etc.
  
  // Try direct number match first
  const numberMatch = slug.match(/^(\d+)-/);
  if (numberMatch) {
    const number = parseInt(numberMatch[1]);
    return window.allahNames.find(name => name.number === number);
  }
  
  // Try matching by transliteration in slug
  const name = window.allahNames.find(n => {
    const cleanSlug = slug.toLowerCase().replace(/-/g, '');
    const cleanTrans = n.transliteration.toLowerCase().replace(/[^a-z0-9]/g, '');
    return cleanSlug.includes(cleanTrans) || cleanTrans.includes(cleanSlug);
  });
  
  return name;
}

// Get Allah name from JSON content item
function getAllahNameFromContent(contentItem) {
  if (!contentItem || !hasCategory(contentItem, "Names of Allah")) {
    return null;
  }
  
  // Try to get from slug/id
  let allahName = getAllahNameData(contentItem.id);
  
  // If not found, try matching by title
  if (!allahName && window.allahNames) {
    allahName = window.allahNames.find(name => {
      const titleLower = contentItem.title.toLowerCase();
      const transLower = name.transliteration.toLowerCase();
      return titleLower.includes(transLower);
    });
  }
  
  return allahName;
}

// =====================================================
// REPLACE YOUR renderGrowCard FUNCTION WITH THIS VERSION
// =====================================================

function renderGrowCard(item) {
  const allahName = getAllahNameFromContent(item);
   if (allahName) {
     return `... ALLAH NAME CARD HTML ...`;
   }

  if (allahName) {
    // RENDER ALLAH NAME CARD - NO IMAGES!
    return `
      <div class="grow-card" data-category="${item.category}" data-allah-name="true">
        <a href="detail.html?type=grow&id=${item.id}" class="grow-card-link">
          <div class="grow-card-image">
            <div class="grow-card-placeholder">
              <span class="allah-name-number">${allahName.number}</span>
              <span class="allah-series-badge">99 Names</span>
              <div class="allah-name-arabic">${allahName.arabic}</div>
              <div class="allah-name-transliteration">${allahName.transliteration}</div>
              <div class="allah-name-meaning">${allahName.meaning}</div>
            </div>
          </div>
          <div class="grow-card-content">
            <div class="grow-card-category">
              ☪️ NAME ${allahName.number} OF 99
            </div>
            <h3 class="grow-card-title">${item.title}</h3>
            <p class="grow-card-excerpt">${item.content ? item.content.substring(0, 150).replace(/\n/g, ' ') + '...' : allahName.meaning}</p>
          </div>
        </a>
        <div class="grow-card-footer">
          <span class="card-date">${formatDate(item.date)}</span>
          <div class="card-actions">
            <button class="like-btn small" onclick="toggleLike(event, '${item.id}')">
              <svg class="heart-icon" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
              <span class="like-count">${getLikes(item.id)}</span>
            </button>
          </div>
        </div>
        <button class="bookmark-btn card ${isBookmarked(item.id) ? 'bookmarked' : ''}" 
                onclick="toggleBookmark(event, '${item.id}')" 
                title="Bookmark">
          <svg class="bookmark-icon" viewBox="0 0 24 24">
            <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
          </svg>
        </button>
      </div>
    `;
  }
  
  // NORMAL GROW CARD (your original code)
  return `
    <div class="grow-card" data-category="${item.category}">
      <a href="detail.html?type=grow&id=${item.id}" class="grow-card-link">
        <div class="grow-card-image">
          ${item.image ? 
            `<img src="${item.image}" alt="${item.title}" loading="lazy">` :
            `<div class="grow-card-placeholder">${getCategoryEmoji(item.category)}</div>`
          }
        </div>
        <div class="grow-card-content">
          <div class="grow-card-category">
            ${getCategoryEmoji(item.category)} ${item.category}
          </div>
          <h3 class="grow-card-title">${item.title}</h3>
          <p class="grow-card-excerpt">${item.content ? item.content.substring(0, 150).replace(/\n/g, ' ') + '...' : ''}</p>
        </div>
      </a>
      <div class="grow-card-footer">
        <span class="card-date">${formatDate(item.date)}</span>
        <div class="card-actions">
          <button class="like-btn small" onclick="toggleLike(event, '${item.id}')">
            <svg class="heart-icon" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <span class="like-count">${getLikes(item.id)}</span>
          </button>
        </div>
      </div>
      <button class="bookmark-btn card ${isBookmarked(item.id) ? 'bookmarked' : ''}" 
              onclick="toggleBookmark(event, '${item.id}')" 
              title="Bookmark">
        <svg class="bookmark-icon" viewBox="0 0 24 24">
          <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
        </svg>
      </button>
    </div>
  `;
}

// =====================================================
// MODIFY YOUR renderDetailPage FUNCTION
// This assumes you load data from grow.json
// =====================================================

async function renderDetailPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const type = urlParams.get('type');
  const id = urlParams.get('id'); // Using 'id' instead of 'slug' to match your JSON
  
  if (!type || !id) {
    showError('Content not found');
    return;
  }

  try {
    // Load the JSON data
    const response = await fetch(`data/${type}.json`);
    if (!response.ok) throw new Error('Data not found');
    
    const data = await response.json();
    const contentItem = data[type].find(item => item.id === id);
    
    if (!contentItem) {
      showError('Content not found');
      return;
    }
    
    // Check if this is an Allah name
    const allahName = getAllahNameFromContent(contentItem);
    
    const detailContainer = document.getElementById('detail-content');
    
    if (allahName) {
      // ===== ALLAH NAME DETAIL PAGE =====
      const previousName = allahName.number > 1 ? window.allahNames[allahName.number - 2] : null;
      const nextName = allahName.number < 99 ? window.allahNames[allahName.number] : null;
      
      // Find previous and next items in JSON
      const allNamesOfAllah = data[type].filter(item => hasCategory(item, "Names of Allah"));
      const currentIndex = allNamesOfAllah.findIndex(item => item.id === id);
      const prevItem = currentIndex > 0 ? allNamesOfAllah[currentIndex - 1] : null;
      const nextItem = currentIndex < allNamesOfAllah.length - 1 ? allNamesOfAllah[currentIndex + 1] : null;
      
      detailContainer.innerHTML = `
        <div class="content-detail">
          <!-- Beautiful Allah Name Hero Section -->
          <div class="allah-name-detail-hero">
            <div class="allah-name-detail-number">${allahName.number}</div>
            <div class="allah-name-detail-arabic">${allahName.arabic}</div>
            <div class="allah-name-detail-transliteration">${allahName.transliteration}</div>
            <div class="allah-name-detail-meaning">${allahName.meaning}</div>
            <div class="allah-name-detail-series">NAME ${allahName.number} OF 99</div>
          </div>
          
          <!-- Navigation between names -->
          <div class="allah-name-navigation">
            ${prevItem && previousName ? `
              <a href="detail.html?type=grow&id=${prevItem.id}" 
                 class="allah-nav-btn prev">
                <span>←</span>
                <div class="allah-nav-btn-content">
                  <span class="allah-nav-label">Previous Name</span>
                  <span class="allah-nav-name">${previousName.transliteration}</span>
                </div>
              </a>
            ` : '<div class="allah-nav-btn disabled"></div>'}
            
            ${nextItem && nextName ? `
              <a href="detail.html?type=grow&id=${nextItem.id}" 
                 class="allah-nav-btn next">
                <div class="allah-nav-btn-content">
                  <span class="allah-nav-label">Next Name</span>
                  <span class="allah-nav-name">${nextName.transliteration}</span>
                </div>
                <span>→</span>
              </a>
            ` : '<div class="allah-nav-btn disabled"></div>'}
          </div>
          
          <!-- Content Header -->
          <div class="content-header">
            <div class="content-meta">
              <span class="content-category">Names of Allah</span>
              <span class="content-date">${formatDate(contentItem.date)}</span>
            </div>
            <h1 class="content-title">${contentItem.title}</h1>
          </div>
          
          <!-- Content Body (from JSON content field) -->
          <div class="content-body">
            ${formatContent(contentItem.content)}
          </div>
          
          <!-- Actions Footer -->
          <div class="content-footer">
            <button onclick="history.back()" class="btn-back">
              ← Back to Grow
            </button>
            <div class="content-actions">
              <button class="like-btn" onclick="toggleLike(event, '${id}')">
                <svg class="heart-icon" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
                <span class="like-count">${getLikes(id)}</span>
              </button>
              
              <div class="share-wrapper">
                <button class="share-btn" onclick="toggleShareDropdown(event)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="18" cy="5" r="3"></circle>
                    <circle cx="6" cy="12" r="3"></circle>
                    <circle cx="18" cy="19" r="3"></circle>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                  </svg>
                  Share
                </button>
                <div class="share-dropdown">
                  <button class="share-option" onclick="shareContent('facebook', '${id}', '${contentItem.title}')">
                    📘 Facebook
                  </button>
                  <button class="share-option" onclick="shareContent('twitter', '${id}', '${contentItem.title}')">
                    🐦 Twitter
                  </button>
                  <button class="share-option" onclick="shareContent('whatsapp', '${id}', '${contentItem.title}')">
                    💬 WhatsApp
                  </button>
                  <button class="share-option" onclick="shareContent('copy', '${id}', '${contentItem.title}')">
                    🔗 Copy Link
                  </button>
                </div>
              </div>
              
              <button class="bookmark-btn ${isBookmarked(id) ? 'bookmarked' : ''}" 
                      onclick="toggleBookmark(event, '${id}')" 
                      title="Bookmark">
                <svg class="bookmark-icon" viewBox="0 0 24 24">
                  <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      `;
    } else {
      // ===== NORMAL DETAIL PAGE (your existing code) =====
      detailContainer.innerHTML = `
        <div class="content-detail">
          <div class="content-header">
            <div class="content-meta">
              <span class="content-category">${contentItem.category}</span>
              <span class="content-date">${formatDate(contentItem.date)}</span>
            </div>
            <h1 class="content-title">${contentItem.title}</h1>
          </div>
          
          ${contentItem.image ? `
            <div class="content-image">
              <img src="${contentItem.image}" alt="${contentItem.title}">
            </div>
          ` : ''}
          
          <div class="content-body">
            ${formatContent(contentItem.content)}
          </div>
          
          <div class="content-footer">
            <button onclick="history.back()" class="btn-back">
              ← Back
            </button>
            <div class="content-actions">
              <button class="like-btn" onclick="toggleLike(event, '${id}')">
                <svg class="heart-icon" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
                <span class="like-count">${getLikes(id)}</span>
              </button>
              <button class="bookmark-btn ${isBookmarked(id) ? 'bookmarked' : ''}" 
                      onclick="toggleBookmark(event, '${id}')" 
                      title="Bookmark">
                <svg class="bookmark-icon" viewBox="0 0 24 24">
                  <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      `;
    }
    
    // Initialize any special features
    if (typeof initializeDownloadButtons === 'function') {
      initializeDownloadButtons();
    }
    
    // Load related content
    loadRelatedContent(type, contentItem.category, id);
    
  } catch (error) {
    console.error('Error loading content:', error);
    showError('Failed to load content');
  }
}

// =====================================================
// HELPER FUNCTION: Format content text with line breaks
// =====================================================

function formatContent(content) {
  if (!content) return '';
  
  // Convert line breaks to HTML
  // Split by double line breaks for paragraphs
  const paragraphs = content.split('\n\n');
  
  return paragraphs.map(para => {
    // Convert single line breaks within paragraphs to <br>
    const formatted = para.replace(/\n/g, '<br>');
    
    // Check if it's a heading (starts with ##)
    if (formatted.startsWith('## ')) {
      return `<h2>${formatted.substring(3)}</h2>`;
    }
    
    // Check for bullet points
    if (formatted.includes('✅') || formatted.includes('🌟') || formatted.includes('✨')) {
      return `<p class="highlight-text">${formatted}</p>`;
    }
    
    // Regular paragraph
    return `<p>${formatted}</p>`;
  }).join('\n');
}

// =====================================================
// OPTIONAL: Add this to your existing code if you want
// to automatically create more Names of Allah entries
// =====================================================

function generateAllahNamesJSON() {
  if (!window.allahNames) {
    console.error('allahNames data not loaded');
    return;
  }
  
  const jsonEntries = window.allahNames.map(name => {
    const slug = name.transliteration.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    return {
      id: `${name.number}-${slug}`,
      title: `${name.transliteration} - ${name.meaning}`,
      section: "grow",
      category: "Names of Allah",
      date: "2026-01-05",
      image: "",
      content: `## Understanding ${name.transliteration}\n\n${name.transliteration} (${name.arabic}) is one of the beautiful 99 Names of Allah. It means "${name.meaning}".\n\n### What Does It Mean?\n\n[Add explanation of the name's meaning and significance]\n\n### In the Quran\n\n[Add references to where this name appears]\n\n### How This Helps Us\n\nWhen we learn about ${name.transliteration}, we understand that:\n✅ [First lesson]\n✅ [Second lesson]\n✅ [Third lesson]\n\n### Remember\n\n🤲 Ya Allah, help us understand and live by Your beautiful name ${name.transliteration}. Ameen.`,
      published: true
    };
  });
  
  console.log(JSON.stringify(jsonEntries, null, 2));
  console.log('\n✅ Copy this and add to your grow.json file!');
}

// Uncomment to generate JSON entries:
// generateAllahNamesJSON();
// Helper function to check if content is an Allah name
function isAllahNameContent(item) {
  return item && hasCategory(item, "Names of Allah");
}

// Helper function to get Allah name data from content
function getAllahNameFromContent(contentItem) {
  if (!contentItem || !hasCategory(contentItem, "Names of Allah")) {
    return null;
  }
  
  // Check if allahNames data is available
  if (!window.allahNames) {
    console.warn('⚠️ allahNames data not loaded!');
    return null;
  }
  
  const title = contentItem.title.toLowerCase();
  
  // Try to match by title
  const allahName = window.allahNames.find(name => {
    const transLower = name.transliteration.toLowerCase();
    
    // Direct match
    if (title.includes(transLower)) {
      return true;
    }
    
    // Match "Allah" specifically
    if (title === 'allah' || title.includes('allah') && name.transliteration === 'Allah') {
      return true;
    }
    
    // Match Al-Ahad
    if (title.includes('ahad') && transLower.includes('ahad')) {
      return true;
    }
    
    // Match Al-A'la
    if (title.includes("a'la") || title.includes('ala') && transLower.includes('ali')) {
      return true;
    }
    
    return false;
  });
  
  if (allahName) {
    console.log('✅ Matched:', contentItem.title, '→', allahName.transliteration);
  } else {
    console.warn('⚠️ Could not match:', contentItem.title);
  }
  
  return allahName;
}


// Page Renderers
function renderHomePage() {
  renderSection('featured-inspire', state.inspire.slice(0, 3), createInspireCard);
  renderSection('featured-grow', state.grow.slice(0, 3), createGrowCard);
  renderSection('featured-create', state.create.slice(0, 3), createCreateCard);
  if (state.categories) {
    renderCategories('inspire-categories-grid', state.categories.inspire, state.inspire.length, 'inspire');
    renderCategories('grow-categories-grid', state.categories.grow, state.grow.length, 'grow');
    renderCategories('create-categories-grid', state.categories.create, state.create.length, 'create');
  }
  // Render latest content from all sections
  renderLatestContent();
}

function renderLatestContent() {
  var el = document.getElementById('latest-content');
  if (!el) return;

  // Combine all content with their type
  var allContent = [];
  state.inspire.forEach(function(item) { allContent.push({ item: item, type: 'inspire' }); });
  state.grow.forEach(function(item) { allContent.push({ item: item, type: 'grow' }); });
  state.create.forEach(function(item) { allContent.push({ item: item, type: 'create' }); });

  // Sort by date (newest first)
  allContent.sort(function(a, b) {
    return new Date(b.item.date || 0) - new Date(a.item.date || 0);
  });

  // Take the latest 6 items
  var latest = allContent.slice(0, 6);

  // Render with appropriate card function
  var html = latest.map(function(entry) {
    if (entry.type === 'inspire') return createInspireCard(entry.item);
    if (entry.type === 'grow') return createGrowCard(entry.item);
    return createCreateCard(entry.item);
  }).join('');

  el.innerHTML = html;
}

function renderSection(id, items, fn) {
  var el = document.getElementById(id);
  if (el && items.length) el.innerHTML = items.map(fn).join('');
}

function renderInspirePage() {
  initFilterFromURL();
  renderCategories('inspire-categories-container', state.categories.inspire, state.inspire.length, 'inspire');
  renderFilteredInspire();
}

function renderGrowPage() {
  initFilterFromURL();
  renderCategories('grow-categories-container', state.categories.grow, state.grow.length, 'grow');
  renderFilteredGrow();
}

function renderCreatePage() {
  initFilterFromURL();
  renderCategories('create-categories-container', state.categories.create, state.create.length, 'create');
  renderFilteredCreate();
}

function renderDetailPage() {
  var id = new URLSearchParams(window.location.search).get('id');
  if (!id) return showNotFound();
  var result = findItemById(id);
  if (!result.item) return showNotFound();
  document.title = result.item.title + ' | ' + (window.SITE_CONFIG ? window.SITE_CONFIG.name : 'The Tranquil Heart Kids');
  updatePageMeta(result.item);
  renderDetailContent(result.item, result.contentType);
  renderRelatedContent(result.item, result.contentType);
}

// SEO: Update page meta tags dynamically for detail pages
function updatePageMeta(item) {
  if (!item) return;

  var siteConfig = window.SITE_CONFIG || {};
  var seoConfig = siteConfig.seo || {};
  var siteUrl = seoConfig.siteUrl || 'https://kids.thetranquilheart.com';
  var siteName = siteConfig.name || 'The Tranquil Heart Kids';
  var defaultImage = siteUrl + '/' + (seoConfig.defaultImage || 'images/og-default.webp');

  // Create description from content (first 160 chars)
  var description = item.content ? item.content.replace(/[#*_>`\[\]\n]+/g, ' ').trim().substring(0, 160) + '...' : siteConfig.description || '';

  // Get the full title
  var fullTitle = item.title + ' | ' + siteName;

  // Get image URL
  var imageUrl = item.image ? (item.image.startsWith('http') ? item.image : siteUrl + '/' + item.image) : defaultImage;

  // Get page URL
  var pageUrl = siteUrl + '/detail.html?id=' + item.id;

  // Update meta description
  var metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute('content', description);

  // Update canonical URL
  var canonical = document.getElementById('canonical-url');
  if (canonical) canonical.setAttribute('href', pageUrl);

  // Update Open Graph tags
  var ogTitle = document.getElementById('og-title');
  if (ogTitle) ogTitle.setAttribute('content', fullTitle);

  var ogDesc = document.getElementById('og-description');
  if (ogDesc) ogDesc.setAttribute('content', description);

  var ogUrl = document.getElementById('og-url');
  if (ogUrl) ogUrl.setAttribute('content', pageUrl);

  var ogImage = document.getElementById('og-image');
  if (ogImage) ogImage.setAttribute('content', imageUrl);

  // Update Twitter Card tags
  var twitterTitle = document.getElementById('twitter-title');
  if (twitterTitle) twitterTitle.setAttribute('content', fullTitle);

  var twitterDesc = document.getElementById('twitter-description');
  if (twitterDesc) twitterDesc.setAttribute('content', description);

  var twitterImage = document.getElementById('twitter-image');
  if (twitterImage) twitterImage.setAttribute('content', imageUrl);

  // Update structured data
  var structuredData = document.getElementById('structured-data');
  if (structuredData) {
    var schemaData = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": item.title,
      "description": description,
      "image": imageUrl,
      "datePublished": item.date || new Date().toISOString().split('T')[0],
      "publisher": {
        "@type": "Organization",
        "name": siteName,
        "logo": {
          "@type": "ImageObject",
          "url": siteUrl + "/images/favicon.svg"
        }
      },
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": pageUrl
      }
    };
    structuredData.textContent = JSON.stringify(schemaData, null, 2);
  }
}

function renderBookmarksPage() {
  var el = document.getElementById('bookmarks-container');
  if (!el) return;
  var bm = BookmarkSystem.getBookmarkedItems();
  if (bm.total === 0) {
    el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔖</div><h3>No bookmarks yet</h3><p>Save your favorite content by clicking the bookmark icon.</p><div style="margin-top:24px"><a href="inspire.html" class="btn btn-primary">Browse Inspire</a> <a href="grow.html" class="btn btn-secondary">Browse Grow</a></div></div>';
    return;
  }
  var html = '';
  if (bm.inspire.length) html += '<div class="section"><h2 class="section-title">📖 Saved Inspire</h2><div class="inspire-grid">' + bm.inspire.map(createInspireCard).join('') + '</div></div>';
  if (bm.grow.length) html += '<div class="section"><h2 class="section-title">🌱 Saved Grow</h2><div class="grow-grid">' + bm.grow.map(createGrowCard).join('') + '</div></div>';
  if (bm.create.length) html += '<div class="section"><h2 class="section-title">✨ Saved Create</h2><div class="create-grid">' + bm.create.map(createCreateCard).join('') + '</div></div>';
  el.innerHTML = html;
}

// Filtering
function initFilterFromURL() {
  state.currentFilter = new URLSearchParams(window.location.search).get('category') || 'all';
}

function renderCategories(id, cats, total, type) {
  var el = document.getElementById(id);
  if (!el) return;
  var names = { inspire: 'Inspire', grow: 'Grow', create: 'Create' };
  var icons = { inspire: '📚', grow: '🌱', create: '✨' };
  var isHomePage = id.endsWith('-grid'); // Home page uses -grid, listing pages use -container
  var all = [{ id: 'all', name: 'All ' + names[type], icon: icons[type], count: total }].concat(cats || []);

  el.innerHTML = all.map(function(c) {
    if (isHomePage) {
      // On home page, render as links that navigate to the listing page
      var href = type + '.html' + (c.id === 'all' ? '' : '?category=' + c.id);
      return '<a href="' + href + '" class="category-btn"><span class="category-icon">' + c.icon + '</span><span class="category-name">' + c.name + '</span><span class="category-count">' + c.count + '</span></a>';
    } else {
      // On listing pages, render as filter buttons
      return '<button class="category-btn ' + (state.currentFilter === c.id ? 'active' : '') + '" data-category="' + c.id + '" onclick="filter' + type.charAt(0).toUpperCase() + type.slice(1) + '(\'' + c.id + '\')"><span class="category-icon">' + c.icon + '</span><span class="category-name">' + c.name + '</span><span class="category-count">' + c.count + '</span></button>';
    }
  }).join('');
}

function filterInspire(id) { applyFilter(id); currentPage.inspire = 1; renderFilteredInspire(); }
function filterGrow(id) { applyFilter(id); currentPage.grow = 1; renderFilteredGrow(); }
function filterCreate(id) { applyFilter(id); currentPage.create = 1; renderFilteredCreate(); }

function applyFilter(id) {
  state.currentFilter = id;
  var url = new URL(window.location);
  if (id === 'all') url.searchParams.delete('category');
  else url.searchParams.set('category', id);
  window.history.pushState({}, '', url);
  document.querySelectorAll('.category-btn').forEach(function(b) {
    b.classList.toggle('active', b.dataset.category === id);
  });
}

// Pagination
var itemsPerPage = 12;
var currentPage = { inspire: 1, grow: 1, create: 1 };

function renderFilteredInspire() {
  var items = getFiltered(state.inspire, state.categories.inspire);
  renderPaginated(items, 'inspire-list-container', createInspireCard, 'inspire', 'goToInspirePage');
}

function renderFilteredGrow() {
  var items = getFiltered(state.grow, state.categories.grow);
  renderPaginated(items, 'grow-list-container', createGrowCard, 'grow', 'goToGrowPage');
}

function renderFilteredCreate() {
  var items = getFiltered(state.create, state.categories.create);
  renderPaginated(items, 'create-list-container', createCreateCard, 'create', 'goToCreatePage');
}

function getFiltered(items, cats) {
  if (state.currentFilter === 'all') return items;
  var cat = cats ? cats.find(function(c) { return c.id === state.currentFilter; }) : null;
  if (cat) return items.filter(function(i) { return hasCategory(i, cat.name); });
  return items;
}

function renderPaginated(items, id, fn, type, pageFn) {
  var el = document.getElementById(id);
  if (!el) return;
  if (!items.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">' + (type === 'inspire' ? '📖' : type === 'grow' ? '🌱' : '✨') + '</div><h3>No items found</h3></div>';
    return;
  }
  var page = currentPage[type];
  var total = Math.ceil(items.length / itemsPerPage);
  var start = (page - 1) * itemsPerPage;
  var pageItems = items.slice(start, start + itemsPerPage);
  var paginationHtml = '';
  if (total > 1) {
    paginationHtml = '<div class="pagination">';
    if (page > 1) paginationHtml += '<button class="pagination-btn" onclick="' + pageFn + '(' + (page - 1) + ')">← Previous</button>';
    paginationHtml += '<div class="pagination-numbers">';
    for (var i = 1; i <= total; i++) {
      if (i === 1 || i === total || (i >= page - 1 && i <= page + 1)) {
        paginationHtml += '<button class="pagination-number ' + (i === page ? 'active' : '') + '" onclick="' + pageFn + '(' + i + ')">' + i + '</button>';
      } else if (i === page - 2 || i === page + 2) {
        paginationHtml += '<span class="pagination-ellipsis">...</span>';
      }
    }
    paginationHtml += '</div>';
    if (page < total) paginationHtml += '<button class="pagination-btn" onclick="' + pageFn + '(' + (page + 1) + ')">Next →</button>';
    paginationHtml += '</div><div class="pagination-info">Page ' + page + ' of ' + total + '</div>';
  }
  el.innerHTML = '<div class="' + type + '-grid">' + pageItems.map(fn).join('') + '</div>' + paginationHtml;
}

function goToInspirePage(p) { currentPage.inspire = p; renderFilteredInspire(); window.scrollTo({ top: 300, behavior: 'smooth' }); }
function goToGrowPage(p) { currentPage.grow = p; renderFilteredGrow(); window.scrollTo({ top: 300, behavior: 'smooth' }); }
function goToCreatePage(p) { currentPage.create = p; renderFilteredCreate(); window.scrollTo({ top: 300, behavior: 'smooth' }); }

// Card Creators
function createInspireCard(item) {
  var primaryCat = getPrimaryCategory(item);
  var cat = state.categories.inspire ? state.categories.inspire.find(function(c) { return hasCategory(item, c.name); }) : null;
  var url = 'detail.html?id=' + item.id;
  var icon = cat ? cat.icon : '📖';
  var readingTime = calculateReadingTime(item.content);
  var imageHtml = item.image
    ? '<img src="' + escapeHtml(item.image) + '" alt="' + escapeHtml(item.title) + '" class="inspire-card-img" loading="lazy">'
    : '<div class="inspire-card-placeholder"><span>' + icon + '</span></div>';
  return '<article class="inspire-card" data-category="' + escapeHtml(primaryCat || '') + '">' +
    '<a href="' + url + '" class="inspire-card-link">' +
    '<div class="inspire-card-image">' + BookmarkSystem.createButton(item.id, 'card') +
    imageHtml + '</div>' +
    '<div class="inspire-card-content">' +
    '<div class="inspire-card-meta">' +
    '<span class="inspire-card-category">' + icon + ' ' + escapeHtml(primaryCat || 'Inspire') + '</span>' +
    '<span class="reading-time">⏱️ ' + readingTime + ' min</span>' +
    '</div>' +
    '<h3 class="inspire-card-title">' + escapeHtml(item.title) + '</h3>' +
    '<p class="inspire-card-excerpt">' + escapeHtml(getExcerpt(item.content, 120)) + '</p></div></a>' +
    '<div class="inspire-card-footer">' +
    '<div class="card-actions">' + (hasQuiz(item) ? QuizSystem.createQuizButton(item.id) : '') +
    LikeSystem.createButton(item.id, 'small') + ShareSystem.createButton(item.title, url) + '</div></div></article>';
}

function createGrowCard(item) {
  var primaryCat = getPrimaryCategory(item);
  var cat = state.categories.grow ? state.categories.grow.find(function(c) { return hasCategory(item, c.name); }) : null;
  var url = 'detail.html?id=' + item.id;
  var icon = cat ? cat.icon : '🌱';
  var readingTime = calculateReadingTime(item.content);
  var isAllahName = hasCategory(item, 'Names of Allah');
  var categoryId = cat ? cat.id : '';
  var itemImage = getItemImage(item, state.categories.grow);
  var imageHtml;
  var dataAttr = ' data-grow-category="' + categoryId + '"';

  if (isAllahName) {
    var allahName = findAllahName(item.title);
    dataAttr += ' data-allah-name="true"';
    imageHtml = '<div class="grow-card-placeholder">' +
      (allahName && allahName.number ? '<span class="allah-name-number">' + allahName.number + '</span>' : '') +
      '<span class="allah-name-arabic">' + (allahName ? allahName.arabic : '') + '</span>' +
      '<span class="allah-name-transliteration">' + (allahName ? allahName.transliteration : escapeHtml(item.title)) + '</span>' +
      '<span class="allah-name-meaning">' + (allahName ? allahName.meaning : '') + '</span>' +
      '</div>';
  } else if (itemImage) {
    imageHtml = '<img src="' + escapeHtml(itemImage) + '" alt="' + escapeHtml(item.title) + '" class="grow-card-img" loading="lazy">';
  } else {
    imageHtml = '<div class="grow-card-placeholder grow-category-styled">' +
      '<span class="grow-category-icon">' + icon + '</span>' +
      '<span class="grow-category-name">' + escapeHtml(primaryCat || 'Grow') + '</span>' +
      '</div>';
  }
  return '<article class="grow-card"' + dataAttr + ' data-category="' + escapeHtml(primaryCat || '') + '">' +
    '<a href="' + url + '" class="grow-card-link">' +
    '<div class="grow-card-image">' + BookmarkSystem.createButton(item.id, 'card') +
    imageHtml + '</div>' +
    '<div class="grow-card-content">' +
    '<div class="grow-card-meta">' +
    '<span class="grow-card-category">' + icon + ' ' + escapeHtml(primaryCat || 'Grow') + '</span>' +
    '<span class="reading-time">⏱️ ' + readingTime + ' min</span>' +
    '</div>' +
    '<h3 class="grow-card-title">' + escapeHtml(item.title) + '</h3>' +
    '<p class="grow-card-excerpt">' + escapeHtml(getExcerpt(item.content, 100)) + '</p></div></a>' +
    '<div class="grow-card-footer">' +
    '<div class="card-actions">' + LikeSystem.createButton(item.id, 'small') + ShareSystem.createButton(item.title, url) + '</div></div></article>';
}

function createCreateCard(item) {
  var primaryCat = getPrimaryCategory(item);
  var cat = state.categories.create ? state.categories.create.find(function(c) { return hasCategory(item, c.name); }) : null;
  var url = 'detail.html?id=' + item.id;
  var icon = cat ? cat.icon : '✨';
  var readingTime = calculateReadingTime(item.content);
  var imageHtml = item.image
    ? '<img src="' + escapeHtml(item.image) + '" alt="' + escapeHtml(item.title) + '" class="create-card-img" loading="lazy">'
    : '<div class="create-card-placeholder"><span>' + icon + '</span></div>';
  return '<article class="create-card" data-category="' + escapeHtml(primaryCat || '') + '">' +
    '<a href="' + url + '" class="create-card-link">' +
    '<div class="create-card-image">' + BookmarkSystem.createButton(item.id, 'card') +
    imageHtml + '</div>' +
    '<div class="create-card-content">' +
    '<div class="create-card-meta">' +
    '<span class="create-card-category">' + icon + ' ' + escapeHtml(primaryCat || 'Create') + '</span>' +
    '<span class="reading-time">⏱️ ' + readingTime + ' min</span>' +
    '</div>' +
    '<h3 class="create-card-title">' + escapeHtml(item.title) + '</h3>' +
    '<p class="create-card-excerpt">' + escapeHtml(getExcerpt(item.content, 100)) + '</p></div></a>' +
    '<div class="create-card-footer">' +
    '<div class="card-actions">' + LikeSystem.createButton(item.id, 'small') + ShareSystem.createButton(item.title, url) + '</div></div></article>';
}

// ========== DOWNLOAD SYSTEM ==========
var DownloadSystem = {
  currentItem: null,
  
  downloadImage: function(dataUrl, filename) {
    try {
      var link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Downloaded ' + filename + ' ✓');
    } catch (e) {
      console.error('Download error:', e);
      showToast('Download failed. Please try again.');
    }
  },
  
  downloadAllImages: function() {
    if (!this.currentItem || !this.currentItem.images || !this.currentItem.images.length) {
      showToast('No images to download');
      return;
    }
    
    var images = this.currentItem.images;
    var btn = document.querySelector('.download-all-btn');
    
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<svg class="spinner" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle></svg> Downloading...';
    }
    
    var self = this;
    images.forEach(function(img, index) {
      setTimeout(function() {
        self.downloadImage(img.data, img.name);
        
        if (index === images.length - 1 && btn) {
          setTimeout(function() {
            btn.disabled = false;
            btn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> Download All Images <span class="download-count">(' + images.length + ')</span>';
            showToast('All ' + images.length + ' images downloaded! 🎉');
          }, 500);
        }
      }, index * 350);
    });
  },
  
  processImagesInContent: function(content, images) {
    if (!images || !images.length) return content;
    
    var processed = content;
    for (var i = 0; i < images.length; i++) {
      var placeholder = '[IMAGE:' + i + ']';
      var imgHtml = '<div class="image-container">' +
        '<img src="' + images[i].data + '" alt="' + escapeHtml(images[i].name) + '" class="content-image" loading="lazy">' +
        '<button class="download-btn" onclick="DownloadSystem.downloadImage(\'' + escapeQuotes(images[i].data) + '\', \'' + escapeQuotes(images[i].name) + '\')" title="Download ' + escapeHtml(images[i].name) + '">' +
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">' +
        '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>' +
        '<polyline points="7 10 12 15 17 10"></polyline>' +
        '<line x1="12" y1="15" x2="12" y2="3"></line>' +
        '</svg> Download' +
        '</button>' +
        '</div>';
      processed = processed.split(placeholder).join(imgHtml);
    }
    return processed;
  },
  
  createDownloadAllButton: function(images) {
    if (!images || images.length < 2) return '';
    
    return '<div class="download-all-container">' +
      '<button class="download-all-btn" onclick="DownloadSystem.downloadAllImages()">' +
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">' +
      '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>' +
      '<polyline points="7 10 12 15 17 10"></polyline>' +
      '<line x1="12" y1="15" x2="12" y2="3"></line>' +
      '</svg> Download All Images <span class="download-count">(' + images.length + ')</span>' +
      '</button>' +
      '</div>';
  }
};

// Detail Page (Enhanced with Downloads)
function findItemById(id) {
  var item = state.inspire.find(function(i) { return i.id === id; });
  if (item) return { item: item, contentType: 'inspire' };
  item = state.grow.find(function(i) { return i.id === id; });
  if (item) return { item: item, contentType: 'grow' };
  item = state.create.find(function(i) { return i.id === id; });
  if (item) return { item: item, contentType: 'create' };
  return { item: null, contentType: null };
}
function renderDetailContent(item, type) {
  var el = document.getElementById('detail-content');
  if (!el) return;

  DownloadSystem.currentItem = item;

  var primaryCat = getPrimaryCategory(item);
  var cats = type === 'inspire' ? state.categories.inspire : type === 'grow' ? state.categories.grow : state.categories.create;
  var cat = cats ? cats.find(function(c) { return hasCategory(item, c.name); }) : null;
  var icon = cat ? cat.icon : '📖';

  var processedContent = renderMarkdown(item.content || '');
  if (item.images && item.images.length > 0) {
    processedContent = DownloadSystem.processImagesInContent(processedContent, item.images);
  }

  var downloadAllBtn = DownloadSystem.createDownloadAllButton(item.images);

  // Check if this is Names of Allah category
  var isAllahName = hasCategory(item, 'Names of Allah');
  var headerHtml = '';

  if (isAllahName) {
    var allahName = findAllahName(item.title);
    headerHtml = '<div class="allah-name-detail-header">' +
      (allahName && allahName.number ? '<span class="allah-name-detail-number">' + allahName.number + '</span>' : '') +
      '<span class="allah-name-detail-arabic">' + (allahName ? allahName.arabic : '') + '</span>' +
      '<span class="allah-name-detail-transliteration">' + (allahName ? allahName.transliteration : '') + '</span>' +
      '<span class="allah-name-detail-meaning">' + (allahName ? allahName.meaning : '') + '</span>' +
      '</div>';
  } else {
    // Add featured image if it exists (not for Names of Allah)
    headerHtml = item.image ? '<div class="content-header-image"><img src="' + escapeHtml(item.image) + '" alt="' + escapeHtml(item.title) + '" class="content-featured-image"></div>' : '';
  }

  el.innerHTML = '<article class="content-detail">' +
    headerHtml +
    '<header class="content-header"><div class="content-meta"><span class="content-category">' + icon + ' ' + escapeHtml(primaryCat || 'Uncategorized') + '</span>' +
    (item.date ? '<span class="content-date">' + formatDate(item.date) + '</span>' : '') + '</div>' +
    (isAllahName ? '' : '<h1 class="content-title">' + escapeHtml(item.title) + '</h1>') +
    downloadAllBtn +
    '</header>' +
    '<div class="content-body">' + processedContent + '</div>' +
    (hasQuiz(item) ? '<div class="content-quiz-section"><div class="quiz-cta"><div class="quiz-cta-icon">🧠</div><div class="quiz-cta-text"><h3>Test Your Knowledge!</h3><p>Take a fun quiz about this story.</p></div><button class="btn btn-primary" onclick="QuizSystem.startQuiz(\'' + item.id + '\')">✨ Start Quiz</button></div></div>' : '') +
    '<footer class="content-footer"><div class="content-actions">' +
    BookmarkSystem.createButton(item.id) + LikeSystem.createButton(item.id) + ShareSystem.createButton(item.title, window.location.href) +
    '</div><a href="' + type + '.html" class="btn btn-back">← Back to ' + type.charAt(0).toUpperCase() + type.slice(1) + '</a></footer></article>';
}

function renderRelatedContent(current, type) {
  var el = document.getElementById('related-content');
  if (!el) return;
  var items = type === 'inspire' ? state.inspire : type === 'grow' ? state.grow : state.create;

  // Get items that share at least one category with current item
  var currentCats = getCategories(current);
  var sameCategory = items.filter(function(i) {
    var itemCats = getCategories(i);
    return currentCats.some(function(c) { return itemCats.indexOf(c) !== -1; });
  });
  var currentIndex = sameCategory.findIndex(function(i) { return i.id === current.id; });

  // Get previous and next items
  var prevItem = currentIndex > 0 ? sameCategory[currentIndex - 1] : null;
  var nextItem = currentIndex < sameCategory.length - 1 ? sameCategory[currentIndex + 1] : null;

  // Build prev/next navigation
  var navHtml = '';
  if (prevItem || nextItem) {
    navHtml = '<div class="prev-next-nav">';
    if (prevItem) {
      navHtml += '<a href="detail.html?id=' + prevItem.id + '" class="prev-next-link prev-link">' +
        '<span class="prev-next-label">← Previous</span>' +
        '<span class="prev-next-title">' + escapeHtml(prevItem.title) + '</span></a>';
    } else {
      navHtml += '<div class="prev-next-link prev-link empty"></div>';
    }
    if (nextItem) {
      navHtml += '<a href="detail.html?id=' + nextItem.id + '" class="prev-next-link next-link">' +
        '<span class="prev-next-label">Next →</span>' +
        '<span class="prev-next-title">' + escapeHtml(nextItem.title) + '</span></a>';
    } else {
      navHtml += '<div class="prev-next-link next-link empty"></div>';
    }
    navHtml += '</div>';
  }

  // Get related items (excluding current, prev, next)
  var excludeIds = [current.id];
  if (prevItem) excludeIds.push(prevItem.id);
  if (nextItem) excludeIds.push(nextItem.id);
  var related = sameCategory.filter(function(i) { return excludeIds.indexOf(i.id) === -1; }).slice(0, 3);

  var fn = type === 'inspire' ? createInspireCard : type === 'grow' ? createGrowCard : createCreateCard;
  var relatedHtml = related.length ? '<h3>More in ' + escapeHtml(current.category) + '</h3><div class="related-grid">' + related.map(fn).join('') + '</div>' : '';

  if (!navHtml && !relatedHtml) { el.style.display = 'none'; return; }
  el.innerHTML = navHtml + relatedHtml;
}

function showNotFound() {
  var el = document.getElementById('detail-content');
  if (el) el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔍</div><h3>Content not found</h3><a href="index.html" class="btn btn-primary">Go Home</a></div>';
}

function hasQuiz(item) {
  return item && item.quiz && item.quiz.length > 0;
}

// Search
function initSearch() {
  var toggle = document.querySelector('.search-toggle');
  var overlay = document.querySelector('.search-overlay');
  var input = document.querySelector('.search-input');
  var close = document.querySelector('.search-close');
  if (!toggle || !overlay) return;
  toggle.addEventListener('click', function() { overlay.classList.add('open'); if (input) input.focus(); });
  if (close) close.addEventListener('click', function() { overlay.classList.remove('open'); });
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.classList.remove('open'); });
  document.addEventListener('keydown', function(e) { if (e.key === 'Escape') overlay.classList.remove('open'); });
  if (input) input.addEventListener('input', function(e) { performSearch(e.target.value); });
}

function performSearch(query) {
  var results = document.querySelector('.search-results');
  if (!results) return;
  var q = query.toLowerCase().trim();
  if (!q) { results.innerHTML = ''; return; }
  var r = {
    inspire: searchItems(state.inspire, q),
    grow: searchItems(state.grow, q),
    create: searchItems(state.create, q)
  };
  if (r.inspire.length || r.grow.length || r.create.length) {
    results.innerHTML = createSearchSection('Inspire', r.inspire, '📖') + createSearchSection('Grow', r.grow, '🌱') + createSearchSection('Create', r.create, '✨');
  } else {
    results.innerHTML = '<div class="search-no-results"><p>No results for "' + escapeHtml(q) + '"</p></div>';
  }
}

function searchItems(items, q) {
  return items.filter(function(i) {
    if (i.title.toLowerCase().includes(q)) return true;
    if (i.content && i.content.toLowerCase().includes(q)) return true;
    if (i.tags && Array.isArray(i.tags)) {
      for (var t = 0; t < i.tags.length; t++) {
        if (i.tags[t].toLowerCase().includes(q)) return true;
      }
    }
    return false;
  }).slice(0, 5);
}

function createSearchSection(title, items, icon) {
  if (!items.length) return '';
  return '<div class="search-section"><h4>' + title + '</h4>' + items.map(function(i) {
    return '<a href="detail.html?id=' + i.id + '" class="search-result-item"><span>' + icon + '</span><span>' + escapeHtml(i.title) + '</span></a>';
  }).join('') + '</div>';
}

// Dark Mode
function initDarkMode() {
  var toggle = document.querySelector('.dark-mode-toggle');
  if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
  }
  if (toggle) toggle.addEventListener('click', toggleDarkMode);
}

function toggleDarkMode() {
  var isDark = document.body.classList.toggle('dark-mode');
  localStorage.setItem('darkMode', isDark);
}

// Font Size
function initFontSize() {
  var saved = localStorage.getItem('fontSize') || 'md';
  setFontSize(saved);

  // Use event delegation for font toggle button
  document.addEventListener('click', function(e) {
    var toggleBtn = e.target.closest('.font-size-toggle .action-btn');
    var dropdown = document.querySelector('.font-size-dropdown');

    if (toggleBtn) {
      e.stopPropagation();
      e.preventDefault();
      if (dropdown) dropdown.classList.toggle('open');
      return;
    }

    var option = e.target.closest('.font-size-option');
    if (option) {
      e.stopPropagation();
      var size = option.dataset.size;
      setFontSize(size);
      localStorage.setItem('fontSize', size);
      if (dropdown) dropdown.classList.remove('open');
      return;
    }

    // Close dropdown when clicking outside
    if (dropdown && !e.target.closest('.font-size-toggle')) {
      dropdown.classList.remove('open');
    }
  });
}

function setFontSize(size) {
  document.documentElement.classList.remove('font-size-sm', 'font-size-md', 'font-size-lg');
  document.documentElement.classList.add('font-size-' + size);
  document.querySelectorAll('.font-size-option').forEach(function(opt) {
    opt.classList.toggle('active', opt.dataset.size === size);
  });
}

// Mobile Menu
function initMobileMenu() {
  var toggle = document.querySelector('.mobile-menu-toggle');
  var menu = document.querySelector('.nav-main');
  if (toggle && menu) {
    toggle.addEventListener('click', function() {
      menu.classList.toggle('open');
    });
  }
}

// Like System
var LikeSystem = {
  STORAGE_KEY: 'tranquil_likes',
  getLikes: function() { return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}'); },
  saveLikes: function(l) { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(l)); },
  getCount: function(id) {
    var l = this.getLikes();
    if (!l[id]) { l[id] = { count: Math.floor(Math.random() * 50) + 10, liked: false }; this.saveLikes(l); }
    return l[id];
  },
  toggle: function(id, btn) {
    var l = this.getLikes();
    if (!l[id]) l[id] = { count: Math.floor(Math.random() * 50) + 10, liked: false };
    if (l[id].liked) { l[id].count--; l[id].liked = false; btn.classList.remove('liked'); }
    else { l[id].count++; l[id].liked = true; btn.classList.add('liked'); }
    this.saveLikes(l);
    var c = btn.querySelector('.like-count');
    if (c) c.textContent = l[id].count;
  },
  createButton: function(id, size) {
    var d = this.getCount(id);
    return '<button class="like-btn ' + (size || '') + ' ' + (d.liked ? 'liked' : '') + '" onclick="LikeSystem.toggle(\'' + id + '\', this); event.preventDefault(); event.stopPropagation();"><svg class="heart-icon" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg><span class="like-count">' + d.count + '</span></button>';
  }
};

// Bookmark System
var BookmarkSystem = {
  STORAGE_KEY: 'tranquil_bookmarks',
  getBookmarks: function() { return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]'); },
  saveBookmarks: function(b) { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(b)); },
  isBookmarked: function(id) { return this.getBookmarks().includes(id); },
  toggle: function(id, btn) {
    var b = this.getBookmarks();
    if (b.includes(id)) {
      b = b.filter(function(x) { return x !== id; });
      btn.classList.remove('bookmarked');
      showToast('Removed from bookmarks');
    } else {
      b.push(id);
      btn.classList.add('bookmarked');
      showToast('Added to bookmarks!');
    }
    this.saveBookmarks(b);
    this.updateBookmarkCount();
  },
  updateBookmarkCount: function() {
    var el = document.querySelector('.bookmark-count');
    if (el) {
      var c = this.getBookmarks().length;
      el.textContent = c;
      el.style.display = c > 0 ? 'flex' : 'none';
    }
  },
  getBookmarkedItems: function() {
    var ids = this.getBookmarks();
    return {
      inspire: state.inspire.filter(function(i) { return ids.includes(i.id); }),
      grow: state.grow.filter(function(i) { return ids.includes(i.id); }),
      create: state.create.filter(function(i) { return ids.includes(i.id); }),
      get total() { return this.inspire.length + this.grow.length + this.create.length; }
    };
  },
  createButton: function(id, size) {
    var bm = this.isBookmarked(id);
    return '<button class="bookmark-btn ' + (size || '') + ' ' + (bm ? 'bookmarked' : '') + '" onclick="BookmarkSystem.toggle(\'' + id + '\', this); event.preventDefault(); event.stopPropagation();" title="' + (bm ? 'Remove bookmark' : 'Add bookmark') + '"><svg class="bookmark-icon" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg></button>';
  }
};

// Quiz System
var QuizSystem = {
  currentQuiz: null,
  currentQuestion: 0,
  score: 0,
  createQuizButton: function(id) {
    return '<button class="quiz-btn" onclick="QuizSystem.startQuiz(\'' + id + '\'); event.preventDefault(); event.stopPropagation();"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>Quiz</button>';
  },
  startQuiz: function(id) {
    var result = findItemById(id);
    if (!result.item || !result.item.quiz) return;
    this.currentQuiz = result.item;
    this.currentQuestion = 0;
    this.score = 0;
    this.showModal();
    this.renderQuestion();
  },
  showModal: function() {
    var modal = document.querySelector('.quiz-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'quiz-modal';
      modal.innerHTML = '<div class="quiz-modal-content"><div class="quiz-header"><h2 class="quiz-title">🧠 Quiz Time!</h2><button class="quiz-close" onclick="QuizSystem.closeQuiz()">×</button></div><div class="quiz-progress"><div class="quiz-progress-bar"></div></div><div class="quiz-body"></div></div>';
      document.body.appendChild(modal);
    }
    setTimeout(function() { modal.classList.add('open'); }, 10);
  },
  renderQuestion: function() {
    var quiz = this.currentQuiz.quiz;
    var q = quiz[this.currentQuestion];
    var body = document.querySelector('.quiz-body');
    var bar = document.querySelector('.quiz-progress-bar');
    if (!body) return;
    bar.style.width = ((this.currentQuestion / quiz.length) * 100) + '%';
    var optionsHtml = '';
    for (var i = 0; i < q.options.length; i++) {
      optionsHtml += '<button class="quiz-option" data-index="' + i + '" onclick="QuizSystem.selectAnswer(' + i + ')"><span class="quiz-option-letter">' + String.fromCharCode(65 + i) + '</span><span class="quiz-option-text">' + escapeHtml(q.options[i]) + '</span></button>';
    }
    body.innerHTML = '<p class="quiz-question-number">Question ' + (this.currentQuestion + 1) + ' of ' + quiz.length + '</p><h3 class="quiz-question">' + escapeHtml(q.question) + '</h3><div class="quiz-options">' + optionsHtml + '</div>';
  },
  selectAnswer: function(sel) {
    var quiz = this.currentQuiz.quiz;
    var q = quiz[this.currentQuestion];
    var correct = q.correct;
    var options = document.querySelectorAll('.quiz-option');
    for (var i = 0; i < options.length; i++) {
      options[i].disabled = true;
      if (i === correct) options[i].classList.add('correct');
      else if (i === sel) options[i].classList.add('incorrect');
    }
    if (sel === correct) this.score++;
    var body = document.querySelector('.quiz-body');
    var isCorrect = sel === correct;
    var nextText = this.currentQuestion < quiz.length - 1 ? 'Next Question →' : 'See Results 🎊';
    body.insertAdjacentHTML('beforeend', '<div class="quiz-feedback ' + (isCorrect ? 'correct' : 'incorrect') + '"><span class="quiz-feedback-icon">' + (isCorrect ? '🎉' : '😢') + '</span><span>' + (isCorrect ? 'Great job!' : 'Not quite right.') + '</span></div><button class="btn btn-primary quiz-next-btn" onclick="QuizSystem.nextQuestion()">' + nextText + '</button>');
  },
  nextQuestion: function() {
    this.currentQuestion++;
    if (this.currentQuestion < this.currentQuiz.quiz.length) this.renderQuestion();
    else this.showResults();
  },
  showResults: function() {
    var quiz = this.currentQuiz.quiz;
    var pct = Math.round((this.score / quiz.length) * 100);
    var emoji = '💪', msg = 'Keep trying!', stars = '⭐';
    if (pct === 100) { emoji = '🏆'; msg = 'Perfect!'; stars = '⭐⭐⭐⭐⭐'; }
    else if (pct >= 80) { emoji = '🌟'; msg = 'Excellent!'; stars = '⭐⭐⭐⭐'; }
    else if (pct >= 60) { emoji = '😊'; msg = 'Good job!'; stars = '⭐⭐⭐'; }
    else if (pct >= 40) { emoji = '📚'; msg = 'Nice try!'; stars = '⭐⭐'; }
    document.querySelector('.quiz-progress-bar').style.width = '100%';
    document.querySelector('.quiz-body').innerHTML = '<div class="quiz-results"><div class="quiz-results-emoji">' + emoji + '</div><div class="quiz-results-stars">' + stars + '</div><div class="quiz-results-score">' + this.score + '/' + quiz.length + '</div><div class="quiz-results-percentage">' + pct + '%</div><p class="quiz-results-message">' + msg + '</p><div class="quiz-results-actions"><button class="btn btn-primary" onclick="QuizSystem.startQuiz(\'' + this.currentQuiz.id + '\')">🔄 Try Again</button><button class="btn btn-outline" onclick="QuizSystem.closeQuiz()">✓ Done</button></div></div>';
  },
  closeQuiz: function() {
    var modal = document.querySelector('.quiz-modal');
    if (modal) { modal.classList.remove('open'); setTimeout(function() { modal.remove(); }, 300); }
    this.currentQuiz = null;
  }
};

// Share System
var ShareSystem = {
  createButton: function(title, url) {
    return '<div class="share-wrapper"><button class="share-btn" onclick="ShareSystem.toggleDropdown(this); event.preventDefault(); event.stopPropagation();"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>Share</button><div class="share-dropdown"><button class="share-option" onclick="ShareSystem.share(\'whatsapp\', \'' + escapeHtml(title) + '\', \'' + url + '\')">📱 WhatsApp</button><button class="share-option" onclick="ShareSystem.share(\'twitter\', \'' + escapeHtml(title) + '\', \'' + url + '\')">🐦 Twitter</button><button class="share-option" onclick="ShareSystem.share(\'copy\', \'' + escapeHtml(title) + '\', \'' + url + '\')">📋 Copy Link</button></div></div>';
  },
  toggleDropdown: function(btn) {
    document.querySelectorAll('.share-dropdown').forEach(function(d) {
      if (d !== btn.nextElementSibling) d.classList.remove('open');
    });
    btn.nextElementSibling.classList.toggle('open');
  },
  share: function(platform, title, url) {
    var fullUrl = window.location.origin + '/' + url;
    if (platform === 'whatsapp') window.open('https://wa.me/?text=' + encodeURIComponent(title + ' ' + fullUrl), '_blank');
    else if (platform === 'twitter') window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(title) + '&url=' + encodeURIComponent(fullUrl), '_blank');
    else if (platform === 'copy') { navigator.clipboard.writeText(fullUrl); showToast('Link copied!'); }
    document.querySelectorAll('.share-dropdown').forEach(function(d) { d.classList.remove('open'); });
  }
};

document.addEventListener('click', function(e) {
  if (!e.target.closest('.share-wrapper')) {
    document.querySelectorAll('.share-dropdown').forEach(function(d) { d.classList.remove('open'); });
  }
});

// Utilities
function escapeHtml(t) {
  if (!t) return '';
  var d = document.createElement('div');
  d.textContent = t;
  return d.innerHTML;
}

function findAllahName(title) {
  if (!title || !window.allahNames) return null;

  var searchName, titleMeaning;

  // Try to extract transliteration and meaning from title like "Ash-Shaheed (The Witness)"
  var nameMatch = title.match(/^([A-Za-z\-']+)\s*\(([^)]+)\)/);
  if (nameMatch) {
    searchName = nameMatch[1].toLowerCase().replace(/-/g, '').replace(/'/g, '');
    titleMeaning = nameMatch[2];
  } else {
    // Handle titles without parentheses like "Allah"
    searchName = title.trim().toLowerCase().replace(/-/g, '').replace(/'/g, '');
    titleMeaning = '';
  }

  // First try exact match
  var found = window.allahNames.find(function(n) {
    var translit = n.transliteration.toLowerCase().replace(/-/g, '').replace(/'/g, '');
    return translit === searchName;
  });

  // If no exact match, try fuzzy match (but be more careful)
  if (!found) {
    found = window.allahNames.find(function(n) {
      var translit = n.transliteration.toLowerCase().replace(/-/g, '').replace(/'/g, '');
      // Only match if lengths are similar (within 2 chars) and prefix matches
      var lenDiff = Math.abs(translit.length - searchName.length);
      if (lenDiff > 2) return false;
      // Match if first 6+ chars match (more strict than before)
      return translit.substring(0, 6) === searchName.substring(0, 6);
    });
  }

  // If found, use it; if not, create a fallback with title info
  if (found) return found;

  // Fallback: create object from title
  return {
    number: '',
    arabic: '',
    transliteration: nameMatch ? nameMatch[1] : title,
    meaning: titleMeaning
  };
}

//reading time
function calculateReadingTime(content) {
  if (!content) return 1;
  var words = content.trim().split(/\s+/).length;
  var minutes = Math.ceil(words / 200); // Average reading speed: 200 words per minute
  return minutes;
}

function escapeQuotes(str) {
  if (!str) return '';
  return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

function getExcerpt(c, max) {
  if (!c) return '';
  var p = c.replace(/[#*_>`\[\]]/g, '').replace(/\n+/g, ' ').trim();
  return p.length <= max ? p : p.substring(0, max).trim() + '...';
}

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function renderMarkdown(t) {
  if (!t) return '';
  return t.replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>');
}

function showToast(msg) {
  var t = document.querySelector('.toast');
  if (!t) {
    t = document.createElement('div');
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(function() { t.classList.remove('show'); }, 3000);
}

// Global exports
window.filterInspire = filterInspire;
window.filterGrow = filterGrow;
window.filterCreate = filterCreate;
window.goToInspirePage = goToInspirePage;
window.goToGrowPage = goToGrowPage;
window.goToCreatePage = goToCreatePage;
window.LikeSystem = LikeSystem;
window.BookmarkSystem = BookmarkSystem;
window.QuizSystem = QuizSystem;
window.ShareSystem = ShareSystem;
window.DownloadSystem = DownloadSystem;