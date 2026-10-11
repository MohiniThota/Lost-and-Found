// FindIt — Lost and Found Application Logic
document.addEventListener('DOMContentLoaded', () => {
  // State
  let currentFilters = {
    type: 'all',
    category: 'all',
    status: 'all',
    search: ''
  };
  let currentDetailItem = null;
  let currentManagedItemId = null;
  let currentManagedPin = null;

  // DOM Elements
  const itemsGrid = document.getElementById('itemsGrid');
  const emptyState = document.getElementById('emptyState');
  const itemsCountTitle = document.getElementById('itemsCountTitle');
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const categoryFilter = document.getElementById('categoryFilter');
  const statusFilter = document.getElementById('statusFilter');
  const typeChips = document.querySelectorAll('.type-chip');
  const refreshBtn = document.getElementById('refreshBtn');

  // Stats Elements
  const statTotal = document.getElementById('statTotal');
  const statFound = document.getElementById('statFound');
  const statLost = document.getElementById('statLost');
  const statResolved = document.getElementById('statResolved');

  // Modals
  const reportModal = document.getElementById('reportModal');
  const openReportModalBtn = document.getElementById('openReportModalBtn');
  const closeReportModal = document.getElementById('closeReportModal');
  const cancelReportBtn = document.getElementById('cancelReportBtn');
  const reportForm = document.getElementById('reportForm');
  const reportDateInput = document.getElementById('reportDate');

  // Image Upload elements
  const imageInput = document.getElementById('imageInput');
  const dropzonePrompt = document.getElementById('dropzonePrompt');
  const imagePreviewContainer = document.getElementById('imagePreviewContainer');
  const imagePreview = document.getElementById('imagePreview');
  const removeImageBtn = document.getElementById('removeImageBtn');

  // Details Modal
  const detailsModal = document.getElementById('detailsModal');
  const closeDetailsModal = document.getElementById('closeDetailsModal');

  // Manage Modal
  const manageModal = document.getElementById('manageModal');
  const closeManageModal = document.getElementById('closeManageModal');
  const pinGateView = document.getElementById('pinGateView');
  const manageDashboardView = document.getElementById('manageDashboardView');
  const pinVerifyForm = document.getElementById('pinVerifyForm');
  const inputManagePin = document.getElementById('inputManagePin');
  const manageItemTitle = document.getElementById('manageItemTitle');
  const manageItemStatusText = document.getElementById('manageItemStatusText');
  const quickStatusSelect = document.getElementById('quickStatusSelect');
  const deleteItemBtn = document.getElementById('deleteItemBtn');
  const claimsList = document.getElementById('claimsList');
  const claimsCount = document.getElementById('claimsCount');

  // Check Claim Modal
  const checkClaimModal = document.getElementById('checkClaimModal');
  const checkClaimGlobalBtn = document.getElementById('checkClaimGlobalBtn');
  const closeCheckClaimModal = document.getElementById('closeCheckClaimModal');
  const trackClaimForm = document.getElementById('trackClaimForm');
  const trackResultBox = document.getElementById('trackResultBox');

  // Set today's date on report modal by default
  const today = new Date().toISOString().split('T')[0];
  if (reportDateInput) reportDateInput.value = today;

  // Initialize
  fetchStats();
  fetchItems();

  // ================= Event Listeners =================

  // Search input debounced
  let searchTimeout;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const val = e.target.value.trim();
    clearSearchBtn.style.display = val ? 'block' : 'none';
    searchTimeout = setTimeout(() => {
      currentFilters.search = val;
      fetchItems();
    }, 300);
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';
    currentFilters.search = '';
    fetchItems();
  });

  // Type filter buttons
  typeChips.forEach(chip => {
    chip.addEventListener('click', () => {
      typeChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentFilters.type = chip.getAttribute('data-type');
      fetchItems();
    });
  });

  // Dropdown filters
  categoryFilter.addEventListener('change', (e) => {
    currentFilters.category = e.target.value;
    fetchItems();
  });

  statusFilter.addEventListener('change', (e) => {
    currentFilters.status = e.target.value;
    fetchItems();
  });

  refreshBtn.addEventListener('click', () => {
    fetchStats();
    fetchItems();
    showToast('Items list refreshed');
  });

  // Modal Open / Close
  openReportModalBtn.addEventListener('click', () => openModal(reportModal));
  closeReportModal.addEventListener('click', () => closeModal(reportModal));
  cancelReportBtn.addEventListener('click', () => closeModal(reportModal));

  closeDetailsModal.addEventListener('click', () => closeModal(detailsModal));
  closeManageModal.addEventListener('click', () => closeModal(manageModal));

  checkClaimGlobalBtn.addEventListener('click', () => {
    trackClaimForm.reset();
    trackResultBox.style.display = 'none';
    openModal(checkClaimModal);
  });
  closeCheckClaimModal.addEventListener('click', () => closeModal(checkClaimModal));

  // Close modals on backdrop click or ESC key
  window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
      closeModal(e.target);
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.active').forEach(m => closeModal(m));
    }
  });

  // Image Upload Preview
  imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 16 * 1024 * 1024) {
        showToast('Image size exceeds 16MB limit', 'error');
        imageInput.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        imagePreview.src = event.target.result;
        dropzonePrompt.style.display = 'none';
        imagePreviewContainer.style.display = 'inline-block';
      };
      reader.readAsDataURL(file);
    }
  });

  removeImageBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    imageInput.value = '';
    imagePreview.src = '';
    imagePreviewContainer.style.display = 'none';
    dropzonePrompt.style.display = 'block';
  });

  // Report Form Submit
  reportForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('submitReportBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Publishing...';

    const formData = new FormData(reportForm);

    try {
      const response = await fetch('/api/items', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();

      if (response.ok) {
        showToast('Item posted successfully!');
        reportForm.reset();
        removeImageBtn.click();
        reportDateInput.value = today;
        closeModal(reportModal);
        fetchStats();
        fetchItems();
      } else {
        showToast(data.error || 'Failed to submit report', 'error');
      }
    } catch (err) {
      showToast('Network error while publishing item', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Publish Post';
    }
  });

  // Poster Manage PIN Verification Form
  pinVerifyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pin = inputManagePin.value.trim();
    if (!pin) return;

    try {
      const res = await fetch(`/api/items/${currentManagedItemId}/verify-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });
      const data = await res.json();

      if (res.ok && data.valid) {
        currentManagedPin = pin;
        pinGateView.style.display = 'none';
        manageDashboardView.style.display = 'block';
        manageItemTitle.textContent = data.item.title;
        manageItemStatusText.textContent = `Current Status: ${capitalize(data.item.status)}`;
        quickStatusSelect.value = data.item.status;
        renderManageClaims(data.claims);
      } else {
        showToast(data.error || 'Invalid PIN', 'error');
      }
    } catch (err) {
      showToast('Error validating PIN', 'error');
    }
  });

  // Quick Status Change by Finder
  quickStatusSelect.addEventListener('change', async (e) => {
    const newStatus = e.target.value;
    try {
      const res = await fetch(`/api/items/${currentManagedItemId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: currentManagedPin, status: newStatus })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Item status updated to ${newStatus}`);
        manageItemStatusText.textContent = `Current Status: ${capitalize(newStatus)}`;
        fetchStats();
        fetchItems();
      } else {
        showToast(data.error || 'Failed to update status', 'error');
      }
    } catch (err) {
      showToast('Error updating status', 'error');
    }
  });

  // Delete Item by Finder
  deleteItemBtn.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to permanently delete this listing?')) return;

    try {
      const res = await fetch(`/api/items/${currentManagedItemId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: currentManagedPin })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Item deleted successfully');
        closeModal(manageModal);
        fetchStats();
        fetchItems();
      } else {
        showToast(data.error || 'Failed to delete item', 'error');
      }
    } catch (err) {
      showToast('Error deleting item', 'error');
    }
  });

  // Track Claim Form Submit
  trackClaimForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const itemId = document.getElementById('trackItemId').value.trim();
    const claimId = document.getElementById('trackClaimId').value.trim();
    const email = document.getElementById('trackEmail').value.trim();

    try {
      const res = await fetch(`/api/items/${itemId}/check-claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claim_id: claimId, claimant_email: email })
      });
      const data = await res.json();

      if (res.ok && data.claim) {
        renderTrackResult(data.claim);
      } else {
        trackResultBox.style.display = 'block';
        trackResultBox.innerHTML = `
          <div style="color: var(--danger); font-weight: 600;">
            ⚠️ ${data.error || 'Claim not found or email does not match.'}
          </div>
        `;
      }
    } catch (err) {
      showToast('Error checking claim status', 'error');
    }
  });

  // ================= Data Fetching & Rendering =================

  async function fetchStats() {
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const stats = await res.json();
        statTotal.textContent = stats.total;
        statFound.textContent = stats.found;
        statLost.textContent = stats.lost;
        statResolved.textContent = stats.resolved;
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }

  async function fetchItems() {
    const params = new URLSearchParams();
    if (currentFilters.type) params.append('type', currentFilters.type);
    if (currentFilters.category) params.append('category', currentFilters.category);
    if (currentFilters.status) params.append('status', currentFilters.status);
    if (currentFilters.search) params.append('search', currentFilters.search);

    try {
      const res = await fetch(`/api/items?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        renderItemsGrid(data.items);
      }
    } catch (err) {
      console.error('Failed to fetch items:', err);
      showToast('Failed to load items', 'error');
    }
  }

  function renderItemsGrid(items) {
    itemsGrid.innerHTML = '';

    if (!items || items.length === 0) {
      emptyState.style.display = 'block';
      itemsCountTitle.textContent = '0 Items Found';
      return;
    }

    emptyState.style.display = 'none';
    const typeLabel = currentFilters.type === 'found' ? 'Found Items' : (currentFilters.type === 'lost' ? 'Lost Items' : 'All Items');
    itemsCountTitle.textContent = `${items.length} ${typeLabel}`;

    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'item-card';

      const typeBadgeClass = item.type === 'found' ? 'badge-found' : 'badge-lost';
      const typeText = item.type === 'found' ? 'Found' : 'Lost';

      let statusBadgeHtml = '';
      if (item.status === 'claimed') {
        statusBadgeHtml = `<span class="badge badge-status badge-claimed">Claimed</span>`;
      } else if (item.status === 'returned') {
        statusBadgeHtml = `<span class="badge badge-status badge-returned">Returned</span>`;
      } else {
        statusBadgeHtml = `<span class="badge badge-status">Active</span>`;
      }

      const mediaHtml = item.image_filename 
        ? `<img src="/uploads/${escapeHtml(item.image_filename)}" alt="${escapeHtml(item.title)}" loading="lazy">`
        : getCategoryPlaceholderSvg(item.category);

      const claimCountBadge = item.claim_count > 0 
        ? `<div class="card-meta-item" style="color: var(--primary); font-weight: 600;">
             <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7.5" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
             ${item.claim_count} Claim Request${item.claim_count > 1 ? 's' : ''}
           </div>`
        : '';

      card.innerHTML = `
        <div class="item-card-media">
          ${mediaHtml}
          <div class="card-badges">
            <span class="badge ${typeBadgeClass}">${typeText}</span>
            ${statusBadgeHtml}
          </div>
        </div>
        <div class="item-card-body">
          <div class="card-category">${escapeHtml(item.category)}</div>
          <h3 class="card-title">${escapeHtml(item.title)}</h3>
          
          <div class="card-meta-list">
            <div class="card-meta-item" title="Location">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              <span>${escapeHtml(item.location)}</span>
            </div>
            <div class="card-meta-item" title="Date">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <span>${escapeHtml(item.item_date)}</span>
            </div>
            ${claimCountBadge}
          </div>

          <p class="card-desc-snippet">${escapeHtml(item.description || 'No additional description provided.')}</p>

          <div class="item-card-footer">
            <button class="btn btn-primary btn-sm btn-view" data-id="${item.id}">
              ${item.type === 'found' ? 'View & Claim' : 'View Details'}
            </button>
            <button class="btn btn-outline btn-sm btn-manage" data-id="${item.id}" title="Manage (Poster Only)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              Manage
            </button>
          </div>
        </div>
      `;

      // Attach Card Actions
      card.querySelector('.btn-view').addEventListener('click', () => openItemDetails(item.id));
      card.querySelector('.btn-manage').addEventListener('click', () => openItemManage(item.id));

      itemsGrid.appendChild(card);
    });
  }

  // ================= Item Details & Claim Modal Logic =================

  async function openItemDetails(itemId) {
    try {
      const res = await fetch(`/api/items/${itemId}`);
      if (!res.ok) {
        showToast('Could not load item details', 'error');
        return;
      }
      const data = await res.json();
      currentDetailItem = data.item;

      // Populate details modal
      document.getElementById('detailTitle').textContent = currentDetailItem.title;
      document.getElementById('detailLocation').textContent = currentDetailItem.location;
      document.getElementById('detailDate').textContent = currentDetailItem.item_date;
      document.getElementById('detailCategory').textContent = currentDetailItem.category;
      document.getElementById('detailDescription').textContent = currentDetailItem.description || 'No extra description provided.';
      document.getElementById('detailPoster').textContent = currentDetailItem.poster_name;

      // Badges
      const metaTags = document.getElementById('detailMetaTags');
      const typeClass = currentDetailItem.type === 'found' ? 'badge-found' : 'badge-lost';
      metaTags.innerHTML = `
        <span class="badge ${typeClass}">${capitalize(currentDetailItem.type)}</span>
        <span class="badge badge-status">${capitalize(currentDetailItem.status)}</span>
        <span class="badge" style="background:#e2e8f0; color:#475569;">ID #${currentDetailItem.id}</span>
      `;

      // Image Frame
      const imgFrame = document.getElementById('detailImageFrame');
      if (currentDetailItem.image_filename) {
        imgFrame.innerHTML = `<img src="/uploads/${escapeHtml(currentDetailItem.image_filename)}" alt="${escapeHtml(currentDetailItem.title)}">`;
      } else {
        imgFrame.innerHTML = getCategoryPlaceholderSvg(currentDetailItem.category, true);
      }

      // Claim Action Panel
      renderClaimActionPanel(currentDetailItem);

      openModal(detailsModal);
    } catch (err) {
      showToast('Error opening item details', 'error');
    }
  }

  function renderClaimActionPanel(item) {
    const panel = document.getElementById('claimActionPanel');

    if (item.status === 'returned') {
      panel.innerHTML = `
        <div class="claim-box-card" style="background: var(--success-light); border-color: #a7f3d0;">
          <h4 style="color: #065f46;">✅ This Item Has Been Returned</h4>
          <p style="color: #047857; margin-bottom: 0;">This listing has been resolved and handed back to its owner.</p>
        </div>
      `;
      return;
    }

    if (item.type === 'found') {
      panel.innerHTML = `
        <div class="claim-box-card">
          <h4>Is this yours? Submit an Ownership Claim</h4>
          <p>Describe unique details or contents only the true owner would know. The finder will review your claim before revealing contact info.</p>
          
          <form id="claimSubmitForm">
            <div class="form-group" style="margin-bottom: 0.6rem;">
              <label class="form-label">Your Full Name *</label>
              <input type="text" id="claimantName" required placeholder="e.g. Michael Scott">
            </div>
            <div class="form-grid" style="margin-bottom: 0.6rem;">
              <div class="form-group">
                <label class="form-label">Your Email *</label>
                <input type="email" id="claimantEmail" required placeholder="michael@example.com">
              </div>
              <div class="form-group">
                <label class="form-label">Phone / WhatsApp</label>
                <input type="text" id="claimantPhone" placeholder="+1 (555) 000-0000">
              </div>
            </div>
            <div class="form-group" style="margin-bottom: 0.85rem;">
              <label class="form-label">Proof of Ownership / Verification Details *</label>
              <textarea id="claimProof" rows="3" required placeholder="Describe distinguishing marks, serial #, contents, lock screen photo, or brand details to prove ownership."></textarea>
            </div>
            <button type="submit" class="btn btn-primary full-width" id="btnSubmitClaim">
              Submit Ownership Claim
            </button>
          </form>
        </div>
      `;

      const claimForm = document.getElementById('claimSubmitForm');
      claimForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('btnSubmitClaim');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting Claim...';

        const payload = {
          claimant_name: document.getElementById('claimantName').value.trim(),
          claimant_email: document.getElementById('claimantEmail').value.trim(),
          claimant_phone: document.getElementById('claimantPhone').value.trim(),
          proof_details: document.getElementById('claimProof').value.trim()
        };

        try {
          const res = await fetch(`/api/items/${item.id}/claims`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const data = await res.json();

          if (res.ok) {
            panel.innerHTML = `
              <div class="claim-box-card" style="background: var(--success-light); border-color: #6ee7b7;">
                <h4 style="color: #065f46;">🎉 Claim Submitted Successfully!</h4>
                <p style="color: #065f46;">
                  Your Claim ID is: <strong style="font-size: 1.15rem; background: #fff; padding: 0.2rem 0.6rem; border-radius: 4px; border: 1px solid #6ee7b7;">#${data.claim_id}</strong>
                </p>
                <p style="color: #047857; font-size: 0.85rem; margin-bottom: 0;">
                  Save this Claim ID (along with your email: <strong>${escapeHtml(payload.claimant_email)}</strong>). 
                  Once the finder reviews and approves your proof, you can use the "Check My Claim" button above to view their direct contact information!
                </p>
              </div>
            `;
            showToast('Claim submitted! Keep your Claim ID.');
            fetchItems();
          } else {
            showToast(data.error || 'Failed to submit claim', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Ownership Claim';
          }
        } catch (err) {
          showToast('Error submitting claim', 'error');
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit Ownership Claim';
        }
      });

    } else {
      // Lost Item: Someone else can submit a contact note saying "I found this!"
      panel.innerHTML = `
        <div class="claim-box-card">
          <h4>Did you find this item?</h4>
          <p>Submit a report to let the owner know you found their belonging.</p>
          <form id="foundNotifyForm">
            <div class="form-group" style="margin-bottom: 0.6rem;">
              <label class="form-label">Your Name *</label>
              <input type="text" id="finderName" required placeholder="e.g. Jane Doe">
            </div>
            <div class="form-grid" style="margin-bottom: 0.6rem;">
              <div class="form-group">
                <label class="form-label">Your Email *</label>
                <input type="email" id="finderEmail" required placeholder="jane@example.com">
              </div>
              <div class="form-group">
                <label class="form-label">Your Phone</label>
                <input type="text" id="finderPhone" placeholder="+1 (555) 111-2222">
              </div>
            </div>
            <div class="form-group" style="margin-bottom: 0.85rem;">
              <label class="form-label">Where did you find it & how can they collect it? *</label>
              <textarea id="foundNote" rows="2" required placeholder="e.g. I picked it up near the stairs and handed it to reception / left it with security."></textarea>
            </div>
            <button type="submit" class="btn btn-success full-width" id="btnNotifyOwner">
              Notify Owner
            </button>
          </form>
        </div>
      `;

      const foundForm = document.getElementById('foundNotifyForm');
      foundForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('btnNotifyOwner');
        submitBtn.disabled = true;

        const payload = {
          claimant_name: document.getElementById('finderName').value.trim(),
          claimant_email: document.getElementById('finderEmail').value.trim(),
          claimant_phone: document.getElementById('finderPhone').value.trim(),
          proof_details: document.getElementById('foundNote').value.trim()
        };

        try {
          const res = await fetch(`/api/items/${item.id}/claims`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const data = await res.json();
          if (res.ok) {
            panel.innerHTML = `
              <div class="claim-box-card" style="background: var(--success-light); border-color: #6ee7b7;">
                <h4 style="color: #065f46;">🙏 Thank you for reporting!</h4>
                <p style="color: #047857;">The owner will see your report when reviewing this item with their PIN.</p>
              </div>
            `;
            showToast('Report sent to owner!');
            fetchItems();
          } else {
            showToast(data.error || 'Failed to submit report', 'error');
            submitBtn.disabled = false;
          }
        } catch (err) {
          showToast('Error sending message', 'error');
          submitBtn.disabled = false;
        }
      });
    }
  }

  // ================= Poster Management Modal Logic =================

  function openItemManage(itemId) {
    currentManagedItemId = itemId;
    currentManagedPin = null;

    // Reset view
    pinGateView.style.display = 'block';
    manageDashboardView.style.display = 'none';
    inputManagePin.value = '';

    openModal(manageModal);
    setTimeout(() => inputManagePin.focus(), 100);
  }

  function renderManageClaims(claims) {
    claimsCount.textContent = claims ? claims.length : 0;
    claimsList.innerHTML = '';

    if (!claims || claims.length === 0) {
      claimsList.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--text-muted); background: #f8fafc; border-radius: var(--radius-md);">
          No claims or reports submitted for this item yet.
        </div>
      `;
      return;
    }

    claims.forEach(claim => {
      const card = document.createElement('div');
      let statusClass = '';
      if (claim.status === 'approved') statusClass = 'approved-card';
      if (claim.status === 'rejected') statusClass = 'rejected-card';

      card.className = `claim-item-card ${statusClass}`;

      let actionButtons = '';
      if (claim.status === 'pending') {
        actionButtons = `
          <div class="claim-card-actions">
            <button class="btn btn-outline btn-sm btn-reject" data-claim-id="${claim.id}">Reject</button>
            <button class="btn btn-success btn-sm btn-approve" data-claim-id="${claim.id}">Approve Ownership</button>
          </div>
        `;
      } else {
        const badgeColor = claim.status === 'approved' ? 'badge-found' : 'badge-lost';
        actionButtons = `
          <div style="font-size: 0.82rem; font-weight: 700;">
            <span class="badge ${badgeColor}">${capitalize(claim.status)}</span>
          </div>
        `;
      }

      card.innerHTML = `
        <div class="claim-header-row">
          <div class="claimant-info">
            <strong>${escapeHtml(claim.claimant_name)}</strong>
            <div class="claimant-contacts">
              <span>📧 <a href="mailto:${escapeHtml(claim.claimant_email)}">${escapeHtml(claim.claimant_email)}</a></span>
              ${claim.claimant_phone ? `<span>📞 <a href="tel:${escapeHtml(claim.claimant_phone)}">${escapeHtml(claim.claimant_phone)}</a></span>` : ''}
              <span>Claim ID: #${claim.id}</span>
            </div>
          </div>
          ${actionButtons}
        </div>

        <div class="proof-box">
          <strong>Proof of Ownership Details:</strong>
          ${escapeHtml(claim.proof_details)}
        </div>
      `;

      // Event handlers for approve / reject
      const approveBtn = card.querySelector('.btn-approve');
      const rejectBtn = card.querySelector('.btn-reject');

      if (approveBtn) {
        approveBtn.addEventListener('click', () => handleClaimAction(claim.id, 'approved'));
      }
      if (rejectBtn) {
        rejectBtn.addEventListener('click', () => handleClaimAction(claim.id, 'rejected'));
      }

      claimsList.appendChild(card);
    });
  }

  async function handleClaimAction(claimId, action) {
    const confirmMsg = action === 'approved' 
      ? 'Approve this claim? This will mark the item as Claimed and share your contact info with the claimant.'
      : 'Reject this claim?';

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/items/${currentManagedItemId}/claims/${claimId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: currentManagedPin, action: action })
      });
      const data = await res.json();

      if (res.ok) {
        showToast(data.message || `Claim ${action}!`);
        // Refresh claims list
        const claimsRes = await fetch(`/api/items/${currentManagedItemId}/claims-list`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: currentManagedPin })
        });
        const claimsData = await claimsRes.json();
        renderManageClaims(claimsData.claims);
        fetchStats();
        fetchItems();
      } else {
        showToast(data.error || 'Failed to update claim', 'error');
      }
    } catch (err) {
      showToast('Error updating claim', 'error');
    }
  }

  // ================= Track Claim Result =================

  function renderTrackResult(claim) {
    trackResultBox.style.display = 'block';

    if (claim.status === 'approved') {
      const finder = claim.finder_contact || {};
      trackResultBox.innerHTML = `
        <div style="background: var(--success-light); border: 1px solid #6ee7b7; padding: 1.25rem; border-radius: var(--radius-md);">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
            <span style="font-size: 1.5rem;">🎉</span>
            <h4 style="color: #065f46; margin: 0;">Claim Approved!</h4>
          </div>
          <p style="color: #047857; font-size: 0.9rem; margin-bottom: 1rem;">
            The finder reviewed your proof and confirmed your ownership! Here are their contact details to arrange return:
          </p>
          <div style="background: #ffffff; padding: 1rem; border-radius: var(--radius-sm); border: 1px solid #a7f3d0;">
            <div style="font-size: 0.95rem; font-weight: 700; color: #0f172a; margin-bottom: 0.35rem;">
              Finder: ${escapeHtml(finder.poster_name || 'Listing Owner')}
            </div>
            <div style="font-size: 0.9rem; color: #334155; margin-bottom: 0.25rem;">
              📧 Email: <a href="mailto:${escapeHtml(finder.poster_email)}"><strong>${escapeHtml(finder.poster_email)}</strong></a>
            </div>
            ${finder.poster_phone ? `
              <div style="font-size: 0.9rem; color: #334155;">
                📞 Phone / WhatsApp: <a href="tel:${escapeHtml(finder.poster_phone)}"><strong>${escapeHtml(finder.poster_phone)}</strong></a>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    } else if (claim.status === 'pending') {
      trackResultBox.innerHTML = `
        <div style="background: var(--warning-light); border: 1px solid #fde68a; padding: 1.25rem; border-radius: var(--radius-md);">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
            <span style="font-size: 1.5rem;">⏳</span>
            <h4 style="color: #92400e; margin: 0;">Claim Under Review</h4>
          </div>
          <p style="color: #b45309; font-size: 0.9rem; margin-bottom: 0;">
            Your claim (ID #${claim.id}) is pending review by the finder. Check back soon! Once approved, their direct phone and email will appear here.
          </p>
        </div>
      `;
    } else {
      trackResultBox.innerHTML = `
        <div style="background: var(--danger-light); border: 1px solid #fca5a5; padding: 1.25rem; border-radius: var(--radius-md);">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
            <span style="font-size: 1.5rem;">❌</span>
            <h4 style="color: #991b1b; margin: 0;">Claim Not Approved</h4>
          </div>
          <p style="color: #b91c1c; font-size: 0.9rem; margin-bottom: 0;">
            The finder reviewed this claim and was unable to verify ownership based on the details provided.
          </p>
        </div>
      `;
    }
  }

  // ================= Helper Utilities =================

  function openModal(modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' ? '✓' : '⚠️';
    toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function getCategoryPlaceholderSvg(category, large = false) {
    const size = large ? 72 : 44;
    return `
      <div class="item-placeholder-media">
        <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          <path d="M11 8v6"></path>
          <path d="M8 11h6"></path>
        </svg>
        <span>${escapeHtml(category || 'Item')}</span>
      </div>
    `;
  }
});
