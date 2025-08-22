// Configuration
const API_BASE_URL = '/api'
let allProjects = [];
let editingProjectId = null;
let projectToDelete = null;
let currentProjectForComments = null;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
  checkApiStatus();
  loadFilterOptions();
  loadProjects();
  
  // Add event listeners for filters
  document.getElementById('endmonthFilter').addEventListener('change', filterProjects);
  document.getElementById('status2Filter').addEventListener('change', filterProjects);
  document.getElementById('priorityFilter').addEventListener('change', filterProjects);
  document.getElementById('accountManagerFilter').addEventListener('change', filterProjects);
  document.getElementById('searchBox').addEventListener('input', filterProjects);
  
  // Form submission
  document.getElementById('projectForm').addEventListener('submit', handleProjectSubmit);
  
  // Add comment form submission
  document.getElementById('addCommentForm').addEventListener('submit', handleCommentSubmit);
  
  // Add event listeners for buttons
  document.getElementById('addProjectBtn').addEventListener('click', openAddModal);
  document.getElementById('refreshDataBtn').addEventListener('click', refreshData);
  document.getElementById('exportCsvBtn').addEventListener('click', exportToCSV);
  document.getElementById('clearFiltersBtn').addEventListener('click', clearAllFilters);
  // Fix: Add event listeners for close icons with fallback for missing elements
  // Attach close icon listeners after DOM is ready and for dynamically created modals
  document.body.addEventListener('click', function(e) {
    if (e.target && e.target.id === 'closeModalBtn') closeModal();
    if (e.target && e.target.id === 'cancelModalBtn') closeModal();
    if (e.target && e.target.id === 'cancelDeleteBtn') closeDeleteModal();
    if (e.target && e.target.id === 'confirmDeleteBtn') confirmDelete();
    if (e.target && e.target.id === 'closeCommentsModalBtn') closeCommentsModal();
  });
});

// API Status Check
async function checkApiStatus() {
  try {
    const response = await fetch(`${API_BASE_URL.replace('/api', '')}/health`);
    const data = await response.json();
    
    const statusElement = document.getElementById('apiStatus');
    if (data.status === 'OK') {
      statusElement.textContent = 'Connected';
      statusElement.style.background = '#dcfce7';
      statusElement.style.color = '#166534';
    } else {
      statusElement.textContent = 'Disconnected';
      statusElement.style.background = '#fef2f2';
      statusElement.style.color = '#dc2626';
    }
  } catch (error) {
    const statusElement = document.getElementById('apiStatus');
    statusElement.textContent = 'Error';
    statusElement.style.background = '#fef2f2';
    statusElement.style.color = '#dc2626';
  }
}

// Load filter options from admin panel
async function loadFilterOptions() {
  try {
    // First try to load from admin dropdown options
    const response = await fetch(`${API_BASE_URL}/admin/dropdown-options`);
    const data = await response.json();
    
    if (data.success && data.data.length > 0) {
      // Group options by type
      const optionsByType = {};
      data.data.forEach(option => {
        if (!optionsByType[option.type]) {
          optionsByType[option.type] = [];
        }
        if (option.is_active) {
          optionsByType[option.type].push(option.value);
        }
      });
      
      // Populate filters with dynamic options
      populateFilter('endmonthFilter', optionsByType.end_months || []);
      populateFilter('status2Filter', optionsByType.phases || []);
      populateFilter('priorityFilter', optionsByType.priorities || []);
      populateFilter('accountManagerFilter', optionsByType.account_managers || []);
      
      // Update form dropdowns as well
      updateFormDropdowns(optionsByType);
    }
  } catch (error) {
    // Continue without dropdown options, will populate from project data
  }
}

// Populate filters from project data (fallback method)
function populateFiltersFromProjects(projects) {
  if (!projects || projects.length === 0) return;
  
  // Extract unique values from projects
  const endMonths = [...new Set(projects.map(p => p.end_month).filter(Boolean))].sort();
  const status2s = [...new Set(projects.map(p => p.status2).filter(Boolean))].sort();
  const priorities = [...new Set(projects.map(p => p.priority).filter(Boolean))].sort();
  const accountManagers = [...new Set(projects.map(p => p.account_manager).filter(Boolean))].sort();
  
  // Populate filters
  populateFilter('endmonthFilter', endMonths);
  populateFilter('status2Filter', status2s);
  populateFilter('priorityFilter', priorities);
  populateFilter('accountManagerFilter', accountManagers);
  
  // Do NOT update form dropdowns from projects. Only use dropdown_options for form dropdowns.
}

// Update form dropdowns from project data
function updateFormDropdownsFromProjects(projects) {
  // This function is intentionally left blank. All form dropdowns should be populated from dropdown_options only.
}

function populateFilter(filterId, options) {
  const filter = document.getElementById(filterId);
  if (!filter) return;
  
  const currentValue = filter.value;
  
  // Get the appropriate default text based on filter type
  let defaultText = 'All';
  if (filterId === 'endmonthFilter') defaultText = 'All End Month';
  else if (filterId === 'status2Filter') defaultText = 'All Current Status';
  else if (filterId === 'priorityFilter') defaultText = 'All Priorities';
  else if (filterId === 'accountManagerFilter') defaultText = 'All Account Managers';
  
  // Clear all existing options and add default option
  filter.innerHTML = `<option value="">${defaultText}</option>`;
  
  // Add new options
  options.forEach(option => {
    const optionElement = document.createElement('option');
    optionElement.value = option;
    optionElement.textContent = option;
    filter.appendChild(optionElement);
  });
  
  // Restore previous selection if it still exists
  if (currentValue && options.includes(currentValue)) {
    filter.value = currentValue;
  }
}

// Load projects from API
async function loadProjects() {
  try {
    const response = await fetch(`${API_BASE_URL}/projects`);
    const data = await response.json();
    
    if (data.success) {
      allProjects = data.data;
      renderProjects(allProjects);
      updateKPIs(allProjects);
      populateFiltersFromProjects(allProjects); // Populate filters from loaded projects
    }
  } catch (error) {
    console.error('Error loading projects:', error);
    showNotification('Error loading projects', 'error');
  }
}

// Render projects in table
function renderProjects(projects) {
  const tbody = document.querySelector('#dataTable tbody');
  tbody.innerHTML = '';
  
  projects.forEach(project => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${project.customer_name || '-'}</td>
      <td><strong>${project.project_name}</strong></td>
      <td>${project.account_manager || '-'}</td>
      <td class="status-${project.status?.toLowerCase() || 'unknown'}">${project.status || '-'}</td>
      <td>${project.current_phase || '-'}</td>
      <td class="priority-${project.priority?.toLowerCase() || 'unknown'}">${project.priority || '-'}</td>
      <td><span class="badge">${project.end_month || '-'}</span></td>
      <td><span class="badge">${project.status2 || '-'}</span></td>
      <td>
        <button class="btn btn-info comment-btn" data-project-id="${project.id}" style="font-size: 11px; padding: 4px 8px;">
          💬 Comments
        </button>
      </td>
      <td class="action-cell">
        <button class="action-trigger" type="button" aria-label="Actions" data-project-id="${project.id}">✏️</button>
        <div class="action-menu" id="actions-menu-${project.id}">
          <button class="btn btn-primary edit-btn" data-project-id="${project.id}">Edit Project</button>
          <button class="btn btn-danger delete-btn" data-project-id="${project.id}">Delete Project</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
  
  // Add event listeners for dynamically created buttons
  addDynamicEventListeners();
}

// Add event listeners for dynamically created elements
function addDynamicEventListeners() {
  // Comment buttons
  document.querySelectorAll('.comment-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const projectId = this.getAttribute('data-project-id');
      openCommentsModal(parseInt(projectId));
    });
  });
  
  // Action menu triggers
  document.querySelectorAll('.action-trigger').forEach(btn => {
    btn.addEventListener('click', function(e) {
      const projectId = this.getAttribute('data-project-id');
      toggleActionMenu(e, parseInt(projectId));
    });
  });
  
  // Edit buttons
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const projectId = this.getAttribute('data-project-id');
      editProject(parseInt(projectId));
      hideAllActionMenus();
    });
  });
  
  // Delete buttons
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const projectId = this.getAttribute('data-project-id');
      deleteProject(parseInt(projectId));
      hideAllActionMenus();
    });
  });
}

// Update KPIs
function updateKPIs(projects) {
  document.getElementById('kpi-total').textContent = projects.length;
  document.getElementById('kpi-active').textContent = projects.filter(p => p.status === 'Active').length;
  document.getElementById('kpi-high-priority').textContent = projects.filter(p => p.priority === 'High').length;
  document.getElementById('kpi-development').textContent = projects.filter(p => p.status2 === 'In Development').length;
  
  if (projects.length > 0) {
    const lastUpdated = new Date(Math.max(...projects.map(p => new Date(p.updated_at))));
    document.getElementById('kpi-last-updated').textContent = lastUpdated.toLocaleDateString();
  }
}

// Filter projects
function filterProjects() {
  const endMonth = document.getElementById('endmonthFilter').value;
  const status2 = document.getElementById('status2Filter').value;
  const priority = document.getElementById('priorityFilter').value;
  const accountManager = document.getElementById('accountManagerFilter').value;
  const searchQuery = document.getElementById('searchBox').value.toLowerCase();
  
  let filtered = allProjects.filter(project => {
    const matchesEndMonth = !endMonth || project.end_month === endMonth;
    const matchesStatus2 = !status2 || project.status2 === status2;
    const matchesPriority = !priority || project.priority === priority;
    const matchesAccountManager = !accountManager || project.account_manager === accountManager;
    
    const searchFields = [
      project.customer_name,
      project.project_name,
      project.account_manager,
      project.current_phase,
      project.pmo_comments
    ].join(' ').toLowerCase();
    
    const matchesSearch = !searchQuery || searchFields.includes(searchQuery);
    
    return matchesEndMonth && matchesStatus2 && matchesPriority && matchesAccountManager && matchesSearch;
  });
  
  renderProjects(filtered);
  updateKPIs(filtered);
}

// Clear all filters
function clearAllFilters() {
  document.getElementById('endmonthFilter').value = '';
  document.getElementById('status2Filter').value = '';
  document.getElementById('priorityFilter').value = '';
  document.getElementById('accountManagerFilter').value = '';
  document.getElementById('searchBox').value = '';
  filterProjects(); // Re-apply filters (which will show all projects)
}

// Modal functions
function openAddModal() {
  editingProjectId = null;
  document.getElementById('modalTitle').textContent = 'Add New Project';
  document.getElementById('projectForm').reset();
  document.getElementById('projectModal').style.display = 'block';
}

function editProject(id) {
  const project = allProjects.find(p => p.id === id);
  if (project) {
    editingProjectId = id;
    document.getElementById('modalTitle').textContent = 'Edit Project';
    
    // Populate form fields
    document.getElementById('customerName').value = project.customer_name || '';
    document.getElementById('projectName').value = project.project_name || '';
    document.getElementById('accountManager').value = project.account_manager || '';
    document.getElementById('status').value = project.status || '';
    document.getElementById('currentPhase').value = project.current_phase || '';
    document.getElementById('priority').value = project.priority || '';
    document.getElementById('endMonth').value = project.end_month || '';
    document.getElementById('status2').value = project.status2 || '';
    
    document.getElementById('projectModal').style.display = 'block';
  }
}

function closeModal() {
  document.getElementById('projectModal').style.display = 'none';
  editingProjectId = null;
}

// Form submission handler
async function handleProjectSubmit(e) {
  e.preventDefault();
  
  const submitBtn = document.getElementById('submitBtn');
  const submitText = document.getElementById('submitText');
  const submitSpinner = document.getElementById('submitSpinner');
  
  // Show loading state
  submitBtn.disabled = true;
  submitText.style.display = 'none';
  submitSpinner.style.display = 'inline-block';
  
  try {
    const formData = {
      customer_name: document.getElementById('customerName').value,
      project_name: document.getElementById('projectName').value,
      account_manager: document.getElementById('accountManager').value,
      status: document.getElementById('status').value,
      current_phase: document.getElementById('currentPhase').value,
      priority: document.getElementById('priority').value,
      end_month: document.getElementById('endMonth').value,
      status2: document.getElementById('status2').value
    };
    
    const url = editingProjectId 
      ? `${API_BASE_URL}/projects/${editingProjectId}`
      : `${API_BASE_URL}/projects`;
    
    const method = editingProjectId ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });
    
    const data = await response.json();
    
    if (data.success) {
      showNotification(
        editingProjectId ? 'Project updated successfully!' : 'Project created successfully!', 
        'success'
      );
      closeModal();
      await loadProjects();
      // Filters will be automatically updated by populateFiltersFromProjects in loadProjects
    } else {
      showNotification(data.error || 'Operation failed', 'error');
    }
  } catch (error) {
    console.error('Error saving project:', error);
    showNotification('Error saving project', 'error');
  } finally {
    // Reset button state
    submitBtn.disabled = false;
    submitText.style.display = 'inline';
    submitSpinner.style.display = 'none';
  }
}

// Delete project
function deleteProject(id) {
  projectToDelete = id;
  document.getElementById('deleteModal').style.display = 'block';
}

function closeDeleteModal() {
  document.getElementById('deleteModal').style.display = 'none';
  projectToDelete = null;
}

async function confirmDelete() {
  if (!projectToDelete) return;
  
  try {
    const response = await fetch(`${API_BASE_URL}/projects/${projectToDelete}`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    
    if (data.success) {
      showNotification('Project deleted successfully!', 'success');
      closeDeleteModal();
      await loadProjects();
      // Filters will be automatically updated by populateFiltersFromProjects in loadProjects
    } else {
      showNotification(data.error || 'Delete failed', 'error');
    }
  } catch (error) {
    console.error('Error deleting project:', error);
    showNotification('Error deleting project', 'error');
  }
}

// Comment functions
function openCommentsModal(projectId) {
  currentProjectForComments = projectId;
  const project = allProjects.find(p => p.id === projectId);
  
  if (project) {
    document.getElementById('commentsModalTitle').textContent = `PMO Comments - ${project.project_name}`;
    document.getElementById('commentsModal').style.display = 'block';
    loadProjectComments(projectId);
  }
}

function closeCommentsModal() {
  document.getElementById('commentsModal').style.display = 'none';
  currentProjectForComments = null;
  document.getElementById('addCommentForm').reset();
}

async function loadProjectComments(projectId) {
  try {
    const response = await fetch(`${API_BASE_URL}/comments/project/${projectId}`);
    const data = await response.json();
    
    if (data.success) {
      renderComments(data.data);
    } else {
      renderComments([]);
    }
  } catch (error) {
    console.error('Error loading comments:', error);
    renderComments([]);
  }
}

function renderComments(comments) {
  const commentsList = document.getElementById('commentsList');
  
  if (comments.length === 0) {
    commentsList.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--muted);">No comments yet. Be the first to add one!</div>';
    return;
  }
  
  let html = '<h4 style="margin: 0 0 16px 0;">Comment History</h4>';
  
  comments.forEach(comment => {
    html += `
      <div style="border: 1px solid var(--border); border-radius: 8px; padding: 16px; margin-bottom: 12px; background: white;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <strong style="color: var(--accent);">${comment.added_by}</strong>
          <span style="color: var(--muted); font-size: 12px;">${comment.formatted_time}</span>
        </div>
        <div style="color: var(--text); line-height: 1.5;">${comment.comment_text}</div>
        <div style="margin-top: 8px; display: flex; gap: 8px;">
          <button class="btn btn-primary edit-comment-btn" data-comment-id="${comment.id}" style="font-size: 11px; padding: 4px 8px;">Edit</button>
          <button class="btn btn-danger delete-comment-btn" data-comment-id="${comment.id}" style="font-size: 11px; padding: 4px 8px;">Delete</button>
        </div>
      </div>
    `;
  });
  
  commentsList.innerHTML = html;
  
  // Add event listeners for comment action buttons
  addCommentEventListeners();
}

function addCommentEventListeners() {
  document.querySelectorAll('.edit-comment-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const commentId = this.getAttribute('data-comment-id');
      editComment(parseInt(commentId));
    });
  });
  
  document.querySelectorAll('.delete-comment-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const commentId = this.getAttribute('data-comment-id');
      deleteComment(parseInt(commentId));
    });
  });
}

// Add comment form submission handler
async function handleCommentSubmit(e) {
  e.preventDefault();
  
  if (!currentProjectForComments) return;
  
  const submitBtn = document.querySelector('#addCommentForm button');
  const submitText = document.getElementById('addCommentText');
  const submitSpinner = document.getElementById('addCommentSpinner');
  
  // Show loading state
  submitBtn.disabled = true;
  submitText.style.display = 'none';
  submitSpinner.style.display = 'inline-block';
  
  try {
    const formData = {
      comment_text: document.getElementById('commentText').value,
      added_by: document.getElementById('commentAuthor').value
    };
    
    const response = await fetch(`${API_BASE_URL}/comments/project/${currentProjectForComments}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });
    
    const data = await response.json();
    
    if (data.success) {
      showNotification('Comment added successfully!', 'success');
      document.getElementById('addCommentForm').reset();
      await loadProjectComments(currentProjectForComments);
    } else {
      showNotification(data.error || 'Failed to add comment', 'error');
    }
  } catch (error) {
    console.error('Error adding comment', error);
    showNotification('Error adding comment', 'error');
  } finally {
    // Reset button state
    submitBtn.disabled = false;
    submitText.style.display = 'inline';
    submitSpinner.style.display = 'none';
  }
}

// Edit comment function
function editComment(commentId) {
  showNotification('Edit comment functionality coming soon!', 'info');
}

// Delete comment function
async function deleteComment(commentId) {
  if (confirm('Are you sure you want to delete this comment?')) {
    try {
      const response = await fetch(`${API_BASE_URL}/comments/${commentId}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.success) {
        showNotification('Comment deleted successfully!', 'success');
        await loadProjectComments(currentProjectForComments);
      } else {
        showNotification(data.error || 'Failed to delete comment', 'error');
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      showNotification('Error deleting comment', 'error');
    }
  }
}

// Utility functions
function refreshData() {
  loadProjects();
  loadFilterOptions();
  checkApiStatus();
  // Note: loadProjects will call populateFiltersFromProjects after loading
}

async function exportToCSV() {
  try {
    // Fetch all projects
    const projectsRes = await fetch(`${API_BASE_URL}/projects`);
    const projectsData = await projectsRes.json();
    if (!projectsData.success) return;
    const projects = projectsData.data || [];

    // Fetch all comments history (for latest comment per project)
    const commentsRes = await fetch(`${API_BASE_URL}/comments/history?limit=100000&offset=0`);
    const commentsData = await commentsRes.json();
    const comments = commentsData.success ? (commentsData.data || []) : [];

    // Build lookup: project_id -> { latest_comment_text, latest_comment_time, count }
    const byProject = new Map();
    comments.forEach(c => {
      const pId = c.project_id;
      const existing = byProject.get(pId) || { count: 0, latest_comment_text: '', latest_comment_time: '' };
      existing.count += 1;
      if (!existing.latest_comment_time || new Date(c.added_at) > new Date(existing.latest_comment_time)) {
        existing.latest_comment_text = c.comment_text || '';
        existing.latest_comment_time = c.formatted_time || '';
      }
      byProject.set(pId, existing);
    });

    let csv = 'Customer Name,Project Name,Account Manager,Status,Current Phase,Priority,End Month,Current Status,PMO Comments,Latest Comment Time,Comments Count,Created,Updated\n';
    
    projects.forEach(project => {
      const agg = byProject.get(project.id) || { count: 0, latest_comment_text: project.pmo_comments || '', latest_comment_time: '', count: 0 };
      const latestComment = agg.latest_comment_text || project.pmo_comments || '';
      const latestTime = agg.latest_comment_time || '';
      const count = agg.count || 0;
      csv += `"${project.customer_name || ''}","${project.project_name || ''}","${project.account_manager || ''}","${project.status || ''}","${project.current_phase || ''}","${project.priority || ''}","${project.end_month || ''}","${project.status2 || ''}","${latestComment.replace(/"/g, '""')}","${latestTime}","${count}","${project.created_at || ''}","${project.updated_at || ''}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PMO_Projects_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    showNotification('CSV exported successfully!', 'success');
  } catch (error) {
    console.error('Error exporting CSV:', error);
    showNotification('Error exporting CSV', 'error');
  }
}

function showNotification(message, type = 'success') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => notification.classList.add('show'), 100);
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => document.body.removeChild(notification), 300);
  }, 3000);
}

// Close modals when clicking outside
window.addEventListener('click', function(event) {
  if (event.target.classList.contains('modal')) {
    event.target.style.display = 'none';
  }
});

function hideAllActionMenus() {
  document.querySelectorAll('.action-menu.show').forEach(menu => menu.classList.remove('show'));
}

function toggleActionMenu(evt, projectId) {
  if (evt && evt.stopPropagation) evt.stopPropagation();
  const menu = document.getElementById(`actions-menu-${projectId}`);
  if (!menu) return;
  const isOpen = menu.classList.contains('show');
  hideAllActionMenus();
  if (!isOpen) menu.classList.add('show');
}

document.addEventListener('click', function(e) {
  if (!e.target.closest || !e.target.closest('.action-cell')) {
    hideAllActionMenus();
  }
});

// Make functions globally available
window.openAddModal = openAddModal;
window.refreshData = refreshData;
window.exportToCSV = exportToCSV;
window.closeModal = closeModal;
window.closeDeleteModal = closeDeleteModal;
window.confirmDelete = confirmDelete;
window.closeCommentsModal = closeCommentsModal; 

// Update form dropdowns with dynamic options
function updateFormDropdowns(optionsByType) {

  // Account Managers
  const accountManagerSelect = document.getElementById('accountManager');
  if (accountManagerSelect) {
    accountManagerSelect.innerHTML = '<option value="">Select Account Manager</option>';
    (optionsByType.account_managers || []).forEach(manager => {
      const option = document.createElement('option');
      option.value = manager;
      option.textContent = manager;
      accountManagerSelect.appendChild(option);
    });
  }
  // Statuses
  const statusSelect = document.getElementById('status');
  if (statusSelect) {
    statusSelect.innerHTML = '<option value="">Select Status</option>';
    (optionsByType.statuses || []).forEach(status => {
      const option = document.createElement('option');
      option.value = status;
      option.textContent = status;
      statusSelect.appendChild(option);
    });
  }
  // Phases (Current Phase)
  const currentPhaseSelect = document.getElementById('currentPhase');
  if (currentPhaseSelect) {
    currentPhaseSelect.innerHTML = '<option value="">Select Current Phase</option>';
    (optionsByType.phases || []).forEach(phase => {
      const option = document.createElement('option');
      option.value = phase;
      option.textContent = phase;
      currentPhaseSelect.appendChild(option);
    });
  }
  // Priorities
  const prioritySelect = document.getElementById('priority');
  if (prioritySelect) {
    prioritySelect.innerHTML = '<option value="">Select Priority</option>';
    (optionsByType.priorities || []).forEach(priority => {
      const option = document.createElement('option');
      option.value = priority;
      option.textContent = priority;
      prioritySelect.appendChild(option);
    });
  }
  // End Months
  const endMonthSelect = document.getElementById('endMonth');
  if (endMonthSelect) {
    endMonthSelect.innerHTML = '<option value="">Select End Month</option>';
    (optionsByType.end_months || []).forEach(month => {
      const option = document.createElement('option');
      option.value = month;
      option.textContent = month;
      endMonthSelect.appendChild(option);
    });
  }
  // Status2 (Current Status)
  const status2Select = document.getElementById('status2');
  if (status2Select) {
    status2Select.innerHTML = '<option value="">Select Current Status</option>';
    (optionsByType.phases || []).forEach(status2 => {
      const option = document.createElement('option');
      option.value = status2;
      option.textContent = status2;
      status2Select.appendChild(option);
    });
  }
}

 