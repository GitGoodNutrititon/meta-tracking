// Check if pixel is already initialized
if (window.fbq) {
  console.log('Meta Pixel already initialized');
} else {
  console.warn('Meta Pixel not initialized. Events may not track properly.');
}

// Meta Tracking Code
(async function() {
  const serverUrl = "https://server-side-tagging-o5rufe5lxq-uc.a.run.app";
  const META_EVENTS = {
    STANDARD: [
      'AddPaymentInfo',
      'AddToCart',
      'AddToWishlist',
      'CompleteRegistration',
      'Contact',
      'CustomizeProduct',
      'Donate',
      'FindLocation',
      'InitiateCheckout',
      'Lead',
      'PageView',
      'Purchase',
      'Schedule',
      'Search',
      'StartTrial',
      'SubmitApplication',
      'Subscribe',
      'ViewContent'
    ]
  };

  // Utility Functions
  async function hashData(data) {
    if (!data) return '';
    const encoder = new TextEncoder();
    const hashedData = await crypto.subtle.digest('SHA-256', encoder.encode(data));
    return Array.from(new Uint8Array(hashedData))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  function generateUniqueId() {
    return 'br_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
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

  async function getClientIP() {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      console.error('Error getting IP:', error);
      return '';
    }
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

  function normalizeEventTime(timestamp) {
    return Math.floor(timestamp / 1000);
  }

  // Event Queue and Batching
  const eventQueue = [];
  const BATCH_SIZE = 50;
  const retryQueue = [];
  const MAX_RETRIES = 2;
  const MAX_QUEUE_SIZE = 50;

  function addToEventQueue(event) {
    eventQueue.push(event);
    if (eventQueue.length >= BATCH_SIZE) {
      sendEventBatch(eventQueue.splice(0, BATCH_SIZE));
    }
  }

  function addToRetryQueue(event, attempts = 0) {
    if (attempts >= MAX_RETRIES || retryQueue.length >= MAX_QUEUE_SIZE) {
      console.error('Max retry attempts reached or queue full:', event);
      return;
    }
    
    const retryDelay = Math.min(Math.pow(2, attempts) * 1000, 5000);
    setTimeout(() => {
      sendServerEvent(event).catch(() => {
        if (attempts < MAX_RETRIES) {
          addToRetryQueue(event, attempts + 1);
        }
      });
    }, retryDelay);
  }

  async function sendEventBatch(events) {
    try {
      const response = await fetch(serverUrl + '/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events })
      });
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    } catch (error) {
      console.error('Failed to send event batch:', error);
      events.forEach(event => addToRetryQueue(event));
    }
  }

  async function sendServerEvent(event) {
    try {
      // Format the event data properly
      const eventData = {
        data: [{
          event_name: event.event_name,
          event_time: event.event_time,
          event_id: event.event_id,
          event_source_url: event.event_source_url,
          user_data: event.user_data,
          custom_data: event.custom_data,
          action_source: "website"
        }]
      };

      const response = await fetch(serverUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'no-cors',
        credentials: 'omit',
        body: JSON.stringify(eventData)
      });

      if (response.type === 'opaque') {
        console.log('Event sent successfully');
        return;
      }
    } catch (error) {
      console.error('Failed to send event:', error);
      if (!event._isRetry) {
        event._isRetry = true;
        addToRetryQueue(event);
      }
    }
  }

  // Main Event Tracking Functions
  async function createServerEvent(eventName, eventParams = {}) {
    const eventId = eventParams.event_id || generateUniqueId();
    const eventTime = normalizeEventTime(eventParams.event_time || Date.now());
    
    if (!getCookie('_fbp')) {
      document.cookie = `_fbp=${createFBP()}; path=/; max-age=7776000`;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const userData = {
      fn: await hashData(urlParams.get('first_name') || ''),
      ln: await hashData(urlParams.get('last_name') || ''),
      em: await hashData(urlParams.get('email') || ''),
      ph: await hashData(urlParams.get('phone') || ''),
      external_id: urlParams.get('external_id') || localStorage.getItem('user_external_id') || '',
      client_ip_address: urlParams.get('client_ip_address') || await getClientIP() || '',
      client_user_agent: navigator.userAgent,
      fbp: getCookie('_fbp'),
      fbc: getFBC()
    };

    const event = {
      event_name: eventName,
      event_time: eventTime,
      event_id: eventId,
      event_source_url: window.location.href,
      action_source: "website",
      user_data: userData,
      custom_data: {
        currency: 'USD',
        ...eventParams
      },
      data_processing_options: [],
      data_processing_options_country: 0,
      data_processing_options_state: 0
    };

    return event;
  }

  async function trackEvent(eventName, eventParams = {}) {
    try {
      // 1. Generate consistent event ID first
      const eventId = generateUniqueId();
      const eventTime = Math.floor(Date.now() / 1000);
      
      // 2. Get user data BEFORE sending events
      const userData = {
        fbp: getCookie('_fbp') || createFBP(),
        fbc: getFBC(),
        client_user_agent: navigator.userAgent,
        client_ip_address: null // Server will populate this
      };

      // 3. Send browser event with ID
      fbq('track', eventName, {
        ...eventParams,
        eventID: eventId // Critical for deduplication
      });

      // 4. Send server event with matching ID and user data
      const serverEvent = {
        event_name: eventName,
        event_time: eventTime,
        event_id: eventId, // Must match browser eventID
        event_source_url: window.location.href,
        user_data: userData,
        custom_data: eventParams
      };

      await sendServerEvent(serverEvent);
      console.log(`Event tracked (ID: ${eventId})`);
    } catch (error) {
      console.error('Failed to track event:', error);
    }
  }

  // Initialize tracking
  window.metaTracker = {
    trackEvent,
    META_EVENTS,
    generateUniqueId
  };

  // Track initial PageView
  const pageViewEventId = generateUniqueId();
  trackEvent('PageView', {}, { eventID: pageViewEventId });
})();
