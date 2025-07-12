(function() {
    'use strict';
    
    const currentUrl = window.location.href;
    // Normalize URL by removing '/watch/' segment if present
    const finalUrl = currentUrl.includes('/watch/') ? currentUrl.replace("/watch/", "/") : currentUrl;
    const app = {};
    
    const DOMElements = {
        fileName: document.getElementById('file-name'),
        streamDropdownContainer: document.getElementById('stream-dropdown-container'),
        streamMenu: document.getElementById('stream-menu'),
        toast: document.getElementById('toast'),
        toastMessage: document.querySelector('#toast .toast-message'),
        toastIcon: document.querySelector('#toast .toast-icon'),
        themeToggleBtn: document.querySelector('.toggle-dark-mode')
    };
    
    let toastTimeout = null;
    
    const sanitizeFilename = name => {
        return name.replace(/[^a-z0-9\-_]/gi, '_')
                   .replace(/_+/g, '_')
                   .replace(/^_+|_+$/g, '')
                   .substring(0, 100);
    };
    
    const getFileExtension = url => {
        try {
            const p = new URL(url).pathname;
            const d = p.lastIndexOf('.');
            if (d > 0 && d < p.length - 1) return p.substring(d + 1).toLowerCase();
        } catch (e) {
            console.error('getFileExtension error:', e);
        }
        return 'file';
    };
    
    const getCurrentFileName = () => DOMElements.fileName?.textContent?.trim() || '';
    
    const setTheme = theme => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        const icon = DOMElements.themeToggleBtn?.querySelector('i');
        if (icon) {
            icon.className = theme === 'light' ? 'fas fa-sun' : 'fas fa-moon';
            icon.classList.add('rotate-icon');
            setTimeout(() => icon.classList.remove('rotate-icon'), 500);
        }
        if (DOMElements.themeToggleBtn) {
            DOMElements.themeToggleBtn.setAttribute('aria-pressed', theme === 'dark' ? 'false' : 'true');
        }
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content',
            theme === 'dark' ? '#1a1a2e' : '#f2efe7');
        document.documentElement.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme } }));
    };
    
    app.toggleDarkMode = () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        setTheme(currentTheme === 'dark' ? 'light' : 'dark');
    };
    
    // Initialize theme from saved or system preference
    const setupTheme = () => {
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
        setTheme(savedTheme || (prefersDark ? 'dark' : 'light'));
    };
    
    const setInitialFileMetadata = () => {
        if (DOMElements.fileName && !DOMElements.fileName.textContent?.trim()) {
            DOMElements.fileName.textContent = "File";
        }
    };
    
    const showToast = (message, type = 'info', duration = 3000) => {
        if (!DOMElements.toast || !DOMElements.toastMessage) return;
        DOMElements.toastMessage.textContent = message;
        DOMElements.toast.className = 'toast show ' + type;
        DOMElements.toast.classList.remove('hide');
        if (DOMElements.toastIcon) {
            const icon = DOMElements.toastIcon.querySelector('i');
            if (icon) {
                const icons = {
                    success: 'fa-check-circle',
                    error: 'fa-times-circle',
                    warning: 'fa-exclamation-triangle',
                    info: 'fa-info-circle'
                };
                icon.className = `fas ${icons[type] || icons.info}`;
            }
        }
        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            DOMElements.toast.classList.add('hide');
            setTimeout(() => {
                DOMElements.toast.classList.remove('show', 'hide', 'success', 'error', 'warning', 'info');
            }, 400);
        }, duration);
    };
    
    const closeDropdown = (container, button) => {
        if (!container?.classList.contains('open')) return;
        container.classList.remove('open');
        button?.setAttribute('aria-expanded', 'false');
        document.removeEventListener('click', closeDropdownOnClickOutside, true);
        document.removeEventListener('keydown', handleDropdownKeys);
        button?.focus();
    };
    
    const openDropdownMenu = (container, menu, button, e, keyHandler, clickHandler) => {
        if (!container || !menu || !button) return;
        const isOpen = container.classList.toggle('open');
        button.setAttribute('aria-expanded', isOpen.toString());
        if (isOpen) {
            const firstItem = menu.querySelector('.dropdown-item[tabindex="0"]');
            if (firstItem) firstItem.focus();
            document.addEventListener('click', clickHandler, true);
            document.addEventListener('keydown', keyHandler);
        } else {
            document.removeEventListener('click', clickHandler, true);
            document.removeEventListener('keydown', keyHandler);
        }
        if (e) e.stopPropagation();
    };
    
    const closeDropdownOnClickOutside = e => {
        document.querySelectorAll('.dropdown-container.open').forEach(container => {
            if (!container.contains(e.target)) {
                const button = container.querySelector('[aria-haspopup="true"]');
                closeDropdown(container, button);
            }
        });
    };
    
    const handleDropdownKeys = e => {
        document.querySelectorAll('.dropdown-container.open').forEach(container => {
            const menu = container.querySelector('.dropdown-menu');
            const items = Array.from(menu?.querySelectorAll('.dropdown-item[tabindex="0"]') || []);
            if (items.length === 0) return;
    
            const activeIndex = items.findIndex(item => item === document.activeElement);
            let handled = true;
    
            switch (e.key) {
                case 'Escape':
                    const button = container.querySelector('[aria-haspopup="true"]');
                    closeDropdown(container, button);
                    break;
                case 'ArrowDown':
                    items[(activeIndex + 1) % items.length].focus();
                    break;
                case 'ArrowUp':
                    items[(activeIndex - 1 + items.length) % items.length].focus();
                    break;
                case 'Home':
                    items[0]?.focus();
                    break;
                case 'End':
                    items[items.length - 1]?.focus();
                    break;
                case 'Tab':
                    closeDropdown(container, container.querySelector('[aria-haspopup="true"]'));
                    handled = false;
                    break;
                default:
                    handled = false;
            }
    
            if (handled) {
                e.preventDefault();
                e.stopPropagation();
            }
        });
    };
    
    app.toggleDropdownMenu = (containerId, menuId, buttonId, e) => {
        const container = document.getElementById(containerId);
        const menu = document.getElementById(menuId);
        const button = document.getElementById(buttonId);
        openDropdownMenu(container, menu, button, e, handleDropdownKeys, closeDropdownOnClickOutside);
    };
    
    app.toggleStreamMenu = (e) => {
        app.toggleDropdownMenu('stream-dropdown-container', 'stream-menu', 'stream-btn-label', e);
    };
    
    app.closeStreamMenu = () => {
        const container = document.getElementById('stream-dropdown-container');
        const button = document.getElementById('stream-btn-label');
        closeDropdown(container, button);
    };
    
    const playerUrlBuilder = {
        'vlc-pc': url => `vlc://${url}`,
        'potplayer': url => `potplayer://${url}`,
        'mpc': url => `mpc://${url}`,
        'kmpc': url => `kmplayer://${url}`,
        'vlc': url => `intent:${url}#Intent;package=org.videolan.vlc;S.title=${encodeURIComponent(getCurrentFileName() || 'Video')};end`,
        'mx': url => `intent:${url}#Intent;package=com.mxtech.videoplayer.ad;S.title=${encodeURIComponent(getCurrentFileName() || 'Video')};end`,
        'mxpro': url => `intent:${url}#Intent;package=com.mxtech.videoplayer.pro;S.title=${encodeURIComponent(getCurrentFileName() || 'Video')};end`,
        'nplayer': url => `nplayer-${url}`,
        'splayer': url => `intent:${url}#Intent;action=com.young.simple.player.playback_online;package=com.young.simple.player;end`,
        'km': url => `intent:${url}#Intent;package=com.kmplayer;S.title=${encodeURIComponent(getCurrentFileName() || 'Video')};end`,
    };
    
    app.playOnline = type => {
        const container = DOMElements.streamDropdownContainer;
        const button = DOMElements.streamDropdownContainer.querySelector('[aria-haspopup="true"]');
        closeDropdown(container, button);
        const urlBuilder = playerUrlBuilder[type];
        const playerName = type.replace('-pc', ' (PC)')
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase());
        
        if (!urlBuilder || !finalUrl || !finalUrl.startsWith('http')) { 
            showToast(`Invalid URL or player type`, 'error'); 
            return; 
        }
        
        const appUrl = urlBuilder(finalUrl);
        
        try {
            const win = window.open(appUrl, '_blank');
            if (win && !win.closed) {
                showToast(`Launching ${playerName}...`, 'info');
            } else {
                showToast(`Could not open ${playerName} - please install the app`, 'error');
            }
        } catch (err) {
            console.error('Error opening external player:', err);
            showToast(`Failed to open ${playerName}`, 'error');
        }
    };
    
    const getSanitizedFilename = () => {
        const defaultName = 'file';
        const displayedName = getCurrentFileName();
        
        if (displayedName && displayedName !== 'File') {
            return sanitizeFilename(displayedName);
        }
        
        try {
            const url = new URL(finalUrl);
            const pathParts = url.pathname.split('/').filter(p => p);
            let filename = pathParts.pop() || defaultName;
            filename = filename.replace(/\.[^/.]+$/, ''); // Remove extension
            return sanitizeFilename(filename);
        } catch (e) {
            console.error('Filename error:', e);
            return defaultName;
        }
    };

    app.handleDownload = () => {
        if (!isValidUrl(finalUrl)) {
            showToast('Invalid download URL', 'error');
            return;
        }

        try {
            const link = document.createElement('a');
            link.href = finalUrl;
            link.download = `${getSanitizedFilename()}.${getFileExtension(finalUrl)}`;
            link.rel = 'noopener noreferrer';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showToast('Download started', 'success');
        } catch (err) {
            console.error('Download error:', err);
            showToast('Download failed', 'error');
        }
    };
    
    const isValidUrl = url => {
        try {
            new URL(url);
            return url.startsWith('http');
        } catch {
            return false;
        }
    };

    app.copyToClipboard = async () => {
        if (!isValidUrl(finalUrl)) {
            showToast('Invalid URL', 'error');
            return;
        }

        try {
            await navigator.clipboard.writeText(finalUrl);
            showToast('Link copied to clipboard', 'success');
        } catch (err) {
            console.error('Clipboard error:', err);
            showToast('Copy failed - please copy manually', 'error');
        }
    };
    
    const init = () => {
        // Set current year in footer
        document.getElementById('current-year').textContent = new Date().getFullYear();
        window.app = app;
        
        if (!finalUrl || !finalUrl.startsWith('http')) {
            console.error("Invalid URL detected:", finalUrl);
            showToast('Invalid media URL', 'error');
            return;
        }
        
        setupTheme();
        setInitialFileMetadata();
    
        const addRippleEffect = (e) => {
            const button = e.currentTarget;
            const oldRipple = button.querySelector('.ripple');
            if (oldRipple) oldRipple.remove();
    
            const rect = button.getBoundingClientRect();
            const ripple = document.createElement('span');
            ripple.className = 'ripple';
            const size = Math.max(rect.width, rect.height);
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
            ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
    
            button.appendChild(ripple);
    
            ripple.addEventListener('animationend', () => {
                ripple.remove();
            });
        };
    
        // Attach event listeners
        document.querySelector('.toggle-dark-mode')?.addEventListener('click', app.toggleDarkMode);
        document.getElementById('stream-btn-label')?.addEventListener('click', app.toggleStreamMenu);
        document.querySelector('.stream-menu-close')?.addEventListener('click', app.closeStreamMenu);
        document.querySelectorAll('.player-card').forEach(card => {
            card.addEventListener('click', () => app.playOnline(card.dataset.playerType));
        });
        document.querySelector('[title="Download the video"]')?.addEventListener('click', app.handleDownload);
        document.querySelector('[title="Copy video link"]')?.addEventListener('click', app.copyToClipboard);
        
        document.querySelectorAll('.action-button').forEach(btn => {
            btn.addEventListener('click', addRippleEffect, { passive: true });
        });
    
        if (document.readyState === 'complete') {
            initializePlayer();
        } else {
            window.addEventListener('load', initializePlayer, { once: true });
        }
        
        window.addEventListener('beforeunload', () => {
            clearTimeout(toastTimeout);
        });
    };
    
    const initializePlayer = () => {
        const playerElement = document.getElementById('player');
        if (!playerElement) {
            console.error('Player element not found');
            return;
        }

        // Dynamically set the source type based on the file extension
        const sourceElement = playerElement.querySelector('source');
        if (sourceElement && sourceElement.src) {
            const fileExtension = getFileExtension(sourceElement.src);
            let mimeType = '';
            if (playerElement.tagName.toLowerCase() === 'video') {
                switch (fileExtension) {
                    case 'mp4': mimeType = 'video/mp4'; break;
                    case 'webm': mimeType = 'video/webm'; break;
                    case 'ogg': mimeType = 'video/ogg'; break;
                    default: mimeType = `video/${fileExtension}`; break; // Fallback
                }
            } else if (playerElement.tagName.toLowerCase() === 'audio') {
                switch (fileExtension) {
                    case 'mp3': mimeType = 'audio/mpeg'; break;
                    case 'ogg': mimeType = 'audio/ogg'; break;
                    case 'wav': mimeType = 'audio/wav'; break;
                    default: mimeType = `audio/${fileExtension}`; break; // Fallback
                }
            }
            sourceElement.type = mimeType;
        }
    
        try {
            const plyrInstance = new Plyr(playerElement, {
                captions: { active: true },
                controls: [
                    'play-large',
                    'play',
                    'progress',
                    'current-time',
                    'mute',
                    'volume',
                    'captions',
                    'settings',
                    'pip',
                    'fullscreen'
                ],
                settings: ['captions', 'speed'],
                keyboard: { focused: true, global: true },
                i18n: {
                    speed: 'Speed',
                    normal: 'Normal'
                }
            });
    
            window.player = plyrInstance;
    
    
            playerElement.addEventListener('loadedmetadata', () => {
                updateVideoMetadata();
                if (playerElement.textTracks && playerElement.textTracks.length > 0) {
                    for (let i = 0; i < playerElement.textTracks.length; i++) {
                        const track = playerElement.textTracks[i];
                        if (track.kind === 'subtitles' || track.kind === 'captions') {
                            track.mode = 'showing';
                            break;
                        }
                    }
                    plyrInstance.captions?.toggle(true);
                }
            });
    
            plyrInstance.on('ready', () => {
                console.log('Plyr is ready');
                updateVideoMetadata();
                plyrInstance.volume = 1.0;
                
            });
            plyrInstance.on('error', (event) => {
                console.error('Plyr error:', event);
                showToast('Video player error. Please try again later.', 'error');
            });
            
            // Handle PiP errors
            plyrInstance.on('play', () => {});
            plyrInstance.on('pause', () => {});
            plyrInstance.on('ended', () => {});
            plyrInstance.on('seeked', () => {});
            plyrInstance.on('volumechange', () => {});
            plyrInstance.on('ratechange', () => {});

        } catch (error) {
            console.error('Failed to initialize Plyr:', error);
            showToast('Video player failed to initialize', 'error');
        }
    };
    
    const updateVideoMetadata = () => {
        const playerElement = document.getElementById('player');
        if (!playerElement) return;
        const duration = playerElement.duration;
        const videoWidth = playerElement.videoWidth;
        const videoHeight = playerElement.videoHeight;
        const formatTime = (secs, showHrs = false) => {
            if (isNaN(secs) || secs < 0) return showHrs ? '0:00:00' : '0:00';
            secs = Math.round(secs);
            const h = Math.floor(secs / 3600);
            const m = Math.floor((secs % 3600) / 60);
            const s = secs % 60;
            return (showHrs || h > 0) ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` : `${m}:${s.toString().padStart(2, '0')}`;
        };
        const metaContainer = document.querySelector('.file-meta');
        if (metaContainer) {
            const updateOrCreateMetaItem = (id, value, prefix) => {
                let element = metaContainer.querySelector(`#${id}`);
                if (!element) {
                    element = document.createElement('span');
                    element.id = id;
                    metaContainer.appendChild(element);
                }
                element.textContent = `${prefix}: ${value}`;
            };
            updateOrCreateMetaItem('file-duration', (!isNaN(duration) && duration > 0) ? formatTime(duration, duration >= 3600) : 'N/A', 'Dur');
            updateOrCreateMetaItem('file-resolution', (videoWidth > 0 && videoHeight > 0) ? `${videoWidth}x${videoHeight}` : 'N/A', 'Res');
        }
    };
    
    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', init);
    else
        init();
    
    })();
    