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
const clientList = document.getElementById("clientList");
const clientCount = document.getElementById("clientCount");

let state = loadState();

window.addEventListener("load", () => {
  document.body.classList.add("loaded");
});

renderList();

backToPanel.addEventListener("click", () => {
  window.open("index.html", "_self");
});

clientSearch.addEventListener("input", () => {
  renderList();
});

window.addEventListener("storage", (event) => {
  if (event.key !== STORAGE_KEY) return;
  state = loadState();
  renderList();
});

function renderList() {
  const query = clientSearch.value.trim().toLowerCase();
  const items = state.opportunities.filter((opp) => matchesQuery(opp, query));
  clientList.innerHTML = "";
  clientCount.textContent = `${items.length} prospectos encontrados`;

  if (items.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No hay prospectos que coincidan con la búsqueda.";
    clientList.appendChild(empty);
    return;
  }

  items.forEach((opp) => {
    const stageLabel = getStageLabel(opp.etapa);
    const card = document.createElement("div");
    card.className = "client-card";
    card.innerHTML = `
      <div>
        <div class="opp-title">${opp.empresa}</div>
        <div class="sales-meta">${opp.contacto} · ${opp.email || "Sin email"}</div>
        <div class="sales-meta">${opp.telefono || "Sin teléfono"} · ${stageLabel}</div>
        <div class="sales-meta">Comercial: ${getSalespersonName(opp.comercialId)}</div>
      </div>
      <div class="sales-actions">
        <a class="btn ghost" href="cliente.html?id=${encodeURIComponent(opp.id)}" target="_blank" rel="noopener">Abrir ficha</a>
      </div>
    `;
    clientList.appendChild(card);
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
