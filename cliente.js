const STORAGE_KEY = "crmcomexsa:v1";
const FALLBACK_KEY = "crmcomexsa:pending";
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

const clientTitle = document.getElementById("clientTitle");
const clientSubtitle = document.getElementById("clientSubtitle");
const clientLayout = document.getElementById("clientLayout");
const clientPanel = document.getElementById("clientPanel");
const actionPanel = document.getElementById("actionPanel");
const notFound = document.getElementById("notFound");
const detailLastAction = document.getElementById("detailLastAction");
const detailActionCount = document.getElementById("detailActionCount");
const detailUpdated = document.getElementById("detailUpdated");

const backToClients = document.getElementById("backToClients");
const backToClientsAlt = document.getElementById("backToClientsAlt");
const backToPanel = document.getElementById("backToPanel");

const clientForm = document.getElementById("clientForm");
const saveClient = document.getElementById("saveClient");
const deleteClient = document.getElementById("deleteClient");
const clientSaveStatus = document.getElementById("clientSaveStatus");
const clientSaveTime = document.getElementById("clientSaveTime");

const actionForm = document.getElementById("actionForm");
const actionSubmit = document.getElementById("actionSubmit");
const actionCancel = document.getElementById("actionCancel");
const actionList = document.getElementById("actionList");
const actionEmpty = document.getElementById("actionEmpty");
const productPanel = document.getElementById("productPanel");
const productFile = document.getElementById("productFile");
const productEmpty = document.getElementById("productEmpty");
const productTable = document.getElementById("productTable");
const productTableBody = document.getElementById("productTableBody");
const productForm = document.getElementById("productForm");

const params = new URLSearchParams(window.location.search);
const opportunityId = params.get("id");

let state = loadState();
let current = findOpportunity() || recoverPendingOpportunity();
let saveTimeoutId;
let editingActionId = null;
let editingProductId = null;

window.addEventListener("load", () => {
  document.body.classList.add("loaded");
});

render();

backToClients.addEventListener("click", () => {
  window.open("clientes.html", "_self");
});

backToClientsAlt.addEventListener("click", () => {
  window.open("clientes.html", "_self");
});

backToPanel.addEventListener("click", () => {
  window.open("index.html", "_self");
});

clientForm.addEventListener("input", () => {
  if (!current) return;
  const formData = new FormData(clientForm);
  Object.assign(current, {
    comercialId: formData.get("comercialId"),
    empresa: formData.get("empresa").trim(),
    contacto: formData.get("contacto").trim(),
    email: formData.get("email").trim(),
    telefono: formData.get("telefono").trim(),
    poblacion: formData.get("poblacion").trim(),
    provincia: formData.get("provincia").trim(),
    etapa: formData.get("etapa"),
    notas: formData.get("notas").trim(),
    updatedAt: new Date().toISOString()
  });
  scheduleSave("Cambios en ficha");
  updateHeader();
  renderDetailsSummary();
});

clientForm.addEventListener("submit", (event) => {
  event.preventDefault();
  saveState("Cambios guardados");
});

deleteClient.addEventListener("click", () => {
  if (!current) return;
  const ok = confirm(`¿Eliminar el prospecto ${current.empresa}?`);
  if (!ok) return;
  state.opportunities = state.opportunities.filter((opp) => opp.id !== current.id);
  saveState("Prospecto eliminado");
  window.open("clientes.html", "_self");
});

actionForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!current) return;
  const formData = new FormData(actionForm);
  const payload = {
    tipo: formData.get("tipo"),
    fecha: formData.get("fecha"),
    responsable: formData.get("responsable"),
    notas: formData.get("notas").trim(),
    done: false
  };

  if (!payload.responsable) {
    return;
  }

  current.acciones = Array.isArray(current.acciones) ? current.acciones : [];

  if (editingActionId) {
    const existing = current.acciones.find((action) => action.id === editingActionId);
    if (existing) {
      Object.assign(existing, payload, { done: existing.done });
      scheduleSave("Acción actualizada");
    }
  } else {
    current.acciones.unshift({ id: createId("acc"), ...payload });
    scheduleSave("Acción agregada");
  }

  current.updatedAt = new Date().toISOString();
  resetActionForm();
  renderActions();
  renderDetailsSummary();
});

actionList.addEventListener("click", (event) => {
  const actionButton = event.target.closest("button");
  if (!actionButton || !current) return;
  const actionId = actionButton.dataset.id;
  if (actionButton.dataset.action === "edit") {
    const action = (current.acciones || []).find((item) => item.id === actionId);
    if (!action) return;
    setActionForm(action);
    return;
  }
  if (actionButton.dataset.action === "delete") {
    current.acciones = (current.acciones || []).filter((action) => action.id !== actionId);
    current.updatedAt = new Date().toISOString();
    scheduleSave("Acción eliminada");
    renderActions();
    renderDetailsSummary();
  }
});

actionList.addEventListener("change", (event) => {
  if (event.target.type !== "checkbox" || !current) return;
  const actionId = event.target.dataset.id;
  const action = (current.acciones || []).find((item) => item.id === actionId);
  if (!action) return;
  action.done = event.target.checked;
  current.updatedAt = new Date().toISOString();
  scheduleSave("Acción actualizada");
  renderDetailsSummary();
});

actionCancel.addEventListener("click", () => {
  resetActionForm();
});

productFile.addEventListener("change", (event) => {
  if (!current) return;
  const file = event.target.files?.[0];
  if (!file) return;
  if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
    if (!window.XLSX) {
      alert(
        "No se pudo cargar el lector de Excel local. Añade el archivo vendor/xlsx.full.min.js."
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = new Uint8Array(reader.result);
        const workbook = window.XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = window.XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
        importProductsFromRows(rows);
        productFile.value = "";
      } catch (error) {
        alert(
          "No se pudo importar. Asegúrate de usar un Excel con columnas: Productos, Unidades, Precio."
        );
      }
    };
    reader.readAsArrayBuffer(file);
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const text = String(reader.result || "");
      const rows = parseCSV(text);
      importProductsFromRows(rows);
      productFile.value = "";
    } catch (error) {
      alert(
        "No se pudo importar. Asegúrate de usar un CSV con columnas: Productos, Unidades, Precio."
      );
    }
  };
  reader.readAsText(file);
});

productForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!current) return;
  const formData = new FormData(productForm);
  const producto = formData.get("producto").trim();
  if (!producto) return;
  const unidades = parseLocaleNumber(formData.get("unidades"));
  const precio = parseLocaleNumber(formData.get("precio"));
  current.productos = Array.isArray(current.productos) ? current.productos : [];
  current.productos.unshift({
    id: createId("prod"),
    producto,
    unidades,
    precio
  });
  current.updatedAt = new Date().toISOString();
  saveState("Producto agregado");
  productForm.reset();
  editingProductId = null;
  renderProducts();
  renderDetailsSummary();
});

productTableBody.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button || !current) return;
  const action = button.dataset.action;
  const productId = button.dataset.id;

  if (action === "edit") {
    editingProductId = productId;
    renderProducts();
    return;
  }

  if (action === "cancel") {
    editingProductId = null;
    renderProducts();
    return;
  }

  if (action === "save") {
    const row = button.closest("tr");
    if (!row) return;
    const productoInput = row.querySelector("[data-field=\"producto\"]");
    const unidadesInput = row.querySelector("[data-field=\"unidades\"]");
    const precioInput = row.querySelector("[data-field=\"precio\"]");
    const producto = productoInput?.value.trim();
    if (!producto) return;
    const unidades = parseLocaleNumber(unidadesInput?.value);
    const precio = parseLocaleNumber(precioInput?.value);
    const item = (current.productos || []).find((prod) => prod.id === productId);
    if (item) {
      item.producto = producto;
      item.unidades = unidades;
      item.precio = precio;
      current.updatedAt = new Date().toISOString();
      saveState("Producto actualizado");
    }
    editingProductId = null;
    renderProducts();
    renderDetailsSummary();
    return;
  }

  if (action === "delete") {
    current.productos = (current.productos || []).filter((item) => item.id !== productId);
    current.updatedAt = new Date().toISOString();
    saveState("Producto eliminado");
    renderProducts();
    renderDetailsSummary();
  }
});

window.addEventListener("storage", (event) => {
  if (event.key !== STORAGE_KEY) return;
  state = loadState();
  current = findOpportunity();
  render();
});

function render() {
  if (!current) {
    if (clientLayout) {
      clientLayout.hidden = true;
    }
    clientPanel.hidden = true;
    actionPanel.hidden = true;
    productPanel.hidden = true;
    notFound.hidden = false;
    return;
  }
  notFound.hidden = true;
  if (clientLayout) {
    clientLayout.hidden = false;
  }
  clientPanel.hidden = false;
  actionPanel.hidden = false;
  productPanel.hidden = false;

  updateHeader();
  renderDetailsSummary();
  renderSalesSelect();
  renderForm();
  renderActionSelect();
  renderActions();
  renderProducts();
}

function updateHeader() {
  if (!current) return;
  clientTitle.textContent = current.empresa || "Ficha de cliente";
  const stageLabel = STAGES.find((stage) => stage.id === current.etapa)?.label || "Prospecto";
  clientSubtitle.textContent = `${current.contacto || "Sin contacto"} · ${stageLabel}`;
}

function renderDetailsSummary() {
  if (!current) return;
  const updated = current.updatedAt ? formatDate(current.updatedAt) : "—";
  const actionsCount = Array.isArray(current.acciones) ? current.acciones.length : 0;
  const lastAction = getLastAction(current.acciones);

  detailLastAction.textContent = lastAction
    ? `${capitalize(lastAction.tipo)} · ${formatDate(lastAction.fecha)}`
    : "Sin acciones";
  detailActionCount.textContent = `${actionsCount}`;
  detailUpdated.textContent = updated;
}

function renderSalesSelect() {
  const select = clientForm.comercialId;
  const hasSalespeople = state.salespeople.length > 0;
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
    select.value = current?.comercialId || "";
  }
}

function renderForm() {
  clientForm.comercialId.value = current.comercialId || "";
  clientForm.empresa.value = current.empresa || "";
  clientForm.contacto.value = current.contacto || "";
  clientForm.email.value = current.email || "";
  clientForm.telefono.value = current.telefono || "";
  clientForm.poblacion.value = current.poblacion || "";
  clientForm.provincia.value = current.provincia || "";
  clientForm.etapa.value = current.etapa || "prospecto";
  clientForm.notas.value = current.notas || "";
  if (!actionForm.fecha.value) {
    actionForm.fecha.value = new Date().toISOString().slice(0, 10);
  }
}

function renderActionSelect() {
  const select = actionForm.responsable;
  const hasSalespeople = state.salespeople.length > 0;
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
    option.value = salesperson.nombre;
    option.textContent = salesperson.nombre;
    select.appendChild(option);
  });

  if (editingActionId) {
    const editingAction = (current?.acciones || []).find((action) => action.id === editingActionId);
    if (editingAction && editingAction.responsable) {
      const exists = Array.from(select.options).some(
        (option) => option.value === editingAction.responsable
      );
      if (!exists) {
        const option = document.createElement("option");
        option.value = editingAction.responsable;
        option.textContent = editingAction.responsable;
        select.appendChild(option);
      }
    }
  }

  select.disabled = !hasSalespeople;
  if (hasSalespeople && state.salespeople.some((item) => item.nombre === currentValue)) {
    select.value = currentValue;
  } else if (!editingActionId) {
    select.value = "";
  }
}

function renderActions() {
  const actions = Array.isArray(current.acciones) ? current.acciones : [];
  actionList.innerHTML = "";

  if (actions.length === 0) {
    actionEmpty.hidden = false;
    return;
  }

  actionEmpty.hidden = true;
  actions.forEach((action) => {
    const item = document.createElement("div");
    item.className = "activity-item";
    item.innerHTML = `
      <div>
        <div class="opp-title">${capitalize(action.tipo)}</div>
        <div class="activity-meta">${action.fecha} · ${action.responsable}</div>
        <div class="activity-meta">${action.notas || "Sin notas"}</div>
      </div>
      <div class="activity-actions">
        <label class="activity-meta">
          Hecha
          <input type="checkbox" data-id="${action.id}" ${action.done ? "checked" : ""} />
        </label>
        <button type="button" data-action="edit" data-id="${action.id}">Editar</button>
        <button type="button" data-action="delete" data-id="${action.id}">Eliminar</button>
      </div>
    `;
    actionList.appendChild(item);
  });
}

function renderProducts() {
  const productos = Array.isArray(current.productos) ? current.productos : [];
  productTableBody.innerHTML = "";

  if (productos.length === 0) {
    productEmpty.hidden = false;
    productTable.hidden = true;
    return;
  }

  productEmpty.hidden = true;
  productTable.hidden = false;

  productos.forEach((item) => {
    const row = document.createElement("tr");
    if (editingProductId === item.id) {
      row.innerHTML = `
        <td><input type="text" data-field="producto" value="${escapeHtml(item.producto)}" /></td>
        <td><input type="number" step="0.01" data-field="unidades" value="${valueOrEmpty(item.unidades)}" /></td>
        <td><input type="number" step="0.01" data-field="precio" value="${valueOrEmpty(item.precio)}" /></td>
        <td>
          <button class="product-action" data-action="save" data-id="${item.id}">Guardar</button>
          <button class="product-action" data-action="cancel" data-id="${item.id}">Cancelar</button>
        </td>
      `;
    } else {
      row.innerHTML = `
        <td>${escapeHtml(item.producto)}</td>
        <td>${formatNumber(item.unidades)}</td>
        <td>${formatCurrency(item.precio)}</td>
        <td>
          <button class="product-action" data-action="edit" data-id="${item.id}">Editar</button>
          <button class="product-action" data-action="delete" data-id="${item.id}">Eliminar</button>
        </td>
      `;
    }
    productTableBody.appendChild(row);
  });
}

function resetActionForm() {
  editingActionId = null;
  actionForm.reset();
  actionForm.fecha.value = new Date().toISOString().slice(0, 10);
  actionSubmit.textContent = "Agregar acción";
  actionCancel.hidden = true;
  renderActionSelect();
}

function setActionForm(action) {
  editingActionId = action.id;
  renderActionSelect();
  actionForm.tipo.value = action.tipo || "llamada";
  actionForm.fecha.value = action.fecha || new Date().toISOString().slice(0, 10);
  actionForm.responsable.value = action.responsable || "";
  actionForm.notas.value = action.notas || "";
  actionSubmit.textContent = "Guardar cambios";
  actionCancel.hidden = false;
}

function scheduleSave(message) {
  clientSaveStatus.textContent = message || "Guardando...";
  clientSaveTime.textContent = "Cambios pendientes";
  clearTimeout(saveTimeoutId);
  saveTimeoutId = setTimeout(() => saveState(message), 600);
}

function saveState(message) {
  writeStorage(JSON.stringify(state));
  const now = new Date();
  clientSaveStatus.textContent = message || "Guardado";
  clientSaveTime.textContent = `Último guardado ${now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`;
}

function findOpportunity() {
  if (!opportunityId) return null;
  return state.opportunities.find((opp) => opp.id === opportunityId) ?? null;
}

function loadState() {
  const raw = readStorage();
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

function recoverPendingOpportunity() {
  if (!opportunityId) return null;
  const pending = readPendingOpportunity();
  if (!pending || pending.id !== opportunityId) return null;
  state.opportunities.unshift(pending);
  saveState("Prospecto recuperado");
  clearPendingOpportunity();
  return pending;
}

function readPendingOpportunity() {
  try {
    const raw = sessionStorage.getItem(FALLBACK_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

function clearPendingOpportunity() {
  try {
    sessionStorage.removeItem(FALLBACK_KEY);
  } catch (error) {
    // ignore
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

function parseCSV(text) {
  const cleaned = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const delimiter = detectDelimiter(cleaned);
  const rows = [];
  let row = [];
  let currentValue = "";
  let inQuotes = false;

  for (let i = 0; i < cleaned.length; i += 1) {
    const char = cleaned[i];
    const nextChar = cleaned[i + 1];

    if (char === "\"") {
      if (inQuotes && nextChar === "\"") {
        currentValue += "\"";
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      row.push(currentValue);
      currentValue = "";
      continue;
    }

    if (char === "\n" && !inQuotes) {
      row.push(currentValue);
      if (row.some((cell) => cell.trim() !== "")) {
        rows.push(row);
      }
      row = [];
      currentValue = "";
      continue;
    }

    currentValue += char;
  }

  if (currentValue.length > 0 || row.length > 0) {
    row.push(currentValue);
    if (row.some((cell) => cell.trim() !== "")) {
      rows.push(row);
    }
  }

  return rows;
}

function detectDelimiter(text) {
  const sample = text.split("\n")[0] || "";
  const candidates = [",", ";", "\t"];
  let best = ",";
  let bestCount = -1;
  candidates.forEach((delim) => {
    const count = sample.split(delim).length;
    if (count > bestCount) {
      bestCount = count;
      best = delim;
    }
  });
  return best;
}

function findHeaderIndex(headers, keys) {
  for (const key of keys) {
    const index = headers.indexOf(key);
    if (index !== -1) return index;
  }
  return -1;
}

function importProductsFromRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("CSV vacío");
  }
  const header = rows[0].map((cell) => normalizeHeader(cell));
  const productIndex = findHeaderIndex(header, ["productos", "producto"]);
  const unitIndex = findHeaderIndex(header, ["unidades", "unidad", "uds"]);
  const priceIndex = findHeaderIndex(header, ["precio", "importe", "coste"]);

  if (productIndex === -1 || unitIndex === -1 || priceIndex === -1) {
    throw new Error("Faltan columnas requeridas");
  }

  const items = rows.slice(1).reduce((acc, row) => {
    const producto = (row[productIndex] || "").toString().trim();
    if (!producto) return acc;
    const unidades = parseLocaleNumber(row[unitIndex]);
    const precio = parseLocaleNumber(row[priceIndex]);
    acc.push({
      id: createId("prod"),
      producto,
      unidades,
      precio
    });
    return acc;
  }, []);

  current.productos = items;
  editingProductId = null;
  current.updatedAt = new Date().toISOString();
  saveState("Productos importados");
  renderProducts();
  renderDetailsSummary();
}

function normalizeHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function parseLocaleNumber(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  let cleaned = String(value).trim().replace(/\s/g, "").replace(/[€$]/g, "");
  const hasComma = cleaned.includes(",");
  const dotCount = (cleaned.match(/\./g) || []).length;

  if (hasComma) {
    cleaned = cleaned.replace(/\./g, "").replace(/,/g, ".");
  } else if (dotCount > 1) {
    cleaned = cleaned.replace(/\./g, "");
  }

  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumber(value) {
  if (value == null) return "-";
  return new Intl.NumberFormat("es-ES").format(value);
}

function formatCurrency(value) {
  if (value == null) return "-";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value);
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function getLastAction(actions) {
  if (!Array.isArray(actions) || actions.length === 0) return null;
  const sorted = actions
    .filter((action) => action.fecha)
    .slice()
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  return sorted[0] || null;
}

function getSalespersonName(salespersonId) {
  if (!salespersonId) return "Sin asignar";
  const salesperson = state.salespeople.find((item) => item.id === salespersonId);
  return salesperson ? salesperson.nombre : "Sin asignar";
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function valueOrEmpty(value) {
  return value == null ? "" : String(value);
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
