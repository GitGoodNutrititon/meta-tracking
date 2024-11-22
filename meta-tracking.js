// Check if pixel is already initialized
if (window.fbq) {
  console.log('Meta Pixel already initialized');
} else {
  console.error('Meta Pixel not initialized. Events will not track properly. Please ensure Facebook Header Code is loaded first.');
  throw new Error('Facebook Pixel must be initialized before meta-tracking.js');
}

// Verify pixel ID matches
if (window._fbq && window._fbq.pixelId !== '766014511309126') {
  console.warn('Pixel ID mismatch detected');
}
// Meta Tracking Code
(async function() {
  const PIXEL_ID = '766014511309126';  // Bullard Nutrition Pixel
  const SERVER_URL = "https://server-side-tagging-542968678390.us-central1.run.app";
  
  const META_EVENTS = {
    STANDARD: [
      'AddPaymentInfo',
      'AddToCart',
      'AddToWishlist',
      'CompleteRegistration',
      'Contact',
      'FindLocation',
      'InitiateCheckout',
      'Purchase',
      'Schedule',
      'Search',
      'StartTrial',
      'CustomizeProduct',
      'Donate',
      'Lead',
      'SubmitApplication',
      'Subscribe',
      'ViewContent'
    ],
    REQUIRED_PARAMS: {
      'AddPaymentInfo': [
        'action_source',
        'content_ids',
        'currency',
        'event_id',
        'event_name',
        'event_source_url',
        'event_time',
        'order_id',
        'value'
      ],
      'AddToCart': [
        'action_source',
        'event_id',
        'event_name',
        'event_source_url',
        'event_time'
      ],
      'AddToWishlist': [
        'action_source',
        'event_id',
        'event_name',
        'event_source_url',
        'event_time'
      ],
      'CompleteRegistration': [
        'action_source',
        'event_id',
        'event_name',
        'event_source_url',
        'event_time'
      ],
      'Contact': [
        'action_source',
        'event_id',
        'event_name',
        'event_source_url',
        'event_time'
      ],
      'FindLocation': [
        'action_source',
        'event_id',
        'event_name',
        'event_source_url',
        'event_time'
      ],
      'InitiateCheckout': [
        'action_source',
        'content_ids',
        'content_type',
        'contents',
        'currency',
        'event_id',
        'event_name',
        'event_source_url',
        'event_time',
        'num_items',
        'value'
      ],
      'Purchase': [
        'action_source',
        'content_ids',
        'content_type',
        'contents',
        'currency',
        'event_id',
        'event_name',
        'event_source_url',
        'event_time',
        'num_items',
        'order_id',
        'value'
      ],
      'Schedule': [
        'action_source',
        'event_id',
        'event_name',
        'event_source_url',
        'event_time'
      ],
      'Search': [
        'action_source',
        'event_id',
        'event_name',
        'event_source_url',
        'event_time'
      ],
      'StartTrial': [
        'action_source',
        'currency',
        'value',
        'predicted_ltv',
        'event_id',
        'event_name',
        'event_source_url',
        'event_time'
      ],
      'Subscribe': [
        'action_source',
        'currency',
        'value',
        'predicted_ltv',
        'event_id',
        'event_name',
        'event_source_url',
        'event_time'
      ]
    },
    CUSTOMER_PARAMS: {
      // These parameters are required for all events
      REQUIRED: [
        'client_user_agent',
        'fbp',
        'fbc',
        'client_ip_address'
      ],
      // These should be included when available
      OPTIONAL: [
        'em',
        'ph',
        'ct',
        'st',
        'zp',
        'country',
        'external_id',
        'subscription_id'
      ]
    }
  };

  // Add GTM to Meta event mapping
  const GTM_TO_META_MAPPING = {
    'gtm.linkClick': 'Click',
    'form_submit': 'Lead',
    'form_start': 'InitiateForm',
    'gtm.scrollDepth': 'PageScroll',
    // Add other mappings as needed
  };

  // Utility Functions
  function generateUniqueId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return '';
  }

  function createFBP() {
    const now = Date.now();
    const randNumber = Math.floor(Math.random() * 1000000000);
    return `fb.1.${now}.${randNumber}`;
  }

  function getFBC() {
    const fbcCookie = getCookie('fbc');
    if (fbcCookie) return fbcCookie;
    
    const urlParams = new URLSearchParams(window.location.search);
    const fbclid = urlParams.get('fbclid');
    if (fbclid) {
      const fbc = `fb.1.${Date.now()}.${fbclid}`;
      document.cookie = `fbc=${fbc}; path=/; max-age=7776000`;
      return fbc;
    }
    return '';
  }

  // Enhanced user data collection
  function getUserData() {
    return {
      client_user_agent: navigator.userAgent,
      client_ip_address: null,
      fbp: getCookie('_fbp') || createFBP(),
      fbc: getFBC(),
      external_id: getCookie('user_id'),
      subscription_id: getCookie('subscription_id'),
      em: null,
      ph: null,
      fn: null,
      ln: null,
      ge: null,
      db: null,
      ct: null,
      st: null,
      zp: null,
      country: null,
      fb_login_id: null,
      lead_id: null
    };
  }

  // Event Queue Management - preserved from old version
  let eventQueue = [];
  const MAX_BATCH_SIZE = 10;
  const RETRY_DELAY = 1000;
  const MAX_RETRIES = 3;

  function addToQueue(event) { /* ... */ }
  function addToRetryQueue(event) { /* ... */ }
  
  const CONFIG = {
    GTM: {
      WEB: 'GTM-WS93H98',
      SERVER: 'GTM-WJ4M8T36'
    },
    ENDPOINTS: {
      WEB: 'https://www.googletagmanager.com/gtag/js',
      SERVER: 'https://us-central1-gtm-wj4m8t36-nwq2m.cloudfunctions.net/meta-tracking'
    }
  };

  // Update processQueue function to send to both endpoints
  async function processQueue() {
    if (eventQueue.length === 0) return;

    const events = eventQueue.splice(0, MAX_BATCH_SIZE);
    
    try {
      // Send to Web GTM
      await fetch(`${CONFIG.ENDPOINTS.WEB}?id=${CONFIG.GTM.WEB}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: events })
      });

      // Send to Server GTM
      await fetch(CONFIG.ENDPOINTS.SERVER, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: events })
      });

      console.log('Events processed successfully to both GTM containers');
    } catch (error) {
      console.error('Failed to process events:', error);
      // Add events back to queue for retry
      events.forEach(event => addToQueue(event));
    }
  }

  // Enhanced validation
  function validateEventParams(eventName, params, userData) {
    // Check event-specific parameters
    const requiredParams = META_EVENTS.REQUIRED_PARAMS[eventName] || [];
    const missingParams = requiredParams.filter(param => !params[param]);
    
    // Check customer parameters
    const requiredCustomerParams = META_EVENTS.CUSTOMER_PARAMS.REQUIRED;
    const missingCustomerParams = requiredCustomerParams.filter(param => !userData[param]);

    if (missingParams.length || missingCustomerParams.length) {
      console.warn(`Missing parameters for ${eventName}:`, {
        eventParams: missingParams,
        customerParams: missingCustomerParams
      });
      return false;
    }
    return true;
  }

  // Replace the existing trackEvent function with this updated version
  async function trackEvent(eventName, eventParams = {}) {
    try {
      const isStandardEvent = META_EVENTS.STANDARD.includes(eventName);
      const isGTMEvent = META_EVENTS.GTM_EVENTS.includes(eventName);
      
      if (!isStandardEvent && !isGTMEvent) {
        console.warn(`Warning: ${eventName} is not a recognized event name`);
      }

      const eventId = generateUniqueId();
      const eventTime = Math.floor(Date.now() / 1000);
      const userData = getUserData();

      // Base event data structure
      const eventData = {
        action_source: "website",
        event_id: eventId,
        event_name: eventName,
        event_source_url: window.location.href,
        event_time: eventTime,
        user_data: userData,
        custom_data: {
          currency: eventParams.currency || "USD",
          value: eventParams.value || "0.00"
        }
      };

      // Add event-specific parameters based on event type
      switch(eventName) {
        case 'Purchase':
        case 'InitiateCheckout':
          eventData.custom_data = {
            ...eventData.custom_data,
            content_ids: eventParams.content_ids || [],
            content_type: eventParams.content_type || "product",
            contents: eventParams.contents || [],
            num_items: eventParams.num_items,
            order_id: eventParams.order_id
          };
          break;
        case 'AddPaymentInfo':
          eventData.custom_data = {
            ...eventData.custom_data,
            content_ids: eventParams.content_ids || [],
            order_id: eventParams.order_id
          };
          break;
        // Add other specific event types as needed
      }

      // 1. Track via browser pixel (client-side)
      const pixelData = {
        ...eventData.custom_data,
        event_id: eventId,
        user_data: {
          fbp: userData.fbp,
          fbc: userData.fbc
        }
      };
      
      // Send to Meta Pixel
      fbq('track', eventName, pixelData);

      // 2. Queue for server-side tracking (Conversions API)
      addToQueue(eventData);
      
      // Log successful tracking
      console.log(`Event ${eventName} tracked successfully`, {
        eventId,
        pixel: true,
        server: true
      });

      return eventId;
    } catch (error) {
      console.error('Failed to track event:', error);
      return null;
    }
  }

  // Start queue processor
  setInterval(processQueue, 1000);

  // Expose tracking function globally
  window.metaTracker = {
    trackEvent,
    META_EVENTS
  };
})();

// Add this validation function
function validateServerEvent(event) {
  // Required fields validation
  const requiredFields = ['event_name', 'event_time', 'user_data', 'action_source'];
  const missingFields = requiredFields.filter(field => !event[field]);
  
  if (missingFields.length > 0) {
    console.error('Missing required fields:', missingFields);
    return false;
  }
  
  // Validate event_time is within 7 days
  const sevenDaysAgo = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);
  if (event.event_time < sevenDaysAgo) {
    console.error('event_time must be within the last 7 days');
    return false;
  }
  
  return true;
}

// Use validation before sending
if (!validateServerEvent(serverEvent)) {
  return null;
}

