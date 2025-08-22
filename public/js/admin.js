// Admin Panel JS
const API_BASE_URL = '/api';
let currentTab = 'dropdowns';

// DOM Ready
document.addEventListener('DOMContentLoaded', () => {
	attachGlobalListeners();
	checkApiStatus();
	loadStats();
	loadDropdownOptions();
	loadUsers();
	loadProjects();
	loadCommentHistory();
	loadActivityLog();
	loadSettings();
});

function attachGlobalListeners() {
	const refreshBtn = document.getElementById('refreshAllDataBtn');
	if (refreshBtn) refreshBtn.addEventListener('click', refreshAllData);

	// Tabs
	document.querySelectorAll('.nav-tab').forEach(btn => {
		btn.addEventListener('click', (e) => {
			const tabName = btn.getAttribute('data-tab');
			showTab(tabName, btn);
		});
	});

	// Settings form
	const settingsForm = document.getElementById('settingsForm');
	if (settingsForm) settingsForm.addEventListener('submit', onSaveSettings);

	// Add option form
	const addOptionForm = document.getElementById('addOptionForm');
	if (addOptionForm) addOptionForm.addEventListener('submit', onAddOption);

	// Add user form
	const addUserForm = document.getElementById('addUserForm');
	if (addUserForm) addUserForm.addEventListener('submit', onAddUser);
	
	// Add refresh buttons for individual tabs
	addTabRefreshButtons();
}

// Tabs
function showTab(tabName, clickedBtn) {
	// Hide all
	document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
	document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
	// Show
	const target = document.getElementById(tabName);
	if (target) target.classList.add('active');
	if (clickedBtn) clickedBtn.classList.add('active');
	currentTab = tabName;
}

// Add refresh buttons for individual tabs
function addTabRefreshButtons() {
	// Add refresh button to dropdown options tab
	const dropdownsTab = document.getElementById('dropdowns');
	if (dropdownsTab) {
		const refreshBtn = document.createElement('button');
		refreshBtn.className = 'btn btn-primary';
		refreshBtn.style.marginBottom = '16px';
		refreshBtn.innerHTML = '🔄 Refresh Options';
		refreshBtn.onclick = loadDropdownOptions;
		dropdownsTab.insertBefore(refreshBtn, dropdownsTab.firstChild);
	}
	
	// Add refresh button to users tab
	const usersTab = document.getElementById('users');
	if (usersTab) {
		const refreshBtn = document.createElement('button');
		refreshBtn.className = 'btn btn-primary';
		refreshBtn.style.marginBottom = '16px';
		refreshBtn.innerHTML = '🔄 Refresh Users';
		refreshBtn.onclick = loadUsers;
		usersTab.insertBefore(refreshBtn, usersTab.firstChild);
	}
}

// API Status
async function checkApiStatus() {
	try {
		const res = await fetch(`${API_BASE_URL.replace('/api', '')}/health`);
		const data = await res.json();
		const el = document.getElementById('apiStatus');
		if (!el) return;
		if (data.status === 'OK') {
			el.textContent = 'Connected';
			el.style.background = '#dcfce7';
			el.style.color = '#166534';
		} else {
			el.textContent = 'Disconnected';
			el.style.background = '#fef2f2';
			el.style.color = '#dc2626';
		}
	} catch {
		const el = document.getElementById('apiStatus');
		if (!el) return;
		el.textContent = 'Error';
		el.style.background = '#fef2f2';
		el.style.color = '#dc2626';
	}
}

// Stats
async function loadStats() {
	try {
		const [projectsRes, usersRes, optionsRes] = await Promise.all([
			fetch(`${API_BASE_URL}/projects`),
			fetch(`${API_BASE_URL}/admin/users`),
			fetch(`${API_BASE_URL}/admin/dropdown-options`)
		]);
		const projectsData = await projectsRes.json();
		const usersData = await usersRes.json();
		const optionsData = await optionsRes.json();
		document.getElementById('totalProjects').textContent = projectsData.success ? projectsData.data.length : 0;
		document.getElementById('totalUsers').textContent = usersData.success ? usersData.data.length : 0;
		document.getElementById('totalOptions').textContent = optionsData.success ? optionsData.data.length : 0;
		document.getElementById('recentChanges').textContent = '0';
	} catch (e) {
		console.error('Error loading stats', e);
	}
}

// Dropdown options
async function loadDropdownOptions() {
	try {
		console.log('Loading dropdown options...');
		const res = await fetch(`${API_BASE_URL}/admin/dropdown-options`);
		const data = await res.json();
		console.log('Dropdown options response:', data);
		if (data.success) {
			console.log('Rendering dropdown options:', data.data);
			renderDropdownOptions(data.data);
		} else {
			console.error('Failed to load dropdown options:', data.error);
			renderDropdownOptions([]);
		}
	} catch (e) {
		console.error('Error loading dropdown options', e);
		renderDropdownOptions([]);
	}
}

function renderDropdownOptions(options) {
	console.log('Rendering dropdown options, count:', options?.length || 0);
	const tbody = document.querySelector('#optionsTable tbody');
	if (!tbody) {
		console.error('Options table tbody not found!');
		return;
	}
	console.log('Found options table tbody, clearing and populating...');
	tbody.innerHTML = '';
	
	if (!options || options.length === 0) {
		const tr = document.createElement('tr');
		tr.innerHTML = '<td colspan="5" style="text-align: center; color: var(--muted); padding: 40px;">No dropdown options found. Add some options using the form above.</td>';
		tbody.appendChild(tr);
		return;
	}
	
	options.forEach(option => {
		console.log('Rendering option:', option);
		const tr = document.createElement('tr');
		tr.innerHTML = `
			<td>${formatOptionType(option.type)}</td>
			<td><strong>${option.value}</strong></td>
			<td>${option.description || '-'}</td>
			<td>${new Date(option.created_at).toLocaleDateString()}</td>
			<td>
				<button class="action-btn edit" data-action="edit" data-id="${option.id}">Edit</button>
				<button class="action-btn delete" data-action="delete" data-id="${option.id}">Delete</button>
			</td>`;
		tbody.appendChild(tr);
	});
	
	// attach event listeners
	tbody.querySelectorAll('button[data-action="delete"]').forEach(btn => btn.addEventListener('click', async () => {
		const id = btn.getAttribute('data-id');
		if (!confirm('Are you sure you want to delete this option?')) return;
		try {
			const res = await fetch(`${API_BASE_URL}/admin/dropdown-options/${id}`, { method: 'DELETE' });
			const data = await res.json();
			if (data.success) {
				showNotification('Option deleted successfully!', 'success');
				await loadDropdownOptions();
				await loadStats();
			} else {
				showNotification(data.error || 'Failed to delete option', 'error');
			}
		} catch (e) {
			console.error('Error deleting option', e);
			showNotification('Error deleting option', 'error');
		}
	}));
	
	tbody.querySelectorAll('button[data-action="edit"]').forEach(btn => btn.addEventListener('click', () => {
		showNotification('Edit option functionality coming soon!', 'info');
	}));
}

function formatOptionType(type) {
	return String(type || '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

async function onAddOption(e) {
	e.preventDefault();
	const submitBtn = e.target.querySelector('button[type="submit"]');
	const submitText = document.getElementById('addOptionText');
	const submitSpinner = document.getElementById('addOptionSpinner');
	if (submitBtn && submitText && submitSpinner) {
		submitBtn.disabled = true; submitText.style.display = 'none'; submitSpinner.style.display = 'inline-block';
	}
	try {
		const body = {
			type: document.getElementById('optionType').value,
			value: document.getElementById('optionValue').value,
			description: document.getElementById('optionDescription').value
		};
		const res = await fetch(`${API_BASE_URL}/admin/dropdown-options`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
		const data = await res.json();
		if (data.success) {
			showNotification('Option added successfully!', 'success');
			e.target.reset();
			await loadDropdownOptions();
			await loadStats();
		} else {
			showNotification(data.error || 'Failed to add option', 'error');
		}
	} catch (err) {
		console.error('Error adding option', err);
		showNotification('Error adding option', 'error');
	} finally {
		if (submitBtn && submitText && submitSpinner) {
			submitBtn.disabled = false; submitText.style.display = 'inline'; submitSpinner.style.display = 'none';
		}
	}
}

// Users
async function loadUsers() {
	try {
		console.log('Loading users...');
		const res = await fetch(`${API_BASE_URL}/admin/users`);
		const data = await res.json();
		console.log('Users response:', data);
		if (data.success) {
			console.log('Rendering users:', data.data);
			renderUsers(data.data);
		} else {
			console.error('Failed to load users:', data.error);
			renderUsers([]);
		}
	} catch (e) {
		console.error('Error loading users', e);
		renderUsers([]);
	}
}

function renderUsers(users) {
	console.log('Rendering users, count:', users?.length || 0);
	const tbody = document.querySelector('#usersTable tbody');
	if (!tbody) {
		console.error('Users table tbody not found!');
		return;
	}
	console.log('Found users table tbody, clearing and populating...');
	tbody.innerHTML = '';
	
	if (!users || users.length === 0) {
		const tr = document.createElement('tr');
		tr.innerHTML = '<td colspan="6" style="text-align: center; color: var(--muted); padding: 40px;">No users found. Add some users using the form above.</td>';
		tbody.appendChild(tr);
		return;
	}
	
	users.forEach(user => {
		console.log('Rendering user:', user);
		const tr = document.createElement('tr');
		tr.innerHTML = `
			<td><strong>${user.username}</strong></td>
			<td>${user.email}</td>
			<td><span class="status-badge status-role">${user.role}</span></td>
			<td><span class="status-badge status-${user.is_active ? 'active' : 'inactive'}">${user.is_active ? 'Active' : 'Inactive'}</span></td>
			<td>${new Date(user.created_at).toLocaleDateString()}</td>
			<td>
				<button class="action-btn edit" data-action="edit" data-id="${user.id}">Edit</button>
				<button class="action-btn ${user.is_active ? 'delete' : 'edit'}" data-action="toggle" data-id="${user.id}">${user.is_active ? 'Deactivate' : 'Activate'}</button>
			</td>`;
		tbody.appendChild(tr);
	});
	// attach
	tbody.querySelectorAll('button[data-action="edit"]').forEach(btn => btn.addEventListener('click', () => showNotification('Edit user functionality coming soon!', 'info')));
	tbody.querySelectorAll('button[data-action="toggle"]').forEach(btn => btn.addEventListener('click', async () => {
		const id = btn.getAttribute('data-id');
		try {
			const res = await fetch(`${API_BASE_URL}/admin/users/${id}/toggle-status`, { method: 'PUT' });
			const data = await res.json();
			if (data.success) {
				showNotification(data.message || 'User status updated', 'success');
				await loadUsers();
			} else {
				showNotification(data.error || 'Failed to update user status', 'error');
			}
		} catch (e) {
			console.error('Error toggling user', e);
			showNotification('Error toggling user status', 'error');
		}
	}));
}

async function onAddUser(e) {
	e.preventDefault();
	try {
		const body = {
			username: document.getElementById('username').value,
			email: document.getElementById('email').value,
			password: document.getElementById('password').value,
			role: document.getElementById('role').value
		};
		const res = await fetch(`${API_BASE_URL}/admin/users`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
		const data = await res.json();
		if (data.success) {
			showNotification('User added successfully!', 'success');
			e.target.reset();
			await loadUsers();
			await loadStats();
		} else {
			showNotification(data.error || 'Failed to add user', 'error');
		}
	} catch (err) {
		console.error('Error adding user', err);
		showNotification('Error adding user', 'error');
	}
}

// Projects overview
async function loadProjects() {
	try {
		const res = await fetch(`${API_BASE_URL}/projects`);
		const data = await res.json();
		if (data.success) renderProjects(data.data);
	} catch (e) {
		console.error('Error loading projects', e);
	}
}

function renderProjects(projects) {
	const tbody = document.querySelector('#projectsTable tbody');
	if (!tbody) return;
	tbody.innerHTML = '';
	(projects || []).slice(0, 20).forEach(project => {
		const tr = document.createElement('tr');
		tr.innerHTML = `
			<td><strong>${project.project_name}</strong></td>
			<td>${project.customer_name || '-'}</td>
			<td>${project.account_manager || '-'}</td>
			<td><span class="status-badge status-${(project.status || 'unknown').toLowerCase()}">${project.status || '-'}</span></td>
			<td><span class="status-badge status-${(project.priority || 'unknown').toLowerCase()}">${project.priority || '-'}</span></td>
			<td>${new Date(project.updated_at).toLocaleDateString()}</td>`;
		tbody.appendChild(tr);
	});
}

// Comments
async function loadCommentHistory() {
	try {
		const res = await fetch(`${API_BASE_URL}/comments/history`);
		const data = await res.json();
		if (data.success) renderComments(data.data);
	} catch (e) {
		console.error('Error loading comment history', e);
	}
}

function renderComments(comments) {
	const tbody = document.querySelector('#commentsTable tbody');
	if (!tbody) return;
	tbody.innerHTML = '';
	(comments || []).forEach(comment => {
		const tr = document.createElement('tr');
		tr.innerHTML = `
			<td><strong>${comment.project_name}</strong></td>
			<td>${comment.customer_name || '-'}</td>
			<td>${comment.comment_text.length > 100 ? comment.comment_text.substring(0, 100) + '...' : comment.comment_text}</td>
			<td><span class="status-badge status-active">${comment.added_by}</span></td>
			<td>${comment.formatted_time}</td>
			<td>
				<button class="action-btn edit" data-action="edit" data-id="${comment.id}">Edit</button>
				<button class="action-btn delete" data-action="delete" data-id="${comment.id}">Delete</button>
			</td>`;
		tbody.appendChild(tr);
	});
	// attach
	tbody.querySelectorAll('button[data-action="edit"]').forEach(btn => btn.addEventListener('click', () => showNotification('Edit comment functionality coming soon!', 'info')));
	tbody.querySelectorAll('button[data-action="delete"]').forEach(btn => btn.addEventListener('click', async () => {
		const id = btn.getAttribute('data-id');
		if (!confirm('Are you sure you want to delete this comment?')) return;
		try {
			const res = await fetch(`${API_BASE_URL}/comments/${id}`, { method: 'DELETE' });
			const data = await res.json();
			if (data.success) {
				showNotification('Comment deleted successfully!', 'success');
				await loadCommentHistory();
			} else {
				showNotification(data.error || 'Failed to delete comment', 'error');
			}
		} catch (e) {
			console.error('Error deleting comment', e);
			showNotification('Error deleting comment', 'error');
		}
	}));
}

async function exportCommentsCSV() {
	try {
		const res = await fetch(`${API_BASE_URL}/comments/history?limit=1000`);
		const data = await res.json();
		if (!data.success) return;
		const comments = data.data || [];
		let csv = 'Project,Customer,Comment,Added By,Timestamp\n';
		comments.forEach(c => {
			csv += `"${c.project_name || ''}","${c.customer_name || ''}","${c.comment_text || ''}","${c.added_by || ''}","${c.formatted_time || ''}"\n`;
		});
		const blob = new Blob([csv], { type: 'text/csv' });
		const url = window.URL.createObjectURL(blob);
		const a = document.createElement('a'); a.href = url; a.download = `PMO_Comments_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
		window.URL.revokeObjectURL(url);
		showNotification('Comments exported successfully!', 'success');
	} catch (e) {
		console.error('Error exporting comments', e);
		showNotification('Error exporting comments', 'error');
	}
}

// Activity log
async function loadActivityLog() {
	try {
		const res = await fetch(`${API_BASE_URL}/admin/activity-log`);
		const data = await res.json();
		if (data.success) renderActivityLog(data.data);
	} catch (e) {
		console.error('Error loading activity log', e);
		renderActivityLog([]);
	}
}

function renderActivityLog(activities) {
	const tbody = document.querySelector('#activityTable tbody');
	if (!tbody) return;
	tbody.innerHTML = '';
	(activities || []).slice(0, 50).forEach(a => {
		const tr = document.createElement('tr');
		tr.innerHTML = `
			<td>${new Date(a.timestamp).toLocaleString()}</td>
			<td><strong>${a.action}</strong></td>
			<td>${a.user_id || 'System'}</td>
			<td>${a.details || ''}</td>
			<td>${a.ip_address || '-'}</td>`;
		tbody.appendChild(tr);
	});
}

// Settings
async function loadSettings() {
	try {
		const res = await fetch(`${API_BASE_URL}/admin/settings`);
		const data = await res.json();
		if (!data.success) return;
		const s = data.data || {};
		const setIf = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined) el.value = val; };
		setIf('maxProjectsPerPage', s.max_projects_per_page);
		setIf('autoRefreshInterval', s.auto_refresh_interval);
		setIf('enableNotifications', s.enable_notifications);
		setIf('logRetentionDays', s.log_retention_days);
	} catch (e) {
		console.error('Error fetching system settings', e);
	}
}

async function onSaveSettings(e) {
	e.preventDefault();
	try {
		const body = {
			max_projects_per_page: document.getElementById('maxProjectsPerPage').value,
			auto_refresh_interval: document.getElementById('autoRefreshInterval').value,
			enable_notifications: document.getElementById('enableNotifications').value,
			log_retention_days: document.getElementById('logRetentionDays').value
		};
		const res = await fetch(`${API_BASE_URL}/admin/settings`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
		const data = await res.json();
		if (data.success) {
			showNotification('Settings saved successfully!', 'success');
		} else {
			showNotification(data.error || 'Failed to save settings', 'error');
		}
	} catch (e) {
		console.error('Error saving settings', e);
		showNotification('Error saving settings', 'error');
	}
}

function refreshAllData() {
	loadStats();
	loadDropdownOptions();
	loadUsers();
	loadProjects();
	loadCommentHistory();
	loadActivityLog();
	loadSettings();
	checkApiStatus();
}

function showNotification(message, type = 'success') {
	const notification = document.createElement('div');
	notification.className = `notification ${type}`;
	notification.textContent = message;
	document.body.appendChild(notification);
	setTimeout(() => notification.classList.add('show'), 100);
	setTimeout(() => { notification.classList.remove('show'); setTimeout(() => document.body.removeChild(notification), 300); }, 3000);
} 