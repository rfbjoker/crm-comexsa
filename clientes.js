const STORAGE_KEY = "crmcomexsa:v1";
const STAGES = [
  { id: "prospecto", label: "Prospecto" },
  { id: "primeros-contactos", label: "Acción Comercial" },
  { id: "envio-muestras", label: "Envío de Muestras" },
  { id: "pedido", label: "Pedido" },
  { id: "cliente", label: "Cliente" }
];

const DEFAULT_STATE = {
  salespeople: [],
  opportunities: [],
  activities: []
};

const backToPanel = document.getElementById("backToPanel");
const clientSearch = document.getElementById("clientSearch");
let filterStage = document.getElementById("filterStage");
let filterSales = document.getElementById("filterSales");
let filterTown = document.getElementById("filterTown");
const clearFilters = document.getElementById("clearFilters");
const clientList = document.getElementById("clientList");
const clientCount = document.getElementById("clientCount");
const clientStats = document.getElementById("clientStats");

let state = loadState();

window.addEventListener("load", () => {
  document.body.classList.add("loaded");
});

ensureFilters();

backToPanel.addEventListener("click", () => {
  window.open("index.html", "_self");
});

clientSearch.addEventListener("input", () => {
  renderList();
});

if (filterStage) {
  filterStage.addEventListener("change", () => {
    renderList();
  });
}

if (filterSales) {
  filterSales.addEventListener("change", () => {
    renderList();
  });
}

if (filterTown) {
  filterTown.addEventListener("change", () => {
    renderList();
  });
}

clearFilters.addEventListener("click", () => {
  clientSearch.value = "";
  if (filterStage) filterStage.value = "all";
  if (filterSales) filterSales.value = "all";
  if (filterTown) filterTown.value = "all";
  renderList();
});

window.addEventListener("storage", (event) => {
  if (event.key !== STORAGE_KEY) return;
  state = loadState();
  renderFilters();
  renderList();
});

renderFilters();
renderList();

function renderFilters() {
  const stageValue = filterStage ? filterStage.value || "all" : "all";
  const salesValue = filterSales ? filterSales.value || "all" : "all";
  const townValue = filterTown ? filterTown.value || "all" : "all";

  if (filterStage) {
    filterStage.innerHTML = "";
    const stageAll = document.createElement("option");
    stageAll.value = "all";
    stageAll.textContent = "Todas las etapas";
    filterStage.appendChild(stageAll);
    STAGES.forEach((stage) => {
      const option = document.createElement("option");
      option.value = stage.id;
      option.textContent = stage.label;
      filterStage.appendChild(option);
    });
    filterStage.value = STAGES.some((stage) => stage.id === stageValue) ? stageValue : "all";
  }

  if (filterSales) {
    filterSales.innerHTML = "";
    const salesAll = document.createElement("option");
    salesAll.value = "all";
    salesAll.textContent = "Todos los comerciales";
    filterSales.appendChild(salesAll);
    state.salespeople.forEach((salesperson) => {
      const option = document.createElement("option");
      option.value = salesperson.id;
      option.textContent = salesperson.nombre;
      filterSales.appendChild(option);
    });
    filterSales.value = state.salespeople.some((item) => item.id === salesValue) ? salesValue : "all";
  }

  const towns = Array.from(
    new Set(
      state.opportunities
        .map((opp) => (opp.poblacion || "").trim())
        .filter((value) => value.length > 0)
    )
  ).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
  if (filterTown) {
    filterTown.innerHTML = "";
    const townAll = document.createElement("option");
    townAll.value = "all";
    townAll.textContent = "Todas las poblaciones";
    filterTown.appendChild(townAll);
    towns.forEach((town) => {
      const option = document.createElement("option");
      option.value = town;
      option.textContent = town;
      filterTown.appendChild(option);
    });
    filterTown.value = towns.includes(townValue) ? townValue : "all";
  }
}

function ensureFilters() {
  const container = document.querySelector(".panel .form-grid");
  if (!container) return;

  const clearButton = container.querySelector("#clearFilters");
  if (!filterStage) {
    filterStage = createFilter(container, clearButton, "filterStage", "Etapa");
  }
  if (!filterSales) {
    filterSales = createFilter(container, clearButton, "filterSales", "Comercial");
  }
  if (!filterTown) {
    filterTown = createFilter(container, clearButton, "filterTown", "Población");
  }
}

function createFilter(container, beforeNode, id, labelText) {
  const label = document.createElement("label");
  label.textContent = labelText;
  const select = document.createElement("select");
  select.id = id;
  label.appendChild(select);
  if (beforeNode) {
    container.insertBefore(label, beforeNode);
  } else {
    container.appendChild(label);
  }
  return select;
}

function renderList() {
  const query = clientSearch.value.trim().toLowerCase();
  const stageFilter = filterStage ? filterStage.value : "all";
  const salesFilter = filterSales ? filterSales.value : "all";
  const townFilter = filterTown ? filterTown.value : "all";
  let items = state.opportunities.filter((opp) => matchesQuery(opp, query));

  if (stageFilter && stageFilter !== "all") {
    items = items.filter((opp) => opp.etapa === stageFilter);
  }

  if (salesFilter && salesFilter !== "all") {
    items = items.filter((opp) => opp.comercialId === salesFilter);
  }

  if (townFilter && townFilter !== "all") {
    items = items.filter(
      (opp) => (opp.poblacion || "").trim().toLowerCase() === townFilter.toLowerCase()
    );
  }

  items = items
    .slice()
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));

  clientList.innerHTML = "";
  clientCount.textContent = `${items.length} empresas encontradas`;
  renderStats(items);

  if (items.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No hay prospectos que coincidan con la búsqueda.";
    clientList.appendChild(empty);
    return;
  }

  items.forEach((opp) => {
    const stageLabel = getStageLabel(opp.etapa);
    const lastAction = getLastActionDate(opp.acciones);
    const lastUpdate = formatDate(opp.updatedAt || opp.createdAt);
    const row = document.createElement("div");
    row.className = "client-row";
    row.innerHTML = `
      <div class="client-main">
        <div class="client-title">
          <span class="client-name">${opp.empresa}</span>
          <span class="stage-pill" data-stage="${opp.etapa || "prospecto"}">${stageLabel}</span>
        </div>
        <div class="client-meta">
          <span>${opp.contacto || "Sin contacto"}</span>
          <span>${opp.email || "Sin email"}</span>
          <span>${opp.telefono || "Sin teléfono"}</span>
        </div>
        <div class="client-meta">
          <span>Comercial: ${getSalespersonName(opp.comercialId)}</span>
          <span>Última acción: ${lastAction}</span>
          <span>Actualizado: ${lastUpdate}</span>
        </div>
      </div>
      <div class="client-actions">
        <a class="btn ghost" href="cliente.html?id=${encodeURIComponent(opp.id)}">Abrir ficha</a>
      </div>
    `;
    clientList.appendChild(row);
  });
}

function matchesQuery(opp, query) {
  if (!query) return true;
  const salespersonName = getSalespersonName(opp.comercialId).toLowerCase();
  const haystack = [
    opp.codigoCliente,
    opp.empresa,
    opp.contacto,
    opp.email,
    opp.telefono,
    salespersonName,
    getStageLabel(opp.etapa)
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

function getStageLabel(stageId) {
  return STAGES.find((stage) => stage.id === stageId)?.label || "Prospecto";
}

function getSalespersonName(salespersonId) {
  if (!salespersonId) return "Sin asignar";
  const salesperson = state.salespeople.find((item) => item.id === salespersonId);
  return salesperson ? salesperson.nombre : "Sin asignar";
}

function loadState() {
  const raw = readStorage();
  if (!raw) return safeClone(DEFAULT_STATE);
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return safeClone(DEFAULT_STATE);
    }
    return normalizeState(parsed);
  } catch (error) {
    return safeClone(DEFAULT_STATE);
  }
}

function safeClone(value) {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function readStorage() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value) return value;
  } catch (error) {
    // ignore and try sessionStorage
  }
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch (fallbackError) {
    return null;
  }
}

function normalizeState(input) {
  const opportunities = Array.isArray(input.opportunities)
    ? input.opportunities.map((opp) => ({
        ...opp,
        comercialId: opp.comercialId || "",
        etapa: normalizeStage(opp.etapa),
        acciones: Array.isArray(opp.acciones) ? opp.acciones : [],
        codigoCliente: sanitizeClientCode(opp.codigoCliente || ""),
        cif: opp.cif || "",
        nombreFiscal: opp.nombreFiscal || "",
        direccionFiscal: opp.direccionFiscal || "",
        direccionEntrega: opp.direccionEntrega || "",
        poblacion: opp.poblacion || "",
        provincia: opp.provincia || ""
      }))
    : [];
  const activities = Array.isArray(input.activities) ? input.activities : [];
  const salespeople = Array.isArray(input.salespeople) ? input.salespeople : [];
  return { opportunities, activities, salespeople };
}

function normalizeStage(stage) {
  if (!stage) return "prospecto";
  const map = {
    calificacion: "primeros-contactos",
    propuesta: "envio-muestras",
    negociacion: "pedido",
    cierre: "cliente"
  };
  return map[stage] || stage;
}

function renderStats(items) {
  if (!clientStats) return;
  clientStats.innerHTML = "";
  const total = items.length;
  if (total === 0) {
    const empty = document.createElement("span");
    empty.className = "client-stat-pill";
    empty.textContent = "Sin resultados";
    clientStats.appendChild(empty);
    return;
  }

  STAGES.forEach((stage) => {
    const count = items.filter((opp) => opp.etapa === stage.id).length;
    const percent = total > 0 ? Math.round((count / total) * 100) : 0;
    const pill = document.createElement("span");
    pill.className = "client-stat-pill";
    pill.dataset.stage = stage.id;
    pill.textContent = `${stage.label}: ${count} · ${percent}%`;
    clientStats.appendChild(pill);
  });
}

function getLastActionDate(actions) {
  if (!Array.isArray(actions) || actions.length === 0) return "Sin acciones";
  const sorted = actions
    .filter((action) => action.fecha)
    .slice()
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  if (sorted.length === 0) return "Sin acciones";
  return formatDate(sorted[0].fecha);
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function sanitizeClientCode(value) {
  return String(value || "")
    .replace(/\D/g, "")
    .slice(0, 5);
}
