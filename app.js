const STORAGE_KEY = "crmcomexsa:v1";
const FALLBACK_KEY = "crmcomexsa:pending";
const CACHE_BUSTER = "20260211";
const STAGES = [
  { id: "prospecto", label: "Prospecto" },
  { id: "primeros-contactos", label: "Acción Comercial" },
  { id: "envio-muestras", label: "Envío de Muestras" },
  { id: "pedido", label: "Pedido" },
  { id: "cliente", label: "Cliente" }
];

const DEFAULT_STATE = {
  salespeople: [
    {
      id: "sales-001",
      nombre: "Ana Pérez",
      telefono: "+34 611 222 333",
      email: "ana.perez@comexsa.es",
      notas: "Especialista en logística y aduanas.",
      createdAt: "2026-02-05T16:00:00.000Z",
      updatedAt: "2026-02-09T18:20:00.000Z"
    },
    {
      id: "sales-002",
      nombre: "Jorge Méndez",
      telefono: "+34 622 444 555",
      email: "jorge.mendez@comexsa.es",
      notas: "Enfocado en clientes industriales.",
      createdAt: "2026-02-06T10:30:00.000Z",
      updatedAt: "2026-02-10T08:45:00.000Z"
    }
  ],
  opportunities: [
    {
      id: "opp-001",
      comercialId: "sales-001",
      empresa: "Comexsa Logística",
      contacto: "Laura Gómez",
      email: "laura@comexsa.es",
      telefono: "+34 610 111 222",
      monto: 85000,
      etapa: "prospecto",
      prioridad: "alta",
      proximaAccion: "Presentar propuesta inicial",
      fechaCierre: "2026-03-05",
      notas: "Interesados en solución integral de comercio exterior.",
      acciones: [
        {
          id: "acc-001",
          tipo: "llamada",
          fecha: "2026-02-10",
          responsable: "Ana Pérez",
          notas: "Primera llamada de contacto.",
          done: true
        }
      ],
      createdAt: "2026-02-10T16:00:00.000Z",
      updatedAt: "2026-02-10T16:00:00.000Z"
    },
    {
      id: "opp-002",
      comercialId: "sales-002",
      empresa: "Delta Aduanas Iberia",
      contacto: "Marco Ruiz",
      email: "mruiz@deltaaduanas.es",
      telefono: "+34 633 555 666",
      monto: 42000,
      etapa: "primeros-contactos",
      prioridad: "media",
      proximaAccion: "Revisar términos de servicio",
      fechaCierre: "2026-02-28",
      notas: "Requieren ajuste en tarifas por volumen.",
      acciones: [
        {
          id: "acc-002",
          tipo: "mail",
          fecha: "2026-02-11",
          responsable: "Jorge Méndez",
          notas: "Envío de información preliminar.",
          done: false
        }
      ],
      createdAt: "2026-02-09T20:00:00.000Z",
      updatedAt: "2026-02-10T12:30:00.000Z"
    },
    {
      id: "opp-003",
      comercialId: "sales-001",
      empresa: "Iberia Trading",
      contacto: "Elena Suárez",
      email: "elena@iberiatrading.es",
      telefono: "+34 644 777 888",
      monto: 120000,
      etapa: "envio-muestras",
      prioridad: "alta",
      proximaAccion: "Cierre con dirección",
      fechaCierre: "2026-03-12",
      notas: "Negociación avanzada, falta aprobación final.",
      acciones: [
        {
          id: "acc-003",
          tipo: "visita",
          fecha: "2026-02-13",
          responsable: "Ana Pérez",
          notas: "Revisión técnica de muestras.",
          done: false
        }
      ],
      createdAt: "2026-02-08T14:00:00.000Z",
      updatedAt: "2026-02-10T09:15:00.000Z"
    }
  ],
  activities: [
    {
      id: "act-001",
      tipo: "llamada",
      asunto: "Seguimiento propuesta Comexsa",
      fecha: "2026-02-10",
      responsable: "Ana Pérez",
      notas: "Confirmar tiempos de implementación.",
      done: false
    },
    {
      id: "act-002",
      tipo: "reunion",
      asunto: "Revisión contrato Delta",
      fecha: "2026-02-12",
      responsable: "Jorge Méndez",
      notas: "Alinear con equipo legal.",
      done: false
    }
  ]
};

const openBackOffice = document.getElementById("openBackOffice");
const openClients = document.getElementById("openClients");
const opportunityForm = document.getElementById("opportunityForm");
const opportunitySubmit = opportunityForm.querySelector("button[type=\"submit\"]");
const pipelineColumns = document.getElementById("pipelineColumns");
const saveNowButton = document.getElementById("saveNow");
const saveStatus = document.getElementById("saveStatus");
const saveTime = document.getElementById("saveTime");
const metricTotalImpacto = document.getElementById("metricTotalImpacto");
const stageMetricElements = {
  prospecto: {
    value: document.getElementById("metric-prospecto"),
    percent: document.getElementById("metric-percent-prospecto")
  },
  "primeros-contactos": {
    value: document.getElementById("metric-primeros-contactos"),
    percent: document.getElementById("metric-percent-primeros-contactos")
  },
  "envio-muestras": {
    value: document.getElementById("metric-envio-muestras"),
    percent: document.getElementById("metric-percent-envio-muestras")
  },
  pedido: {
    value: document.getElementById("metric-pedido"),
    percent: document.getElementById("metric-percent-pedido")
  },
  cliente: {
    value: document.getElementById("metric-cliente"),
    percent: document.getElementById("metric-percent-cliente")
  }
};

let state = loadState();
let saveTimeoutId;

window.addEventListener("load", () => {
  document.body.classList.add("loaded");
});

render();
openBackOffice.addEventListener("click", () => {
  window.open(`backoffice.html?v=${CACHE_BUSTER}`, "_blank", "noopener");
});
openClients.addEventListener("click", () => {
  window.location.href = `clientes.html?v=${CACHE_BUSTER}`;
});

window.addEventListener("storage", (event) => {
  if (event.key !== STORAGE_KEY) return;
  state = loadState();
  render();
});

opportunityForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(opportunityForm);
  const comercialId = formData.get("comercialId");
  if (!comercialId) return;
  const newOpportunity = {
    id: createId("opp"),
    comercialId,
    empresa: formData.get("empresa").trim(),
    nombreFiscal: "",
    cif: "",
    contacto: formData.get("contacto").trim(),
    email: formData.get("email").trim(),
    telefono: formData.get("telefono").trim(),
    direccionFiscal: "",
    direccionEntrega: "",
    poblacion: "",
    provincia: "",
    monto: 0,
    etapa: "prospecto",
    prioridad: "media",
    proximaAccion: "",
    fechaCierre: "",
    notas: formData.get("notas").trim(),
    acciones: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  state.opportunities.unshift(newOpportunity);
  opportunityForm.reset();
  saveState("Nuevo prospecto guardado");
  rememberPendingOpportunity(newOpportunity);
  render();
  window.location.href = `cliente.html?id=${encodeURIComponent(newOpportunity.id)}`;
});


pipelineColumns.addEventListener("click", (event) => {
  const row = event.target.closest(".pipeline-row");
  if (!row) return;
  const opportunityId = row.dataset.id;
  const opportunity = state.opportunities.find((opp) => opp.id === opportunityId);
  if (!opportunity) return;
  window.location.href = `cliente.html?id=${encodeURIComponent(opportunityId)}`;
});


saveNowButton.addEventListener("click", () => {
  saveState("Guardado manual");
});

function render() {
  renderSalespeople();
  renderMetrics();
  renderPipeline();
}

function renderSalespeople() {
  renderSalesSelects();
}

function renderSalesSelects() {
  const selects = [opportunityForm.comercialId].filter(Boolean);
  const hasSalespeople = state.salespeople.length > 0;

  selects.forEach((select) => {
    const currentValue = select.value;
    select.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = hasSalespeople
      ? "Selecciona comercial"
      : "Crea un comercial en back office";
    placeholder.disabled = true;
    select.appendChild(placeholder);

    state.salespeople.forEach((salesperson) => {
      const option = document.createElement("option");
      option.value = salesperson.id;
      option.textContent = salesperson.nombre;
      select.appendChild(option);
    });

    select.disabled = !hasSalespeople;
    if (hasSalespeople && state.salespeople.some((item) => item.id === currentValue)) {
      select.value = currentValue;
    } else {
      select.value = "";
    }
  });

  opportunitySubmit.disabled = !hasSalespeople;
}

function renderMetrics() {
  const total = state.opportunities.length;
  metricTotalImpacto.textContent = `${total}`;

  STAGES.forEach((stage) => {
    const count = state.opportunities.filter((opp) => opp.etapa === stage.id).length;
    const percent = total > 0 ? Math.round((count / total) * 100) : 0;
    const element = stageMetricElements[stage.id];
    if (element?.value) {
      element.value.textContent = `${count}`;
    }
    if (element?.percent) {
      element.percent.textContent = `${percent}%`;
    }
  });
}

function renderPipeline() {
  pipelineColumns.innerHTML = "";

  STAGES.forEach((stage) => {
    const opportunities = state.opportunities
      .filter((opp) => opp.etapa === stage.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const column = document.createElement("div");
    column.className = "pipeline-column";
    column.innerHTML = `
      <div class="pipeline-header">
        <h3>${stage.label}</h3>
        <span class="stage-count">${opportunities.length}</span>
      </div>
    `;

    const list = document.createElement("div");
    list.className = "pipeline-list";

    opportunities.forEach((opp) => {
      const row = document.createElement("div");
      row.className = "pipeline-row";
      row.dataset.id = opp.id;
      row.innerHTML = `
        <div class="row-name">${opp.empresa}</div>
      `;
      list.appendChild(row);
    });

    if (opportunities.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "Sin clientes aún";
      list.appendChild(empty);
    }

    column.appendChild(list);
    pipelineColumns.appendChild(column);
  });
}

function getSalespersonName(salespersonId) {
  if (!salespersonId) return "Sin asignar";
  const salesperson = state.salespeople.find((item) => item.id === salespersonId);
  return salesperson ? salesperson.nombre : "Sin asignar";
}

function moveOpportunity(opportunity, direction) {
  const currentIndex = STAGES.findIndex((stage) => stage.id === opportunity.etapa);
  if (currentIndex === -1) return;
  const nextIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;
  if (nextIndex < 0 || nextIndex >= STAGES.length) return;
  opportunity.etapa = STAGES[nextIndex].id;
  opportunity.updatedAt = new Date().toISOString();
  scheduleSave("Etapa actualizada");
  render();
}

function scheduleSave(message) {
  saveStatus.textContent = message || "Guardando...";
  saveTime.textContent = "Cambios pendientes";
  clearTimeout(saveTimeoutId);
  saveTimeoutId = setTimeout(() => saveState(message), 600);
}

function saveState(message) {
  writeStorage(JSON.stringify(state));
  const now = new Date();
  saveStatus.textContent = message || "Guardado";
  saveTime.textContent = `Último guardado ${now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`;
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

function writeStorage(payload) {
  try {
    localStorage.setItem(STORAGE_KEY, payload);
    return true;
  } catch (error) {
    try {
      sessionStorage.setItem(STORAGE_KEY, payload);
      return true;
    } catch (fallbackError) {
      return false;
    }
  }
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

function rememberPendingOpportunity(opportunity) {
  try {
    sessionStorage.setItem(FALLBACK_KEY, JSON.stringify(opportunity));
  } catch (error) {
    // ignore
  }
}

function normalizeState(input) {
  const opportunities = Array.isArray(input.opportunities)
    ? input.opportunities.map((opp) => ({
        ...opp,
        comercialId: opp.comercialId || "",
        etapa: normalizeStage(opp.etapa),
        acciones: Array.isArray(opp.acciones) ? opp.acciones : [],
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

function createId(prefix) {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function capitalize(value) {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function safeClone(value) {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}
