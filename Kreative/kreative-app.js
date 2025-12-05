// Kreative PWA App JavaScript

// Register Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => {
                console.log('Service Worker registered successfully:', registration.scope);
            })
            .catch(error => {
                console.log('Service Worker registration failed:', error);
            });
    });
}

// Install prompt for PWA
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallPromotion();
});

function showInstallPromotion() {
    // You can create a custom install button here
    console.log('App can be installed');
}

// Close buttons functionality
document.addEventListener('DOMContentLoaded', () => {
    // Close promo banner
    const closeBanner = document.querySelector('.close-banner');
    if (closeBanner) {
        closeBanner.addEventListener('click', () => {
            document.querySelector('.promo-banner').style.display = 'none';
        });
    }

    // Close promo card
    const closeCard = document.querySelector('.close-card');
    if (closeCard) {
        closeCard.addEventListener('click', () => {
            document.querySelector('.promo-card').style.display = 'none';
        });
    }

    // Sidebar navigation - update active state based on current page
    const sidebarBtns = document.querySelectorAll('.sidebar-btn');
    const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
    
    sidebarBtns.forEach(btn => {
        const href = btn.getAttribute('href');
        
        // Set active state based on current page
        if (href && href.includes(currentPage)) {
            btn.classList.add('active');
        }
        
        // Handle click for hash links (apps, create, marketplace)
        if (href && href.startsWith('#')) {
            btn.addEventListener('click', (e) => {
                sidebarBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        }
    });

    // Top nav links
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });

    // Feature cards click
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach(card => {
        card.addEventListener('click', () => {
            const title = card.querySelector('h3').textContent;
            console.log(`Opening feature: ${title}`);
            // Add your navigation logic here
        });
    });

    // Project cards click
    const projectCards = document.querySelectorAll('.project-card');
    projectCards.forEach(card => {
        card.addEventListener('click', () => {
            const title = card.querySelector('p').textContent;
            console.log(`Creating project: ${title}`);
            // Add your project creation logic here
        });
    });

    // Tool cards click
    const toolCards = document.querySelectorAll('.tool-card');
    toolCards.forEach(card => {
        card.addEventListener('click', () => {
            const title = card.querySelector('h3').textContent;
            console.log(`Opening tool: ${title}`);
            // Add your tool launch logic here
        });
    });

    // Search functionality
    const searchInput = document.querySelector('.search-bar input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            console.log(`Searching for: ${searchTerm}`);
            // Add your search logic here
        });
    }

    // Animate cards on scroll
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, {
        threshold: 0.1
    });

    document.querySelectorAll('.feature-card, .project-card, .tool-card').forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        observer.observe(card);
    });
});

// Handle online/offline status
window.addEventListener('online', () => {
    console.log('App is online');
    showNotification('Back online', 'You are now connected to the internet');
});

window.addEventListener('offline', () => {
    console.log('App is offline');
    showNotification('You are offline', 'Some features may be limited');
});

// Notification helper
function showNotification(title, message) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
            body: message,
            icon: './icons/icon-192.png'
        });
    }
}

// Request notification permission
if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Cmd/Ctrl + K for search
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.querySelector('.search-bar input').focus();
    }
    
    // Cmd/Ctrl + N for new project
    if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        console.log('New project shortcut triggered');
    }
});

// Smooth scroll behavior
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Handle app updates
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('New version available, reload to update');
        // You can show a notification to the user here
    });
}

// Analytics placeholder
function trackEvent(category, action, label) {
    console.log(`Analytics: ${category} - ${action} - ${label}`);
    // Add your analytics code here (Google Analytics, etc.)
}

// Export functions for use in other modules
window.KreativeApp = {
    trackEvent,
    showNotification
};

