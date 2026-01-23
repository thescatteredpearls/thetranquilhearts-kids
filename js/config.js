// =====================================================
// SITE CONFIGURATION
// Central place for site-wide settings
// =====================================================

const SITE_CONFIG = {
  name: "The Tranquil Heart Kids",
  nameHtml: "The Tranquil Heart <span>Kids</span>",
  tagline: "Growing Hearts Growing Faith",
  email: "geoffrin.j.11@gmail.com",
  year: new Date().getFullYear(),
  description: "Islamic stories, activities, and wisdom for children and families."
};

// Make available globally
window.SITE_CONFIG = SITE_CONFIG;

// Helper function to set page title
function setPageTitle(pageTitle) {
  if (pageTitle) {
    document.title = pageTitle + ' | ' + SITE_CONFIG.name;
  } else {
    document.title = SITE_CONFIG.name;
  }
}

window.setPageTitle = setPageTitle;

console.log('✅ Site config loaded:', SITE_CONFIG.name);
