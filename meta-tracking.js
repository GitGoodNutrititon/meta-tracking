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
      'StartTrial'
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
      client_ip: null, // Server will populate this
      fbp: getCookie('_fbp') || createFBP(),
      fbc: getFBC(),
      external_id: getCookie('user_id'),
      subscription_id: getCookie('subscription_id'),
      em: null,  // Will be hashed when provided
      ph: null,  // Will be hashed when provided
      fn: null,  // Will be hashed when provided
      ln: null,  // Will be hashed when provided
      ge: null,  // Will be hashed when provided
      db: null,  // Will be hashed when provided
      ct: null,  // Will be hashed when provided
      st: null,  // Will be hashed when provided
      zp: null,  // Will be hashed when provided
      country: null,  // Will be hashed when provided
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
  
  async function processQueue() {
    if (eventQueue.length === 0) return;

    const events = eventQueue.splice(0, MAX_BATCH_SIZE);
    try {
      const accessToken = await fetch('/get-access-token').then(response => response.text());
      
      const response = await fetch(SERVER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          data: events,
          pixel_id: PIXEL_ID
        })
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      console.log(`Batch of ${events.length} events processed successfully`);
    } catch (error) {
      console.error('Failed to process event batch:', error);
      events.forEach(event => addToRetryQueue(event));
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

  // Enhanced tracking function
  async function trackEvent(eventName, eventParams = {}) {
    try {
      // Convert GTM events to Meta standard events if applicable
      const metaEventName = GTM_TO_META_MAPPING[eventName] || eventName;
      
      if (!META_EVENTS.STANDARD.includes(metaEventName)) {
        console.warn(`Warning: ${metaEventName} is not a standard Meta event name`);
      }

      // Validate required parameters
      if (!validateEventParams(metaEventName, eventParams, getUserData())) {
        return null;
      }

      const eventId = generateUniqueId();
      const eventTime = Math.floor(Date.now() / 1000);

      // Ensure FBP exists
      const fbp = getCookie('_fbp') || createFBP();
      if (!getCookie('_fbp')) {
        document.cookie = `_fbp=${fbp}; path=/; max-age=7776000`;
      }

      // Add page metadata
      const eventData = {
        ...eventParams,
        page_location: window.location.href,
        page_title: document.title,
        page_referrer: document.referrer,
        eventID: eventId
      };

      // Track via browser pixel
      fbq('track', metaEventName, eventData);

      // Prepare enhanced server event
      const serverEvent = {
        event_name: metaEventName,
        event_time: eventTime,
        event_id: eventId,
        event_source_url: window.location.href,
        user_data: getUserData(),
        custom_data: eventData,
        action_source: 'website',
        opt_out: false,
        data_processing_options: [],
        data_processing_options_country: 0,
        data_processing_options_state: 0,
        referrer_url: document.referrer
      };

      // Add to processing queue
      addToQueue(serverEvent);
      
      console.log(`Event queued for processing (ID: ${eventId})`);
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

