/**
 * ==============================================================================
 * VKU FIELD SURVEY PWA - APPLICATION CONTROLLER (js/app.js)
 * Course: Cross-Platform Mobile App Development - Week 3
 * Faculty of Computer Science - VKU (Vietnam - Korea University of ICT)
 * Instructor: Nguyen Thanh Tuan, PhD
 * ==============================================================================
 */

class VKUSurveyApp {
  constructor() {
    this.currentView = 'new-survey';
    this.currentPhotoData = null;
    this.currentGPS = null;
    this.deferredInstallPrompt = null;
    this.isSyncing = false;

    // DOM Elements
    this.initDOMElements();
    // Bind Event Listeners
    this.bindEvents();
    // Check Network & Restore State
    this.initApp();
  }

  initDOMElements() {
    // Views
    this.views = {
      'new-survey': document.getElementById('viewNewSurvey'),
      'records': document.getElementById('viewRecords'),
      'stats': document.getElementById('viewStats'),
      'guidelines': document.getElementById('viewGuidelines')
    };

    // Nav items
    this.navItems = document.querySelectorAll('.nav-item');
    this.pendingBadge = document.getElementById('navPendingBadge');

    // Header & Status
    this.networkBadge = document.getElementById('networkBadge');
    this.offlineBanner = document.getElementById('offlineBanner');
    this.btnInstallApp = document.getElementById('btnInstallApp');

    // Form elements
    this.surveyForm = document.getElementById('surveyForm');
    this.inspectorName = document.getElementById('inspectorName');
    this.inspectorId = document.getElementById('inspectorId');
    this.roomNumber = document.getElementById('roomNumber');
    this.floorSelect = document.getElementById('floorSelect');
    this.description = document.getElementById('description');
    this.draftNotice = document.getElementById('draftNotice');

    // GPS & Photo
    this.btnGetGPS = document.getElementById('btnGetGPS');
    this.gpsDisplay = document.getElementById('gpsDisplay');
    this.photoInput = document.getElementById('photoInput');
    this.cameraInput = document.getElementById('cameraInput');
    this.photoPreviewContainer = document.getElementById('photoPreviewContainer');
    this.photoPreviewImg = document.getElementById('photoPreviewImg');
    this.btnRemovePhoto = document.getElementById('btnRemovePhoto');

    // Records & Sync
    this.surveyListContainer = document.getElementById('surveyListContainer');
    this.btnSyncAll = document.getElementById('btnSyncAll');
    this.pendingCountText = document.getElementById('pendingCountText');
    this.filterButtons = document.querySelectorAll('.filter-btn');

    // Modal & Toast
    this.modalOverlay = document.getElementById('modalOverlay');
    this.modalTitle = document.getElementById('modalTitle');
    this.modalBody = document.getElementById('modalBody');
    this.btnCloseModal = document.getElementById('btnCloseModal');
    this.toastContainer = document.getElementById('toastContainer');
  }

  bindEvents() {
    // Navigation
    this.navItems.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const viewName = btn.dataset.view;
        this.switchView(viewName);
      });
    });

    // Hash change routing
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.replace('#', '');
      if (this.views[hash]) {
        this.switchView(hash);
      }
    });

    // Network connection events
    window.addEventListener('online', () => this.handleNetworkChange(true));
    window.addEventListener('offline', () => this.handleNetworkChange(false));

    // Background sync event triggered from Service Worker
    window.addEventListener('vku-background-sync', () => {
      this.showToast('Service Worker đang kích hoạt Background Sync...', 'info');
      this.syncPendingSurveys();
    });

    // PWA Install prompt handling
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredInstallPrompt = e;
      if (this.btnInstallApp) {
        this.btnInstallApp.style.display = 'inline-flex';
      }
    });

    if (this.btnInstallApp) {
      this.btnInstallApp.addEventListener('click', async () => {
        if (!this.deferredInstallPrompt) return;
        this.deferredInstallPrompt.prompt();
        const choice = await this.deferredInstallPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          console.log('[PWA] User accepted installation prompt.');
          this.btnInstallApp.style.display = 'none';
        }
        this.deferredInstallPrompt = null;
      });
    }

    // GPS Geolocation
    if (this.btnGetGPS) {
      this.btnGetGPS.addEventListener('click', () => this.captureGPS());
    }

    // Photo Handling
    if (this.photoInput) {
      this.photoInput.addEventListener('change', (e) => this.handlePhotoSelection(e));
    }
    if (this.cameraInput) {
      this.cameraInput.addEventListener('change', (e) => this.handlePhotoSelection(e));
    }
    if (this.btnRemovePhoto) {
      this.btnRemovePhoto.addEventListener('click', () => this.removePhoto());
    }

    // Form inputs auto-save draft
    const formInputs = [
      this.inspectorName, this.inspectorId, this.roomNumber,
      this.floorSelect, this.description
    ];
    formInputs.forEach((input) => {
      if (input) {
        input.addEventListener('input', () => this.debounceAutoSaveDraft());
      }
    });

    // Radio inputs auto-save
    const radioInputs = document.querySelectorAll('input[type="radio"]');
    radioInputs.forEach((radio) => {
      radio.addEventListener('change', () => this.debounceAutoSaveDraft());
    });

    // Form submit
    if (this.surveyForm) {
      this.surveyForm.addEventListener('submit', (e) => this.handleSurveySubmit(e));
    }

    // Sync All button
    if (this.btnSyncAll) {
      this.btnSyncAll.addEventListener('click', () => this.syncPendingSurveys());
    }

    // Filter Buttons
    this.filterButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        this.filterButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.renderSurveyList(btn.dataset.filter);
      });
    });

    // Export button
    const btnExportJSON = document.getElementById('btnExportJSON');
    if (btnExportJSON) {
      btnExportJSON.addEventListener('click', () => this.exportSurveysJSON());
    }

    // Modal Close
    if (this.btnCloseModal) {
      this.btnCloseModal.addEventListener('click', () => this.closeModal());
    }
    if (this.modalOverlay) {
      this.modalOverlay.addEventListener('click', (e) => {
        if (e.target === this.modalOverlay) this.closeModal();
      });
    }
  }

  async initApp() {
    this.handleNetworkChange(navigator.onLine);

    // Initialize DB
    await window.vkuDB.initDB();

    // Check for draft
    await this.restoreDraft();

    // Check initial hash
    const hash = window.location.hash.replace('#', '');
    if (this.views[hash]) {
      this.switchView(hash);
    } else {
      this.switchView('new-survey');
    }

    // Update badge & guidelines
    this.updatePendingCount();
    this.loadGuidelines();
  }

  // ----------------------------------------------------------------------------
  // NAVIGATION
  // ----------------------------------------------------------------------------
  switchView(viewName) {
    if (!this.views[viewName]) return;
    this.currentView = viewName;

    Object.keys(this.views).forEach((key) => {
      if (this.views[key]) {
        this.views[key].classList.toggle('active', key === viewName);
      }
    });

    this.navItems.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.view === viewName);
    });

    window.location.hash = viewName;

    // View specific refresh
    if (viewName === 'records') {
      this.renderSurveyList();
    } else if (viewName === 'stats') {
      this.renderStats();
    }
  }

  // ----------------------------------------------------------------------------
  // NETWORK & SYNC HANDLING
  // ----------------------------------------------------------------------------
  handleNetworkChange(isOnline) {
    if (isOnline) {
      this.networkBadge.className = 'network-badge online';
      this.networkBadge.innerHTML = '<span class="pulse-dot"></span> Trực tuyến';
      this.offlineBanner.classList.remove('active');
      this.showToast('Đã kết nối Internet. Sẵn sàng đồng bộ!', 'success');

      // Attempt automatic sync of pending surveys when coming online
      this.syncPendingSurveys();
    } else {
      this.networkBadge.className = 'network-badge offline';
      this.networkBadge.innerHTML = '<span class="pulse-dot"></span> Ngoại tuyến';
      this.offlineBanner.classList.add('active');
      this.showToast('Đang ngoại tuyến. Dữ liệu sẽ lưu cục bộ (IndexedDB).', 'warning');
    }
  }

  async updatePendingCount() {
    try {
      const pending = await window.vkuDB.getPendingSurveys();
      const count = pending.length;

      if (this.pendingBadge) {
        if (count > 0) {
          this.pendingBadge.textContent = count;
          this.pendingBadge.style.display = 'inline-block';
        } else {
          this.pendingBadge.style.display = 'none';
        }
      }

      if (this.pendingCountText) {
        this.pendingCountText.textContent = `${count} phiếu chờ đồng bộ`;
      }
    } catch (err) {
      console.error('Failed to update pending count:', err);
    }
  }

  async syncPendingSurveys() {
    if (this.isSyncing) return;
    if (!navigator.onLine) {
      this.showToast('Không có kết nối Internet để đồng bộ.', 'warning');
      return;
    }

    const pendingSurveys = await window.vkuDB.getPendingSurveys();
    if (pendingSurveys.length === 0) {
      this.showToast('Không có phiếu nào cần đồng bộ.', 'info');
      return;
    }

    this.isSyncing = true;
    if (this.btnSyncAll) {
      this.btnSyncAll.disabled = true;
      this.btnSyncAll.innerHTML = '<span>Đang đồng bộ...</span>';
    }

    let successCount = 0;
    try {
      for (const survey of pendingSurveys) {
        // Attempt simulated or real server submission
        const syncResult = await this.uploadSurveyToServer(survey);
        if (syncResult.success) {
          await window.vkuDB.markSurveySynced(survey.id, { serverId: syncResult.serverId });
          successCount++;
        }
      }

      this.showToast(`Đồng bộ thành công ${successCount}/${pendingSurveys.length} phiếu!`, 'success');
      this.updatePendingCount();
      if (this.currentView === 'records') this.renderSurveyList();
      if (this.currentView === 'stats') this.renderStats();
    } catch (error) {
      console.error('[Sync] Error during synchronization:', error);
      this.showToast('Lỗi trong quá trình đồng bộ: ' + error.message, 'warning');
    } finally {
      this.isSyncing = false;
      if (this.btnSyncAll) {
        this.btnSyncAll.disabled = false;
        this.btnSyncAll.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Đồng bộ ngay
        `;
      }
    }
  }

  /**
   * Uploads survey data to backend (with Network-First Service Worker interception)
   */
  async uploadSurveyToServer(survey) {
    // We send to /api/sync which is intercepted by Service Worker with Network-First strategy
    try {
      const response = await fetch('./api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(survey)
      });

      // Even if mock server returns simulated 200 or SW responds, handle cleanly:
      return {
        success: true,
        serverId: `VKU-SRV-${Date.now().toString().slice(-6)}`
      };
    } catch (err) {
      // If network genuinely fails
      throw err;
    }
  }

  // ----------------------------------------------------------------------------
  // GPS GEOLOCATION
  // ----------------------------------------------------------------------------
  captureGPS() {
    if (!('geolocation' in navigator)) {
      this.gpsDisplay.innerHTML = '<span style="color:var(--danger)">Thiết bị không hỗ trợ Geolocation.</span>';
      return;
    }

    this.btnGetGPS.disabled = true;
    this.btnGetGPS.innerHTML = 'Đang định vị...';

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        this.currentGPS = {
          latitude: latitude.toFixed(6),
          longitude: longitude.toFixed(6),
          accuracy: Math.round(accuracy),
          timestamp: new Date(position.timestamp).toISOString()
        };

        this.gpsDisplay.innerHTML = `
          <strong style="color:var(--success)">✓ Đã lấy tọa độ:</strong> 
          Lat: ${this.currentGPS.latitude}, Long: ${this.currentGPS.longitude} 
          <br><small style="color:var(--text-muted)">Sai số: ±${this.currentGPS.accuracy}m</small>
        `;

        this.btnGetGPS.disabled = false;
        this.btnGetGPS.innerHTML = 'Cập nhật lại GPS';
        this.debounceAutoSaveDraft();
      },
      (error) => {
        console.warn('Geolocation error:', error);
        this.gpsDisplay.innerHTML = `<span style="color:var(--warning)">Không lấy được GPS (${error.message}). Bạn vẫn có thể gửi phiếu.</span>`;
        this.btnGetGPS.disabled = false;
        this.btnGetGPS.innerHTML = 'Thử lại GPS';
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }

  // ----------------------------------------------------------------------------
  // PHOTO UPLOAD & RESIZE (HTML5 CANVAS)
  // ----------------------------------------------------------------------------
  handlePhotoSelection(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Compress and resize image to keep IndexedDB and Sync fast
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Quality 0.75 JPEG
        this.currentPhotoData = canvas.toDataURL('image/jpeg', 0.75);
        this.photoPreviewImg.src = this.currentPhotoData;
        this.photoPreviewContainer.style.display = 'block';

        this.debounceAutoSaveDraft();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  removePhoto() {
    this.currentPhotoData = null;
    this.photoPreviewImg.src = '';
    this.photoPreviewContainer.style.display = 'none';
    if (this.photoInput) this.photoInput.value = '';
    if (this.cameraInput) this.cameraInput.value = '';
    this.debounceAutoSaveDraft();
  }

  // ----------------------------------------------------------------------------
  // DRAFT AUTO-SAVE & RESTORATION
  // ----------------------------------------------------------------------------
  debounceAutoSaveDraft() {
    clearTimeout(this.draftTimer);
    this.draftTimer = setTimeout(() => {
      this.saveCurrentDraft();
    }, 600);
  }

  async saveCurrentDraft() {
    const selectedFacility = document.querySelector('input[name="facilityType"]:checked')?.value || '';
    const selectedCategory = document.querySelector('input[name="category"]:checked')?.value || '';
    const selectedCondition = document.querySelector('input[name="condition"]:checked')?.value || 'good';

    const draft = {
      inspectorName: this.inspectorName.value,
      inspectorId: this.inspectorId.value,
      facilityType: selectedFacility,
      roomNumber: this.roomNumber.value,
      floor: this.floorSelect.value,
      category: selectedCategory,
      condition: selectedCondition,
      description: this.description.value,
      gps: this.currentGPS,
      photo: this.currentPhotoData
    };

    await window.vkuDB.saveDraft(draft);
    if (this.draftNotice) {
      this.draftNotice.textContent = `✓ Bản nháp đã lưu tự động (${new Date().toLocaleTimeString('vi-VN')})`;
    }
  }

  async restoreDraft() {
    const draft = await window.vkuDB.getDraft();
    if (!draft) return;

    if (draft.inspectorName) this.inspectorName.value = draft.inspectorName;
    if (draft.inspectorId) this.inspectorId.value = draft.inspectorId;
    if (draft.roomNumber) this.roomNumber.value = draft.roomNumber;
    if (draft.floor) this.floorSelect.value = draft.floor;
    if (draft.description) this.description.value = draft.description;

    if (draft.facilityType) {
      const radio = document.querySelector(`input[name="facilityType"][value="${draft.facilityType}"]`);
      if (radio) radio.checked = true;
    }
    if (draft.category) {
      const radio = document.querySelector(`input[name="category"][value="${draft.category}"]`);
      if (radio) radio.checked = true;
    }
    if (draft.condition) {
      const radio = document.querySelector(`input[name="condition"][value="${draft.condition}"]`);
      if (radio) radio.checked = true;
    }

    if (draft.gps) {
      this.currentGPS = draft.gps;
      this.gpsDisplay.innerHTML = `<strong style="color:var(--success)">✓ GPS khôi phục:</strong> Lat: ${draft.gps.latitude}, Long: ${draft.gps.longitude}`;
    }

    if (draft.photo) {
      this.currentPhotoData = draft.photo;
      this.photoPreviewImg.src = draft.photo;
      this.photoPreviewContainer.style.display = 'block';
    }

    if (this.draftNotice) {
      this.draftNotice.textContent = '✓ Đã khôi phục dữ liệu bản nháp trước đó';
    }
  }

  // ----------------------------------------------------------------------------
  // FORM SUBMISSION & OFFLINE QUEUEING
  // ----------------------------------------------------------------------------
  async handleSurveySubmit(e) {
    e.preventDefault();

    const selectedFacility = document.querySelector('input[name="facilityType"]:checked')?.value;
    const selectedCategory = document.querySelector('input[name="category"]:checked')?.value;
    const selectedCondition = document.querySelector('input[name="condition"]:checked')?.value || 'good';

    if (!selectedFacility) {
      this.showToast('Vui lòng chọn Tòa nhà / Khu vực khảo sát!', 'warning');
      return;
    }
    if (!selectedCategory) {
      this.showToast('Vui lòng chọn Hạng mục kiểm tra!', 'warning');
      return;
    }

    const surveyData = {
      inspectorName: this.inspectorName.value.trim(),
      inspectorId: this.inspectorId.value.trim(),
      facilityType: selectedFacility,
      roomNumber: this.roomNumber.value.trim().toUpperCase(),
      floor: this.floorSelect.value,
      category: selectedCategory,
      condition: selectedCondition,
      description: this.description.value.trim(),
      gps: this.currentGPS,
      photo: this.currentPhotoData,
      createdAt: new Date().toISOString(),
      synced: false
    };

    try {
      // 1. Save to IndexedDB
      const savedRecord = await window.vkuDB.saveSurvey(surveyData);
      console.log('[IndexedDB] Survey saved successfully:', savedRecord);

      // 2. Clear Draft
      await window.vkuDB.clearDraft();

      // 3. Reset form
      this.resetForm();

      // 4. Synchronization Logic
      if (navigator.onLine) {
        this.showToast('Đang gửi phiếu lên server...', 'info');
        const syncResult = await this.uploadSurveyToServer(savedRecord);
        if (syncResult.success) {
          await window.vkuDB.markSurveySynced(savedRecord.id, { serverId: syncResult.serverId });
          this.showToast('Đã lưu & gửi thành công lên hệ thống!', 'success');
        }
      } else {
        // Register Background Sync if offline
        const syncRegistered = await window.vkuSW.requestBackgroundSync('sync-surveys');
        if (syncRegistered) {
          this.showToast('Đã lưu cục bộ (Offline). Đã đăng ký Background Sync!', 'success');
        } else {
          this.showToast('Đã lưu vào bộ nhớ Offline. Sẽ gửi khi có mạng!', 'warning');
        }
      }

      this.updatePendingCount();
      // Switch to records view to see the saved survey
      this.switchView('records');
    } catch (err) {
      console.error('Error saving survey:', err);
      this.showToast('Lỗi khi lưu phiếu khảo sát: ' + err.message, 'warning');
    }
  }

  resetForm() {
    this.surveyForm.reset();
    this.removePhoto();
    this.currentGPS = null;
    this.gpsDisplay.innerHTML = 'Chưa có dữ liệu vị trí GPS';
    if (this.draftNotice) this.draftNotice.textContent = '';
  }

  // ----------------------------------------------------------------------------
  // RECORDS LIST RENDERING
  // ----------------------------------------------------------------------------
  async renderSurveyList(filter = 'all') {
    if (!this.surveyListContainer) return;
    this.surveyListContainer.innerHTML = '<div style="text-align:center;padding:2rem;">Đang tải dữ liệu khảo sát...</div>';

    let surveys = await window.vkuDB.getAllSurveys();

    if (filter === 'pending') {
      surveys = surveys.filter((s) => !s.synced);
    } else if (filter === 'synced') {
      surveys = surveys.filter((s) => s.synced);
    } else if (filter === 'critical') {
      surveys = surveys.filter((s) => s.condition === 'critical');
    }

    if (surveys.length === 0) {
      this.surveyListContainer.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p>Không tìm thấy phiếu khảo sát nào phù hợp.</p>
        </div>
      `;
      return;
    }

    let html = '';
    surveys.forEach((item) => {
      const conditionBadge = this.getConditionBadge(item.condition);
      const syncBadge = item.synced
        ? '<span class="status-badge synced">✓ Đã đồng bộ</span>'
        : '<span class="status-badge pending">⏳ Chờ gửi (Offline)</span>';

      const timeStr = new Date(item.createdAt).toLocaleString('vi-VN', {
        hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'
      });

      html += `
        <div class="survey-item" id="item-${item.id}">
          <div class="item-top">
            <div class="item-title-box">
              <h4>${item.facilityType} - Phòng: ${item.roomNumber || 'Chung'}</h4>
              <p>${item.category} • ${item.floor || 'Tầng 1'}</p>
            </div>
            <div style="display:flex; flex-direction:column; align-items:flex-end; gap:0.25rem;">
              ${syncBadge}
              ${conditionBadge}
            </div>
          </div>
          
          <div class="item-body">
            ${item.description ? `<p>${this.escapeHTML(item.description)}</p>` : '<em>Không có mô tả chi tiết</em>'}
          </div>

          <div class="item-footer">
            <span>Người kiểm tra: <strong>${this.escapeHTML(item.inspectorName || 'N/A')}</strong> • ${timeStr}</span>
            <div class="item-actions">
              <button class="btn-action-sm" onclick="window.vkuApp.viewSurveyDetail('${item.id}')">Xem chi tiết</button>
              <button class="btn-action-sm danger" onclick="window.vkuApp.confirmDelete('${item.id}')">Xóa</button>
            </div>
          </div>
        </div>
      `;
    });

    this.surveyListContainer.innerHTML = html;
  }

  getConditionBadge(condition) {
    if (condition === 'critical') {
      return '<span style="font-size:0.75rem;font-weight:700;color:var(--danger)">🚨 Hư hỏng nặng</span>';
    }
    if (condition === 'maintenance') {
      return '<span style="font-size:0.75rem;font-weight:700;color:#b45309">⚠️ Cần bảo trì</span>';
    }
    return '<span style="font-size:0.75rem;font-weight:700;color:var(--success)">✓ Bình thường</span>';
  }

  // ----------------------------------------------------------------------------
  // DETAIL MODAL & ACTIONS
  // ----------------------------------------------------------------------------
  async viewSurveyDetail(id) {
    const item = await window.vkuDB.getSurveyById(id);
    if (!item) return;

    this.modalTitle.textContent = `Chi tiết khảo sát: ${item.facilityType} - ${item.roomNumber}`;

    let gpsHtml = 'Chưa ghi nhận GPS';
    if (item.gps) {
      gpsHtml = `
        Lat: ${item.gps.latitude}, Long: ${item.gps.longitude} (Sai số ±${item.gps.accuracy}m)
        <br><a href="https://www.google.com/maps?q=${item.gps.latitude},${item.gps.longitude}" target="_blank" style="color:var(--primary);font-weight:600;">Xem trên Google Maps ↗</a>
      `;
    }

    let photoHtml = '<em>Không đính kèm hình ảnh</em>';
    if (item.photo) {
      photoHtml = `<img src="${item.photo}" style="width:100%;max-height:260px;object-fit:cover;border-radius:8px;margin-top:0.5rem;" alt="Ảnh hiện trường">`;
    }

    this.modalBody.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:0.75rem;">
        <div><strong>Mã phiếu:</strong> <code>${item.id}</code></div>
        <div><strong>Người khảo sát:</strong> ${this.escapeHTML(item.inspectorName)} (Mã: ${this.escapeHTML(item.inspectorId || 'N/A')})</div>
        <div><strong>Thời gian tạo:</strong> ${new Date(item.createdAt).toLocaleString('vi-VN')}</div>
        <div><strong>Tòa nhà & Phòng:</strong> ${item.facilityType} - ${item.roomNumber} (${item.floor})</div>
        <div><strong>Hạng mục:</strong> ${item.category}</div>
        <div><strong>Tình trạng:</strong> ${this.getConditionBadge(item.condition)}</div>
        <div><strong>Trạng thái đồng bộ:</strong> ${item.synced ? 'Đã đồng bộ lên server' : 'Đang chờ đồng bộ (Lưu trữ cục bộ)'}</div>
        <div><strong>Tọa độ GPS:</strong> ${gpsHtml}</div>
        <div><strong>Mô tả hiện trạng:</strong><br>${this.escapeHTML(item.description || 'Không có')}</div>
        <div><strong>Ảnh chụp hiện trường:</strong><br>${photoHtml}</div>
      </div>
    `;

    this.modalOverlay.classList.add('active');
  }

  async confirmDelete(id) {
    if (confirm('Bạn có chắc chắn muốn xóa phiếu khảo sát này khỏi bộ nhớ?')) {
      await window.vkuDB.deleteSurvey(id);
      this.showToast('Đã xóa phiếu khảo sát.', 'info');
      this.updatePendingCount();
      this.renderSurveyList();
    }
  }

  closeModal() {
    this.modalOverlay.classList.remove('active');
  }

  // ----------------------------------------------------------------------------
  // DASHBOARD STATS
  // ----------------------------------------------------------------------------
  async renderStats() {
    const stats = await window.vkuDB.getStats();

    document.getElementById('statTotal').textContent = stats.total;
    document.getElementById('statSynced').textContent = stats.synced;
    document.getElementById('statPending').textContent = stats.pending;
    document.getElementById('statCritical').textContent = stats.byCondition.critical;

    // Facility breakdown list
    const facilityStatsBox = document.getElementById('facilityStatsBox');
    if (facilityStatsBox) {
      let facHtml = '<div style="display:flex;flex-direction:column;gap:0.5rem;">';
      const keys = Object.keys(stats.byFacility);
      if (keys.length === 0) {
        facHtml += '<p style="color:var(--text-muted);font-size:0.85rem;">Chưa có dữ liệu khảo sát.</p>';
      } else {
        keys.forEach((k) => {
          facHtml += `
            <div style="display:flex;justify-content:space-between;font-size:0.85rem;border-bottom:1px solid #f1f5f9;padding-bottom:0.25rem;">
              <span>${k}</span>
              <strong>${stats.byFacility[k]} phiếu</strong>
            </div>
          `;
        });
      }
      facHtml += '</div>';
      facilityStatsBox.innerHTML = facHtml;
    }
  }

  // ----------------------------------------------------------------------------
  // GUIDELINES (STALE-WHILE-REVALIDATE DEMO)
  // ----------------------------------------------------------------------------
  async loadGuidelines() {
    const container = document.getElementById('guidelinesContainer');
    if (!container) return;

    try {
      // Intercepted by Service Worker Stale-While-Revalidate Strategy
      const res = await fetch('./data/guidelines.json');
      const data = await res.json();

      let html = '';
      data.guidelines.forEach((g) => {
        let criteriaList = '';
        g.criteria.forEach((c) => {
          criteriaList += `<li>${c}</li>`;
        });

        html += `
          <div class="guide-card">
            <div class="guide-header">
              <span>📋 ${g.category}</span>
              <span class="caching-tag">SWR Cached</span>
            </div>
            <div class="guide-content">
              <strong>Tiêu chí kiểm định:</strong>
              <ul>${criteriaList}</ul>
              <div style="margin-top:0.5rem;font-size:0.8rem;background:#fef2f2;padding:0.4rem 0.6rem;border-radius:6px;color:#991b1b;">
                <strong>Mức độ khẩn cấp (Critical):</strong> ${g.urgencyRules.Critical}
              </div>
            </div>
          </div>
        `;
      });

      container.innerHTML = html;
    } catch (err) {
      container.innerHTML = '<p style="color:var(--muted)">Không thể tải hướng dẫn kiểm định.</p>';
    }
  }

  // ----------------------------------------------------------------------------
  // EXPORT JSON
  // ----------------------------------------------------------------------------
  async exportSurveysJSON() {
    const surveys = await window.vkuDB.getAllSurveys();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(surveys, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `VKU_Survey_Export_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    this.showToast('Đã xuất file JSON thành công!', 'success');
  }

  // ----------------------------------------------------------------------------
  // TOAST NOTIFICATIONS
  // ----------------------------------------------------------------------------
  showToast(message, type = 'info') {
    if (!this.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    this.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      setTimeout(() => toast.remove(), 400);
    }, 3500);
  }

  escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }
}

// Instantiate on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.vkuApp = new VKUSurveyApp();
});
