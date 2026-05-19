(function() {
  var config = window.HomeoxChatConfig || {};
  var title = config.title || 'Support';
  var greeting = config.greeting || 'Hello! How can we help?';
  var phone = config.phone || '';
  var position = config.position || 'right';
  var color = config.color || '#075e54';
  var buttonText = config.buttonText || 'Chat';

  if (!phone) {
    console.error('Homeo-X Widget: Phone number is required.');
    return;
  }

  // Remove non-numeric characters from phone for wa.me link
  var cleanPhone = phone.replace(/\D/g, '');

  var container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.bottom = '24px';
  container.style.zIndex = '999999';
  container.style.fontFamily = 'system-ui, -apple-system, sans-serif';
  if (position === 'right') {
    container.style.right = '24px';
  } else {
    container.style.left = '24px';
  }

  var widgetHtml = `
    <div id="homeox-wa-box" style="display: none; background: #fff; width: 300px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.15); border: 1px solid #e2e8f0; overflow: hidden; margin-bottom: 12px; transition: all 0.3s ease;">
      <div style="background: ${color}; padding: 16px; color: #fff; display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 24px; height: 24px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold;">W</div>
          <div>
            <div style="font-weight: bold; font-size: 14px; margin-bottom: 2px;">${title}</div>
            <div style="font-size: 10px; opacity: 0.8; text-transform: uppercase; letter-spacing: 0.5px;">Online</div>
          </div>
        </div>
        <button id="homeox-wa-close" style="background: none; border: none; color: #fff; font-size: 16px; cursor: pointer; padding: 0; opacity: 0.8;">✕</button>
      </div>
      
      <div style="background: #efeae2; padding: 16px; min-height: 100px;">
        <div style="background: #fff; padding: 12px; border-radius: 0 12px 12px 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); color: #1e293b; font-size: 13px; line-height: 1.5; max-width: 85%;">
          ${greeting}
        </div>
      </div>

      <a href="https://wa.me/${cleanPhone}" target="_blank" rel="noopener noreferrer" style="display: block; background: ${color}; color: #fff; text-align: center; padding: 12px; margin: 12px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 14px;">
        ${buttonText}
      </a>
    </div>

    <button id="homeox-wa-trigger" style="background: ${color}; color: white; width: 56px; height: 56px; border-radius: 50%; border: none; box-shadow: 0 4px 12px rgba(0,0,0,0.15); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: transform 0.2s; margin-left: auto; margin-right: ${position === 'left' ? 'auto' : '0'};">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
      </svg>
    </button>
  `;

  container.innerHTML = widgetHtml;
  document.body.appendChild(container);

  var trigger = document.getElementById('homeox-wa-trigger');
  var box = document.getElementById('homeox-wa-box');
  var closeBtn = document.getElementById('homeox-wa-close');

  trigger.addEventListener('click', function() {
    if (box.style.display === 'none') {
      box.style.display = 'block';
    } else {
      box.style.display = 'none';
    }
  });

  closeBtn.addEventListener('click', function() {
    box.style.display = 'none';
  });

})();
