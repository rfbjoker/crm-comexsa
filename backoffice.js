const STORAGE_KEY = "crmcomexsa:v1";
// Cambia esta clave para el acceso al back office.
const BACKOFFICE_PASSWORD = "comexsa2026";
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

const backOfficeForm = document.getElementById("backOfficeForm");
const backOfficeStatus = document.getElementById("backOfficeStatus");
const backOfficeUnlock = document.getElementById("backOfficeUnlock");
const backOfficeLock = document.getElementById("backOfficeLock");
const backOfficeContent = document.getElementById("backOfficeContent");
const backToFront = document.getElementById("backToFront");

const salesForm = document.getElementById("salesForm");
const salesList = document.getElementById("salesList");
const salesSubmit = document.getElementById("salesSubmit");
const salesCancel = document.getElementById("salesCancel");
const clientSearchBack = document.getElementById("clientSearchBack");
const backClientList = document.getElementById("backClientList");

const exportButton = document.getElementById("exportData");
const importFile = document.getElementById("importFile");
const resetDemoButton = document.getElementById("resetDemo");

let state = loadState();
let editingSalespersonId = null;
let backOfficeUnlocked = false;

window.addEventListener("load", () => {
  document.body.classList.add("loaded");
});

updateBackOfficeUI();
renderSalesList();
renderClientList();

backToFront.addEventListener("click", () => {
  window.open("index.html", "_self");
});

backOfficeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(backOfficeForm);
  const password = formData.get("password");
  if (password === BACKOFFICE_PASSWORD) {
    setBackOfficeUnlocked(true);
    backOfficeForm.reset();
    return;
  }
  backOfficeStatus.textContent = "Contraseña incorrecta";
});

backOfficeLock.addEventListener("click", () => {
  setBackOfficeUnlocked(false);
});

salesForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!ensureUnlocked()) return;
  const formData = new FormData(salesForm);
  const payload = {
    nombre: formData.get("nombre").trim(),
    telefono: formData.get("telefono").trim(),
    email: formData.get("email").trim(),
    notas: formData.get("notas").trim()
  };

  if (!payload.nombre) return;

  if (editingSalespersonId) {
    const current = state.salespeople.find((item) => item.id === editingSalespersonId);
    if (current) {
      Object.assign(current, payload, { updatedAt: new Date().toISOString() });
      saveState();
    }
  } else {
    state.salespeople.unshift({
      id: createId("sales"),
      ...payload,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    saveState();
  }

  resetSalesForm();
  renderSalesList();
});

salesCancel.addEventListener("click", () => {
  resetSalesForm();
  renderSalesList();
});

clientSearchBack.addEventListener("input", () => {
  renderClientList();
});

salesList.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  if (!ensureUnlocked()) return;
  const salespersonId = button.dataset.id;
  const action = button.dataset.action;
  const salesperson = state.salespeople.find((item) => item.id === salespersonId);
  if (!salesperson) return;

  if (action === "edit") {
    editingSalespersonId = salespersonId;
    setSalesFormValues(salesperson);
    renderSalesList();
    return;
  }

  if (action === "delete") {
    const ok = confirm(
      `¿Eliminar al comercial ${salesperson.nombre}? Los prospectos asignados quedarán sin comercial.`
    );
    if (!ok) return;
    state.salespeople = state.salespeople.filter((item) => item.id !== salespersonId);
    state.opportunities.forEach((opp) => {
      if (opp.comercialId === salespersonId) {
        opp.comercialId = "";
      }
    });
    if (editingSalespersonId === salespersonId) {
      resetSalesForm();
    }
    saveState();
    renderSalesList();
    renderClientList();
  }
});

backClientList.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  if (!ensureUnlocked()) return;
  const action = button.dataset.action;
  const clientId = button.dataset.id;
  if (action !== "delete-client") return;
  const client = state.opportunities.find((opp) => opp.id === clientId);
  if (!client) return;
  const ok = confirm(`¿Eliminar la empresa ${client.empresa}?`);
  if (!ok) return;
  state.opportunities = state.opportunities.filter((opp) => opp.id !== clientId);
  saveState();
  renderClientList();
});

exportButton.addEventListener("click", () => {
  if (!ensureUnlocked()) return;
  const payload = JSON.stringify(state, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `crm-comexsa-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
});

importFile.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!ensureUnlocked()) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = safeParseJson(reader.result);
      const payload = parsed?.state ?? parsed?.data ?? parsed;
      if (!payload || typeof payload !== "object") {
        throw new Error("Formato inválido");
      }
      state = normalizeState(payload);
      resetSalesForm();
      saveState();
      renderSalesList();
      renderClientList();
      backOfficeStatus.textContent = "Datos importados correctamente";
    } catch (error) {
      alert("No se pudo importar el archivo. Verifica el formato.");
    }
  };
  reader.readAsText(file);
});

resetDemoButton.addEventListener("click", () => {
  if (!ensureUnlocked()) return;
  const ok = confirm("¿Restablecer datos demo? Se perderán los cambios actuales.");
  if (!ok) return;
  state = structuredClone(DEFAULT_STATE);
  resetSalesForm();
  saveState();
  renderSalesList();
  renderClientList();
});

window.addEventListener("storage", (event) => {
  if (event.key !== STORAGE_KEY) return;
  state = loadState();
  renderSalesList();
  renderClientList();
});

function updateBackOfficeUI() {
  if (backOfficeUnlocked) {
    backOfficeContent.hidden = false;
    backOfficeStatus.textContent = "Back office desbloqueado";
    backOfficeUnlock.hidden = true;
    backOfficeLock.hidden = false;
    return;
  }
  backOfficeContent.hidden = true;
  backOfficeStatus.textContent = "Back office bloqueado";
  backOfficeUnlock.hidden = false;
  backOfficeLock.hidden = true;
  resetSalesForm();
  if (clientSearchBack) {
    clientSearchBack.value = "";
  }
}

function ensureUnlocked() {
  if (backOfficeUnlocked) return true;
  backOfficeStatus.textContent = "Introduce la contraseña para continuar";
  return false;
}

function setBackOfficeUnlocked(value) {
  backOfficeUnlocked = value;
  updateBackOfficeUI();
  renderSalesList();
  renderClientList();
}

function renderSalesList() {
  salesList.innerHTML = "";
  if (!backOfficeUnlocked) return;
  if (state.salespeople.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Aún no hay comerciales registrados.";
    salesList.appendChild(empty);
    return;
  }

  state.salespeople.forEach((salesperson) => {
    const assignedCount = state.opportunities.filter(
      (opp) => opp.comercialId === salesperson.id
    ).length;
    const card = document.createElement("div");
    card.className = "sales-card";
    if (editingSalespersonId === salesperson.id) {
      card.classList.add("active");
    }
    card.innerHTML = `
      <div>
        <div class="opp-title">${salesperson.nombre}</div>
        <div class="sales-meta">${salesperson.telefono || "Sin teléfono"} · ${
      salesperson.email || "Sin email"
    }</div>
        <div class="sales-meta">${assignedCount} prospectos asignados</div>
        <div class="sales-meta">${salesperson.notas || "Sin notas"}</div>
      </div>
      <div class="sales-actions">
        <button type="button" data-action="edit" data-id="${salesperson.id}">Editar</button>
        <button type="button" data-action="delete" data-id="${salesperson.id}">Eliminar</button>
      </div>
    `;
    salesList.appendChild(card);
  });
}

function renderClientList() {
  backClientList.innerHTML = "";
  if (!backOfficeUnlocked) return;
  const query = clientSearchBack.value.trim().toLowerCase();
  const items = state.opportunities
    .filter((opp) => matchesClientQuery(opp, query))
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

  if (items.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Aún no hay clientes registrados.";
    backClientList.appendChild(empty);
    return;
  }

  items.forEach((opp) => {
    const stageLabel = getStageLabel(opp.etapa);
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
        </div>
      </div>
      <div class="client-actions">
        <button class="product-action" type="button" data-action="delete-client" data-id="${
          opp.id
        }">Eliminar</button>
      </div>
    `;
    backClientList.appendChild(row);
  });
}

function resetSalesForm() {
  editingSalespersonId = null;
  salesForm.reset();
  salesSubmit.textContent = "Agregar comercial";
  salesCancel.hidden = true;
}

function setSalesFormValues(salesperson) {
  salesForm.nombre.value = salesperson.nombre || "";
  salesForm.telefono.value = salesperson.telefono || "";
  salesForm.email.value = salesperson.email || "";
  salesForm.notas.value = salesperson.notas || "";
  salesSubmit.textContent = "Guardar cambios";
  salesCancel.hidden = false;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
        acciones: Array.isArray(opp.acciones)
          ? opp.acciones.map((action) => ({
              ...action,
              tipo: normalizeActionType(action.tipo)
            }))
          : [],
        productos: Array.isArray(opp.productos) ? opp.productos : [],
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

function normalizeActionType(type) {
  if (!type) return "llamada";
  const map = {
    email: "mail",
    reunion: "visita",
    seguimiento: "whatsapp"
  };
  return map[type] || type;
}

function matchesClientQuery(opp, query) {
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

function safeParseJson(raw) {
  const text = String(raw || "").replace(/^\uFEFF/, "");
  return JSON.parse(text);
}

function createId(prefix) {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
