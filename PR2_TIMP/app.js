const STORAGE_KEY = "security-monitor-v1";
const servicesPage = document.getElementById("serviceList");
const formPage = document.getElementById("serviceForm");
const summaryPage = document.getElementById("categoryStats");

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

function renderTable() {
  const tbody = document.getElementById("serviceList");
  const emptyState = document.getElementById("emptyState");
  const searchInput = document.getElementById("searchInput");
  const statusFilter = document.getElementById("statusFilter");
  const securityLevelFilter = document.getElementById("securityLevelFilter");

  if (!tbody || !emptyState) return;

  tbody.innerHTML = "";

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

  filtered.forEach((service) => {
    const tr = document.createElement("tr");

    const level = getSecurityLevel(Number(service.securityLevel));
    const barClass = getSecurityClass(Number(service.securityLevel));

    tr.innerHTML = `
      <td class="td-name">${escapeHtml(service.title)}</td>
      <td class="td-url">${escapeHtml(service.url)}</td>
      <td>${escapeHtml(service.category)}</td>
      <td>
        <div class="security-bar-cell">
          <div class="security-bar-track">
            <div class="security-bar-fill ${barClass}" style="width: ${service.securityLevel}%;"></div>
          </div>
          <span class="security-bar-pct">${service.securityLevel}%</span>
        </div>
      </td>
      <td><span class="status-badge" data-value="${escapeHtml(service.status)}">${escapeHtml(service.status)}</span></td>
      <td>
        <button class="action-btn edit" data-id="${escapeHtml(service.id)}">Редактировать</button>
        <button class="action-btn delete" data-id="${escapeHtml(service.id)}">Удалить</button>
      </td>
    `;

    tr.querySelector(".edit").addEventListener("click", () => {
      window.location.href = `create.html?edit=${encodeURIComponent(service.id)}`;
    });
    tr.querySelector(".delete").addEventListener("click", () => removeService(service.id));

    tbody.appendChild(tr);
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

function removeService(id) {
  const service = services.find((item) => item.id === id);
  if (!service) return;
  const confirmed = window.confirm(`Удалить сервис "${service.title}"?`);
  if (!confirmed) return;
  services = services.filter((item) => item.id !== id);
  saveServices();
  renderTable();
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
        window.alert("Некорректный формат файла: ожидается массив сервисов.");
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
      renderTable();
    } catch (error) {
      console.error(error);
      window.alert("Не удалось прочитать JSON. Проверьте содержимое файла.");
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

  clearAllBtn?.addEventListener("click", () => {
    if (!services.length) return;
    if (!window.confirm("Удалить все сервисы? Это действие нельзя отменить.")) return;
    services = [];
    saveServices();
    renderTable();
  });

  exportBtn?.addEventListener("click", exportToJson);
  importInput?.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (file) importFromJson(file);
    importInput.value = "";
  });

  resetFiltersBtn?.addEventListener("click", () => {
    if (searchInput) searchInput.value = "";
    if (statusFilter) statusFilter.value = "Все";
    if (securityLevelFilter) securityLevelFilter.value = "Все";
    renderTable();
  });

  [searchInput, statusFilter, securityLevelFilter].forEach((el) => {
    el?.addEventListener("input", renderTable);
    el?.addEventListener("change", renderTable);
  });

  renderTable();
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
  updateStats();

  const categoryStats = document.getElementById("categoryStats");
  const categoryEmpty = document.getElementById("categoryEmpty");
  const securityList = document.getElementById("securityList");
  const securityEmpty = document.getElementById("securityEmpty");

  if (!categoryStats || !categoryEmpty || !securityList || !securityEmpty) return;

  const byCategory = services.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {});

  categoryStats.innerHTML = "";
  const categoryEntries = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  if (!categoryEntries.length) {
    categoryEmpty.style.display = "block";
  } else {
    categoryEmpty.style.display = "none";
    categoryEntries.forEach(([name, count]) => {
      const row = document.createElement("div");
      row.className = "kv-row";
      row.innerHTML = `<span>${escapeHtml(name)}</span><strong>${count}</strong>`;
      categoryStats.appendChild(row);
    });
  }

  securityList.innerHTML = "";
  const risky = services
    .filter((item) => {
      const lvl = getSecurityLevel(Number(item.securityLevel));
      return lvl === "Низкий" || lvl === "Критический";
    })
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  if (!risky.length) {
    securityEmpty.style.display = "block";
  } else {
    securityEmpty.style.display = "none";
    risky.forEach((service) => {
      const div = document.createElement("div");
      div.className = "summary-service-item";
      div.innerHTML = `
        <h3>${escapeHtml(service.title)}</h3>
        <p class="meta">URL: ${escapeHtml(service.url)} | Категория: ${escapeHtml(service.category)} | Уровень: ${service.securityLevel}% | Последняя проверка: ${escapeHtml(service.lastCheckDate || "не указана")}</p>
        <div class="badges">
          <span class="status-badge" data-value="${escapeHtml(service.status)}">${escapeHtml(service.status)}</span>
        </div>
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
