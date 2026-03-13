export function dashboard(authEnabled: boolean): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>PBXware Event Catcher</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace; background: #0d1117; color: #c9d1d9; }
    .header { padding: 20px 24px; border-bottom: 1px solid #21262d; display: flex; align-items: center; justify-content: space-between; }
    .header h1 { font-size: 18px; font-weight: 600; color: #f0f6fc; }
    .header-right { display: flex; align-items: center; gap: 16px; }
    .status { font-size: 13px; display: flex; align-items: center; gap: 8px; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: #3fb950; display: inline-block; }
    .dot.disconnected { background: #f85149; }
    .logout { font-size: 13px; color: #8b949e; text-decoration: none; padding: 4px 10px; border: 1px solid #30363d; border-radius: 6px; }
    .logout:hover { color: #c9d1d9; border-color: #8b949e; }
    .toolbar { padding: 12px 24px; border-bottom: 1px solid #21262d; display: flex; gap: 12px; align-items: center; }
    .toolbar button { background: #21262d; color: #c9d1d9; border: 1px solid #30363d; border-radius: 6px; padding: 6px 14px; cursor: pointer; font-size: 13px; }
    .toolbar button:hover { background: #30363d; }
    .toolbar .count { margin-left: auto; font-size: 13px; color: #8b949e; }
    .events { padding: 8px 24px; overflow-y: auto; max-height: calc(100vh - 120px); }
    .event { background: #161b22; border: 1px solid #21262d; border-radius: 8px; margin-bottom: 8px; overflow: hidden; }
    .event.new { animation: flash 0.6s ease-out; }
    @keyframes flash { from { border-color: #58a6ff; background: #1a2332; } to { border-color: #21262d; background: #161b22; } }
    .event-header { padding: 10px 14px; display: flex; align-items: center; gap: 12px; cursor: pointer; user-select: none; }
    .event-header:hover { background: #1a2032; }
    .badge { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; }
    .badge.post { background: #1f4529; color: #3fb950; }
    .badge.get { background: #0d2744; color: #58a6ff; }
    .badge.put { background: #3d2c00; color: #d29922; }
    .badge.delete { background: #3d1418; color: #f85149; }
    .badge.patch { background: #2d1a4e; color: #bc8cff; }
    .badge.other { background: #21262d; color: #8b949e; }
    .event-type { font-weight: 600; color: #f0f6fc; font-size: 14px; }
    .event-time { margin-left: auto; font-size: 12px; color: #8b949e; font-family: monospace; }
    .event-id { font-size: 11px; color: #484f58; }
    .event-body { display: none; padding: 0 14px 12px; }
    .event-body.open { display: block; }
    .event-body pre { background: #0d1117; border: 1px solid #21262d; border-radius: 6px; padding: 12px; font-size: 12px; overflow-x: auto; white-space: pre-wrap; word-break: break-all; color: #e6edf3; line-height: 1.5; }
    .event-body h4 { font-size: 12px; color: #8b949e; margin-bottom: 6px; margin-top: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
    .event-body h4:first-child { margin-top: 0; }
    .empty { text-align: center; padding: 60px 24px; color: #484f58; }
    .empty p { margin-top: 8px; font-size: 14px; }
    .empty code { background: #21262d; padding: 2px 8px; border-radius: 4px; font-size: 13px; color: #8b949e; }
  </style>
</head>
<body>
  <div class="header">
    <h1>PBXware Event Catcher</h1>
    <div class="header-right">
      <div class="status"><span class="dot" id="dot"></span><span id="connStatus">Connecting...</span></div>
      ${authEnabled ? '<a class="logout" href="/logout">Logout</a>' : ""}
    </div>
  </div>
  <div class="toolbar">
    <button id="clearBtn">Clear</button>
    <button id="scrollBtn">Auto-scroll: <span id="autoScrollLabel">ON</span></button>
    <span class="count"><span id="eventCount">0</span> events</span>
  </div>
  <div class="events" id="events">
    <div class="empty" id="emptyState">
      <p>No events yet. Configure PBXware Event Publisher to POST to:</p>
      <p style="margin-top:12px"><code id="endpointUrl"></code></p>
    </div>
  </div>
  <script>
    const eventsEl = document.getElementById('events');
    const emptyState = document.getElementById('emptyState');
    const countEl = document.getElementById('eventCount');
    const dotEl = document.getElementById('dot');
    const connEl = document.getElementById('connStatus');
    const autoScrollEl = document.getElementById('autoScrollLabel');
    let autoScroll = true;
    let eventCount = 0;

    document.getElementById('endpointUrl').textContent = location.origin + '/events';

    document.getElementById('scrollBtn').addEventListener('click', () => {
      autoScroll = !autoScroll;
      autoScrollEl.textContent = autoScroll ? 'ON' : 'OFF';
    });

    document.getElementById('clearBtn').addEventListener('click', () => {
      fetch('/events', { method: 'DELETE' }).then(() => {
        while (eventsEl.firstChild && eventsEl.firstChild !== emptyState) {
          eventsEl.removeChild(eventsEl.firstChild);
        }
        emptyState.style.display = '';
        eventCount = 0;
        countEl.textContent = '0';
      });
    });

    function el(tag, cls, text) {
      const e = document.createElement(tag);
      if (cls) e.className = cls;
      if (text !== undefined) e.textContent = text;
      return e;
    }

    function badgeClass(method) {
      const m = (method || '').toLowerCase();
      return ['post','get','put','delete','patch'].includes(m) ? m : 'other';
    }

    function formatTime(iso) {
      if (!iso) return '';
      const d = new Date(iso);
      return d.toLocaleTimeString('en-GB', { hour12: false }) + '.' + String(d.getMilliseconds()).padStart(3, '0');
    }

    function addSection(parent, title, content) {
      parent.appendChild(el('h4', null, title));
      parent.appendChild(el('pre', null, typeof content === 'string' ? content : JSON.stringify(content, null, 2)));
    }

    function addEvent(ev, animate) {
      emptyState.style.display = 'none';
      eventCount++;
      countEl.textContent = String(eventCount);

      const card = el('div', 'event' + (animate ? ' new' : ''));
      const eventType = (ev.body && ev.body.event) || (ev.query && ev.query.event) || ev.method;

      const hdr = el('div', 'event-header');
      hdr.appendChild(el('span', 'badge ' + badgeClass(ev.method), (ev.method || '?')));
      hdr.appendChild(el('span', 'event-type', eventType));
      hdr.appendChild(el('span', 'event-id', '#' + ev.id));
      hdr.appendChild(el('span', 'event-time', formatTime(ev.received_at)));

      const body = el('div', 'event-body');
      hdr.addEventListener('click', () => body.classList.toggle('open'));

      if (ev.headers && Object.keys(ev.headers).length) addSection(body, 'Headers', ev.headers);
      if (ev.query && Object.keys(ev.query).length) addSection(body, 'Query', ev.query);
      if (ev.body !== undefined && ev.body !== null) addSection(body, 'Body', ev.body);

      card.appendChild(hdr);
      card.appendChild(body);
      eventsEl.insertBefore(card, eventsEl.children[0]);
      if (autoScroll) eventsEl.scrollTop = 0;
    }

    fetch('/events').then(r => r.json()).then(data => {
      (data.events || []).forEach(ev => addEvent(ev, false));
    });

    function connectSSE() {
      const es = new EventSource('/stream');
      es.onopen = () => { dotEl.className = 'dot'; connEl.textContent = 'Live'; };
      es.onmessage = (e) => {
        try { addEvent(JSON.parse(e.data), true); } catch {}
      };
      es.onerror = () => {
        dotEl.className = 'dot disconnected';
        connEl.textContent = 'Reconnecting...';
      };
    }
    connectSSE();
  </script>
</body>
</html>`;
}
