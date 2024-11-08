// Check if pixel is already initialized
if (window.fbq) {
  console.log('Meta Pixel already initialized');
} else {
  console.warn('Meta Pixel not initialized. Events may not track properly.');
}

// Meta Tracking Code
(async function() {
  const PIXEL_ID = '766014511309126';  // Bullard Nutrition Pixel
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

  // Event Queue Management
  let eventQueue = [];
  const MAX_BATCH_SIZE = 10;
  const RETRY_DELAY = 1000; // 1 second
  const MAX_RETRIES = 3;

  function addToQueue(event) {
    eventQueue.push(event);
    if (eventQueue.length >= MAX_BATCH_SIZE) {
      processQueue();
    }
  }

  function addToRetryQueue(event) {
    if (event.retries < MAX_RETRIES) {
      event.retries += 1;
      setTimeout(() => {
        addToQueue(event);
      }, RETRY_DELAY * event.retries);
    } else {
      console.error('Max retries reached for event:', event);
    }
  }

  async function processQueue() {
    if (eventQueue.length === 0) return;

    const events = eventQueue.splice(0, MAX_BATCH_SIZE);
    try {
      const accessToken = await fetch('/get-access-token').then(response => response.text());
      
      const response = await fetch(serverUrl, {
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

  // Main tracking function
  async function trackEvent(eventName, eventParams = {}) {
    try {
      if (!META_EVENTS.STANDARD.includes(eventName)) {
        console.warn(`Warning: ${eventName} is not a standard Meta event name`);
      }

      const eventId = generateUniqueId();
      const eventTime = Math.floor(Date.now() / 1000);

      // Ensure FBP exists
      const fbp = getCookie('_fbp') || createFBP();
      if (!getCookie('_fbp')) {
        document.cookie = `_fbp=${fbp}; path=/; max-age=7776000`;
      }
      const fbc = getFBC();

      // Track via browser pixel
      fbq('track', eventName, {
        ...eventParams,
        eventID: eventId
      });

      // Prepare server event
      const serverEvent = {
        event_name: eventName,
        event_time: eventTime,
        event_id: eventId,
        event_source_url: window.location.href,
        user_data: {
          client_user_agent: navigator.userAgent,
          fbp: fbp,
          fbc: fbc
        },
        custom_data: eventParams,
        action_source: 'website',
        retries: 0
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
