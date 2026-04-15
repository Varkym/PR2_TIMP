const STORAGE_KEY = "security-monitor-v1";
const servicesPage = document.getElementById("serviceList");
const formPage = document.getElementById("serviceForm");
const summaryPage = document.getElementById("stackedBar") || document.getElementById("categoryBars") || document.getElementById("categoryStats");

let services = loadServices();

function loadServices() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Не удалось загрузить данные:", error);
    return [];
  }
}

function saveServices() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(services));
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toLocalDateTime(isoDate) {
  const date = new Date(isoDate);
  return date.toLocaleString("ru-RU");
}

function getSecurityLevel(percent) {
  if (percent > 80) return "Высокий";
  if (percent >= 50) return "Средний";
  if (percent >= 20) return "Низкий";
  return "Критический";
}

function getSecurityClass(percent) {
  if (percent > 80) return "high";
  if (percent >= 50) return "medium";
  if (percent >= 20) return "low";
  return "critical";
}

function setCircleProgress(circleEl, value, max) {
  if (!circleEl) return;
  const circumference = 88;
  const pct = max > 0 ? (value / max) * circumference : 0;
  circleEl.style.strokeDashoffset = String(circumference - pct);
}

function updateStats() {
  const totalCountEl = document.getElementById("totalCount");
  const protectedCountEl = document.getElementById("protectedCount");
  const riskyCountEl = document.getElementById("riskyCount");
  const criticalCountEl = document.getElementById("criticalCount");
  const avgSecurityEl = document.getElementById("avgSecurity");
  const avgBar = document.getElementById("avgBar");

  if (!totalCountEl) return;

  const total = services.length;
  const protected_ = services.filter((s) => s.securityLevel > 80).length;
  const risky = services.filter((s) => s.securityLevel >= 50 && s.securityLevel <= 80).length;
  const critical = services.filter((s) => s.securityLevel < 50).length;

  totalCountEl.textContent = String(total);
  if (protectedCountEl) protectedCountEl.textContent = String(protected_);
  if (riskyCountEl) riskyCountEl.textContent = String(risky);
  if (criticalCountEl) criticalCountEl.textContent = String(critical);

  const totalCircle = document.getElementById("totalCircle");
  const protectedCircle = document.getElementById("protectedCircle");
  const riskyCircle = document.getElementById("riskyCircle");
  const criticalCircle = document.getElementById("criticalCircle");

  const maxVal = total || 1;
  if (totalCircle) setCircleProgress(totalCircle, total, maxVal);
  if (protectedCircle) setCircleProgress(protectedCircle, protected_, maxVal);
  if (riskyCircle) setCircleProgress(riskyCircle, risky, maxVal);
  if (criticalCircle) setCircleProgress(criticalCircle, critical, maxVal);

  if (avgSecurityEl) {
    const avg =
      total > 0
        ? Math.round(
            services.reduce((sum, s) => sum + Number(s.securityLevel || 0), 0) / total
          )
        : 0;
    avgSecurityEl.textContent = `${avg}%`;
    if (avgBar) avgBar.style.width = `${avg}%`;
  }
}

function renderCards() {
  const grid = document.getElementById("serviceList");
  const emptyState = document.getElementById("emptyState");
  const searchInput = document.getElementById("searchInput");
  const statusFilter = document.getElementById("statusFilter");
  const securityLevelFilter = document.getElementById("securityLevelFilter");

  if (!grid || !emptyState) return;

  grid.innerHTML = "";

  const query = searchInput ? searchInput.value.trim().toLowerCase() : "";
  const status = statusFilter ? statusFilter.value : "Все";
  const securityLevel = securityLevelFilter ? securityLevelFilter.value : "Все";

  const filtered = services
    .filter((service) => {
      const matchesQuery =
        service.title.toLowerCase().includes(query) ||
        service.url.toLowerCase().includes(query) ||
        (service.description || "").toLowerCase().includes(query);
      const matchesStatus = status === "Все" || service.status === status;
      const matchesSecurityLevel =
        securityLevel === "Все" || getSecurityLevel(Number(service.securityLevel)) === securityLevel;
      return matchesQuery && matchesStatus && matchesSecurityLevel;
    })
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  if (filtered.length === 0) {
    emptyState.style.display = "block";
    emptyState.textContent = services.length
      ? "По текущим фильтрам сервисы не найдены."
      : "Сервисов пока нет. Добавь первый!";
  } else {
    emptyState.style.display = "none";
  }

  const circumference = 2 * Math.PI * 22; // r=22

  filtered.forEach((service) => {
    const card = document.createElement("div");
    card.className = "flip-card";
    card.dataset.id = service.id;

    const offset = circumference - (service.securityLevel / 100) * circumference;
    const barClass = getSecurityClass(Number(service.securityLevel));

    card.innerHTML = `
      <div class="flip-card-inner">
        <!-- FRONT -->
        <div class="flip-card-front">
          <div class="card-front-top">
            <div>
              <h3 class="card-front-name">${escapeHtml(service.title)}</h3>
              <p class="card-front-category">${escapeHtml(service.category)}</p>
            </div>
            <div class="card-progress">
              <svg viewBox="0 0 48 48">
                <circle class="progress-bg" cx="24" cy="24" r="22" />
                <circle class="progress-fill ${barClass}" cx="24" cy="24" r="22"
                  stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" />
              </svg>
              <span class="progress-text">${service.securityLevel}%</span>
            </div>
          </div>
          <div class="card-front-middle">
            <span class="status-badge" data-value="${escapeHtml(service.status)}">${escapeHtml(service.status)}</span>
          </div>
          <p class="card-front-hint">Нажми, чтобы увидеть подробности</p>
        </div>
        <!-- BACK -->
        <div class="flip-card-back">
          <div>
            <h3>${escapeHtml(service.title)}</h3>
            <div class="card-back-row">
              <span class="card-back-label">URL</span>
              <span class="card-back-value">${escapeHtml(service.url)}</span>
            </div>
            <div class="card-back-row">
              <span class="card-back-label">Категория</span>
              <span class="card-back-value">${escapeHtml(service.category)}</span>
            </div>
            <div class="card-back-row">
              <span class="card-back-label">Безопасность</span>
              <span class="card-back-value">${service.securityLevel}%</span>
            </div>
            <div class="card-back-row">
              <span class="card-back-label">Статус</span>
              <span class="card-back-value">${escapeHtml(service.status)}</span>
            </div>
            <div class="card-back-row">
              <span class="card-back-label">Ответственный</span>
              <span class="card-back-value">${escapeHtml(service.assignee || "не назначен")}</span>
            </div>
            <div class="card-back-row">
              <span class="card-back-label">Проверка</span>
              <span class="card-back-value">${escapeHtml(service.lastCheckDate || "не указана")}</span>
            </div>
            ${service.description ? `<div class="card-back-row"><span class="card-back-label">Описание</span><span class="card-back-value">${escapeHtml(service.description)}</span></div>` : ""}
          </div>
          <div class="card-back-actions">
            <button class="action-btn edit" data-id="${escapeHtml(service.id)}">Редактировать</button>
            <button class="action-btn delete" data-id="${escapeHtml(service.id)}">Удалить</button>
          </div>
        </div>
      </div>
    `;

    // Flip on click (both sides)
    card.querySelector(".flip-card-front").addEventListener("click", () => {
      card.classList.toggle("flipped");
    });
    card.querySelector(".flip-card-back").addEventListener("click", () => {
      card.classList.remove("flipped");
    });

    card.querySelector(".edit").addEventListener("click", (e) => {
      e.stopPropagation();
      window.location.href = `create.html?edit=${encodeURIComponent(service.id)}`;
    });
    card.querySelector(".delete").addEventListener("click", (e) => {
      e.stopPropagation();
      removeService(service.id);
    });

    grid.appendChild(card);
  });

  updateStats();
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function getFormValues() {
  return {
    id: document.getElementById("serviceId").value,
    title: document.getElementById("title").value.trim(),
    url: document.getElementById("url").value.trim(),
    category: document.getElementById("category").value,
    securityLevel: Number(document.getElementById("securityLevel").value),
    status: document.getElementById("status").value,
    assignee: document.getElementById("assignee").value.trim(),
    lastCheckDate: document.getElementById("lastCheckDate").value,
    description: document.getElementById("description").value.trim()
  };
}

function resetForm() {
  const form = document.getElementById("serviceForm");
  const saveBtn = document.getElementById("saveBtn");
  const formTitle = document.getElementById("formTitle");
  const pageTitle = document.getElementById("pageTitle");
  const pageSubtitle = document.getElementById("pageSubtitle");
  if (!form || !saveBtn) return;
  form.reset();
  document.getElementById("serviceId").value = "";
  saveBtn.textContent = "Сохранить";
  if (formTitle) formTitle.textContent = "Новый сервис";
  if (pageTitle) pageTitle.textContent = "Добавление сервиса";
  if (pageSubtitle) pageSubtitle.textContent = "Новый электронный сервис";
  document.title = "Добавление сервиса";
}

function fillFormForEdit(id) {
  const saveBtn = document.getElementById("saveBtn");
  const formTitle = document.getElementById("formTitle");
  const pageTitle = document.getElementById("pageTitle");
  const pageSubtitle = document.getElementById("pageSubtitle");
  const service = services.find((item) => item.id === id);
  if (!service || !saveBtn) return;

  document.getElementById("serviceId").value = service.id;
  document.getElementById("title").value = service.title;
  document.getElementById("url").value = service.url;
  document.getElementById("category").value = service.category;
  document.getElementById("securityLevel").value = service.securityLevel;
  document.getElementById("status").value = service.status;
  document.getElementById("assignee").value = service.assignee || "";
  document.getElementById("lastCheckDate").value = service.lastCheckDate || "";
  document.getElementById("description").value = service.description || "";
  saveBtn.textContent = "Обновить";
  if (formTitle) formTitle.textContent = "Редактирование сервиса";
  if (pageTitle) pageTitle.textContent = "Редактирование сервиса";
  if (pageSubtitle) pageSubtitle.textContent = "Измените и сохраните данные";
  document.title = "Редактирование сервиса";
}

// ===== MODAL =====
function showModal(title, message) {
  return new Promise((resolve) => {
    const modal = document.getElementById("confirmModal");
    const modalTitle = document.getElementById("modalTitle");
    const modalMessage = document.getElementById("modalMessage");
    const confirmBtn = document.getElementById("modalConfirmBtn");
    const cancelBtn = document.getElementById("modalCancelBtn");
    if (!modal) { resolve(false); return; }
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    modal.classList.add("visible");

    const close = (result) => {
      modal.classList.remove("visible");
      confirmBtn.removeEventListener("click", onConfirm);
      cancelBtn.removeEventListener("click", onCancel);
      resolve(result);
    };

    const onConfirm = () => close(true);
    const onCancel = () => close(false);

    confirmBtn.addEventListener("click", onConfirm);
    cancelBtn.addEventListener("click", onCancel);
  });
}

function removeService(id) {
  const service = services.find((item) => item.id === id);
  if (!service) return;
  showModal("Удалить сервис?", `Удалить "${service.title}"? Это действие нельзя отменить.`).then((confirmed) => {
    if (!confirmed) return;
    services = services.filter((item) => item.id !== id);
    saveServices();
    renderCards();
  });
}

function validateService(values) {
  if (!values.title || !values.url) {
    return "Заполните обязательные поля: название и URL сервиса.";
  }
  if (values.securityLevel < 0 || values.securityLevel > 100) {
    return "Уровень безопасности должен быть от 0 до 100.";
  }
  return "";
}

function upsertService(values) {
  const now = new Date().toISOString();
  if (values.id) {
    services = services.map((item) =>
      item.id === values.id ? { ...item, ...values, updatedAt: now } : item
    );
  } else {
    services.push({ ...values, id: generateId(), createdAt: now, updatedAt: now });
  }
}

function exportToJson() {
  const blob = new Blob([JSON.stringify(services, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "services-export.json";
  a.click();
  URL.revokeObjectURL(url);
}

function importFromJson(file) {
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const parsed = JSON.parse(String(event.target?.result || "[]"));
      if (!Array.isArray(parsed)) {
        console.warn("Некорректный формат файла: ожидается массив сервисов.");
        return;
      }
      const normalized = parsed.map((item) => ({
        id: item.id || generateId(),
        title: String(item.title || "").trim(),
        url: String(item.url || "").trim(),
        category: String(item.category || "Онлайн-банкинг"),
        securityLevel: Number(item.securityLevel || 0),
        status: String(item.status || "Есть риски"),
        assignee: String(item.assignee || "").trim(),
        lastCheckDate: String(item.lastCheckDate || ""),
        description: String(item.description || "").trim(),
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: item.updatedAt || new Date().toISOString()
      }));
      const validImported = normalized.filter((item) => item.title && item.url);
      const mergedById = new Map();
      services.forEach((item) => { if (item?.id) mergedById.set(item.id, item); });
      validImported.forEach((item) => { if (item?.id) mergedById.set(item.id, item); });
      services = Array.from(mergedById.values());
      saveServices();
      renderCards();
    } catch (error) {
      console.error(error);
    }
  };
  reader.readAsText(file);
}

function initServicesPage() {
  const clearAllBtn = document.getElementById("clearAllBtn");
  const exportBtn = document.getElementById("exportBtn");
  const importInput = document.getElementById("importInput");
  const searchInput = document.getElementById("searchInput");
  const statusFilter = document.getElementById("statusFilter");
  const securityLevelFilter = document.getElementById("securityLevelFilter");
  const resetFiltersBtn = document.getElementById("resetFiltersBtn");

  clearAllBtn?.addEventListener("click", async () => {
    if (!services.length) return;
    const confirmed = await showModal("Удалить все?", "Удалить все сервисы? Это действие нельзя отменить.");
    if (!confirmed) return;
    services = [];
    saveServices();
    renderCards();
  });

  exportBtn?.addEventListener("click", exportToJson);
  importInput?.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log("Импорт файла:", file.name);
      importFromJson(file);
    }
    importInput.value = "";
  });

  resetFiltersBtn?.addEventListener("click", () => {
    if (searchInput) searchInput.value = "";
    if (statusFilter) statusFilter.value = "Все";
    if (securityLevelFilter) securityLevelFilter.value = "Все";
    renderCards();
  });

  [searchInput, statusFilter, securityLevelFilter].forEach((el) => {
    el?.addEventListener("input", renderCards);
    el?.addEventListener("change", renderCards);
  });

  renderCards();
}

function initFormPage() {
  const form = document.getElementById("serviceForm");
  const resetBtn = document.getElementById("resetBtn");
  if (!form) return;

  const params = new URLSearchParams(window.location.search);
  const editId = params.get("edit");
  if (editId) fillFormForEdit(editId);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const values = getFormValues();
    const validationError = validateService(values);
    if (validationError) { window.alert(validationError); return; }
    upsertService(values);
    saveServices();
    window.location.href = "index.html";
  });

  resetBtn?.addEventListener("click", resetForm);
}

function initSummaryPage() {
  const total = services.length;
  const protected_ = services.filter((s) => s.securityLevel > 80).length;
  const risky = services.filter((s) => s.securityLevel >= 50 && s.securityLevel <= 80).length;
  const critical = services.filter((s) => s.securityLevel < 50).length;
  const avg = total > 0 ? Math.round(services.reduce((sum, s) => sum + Number(s.securityLevel || 0), 0) / total) : 0;

  // Stacked bar
  const segGreen = document.getElementById("segGreen");
  const segYellow = document.getElementById("segYellow");
  const segRed = document.getElementById("segRed");
  if (segGreen) segGreen.style.width = total ? `${(protected_ / total) * 100}%` : "0%";
  if (segYellow) segYellow.style.width = total ? `${(risky / total) * 100}%` : "0%";
  if (segRed) segRed.style.width = total ? `${(critical / total) * 100}%` : "0%";

  // Legend counts
  const legTotal = document.getElementById("legTotal");
  const legProtected = document.getElementById("legProtected");
  const legRisky = document.getElementById("legRisky");
  const legCritical = document.getElementById("legCritical");
  if (legTotal) legTotal.textContent = total;
  if (legProtected) legProtected.textContent = protected_;
  if (legRisky) legRisky.textContent = risky;
  if (legCritical) legCritical.textContent = critical;

  // Average
  const avgSecurityEl = document.getElementById("avgSecurity");
  const avgBar = document.getElementById("avgBar");
  if (avgSecurityEl) {
    let current = 0;
    const avgInterval = setInterval(() => {
      current += 2;
      if (current >= avg) { current = avg; clearInterval(avgInterval); }
      avgSecurityEl.textContent = `${current}%`;
      if (avgBar) avgBar.style.width = `${current}%`;
    }, 25);
  }

  // Segment details
  const segmentDetails = document.getElementById("segmentDetails");
  if (segmentDetails) {
    const segments = [
      { label: "Защищённые (>80%)", dot: "dot-green", services: services.filter((s) => s.securityLevel > 80) },
      { label: "С рисками (50-80%)", dot: "dot-yellow", services: services.filter((s) => s.securityLevel >= 50 && s.securityLevel <= 80) },
      { label: "Критичные (<50%)", dot: "dot-red", services: services.filter((s) => s.securityLevel < 50) }
    ];

    segmentDetails.innerHTML = "";
    segments.forEach((seg) => {
      const card = document.createElement("div");
      card.className = "segment-detail-card";
      let listHtml = "";
      if (seg.services.length === 0) {
        listHtml = `<p class="segment-empty">Нет сервисов</p>`;
      } else {
        listHtml = `<ul class="segment-detail-list">`;
        seg.services.forEach((s) => {
          listHtml += `<li><span class="svc-name">${escapeHtml(s.title)}</span><span class="svc-pct">${s.securityLevel}%</span></li>`;
        });
        listHtml += `</ul>`;
      }
      card.innerHTML = `<h3><span class="dot ${seg.dot}"></span>${seg.label}</h3>${listHtml}`;
      segmentDetails.appendChild(card);
    });
  }

  // Categories — detailed cards with mini bars
  const categoryCards = document.getElementById("categoryCards");
  const categoryEmpty = document.getElementById("categoryEmpty");
  if (!categoryCards || !categoryEmpty) return;

  const byCategory = services.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = { total: 0, safe: 0, risky: 0, critical: 0 };
    }
    acc[item.category].total++;
    const lvl = Number(item.securityLevel);
    if (lvl > 80) acc[item.category].safe++;
    else if (lvl >= 50) acc[item.category].risky++;
    else acc[item.category].critical++;
    return acc;
  }, {});

  categoryCards.innerHTML = "";
  const categoryEntries = Object.entries(byCategory).sort((a, b) => b[1].total - a[1].total);
  if (!categoryEntries.length) {
    categoryEmpty.style.display = "block";
  } else {
    categoryEmpty.style.display = "none";
    categoryEntries.forEach(([name, data]) => {
      const card = document.createElement("div");
      card.className = "cat-card";
      const total = data.total;
      const safePct = total ? (data.safe / total) * 100 : 0;
      const riskyPct = total ? (data.risky / total) * 100 : 0;
      const critPct = total ? (data.critical / total) * 100 : 0;

      card.innerHTML = `
        <div class="cat-card-header">
          <span class="cat-card-title">${escapeHtml(name)}</span>
          <span class="cat-card-count">${total} серв.</span>
        </div>
        <div class="cat-card-bar">
          <div class="bar-seg seg-green" style="width: ${safePct}%"></div>
          <div class="bar-seg seg-yellow" style="width: ${riskyPct}%"></div>
          <div class="bar-seg seg-red" style="width: ${critPct}%"></div>
        </div>
        <div class="cat-card-legend">
          ${data.safe ? `<span><span class="dot dot-green"></span>${data.safe}</span>` : ""}
          ${data.risky ? `<span><span class="dot dot-yellow"></span>${data.risky}</span>` : ""}
          ${data.critical ? `<span><span class="dot dot-red"></span>${data.critical}</span>` : ""}
        </div>
      `;
      categoryCards.appendChild(card);
    });
  }

  // Risky services — alert cards
  const securityList = document.getElementById("securityList");
  const securityEmpty = document.getElementById("securityEmpty");
  if (!securityList || !securityEmpty) return;

  securityList.innerHTML = "";
  const riskyServices = services
    .filter((item) => {
      const lvl = getSecurityLevel(Number(item.securityLevel));
      return lvl === "Низкий" || lvl === "Критический";
    })
    .sort((a, b) => a.securityLevel - b.securityLevel);

  if (!riskyServices.length) {
    securityEmpty.style.display = "block";
  } else {
    securityEmpty.style.display = "none";
    riskyServices.forEach((service) => {
      const level = getSecurityLevel(Number(service.securityLevel));
      const isCritical = level === "Критический";
      const div = document.createElement("div");
      div.className = `alert-card level-${isCritical ? "critical" : "low"}`;
      div.innerHTML = `
        <span class="alert-icon">${isCritical ? "🔴" : "🟠"}</span>
        <div class="alert-info">
          <p class="alert-name">${escapeHtml(service.title)}</p>
          <p class="alert-meta">${escapeHtml(service.url)} · ${escapeHtml(service.category)}</p>
        </div>
        <span class="alert-pct">${service.securityLevel}%</span>
        <span class="alert-badge">
          <span class="status-badge" data-value="${escapeHtml(service.status)}">${escapeHtml(service.status)}</span>
        </span>
      `;
      securityList.appendChild(div);
    });
  }
}

function loadDemoData() {
  if (services.length === 0) {
    const now = new Date().toISOString();
    services = [
      { id: "demo-1", title: "Госуслуги", url: "gosuslugi.ru", category: "Госуслуги", securityLevel: 85, status: "Защищён", assignee: "", lastCheckDate: "2026-04-14", description: "", createdAt: now, updatedAt: now },
      { id: "demo-2", title: "СберБанк Онлайн", url: "sberbank.ru", category: "Онлайн-банкинг", securityLevel: 78, status: "Есть риски", assignee: "", lastCheckDate: "2026-04-14", description: "", createdAt: now, updatedAt: now },
      { id: "demo-3", title: "Яндекс Диск", url: "disk.yandex.ru", category: "Облачные хранилища", securityLevel: 62, status: "Есть риски", assignee: "", lastCheckDate: "2026-04-13", description: "", createdAt: now, updatedAt: now },
      { id: "demo-4", title: "Почта Mail.ru", url: "mail.ru", category: "Почтовые сервисы", securityLevel: 45, status: "Критично", assignee: "", lastCheckDate: "2026-04-12", description: "", createdAt: now, updatedAt: now },
      { id: "demo-5", title: "Т-Банк", url: "tbank.ru", category: "Онлайн-банкинг", securityLevel: 91, status: "Защищён", assignee: "", lastCheckDate: "2026-04-14", description: "", createdAt: now, updatedAt: now }
    ];
    saveServices();
  }
}

loadDemoData();

if (servicesPage) initServicesPage();
if (formPage) initFormPage();
if (summaryPage) initSummaryPage();
