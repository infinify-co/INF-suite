// Navigation Handler - Follows naming convention: pagename-navigation-name.html
// This script makes navigation items clickable and loads content dynamically

let navigationInitialized = false;

function initNavigation() {
    // Prevent double initialization
    if (navigationInitialized) {
        return;
    }
    navigationInitialized = true;
    const currentPage = window.location.pathname.split('/').pop().replace('.html', '');
    const navItems = document.querySelectorAll('.secondary-nav-item, .secondary-nav-back');
    const frontTileContainer = document.querySelector('.front-tile-container');
    
    if (!frontTileContainer) {
        console.warn('Front tile container not found. Navigation will not work.');
        return;
    }
    
    function loadContent(navName) {
        // Follow naming convention: pagename-navigation-name.html
        const contentFile = `${currentPage}-${navName}.html`;
        
        // Update active state FIRST (before any async operations)
        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-nav') === navName) {
                item.classList.add('active');
            }
        });
        
        // Load content
        fetch(contentFile)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Content file not found');
                }
                return response.text();
            })
            .then(html => {
                // Extract body content from the loaded HTML
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const content = doc.body.innerHTML;
                
                // Update front tile container
                frontTileContainer.innerHTML = content;
                
                // Reinitialize Lucide icons for new content
                if (window.lucide) {
                    lucide.createIcons();
                }
                
                // Dispatch custom event for page-specific initialization
                window.dispatchEvent(new CustomEvent('contentLoaded', { 
                    detail: { navName, contentFile } 
                }));
                
                // Update URL hash
                window.location.hash = navName;
            })
            .catch(error => {
                console.warn(`Content file ${contentFile} not found. Using default content.`);
                // Active state is already set above, so it will remain active even if content fails to load
                // Update URL hash anyway
                window.location.hash = navName;
            });
    }
    
    // Add click handlers
    navItems.forEach(item => {
        item.style.cursor = 'pointer';
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const navName = item.getAttribute('data-nav');
            if (navName) {
                loadContent(navName);
            }
        });
    });
    
    // Load content from URL hash on page load, or default to 'home'
    const hash = window.location.hash.replace('#', '');
    if (hash) {
        loadContent(hash);
    } else {
        // Default to 'home' if no hash is present
        // Use a small delay to ensure DOM is ready
        setTimeout(() => {
            const homeItem = document.querySelector('[data-nav="home"]');
            if (homeItem) {
                loadContent('home');
            }
        }, 50);
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavigation);
} else {
    initNavigation();
}

