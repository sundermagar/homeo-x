(function() {
  var currentScript = document.currentScript;
  var scriptUrl = currentScript ? currentScript.src : '';
  var baseUrl = scriptUrl ? new URL(scriptUrl).origin : window.location.origin;

  var widgetId = window.HomeoxWidgetId;
  if (!widgetId) {
    console.error('Homeo-X Widget: window.HomeoxWidgetId is not defined.');
    return;
  }

  // Generate or retrieve persistent Session UUID for local chat tracking
  var sessionKey = 'homeox_chat_session_' + widgetId;
  var sessionId = localStorage.getItem(sessionKey);
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem(sessionKey, sessionId);
  }

  // Local Storage key for message history
  var historyKey = 'homeox_chat_history_' + widgetId;
  var chatHistory = [];
  try {
    chatHistory = JSON.parse(localStorage.getItem(historyKey) || '[]');
  } catch(e) {
    chatHistory = [];
  }

  // Fetch configuration
  fetch(baseUrl + '/api/widget/config/' + widgetId)
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data.success && data.data && data.data.widgetConfig) {
        initWidget(data.data.widgetConfig);
      } else {
        console.error('Homeo-X Widget: Failed to load widget configuration.');
      }
    })
    .catch(function(err) {
      console.error('Homeo-X Widget: Error loading configuration:', err);
    });

  function initWidget(config) {
    // Merge defaults
    var primaryColor = config.primaryColor || '#075e54';
    var accentColor = config.accentColor || '#0066cc';
    var widgetStyle = config.widgetStyle || 'classic'; // modern (gradient) or classic (solid)
    var roundedCorners = config.roundedCorners || 'lg'; // sm, lg, xl
    var shadowIntensity = config.shadowIntensity || 'medium'; // none, light, medium, strong
    var position = config.position || 'bottom-right';
    var title = config.title || 'Homeo-X Support';
    var subtitle = config.subtitle || 'How can we help?';
    var greeting = config.greeting || 'Welcome! How can we help you today?';
    var responseTime = config.responseTime || 'A few minutes';
    var buttonText = config.messengerButtonText || 'Chat on WhatsApp';
    var searchPlaceholder = config.messengerSearchPlaceholder || 'Search FAQs';
    var showTeamAvatars = config.showTeamAvatars !== false;
    var showRecentArticles = config.showRecentArticles !== false;
    var showPoweredBy = config.showPoweredBy !== false;
    var appName = config.appName || 'Homeo-X';

    // Style values mapping
    var shadowValue = {
      none: 'none',
      light: '0 4px 12px rgba(0, 0, 0, 0.05)',
      medium: '0 8px 24px rgba(0, 0, 0, 0.1)',
      strong: '0 16px 48px rgba(0, 0, 0, 0.2)'
    }[shadowIntensity] || '0 8px 24px rgba(0, 0, 0, 0.1)';

    var borderRadiusValue = {
      sm: '8px',
      lg: '16px',
      xl: '24px'
    }[roundedCorners] || '16px';

    var fontStack = {
      system: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      inter: "'Inter', sans-serif",
      roboto: "'Roboto', sans-serif",
      poppins: "'Poppins', sans-serif"
    }[config.fontFamily] || "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

    // Setup CSS isolation wrapper
    var container = document.createElement('div');
    container.id = 'homeox-widget-root';
    container.style.position = 'fixed';
    container.style.zIndex = '2147483647';
    container.style.fontFamily = fontStack;

    // Apply Position styles
    if (position.indexOf('right') !== -1) {
      container.style.right = '24px';
    } else {
      container.style.left = '24px';
    }
    if (position.indexOf('top') !== -1) {
      container.style.top = '24px';
    } else {
      container.style.bottom = '24px';
    }

    // Embed Google Fonts if requested
    if (config.fontFamily && config.fontFamily !== 'system') {
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=' + config.fontFamily.charAt(0).toUpperCase() + config.fontFamily.slice(1) + ':wght@400;500;600;700&display=swap';
      document.head.appendChild(link);
    }

    // HTML Structure
    var headerBg = widgetStyle === 'modern'
      ? 'linear-gradient(135deg, ' + primaryColor + ', ' + accentColor + ')'
      : primaryColor;

    var avatarHtml = '';
    if (showTeamAvatars && config.teamMembers && config.teamMembers.length > 0) {
      avatarHtml = '<div style="display: flex; align-items: center; margin-right: 8px; position: relative; margin-left: 2px;">';
      config.teamMembers.slice(0, 3).forEach(function(member, idx) {
        var styleStr = 'width: 28px; height: 28px; border-radius: 50%; border: 2px solid #fff; overflow: hidden; background: #eee;';
        if (idx > 0) styleStr += ' margin-left: -8px;';
        avatarHtml += '<div style="' + styleStr + '">';
        if (member.avatar) {
          avatarHtml += '<img src="' + member.avatar + '" style="width: 100%; height: 100%; object-fit: cover;" />';
        } else {
          avatarHtml += '<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; background: ' + primaryColor + '; color: white;">' + (member.name ? member.name[0] : 'S') + '</div>';
        }
        avatarHtml += '</div>';
      });
      avatarHtml += '</div>';
    }

    var widgetHtml = `
      <div id="hx-widget-panel" style="display: none; width: 370px; height: 530px; background: #fff; border-radius: ${borderRadiusValue}; box-shadow: ${shadowValue}; border: 1px solid #f1f5f9; overflow: hidden; flex-direction: column; margin-bottom: 16px; transition: opacity 0.25s ease, transform 0.25s ease; opacity: 0; transform: translateY(20px);">
        <!-- Header -->
        <div style="background: ${headerBg}; padding: 16px; color: #fff; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.1);">
          <div style="display: flex; align-items: center; gap: 10px; overflow: hidden;">
            ${config.logoUrl ? '<img src="' + config.logoUrl + '" style="width: 32px; height: 32px; object-fit: contain; border-radius: 6px; background: white; padding: 2px;" />' : ''}
            <div style="overflow: hidden;">
              <h4 style="margin: 0; font-size: 15px; font-weight: 700; color: #fff; line-height: 1.2; text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">${title}</h4>
              <span style="font-size: 11px; opacity: 0.95; line-height: 1.2; display: block; margin-top: 2px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">${subtitle}</span>
            </div>
          </div>
          <button id="hx-close-btn" style="background: none; border: none; color: #fff; font-size: 18px; cursor: pointer; padding: 4px; display: flex; align-items: center; justify-content: center; opacity: 0.8; transition: opacity 0.2s;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
        </div>

        <!-- Body Screens Container -->
        <div id="hx-screens-container" style="flex: 1; overflow-y: auto; background: #fff; display: flex; flex-direction: column; position: relative;">
          
          <!-- Home Screen -->
          <div id="hx-screen-home" style="display: flex; flex-direction: column; padding: 16px; gap: 16px;">
            <!-- Start Chat Card -->
            <div style="background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 12px;">
              <div style="display: flex; align-items: center; gap: 10px;">
                ${avatarHtml}
                <div>
                  <p style="margin: 0; font-size: 11px; color: #64748b; font-weight: 500;">Our typical reply time</p>
                  <p style="margin: 3px 0 0; font-size: 12px; color: #334155; font-weight: 600; display: flex; align-items: center; gap: 4px;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    ${responseTime}
                  </p>
                </div>
              </div>
              <button id="hx-start-chat-btn" style="background: ${primaryColor}; color: #fff; border: none; border-radius: 10px; height: 40px; font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); transition: opacity 0.2s;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                ${buttonText}
              </button>
            </div>

            <!-- Search Field -->
            ${showRecentArticles ? `
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <h5 style="margin: 0; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Search popular topics</h5>
              <div style="position: relative;">
                <input id="hx-faq-search-input" type="text" placeholder="${searchPlaceholder}" style="width: 100%; box-sizing: border-box; height: 38px; border: 1px solid #e2e8f0; border-radius: 10px; padding: 0 12px 0 34px; font-size: 12.5px; color: #334155; outline: none; transition: border-color 0.2s;" />
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2.5" style="position: absolute; left: 12px; top: 12px;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              </div>
            </div>
            ` : ''}

            <!-- Popular FAQ Panel -->
            ${showRecentArticles ? '<div id="hx-popular-faqs-container" style="display: flex; flex-direction: column; gap: 8px;"></div>' : ''}
          </div>

          <!-- Chat Screen -->
          <div id="hx-screen-chat" style="display: none; flex-direction: column; height: 100%;">
            <div id="hx-chat-messages" style="flex: 1; padding: 16px; display: flex; flex-direction: column; gap: 12px; overflow-y: auto;"></div>
            
            <div style="padding: 12px; border-top: 1px solid #f1f5f9; background: #fff; display: flex; gap: 8px; align-items: center; box-sizing: border-box;">
              <input id="hx-chat-input" type="text" placeholder="Type a message..." style="flex: 1; height: 36px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0 12px; font-size: 12.5px; outline: none;" />
              <button id="hx-send-chat-btn" style="background: ${primaryColor}; color: white; border: none; border-radius: 8px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: opacity 0.2s;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
              </button>
            </div>
          </div>

          <!-- Search Results Screen -->
          <div id="hx-screen-search" style="display: none; flex-direction: column; padding: 16px; gap: 12px; height: 100%;">
            <div style="display: flex; align-items: center; gap: 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">
              <button id="hx-back-to-home-btn" style="background: none; border: none; color: #64748b; cursor: pointer; padding: 4px; display: flex; align-items: center;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg></button>
              <span style="font-size: 12.5px; font-weight: 600; color: #475569;">Search Results</span>
            </div>
            <div id="hx-search-results-list" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px;"></div>
          </div>

        </div>

        <!-- Footer -->
        ${showPoweredBy ? `
        <div style="padding: 8px; text-align: center; border-top: 1px solid #f1f5f9; background: #f8fafc; font-size: 10px; color: #94a3b8; font-weight: 500;">
          Powered by ${appName}
        </div>
        ` : ''}
      </div>

      <!-- Float Trigger Button -->
      <button id="hx-widget-trigger" style="background: ${primaryColor}; color: white; width: 56px; height: 56px; border-radius: 50%; border: none; box-shadow: 0 4px 16px rgba(0,0,0,0.15); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: transform 0.2s; float: right; outline: none;">
        <span id="hx-trigger-icon-chat" style="display: flex; align-items: center; justify-content: center;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
          </svg>
        </span>
        <span id="hx-trigger-icon-close" style="display: none; align-items: center; justify-content: center;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </span>
      </button>
    `;

    container.innerHTML = widgetHtml;
    document.body.appendChild(container);

    // Setup interactive events
    var trigger = document.getElementById('hx-widget-trigger');
    var panel = document.getElementById('hx-widget-panel');
    var closeBtn = document.getElementById('hx-close-btn');
    var chatIcon = document.getElementById('hx-trigger-icon-chat');
    var closeIcon = document.getElementById('hx-trigger-icon-close');

    var homeScreen = document.getElementById('hx-screen-home');
    var chatScreen = document.getElementById('hx-screen-chat');
    var searchScreen = document.getElementById('hx-screen-search');

    function togglePanel() {
      if (panel.style.display === 'none') {
        panel.style.display = 'flex';
        setTimeout(function() {
          panel.style.opacity = '1';
          panel.style.transform = 'translateY(0)';
        }, 10);
        chatIcon.style.display = 'none';
        closeIcon.style.display = 'flex';
      } else {
        panel.style.opacity = '0';
        panel.style.transform = 'translateY(20px)';
        setTimeout(function() {
          panel.style.display = 'none';
        }, 250);
        chatIcon.style.display = 'flex';
        closeIcon.style.display = 'none';
      }
    }

    trigger.addEventListener('click', togglePanel);
    closeBtn.addEventListener('click', togglePanel);

    // Dynamic screen switching
    var startChatBtn = document.getElementById('hx-start-chat-btn');
    startChatBtn.addEventListener('click', function() {
      homeScreen.style.display = 'none';
      chatScreen.style.display = 'flex';
      renderMessages();
    });

    var backToHomeBtn = document.getElementById('hx-back-to-home-btn');
    if (backToHomeBtn) {
      backToHomeBtn.addEventListener('click', function() {
        searchScreen.style.display = 'none';
        homeScreen.style.display = 'flex';
      });
    }

    // --- Popular FAQs ---
    var qaPairs = [];
    if (showRecentArticles) {
      fetch(baseUrl + '/api/widget/qa/' + widgetId)
        .then(function(r) { return r.json(); })
        .then(function(res) {
          if (res.success && Array.isArray(res.data)) {
            qaPairs = res.data.filter(function(q) { return q.isActive !== false; });
            renderPopularFaqs();
          }
        })
        .catch(function(err) {
          console.warn('Homeo-X Widget: Failed to load FAQ pairs:', err);
        });
    }

    function renderPopularFaqs() {
      var container = document.getElementById('hx-popular-faqs-container');
      if (!container) return;

      var html = '<div style="display: flex; flex-direction: column; gap: 8px;">';
      var limit = config.articlesCount || 3;
      var list = qaPairs.slice(0, limit);

      if (list.length === 0) {
        container.style.display = 'none';
        return;
      }

      list.forEach(function(qa) {
        html += `
          <div class="hx-faq-item" style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background: #fff;">
            <button class="hx-faq-toggle" data-id="${qa.id}" style="width: 100%; border: none; background: none; text-align: left; padding: 10px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; gap: 6px;">
              <span style="font-size: 12px; font-weight: 600; color: #334155; line-height: 1.3;">${qa.question}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2.5" style="transition: transform 0.2s;"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
            <div class="hx-faq-answer" id="hx-answer-${qa.id}" style="display: none; padding: 0 10px 10px 10px;">
              <div style="font-size: 11.5px; color: #475569; line-height: 1.45; background: #f8fafc; border-left: 2.5px solid ${primaryColor}; padding: 8px; border-radius: 4px;">
                ${qa.answer}
              </div>
            </div>
          </div>
        `;
      });
      html += '</div>';
      container.innerHTML = html;

      // Event handlers for accordion toggles
      var toggles = container.querySelectorAll('.hx-faq-toggle');
      toggles.forEach(function(btn) {
        btn.addEventListener('click', function() {
          var id = btn.getAttribute('data-id');
          var answer = document.getElementById('hx-answer-' + id);
          var svg = btn.querySelector('svg');
          if (answer.style.display === 'none') {
            answer.style.display = 'block';
            svg.style.transform = 'rotate(180deg)';
          } else {
            answer.style.display = 'none';
            svg.style.transform = 'rotate(0deg)';
          }
        });
      });
    }

    // --- Search Functionality ---
    var searchInput = document.getElementById('hx-faq-search-input');
    if (searchInput) {
      searchInput.addEventListener('click', function() {
        homeScreen.style.display = 'none';
        searchScreen.style.display = 'flex';
        renderSearchResults('');
      });
      searchInput.addEventListener('input', function(e) {
        var query = e.target.value.toLowerCase().trim();
        renderSearchResults(query);
      });
    }

    function renderSearchResults(query) {
      var container = document.getElementById('hx-search-results-list');
      if (!container) return;

      var filtered = query
        ? qaPairs.filter(function(qa) {
            return qa.question.toLowerCase().indexOf(query) !== -1 || qa.answer.toLowerCase().indexOf(query) !== -1;
          })
        : qaPairs;

      if (filtered.length === 0) {
        container.innerHTML = '<p style="font-size: 12px; color: #64748b; text-align: center; margin-top: 24px;">No matching answers found.</p>';
        return;
      }

      var html = '<div style="display: flex; flex-direction: column; gap: 8px;">';
      filtered.forEach(function(qa) {
        html += `
          <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background: #fff;">
            <button class="hx-search-faq-toggle" data-id="search-${qa.id}" style="width: 100%; border: none; background: none; text-align: left; padding: 10px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; gap: 6px;">
              <span style="font-size: 12px; font-weight: 600; color: #334155; line-height: 1.3;">${qa.question}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2.5" style="transition: transform 0.2s;"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
            <div id="hx-search-answer-${qa.id}" style="display: none; padding: 0 10px 10px 10px;">
              <div style="font-size: 11.5px; color: #475569; line-height: 1.45; background: #f8fafc; border-left: 2.5px solid ${primaryColor}; padding: 8px; border-radius: 4px;">
                ${qa.answer}
              </div>
            </div>
          </div>
        `;
      });
      html += '</div>';
      container.innerHTML = html;

      var toggles = container.querySelectorAll('.hx-search-faq-toggle');
      toggles.forEach(function(btn) {
        btn.addEventListener('click', function() {
          var rawId = btn.getAttribute('data-id');
          var id = rawId.replace('search-', '');
          var answer = document.getElementById('hx-search-answer-' + id);
          var svg = btn.querySelector('svg');
          if (answer.style.display === 'none') {
            answer.style.display = 'block';
            svg.style.transform = 'rotate(180deg)';
          } else {
            answer.style.display = 'none';
            svg.style.transform = 'rotate(0deg)';
          }
        });
      });
    }

    // --- Live Conversation Chat ---
    var chatInput = document.getElementById('hx-chat-input');
    var sendChatBtn = document.getElementById('hx-send-chat-btn');
    var messagesContainer = document.getElementById('hx-chat-messages');

    if (chatHistory.length === 0) {
      chatHistory.push({
        role: 'bot',
        text: greeting,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    }

    function renderMessages() {
      if (!messagesContainer) return;
      var html = '';
      chatHistory.forEach(function(msg) {
        var isUser = msg.role === 'user';
        var bubbleBg = isUser ? primaryColor : '#f1f5f9';
        var bubbleColor = isUser ? '#fff' : '#1e293b';
        var align = isUser ? 'flex-end' : 'flex-start';
        var radius = isUser ? '16px 16px 2px 16px' : '16px 16px 16px 2px';

        html += `
          <div style="display: flex; flex-direction: column; align-self: ${align}; max-width: 80%; align-items: ${align};">
            <div style="background: ${bubbleBg}; color: ${bubbleColor}; padding: 10px 12px; border-radius: ${radius}; font-size: 12.5px; line-height: 1.45; word-break: break-word;">
              ${msg.text}
            </div>
            <span style="font-size: 9px; color: #94a3b8; margin-top: 4px; padding: 0 4px;">${msg.time}</span>
          </div>
        `;
      });
      messagesContainer.innerHTML = html;
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function sendMessage() {
      var text = chatInput.value.trim();
      if (!text) return;

      var time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      chatHistory.push({ role: 'user', text: text, time: time });
      chatInput.value = '';
      renderMessages();
      saveHistory();

      // Submit message to backend
      fetch(baseUrl + '/api/widget/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: widgetId,
          message: text,
          sessionId: sessionId
        })
      })
      .then(function(r) { return r.json(); })
      .then(function(res) {
        if (res.success && res.data) {
          var botTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          chatHistory.push({ role: 'bot', text: res.data.response, time: botTime });
          renderMessages();
          saveHistory();
        }
      })
      .catch(function(err) {
        console.error('Homeo-X Widget: Failed to send chat message:', err);
      });
    }

    function saveHistory() {
      try {
        localStorage.setItem(historyKey, JSON.stringify(chatHistory));
      } catch(e) {}
    }

    sendChatBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        sendMessage();
      }
    });
  }
})();
