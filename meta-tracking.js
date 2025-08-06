/**
 * Bullard Nutrition Meta Pixel Advanced Tracking System
 * Compatible with Header Code V2 - Performance Optimized
 * 
 * Features:
 * - Enhanced Conversions API integration
 * - Automatic event detection and tracking
 * - Smart user data collection
 * - Performance optimized queuing
 * - Error handling and retry logic
 * - GTM integration
 */

(function() {
    'use strict';
    
    // Configuration
    const CONFIG = {
        PIXEL_ID: '766014511309126',
        SERVER_ENDPOINT: 'https://server-side-tagging-542968678390.us-central1.run.app',
        GTM_CONTAINERS: {
            WEB: 'GTM-WS93H98',
            SERVER: 'GTM-WJ4M8T36'
        },
        GA4_MEASUREMENT_ID: 'G-8X02967YHD',
        QUEUE: {
            MAX_BATCH_SIZE: 5,
            PROCESS_INTERVAL: 2000,
            MAX_RETRIES: 3,
            RETRY_DELAY: 1000
        },
        SCROLL_THRESHOLDS: [25, 50, 75, 90]
    };

    // State management
    let state = {
        initialized: false,
        eventQueue: [],
        scrollDepth: 0,
        pageStartTime: Date.now(),
        sessionId: generateSessionId()
    };

    // Event definitions
    const META_EVENTS = {
        STANDARD: [
            'PageView', 'Purchase', 'InitiateCheckout', 'AddToCart', 
            'AddPaymentInfo', 'CompleteRegistration', 'Contact', 
            'Lead', 'Subscribe', 'ViewContent', 'Search'
        ],
        CUSTOM: [
            'scroll_depth', 'time_on_page', 'form_interaction', 
            'button_click', 'video_engagement'
        ]
    };

    // Utility Functions
    function generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    function generateEventId() {
        return 'event_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        return parts.length === 2 ? parts.pop().split(';').shift() : null;
    }

    function setCookie(name, value, days = 90) {
        const expires = new Date(Date.now() + days * 864e5).toUTCString();
        document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`;
    }

    function createFBP() {
        let fbp = getCookie('_fbp');
        if (!fbp) {
            const timestamp = Date.now();
            const random = Math.floor(Math.random() * 1000000000);
            fbp = `fb.1.${timestamp}.${random}`;
            setCookie('_fbp', fbp);
        }
        return fbp;
    }

    function createFBC() {
        let fbc = getCookie('_fbc');
        if (!fbc) {
            // Check for fbclid in URL or localStorage
            const urlParams = new URLSearchParams(window.location.search);
            const fbclid = urlParams.get('fbclid') || localStorage.getItem('fbclid');
            
            if (fbclid) {
                fbc = `fb.1.${Date.now()}.${fbclid}`;
                setCookie('_fbc', fbc);
                localStorage.setItem('fbclid', fbclid);
            }
        }
        return fbc;
    }

    // Enhanced user data collection
    function getUserData() {
        const userData = {
            // Browser fingerprinting
            client_user_agent: navigator.userAgent,
            client_ip_address: null, // Server-side only
            
            // Facebook specific
            fbp: createFBP(),
            fbc: createFBC(),
            
            // User identifiers (will be hashed server-side)
            external_id: getCookie('user_id') || localStorage.getItem('user_id'),
            em: getEmailFromForms() || getCookie('user_email'),
            ph: getPhoneFromForms() || getCookie('user_phone'),
            fn: getCookie('user_first_name'),
            ln: getCookie('user_last_name'),
            db: getCookie('user_dob'),
            ct: getCookie('user_city'),
            st: getCookie('user_state'),
            zp: getCookie('user_zip'),
            country: getCookie('user_country') || 'US'
        };

        // Clean up undefined values
        Object.keys(userData).forEach(key => {
            if (userData[key] === null || userData[key] === undefined || userData[key] === '') {
                delete userData[key];
            }
        });

        return userData;
    }

    // Smart form data extraction
    function getEmailFromForms() {
        const emailSelectors = [
            'input[type="email"]',
            'input[name*="email" i]',
            'input[id*="email" i]',
            'input[placeholder*="email" i]'
        ];

        for (const selector of emailSelectors) {
            const element = document.querySelector(selector);
            if (element && element.value && isValidEmail(element.value)) {
                return element.value.toLowerCase().trim();
            }
        }
        return null;
    }

    function getPhoneFromForms() {
        const phoneSelectors = [
            'input[type="tel"]',
            'input[name*="phone" i]',
            'input[id*="phone" i]',
            'input[placeholder*="phone" i]'
        ];

        for (const selector of phoneSelectors) {
            const element = document.querySelector(selector);
            if (element && element.value) {
                return element.value.replace(/\D/g, ''); // Remove non-digits
            }
        }
        return null;
    }

    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Event tracking system
    async function trackEvent(eventName, customData = {}, options = {}) {
        if (!state.initialized) {
            console.warn('Meta tracking not initialized. Queuing event:', eventName);
            return queueEvent(eventName, customData, options);
        }

        try {
            const eventId = generateEventId();
            const eventTime = Math.floor(Date.now() / 1000);
            const userData = getUserData();

            // Base event structure for Conversions API
            const serverEvent = {
                event_name: eventName,
                event_id: eventId,
                event_time: eventTime,
                event_source_url: window.location.href,
                action_source: 'website',
                user_data: userData,
                custom_data: {
                    currency: customData.currency || 'USD',
                    value: customData.value || 0,
                    content_name: customData.content_name || document.title,
                    content_category: customData.content_category || getPageCategory(),
                    ...customData
                }
            };

            // Enhanced data for specific events
            if (eventName === 'Purchase' || eventName === 'InitiateCheckout') {
                serverEvent.custom_data = {
                    ...serverEvent.custom_data,
                    content_ids: customData.content_ids || ['unknown'],
                    content_type: customData.content_type || 'product',
                    num_items: customData.num_items || 1
                };
            }

            // Client-side pixel tracking (immediate)
            if (window.fbq && typeof window.fbq === 'function') {
                const pixelData = {
                    ...serverEvent.custom_data,
                    event_id: eventId
                };
                
                window.fbq('track', eventName, pixelData);
                console.log(`✅ Client-side pixel: ${eventName}`, pixelData);
            }

            // Server-side tracking (queued)
            addToQueue(serverEvent);
            
            // GTM integration
            if (window.dataLayer) {
                window.dataLayer.push({
                    event: 'meta_pixel_event',
                    event_name: eventName,
                    event_id: eventId,
                    custom_data: serverEvent.custom_data
                });
            }

            console.log(`📊 Event tracked: ${eventName}`, {
                eventId,
                client: true,
                server: 'queued'
            });

            return eventId;

        } catch (error) {
            console.error('❌ Failed to track event:', eventName, error);
            return null;
        }
    }

    // Queue management
    function addToQueue(event) {
        state.eventQueue.push({
            ...event,
            attempts: 0,
            timestamp: Date.now()
        });

        if (state.eventQueue.length >= CONFIG.QUEUE.MAX_BATCH_SIZE) {
            processQueue();
        }
    }

    function queueEvent(eventName, customData, options) {
        const queuedEvent = {
            eventName,
            customData,
            options,
            timestamp: Date.now()
        };
        
        // Store in localStorage for persistence
        const queuedEvents = JSON.parse(localStorage.getItem('meta_queued_events') || '[]');
        queuedEvents.push(queuedEvent);
        localStorage.setItem('meta_queued_events', JSON.stringify(queuedEvents));
        
        return 'queued_' + Date.now();
    }

    async function processQueue() {
        if (state.eventQueue.length === 0) return;

        const events = state.eventQueue.splice(0, CONFIG.QUEUE.MAX_BATCH_SIZE);
        
        try {
            const response = await fetch(CONFIG.SERVER_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': navigator.userAgent
                },
                body: JSON.stringify({
                    data: events,
                    access_token: 'server_side', // Server will handle token
                    pixel_id: CONFIG.PIXEL_ID
                })
            });

            if (response.ok) {
                console.log(`✅ Server events processed: ${events.length}`);
            } else {
                throw new Error(`HTTP ${response.status}`);
            }

        } catch (error) {
            console.error('❌ Failed to process server events:', error);
            
            // Retry logic
            events.forEach(event => {
                if (event.attempts < CONFIG.QUEUE.MAX_RETRIES) {
                    event.attempts++;
                    setTimeout(() => {
                        state.eventQueue.push(event);
                    }, CONFIG.QUEUE.RETRY_DELAY * event.attempts);
                }
            });
        }
    }

    // Automatic event detection
    function initAutoTracking() {
        // Scroll depth tracking
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                const scrollPercent = Math.round(
                    (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
                );
                
                const threshold = CONFIG.SCROLL_THRESHOLDS.find(t => scrollPercent >= t && t > state.scrollDepth);
                if (threshold) {
                    state.scrollDepth = threshold;
                    trackEvent('scroll_depth', {
                        scroll_depth: threshold,
                        page_location: window.location.href
                    });
                }
            }, 100);
        });

        // Form interactions
        document.addEventListener('focusin', (e) => {
            if (e.target.matches('input, textarea, select')) {
                trackEvent('form_interaction', {
                    form_field: e.target.name || e.target.id || 'unknown',
                    form_type: e.target.form?.name || 'unknown'
                });
            }
        });

        // Button clicks
        document.addEventListener('click', (e) => {
            const button = e.target.closest('button, .btn, [role="button"]');
            if (button) {
                trackEvent('button_click', {
                    button_text: button.textContent?.trim() || 'unknown',
                    button_location: window.location.pathname
                });
            }
        });

        // Time on page tracking
        setInterval(() => {
            const timeOnPage = Math.floor((Date.now() - state.pageStartTime) / 1000);
            if (timeOnPage % 30 === 0) { // Every 30 seconds
                trackEvent('time_on_page', {
                    time_on_page: timeOnPage,
                    page_location: window.location.href
                });
            }
        }, 30000);
    }

    // Helper functions
    function getPageCategory() {
        const path = window.location.pathname;
        if (path.includes('blog')) return 'blog';
        if (path.includes('product')) return 'product';
        if (path.includes('checkout')) return 'checkout';
        if (path.includes('contact')) return 'contact';
        return 'general';
    }

    function processQueuedEvents() {
        const queuedEvents = JSON.parse(localStorage.getItem('meta_queued_events') || '[]');
        if (queuedEvents.length > 0) {
            console.log(`Processing ${queuedEvents.length} queued events`);
            queuedEvents.forEach(({ eventName, customData, options }) => {
                trackEvent(eventName, customData, options);
            });
            localStorage.removeItem('meta_queued_events');
        }
    }

    // Initialization
    function initialize() {
        // Check if Meta Pixel is loaded
        if (!window.fbq || typeof window.fbq !== 'function') {
            console.error('❌ Meta Pixel not found. Tracking will be server-side only.');
            return false;
        }

        // Verify pixel ID
        if (window.fbq.pixelId && window.fbq.pixelId !== CONFIG.PIXEL_ID) {
            console.warn('⚠️ Pixel ID mismatch detected');
        }

        state.initialized = true;
        
        // Start queue processor
        setInterval(processQueue, CONFIG.QUEUE.PROCESS_INTERVAL);
        
        // Initialize auto-tracking
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initAutoTracking);
        } else {
            initAutoTracking();
        }

        // Process any queued events
        processQueuedEvents();

        // Track initial page view
        trackEvent('PageView', {
            page_title: document.title,
            page_location: window.location.href,
            referrer: document.referrer
        });

        console.log('✅ Meta Tracking System initialized');
        return true;
    }

    // Public API
    window.BullardMetaTracking = {
        track: trackEvent,
        initialize: initialize,
        getState: () => ({ ...state }),
        CONFIG: CONFIG,
        META_EVENTS: META_EVENTS
    };

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        // Small delay to ensure Meta Pixel is loaded
        setTimeout(initialize, 500);
    }

})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.BullardMetaTracking;
}
