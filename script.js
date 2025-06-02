// Combined wallpapers array - will include both static and fetched wallpapers
let allWallpapers = [
  { src: "art.jpg", desc: "Anime boy", category: "Anime" },
  {
    src: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d",
    desc: "Abstract Art",
    category: "abstract",
  },
  {
    src: "https://images.unsplash.com/photo-1497366754035-f200968a6e72",
    desc: "City Lights",
    category: "city",
  },
  {
    src: "https://images.unsplash.com/photo-1493246507139-91e8fad9978e",
    desc: "Wild Animals",
    category: "animals",
  },
];

// Base URL for local images
const baseURL = "http://127.0.0.1:5500/";

// SheetDB API configuration
const SHEETDB_API_URL = "https://sheetdb.io/api/v1/qh3gdqjsrx9hl";

// Google Sheets configuration (backup method)
const SHEET_ID = "1MePNDeTC8vMJePJhWjtiBHhxqPvcFu__p5jjyuiXu9A";
const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0`;

// Function to convert Google Drive URLs to working formats
function fixGoogleDriveURL(url) {
  if (!url.includes('drive.google.com')) {
    return url;
  }
  
  // Extract file ID from various Google Drive URL formats
  let fileId = '';
  
  if (url.includes('/file/d/')) {
    fileId = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)[1];
  } else if (url.includes('id=')) {
    fileId = url.match(/id=([a-zA-Z0-9_-]+)/)[1];
  }
  
  if (fileId) {
    // Return high-resolution thumbnail format (most reliable)
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }
  
  return url;
}

// Function to populate gallery with filtering
function populateGallery(filter = "") {
  const grid = document.getElementById("wallpaperGrid");
  grid.innerHTML = "";

  const filtered = filter
    ? allWallpapers.filter(
        (wall) =>
          wall.desc.toLowerCase().includes(filter.toLowerCase()) ||
          wall.category.toLowerCase().includes(filter.toLowerCase())
      )
    : allWallpapers;

  if (filtered.length === 0) {
    grid.innerHTML = '<p style="text-align: center; grid-column: 1/-1; padding: 2rem;">No wallpapers found matching your search.</p>';
    return;
  }

  filtered.forEach((wall) => {
    const item = document.createElement("div");
    item.className = "gallery-item";
    
    // Fix Google Drive URLs
    const fixedSrc = fixGoogleDriveURL(wall.src);
    
    item.innerHTML = `
      <img src="${fixedSrc}" alt="${wall.desc}" loading="lazy" onerror="handleImageError(this, '${wall.src}')">
      <div class="desc">${wall.desc} (${wall.category})</div>
    `;
    item.onclick = () => openModal(fixedSrc, wall.desc);
    grid.appendChild(item);
  });
}

// Function to handle image loading errors with fallback URLs
function handleImageError(imgElement, originalUrl) {
  const fallbackUrls = [];
  
  // If it's a Google Drive URL, try different formats
  if (originalUrl.includes('drive.google.com')) {
    let fileId = '';
    
    if (originalUrl.includes('/file/d/')) {
      fileId = originalUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)[1];
    } else if (originalUrl.includes('id=')) {
      fileId = originalUrl.match(/id=([a-zA-Z0-9_-]+)/)[1];
    }
    
    if (fileId) {
      fallbackUrls.push(
        `https://lh3.googleusercontent.com/d/${fileId}`,
        `https://drive.google.com/thumbnail?id=${fileId}&sz=w1920-h1080`,
        `https://drive.google.com/uc?id=${fileId}`,
        `https://drive.google.com/uc?export=view&id=${fileId}`
      );
    }
  }
  
  // Try fallback URLs
  if (fallbackUrls.length > 0 && !imgElement.dataset.fallbackTried) {
    imgElement.dataset.fallbackTried = 'true';
    imgElement.src = fallbackUrls[0];
    
    // Set up next fallback
    imgElement.onerror = () => {
      const nextIndex = parseInt(imgElement.dataset.fallbackIndex || '0') + 1;
      if (nextIndex < fallbackUrls.length) {
        imgElement.dataset.fallbackIndex = nextIndex;
        imgElement.src = fallbackUrls[nextIndex];
      } else {
        // All fallbacks failed, hide image
        imgElement.style.display = 'none';
        imgElement.parentElement.style.opacity = '0.5';
        console.error('All image fallbacks failed for:', originalUrl);
      }
    };
  } else {
    // No more fallbacks, hide image
    imgElement.style.display = 'none';
    imgElement.parentElement.style.opacity = '0.5';
  }
}
async function downloadImage(imageUrl, filename) {
  try {
    // Show loading state
    const downloadBtn = document.getElementById("downloadBtn");
    const originalText = downloadBtn.innerHTML;
    downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Downloading...';
    downloadBtn.style.pointerEvents = 'none';

    // Check if it's a local image
    if (!imageUrl.startsWith('http')) {
      // For local images, create direct download link
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Reset button
      downloadBtn.innerHTML = originalText;
      downloadBtn.style.pointerEvents = 'auto';
      return;
    }

    // For external images, try CORS-enabled fetch
    try {
      const response = await fetch(imageUrl, {
        mode: 'cors',
        headers: {
          'Accept': 'image/*'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.style.display = 'none';
      link.href = url;
      link.download = filename;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the blob URL
      window.URL.revokeObjectURL(url);
      
    } catch (fetchError) {
      // Fallback for CORS issues
      throw fetchError;
    }
    
    // Reset button
    downloadBtn.innerHTML = originalText;
    downloadBtn.style.pointerEvents = 'auto';
    
  } catch (error) {
    console.error('Download failed:', error);
    
    // Fallback: Try different download methods
    if (imageUrl.includes('unsplash.com')) {
      // For Unsplash, try their download parameter
      const downloadUrl = imageUrl + (imageUrl.includes('?') ? '&' : '?') + 'dl=' + encodeURIComponent(filename);
      window.open(downloadUrl, '_blank');
    } else {
      // General fallback: open in new tab
      const fallbackLink = document.createElement('a');
      fallbackLink.href = imageUrl;
      fallbackLink.target = '_blank';
      fallbackLink.rel = 'noopener noreferrer';
      fallbackLink.click();
      
      // Show user-friendly message
      alert('Direct download failed. The image has been opened in a new tab. You can right-click and "Save image as..." to download it.');
    }
    
    // Reset button
    const downloadBtn = document.getElementById("downloadBtn");
    downloadBtn.innerHTML = '<i class="fas fa-download"></i> Download';
    downloadBtn.style.pointerEvents = 'auto';
  }
}

// Updated openModal function with proper download handling
function openModal(imgSrc, desc) {
  const modal = document.getElementById("wallpaperModal");
  const modalImg = document.getElementById("modalImg");
  const downloadBtn = document.getElementById("downloadBtn");

  modal.style.display = "block";
  modalImg.src = imgSrc;
  modalImg.alt = desc;
  
  // Create clean filename
  const filename = desc.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.jpg';
  
  // Remove any existing event listeners and add new one
  const newDownloadBtn = downloadBtn.cloneNode(true);
  downloadBtn.parentNode.replaceChild(newDownloadBtn, downloadBtn);
  
  newDownloadBtn.addEventListener('click', (e) => {
    e.preventDefault();
    downloadImage(imgSrc, filename);
  });
}

// Function to toggle about section
function toggleAbout() {
  const aboutDetails = document.querySelector(".about-details");
  aboutDetails.style.display =
    aboutDetails.style.display === "block" ? "none" : "block";
}

// Function to parse CSV data
function parseCSV(csvText) {
  const lines = csvText.split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim()) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      data.push(row);
    }
  }
  
  return data;
}

// Function to fetch wallpapers from SheetDB
async function fetchWallpapersFromSheet() {
  try {
    console.log("Fetching wallpapers from SheetDB...");
    
    // Method 1: Try SheetDB API first
    const response = await fetch(SHEETDB_API_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`SheetDB API error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("Raw data from SheetDB:", data);
    
    // Process and add fetched wallpapers to the main array
    let addedCount = 0;
    data.forEach(item => {
      // Check common column names (adjust these based on your sheet structure)
      const name = item.name || item.Name || item.title || item.Title || item.description || item.Description;
      const url = item.url || item.URL || item.link || item.Link || item.image || item.Image;
      const category = item.category || item.Category || item.type || item.Type || 'general';
      
      if (name && url) {
        const wallpaper = {
          src: url.startsWith("http") ? url : baseURL + url,
          desc: name,
          category: category.toLowerCase()
        };
        
        // Check if wallpaper already exists to avoid duplicates
        const exists = allWallpapers.some(w => w.src === wallpaper.src || w.desc === wallpaper.desc);
        if (!exists) {
          allWallpapers.push(wallpaper);
          addedCount++;
        }
      }
    });
    
    // Refresh the gallery after adding new wallpapers
    populateGallery();
    console.log(`Successfully loaded ${addedCount} new wallpapers from SheetDB`);
    
    // Show success message to user
    if (addedCount > 0) {
      showNotification(`Loaded ${addedCount} wallpapers from SheetDB!`, 'success');
    } else {
      showNotification('No new wallpapers found. Check your sheet structure and column names.', 'info');
    }
    
  } catch (error) {
    console.error("Error fetching from SheetDB:", error);
    console.log("Trying backup CSV method...");
    
    // Fallback: Try CSV export method
    try {
      await fetchFromCSVBackup();
    } catch (csvError) {
      console.error("CSV backup also failed:", csvError);
      showNotification('Failed to load wallpapers. Check console for details.', 'error');
    }
  }
}

// Backup method using CSV export
async function fetchFromCSVBackup() {
  const response = await fetch(SHEET_CSV_URL, {
    mode: 'cors',
    headers: {
      'Accept': 'text/csv'
    }
  });
  
  if (!response.ok) {
    throw new Error(`CSV backup failed! status: ${response.status}`);
  }
  
  const csvText = await response.text();
  const data = parseCSV(csvText);
  
  console.log("Raw data from CSV backup:", data);
  
  let addedCount = 0;
  data.forEach(item => {
    const name = item.name || item.Name || item.title || item.Title || item.description || item.Description;
    const url = item.url || item.URL || item.link || item.Link || item.image || item.Image;
    const category = item.category || item.Category || item.type || item.Type || 'general';
    
    if (name && url) {
      const wallpaper = {
        src: url.startsWith("http") ? url : baseURL + url,
        desc: name,
        category: category.toLowerCase()
      };
      
      const exists = allWallpapers.some(w => w.src === wallpaper.src || w.desc === wallpaper.desc);
      if (!exists) {
        allWallpapers.push(wallpaper);
        addedCount++;
      }
    }
  });
  
  populateGallery();
  console.log(`Loaded ${addedCount} wallpapers using CSV backup`);
  showNotification(`Loaded ${addedCount} wallpapers using backup method!`, 'success');
}

// Function to show notifications to user
function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 5px;
    color: white;
    font-weight: 500;
    z-index: 10000;
    max-width: 300px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  `;
  
  // Set background color based on type
  switch(type) {
    case 'success':
      notification.style.backgroundColor = '#4CAF50';
      break;
    case 'error':
      notification.style.backgroundColor = '#f44336';
      break;
    case 'info':
    default:
      notification.style.backgroundColor = '#2196F3';
      break;
  }
  
  notification.textContent = message;
  document.body.appendChild(notification);
  
  // Remove notification after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 5000);
}

// Main DOMContentLoaded event listener
document.addEventListener("DOMContentLoaded", async () => {
  // Remove loading indicator
  const grid = document.getElementById("wallpaperGrid");
  grid.innerHTML = '<p style="text-align: center; grid-column: 1/-1; padding: 2rem;">Loading wallpapers...</p>';
  
  // First populate with static wallpapers
  populateGallery();
  
  // Then fetch and add wallpapers from Google Sheets
  await fetchWallpapersFromSheet();

  // Search functionality
  const searchInput = document.getElementById("searchInput");
  const searchBtn = document.getElementById("searchBtn");

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      populateGallery(searchInput.value);
    });
  }
  
  if (searchBtn) {
    searchBtn.addEventListener("click", () => {
      populateGallery(searchInput.value);
    });
  }

  // Modal functionality
  const modal = document.getElementById("wallpaperModal");
  const closeBtn = document.querySelector(".close");
  
  if (closeBtn) {
    closeBtn.onclick = () => {
      modal.style.display = "none";
    };
  }
  
  window.onclick = (e) => {
    if (e.target === modal) modal.style.display = "none";
  };

  // Explore button functionality
  const exploreBtn = document.getElementById("exploreBtn");
  const featuredSection = document.getElementById("featuredWallpapers");
  
  if (exploreBtn && featuredSection) {
    exploreBtn.addEventListener("click", () => {
      featuredSection.scrollIntoView({ behavior: "smooth" });
    });
  }

  // Theme toggle functionality
  const body = document.body;
  const toggleLight = document.querySelector(".toggle-light");
  const toggleDark = document.querySelector(".toggle-dark");
  
  if (toggleLight) {
    toggleLight.addEventListener("click", () => {
      body.classList.remove("dark-mode");
    });
  }
  
  if (toggleDark) {
    toggleDark.addEventListener("click", () => {
      body.classList.add("dark-mode");
    });
  }

  // Category filter from dropdown
  document.querySelectorAll(".dropdown-content a").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const category = link.getAttribute("data-category");
      populateGallery(category);
      if (searchInput) searchInput.value = category;
    });
  });

  // Category filter from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const category = urlParams.get("category");
  if (category) {
    populateGallery(category);
    if (searchInput) searchInput.value = category;
  }
});

// Function to manually refresh wallpapers from Google Sheets
function refreshWallpapers() {
  allWallpapers = allWallpapers.slice(0, 4); // Keep only the original static wallpapers
  fetchWallpapersFromSheet();
}

// Debug function to check SheetDB structure
function debugSheetStructure() {
  fetch(SHEETDB_API_URL)
    .then(response => response.json())
    .then(data => {
      console.log("Raw SheetDB data:");
      console.log(data);
      
      if (data.length > 0) {
        console.log("Available columns:", Object.keys(data[0]));
        console.log("First row sample:", data[0]);
      }
    })
    .catch(error => {
      console.error("SheetDB debug failed:", error);
      
      // Try CSV backup for debugging
      fetch(SHEET_CSV_URL)
        .then(response => response.text())
        .then(csvText => {
          console.log("CSV backup data:");
          console.log(csvText);
          
          const parsed = parseCSV(csvText);
          if (parsed.length > 0) {
            console.log("CSV columns:", Object.keys(parsed[0]));
          }
        })
        .catch(csvError => {
          console.error("CSV debug also failed:", csvError);
        });
    });
}