// Service Worker Registration - Clear old caches first
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Unregister all service workers and clear caches
        navigator.serviceWorker.getRegistrations().then((registrations) => {
            for (let registration of registrations) {
                registration.unregister();
            }
        });
        
        // Clear all caches
        if ('caches' in window) {
            caches.keys().then((cacheNames) => {
                cacheNames.forEach((cacheName) => {
                    caches.delete(cacheName);
                });
            });
        }
        
        // Register new service worker
        navigator.serviceWorker.register('./sw.js')
            .then((registration) => {
                console.log('Service Worker registered:', registration);
            })
            .catch((error) => {
                console.log('Service Worker registration failed:', error);
            });
    });
}

// Projects Storage (using localStorage)
const STORAGE_KEY = 'wavecode_projects';
const RECENT_KEY = 'wavecode_recent';
const AUTH_KEY = 'wavecode_auth';

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    checkAuthStatus();
});

function initializeApp() {
    setupNavigation();
    setupProjectInput();
    setupModal();
    setupTabs();
    loadProjects();
    loadCreateProjectCards();
    setupPWAInstall();
}

// Load Create Project Cards
function loadCreateProjectCards() {
    const grid = document.getElementById('createProjectGrid');
    if (!grid) return;
    
    // Define project templates/types
    const projectTemplates = [
        { name: 'Blank Website', type: 'web', icon: 'file' },
        { name: 'Web App', type: 'web', icon: 'globe' },
        { name: 'Mobile App', type: 'mobile', icon: 'smartphone' }
    ];
    
    grid.innerHTML = projectTemplates.map((template, index) => `
        <div class="project-card create-project-card" data-template-type="${template.type}" data-template-index="${index}">
            <div class="project-title-row">
                <h3 class="project-title">${escapeHtml(template.name)}</h3>
                <div class="project-menu-wrapper">
                    <button class="project-menu-btn" title="More options" data-template-index="${index}">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="1"></circle>
                            <circle cx="12" cy="5" r="1"></circle>
                            <circle cx="12" cy="19" r="1"></circle>
                        </svg>
                    </button>
                    <div class="project-menu-dropdown" data-menu-id="template-${index}">
                        <button class="project-menu-item">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                            <span>Rename</span>
                        </button>
                        <button class="project-menu-item">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                            <span>Settings</span>
                        </button>
                        <button class="project-menu-item">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                            <span>Delete</span>
                        </button>
                    </div>
                </div>
            </div>
            <div class="project-cover">
                <div class="project-cover-placeholder">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="placeholder-plus-icon">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                </div>
            </div>
            <div class="project-meta">
                <span>New</span>
                <span>${template.type}</span>
            </div>
        </div>
    `).join('');
    
    // Add click handlers for create project cards
    document.querySelectorAll('.create-project-card').forEach(card => {
        card.addEventListener('click', (e) => {
            // Don't create project if clicking on menu button or menu
            if (e.target.closest('.project-menu-btn') || e.target.closest('.project-menu-dropdown')) {
                return;
            }
            
            const templateType = card.dataset.templateType;
            const templateIndex = card.dataset.templateIndex;
            createProjectFromTemplate(projectTemplates[templateIndex]);
        });
    });
    
    // Add menu handlers for create project cards
    setupCreateProjectMenus();
}

function createProjectFromTemplate(template) {
    const projectName = template.name;
    const projectType = template.type;
    
    const newProject = {
        id: Date.now().toString(),
        name: projectName,
        type: projectType,
        description: '',
        createdAt: new Date().toISOString()
    };
    
    const projects = getProjects();
    projects.push(newProject);
    saveProjects(projects);
    addToRecent(newProject.id);
    
    loadProjects();
    loadCreateProjectCards();
}

function setupCreateProjectMenus() {
    document.querySelectorAll('.create-project-card .project-menu-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const menuId = `template-${btn.dataset.templateIndex}`;
            const dropdown = document.querySelector(`.project-menu-dropdown[data-menu-id="${menuId}"]`);
            
            // Close all other dropdowns
            document.querySelectorAll('.project-menu-dropdown').forEach(menu => {
                if (menu !== dropdown) {
                    menu.classList.remove('active');
                }
            });
            
            dropdown.classList.toggle('active');
        });
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.project-menu-wrapper')) {
            document.querySelectorAll('.project-menu-dropdown').forEach(menu => {
                menu.classList.remove('active');
            });
        }
    });
}

// Navigation
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item[data-page]');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const page = e.currentTarget.dataset.page;
            navItems.forEach(nav => nav.classList.remove('active'));
            e.currentTarget.classList.add('active');
            handleNavigation(page);
        });
    });
}

function handleNavigation(page) {
    console.log('Navigate to:', page);
    // Add navigation logic here
    // For now, we'll just log the page
}

// Project Input
function setupProjectInput() {
    const input = document.getElementById('projectInput');
    const addBtn = document.getElementById('addBtn');
    const dropdown = document.getElementById('addDropdown');

    // Submit on Enter (Ctrl+Enter or just Enter for textarea)
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            createProjectFromInput();
        }
    });

    // Show dropdown on hover and click
    if (addBtn && dropdown) {
        // Show on hover
        addBtn.addEventListener('mouseenter', () => {
            dropdown.classList.add('active');
        });

        // Keep open when hovering over dropdown
        dropdown.addEventListener('mouseenter', () => {
            dropdown.classList.add('active');
        });

        // Hide when mouse leaves both button and dropdown
        const hideDropdown = () => {
            setTimeout(() => {
                if (!addBtn.matches(':hover') && !dropdown.matches(':hover')) {
                    dropdown.classList.remove('active');
                }
            }, 100);
        };

        addBtn.addEventListener('mouseleave', hideDropdown);
        dropdown.addEventListener('mouseleave', hideDropdown);

        // Also toggle on click
        addBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('active');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target) && !addBtn.contains(e.target)) {
                dropdown.classList.remove('active');
            }
        });

        // Handle dropdown item clicks
        const dropdownItems = dropdown.querySelectorAll('.dropdown-item');
        dropdownItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const text = item.querySelector('span:not(.pro-badge)')?.textContent;
                console.log('Selected:', text);
                // Remove selected class from all items
                dropdownItems.forEach(i => i.classList.remove('selected'));
                // Add selected class to clicked item to show curved box
                item.classList.add('selected');
                // Remove selected class after animation
                setTimeout(() => {
                    item.classList.remove('selected');
                }, 1000);
            });
        });
    }
}

function createProjectFromInput() {
    const input = document.getElementById('projectInput');
    const projectName = input.value.trim();
    
    if (projectName) {
        const project = {
            id: Date.now().toString(),
            name: projectName,
            description: '',
            type: 'web',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        saveProject(project);
        addToRecent(project.id);
        input.value = '';
        loadProjects();
    }
}

// Modal Functions
function setupModal() {
    const modal = document.getElementById('projectModal');
    const closeBtn = document.getElementById('closeModal');
    const cancelBtn = document.getElementById('cancelBtn');
    const createBtn = document.getElementById('createBtn');

    closeBtn.addEventListener('click', closeProjectModal);
    cancelBtn.addEventListener('click', closeProjectModal);
    
    createBtn.addEventListener('click', () => {
        const name = document.getElementById('projectName').value.trim();
        const description = document.getElementById('projectDescription').value.trim();
        const type = document.getElementById('projectType').value;

        if (name) {
            const project = {
                id: Date.now().toString(),
                name: name,
                description: description,
                type: type,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            saveProject(project);
            addToRecent(project.id);
            closeProjectModal();
            loadProjects();
        } else {
            alert('Please enter a project name');
        }
    });

    // Close on outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeProjectModal();
        }
    });
}

function openProjectModal() {
    const modal = document.getElementById('projectModal');
    document.getElementById('projectName').value = '';
    document.getElementById('projectDescription').value = '';
    document.getElementById('projectType').value = 'web';
    modal.classList.add('active');
    document.getElementById('projectName').focus();
}

function closeProjectModal() {
    const modal = document.getElementById('projectModal');
    modal.classList.remove('active');
}

// Tabs
function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(t => t.classList.remove('active'));
            btn.classList.add('active');
            const tab = btn.dataset.tab;
            loadProjects(tab);
        });
    });
}

// Projects Management
function getProjects() {
    const projectsJson = localStorage.getItem(STORAGE_KEY);
    return projectsJson ? JSON.parse(projectsJson) : [];
}

function saveProject(project) {
    const projects = getProjects();
    const existingIndex = projects.findIndex(p => p.id === project.id);
    
    if (existingIndex >= 0) {
        projects[existingIndex] = project;
    } else {
        projects.push(project);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

function getRecentProjects() {
    const recentJson = localStorage.getItem(RECENT_KEY);
    return recentJson ? JSON.parse(recentJson) : [];
}

function addToRecent(projectId) {
    const recent = getRecentProjects();
    const index = recent.indexOf(projectId);
    
    if (index > -1) {
        recent.splice(index, 1);
    }
    
    recent.unshift(projectId);
    
    // Keep only last 10
    if (recent.length > 10) {
        recent.pop();
    }
    
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
}

function loadProjects(tab = 'recent') {
    const projects = getProjects();
    const grid = document.getElementById('projectsGrid');
    
    let projectsToShow = [];
    
    if (tab === 'recent') {
        const recentIds = getRecentProjects();
        projectsToShow = recentIds
            .map(id => projects.find(p => p.id === id))
            .filter(p => p !== undefined);
    } else {
        projectsToShow = projects;
    }
    
    if (projectsToShow.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <h3>No projects yet</h3>
                <p>${tab === 'recent' ? 'Start creating projects to see them here' : 'Create your first project to get started'}</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = projectsToShow.map(project => `
        <div class="project-card" data-project-id="${project.id}">
            <div class="project-title-row">
                <h3 class="project-title">${escapeHtml(project.name)}</h3>
                <div class="project-menu-wrapper">
                    <button class="project-menu-btn" title="More options" data-project-id="${project.id}">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="1"></circle>
                            <circle cx="12" cy="5" r="1"></circle>
                            <circle cx="12" cy="19" r="1"></circle>
                        </svg>
                    </button>
                    <div class="project-menu-dropdown" data-menu-id="${project.id}">
                        <button class="project-menu-item">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                            <span>Rename</span>
                        </button>
                        <button class="project-menu-item">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                            <span>Settings</span>
                        </button>
                        <button class="project-menu-item">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                            <span>Delete</span>
                        </button>
                    </div>
                </div>
            </div>
            <div class="project-cover">
                <div class="project-cover-placeholder"></div>
            </div>
            ${project.description ? `<p class="project-subtitle">${escapeHtml(project.description)}</p>` : ''}
            <div class="project-meta">
                <span>${formatDate(project.createdAt)}</span>
                <span>${project.type}</span>
            </div>
        </div>
    `).join('');
    
    // Add click handlers
    document.querySelectorAll('.project-card').forEach(card => {
        card.addEventListener('click', (e) => {
            // Don't open project if clicking on menu button or menu
            if (e.target.closest('.project-menu-btn') || e.target.closest('.project-menu-dropdown')) {
                return;
            }
            const projectId = card.dataset.projectId;
            openProject(projectId);
        });
    });

    // Add menu button click handlers
    document.querySelectorAll('.project-menu-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const projectId = btn.dataset.projectId;
            const menu = document.querySelector(`[data-menu-id="${projectId}"]`);
            const allMenus = document.querySelectorAll('.project-menu-dropdown');
            
            // Close all other menus
            allMenus.forEach(m => {
                if (m !== menu) {
                    m.classList.remove('active');
                }
            });
            
            // Toggle current menu
            if (menu) {
                menu.classList.toggle('active');
            }
        });
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.project-menu-wrapper')) {
            document.querySelectorAll('.project-menu-dropdown').forEach(menu => {
                menu.classList.remove('active');
            });
        }
    });

    // Handle menu item clicks
    document.querySelectorAll('.project-menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const menu = item.closest('.project-menu-dropdown');
            const projectId = menu?.dataset.menuId;
            const actionText = item.querySelector('span')?.textContent;
            
            if (actionText === 'Rename') {
                handleRenameProject(projectId);
            } else if (actionText === 'Settings') {
                console.log('Settings for project:', projectId);
            } else if (actionText === 'Delete') {
                console.log('Delete project:', projectId);
            }
            
            // Close menu after action
            if (menu) {
                menu.classList.remove('active');
            }
        });
    });
}

function openProject(projectId) {
    addToRecent(projectId);
    console.log('Opening project:', projectId);
    // Add project opening logic here
    // For now, we'll just log it
}

function handleRenameProject(projectId) {
    const projects = getProjects();
    const project = projects.find(p => p.id === projectId);
    
    if (!project) {
        console.error('Project not found');
        return;
    }
    
    // Find the project card and title element
    const projectCard = document.querySelector(`[data-project-id="${projectId}"]`);
    if (!projectCard) {
        console.error('Project card not found');
        return;
    }
    
    const titleElement = projectCard.querySelector('.project-title');
    if (!titleElement) {
        console.error('Title element not found');
        return;
    }
    
    const currentName = project.name;
    
    // Create input field
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentName;
    input.maxLength = 20;
    input.className = 'project-title-edit';
    input.style.cssText = `
        font-size: 18px;
        font-weight: 600;
        color: var(--text-primary);
        margin: 0;
        margin-left: 5px;
        border: 2px solid #2196F3;
        border-radius: 4px;
        padding: 4px 8px;
        outline: none;
        background: white;
        width: calc(100% - 20px);
        font-family: inherit;
    `;
    
    // Replace title with input
    const titleRow = titleElement.closest('.project-title-row');
    titleElement.style.display = 'none';
    titleElement.parentNode.insertBefore(input, titleElement);
    
    // Focus and select text
    input.focus();
    input.select();
    
    // Handle save on blur or Enter key
    const saveRename = () => {
        const trimmedName = input.value.trim();
        
        if (!trimmedName) {
            alert('Project name cannot be empty');
            input.focus();
            return;
        }
        
        if (trimmedName.length > 20) {
            alert('Project name cannot exceed 20 characters');
            input.focus();
            input.select();
            return;
        }
        
        // Update project name
        project.name = trimmedName;
        project.updatedAt = new Date().toISOString();
        
        // Save updated project
        saveProject(project);
        
        // Restore title with new name
        titleElement.textContent = trimmedName;
        titleElement.style.display = '';
        input.remove();
        
        // Reload projects to ensure consistency
        const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab || 'recent';
        loadProjects(activeTab);
    };
    
    const cancelRename = () => {
        titleElement.style.display = '';
        input.remove();
    };
    
    input.addEventListener('blur', saveRename);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            input.blur();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelRename();
        }
    });
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return date.toLocaleDateString();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// PWA Install Prompt
let deferredPrompt;

function setupPWAInstall() {
    const installBtn = document.getElementById('installAppBtn');
    
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
        installBtn.style.display = 'none';
        return;
    }
    
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        showInstallPrompt();
    });

    window.addEventListener('appinstalled', () => {
        console.log('PWA installed');
        hideInstallPrompt();
        deferredPrompt = null;
    });
    
    // Handle install button click
    installBtn.addEventListener('click', async () => {
        if (!deferredPrompt) {
            return;
        }
        
        // Show the install prompt
        deferredPrompt.prompt();
        
        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
        } else {
            console.log('User dismissed the install prompt');
        }
        
        deferredPrompt = null;
        hideInstallPrompt();
    });
}

function showInstallPrompt() {
    const installBtn = document.getElementById('installAppBtn');
    installBtn.style.display = 'block';
}

function hideInstallPrompt() {
    const installBtn = document.getElementById('installAppBtn');
    installBtn.style.display = 'none';
}

// Check if app is installed
if (window.matchMedia('(display-mode: standalone)').matches) {
    console.log('Running as PWA');
}

// Authentication Status Check
function checkAuthStatus() {
    const signInBtn = document.getElementById('signInBtn');
    const isSignedIn = localStorage.getItem(AUTH_KEY) === 'true' || 
                       sessionStorage.getItem(AUTH_KEY) === 'true' ||
                       (window.cognitoAuthManager && window.cognitoAuthManager.isAuthenticated());
    
    if (!isSignedIn) {
        signInBtn.style.display = 'block';
        signInBtn.addEventListener('click', handleSignIn);
    } else {
        signInBtn.style.display = 'none';
    }
}

function handleSignIn() {
    // Check if there's a sign-in page in the codebase
    const signInPath = '../Sign in/sign-in.html';
    
    // Try to navigate to sign-in page, or open in same window
    if (window.location.pathname.includes('/Wavecode/')) {
        window.location.href = signInPath;
    } else {
        // Fallback: could open a modal or redirect to a sign-in page
        window.location.href = signInPath;
    }
}

// Listen for auth changes (if using Cognito or other auth system)
if (window.cognitoAuthManager) {
    window.cognitoAuthManager.onAuthStateChange((isAuthenticated) => {
        if (isAuthenticated) {
            localStorage.setItem(AUTH_KEY, 'true');
        } else {
            localStorage.removeItem(AUTH_KEY);
        }
        checkAuthStatus();
    });
}


