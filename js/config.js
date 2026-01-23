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
  description: "Islamic stories, activities, and wisdom for children and families.",

  // SEO Configuration
  seo: {
    siteUrl: "https://kids.thetranquilheart.com",
    defaultImage: "images/og-default.webp",
    twitterHandle: "",

    // Page-specific descriptions
    pages: {
      index: "Islamic stories, activities, and wisdom for children and families. Growing Hearts Growing Faith.",
      inspire: "Inspiring Islamic stories of prophets, companions, and scholars for children.",
      grow: "Daily prayers, Names of Allah, and faith-building activities for young Muslims.",
      create: "Printable Islamic activities, habit trackers, and creative resources for kids.",
      bookmarks: "Your saved Islamic stories and learning resources."
    }
  }
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
