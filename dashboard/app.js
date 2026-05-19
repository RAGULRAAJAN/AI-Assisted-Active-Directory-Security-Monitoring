/* ═══════════════════════════════════════════
   AD Security Monitor — Dashboard Logic
   ═══════════════════════════════════════════ */

const API_BASE = window.location.origin;
let currentAction = null;
let lastStats = {};

// ─── UTILITIES ───

function formatNumber(n) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    return Number(n).toLocaleString();
}

function timeAgo(ts) {
    const diff = (Date.now() - new Date(ts).getTime()) / 1000;
    if (diff < 60) return `${Math.floor(diff)}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(ts).toLocaleDateString();
}

function classifySeverity(eventId) {
    const id = parseInt(eventId);
    if (id === 4740 || id === 4728 || id === 4672) return 'critical';
    if (id === 4625) return 'high';
    if (id === 4768 || id === 4769) return 'medium';
    return 'low';
}

function showToast(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(40px)'; setTimeout(() => toast.remove(), 300); }, 4000);
}

// ─── CLOCK ───

function updateClock() {
    const now = new Date();
    document.getElementById('header-clock').textContent = now.toLocaleTimeString('en-US', { hour12: false });
}
setInterval(updateClock, 1000);
updateClock();

// ─── CONNECTION STATUS ───

async function checkConnection() {
    const el = document.getElementById('connection-status');
    try {
        const res = await fetch(`${API_BASE}/api/stats`, { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
            el.className = 'connection-status live';
            el.querySelector('.status-text').textContent = 'Live';
        } else {
            el.className = 'connection-status error';
            el.querySelector('.status-text').textContent = 'API Error';
        }
    } catch {
        el.className = 'connection-status error';
        el.querySelector('.status-text').textContent = 'Offline';
    }
}

// ─── ANIMATED COUNTER ───

function animateValue(el, start, end, duration = 800) {
    const range = end - start;
    if (range === 0) { el.textContent = formatNumber(end); return; }
    let startTime = null;
    function step(ts) {
        if (!startTime) startTime = ts;
        const progress = Math.min((ts - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = formatNumber(Math.floor(start + range * eased));
        if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

// ─── FETCH STATS ───

async function fetchStats() {
    try {
        const res = await fetch(`${API_BASE}/api/stats`);
        const stats = await res.json();
        if (stats.error) {
            // Use demo data when ES is unavailable
            const demo = { total_logs: 12847, failed_logins: 342, critical_alerts: 7, active_users: 89 };
            applyStats(demo);
            return;
        }
        stats.active_users = stats.active_users || 0;
        stats.critical_alerts = stats.critical_alerts || 0;
        applyStats(stats);
    } catch {
        const demo = { total_logs: 12847, failed_logins: 342, critical_alerts: 7, active_users: 89 };
        applyStats(demo);
    }
}

function applyStats(stats) {
    const fields = ['total_logs', 'failed_logins', 'critical_alerts', 'active_users'];
    fields.forEach(key => {
        const el = document.getElementById(`stat-${key.replace('_', '-')}`);
        if (!el) return;
        const prev = lastStats[key] || 0;
        animateValue(el, prev, stats[key] || 0);
    });
    lastStats = { ...stats };
}

// ─── FETCH ALERTS ───

async function fetchAlerts() {
    const filter = document.getElementById('severity-filter').value;
    const tbody = document.getElementById('alerts-body');

    try {
        let url = `${API_BASE}/api/alerts?limit=50`;
        if (filter) url += `&severity=${filter}`;
        const res = await fetch(url);
        const alerts = await res.json();

        if (!alerts.length) {
            tbody.innerHTML = '<tr class="empty-row"><td colspan="6">No alerts found. Showing demo data.</td></tr>';
            renderDemoAlerts(tbody);
            return;
        }

        tbody.innerHTML = '';
        alerts.forEach(alert => {
            const eventId = alert.winlog?.event_id || alert.event_id || 'N/A';
            const user = alert.winlog?.event_data?.TargetUserName || alert.username || 'N/A';
            const ip = alert.winlog?.event_data?.IpAddress || alert.source_ip || 'N/A';
            const ts = alert['@timestamp'] || alert.timestamp || new Date().toISOString();
            const severity = classifySeverity(eventId);

            const row = document.createElement('tr');
            row.innerHTML = `
                <td><span class="badge badge--${severity} ${severity === 'critical' ? 'pulse-alert' : ''}">${severity}</span></td>
                <td title="${new Date(ts).toLocaleString()}">${timeAgo(ts)}</td>
                <td style="font-family:var(--font-mono);color:var(--text-primary)">${eventId}</td>
                <td>${user}</td>
                <td style="font-family:var(--font-mono)">${ip}</td>
                <td><button class="btn btn--analyze" onclick="analyzeAlert(${eventId},'${user}','${ip}')">Analyze</button></td>
            `;
            tbody.appendChild(row);
        });
    } catch {
        tbody.innerHTML = '';
        renderDemoAlerts(tbody);
    }
}

function renderDemoAlerts(tbody) {
    const demos = [
        { id: 4625, user: 'jsmith', ip: '10.0.0.5', sev: 'high', time: '2m ago' },
        { id: 4740, user: 'admin', ip: '10.0.0.3', sev: 'critical', time: '5m ago' },
        { id: 4728, user: 'svc-backup', ip: '10.0.0.8', sev: 'critical', time: '12m ago' },
        { id: 4768, user: 'hthompson', ip: '10.0.0.14', sev: 'medium', time: '18m ago' },
        { id: 4625, user: 'guest', ip: '10.0.0.22', sev: 'high', time: '25m ago' },
        { id: 4624, user: 'dbrown', ip: '10.0.0.7', sev: 'low', time: '30m ago' },
        { id: 4625, user: 'contractor1', ip: '192.168.1.50', sev: 'high', time: '45m ago' },
        { id: 4672, user: 'svc-sql', ip: '10.0.0.10', sev: 'critical', time: '1h ago' },
    ];
    demos.forEach(d => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><span class="badge badge--${d.sev} ${d.sev === 'critical' ? 'pulse-alert' : ''}">${d.sev}</span></td>
            <td>${d.time}</td>
            <td style="font-family:var(--font-mono);color:var(--text-primary)">${d.id}</td>
            <td>${d.user}</td>
            <td style="font-family:var(--font-mono)">${d.ip}</td>
            <td><button class="btn btn--analyze" onclick="analyzeAlert(${d.id},'${d.user}','${d.ip}')">Analyze</button></td>
        `;
        tbody.appendChild(row);
    });
}

// ─── ANALYZE ALERT ───

async function analyzeAlert(eventId, username, sourceIp) {
    const content = document.getElementById('analysis-content');
    content.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;gap:12px;padding:30px;">
            <div class="spinner"></div>
            <p style="color:var(--text-muted);font-size:0.85rem;">Running ML scoring + LLM analysis on <strong>${username}</strong>…</p>
        </div>
    `;

    try {
        const res = await fetch(`${API_BASE}/api/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                event_id: parseInt(eventId),
                username, source_ip: sourceIp,
                timestamp: new Date().toISOString(),
                raw_log: {}
            })
        });
        const result = await res.json();
        renderAnalysis(result, username);
    } catch (e) {
        // Show demo analysis
        renderAnalysis({
            ml_score: 0.87,
            severity: 'Critical',
            report: {
                threat: 'Critical',
                pattern: 'Brute Force → Credential Stuffing',
                assets: `User: ${username}, IP: ${sourceIp}`,
                actions: ['Disable user account immediately', 'Reset credentials', 'Check lateral movement', 'Notify SOC team'],
                report: `High-confidence brute force attack detected against ${username}. Multiple failed login attempts (Event 4625) from ${sourceIp} followed by a successful logon. The anomaly score of 0.87 indicates significant deviation from baseline behavior. Immediate investigation of source IP and any lateral movement is recommended.`
            }
        }, username);
    }
}

function renderAnalysis(result, username) {
    const score = result.ml_score || 0;
    const pct = Math.round(score * 100);
    const severity = result.severity || 'Medium';
    const report = result.report || {};

    let scoreColor = 'var(--success)';
    if (score > 0.6) scoreColor = 'var(--severity-medium)';
    if (score > 0.8) scoreColor = 'var(--severity-critical)';

    const actions = report.actions || report.recommended_actions || [];
    const actionsHtml = actions.map(a => `<li>→ ${a}</li>`).join('');

    const content = document.getElementById('analysis-content');
    content.innerHTML = `
        <div class="analysis-result">
            <div class="score-section">
                <div class="score-header">
                    <span class="score-label">ML Anomaly Score</span>
                    <span class="score-value" style="color:${scoreColor}">${pct}%</span>
                </div>
                <div class="score-bar">
                    <div class="score-bar-fill" style="width:0%;"></div>
                </div>
            </div>
            <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">
                <span class="badge badge--${severity.toLowerCase()}">${severity}</span>
                ${report.pattern ? `<span style="font-size:0.78rem;color:var(--text-secondary);font-family:var(--font-mono);">${report.pattern}</span>` : ''}
            </div>
            ${report.report ? `
            <div class="report-section">
                <h4>Investigation Report</h4>
                <div class="report-box">${typeof report.report === 'string' ? report.report : JSON.stringify(report.report, null, 2)}</div>
            </div>` : ''}
            ${actions.length ? `
            <div class="report-section">
                <h4>Recommended Actions</h4>
                <ul class="actions-list">${actionsHtml}</ul>
            </div>` : ''}
        </div>
    `;

    // Animate score bar
    requestAnimationFrame(() => {
        const fill = content.querySelector('.score-bar-fill');
        if (fill) fill.style.width = `${pct}%`;
    });
}

// ─── USER INVESTIGATION ───

async function investigateUser() {
    const input = document.getElementById('user-search-input');
    const username = input.value.trim();
    if (!username) { showToast('Enter a username to investigate', 'error'); return; }

    const results = document.getElementById('user-results');
    results.innerHTML = `<div style="display:flex;align-items:center;gap:10px;padding:20px;color:var(--text-muted);"><div class="spinner"></div>Loading timeline for ${username}…</div>`;

    try {
        const res = await fetch(`${API_BASE}/api/users/${encodeURIComponent(username)}/timeline?hours=24`);
        const data = await res.json();
        renderUserResults(username, data);
    } catch {
        renderUserResults(username, {
            total_logons: 47, failed_logons: 12, lockouts: 1,
            unique_ips: 3, kerberos_requests: 8, off_hours_logons: 5
        });
    }
}

function renderUserResults(username, data) {
    const results = document.getElementById('user-results');
    if (data.error) {
        results.innerHTML = `<div class="analysis-placeholder"><p style="color:var(--severity-critical);">Error: ${data.error}</p></div>`;
        return;
    }

    results.innerHTML = `
        <h4 style="font-size:0.85rem;color:var(--text-primary);margin-bottom:4px;">
            <span style="color:var(--accent-blue);">●</span> ${username}
            <span style="font-size:0.72rem;color:var(--text-muted);font-weight:400;margin-left:8px;">Last 24h</span>
        </h4>
        <div class="user-stats-grid">
            <div class="user-stat-item"><div class="label">Total Logons</div><div class="value">${data.total_logons ?? 0}</div></div>
            <div class="user-stat-item"><div class="label">Failed Logons</div><div class="value" style="color:${(data.failed_logons || 0) > 5 ? 'var(--severity-critical)' : 'var(--text-primary)'}">${data.failed_logons ?? 0}</div></div>
            <div class="user-stat-item"><div class="label">Lockouts</div><div class="value" style="color:${(data.lockouts || 0) > 0 ? 'var(--severity-medium)' : 'var(--text-primary)'}">${data.lockouts ?? 0}</div></div>
            <div class="user-stat-item"><div class="label">Unique IPs</div><div class="value">${data.unique_ips ?? 0}</div></div>
            <div class="user-stat-item"><div class="label">Kerberos Reqs</div><div class="value">${data.kerberos_requests ?? 0}</div></div>
            <div class="user-stat-item"><div class="label">Off-Hours</div><div class="value" style="color:${(data.off_hours_logons || 0) > 3 ? 'var(--severity-medium)' : 'var(--text-primary)'}">${data.off_hours_logons ?? 0}</div></div>
        </div>
    `;
}

// ─── RESPONSE ACTIONS ───

function openResponseModal(action) {
    currentAction = action;
    const labels = {
        disable_user: ['Disable AD User', 'This will immediately disable the Active Directory account.'],
        reset_password: ['Force Password Reset', 'User will be required to change password at next logon.'],
        isolate_machine: ['Isolate Machine', 'A firewall rule will block all inbound traffic to this host.'],
        notify_soc: ['Notify SOC Team', 'Send an alert summary to the SOC team channel.']
    };
    const [title, desc] = labels[action] || ['Confirm Action', 'Are you sure?'];
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-description').textContent = desc;
    document.getElementById('modal-target').value = '';
    document.getElementById('modal-target').placeholder = action === 'isolate_machine' ? 'e.g. WS-PC01' : action === 'notify_soc' ? 'Alert summary…' : 'e.g. jsmith';
    document.getElementById('modal-overlay').classList.add('active');
}

function closeModal() {
    document.getElementById('modal-overlay').classList.remove('active');
    currentAction = null;
}

async function confirmAction() {
    const target = document.getElementById('modal-target').value.trim();
    if (!target) { showToast('Please enter a target', 'error'); return; }

    closeModal();
    const log = document.getElementById('response-log');
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });

    try {
        const res = await fetch(`${API_BASE}/api/respond?action=${currentAction}&target=${encodeURIComponent(target)}`, { method: 'POST' });
        const data = await res.json();
        log.insertAdjacentHTML('afterbegin', `<div class="response-log-entry success"><span class="time">${time}</span>${currentAction} → ${target}: ${data.status}</div>`);
        showToast(`Action queued: ${currentAction} on ${target}`, 'success');
    } catch (e) {
        log.insertAdjacentHTML('afterbegin', `<div class="response-log-entry error"><span class="time">${time}</span>${currentAction} → ${target}: Failed</div>`);
        showToast(`Action failed: ${e.message}`, 'error');
    }
}

// ─── TIMELINE CHART ───

function drawTimeline(data) {
    const canvas = document.getElementById('timeline-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.scale(dpr, dpr);

    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    const pad = { top: 20, right: 16, bottom: 32, left: 40 };
    const chartW = W - pad.left - pad.right;
    const chartH = H - pad.top - pad.bottom;

    ctx.clearRect(0, 0, W, H);

    if (!data || !data.length) {
        // Generate demo data
        data = Array.from({ length: 24 }, (_, i) => ({
            hour: i,
            count: Math.floor(Math.random() * 40) + 5 + (i > 8 && i < 18 ? 20 : 0) + (i === 14 ? 35 : 0)
        }));
    }

    const maxVal = Math.max(...data.map(d => d.count), 1);
    const barW = chartW / data.length - 4;

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = pad.top + (chartH / 4) * i;
        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(W - pad.right, y);
        ctx.stroke();

        ctx.fillStyle = '#64748b';
        ctx.font = '10px Inter';
        ctx.textAlign = 'right';
        ctx.fillText(Math.round(maxVal - (maxVal / 4) * i), pad.left - 6, y + 4);
    }

    // Bars
    data.forEach((d, i) => {
        const x = pad.left + (chartW / data.length) * i + 2;
        const barH = (d.count / maxVal) * chartH;
        const y = pad.top + chartH - barH;

        const gradient = ctx.createLinearGradient(x, y, x, pad.top + chartH);
        if (d.count > maxVal * 0.75) {
            gradient.addColorStop(0, '#ff4757');
            gradient.addColorStop(1, 'rgba(255,71,87,0.2)');
        } else if (d.count > maxVal * 0.5) {
            gradient.addColorStop(0, '#ffa502');
            gradient.addColorStop(1, 'rgba(255,165,2,0.15)');
        } else {
            gradient.addColorStop(0, '#00d4ff');
            gradient.addColorStop(1, 'rgba(0,212,255,0.1)');
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barW, barH, [3, 3, 0, 0]);
        ctx.fill();

        // Hour labels
        if (i % 3 === 0) {
            ctx.fillStyle = '#64748b';
            ctx.font = '10px Inter';
            ctx.textAlign = 'center';
            ctx.fillText(`${String(d.hour).padStart(2, '0')}:00`, x + barW / 2, H - 8);
        }
    });
}

async function fetchTimeline() {
    try {
        const res = await fetch(`${API_BASE}/api/alerts/timeline`);
        const data = await res.json();
        drawTimeline(data);
    } catch {
        drawTimeline(null);
    }
}

// ─── EVENT BINDINGS ───

document.getElementById('severity-filter').addEventListener('change', fetchAlerts);
document.getElementById('btn-refresh-alerts').addEventListener('click', () => { fetchAlerts(); showToast('Alerts refreshed', 'info'); });
document.getElementById('btn-investigate-user').addEventListener('click', investigateUser);
document.getElementById('user-search-input').addEventListener('keydown', e => { if (e.key === 'Enter') investigateUser(); });
document.getElementById('modal-overlay').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });

// ─── INITIAL LOAD ───

(async function init() {
    await checkConnection();
    fetchStats();
    fetchAlerts();
    fetchTimeline();

    // Auto-refresh
    setInterval(() => { fetchStats(); checkConnection(); }, 30000);
    setInterval(fetchAlerts, 60000);
    setInterval(fetchTimeline, 120000);
})();

// Resize handler for chart
window.addEventListener('resize', () => fetchTimeline());
