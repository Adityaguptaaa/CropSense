// AUTHENTICATION CHECK
const token = localStorage.getItem('token');
if (!token) {
    window.location.href = 'index.html';
}

// Automatically attach JWT Token to backend API requests
const originalFetch = window.fetch;
window.fetch = async function() {
    let [resource, config] = arguments;
    if(typeof resource === 'string' && resource.includes('/api/') && !resource.includes('open-meteo')) {
        config = config || {};
        config.headers = config.headers || {};
        config.headers['Authorization'] = `Bearer ${token}`;
    }
    return originalFetch(resource, config);
};

document.addEventListener("DOMContentLoaded", () => {
    // Inject CSS for the dropdown
    const style = document.createElement('style');
    style.innerHTML = `
        .alert-dropdown { display: none; position: absolute; top: 45px; right: 50px; width: 320px; background: white; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.15); border: 1px solid #e2e8f0; z-index: 9999; overflow: hidden; text-align: left; }
        .alert-dropdown.show { display: block; animation: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-10px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .alert-item { padding: 15px; border-bottom: 1px solid #f1f5f9; cursor: pointer; transition: 0.2s; line-height: 1.4; }
        .alert-item:hover { background: #f8fafc; padding-left: 20px; }
        .alert-title { font-weight: 700; margin-bottom: 5px; display: flex; align-items: center; gap: 6px; font-size: 0.95rem; }
        .alert-msg { font-size: 0.85rem; color: #64748b; }
        .type-Warning { color: #f59e0b; }
        .type-Danger { color: #ef4444; }
        .type-Success { color: #10b981; }
        .type-Info { color: #3b82f6; }
        .alert-badge-glow { box-shadow: 0 0 10px rgba(239, 68, 68, 0.6); animation: pulseAlert 2s infinite; }
        @keyframes pulseAlert { 0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); } 70% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); } 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } }
        
        .profile-dropdown { display: none; position: absolute; top: 50px; right: 0; width: 220px; background: white; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.15); border: 1px solid #e2e8f0; z-index: 10000; overflow: hidden; padding: 10px 0; }
        .profile-dropdown.show { display: block; animation: slideDown 0.2s ease-out; }
        .profile-info { padding: 12px 20px; border-bottom: 1px solid #f1f5f9; margin-bottom: 5px; }
        .profile-info h4 { font-size: 0.95rem; color: #1e293b; margin-bottom: 2px; }
        .profile-info p { font-size: 0.75rem; color: #64748b; }
        .logout-btn { display: flex; align-items: center; gap: 10px; width: calc(100% - 20px); margin: 0 10px; padding: 10px; border-radius: 8px; border: none; background: transparent; color: #ef4444; font-weight: 600; cursor: pointer; transition: 0.2s; text-align: left; }
        .logout-btn:hover { background: #fee2e2; }
    `;
    document.head.appendChild(style);

    // Find the right side of the navbar
    const rightSide = document.querySelector('nav > div[style*="align-items: center"]');
    if(!rightSide) return;

    // Create the interactive bell container
    const bellContainer = document.createElement('div');
    bellContainer.style.position = 'relative';
    bellContainer.innerHTML = `
        <div id="globalAlertIcon" style="width: 35px; height: 35px; border-radius: 50%; background: #e2e8f0; display: flex; justify-content: center; align-items: center; cursor: pointer; position: relative; transition: 0.3s;">
            🔔
            <span id="globalAlertBadge" class="alert-badge-glow" style="position: absolute; top: -5px; right: -5px; background: #ef4444; color: white; font-size: 0.7rem; font-weight: bold; width: 18px; height: 18px; border-radius: 50%; display: none; justify-content: center; align-items: center;">0</span>
        </div>
        <div id="globalAlertDropdown" class="alert-dropdown">
            <div style="padding: 15px; background: linear-gradient(135deg, #10b981, #059669); color: white; font-weight: bold; display: flex; justify-content: space-between; align-items: center;">
                <span style="display:flex; align-items:center; gap:8px;">🤖 AI Predictive Alerts</span>
                <span style="font-size: 0.75rem; background: rgba(255,255,255,0.25); padding: 3px 8px; border-radius: 10px; text-transform:uppercase; letter-spacing:1px;">Live</span>
            </div>
            <div id="globalAlertList" style="max-height: 350px; overflow-y: auto;">
                <div style="padding: 30px 20px; text-align: center; color: #64748b;">
                    <div style="font-size: 2rem; margin-bottom:10px;">⏳</div>
                    AI is analyzing farm data & weather...
                </div>
            </div>
        </div>
    `;

    // Remove the old static bell if it exists
    const oldBell = rightSide.querySelector('a[href="1st.html"], div#alertIcon');
    if (oldBell) oldBell.remove();
    
    // Remove old dropdown from 1st.html
    const oldDrop = document.getElementById('alertDropdown');
    if (oldDrop) oldDrop.remove();

    // Insert the new one before the profile icon
    rightSide.insertBefore(bellContainer, rightSide.firstChild);

    // Update Profile Icon with Dropdown
    const profileIcon = rightSide.querySelector('div[style*="var(--primary-gradient)"]');
    if (profileIcon) {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (user && user.name) {
                const initials = user.name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
                profileIcon.innerText = initials;
                profileIcon.style.cursor = 'pointer';
                profileIcon.style.position = 'relative';

                // Create Profile Dropdown
                const profileDrop = document.createElement('div');
                profileDrop.id = 'profileDropdown';
                profileDrop.className = 'profile-dropdown';
                profileDrop.innerHTML = `
                    <div class="profile-info">
                        <h4>${user.name}</h4>
                        <p>${user.email || 'Farmer Account'}</p>
                    </div>
                    <button class="logout-btn" id="logoutBtn">
                        🚪 Sign Out
                    </button>
                `;
                
                // We need a wrapper to hold both the icon and the dropdown
                const profileWrapper = document.createElement('div');
                profileWrapper.style.position = 'relative';
                profileIcon.parentNode.insertBefore(profileWrapper, profileIcon);
                profileWrapper.appendChild(profileIcon);
                profileWrapper.appendChild(profileDrop);

                profileIcon.onclick = (e) => {
                    e.stopPropagation();
                    profileDrop.classList.toggle('show');
                    document.getElementById('globalAlertDropdown').classList.remove('show');
                };

                document.getElementById('logoutBtn').onclick = () => {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    window.location.href = 'index.html';
                };
            }
        } catch(e) { console.error("Profile setup failed:", e); }
    }

    // Click handler for alerts
    document.getElementById('globalAlertIcon').addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('globalAlertDropdown').classList.toggle('show');
        const pDrop = document.getElementById('profileDropdown');
        if(pDrop) pDrop.classList.remove('show');
    });

    // Click outside to close everything
    document.addEventListener('click', (e) => {
        const alertDrop = document.getElementById('globalAlertDropdown');
        const profDrop = document.getElementById('profileDropdown');
        
        if(alertDrop && !alertDrop.contains(e.target) && !e.target.closest('#globalAlertIcon')) {
            alertDrop.classList.remove('show');
        }
        if(profDrop && !profDrop.contains(e.target) && !e.target.closest('div[style*="var(--primary-gradient)"]')) {
            profDrop.classList.remove('show');
        }
    });

    // Fetch alerts
    fetchAIAlerts();
});

async function fetchAIAlerts() {
    try {
        const res = await fetch('http://localhost:5000/api/ai/smart-alerts');
        const alerts = await res.json();
        
        const badge = document.getElementById('globalAlertBadge');
        const list = document.getElementById('globalAlertList');
        
        if (alerts.length > 0) {
            badge.style.display = 'flex';
            badge.innerText = alerts.length;
            
            const icons = { 'Warning': '⚠️', 'Danger': '🚨', 'Success': '✅', 'Info': 'ℹ️' };
            
            list.innerHTML = alerts.map(a => `
                <div class="alert-item">
                    <div class="alert-title type-${a.type || 'Info'}">${icons[a.type || 'Info'] || '🔹'} ${a.title}</div>
                    <div class="alert-msg">${a.message}</div>
                </div>
            `).join('');
        } else {
            list.innerHTML = `<div style="padding: 30px; text-align: center; color: #64748b;">✅ No critical issues detected. Farm is healthy.</div>`;
        }
    } catch (err) {
        console.error("AI Alerts fetch failed:", err);
    }
}
