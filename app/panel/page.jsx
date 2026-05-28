"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  CarFront,
  ChevronDown,
  Eye,
  FileText,
  KeyRound,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Save,
  ShieldCheck,
  TriangleAlert,
  UserPlus,
  UserRound,
  UsersRound,
  Wrench
} from "lucide-react";
import { CHECKLISTS } from "@/lib/checklist";
import { analyzeInspection } from "@/lib/inspection-analysis";

const PAGE_SIZE_OPTIONS = [5, 10, 15, 20, 25];

const emptyVehicle = {
  tipo: "CARRO",
  placa: "",
  marca: "",
  linea: "",
  modelo: "",
  color: "",
  claseServicio: "",
  numeroMotor: "",
  numeroChasis: "",
  propietario: "",
  responsable: "",
  aseguradoraSOAT: "",
  numeroSOAT: "",
  fechaInicioSOAT: "",
  fechaVencimientoSOAT: "",
  fechaInicioTecnomecanica: "",
  fechaVencimientoTecnomecanica: "",
  fechaMatricula: "",
  observaciones: "",
  activo: true
};

const emptyAssignment = {
  conductorNombre: "",
  conductorDocumento: "",
  observaciones: ""
};

const emptyAdminUser = {
  nombre: "",
  email: "",
  password: "",
  rol: "ADMIN"
};

const emptyConductor = {
  nombre: "",
  documento: "",
  numeroLicencia: "",
  categoriasLicencia: [],
  categoriasLicenciaDetalle: {},
  fechaExpedicionLicencia: "",
  fechaVencimientoLicencia: "",
  restricciones: "",
  licenciaFrenteDataUrl: "",
  licenciaReversoDataUrl: ""
};

const LICENSE_CATEGORIES = ["A1", "A2", "B1", "B2", "B3", "C1", "C2", "C3"];

function normalizeConductorForm(conductor = {}) {
  return {
    ...emptyConductor,
    nombre: conductor.nombre || "",
    documento: conductor.documento || "",
    numeroLicencia: conductor.numeroLicencia || "",
    categoriasLicencia: Array.isArray(conductor.categoriasLicencia) ? conductor.categoriasLicencia : [],
    categoriasLicenciaDetalle: conductor.categoriasLicenciaDetalle || {},
    fechaExpedicionLicencia: conductor.fechaExpedicionLicencia || "",
    fechaVencimientoLicencia: conductor.fechaVencimientoLicencia || "",
    restricciones: conductor.restricciones || "",
    licenciaFrenteDataUrl: conductor.licenciaFrenteDataUrl || "",
    licenciaReversoDataUrl: conductor.licenciaReversoDataUrl || ""
  };
}

const emptyProfileForm = {
  nombre: "",
  email: "",
  avatarDataUrl: "",
  removeAvatar: false,
  currentPassword: "",
  newPassword: "",
  confirmPassword: ""
};

function avatarInitials(nombre = "") {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "US";
}

function compressAvatar(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("El archivo debe ser una imagen."));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const image = new window.Image();
      image.onload = () => {
        const maxSide = 480;
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));

        const ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.78));
      };
      image.onerror = () => reject(new Error("No se pudo leer la imagen."));
      image.src = reader.result;
    };
    reader.onerror = () => reject(new Error("No se pudo cargar el archivo."));
    reader.readAsDataURL(file);
  });
}

function compressLicenseImage(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("El archivo debe ser una imagen."));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const image = new window.Image();
      image.onload = () => {
        const maxSide = 1400;
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));

        const ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.78));
      };
      image.onerror = () => reject(new Error("No se pudo leer la imagen."));
      image.src = reader.result;
    };
    reader.onerror = () => reject(new Error("No se pudo cargar el archivo."));
    reader.readAsDataURL(file);
  });
}

function toParams(filters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return params.toString();
}

async function parseResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.mensaje || "No se pudo completar la operación.");
  return data;
}

function pageCount(total, size) {
  return Math.max(1, Math.ceil(total / size));
}

function pageItems(items, page, size) {
  const safePage = Math.min(page, pageCount(items.length, size));
  const start = (safePage - 1) * size;
  return items.slice(start, start + size);
}

function noveltyLabel(value, other) {
  const labels = {
    DANO_GENERAL: "Daño general",
    DANO_MOTOR: "Daño motor",
    ACCIDENTE_TRANSITO: "Accidente de tránsito",
    PINCHAZO: "Pinchazo",
    OTRO: other || "Otro"
  };
  return labels[value] || value || "Sin clasificar";
}

function maintenanceLabel(value, other) {
  const labels = {
    PREVENTIVO: "Preventivo",
    CORRECTIVO: "Correctivo",
    CAMBIO_ACEITE: "Cambio de aceite",
    OTRO: other || "Otro"
  };
  return labels[value] || value || "Sin clasificar";
}

function licenseCategorySummary(conductor) {
  const categories = conductor.categoriasLicencia || [];
  const details = conductor.categoriasLicenciaDetalle || {};
  if (!categories.length) return "-";

  return categories
    .map((category) => {
      const detail = details[category];
      const service = detail?.tipoServicio === "PUBLICO" ? "Servicio publico" : detail?.tipoServicio === "PARTICULAR" ? "Particular" : "";
      const date = detail?.fechaVigencia || "";
      return [category, service, date].filter(Boolean).join(" · ");
    })
    .join(", ");
}

function serviceLabel(value) {
  if (value === "PUBLICO") return "Servicio publico";
  if (value === "PARTICULAR") return "Particular";
  return "No registrado";
}

function PaginationControls({ page, pageSize, total, onPageChange, onPageSizeChange }) {
  const totalPages = pageCount(total, pageSize);
  const safePage = Math.min(page, totalPages);
  const firstItem = total ? (safePage - 1) * pageSize + 1 : 0;
  const lastItem = Math.min(safePage * pageSize, total);

  return (
    <div className="pagination">
      <span>{firstItem}-{lastItem} de {total}</span>
      <label>
        Filas
        <select value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))}>
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>
      </label>
      <div className="pagination-actions">
        <button className="secondary compact" type="button" disabled={safePage <= 1} onClick={() => onPageChange(safePage - 1)}>Anterior</button>
        <span>Página {safePage} de {totalPages}</span>
        <button className="secondary compact" type="button" disabled={safePage >= totalPages} onClick={() => onPageChange(safePage + 1)}>Siguiente</button>
      </div>
    </div>
  );
}

export default function PanelPage() {
  const [tab, setTab] = useState("reportes");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [stats, setStats] = useState({});
  const [rows, setRows] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [novedades, setNovedades] = useState([]);
  const [mantenimientos, setMantenimientos] = useState([]);
  const [vehicleNovedades, setVehicleNovedades] = useState([]);
  const [vehicleMantenimientos, setVehicleMantenimientos] = useState([]);
  const [filters, setFilters] = useState({ fechaInicio: "", fechaFin: "", tipoVehiculo: "", estado: "", placa: "", usuario: "" });
  const [vehicleForm, setVehicleForm] = useState(emptyVehicle);
  const [loading, setLoading] = useState(true);
  const [vehicleLoading, setVehicleLoading] = useState(false);
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [vehicleDetailModalOpen, setVehicleDetailModalOpen] = useState(false);
  const [selectedVehicleDetail, setSelectedVehicleDetail] = useState(null);
  const [vehicleDetailLoading, setVehicleDetailLoading] = useState(false);
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [selectedNovedad, setSelectedNovedad] = useState(null);
  const [novedadModalOpen, setNovedadModalOpen] = useState(false);
  const [novedadLoading, setNovedadLoading] = useState(false);
  const [selectedMantenimiento, setSelectedMantenimiento] = useState(null);
  const [mantenimientoModalOpen, setMantenimientoModalOpen] = useState(false);
  const [mantenimientoLoading, setMantenimientoLoading] = useState(false);
  const [recordLoading, setRecordLoading] = useState(false);
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [assignmentVehicle, setAssignmentVehicle] = useState(null);
  const [assignmentForm, setAssignmentForm] = useState(emptyAssignment);
  const [assignmentHistory, setAssignmentHistory] = useState([]);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [conductores, setConductores] = useState([]);
  const [conductorOptions, setConductorOptions] = useState([]);
  const [conductorForm, setConductorForm] = useState(emptyConductor);
  const [conductorModalOpen, setConductorModalOpen] = useState(false);
  const [conductorDetailModalOpen, setConductorDetailModalOpen] = useState(false);
  const [selectedConductorDetail, setSelectedConductorDetail] = useState(null);
  const [conductorStatusModalOpen, setConductorStatusModalOpen] = useState(false);
  const [selectedConductorStatus, setSelectedConductorStatus] = useState(null);
  const [conductorLoading, setConductorLoading] = useState(false);
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminUserForm, setAdminUserForm] = useState(emptyAdminUser);
  const [adminUserLoading, setAdminUserLoading] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [profileForm, setProfileForm] = useState(emptyProfileForm);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [reportPage, setReportPage] = useState(1);
  const [reportPageSize, setReportPageSize] = useState(5);
  const [vehiclePage, setVehiclePage] = useState(1);
  const [vehiclePageSize, setVehiclePageSize] = useState(5);
  const [novedadPage, setNovedadPage] = useState(1);
  const [novedadPageSize, setNovedadPageSize] = useState(5);
  const [mantenimientoPage, setMantenimientoPage] = useState(1);
  const [mantenimientoPageSize, setMantenimientoPageSize] = useState(5);
  const [message, setMessage] = useState(null);
  const [processMessage, setProcessMessage] = useState("");
  const autoFilterReady = useRef(false);

  const filteredRows = useMemo(() => {
    return filters.estado ? rows.filter((row) => row.estado === filters.estado) : rows;
  }, [rows, filters.estado]);
  const visibleRows = pageItems(filteredRows, reportPage, reportPageSize);
  const visibleVehicles = pageItems(vehicles, vehiclePage, vehiclePageSize);
  const visibleNovedades = pageItems(novedades, novedadPage, novedadPageSize);
  const visibleMantenimientos = pageItems(mantenimientos, mantenimientoPage, mantenimientoPageSize);
  const dashboard = useMemo(() => {
    const byType = { CARRO: 0, MOTO: 0, GRUA: 0 };
    const byStatus = { Apto: 0, Observaciones: 0, "No apto": 0 };
    const uniqueVehicles = new Set();

    filteredRows.forEach((row) => {
      if (byType[row.tipo] !== undefined) byType[row.tipo] += 1;
      if (byStatus[row.estado] !== undefined) byStatus[row.estado] += 1;
      uniqueVehicles.add(`${row.tipo}-${row.placa}`);
    });

    return {
      total: filteredRows.length,
      inspectedVehicles: uniqueVehicles.size,
      withNotes: byStatus.Observaciones,
      notFit: byStatus["No apto"],
      byType,
      byStatus,
      latest: filteredRows.slice(0, 6)
    };
  }, [filteredRows]);
  const panelTitle = tab === "reportes" ? "Preoperacionales" : tab === "vehiculos" ? "Hoja de vida vehicular" : tab === "novedades" ? "Novedades en recorrido" : tab === "mantenimientos" ? "Mantenimientos" : tab === "conductores" ? "Conductores" : "Usuarios administrativos";
  const canManageAllRoles = currentAdmin?.rol === "ADMIN";
  const selectedRecordAnalysis = useMemo(
    () => selectedRecord ? analyzeInspection(selectedRecord.tipo, selectedRecord.checklist) : null,
    [selectedRecord]
  );
  const panelNavItems = useMemo(() => [
    { key: "reportes", label: "Reportes", icon: LayoutDashboard },
    { key: "vehiculos", label: "Vehiculos", icon: CarFront },
    { key: "novedades", label: "Novedades", icon: TriangleAlert },
    { key: "mantenimientos", label: "Mantenimientos", icon: Wrench },
    { key: "conductores", label: "Conductores", icon: UsersRound },
    { key: "usuarios", label: "Usuarios", icon: ShieldCheck }
  ], []);
  const activeConductores = useMemo(
    () => (conductorOptions.length ? conductorOptions : conductores).filter((conductor) => conductor.activo),
    [conductorOptions, conductores]
  );

  async function fetchPanelData(nextFilters) {
    const query = toParams(nextFilters);
    const [statsResponse, rowsResponse] = await Promise.all([
      fetch("/api/reportes/estadisticas"),
      fetch(`/api/reportes/registros${query ? `?${query}` : ""}`)
    ]);
    return {
      stats: await parseResponse(statsResponse),
      rows: await parseResponse(rowsResponse)
    };
  }

  async function load(nextFilters = filters) {
    setMessage(null);
    setProcessMessage("Actualizando reportes...");
    setLoading(true);
    try {
      const data = await fetchPanelData(nextFilters);
      setStats(data.stats);
      setRows(data.rows);
      setReportPage(1);
      const totalFound = nextFilters.estado ? data.rows.filter((row) => row.estado === nextFilters.estado).length : data.rows.length;
      setMessage({ type: "success", text: `${totalFound} registros encontrados.` });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setLoading(false);
      setProcessMessage("");
    }
  }

  async function loadVehicles() {
    setProcessMessage("Actualizando hojas de vida...");
    setVehicleLoading(true);
    try {
      const data = await parseResponse(await fetch("/api/vehiculos?includeInactive=1"));
      setVehicles(data);
      setVehiclePage(1);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setVehicleLoading(false);
      setProcessMessage("");
    }
  }

  async function loadNovedades() {
    setNovedadLoading(true);
    setProcessMessage("Cargando novedades reportadas...");
    try {
      const data = await parseResponse(await fetch("/api/novedades"));
      setNovedades(data);
      setNovedadPage(1);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setNovedadLoading(false);
      setProcessMessage("");
    }
  }

  async function loadMantenimientos() {
    setMantenimientoLoading(true);
    setProcessMessage("Cargando mantenimientos registrados...");
    try {
      const data = await parseResponse(await fetch("/api/mantenimientos"));
      setMantenimientos(data);
      setMantenimientoPage(1);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setMantenimientoLoading(false);
      setProcessMessage("");
    }
  }

  async function loadConductores() {
    setConductorLoading(true);
    setProcessMessage("Cargando conductores...");
    try {
      const data = await parseResponse(await fetch("/api/admin/conductores"));
      setConductores(data);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setConductorLoading(false);
      setProcessMessage("");
    }
  }

  async function loadConductorOptions() {
    try {
      const data = await parseResponse(await fetch("/api/usuarios?all=1"));
      setConductorOptions(data);
      return data;
    } catch (error) {
      setMessage({ type: "error", text: error.message });
      return [];
    }
  }

  useEffect(() => {
    let active = true;

    async function loadInitial() {
      setProcessMessage("Cargando panel administrativo...");
      const [panelData, vehicleData, profileData] = await Promise.all([
        fetchPanelData(filters),
        parseResponse(await fetch("/api/vehiculos?includeInactive=1")),
        parseResponse(await fetch("/api/admin/perfil"))
      ]);
      if (!active) return;
      setStats(panelData.stats);
      setRows(panelData.rows);
      setVehicles(vehicleData);
      setCurrentAdmin(profileData.user);
      setProfileForm({
        ...emptyProfileForm,
        nombre: profileData.user.nombre || "",
        email: profileData.user.email || "",
        avatarDataUrl: profileData.user.avatarDataUrl || ""
      });
      setReportPage(1);
      setVehiclePage(1);
      setLoading(false);
      setProcessMessage("");
    }

    loadInitial().catch((error) => {
      setMessage({ type: "error", text: error.message });
      setLoading(false);
      setProcessMessage("");
    });

    return () => {
      active = false;
    };
    // Carga inicial; filtros y vehículos se actualizan con acciones explícitas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!autoFilterReady.current) {
      autoFilterReady.current = true;
      return;
    }

    const timer = window.setTimeout(() => {
      load(filters);
    }, 350);

    return () => window.clearTimeout(timer);
    // Los filtros se aplican automÃ¡ticamente; load usa el estado actual del panel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
    setReportPage(1);
  }

  function updateReportPageSize(size) {
    setReportPageSize(size);
    setReportPage(1);
  }

  function updateVehiclePageSize(size) {
    setVehiclePageSize(size);
    setVehiclePage(1);
  }

  function updateNovedadPageSize(size) {
    setNovedadPageSize(size);
    setNovedadPage(1);
  }

  function updateMantenimientoPageSize(size) {
    setMantenimientoPageSize(size);
    setMantenimientoPage(1);
  }

  function updateVehicle(key, value) {
    setVehicleForm((current) => ({ ...current, [key]: value }));
  }

  function findActiveConductorByName(name) {
    const normalized = String(name || "").trim().toUpperCase();
    return activeConductores.find((conductor) => conductor.nombre === normalized);
  }

  function updateAssignmentConductorName(value) {
    const normalized = value.toUpperCase();
    const conductor = findActiveConductorByName(normalized);
    setAssignmentForm((current) => ({
      ...current,
      conductorNombre: conductor?.nombre || normalized,
      conductorDocumento: conductor ? conductor.documento : ""
    }));
  }

  function newVehicle() {
    setVehicleForm(emptyVehicle);
    setMessage(null);
    setVehicleModalOpen(true);
  }

  function editVehicle(vehicle) {
    setTab("vehiculos");
    setVehicleForm({
      ...emptyVehicle,
      ...vehicle,
      activo: Boolean(vehicle.activo)
    });
    setMessage(null);
    setVehicleModalOpen(true);
  }

  async function viewVehicleDetail(vehicle) {
    setMessage(null);
    setSelectedVehicleDetail(vehicle);
    setVehicleNovedades([]);
    setVehicleMantenimientos([]);
    setVehicleDetailModalOpen(true);
    setVehicleDetailLoading(true);
    setProcessMessage(`Cargando historial del vehiculo ${vehicle.placa}...`);

    try {
      const [novedadesData, mantenimientosData] = await Promise.all([
        parseResponse(await fetch(`/api/novedades?tipoVehiculo=${encodeURIComponent(vehicle.tipo)}&placa=${encodeURIComponent(vehicle.placa)}`)),
        parseResponse(await fetch(`/api/mantenimientos?tipoVehiculo=${encodeURIComponent(vehicle.tipo)}&placa=${encodeURIComponent(vehicle.placa)}`))
      ]);
      setVehicleNovedades(novedadesData);
      setVehicleMantenimientos(mantenimientosData);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setVehicleDetailLoading(false);
      setProcessMessage("");
    }
  }

  function closeVehicleDetailModal() {
    setVehicleDetailModalOpen(false);
    setSelectedVehicleDetail(null);
    setVehicleNovedades([]);
    setVehicleMantenimientos([]);
  }

  function closeVehicleModal() {
    setVehicleModalOpen(false);
    setVehicleForm(emptyVehicle);
  }

  async function viewRecord(row) {
    setMessage(null);
    setRecordModalOpen(true);
    setSelectedRecord(null);
    setRecordLoading(true);
    setProcessMessage(`Cargando preoperacional ${row.placa}...`);

    try {
      const data = await parseResponse(await fetch(`/api/preoperacionales?id=${row.id}`));
      setSelectedRecord(data);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
      setRecordModalOpen(false);
    } finally {
      setRecordLoading(false);
      setProcessMessage("");
    }
  }

  function closeRecordModal() {
    setRecordModalOpen(false);
    setSelectedRecord(null);
    setSelectedPhoto(null);
  }

  async function viewNovedad(row) {
    setSelectedNovedad(null);
    setNovedadModalOpen(true);
    setNovedadLoading(true);
    setProcessMessage(`Cargando novedad #${row.id}...`);
    try {
      const data = await parseResponse(await fetch(`/api/novedades/${row.id}`));
      setSelectedNovedad(data);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
      setNovedadModalOpen(false);
    } finally {
      setNovedadLoading(false);
      setProcessMessage("");
    }
  }

  async function viewMantenimiento(row) {
    setSelectedMantenimiento(null);
    setMantenimientoModalOpen(true);
    setMantenimientoLoading(true);
    setProcessMessage(`Cargando mantenimiento #${row.id}...`);
    try {
      const data = await parseResponse(await fetch(`/api/mantenimientos/${row.id}`));
      setSelectedMantenimiento(data);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
      setMantenimientoModalOpen(false);
    } finally {
      setMantenimientoLoading(false);
      setProcessMessage("");
    }
  }

  async function loadAssignmentHistory(vehicle) {
    const data = await parseResponse(await fetch(`/api/vehiculos/asignaciones?tipo=${encodeURIComponent(vehicle.tipo)}&placa=${encodeURIComponent(vehicle.placa)}`));
    setAssignmentHistory(data);
  }

  async function openAssignmentModal(vehicle) {
    setMessage(null);
    let availableConductores = conductorOptions.length ? conductorOptions : [];
    if (!availableConductores.length) {
      setProcessMessage("Cargando conductores disponibles...");
      availableConductores = await loadConductorOptions();
    }
    const assignedConductor = availableConductores
      .filter((conductor) => conductor.activo)
      .find((conductor) => conductor.nombre === String(vehicle.responsable || "").trim().toUpperCase());

    setAssignmentVehicle(vehicle);
    setAssignmentForm({
      ...emptyAssignment,
      conductorNombre: assignedConductor?.nombre || vehicle.responsable || "",
      conductorDocumento: assignedConductor?.documento || ""
    });
    setAssignmentHistory([]);
    setAssignmentModalOpen(true);
    setAssignmentLoading(true);
    setProcessMessage(`Cargando historial de ${vehicle.placa}...`);

    try {
      await loadAssignmentHistory(vehicle);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setAssignmentLoading(false);
      setProcessMessage("");
    }
  }

  function closeAssignmentModal() {
    setAssignmentModalOpen(false);
    setAssignmentVehicle(null);
    setAssignmentForm(emptyAssignment);
    setAssignmentHistory([]);
  }

  function updateAssignment(key, value) {
    setAssignmentForm((current) => ({ ...current, [key]: value }));
  }

  function updateConductor(key, value) {
    setConductorForm((current) => ({ ...current, [key]: value }));
  }

  function newConductor() {
    setConductorForm(normalizeConductorForm());
    setConductorModalOpen(true);
    setMessage(null);
  }

  function editConductor(conductor) {
    setConductorForm(normalizeConductorForm(conductor));
    setConductorModalOpen(true);
    setMessage(null);
  }

  function viewConductorDetail(conductor) {
    setSelectedConductorDetail(conductor);
    setConductorDetailModalOpen(true);
    setMessage(null);
  }

  function closeConductorDetailModal() {
    setConductorDetailModalOpen(false);
    setSelectedConductorDetail(null);
    setSelectedPhoto(null);
  }

  function toggleConductorCategory(category) {
    setConductorForm((current) => {
      const currentCategories = Array.isArray(current.categoriasLicencia) ? current.categoriasLicencia : [];
      const currentDetails = current.categoriasLicenciaDetalle || {};
      const selected = currentCategories.includes(category)
        ? currentCategories.filter((item) => item !== category)
        : [...currentCategories, category];
      const nextDetails = { ...currentDetails };
      if (selected.includes(category)) {
        nextDetails[category] = nextDetails[category] || { fechaVigencia: "", tipoServicio: "" };
      } else {
        delete nextDetails[category];
      }
      return { ...current, categoriasLicencia: selected, categoriasLicenciaDetalle: nextDetails };
    });
  }

  function updateConductorCategoryDetail(category, key, value) {
    setConductorForm((current) => ({
      ...current,
      categoriasLicenciaDetalle: {
        ...(current.categoriasLicenciaDetalle || {}),
        [category]: {
          ...((current.categoriasLicenciaDetalle || {})[category] || {}),
          [key]: value
        }
      }
    }));
  }

  async function handleConductorLicensePhoto(key, file) {
    if (!file) return;

    setConductorLoading(true);
    setProcessMessage("Procesando foto de licencia...");
    try {
      const dataUrl = await compressLicenseImage(file);
      setConductorForm((current) => ({ ...current, [key]: dataUrl }));
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setConductorLoading(false);
      setProcessMessage("");
    }
  }

  function requestToggleConductor(conductor) {
    setSelectedConductorStatus(conductor);
    setConductorStatusModalOpen(true);
  }

  async function saveConductor(event) {
    event.preventDefault();
    setConductorLoading(true);
    setMessage(null);
    setProcessMessage("Guardando conductor...");

    try {
      await parseResponse(await fetch("/api/admin/conductores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(conductorForm)
      }));
      setConductorForm(normalizeConductorForm());
      setConductorModalOpen(false);
      setMessage({ type: "success", text: "Conductor guardado correctamente." });
      await loadConductores();
      await loadConductorOptions();
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setConductorLoading(false);
      setProcessMessage("");
    }
  }

  async function confirmToggleConductor() {
    const conductor = selectedConductorStatus;
    if (!conductor) return;

    setConductorLoading(true);
    setMessage(null);
    setProcessMessage(`${conductor.activo ? "Inactivando" : "Activando"} conductor...`);

    try {
      await parseResponse(await fetch("/api/admin/conductores", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: conductor.id, activo: !conductor.activo })
      }));
      setMessage({ type: "success", text: `Conductor ${conductor.activo ? "inactivado" : "activado"} correctamente.` });
      setConductorStatusModalOpen(false);
      setSelectedConductorStatus(null);
      await loadConductores();
      await loadConductorOptions();
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setConductorLoading(false);
      setProcessMessage("");
    }
  }

  async function loadAdminUsers() {
    setAdminUserLoading(true);
    setProcessMessage("Cargando usuarios administrativos...");
    try {
      const data = await parseResponse(await fetch("/api/admin/usuarios"));
      setAdminUsers(data);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setAdminUserLoading(false);
      setProcessMessage("");
    }
  }

  function updateAdminUser(key, value) {
    setAdminUserForm((current) => ({ ...current, [key]: value }));
  }

  async function saveAdminUser(event) {
    event.preventDefault();
    const payload = {
      ...adminUserForm,
      rol: canManageAllRoles ? adminUserForm.rol : "OPERADOR"
    };

    setAdminUserLoading(true);
    setMessage(null);
    setProcessMessage("Creando usuario administrativo...");

    try {
      await parseResponse(await fetch("/api/admin/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }));
      setAdminUserForm({ ...emptyAdminUser, rol: canManageAllRoles ? "ADMIN" : "OPERADOR" });
      setMessage({ type: "success", text: "Usuario administrativo creado correctamente." });
      await loadAdminUsers();
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setAdminUserLoading(false);
      setProcessMessage("");
    }
  }

  function openProfileModal() {
    setProfileMenuOpen(false);
    setProfileModalOpen(true);
    setProfileForm({
      ...emptyProfileForm,
      nombre: currentAdmin?.nombre || "",
      email: currentAdmin?.email || "",
      avatarDataUrl: currentAdmin?.avatarDataUrl || ""
    });
  }

  function updateProfile(key, value) {
    setProfileForm((current) => ({ ...current, [key]: value }));
  }

  async function handleProfileAvatar(file) {
    if (!file) return;

    setProfileLoading(true);
    setProcessMessage("Procesando imagen de perfil...");
    try {
      const avatarDataUrl = await compressAvatar(file);
      setProfileForm((current) => ({ ...current, avatarDataUrl, removeAvatar: false }));
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setProfileLoading(false);
      setProcessMessage("");
    }
  }

  async function saveProfile(event) {
    event.preventDefault();
    setProfileLoading(true);
    setMessage(null);
    setProcessMessage("Actualizando perfil...");

    if (profileForm.newPassword && profileForm.newPassword !== profileForm.confirmPassword) {
      setProfileLoading(false);
      setProcessMessage("");
      setMessage({ type: "error", text: "La nueva contraseña y la confirmación no coinciden." });
      return;
    }

    try {
      const data = await parseResponse(await fetch("/api/admin/perfil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm)
      }));
      setCurrentAdmin(data.user);
      setProfileForm({
        ...emptyProfileForm,
        nombre: data.user.nombre || "",
        email: data.user.email || "",
        avatarDataUrl: data.user.avatarDataUrl || ""
      });
      setProfileModalOpen(false);
      setMessage({ type: "success", text: "Perfil actualizado correctamente." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setProfileLoading(false);
      setProcessMessage("");
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  async function saveAssignment(event) {
    event.preventDefault();
    if (!assignmentVehicle) return;

    if (!assignmentForm.conductorNombre.trim()) {
      setMessage({ type: "error", text: "Falta diligenciar: nombre del conductor." });
      return;
    }

    setAssignmentLoading(true);
    setProcessMessage(`Asignando conductor a ${assignmentVehicle.placa}...`);
    setMessage(null);

    try {
      await parseResponse(await fetch("/api/vehiculos/asignaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: assignmentVehicle.tipo,
          placa: assignmentVehicle.placa,
          ...assignmentForm
        })
      }));
      setMessage({ type: "success", text: "Conductor asignado correctamente." });
      await loadAssignmentHistory(assignmentVehicle);
      await loadVehicles();
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setAssignmentLoading(false);
      setProcessMessage("");
    }
  }

  function validateVehicleForm() {
    const requiredFields = [
      ["tipo", "Tipo de vehículo"],
      ["placa", "Placa"],
      ["marca", "Marca"],
      ["linea", "Línea / referencia"],
      ["modelo", "Modelo / año"],
      ["fechaVencimientoSOAT", "Vencimiento SOAT"],
      ["fechaVencimientoTecnomecanica", "Vencimiento tecnomecánica"]
    ];

    const missing = requiredFields.find(([key]) => !String(vehicleForm[key] || "").trim());
    return missing ? missing[1] : null;
  }

  async function saveVehicle(event) {
    event.preventDefault();
    setMessage(null);

    const missing = validateVehicleForm();
    if (missing) {
      setMessage({ type: "error", text: `Falta diligenciar: ${missing}.` });
      return;
    }

    setProcessMessage(vehicleForm.placa ? `Guardando hoja de vida ${vehicleForm.placa}...` : "Guardando hoja de vida...");
    setVehicleLoading(true);

    try {
      await parseResponse(await fetch("/api/vehiculos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vehicleForm)
      }));
      setMessage({ type: "success", text: "Vehículo guardado correctamente." });
      setVehicleForm(emptyVehicle);
      setVehicleModalOpen(false);
      await loadVehicles();
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setVehicleLoading(false);
      setProcessMessage("");
    }
  }

  async function toggleVehicle(vehicle) {
    setMessage(null);
    setProcessMessage(`${vehicle.activo ? "Inactivando" : "Activando"} ${vehicle.placa}...`);
    setVehicleLoading(true);
    try {
      await parseResponse(await fetch("/api/vehiculos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: vehicle.tipo, placa: vehicle.placa, activo: !vehicle.activo })
      }));
      await loadVehicles();
      setMessage({ type: "success", text: `Vehículo ${vehicle.activo ? "inactivado" : "activado"} correctamente.` });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setVehicleLoading(false);
      setProcessMessage("");
    }
  }

  useEffect(() => {
    if (tab === "usuarios" && !adminUsers.length) {
      const timer = window.setTimeout(() => {
        loadAdminUsers();
      }, 0);
      return () => window.clearTimeout(timer);
    }
    // La carga se dispara al entrar al módulo de usuarios.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    if (tab === "conductores" && !conductores.length) {
      const timer = window.setTimeout(() => {
        loadConductores();
      }, 0);
      return () => window.clearTimeout(timer);
    }
    // La carga se dispara al entrar al modulo de conductores.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    if (tab === "vehiculos" && !conductorOptions.length) {
      const timer = window.setTimeout(() => {
        loadConductorOptions();
      }, 0);
      return () => window.clearTimeout(timer);
    }
    // La carga liviana se dispara al entrar al modulo de vehiculos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    if (tab === "novedades" && !novedades.length) {
      const timer = window.setTimeout(() => {
        loadNovedades();
      }, 0);
      return () => window.clearTimeout(timer);
    }
    // La carga se dispara al entrar al módulo de novedades.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    if (tab === "mantenimientos" && !mantenimientos.length) {
      const timer = window.setTimeout(() => {
        loadMantenimientos();
      }, 0);
      return () => window.clearTimeout(timer);
    }
    // La carga se dispara al entrar al modulo de mantenimientos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  return (
    <main className={`panel-page ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <header className="panel-header">
        <div className="panel-titlebar">
          <div className="panel-logo-box">
            <Image className="panel-logo" src="/logo-aya-header.png" alt="A&A Comunicaciones" width={132} height={54} priority />
          </div>
          <div className="panel-title-copy">
            <span className="panel-kicker">Administración</span>
            <h1>{panelTitle}</h1>
            <p>Gestión de inspecciones, vehículos y reportes operativos.</p>
          </div>
        </div>
        <div className="header-actions">
          <Link className="secondary button-link panel-action" href="/">
            <FileText size={18} aria-hidden="true" />
            <span>Formulario</span>
          </Link>
          <div className="profile-menu">
            <button className="secondary panel-profile-trigger" type="button" onClick={() => setProfileMenuOpen((open) => !open)}>
              <span className="profile-avatar" aria-hidden="true">
                {currentAdmin?.avatarDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={currentAdmin.avatarDataUrl} alt="" />
                ) : avatarInitials(currentAdmin?.nombre)}
              </span>
              <span className="profile-trigger-copy">
                <strong>{currentAdmin?.nombre || "Perfil"}</strong>
                <small>{currentAdmin?.rol || "ADMIN"}</small>
              </span>
              <ChevronDown size={16} aria-hidden="true" />
            </button>
            {profileMenuOpen ? (
              <div className="profile-dropdown">
                <button type="button" onClick={openProfileModal}>
                  <UserRound size={16} aria-hidden="true" />
                  <span>Mi perfil</span>
                </button>
                <button type="button" onClick={logout}>
                  <LogOut size={16} aria-hidden="true" />
                  <span>Cerrar sesión</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <nav className="panel-side-nav" aria-label="Menu administrativo">
        <button
          className="sidebar-toggle"
          type="button"
          onClick={() => setSidebarCollapsed((current) => !current)}
          title={sidebarCollapsed ? "Expandir menu" : "Ocultar menu"}
        >
          {sidebarCollapsed ? <PanelLeftOpen size={19} aria-hidden="true" /> : <PanelLeftClose size={19} aria-hidden="true" />}
          <span>{sidebarCollapsed ? "Expandir" : "Ocultar menu"}</span>
        </button>
        {panelNavItems.map((item) => {
          const Icon = item.icon;
          const active = tab === item.key;
          return (
            <button
              key={item.key}
              className={active ? "active" : ""}
              type="button"
              onClick={() => setTab(item.key)}
              title={sidebarCollapsed ? item.label : undefined}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={20} aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {message ? <p className={`panel-message alert-${message.type}`}>{message.text}</p> : null}
      {(loading || vehicleLoading || vehicleDetailLoading || recordLoading || assignmentLoading || conductorLoading || adminUserLoading || profileLoading || novedadLoading || mantenimientoLoading) && processMessage ? (
        <div className="panel-message loading-card">
          <span className="spinner" aria-hidden="true" />
          <span>{processMessage}</span>
        </div>
      ) : null}

      {tab === "reportes" ? (
        <>
          <section className="dashboard-controls">
            <select value={filters.tipoVehiculo} onChange={(event) => updateFilter("tipoVehiculo", event.target.value)}>
              <option value="">Todos los tipos</option>
              <option value="MOTO">Solo motos</option>
              <option value="CARRO">Solo carros</option>
              <option value="GRUA">Solo grúas</option>
            </select>
            <select value={filters.estado} onChange={(event) => updateFilter("estado", event.target.value)}>
              <option value="">Todos los estados</option>
              <option value="Apto">Apto</option>
              <option value="Observaciones">Observaciones</option>
              <option value="No apto">No apto</option>
            </select>
            <input type="date" value={filters.fechaInicio} onChange={(event) => updateFilter("fechaInicio", event.target.value)} />
            <input type="date" value={filters.fechaFin} onChange={(event) => updateFilter("fechaFin", event.target.value)} />
            <input placeholder="Buscar placa" value={filters.placa} onChange={(event) => updateFilter("placa", event.target.value.toUpperCase())} />
            <input placeholder="Buscar usuario" value={filters.usuario} onChange={(event) => updateFilter("usuario", event.target.value.toUpperCase())} />
          </section>

          <section className="dashboard-grid">
            <article className="metric-card">
              <span>Preoperacionales hoy</span>
              <strong>{stats.registrosHoy || 0}</strong>
              <small>Registros del día</small>
            </article>
            <article className="metric-card">
              <span>Vehículos inspeccionados</span>
              <strong>{dashboard.inspectedVehicles}</strong>
              <small>De {vehicles.length} registrados</small>
            </article>
            <article className="metric-card">
              <span>Con novedades</span>
              <strong>{dashboard.withNotes}</strong>
              <small>Requieren revisión</small>
            </article>
            <article className="metric-card danger">
              <span>No aptos</span>
              <strong>{dashboard.notFit}</strong>
              <small>Fuera de operación</small>
            </article>

            <article className="chart-card">
              <h2>Por tipo de vehículo</h2>
              {[
                ["Carro", dashboard.byType.CARRO, "#2d7a3e"],
                ["Moto", dashboard.byType.MOTO, "#0066b3"],
                ["Grúa", dashboard.byType.GRUA, "#7a5c00"]
              ].map(([label, value, color]) => (
                <div className="bar-row" key={label}>
                  <span>{label}</span>
                  <div><i style={{ width: `${dashboard.total ? (value / dashboard.total) * 100 : 0}%`, background: color }} /></div>
                  <strong>{value}</strong>
                </div>
              ))}

              <h2>Por estado</h2>
              {[
                ["Apto", dashboard.byStatus.Apto, "#2d7a3e"],
                ["Observaciones", dashboard.byStatus.Observaciones, "#c29200"],
                ["No apto", dashboard.byStatus["No apto"], "#b42318"]
              ].map(([label, value, color]) => (
                <div className="bar-row" key={label}>
                  <span>{label}</span>
                  <div><i style={{ width: `${dashboard.total ? (value / dashboard.total) * 100 : 0}%`, background: color }} /></div>
                  <strong>{value}</strong>
                </div>
              ))}
            </article>

            <article className="latest-card">
              <h2>Últimas inspecciones</h2>
              <table className="compact-table">
                <thead>
                  <tr>
                    <th>Placa</th>
                    <th>Conductor</th>
                    <th>Tipo</th>
                    <th>Hora</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.latest.map((row) => (
                    <tr key={`latest-${row.tipo}-${row.id}`}>
                      <td><strong>{row.placa}</strong></td>
                      <td>{row.usuario}</td>
                      <td>{row.tipo}</td>
                      <td>{row.hora}</td>
                      <td><span className={`status-pill status-${row.estado.toLowerCase().replaceAll(" ", "-")}`}>{row.estado}</span></td>
                    </tr>
                  ))}
                  {!dashboard.latest.length ? (
                    <tr><td colSpan="5">No hay inspecciones para mostrar.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </article>
          </section>

          <section className="table-wrap">
            {loading ? <p className="empty loading-card"><span className="spinner" aria-hidden="true" /> Cargando registros...</p> : null}
            {!loading && !filteredRows.length ? <p className="empty">No hay registros para mostrar.</p> : null}
            {!!filteredRows.length && (
              <table>
                <thead>
                  <tr>
                    <th>Consecutivo</th>
                    <th>Tipo</th>
                    <th>Fecha</th>
                    <th>Usuario</th>
                    <th>Documento</th>
                    <th>Placa</th>
                    <th>Modelo</th>
                    <th>Destino</th>
                    <th>Km</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => (
                    <tr key={`${row.tipo}-${row.id}`}>
                      <td><strong>{row.codigo || `PRE-${row.id < 100 ? String(row.id).padStart(2, "0") : row.id}`}</strong></td>
                      <td>{row.tipo}</td>
                      <td>{row.fecha}</td>
                      <td>{row.usuario}</td>
                      <td>{row.documento}</td>
                      <td><strong>{row.placa}</strong></td>
                      <td>{row.modelo}</td>
                      <td>{row.destino}</td>
                      <td>{row.kilometraje}</td>
                      <td><span className={`status-pill status-${row.estado.toLowerCase().replaceAll(" ", "-")}`}>{row.estado}</span></td>
                      <td className="row-actions">
                        <button className="secondary compact" type="button" onClick={() => viewRecord(row)}>Ver</button>
                        <a className="secondary compact button-link" href={`/api/preoperacionales/pdf?id=${row.id}`}>PDF</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!!filteredRows.length && (
              <PaginationControls
                page={reportPage}
                pageSize={reportPageSize}
                total={filteredRows.length}
                onPageChange={setReportPage}
                onPageSizeChange={updateReportPageSize}
              />
            )}
          </section>
        </>
      ) : tab === "vehiculos" ? (
        <section className="vehicle-admin">
          <div className="vehicle-toolbar">
            <div>
              <h2>Vehículos registrados</h2>
              <p>{vehicles.length} hojas de vida disponibles</p>
            </div>
            <button className="primary" type="button" onClick={newVehicle}>Nuevo vehículo</button>
          </div>

          <div className="table-wrap">
            {vehicleLoading ? <p className="empty loading-card"><span className="spinner" aria-hidden="true" /> Actualizando vehículos...</p> : null}
            {!vehicles.length ? <p className="empty">No hay vehículos registrados.</p> : (
              <table>
                <thead>
                  <tr>
                    <th>Estado</th>
                    <th>Tipo</th>
                    <th>Placa</th>
                    <th>Marca / línea</th>
                    <th>Modelo</th>
                    <th>Responsable</th>
                    <th>SOAT vence</th>
                    <th>Tecno vence</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleVehicles.map((vehicle) => (
                    <tr key={`${vehicle.tipo}-${vehicle.placa}`}>
                      <td>{vehicle.activo ? "Activo" : "Inactivo"}</td>
                      <td>{vehicle.tipo}</td>
                      <td><strong>{vehicle.placa}</strong></td>
                      <td>{vehicle.marca} {vehicle.linea}</td>
                      <td>{vehicle.modelo}</td>
                      <td>{vehicle.responsable}</td>
                      <td>{vehicle.fechaVencimientoSOAT}</td>
                      <td>{vehicle.fechaVencimientoTecnomecanica}</td>
                      <td className="row-actions">
                        <button className="secondary compact" type="button" onClick={() => viewVehicleDetail(vehicle)}>Ver</button>
                        <details className="action-menu">
                          <summary>
                            <span>Acciones</span>
                            <ChevronDown size={14} aria-hidden="true" />
                          </summary>
                          <div className="action-menu-list">
                            <button type="button" onClick={() => editVehicle(vehicle)}>Editar hoja de vida</button>
                            <button type="button" onClick={() => openAssignmentModal(vehicle)}>Asignar conductor</button>
                            <a href={`/api/vehiculos/pdf?tipo=${encodeURIComponent(vehicle.tipo)}&placa=${encodeURIComponent(vehicle.placa)}`}>Descargar PDF</a>
                            <button type="button" onClick={() => toggleVehicle(vehicle)}>
                              {vehicle.activo ? "Inactivar vehiculo" : "Activar vehiculo"}
                            </button>
                          </div>
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!!vehicles.length && (
              <PaginationControls
                page={vehiclePage}
                pageSize={vehiclePageSize}
                total={vehicles.length}
                onPageChange={setVehiclePage}
                onPageSizeChange={updateVehiclePageSize}
              />
            )}
          </div>

          {vehicleModalOpen ? (
            <div className="modal-backdrop" role="presentation">
              <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="vehicle-modal-title">
                <div className="modal-header">
                  <div>
                    <p className="eyebrow">Hoja de vida</p>
                    <h2 id="vehicle-modal-title">{vehicleForm.placa ? `Vehículo ${vehicleForm.placa}` : "Nuevo vehículo"}</h2>
                  </div>
                  <button className="secondary compact" type="button" onClick={closeVehicleModal}>Cerrar</button>
                </div>

                <form className="vehicle-form modal-form" onSubmit={saveVehicle}>
                  <select value={vehicleForm.tipo} onChange={(event) => updateVehicle("tipo", event.target.value)}>
                    <option value="MOTO">Moto</option>
                    <option value="CARRO">Carro</option>
                    <option value="GRUA">Grúa</option>
                  </select>
                  <input required placeholder="Placa" value={vehicleForm.placa} onChange={(event) => updateVehicle("placa", event.target.value.toUpperCase())} />
                  <input placeholder="Marca" value={vehicleForm.marca} onChange={(event) => updateVehicle("marca", event.target.value.toUpperCase())} />
                  <input placeholder="Línea / referencia" value={vehicleForm.linea} onChange={(event) => updateVehicle("linea", event.target.value.toUpperCase())} />
                  <input placeholder="Modelo / año" value={vehicleForm.modelo} onChange={(event) => updateVehicle("modelo", event.target.value.toUpperCase())} />
                  <input placeholder="Color" value={vehicleForm.color} onChange={(event) => updateVehicle("color", event.target.value.toUpperCase())} />
                  <input placeholder="Clase de servicio" value={vehicleForm.claseServicio} onChange={(event) => updateVehicle("claseServicio", event.target.value.toUpperCase())} />
                  <input placeholder="Número de motor" value={vehicleForm.numeroMotor} onChange={(event) => updateVehicle("numeroMotor", event.target.value.toUpperCase())} />
                  <input placeholder="Número de chasis" value={vehicleForm.numeroChasis} onChange={(event) => updateVehicle("numeroChasis", event.target.value.toUpperCase())} />
                  <input placeholder="Propietario" value={vehicleForm.propietario} onChange={(event) => updateVehicle("propietario", event.target.value.toUpperCase())} />
                  <input placeholder="Aseguradora SOAT" value={vehicleForm.aseguradoraSOAT} onChange={(event) => updateVehicle("aseguradoraSOAT", event.target.value.toUpperCase())} />
                  <input placeholder="Número SOAT" value={vehicleForm.numeroSOAT} onChange={(event) => updateVehicle("numeroSOAT", event.target.value.toUpperCase())} />
                  <div className="form-field">
                    <label>Inicio SOAT</label>
                    <input type="date" value={vehicleForm.fechaInicioSOAT || ""} onChange={(event) => updateVehicle("fechaInicioSOAT", event.target.value)} />
                  </div>
                  <div className="form-field">
                    <label>Vencimiento SOAT</label>
                    <input type="date" value={vehicleForm.fechaVencimientoSOAT || ""} onChange={(event) => updateVehicle("fechaVencimientoSOAT", event.target.value)} />
                  </div>
                  <div className="form-field">
                    <label>Inicio tecnomecánica</label>
                    <input type="date" value={vehicleForm.fechaInicioTecnomecanica || ""} onChange={(event) => updateVehicle("fechaInicioTecnomecanica", event.target.value)} />
                  </div>
                  <div className="form-field">
                    <label>Vencimiento tecnomecánica</label>
                    <input type="date" value={vehicleForm.fechaVencimientoTecnomecanica || ""} onChange={(event) => updateVehicle("fechaVencimientoTecnomecanica", event.target.value)} />
                  </div>
                  <div className="form-field">
                    <label>Fecha de matrícula</label>
                    <input type="date" value={vehicleForm.fechaMatricula || ""} onChange={(event) => updateVehicle("fechaMatricula", event.target.value)} />
                  </div>
                  <label className="checkbox-row">
                    <input type="checkbox" checked={vehicleForm.activo} onChange={(event) => updateVehicle("activo", event.target.checked)} />
                    Activo para preoperacionales
                  </label>
                  <textarea placeholder="Observaciones de hoja de vida" value={vehicleForm.observaciones || ""} onChange={(event) => updateVehicle("observaciones", event.target.value)} />
                  <div className="actions">
                    <button className="secondary" type="button" onClick={closeVehicleModal}>Cancelar</button>
                    <button className="primary" disabled={vehicleLoading} type="submit">{vehicleLoading ? "Guardando..." : "Guardar"}</button>
                  </div>
                </form>
              </section>
            </div>
          ) : null}

          {vehicleDetailModalOpen ? (
            <div className="modal-backdrop" role="presentation">
              <section className="modal-panel record-modal" role="dialog" aria-modal="true" aria-labelledby="vehicle-detail-modal-title">
                <div className="modal-header">
                  <div>
                    <p className="eyebrow">Hoja de vida vehicular</p>
                    <h2 id="vehicle-detail-modal-title">{selectedVehicleDetail ? `${selectedVehicleDetail.placa} - ${selectedVehicleDetail.tipo}` : "Vehiculo"}</h2>
                  </div>
                  <div className="row-actions">
                    {selectedVehicleDetail ? (
                      <a
                        className="primary compact button-link"
                        href={`/api/vehiculos/pdf?tipo=${encodeURIComponent(selectedVehicleDetail.tipo)}&placa=${encodeURIComponent(selectedVehicleDetail.placa)}`}
                      >
                        Descargar PDF
                      </a>
                    ) : null}
                    <button className="secondary compact" type="button" onClick={closeVehicleDetailModal}>Cerrar</button>
                  </div>
                </div>

                <div className="record-detail">
                  {vehicleDetailLoading ? <p className="empty loading-card"><span className="spinner" aria-hidden="true" /> Cargando historial del vehiculo...</p> : null}
                  {selectedVehicleDetail ? (
                    <>
                      <section className="record-summary-grid">
                        <article><span>Estado</span><strong>{selectedVehicleDetail.activo ? "Activo" : "Inactivo"}</strong></article>
                        <article><span>Tipo</span><strong>{selectedVehicleDetail.tipo}</strong></article>
                        <article><span>Placa</span><strong>{selectedVehicleDetail.placa}</strong></article>
                        <article><span>Marca</span><strong>{selectedVehicleDetail.marca || "No registrada"}</strong></article>
                        <article><span>Linea</span><strong>{selectedVehicleDetail.linea || "No registrada"}</strong></article>
                        <article><span>Modelo</span><strong>{selectedVehicleDetail.modelo || "No registrado"}</strong></article>
                        <article><span>Color</span><strong>{selectedVehicleDetail.color || "No registrado"}</strong></article>
                        <article><span>Clase servicio</span><strong>{selectedVehicleDetail.claseServicio || "No registrada"}</strong></article>
                        <article><span>Motor</span><strong>{selectedVehicleDetail.numeroMotor || "No registrado"}</strong></article>
                        <article><span>Chasis</span><strong>{selectedVehicleDetail.numeroChasis || "No registrado"}</strong></article>
                        <article><span>Propietario</span><strong>{selectedVehicleDetail.propietario || "No registrado"}</strong></article>
                        <article><span>Responsable</span><strong>{selectedVehicleDetail.responsable || "No registrado"}</strong></article>
                        <article><span>Aseguradora SOAT</span><strong>{selectedVehicleDetail.aseguradoraSOAT || "No registrada"}</strong></article>
                        <article><span>Numero SOAT</span><strong>{selectedVehicleDetail.numeroSOAT || "No registrado"}</strong></article>
                        <article><span>Inicio SOAT</span><strong>{selectedVehicleDetail.fechaInicioSOAT || "No registrado"}</strong></article>
                        <article><span>Vence SOAT</span><strong>{selectedVehicleDetail.fechaVencimientoSOAT || "No registrado"}</strong></article>
                        <article><span>Inicio tecnomecanica</span><strong>{selectedVehicleDetail.fechaInicioTecnomecanica || "No registrado"}</strong></article>
                        <article><span>Vence tecnomecanica</span><strong>{selectedVehicleDetail.fechaVencimientoTecnomecanica || "No registrado"}</strong></article>
                        <article><span>Fecha matricula</span><strong>{selectedVehicleDetail.fechaMatricula || "No registrada"}</strong></article>
                      </section>

                      <section className="record-section">
                        <h3>Observaciones de hoja de vida</h3>
                        <p className="record-notes">{selectedVehicleDetail.observaciones || "Sin observaciones registradas."}</p>
                      </section>

                      <section className="record-section">
                        <h3>Historial de novedades</h3>
                        {!vehicleNovedades.length && !vehicleDetailLoading ? <p className="empty">Este vehiculo no tiene novedades registradas.</p> : null}
                        {!!vehicleNovedades.length && (
                          <table className="compact-table">
                            <thead>
                              <tr>
                                <th>Consecutivo</th>
                                <th>Fecha</th>
                                <th>Tipo</th>
                                <th>Conductor</th>
                                <th>Lugar</th>
                                <th>Acciones</th>
                              </tr>
                            </thead>
                            <tbody>
                              {vehicleNovedades.map((item) => (
                                <tr key={item.id}>
                                  <td><strong>{item.codigo || `NOV-${String(item.id).padStart(4, "0")}`}</strong></td>
                                  <td>{item.creadoEn}</td>
                                  <td>{noveltyLabel(item.tipoNovedad, item.otroTipo)}</td>
                                  <td>{item.nombreConductor}</td>
                                  <td>{item.lugar}</td>
                                  <td className="row-actions">
                                    <button className="secondary compact" type="button" onClick={() => viewNovedad(item)}>Ver</button>
                                    <a className="secondary compact button-link" href={`/api/novedades/pdf?id=${item.id}`}>PDF</a>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </section>

                      <section className="record-section">
                        <h3>Historial de mantenimientos</h3>
                        {!vehicleMantenimientos.length && !vehicleDetailLoading ? <p className="empty">Este vehiculo no tiene mantenimientos registrados.</p> : null}
                        {!!vehicleMantenimientos.length && (
                          <table className="compact-table">
                            <thead>
                              <tr>
                                <th>Consecutivo</th>
                                <th>Fecha</th>
                                <th>Tipo</th>
                                <th>Responsable</th>
                                <th>Kilometraje</th>
                                <th>Lugar</th>
                                <th>Acciones</th>
                              </tr>
                            </thead>
                            <tbody>
                              {vehicleMantenimientos.map((item) => (
                                <tr key={item.id}>
                                  <td><strong>{item.codigo || `MAN-${String(item.id).padStart(4, "0")}`}</strong></td>
                                  <td>{item.creadoEn}</td>
                                  <td>{maintenanceLabel(item.tipoMantenimiento, item.otroTipo)}</td>
                                  <td>{item.nombreResponsable}</td>
                                  <td>{item.kilometraje || "-"}</td>
                                  <td>{item.lugar}</td>
                                  <td className="row-actions">
                                    <button className="secondary compact" type="button" onClick={() => viewMantenimiento(item)}>Ver</button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </section>
                    </>
                  ) : null}
                </div>
              </section>
            </div>
          ) : null}
        </section>
      ) : tab === "novedades" ? (
        <section className="user-admin">
          <div className="vehicle-toolbar">
            <div>
              <h2>Novedades reportadas</h2>
              <p>{novedades.length} reportes de recorrido registrados</p>
            </div>
            <button className="secondary" type="button" onClick={loadNovedades}>Actualizar</button>
          </div>

          <div className="table-wrap">
            {novedadLoading ? <p className="empty loading-card"><span className="spinner" aria-hidden="true" /> Cargando novedades...</p> : null}
            {!novedades.length && !novedadLoading ? <p className="empty">Aún no hay novedades reportadas durante recorridos.</p> : null}
            {!!novedades.length && (
              <table>
                <thead>
                  <tr>
                    <th>Consecutivo</th>
                    <th>Fecha</th>
                    <th>Vehiculo</th>
                    <th>Conductor</th>
                    <th>Documento</th>
                    <th>Tipo de novedad</th>
                    <th>Lugar</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleNovedades.map((row) => (
                    <tr key={row.id}>
                      <td><strong>{row.codigo || `NOV-${String(row.id).padStart(4, "0")}`}</strong></td>
                      <td>{row.creadoEn}</td>
                      <td><strong>{[row.tipoVehiculo, row.placa].filter(Boolean).join(" - ") || "-"}</strong></td>
                      <td><strong>{row.nombreConductor}</strong></td>
                      <td>{row.documentoConductor}</td>
                      <td>{noveltyLabel(row.tipoNovedad, row.otroTipo)}</td>
                      <td>{row.lugar}</td>
                      <td className="row-actions">
                        <button className="secondary compact" type="button" onClick={() => viewNovedad(row)}>Ver</button>
                        <a className="secondary compact button-link" href={`/api/novedades/pdf?id=${row.id}`}>PDF</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!!novedades.length && (
              <PaginationControls
                page={novedadPage}
                pageSize={novedadPageSize}
                total={novedades.length}
                onPageChange={setNovedadPage}
                onPageSizeChange={updateNovedadPageSize}
              />
            )}
          </div>
        </section>
      ) : tab === "mantenimientos" ? (
        <section className="user-admin">
          <div className="vehicle-toolbar">
            <div>
              <h2>Mantenimientos registrados</h2>
              <p>{mantenimientos.length} servicios de mantenimiento registrados</p>
            </div>
            <button className="secondary" type="button" onClick={loadMantenimientos}>Actualizar</button>
          </div>

          <div className="table-wrap">
            {mantenimientoLoading ? <p className="empty loading-card"><span className="spinner" aria-hidden="true" /> Cargando mantenimientos...</p> : null}
            {!mantenimientos.length && !mantenimientoLoading ? <p className="empty">Aun no hay mantenimientos registrados.</p> : null}
            {!!mantenimientos.length && (
              <table>
                <thead>
                  <tr>
                    <th>Consecutivo</th>
                    <th>Fecha</th>
                    <th>Vehiculo</th>
                    <th>Responsable</th>
                    <th>Tipo</th>
                    <th>Kilometraje</th>
                    <th>Lugar</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleMantenimientos.map((row) => (
                    <tr key={row.id}>
                      <td><strong>{row.codigo || `MAN-${String(row.id).padStart(4, "0")}`}</strong></td>
                      <td>{row.creadoEn}</td>
                      <td><strong>{[row.tipoVehiculo, row.placa].filter(Boolean).join(" - ")}</strong></td>
                      <td><strong>{row.nombreResponsable}</strong></td>
                      <td>{maintenanceLabel(row.tipoMantenimiento, row.otroTipo)}</td>
                      <td>{row.kilometraje || "-"}</td>
                      <td>{row.lugar}</td>
                      <td className="row-actions">
                        <button className="secondary compact" type="button" onClick={() => viewMantenimiento(row)}>Ver</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!!mantenimientos.length && (
              <PaginationControls
                page={mantenimientoPage}
                pageSize={mantenimientoPageSize}
                total={mantenimientos.length}
                onPageChange={setMantenimientoPage}
                onPageSizeChange={updateMantenimientoPageSize}
              />
            )}
          </div>
        </section>
      ) : tab === "conductores" ? (
        <section className="user-admin">
          <div className="vehicle-toolbar">
            <div>
              <h2>Conductores</h2>
              <p>{conductores.length} conductores registrados</p>
            </div>
            <div className="row-actions">
              <button className="secondary" type="button" onClick={loadConductores}>Actualizar</button>
              <button className="primary" type="button" onClick={newConductor}>Nuevo conductor</button>
            </div>
          </div>

          <div className="table-wrap conductors-table-wrap">
            {conductorLoading ? <p className="empty loading-card"><span className="spinner" aria-hidden="true" /> Actualizando conductores...</p> : null}
            {!conductores.length && !conductorLoading ? <p className="empty">Aun no hay conductores registrados.</p> : null}
            {!!conductores.length && (
              <table className="conductors-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Documento</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {conductores.map((conductor) => (
                    <tr key={conductor.id}>
                      <td><strong>{conductor.nombre}</strong></td>
                      <td>{conductor.documento}</td>
                      <td className="row-actions">
                        <details className="action-menu">
                          <summary>
                            <span>Acciones</span>
                            <ChevronDown size={14} aria-hidden="true" />
                          </summary>
                          <div className="action-menu-list">
                            <button type="button" onClick={() => viewConductorDetail(conductor)}>Ver</button>
                            <button type="button" onClick={() => editConductor(conductor)}>Editar</button>
                            <button type="button" onClick={() => requestToggleConductor(conductor)}>
                              {conductor.activo ? "Inactivar" : "Activar"}
                            </button>
                          </div>
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      ) : (
        <section className="user-admin">
          <div className="vehicle-toolbar">
            <div>
              <h2>Usuarios administrativos</h2>
              <p>{adminUsers.length} accesos registrados</p>
            </div>
          </div>

          <form className="admin-user-form" onSubmit={saveAdminUser}>
            <div className="form-field">
              <label>Nombre completo</label>
              <input required value={adminUserForm.nombre} onChange={(event) => updateAdminUser("nombre", event.target.value.toUpperCase())} placeholder="NOMBRE DEL USUARIO" />
            </div>
            <div className="form-field">
              <label>Correo electrónico</label>
              <input required type="email" value={adminUserForm.email} onChange={(event) => updateAdminUser("email", event.target.value.toLowerCase())} placeholder="usuario@empresa.com" />
            </div>
            <div className="form-field">
              <label>Contraseña temporal</label>
              <input required type="password" minLength={8} value={adminUserForm.password} onChange={(event) => updateAdminUser("password", event.target.value)} placeholder="Letras y números, mínimo 8 caracteres" />
            </div>
            <div className="form-field">
              <label>Rol</label>
              {canManageAllRoles ? (
                <select value={adminUserForm.rol} onChange={(event) => updateAdminUser("rol", event.target.value)}>
                  <option value="ADMIN">Administrador</option>
                  <option value="OPERADOR">Operador</option>
                </select>
              ) : (
                <input readOnly value="Operador" aria-label="Rol asignado: operador" />
              )}
            </div>
            <button className="primary app-button" disabled={adminUserLoading} type="submit">
              <span>{adminUserLoading ? "Creando..." : "Crear usuario"}</span>
              <UserPlus size={18} aria-hidden="true" />
            </button>
          </form>

          <div className="table-wrap">
            {adminUserLoading ? <p className="empty loading-card"><span className="spinner" aria-hidden="true" /> Actualizando usuarios...</p> : null}
            {!adminUsers.length && !adminUserLoading ? <p className="empty">Aún no hay usuarios administrativos registrados.</p> : null}
            {!!adminUsers.length && (
              <table>
                <thead>
                  <tr>
                    <th>Estado</th>
                    <th>Nombre</th>
                    <th>Correo</th>
                    <th>Rol</th>
                    <th>Último acceso</th>
                    <th>Creado</th>
                  </tr>
                </thead>
                <tbody>
                  {adminUsers.map((user) => (
                    <tr key={user.id}>
                      <td><span className={`status-pill ${user.activo ? "status-apto" : "status-no-apto"}`}>{user.activo ? "Activo" : "Inactivo"}</span></td>
                      <td><strong>{user.nombre}</strong></td>
                      <td>{user.email}</td>
                      <td>{user.rol}</td>
                      <td>{user.ultimoAcceso || "-"}</td>
                      <td>{user.creadoEn}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      )}

      {conductorDetailModalOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel conductor-detail-modal" role="dialog" aria-modal="true" aria-labelledby="conductor-detail-title">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Detalle del conductor</p>
                <h2 id="conductor-detail-title">{selectedConductorDetail?.nombre || "Conductor"}</h2>
              </div>
              <button className="secondary compact" type="button" onClick={closeConductorDetailModal}>Cerrar</button>
            </div>

            {selectedConductorDetail ? (
              <div className="record-detail">
                <section className="record-summary-grid">
                  <article><span>Estado</span><strong>{selectedConductorDetail.activo ? "Activo" : "Inactivo"}</strong></article>
                  <article><span>Documento</span><strong>{selectedConductorDetail.documento}</strong></article>
                  <article><span>Licencia</span><strong>{selectedConductorDetail.numeroLicencia || "No registrada"}</strong></article>
                  <article><span>Expedicion</span><strong>{selectedConductorDetail.fechaExpedicionLicencia || "No registrada"}</strong></article>
                  <article><span>Restricciones</span><strong>{selectedConductorDetail.restricciones || "No tiene"}</strong></article>
                  <article><span>Creado</span><strong>{selectedConductorDetail.creadoEn || "No registrado"}</strong></article>
                </section>

                <section className="record-section">
                  <h3>Categorias de licencia</h3>
                  {selectedConductorDetail.categoriasLicencia?.length ? (
                    <div className="license-detail-table">
                      <table className="conductors-table">
                        <thead>
                          <tr>
                            <th>Categoria</th>
                            <th>Vigencia</th>
                            <th>Tipo de servicio</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedConductorDetail.categoriasLicencia.map((category) => {
                            const detail = selectedConductorDetail.categoriasLicenciaDetalle?.[category] || {};
                            return (
                              <tr key={`view-category-${category}`}>
                                <td><strong>{category}</strong></td>
                                <td>{detail.fechaVigencia || "No registrada"}</td>
                                <td>{serviceLabel(detail.tipoServicio)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="record-notes">No hay categorias de licencia registradas.</p>
                  )}
                </section>

                <section className="record-section">
                  <h3>Fotos de licencia</h3>
                  {selectedConductorDetail.licenciaFrenteDataUrl || selectedConductorDetail.licenciaReversoDataUrl ? (
                    <div className="record-photo-grid">
                      {[
                        ["Frente de licencia", selectedConductorDetail.licenciaFrenteDataUrl],
                        ["Reverso de licencia", selectedConductorDetail.licenciaReversoDataUrl]
                      ].filter(([, dataUrl]) => Boolean(dataUrl)).map(([etiqueta, dataUrl]) => (
                        <figure key={etiqueta}>
                          <button className="record-photo-preview" type="button" onClick={() => setSelectedPhoto({ etiqueta, dataUrl })}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={dataUrl} alt={etiqueta} />
                            <span><Eye size={16} aria-hidden="true" /> Ver imagen completa</span>
                          </button>
                          <figcaption>{etiqueta}</figcaption>
                        </figure>
                      ))}
                    </div>
                  ) : (
                    <p className="record-notes">No hay fotos de licencia registradas.</p>
                  )}
                </section>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}

      {conductorModalOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel conductor-modal" role="dialog" aria-modal="true" aria-labelledby="conductor-modal-title">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Gestion de conductores</p>
                <h2 id="conductor-modal-title">{conductorForm.documento ? "Editar conductor" : "Nuevo conductor"}</h2>
              </div>
              <button className="secondary compact" type="button" onClick={() => setConductorModalOpen(false)}>Cerrar</button>
            </div>

            <form className="vehicle-form modal-form" onSubmit={saveConductor}>
              <div className="form-field">
                <label>Nombre completo</label>
                <input required value={conductorForm.nombre || ""} onChange={(event) => updateConductor("nombre", event.target.value.toUpperCase())} placeholder="NOMBRE DEL CONDUCTOR" />
              </div>
              <div className="form-field">
                <label>Documento</label>
                <input required inputMode="numeric" value={conductorForm.documento || ""} onChange={(event) => updateConductor("documento", event.target.value.replace(/\D/g, ""))} placeholder="Numero de documento" />
              </div>
              <div className="form-field">
                <label>Numero de licencia</label>
                <input value={conductorForm.numeroLicencia || ""} onChange={(event) => updateConductor("numeroLicencia", event.target.value.toUpperCase())} placeholder="Numero de licencia" />
              </div>
              <div className="form-field">
                <label>Fecha de expedicion</label>
                <input type="date" value={conductorForm.fechaExpedicionLicencia || ""} onChange={(event) => updateConductor("fechaExpedicionLicencia", event.target.value)} />
              </div>
              <div className="form-field full-field">
                <label>Restricciones</label>
                <textarea
                  value={conductorForm.restricciones || ""}
                  onChange={(event) => updateConductor("restricciones", event.target.value.toUpperCase())}
                  placeholder="Si no aplica, dejar vacio. Ej: USA LENTES, RESTRICCION MEDICA, SOLO VEHICULO ADAPTADO"
                />
              </div>

              <section className="license-category-field">
                <h3>Categoria de licencia</h3>
                <div className="license-category-grid">
                  {LICENSE_CATEGORIES.map((category) => (
                    <label key={category}>
                      <input
                        type="checkbox"
                        checked={(conductorForm.categoriasLicencia || []).includes(category)}
                        onChange={() => toggleConductorCategory(category)}
                      />
                      <span>{category}</span>
                    </label>
                  ))}
                </div>
                {!!(conductorForm.categoriasLicencia || []).length && (
                  <div className="license-detail-grid">
                    {(conductorForm.categoriasLicencia || []).map((category) => {
                      const detail = (conductorForm.categoriasLicenciaDetalle || {})[category] || {};
                      return (
                        <article key={`detail-${category}`}>
                          <strong>{category}</strong>
                          <div className="form-field">
                            <label>Fecha de vigencia</label>
                            <input
                              type="date"
                              value={detail.fechaVigencia || ""}
                              onChange={(event) => updateConductorCategoryDetail(category, "fechaVigencia", event.target.value)}
                            />
                          </div>
                          <div className="form-field">
                            <label>Tipo de servicio</label>
                            <select
                              value={detail.tipoServicio || ""}
                              onChange={(event) => updateConductorCategoryDetail(category, "tipoServicio", event.target.value)}
                            >
                              <option value="">Seleccione</option>
                              <option value="PARTICULAR">Particular</option>
                              <option value="PUBLICO">Servicio publico</option>
                            </select>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="license-upload-grid">
                <label className="license-upload-card">
                  <span><Camera size={16} aria-hidden="true" /> Frente de licencia</span>
                  {conductorForm.licenciaFrenteDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={conductorForm.licenciaFrenteDataUrl} alt="Frente de licencia" />
                  ) : <strong>Seleccionar foto</strong>}
                  <input accept="image/*" type="file" onChange={(event) => handleConductorLicensePhoto("licenciaFrenteDataUrl", event.target.files?.[0])} />
                </label>
                <label className="license-upload-card">
                  <span><Camera size={16} aria-hidden="true" /> Reverso de licencia</span>
                  {conductorForm.licenciaReversoDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={conductorForm.licenciaReversoDataUrl} alt="Reverso de licencia" />
                  ) : <strong>Seleccionar foto</strong>}
                  <input accept="image/*" type="file" onChange={(event) => handleConductorLicensePhoto("licenciaReversoDataUrl", event.target.files?.[0])} />
                </label>
              </section>

              <div className="actions">
                <button className="secondary" type="button" onClick={() => setConductorModalOpen(false)}>Cancelar</button>
                <button className="primary" disabled={conductorLoading} type="submit">
                  {conductorLoading ? "Guardando..." : "Guardar conductor"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {conductorStatusModalOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel status-modal" role="dialog" aria-modal="true" aria-labelledby="conductor-status-title">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Estado del conductor</p>
                <h2 id="conductor-status-title">{selectedConductorStatus?.activo ? "Inactivar conductor" : "Activar conductor"}</h2>
              </div>
              <button className="secondary compact" type="button" onClick={() => setConductorStatusModalOpen(false)}>Cerrar</button>
            </div>
            <div className="status-modal-body">
              <p>
                {selectedConductorStatus?.activo
                  ? `El conductor ${selectedConductorStatus?.nombre} dejara de aparecer en las busquedas de los formularios.`
                  : `El conductor ${selectedConductorStatus?.nombre} volvera a estar disponible en los formularios.`}
              </p>
              <div className="actions">
                <button className="secondary" type="button" onClick={() => setConductorStatusModalOpen(false)}>Cancelar</button>
                <button className="primary" disabled={conductorLoading} type="button" onClick={confirmToggleConductor}>
                  {selectedConductorStatus?.activo ? "Inactivar" : "Activar"}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {profileModalOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Cuenta administrativa</p>
                <h2 id="profile-modal-title">Mi perfil</h2>
              </div>
              <button className="secondary compact" type="button" onClick={() => setProfileModalOpen(false)}>Cerrar</button>
            </div>

            <form className="profile-form" onSubmit={saveProfile}>
              <section className="profile-photo-card">
                <div className="profile-photo-preview">
                  {profileForm.avatarDataUrl && !profileForm.removeAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profileForm.avatarDataUrl} alt="Imagen de perfil" />
                  ) : <span>{avatarInitials(profileForm.nombre)}</span>}
                </div>
                <div className="profile-photo-actions">
                  <label className="secondary button-link compact">
                    <Camera size={16} aria-hidden="true" />
                    Cambiar imagen
                    <input accept="image/*" type="file" onChange={(event) => handleProfileAvatar(event.target.files?.[0])} />
                  </label>
                  <button
                    className="secondary compact"
                    type="button"
                    onClick={() => updateProfile("removeAvatar", true)}
                    disabled={!profileForm.avatarDataUrl}
                  >
                    Quitar imagen
                  </button>
                </div>
              </section>

              <section className="profile-form-grid">
                <div className="form-field">
                  <label>Nombre completo</label>
                  <input required value={profileForm.nombre} onChange={(event) => updateProfile("nombre", event.target.value.toUpperCase())} />
                </div>
                <div className="form-field">
                  <label>Correo electrónico</label>
                  <input required type="email" value={profileForm.email} onChange={(event) => updateProfile("email", event.target.value.toLowerCase())} />
                </div>
              </section>

              <section className="password-panel">
                <h3><KeyRound size={18} aria-hidden="true" /> Cambiar contraseña</h3>
                <div className="profile-form-grid">
                  <div className="form-field">
                    <label>Contraseña actual</label>
                    <input type="password" value={profileForm.currentPassword} onChange={(event) => updateProfile("currentPassword", event.target.value)} />
                  </div>
                  <div className="form-field">
                    <label>Nueva contraseña</label>
                    <input type="password" minLength={8} value={profileForm.newPassword} onChange={(event) => updateProfile("newPassword", event.target.value)} />
                  </div>
                  <div className="form-field">
                    <label>Confirmar nueva contraseña</label>
                    <input type="password" minLength={8} value={profileForm.confirmPassword} onChange={(event) => updateProfile("confirmPassword", event.target.value)} />
                  </div>
                </div>
              </section>

              <div className="actions profile-actions">
                <button className="secondary" type="button" onClick={() => setProfileModalOpen(false)}>Cancelar</button>
                <button className="primary app-button" disabled={profileLoading} type="submit">
                  <span>{profileLoading ? "Guardando..." : "Guardar perfil"}</span>
                  <Save size={18} aria-hidden="true" />
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {recordModalOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel record-modal" role="dialog" aria-modal="true" aria-labelledby="record-modal-title">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Registro preoperacional</p>
                <h2 id="record-modal-title">{selectedRecord ? `${selectedRecord.placa} · ${selectedRecord.tipo}` : "Cargando registro"}</h2>
              </div>
              <div className="row-actions">
                {selectedRecord ? <a className="primary compact button-link" href={`/api/preoperacionales/pdf?id=${selectedRecord.id}`}>Descargar PDF</a> : null}
                <button className="secondary compact" type="button" onClick={closeRecordModal}>Cerrar</button>
              </div>
            </div>

            <div className="record-detail">
              {recordLoading ? <p className="empty loading-card"><span className="spinner" aria-hidden="true" /> Cargando registro completo...</p> : null}
              {selectedRecord ? (
                <>
                  <section className="record-summary-grid">
                    <article><span>Consecutivo</span><strong>{selectedRecord.codigo || `PRE-${selectedRecord.id < 100 ? String(selectedRecord.id).padStart(2, "0") : selectedRecord.id}`}</strong></article>
                    <article><span>Fecha</span><strong>{selectedRecord.fecha}</strong></article>
                    <article><span>Usuario</span><strong>{selectedRecord.usuario}</strong></article>
                    <article><span>Documento</span><strong>{selectedRecord.documento}</strong></article>
                    <article><span>Destino</span><strong>{selectedRecord.destino}</strong></article>
                    <article><span>Kilometraje</span><strong>{selectedRecord.kilometraje}</strong></article>
                    <article><span>Modelo</span><strong>{selectedRecord.modelo}</strong></article>
                  </section>

                  {selectedRecordAnalysis ? (
                    <section className={`record-analysis analysis-${selectedRecordAnalysis.estado.toLowerCase().replaceAll(" ", "-")}`}>
                      <div>
                        <span>Dictamen de aptitud</span>
                        <strong>{selectedRecordAnalysis.estado}</strong>
                      </div>
                      <p>{selectedRecordAnalysis.conclusion}</p>
                      {!!selectedRecordAnalysis.badItems.length && (
                        <ul>
                          {selectedRecordAnalysis.badItems.map((item) => (
                            <li key={item.key}>
                              {item.criticalGroup ? `${item.criticalGroup} crítico: ` : ""}{item.section} - {item.label}
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                  ) : null}

                  <section className="record-section">
                    <h3>Checklist diligenciado</h3>
                    {(CHECKLISTS[selectedRecord.tipo] || []).map((section) => (
                      <div className="record-check-section" key={section.section}>
                        <h4>{section.section}</h4>
                        <div className="record-check-grid">
                          {section.items.map(([key, label]) => {
                            const value = selectedRecord.checklist?.[key] || "Sin dato";
                            return (
                              <div className="record-check-item" key={key}>
                                <span>{label}</span>
                                <strong className={`status-pill status-${value === "Malo" || value === "No cumple" ? "no-apto" : value === "Regular" || value === "No aplica" ? "observaciones" : "apto"}`}>
                                  {value}
                                </strong>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </section>

                  <section className="record-section">
                    <h3>Observaciones</h3>
                    <p className="record-notes">{selectedRecord.observaciones || "Sin observaciones registradas."}</p>
                  </section>

                  <section className="record-section">
                    <h3>Evidencia fotográfica</h3>
                    {selectedRecord.fotos?.length ? (
                      <div className="record-photo-grid">
                        {selectedRecord.fotos.map((foto) => (
                          <figure key={foto.codigo}>
                            <button className="record-photo-preview" type="button" onClick={() => setSelectedPhoto(foto)}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={foto.dataUrl} alt={foto.etiqueta} />
                              <span><Eye size={16} aria-hidden="true" /> Ver completa</span>
                            </button>
                            <figcaption>{foto.etiqueta}</figcaption>
                          </figure>
                        ))}
                      </div>
                    ) : <p className="empty">Este registro no tiene fotos asociadas.</p>}
                  </section>
                </>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}

      {novedadModalOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel record-modal" role="dialog" aria-modal="true" aria-labelledby="novedad-modal-title">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Reporte de novedad</p>
                <h2 id="novedad-modal-title">{selectedNovedad ? selectedNovedad.codigo || `NOV-${String(selectedNovedad.id).padStart(4, "0")}` : "Cargando novedad"}</h2>
              </div>
              <div className="row-actions">
                {selectedNovedad ? <a className="primary compact button-link" href={`/api/novedades/pdf?id=${selectedNovedad.id}`}>Descargar PDF</a> : null}
                <button
                  className="secondary compact"
                  type="button"
                  onClick={() => {
                    setNovedadModalOpen(false);
                    setSelectedNovedad(null);
                    setSelectedPhoto(null);
                  }}
                >
                  Cerrar
                </button>
              </div>
            </div>

            <div className="record-detail">
              {novedadLoading ? <p className="empty loading-card"><span className="spinner" aria-hidden="true" /> Cargando reporte completo...</p> : null}
              {selectedNovedad ? (
                <>
                  <section className="record-summary-grid">
                    <article><span>Consecutivo</span><strong>{selectedNovedad.codigo || `NOV-${String(selectedNovedad.id).padStart(4, "0")}`}</strong></article>
                    <article><span>Fecha</span><strong>{selectedNovedad.creadoEn}</strong></article>
                    <article><span>Vehiculo</span><strong>{[selectedNovedad.tipoVehiculo, selectedNovedad.placa].filter(Boolean).join(" - ") || "No registrado"}</strong></article>
                    <article><span>Conductor</span><strong>{selectedNovedad.nombreConductor}</strong></article>
                    <article><span>Documento</span><strong>{selectedNovedad.documentoConductor}</strong></article>
                    <article><span>Tipo</span><strong>{noveltyLabel(selectedNovedad.tipoNovedad, selectedNovedad.otroTipo)}</strong></article>
                    <article><span>Lugar</span><strong>{selectedNovedad.lugar}</strong></article>
                    <article>
                      <span>Ubicación</span>
                      <strong>
                        {selectedNovedad.latitud && selectedNovedad.longitud ? (
                          <a
                            className="inline-map-link"
                            href={`https://www.google.com/maps?q=${selectedNovedad.latitud},${selectedNovedad.longitud}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Ver mapa
                          </a>
                        ) : "Sin geolocalización"}
                      </strong>
                    </article>
                  </section>

                  <section className="record-section">
                    <h3>Observaciones generales</h3>
                    <p className="record-notes">{selectedNovedad.observaciones}</p>
                  </section>

                  <section className="record-section">
                    <h3>Fotos de la novedad</h3>
                    {selectedNovedad.fotos?.length ? (
                      <div className="record-photo-grid">
                        {selectedNovedad.fotos.map((foto) => (
                          <figure key={foto.id}>
                            <button className="record-photo-preview" type="button" onClick={() => setSelectedPhoto(foto)}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={foto.dataUrl} alt={foto.etiqueta} />
                              <span><Eye size={16} aria-hidden="true" /> Ver completa</span>
                            </button>
                            <figcaption>{foto.etiqueta}</figcaption>
                          </figure>
                        ))}
                      </div>
                    ) : <p className="empty">Este reporte no tiene fotos asociadas.</p>}
                  </section>
                </>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}

      {mantenimientoModalOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel record-modal" role="dialog" aria-modal="true" aria-labelledby="mantenimiento-modal-title">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Registro de mantenimiento</p>
                <h2 id="mantenimiento-modal-title">{selectedMantenimiento ? selectedMantenimiento.codigo || `MAN-${String(selectedMantenimiento.id).padStart(4, "0")}` : "Cargando mantenimiento"}</h2>
              </div>
              <button
                className="secondary compact"
                type="button"
                onClick={() => {
                  setMantenimientoModalOpen(false);
                  setSelectedMantenimiento(null);
                  setSelectedPhoto(null);
                }}
              >
                Cerrar
              </button>
            </div>

            <div className="record-detail">
              {mantenimientoLoading ? <p className="empty loading-card"><span className="spinner" aria-hidden="true" /> Cargando mantenimiento completo...</p> : null}
              {selectedMantenimiento ? (
                <>
                  <section className="record-summary-grid">
                    <article><span>Consecutivo</span><strong>{selectedMantenimiento.codigo || `MAN-${String(selectedMantenimiento.id).padStart(4, "0")}`}</strong></article>
                    <article><span>Fecha</span><strong>{selectedMantenimiento.creadoEn}</strong></article>
                    <article><span>Vehiculo</span><strong>{[selectedMantenimiento.tipoVehiculo, selectedMantenimiento.placa].filter(Boolean).join(" - ")}</strong></article>
                    <article><span>Responsable</span><strong>{selectedMantenimiento.nombreResponsable}</strong></article>
                    <article><span>Documento</span><strong>{selectedMantenimiento.documentoResponsable}</strong></article>
                    <article><span>Tipo</span><strong>{maintenanceLabel(selectedMantenimiento.tipoMantenimiento, selectedMantenimiento.otroTipo)}</strong></article>
                    <article><span>Kilometraje</span><strong>{selectedMantenimiento.kilometraje || "No registrado"}</strong></article>
                    <article><span>Lugar</span><strong>{selectedMantenimiento.lugar}</strong></article>
                    <article><span>Proveedor</span><strong>{selectedMantenimiento.proveedor || "No registrado"}</strong></article>
                    <article><span>Costo</span><strong>{selectedMantenimiento.costo ? `$ ${Number(selectedMantenimiento.costo).toLocaleString("es-CO")}` : "No registrado"}</strong></article>
                  </section>

                  <section className="record-section">
                    <h3>Observaciones del mantenimiento</h3>
                    <p className="record-notes">{selectedMantenimiento.observaciones}</p>
                  </section>

                  <section className="record-section">
                    <h3>Fotos de evidencia</h3>
                    {selectedMantenimiento.fotos?.length ? (
                      <div className="record-photo-grid">
                        {selectedMantenimiento.fotos.map((foto) => (
                          <figure key={foto.id}>
                            <button className="record-photo-preview" type="button" onClick={() => setSelectedPhoto(foto)}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={foto.dataUrl} alt={foto.etiqueta} />
                              <span><Eye size={16} aria-hidden="true" /> Ver completa</span>
                            </button>
                            <figcaption>{foto.etiqueta}</figcaption>
                          </figure>
                        ))}
                      </div>
                    ) : <p className="empty">Este mantenimiento no tiene fotos asociadas.</p>}
                  </section>
                </>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}

      {selectedPhoto ? (
        <div className="image-preview-backdrop" role="presentation" onClick={() => setSelectedPhoto(null)}>
          <section className="image-preview-panel" role="dialog" aria-modal="true" aria-label={`Vista completa: ${selectedPhoto.etiqueta}`} onClick={(event) => event.stopPropagation()}>
            <div className="image-preview-header">
              <div>
                <p className="eyebrow">Evidencia fotográfica</p>
                <h2>{selectedPhoto.etiqueta}</h2>
              </div>
              <button className="secondary compact" type="button" onClick={() => setSelectedPhoto(null)}>Cerrar</button>
            </div>
            <div className="image-preview-body">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selectedPhoto.dataUrl} alt={selectedPhoto.etiqueta} />
            </div>
          </section>
        </div>
      ) : null}

      {assignmentModalOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel assignment-modal" role="dialog" aria-modal="true" aria-labelledby="assignment-modal-title">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Asignación de conductor</p>
                <h2 id="assignment-modal-title">{assignmentVehicle ? `${assignmentVehicle.placa} · ${assignmentVehicle.tipo}` : "Vehículo"}</h2>
              </div>
              <button className="secondary compact" type="button" onClick={closeAssignmentModal}>Cerrar</button>
            </div>

            <div className="assignment-detail">
              <form className="assignment-form" onSubmit={saveAssignment}>
                <div className="form-field">
                  <label>Conductor asignado</label>
                  <input
                    list="conductores-asignacion"
                    required
                    placeholder="Nombre completo del conductor"
                    value={assignmentForm.conductorNombre}
                    onChange={(event) => updateAssignmentConductorName(event.target.value)}
                  />
                  <datalist id="conductores-asignacion">
                    {activeConductores.map((conductor) => (
                      <option key={`asignacion-${conductor.id}`} value={conductor.nombre}>
                        {conductor.documento}
                      </option>
                    ))}
                  </datalist>
                </div>
                <div className="form-field">
                  <label>Documento</label>
                  <input
                    inputMode="numeric"
                    placeholder="Documento del conductor"
                    value={assignmentForm.conductorDocumento}
                    onChange={(event) => updateAssignment("conductorDocumento", event.target.value.replace(/\D/g, ""))}
                  />
                </div>
                <div className="form-field assignment-notes-field">
                  <label>Observaciones</label>
                  <textarea
                    placeholder="Motivo del cambio, turno, proyecto o comentario"
                    value={assignmentForm.observaciones}
                    onChange={(event) => updateAssignment("observaciones", event.target.value)}
                  />
                </div>
                <div className="actions assignment-actions">
                  <button className="secondary" type="button" onClick={closeAssignmentModal}>Cancelar</button>
                  <button className="primary" disabled={assignmentLoading} type="submit">{assignmentLoading ? "Asignando..." : "Asignar conductor"}</button>
                </div>
              </form>

              <section className="assignment-history">
                <h3>Historial de asignaciones</h3>
                {assignmentLoading ? <p className="empty loading-card"><span className="spinner" aria-hidden="true" /> Cargando historial...</p> : null}
                {!assignmentHistory.length && !assignmentLoading ? <p className="empty">Este vehículo aún no tiene asignaciones registradas.</p> : null}
                {!!assignmentHistory.length && (
                  <table className="compact-table">
                    <thead>
                      <tr>
                        <th>Estado</th>
                        <th>Conductor</th>
                        <th>Documento</th>
                        <th>Inicio</th>
                        <th>Fin</th>
                        <th>Observaciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignmentHistory.map((item) => (
                        <tr key={item.id}>
                          <td><span className={`status-pill ${item.activo ? "status-apto" : "status-observaciones"}`}>{item.activo ? "Actual" : "Finalizada"}</span></td>
                          <td><strong>{item.conductorNombre}</strong></td>
                          <td>{item.conductorDocumento || "-"}</td>
                          <td>{item.fechaInicio}</td>
                          <td>{item.fechaFin || "-"}</td>
                          <td>{item.observaciones || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
