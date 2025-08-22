// Read-only dashboard functionality
// Uses dashboard.js for all shared logic except for excluded features

// Import dashboard.js
// This will work if dashboard.js is loaded before this script, or you can use ES6 imports if supported

// Override or disable excluded features
window.openAddModal = function() {};
window.editProject = function() {};
window.deleteProject = function() {};
window.confirmDelete = function() {};
window.handleProjectSubmit = function() {};
window.closeModal = function() { document.getElementById('projectModal').style.display = 'none'; };
window.closeDeleteModal = function() { document.getElementById('deleteModal').style.display = 'none'; };
window.addCommentEventListeners = function() {};
window.handleCommentSubmit = function() {};
window.editComment = function() {};
window.deleteComment = function() {};

// Patch openCommentsModal to only show comments, no add form
window.openCommentsModal = function(projectId) {
  window.currentProjectForComments = projectId;
  const project = window.allProjects.find(p => p.id === projectId);
  if (project) {
    document.getElementById('commentsModalTitle').textContent = `PMO Comments - ${project.project_name}`;
    document.getElementById('commentsModal').style.display = 'block';
    window.loadProjectComments(projectId);
    // Hide add comment form if present
    var addForm = document.getElementById('addCommentForm');
    if (addForm) addForm.style.display = 'none';
  }
};

// Patch renderProjects to remove actions column
window.renderProjects = function(projects) {
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
        <button class="btn btn-info comment-btn" data-project-id="${project.id}" style="font-size: 11px; padding: 4px 8px;">💬 Comments</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  // Only add event listeners for comment buttons
  document.querySelectorAll('.comment-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const projectId = this.getAttribute('data-project-id');
      window.openCommentsModal(parseInt(projectId));
    });
  });
};

// Load dashboard.js for shared logic
var script = document.createElement('script');
script.src = '/js/dashboard.js';
document.head.appendChild(script);
