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
const filterStage = document.getElementById("filterStage");
const filterSales = document.getElementById("filterSales");
const sortBy = document.getElementById("sortBy");
const clearFilters = document.getElementById("clearFilters");
const clientList = document.getElementById("clientList");
const clientCount = document.getElementById("clientCount");
const clientStats = document.getElementById("clientStats");

let state = loadState();

window.addEventListener("load", () => {
  document.body.classList.add("loaded");
});

renderFilters();
renderList();

backToPanel.addEventListener("click", () => {
  window.open("index.html", "_self");
});

clientSearch.addEventListener("input", () => {
  renderList();
});

filterStage.addEventListener("change", () => {
  renderList();
});

filterSales.addEventListener("change", () => {
  renderList();
});

sortBy.addEventListener("change", () => {
  renderList();
});

clearFilters.addEventListener("click", () => {
  clientSearch.value = "";
  filterStage.value = "all";
  filterSales.value = "all";
  sortBy.value = "updated";
  renderList();
});

window.addEventListener("storage", (event) => {
  if (event.key !== STORAGE_KEY) return;
  state = loadState();
  renderFilters();
  renderList();
});

function renderFilters() {
  const stageValue = filterStage.value || "all";
  const salesValue = filterSales.value || "all";

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

function renderList() {
  const query = clientSearch.value.trim().toLowerCase();
  const stageFilter = filterStage.value;
  const salesFilter = filterSales.value;
  const order = sortBy.value;
  let items = state.opportunities.filter((opp) => matchesQuery(opp, query));

  if (stageFilter && stageFilter !== "all") {
    items = items.filter((opp) => opp.etapa === stageFilter);
  }

  if (salesFilter && salesFilter !== "all") {
    items = items.filter((opp) => opp.comercialId === salesFilter);
  }

  items = items.slice().sort((a, b) => {
    if (order === "name") {
      return (a.empresa || "").localeCompare(b.empresa || "", "es", { sensitivity: "base" });
    }
    const dateA = new Date(order === "created" ? a.createdAt : a.updatedAt || a.createdAt || 0);
    const dateB = new Date(order === "created" ? b.createdAt : b.updatedAt || b.createdAt || 0);
    return dateB - dateA;
  });

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
        <a class="btn ghost" href="cliente.html?id=${encodeURIComponent(opp.id)}" target="_blank" rel="noopener">Abrir ficha</a>
      </div>
    `;
    clientList.appendChild(row);
  });
}

function matchesQuery(opp, query) {
  if (!query) return true;
  const salespersonName = getSalespersonName(opp.comercialId).toLowerCase();
  const haystack = [
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
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return structuredClone(DEFAULT_STATE);
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return structuredClone(DEFAULT_STATE);
    }
    return normalizeState(parsed);
  } catch (error) {
    return structuredClone(DEFAULT_STATE);
  }
}

function normalizeState(input) {
  const opportunities = Array.isArray(input.opportunities)
    ? input.opportunities.map((opp) => ({
        ...opp,
        comercialId: opp.comercialId || "",
        etapa: normalizeStage(opp.etapa),
        acciones: Array.isArray(opp.acciones) ? opp.acciones : []
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
