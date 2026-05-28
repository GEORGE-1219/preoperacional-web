"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bike,
  Camera,
  Car,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Gauge,
  IdCard,
  Navigation,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Truck,
  UserRound,
  Wrench,
  X
} from "lucide-react";
import { CHECKLISTS, checklistOptions } from "@/lib/checklist";
import { analyzeInspection } from "@/lib/inspection-analysis";
import { photoRequirements } from "@/lib/photo-requirements";

const steps = ["Usuario", "Tipo", "Vehículo", "Checklist", "Finalizado"];

const vehicleTypeMeta = {
  MOTO: { label: "Moto", icon: Bike, emoji: "🏍️" },
  CARRO: { label: "Carro", icon: Car, emoji: "🚗" },
  GRUA: { label: "Grúa", icon: Truck, emoji: "🚛" }
};

const noveltyTypes = [
  ["DANO_GENERAL", "Daño general"],
  ["DANO_MOTOR", "Daño motor"],
  ["ACCIDENTE_TRANSITO", "Accidente de tránsito"],
  ["PINCHAZO", "Pinchazo"],
  ["OTRO", "Otro"]
];

const maintenanceTypes = [
  ["PREVENTIVO", "Mantenimiento preventivo"],
  ["CORRECTIVO", "Mantenimiento correctivo"],
  ["CAMBIO_ACEITE", "Cambio de aceite"],
  ["OTRO", "Otro"]
];

const emptyNovedad = {
  nombreConductor: "",
  documentoConductor: "",
  tipoVehiculo: "",
  placa: "",
  tipoNovedad: "DANO_GENERAL",
  otroTipo: "",
  lugar: "",
  latitud: "",
  longitud: "",
  observaciones: ""
};

const emptyMantenimiento = {
  nombreResponsable: "",
  documentoResponsable: "",
  tipoVehiculo: "",
  placa: "",
  tipoMantenimiento: "PREVENTIVO",
  otroTipo: "",
  kilometraje: "",
  lugar: "",
  proveedor: "",
  costo: "",
  observaciones: ""
};

function VehicleIcon({ tipo, size = 20 }) {
  const Icon = vehicleTypeMeta[tipo]?.icon;
  return Icon ? <Icon size={size} aria-hidden="true" /> : null;
}

async function api(path, options) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.mensaje || "No se pudo completar la operación.");
  return data;
}

function compressImage(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("El archivo debe ser una imagen."));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const image = new window.Image();
      image.onload = () => {
        const maxSide = 1200;
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));

        const ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };
      image.onerror = () => reject(new Error("No se pudo leer la imagen."));
      image.src = reader.result;
    };
    reader.onerror = () => reject(new Error("No se pudo cargar el archivo."));
    reader.readAsDataURL(file);
  });
}

export default function HomePage() {
  const [appMode, setAppMode] = useState("preoperacional");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [alert, setAlert] = useState(null);
  const [usuario, setUsuario] = useState({ nombre: "", documento: "" });
  const [conductoresCatalogo, setConductoresCatalogo] = useState([]);
  const [usuarioSugerencias, setUsuarioSugerencias] = useState([]);
  const [tipo, setTipo] = useState("");
  const [vehiculos, setVehiculos] = useState([]);
  const [vehiculo, setVehiculo] = useState(null);
  const [form, setForm] = useState({ sitioDestino: "", kilometraje: "", observaciones: "" });
  const [checklist, setChecklist] = useState({});
  const [fotos, setFotos] = useState({});
  const [lastAnalysis, setLastAnalysis] = useState(null);
  const [lastPreoperacional, setLastPreoperacional] = useState(null);
  const [novedad, setNovedad] = useState(emptyNovedad);
  const [novedadConductorSugerencias, setNovedadConductorSugerencias] = useState([]);
  const [novedadVehiculos, setNovedadVehiculos] = useState([]);
  const [novedadFotos, setNovedadFotos] = useState({});
  const [novedadSaved, setNovedadSaved] = useState(null);
  const [mantenimiento, setMantenimiento] = useState(emptyMantenimiento);
  const [mantenimientoResponsableSugerencias, setMantenimientoResponsableSugerencias] = useState([]);
  const [mantenimientoVehiculos, setMantenimientoVehiculos] = useState([]);
  const [mantenimientoFotos, setMantenimientoFotos] = useState({});
  const [mantenimientoSaved, setMantenimientoSaved] = useState(null);

  const sections = useMemo(() => CHECKLISTS[tipo] || [], [tipo]);
  const statusOptions = useMemo(() => checklistOptions(tipo), [tipo]);
  const requiredPhotos = useMemo(() => photoRequirements(tipo), [tipo]);
  const inspectionAnalysis = useMemo(() => analyzeInspection(tipo, checklist), [tipo, checklist]);
  const pct = ((step - 1) / 4) * 100;
  const AlertIcon = alert?.type === "success" ? CheckCircle2 : alert?.type === "info" ? ShieldCheck : AlertTriangle;

  useEffect(() => {
    let active = true;

    api("/api/usuarios?all=1")
      .then((data) => {
        if (active) setConductoresCatalogo(data);
      })
      .catch(() => {
        if (active) setConductoresCatalogo([]);
      });

    return () => {
      active = false;
    };
  }, []);

  function show(message, type = "error") {
    setAlert({ message, type });
  }

  function startLoading(message) {
    setLoading(true);
    setLoadingMessage(message);
  }

  function stopLoading() {
    setLoading(false);
    setLoadingMessage("");
  }

  function buscarConductores(term, setSuggestions) {
    const value = term.trim().toUpperCase();
    if (value.length < 2) {
      setSuggestions([]);
      return [];
    }

    const data = conductoresCatalogo
      .filter((conductor) => conductor.nombre.includes(value) || conductor.documento.includes(value))
      .slice(0, 10);
    setSuggestions(data);
    return data;
  }

  function handleUsuarioNombre(value) {
    const nombre = value.toUpperCase();
    setUsuario((current) => ({ ...current, nombre }));
    const data = buscarConductores(nombre, setUsuarioSugerencias);
    const selected = data.find((item) => item.nombre === nombre);
    if (selected) {
      setUsuario({ nombre: selected.nombre, documento: selected.documento });
    }
  }

  function handleNovedadConductorNombre(value) {
    const nombreConductor = value.toUpperCase();
    setNovedad((current) => ({ ...current, nombreConductor }));
    const data = buscarConductores(nombreConductor, setNovedadConductorSugerencias);
    const selected = data.find((item) => item.nombre === nombreConductor);
    if (selected) {
      setNovedad((current) => ({
        ...current,
        nombreConductor: selected.nombre,
        documentoConductor: selected.documento
      }));
    }
  }

  function handleMantenimientoResponsableNombre(value) {
    const nombreResponsable = value.toUpperCase();
    setMantenimiento((current) => ({ ...current, nombreResponsable }));
    const data = buscarConductores(nombreResponsable, setMantenimientoResponsableSugerencias);
    const selected = data.find((item) => item.nombre === nombreResponsable);
    if (selected) {
      setMantenimiento((current) => ({
        ...current,
        nombreResponsable: selected.nombre,
        documentoResponsable: selected.documento
      }));
    }
  }

  function findMissingChecklistItem() {
    for (const section of sections) {
      for (const [key, label] of section.items) {
        if (!checklist[key]) {
          return `${section.section}: ${label}`;
        }
      }
    }

    return null;
  }

  function findMissingPhoto() {
    for (const [codigo, etiqueta] of requiredPhotos) {
      if (!fotos[codigo]?.dataUrl) return etiqueta;
    }

    return null;
  }

  async function handlePhotoChange(codigo, etiqueta, file) {
    if (!file) return;

    startLoading(`Procesando foto: ${etiqueta}...`);
    try {
      const dataUrl = await compressImage(file);
      setFotos((current) => ({
        ...current,
        [codigo]: {
          codigo,
          etiqueta,
          dataUrl,
          nombre: file.name
        }
      }));
      show(`Foto "${etiqueta}" cargada correctamente.`, "success");
    } catch (error) {
      show(error.message);
    } finally {
      stopLoading();
    }
  }

  async function handleNovedadPhotos(files) {
    const selected = Array.from(files || []);
    if (!selected.length) return;

    startLoading("Procesando fotos de la novedad...");
    try {
      const entries = await Promise.all(selected.map(async (file, index) => {
        const dataUrl = await compressImage(file);
        const id = `${Date.now()}-${index}-${file.name}`;
        return [id, { id, etiqueta: `Foto ${Object.keys(novedadFotos).length + index + 1}`, dataUrl, nombre: file.name }];
      }));
      setNovedadFotos((current) => ({ ...current, ...Object.fromEntries(entries) }));
      show(`${selected.length} foto(s) cargada(s) correctamente.`, "success");
    } catch (error) {
      show(error.message);
    } finally {
      stopLoading();
    }
  }

  function removeNovedadPhoto(id) {
    setNovedadFotos((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  async function handleMantenimientoPhotos(files) {
    const selected = Array.from(files || []);
    if (!selected.length) return;

    startLoading("Procesando fotos del mantenimiento...");
    try {
      const entries = await Promise.all(selected.map(async (file, index) => {
        const dataUrl = await compressImage(file);
        const id = `${Date.now()}-${index}-${file.name}`;
        return [id, { id, etiqueta: `Foto ${Object.keys(mantenimientoFotos).length + index + 1}`, dataUrl, nombre: file.name }];
      }));
      setMantenimientoFotos((current) => ({ ...current, ...Object.fromEntries(entries) }));
      show(`${selected.length} foto(s) cargada(s) correctamente.`, "success");
    } catch (error) {
      show(error.message);
    } finally {
      stopLoading();
    }
  }

  function removeMantenimientoPhoto(id) {
    setMantenimientoFotos((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  function geolocalizarNovedad() {
    if (!navigator.geolocation) {
      show("Este navegador no permite geolocalización.");
      return;
    }

    startLoading("Obteniendo ubicación...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setNovedad((current) => ({
          ...current,
          latitud: position.coords.latitude.toFixed(7),
          longitud: position.coords.longitude.toFixed(7)
        }));
        show("Ubicación registrada correctamente.", "success");
        stopLoading();
      },
      () => {
        show("No se pudo obtener la ubicación. Verifique permisos del navegador.");
        stopLoading();
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }

  async function elegirTipoNovedadVehiculo(nextTipo) {
    setNovedad((current) => ({ ...current, tipoVehiculo: nextTipo, placa: "" }));
    setNovedadVehiculos([]);
    if (!nextTipo) return;

    startLoading("Cargando placas disponibles...");
    try {
      const data = await api(`/api/vehiculos?tipo=${encodeURIComponent(nextTipo)}`);
      setNovedadVehiculos(data);
      if (!data.length) show("No hay vehiculos activos para el tipo seleccionado.", "info");
    } catch (error) {
      show(error.message);
    } finally {
      stopLoading();
    }
  }

  async function elegirTipoMantenimientoVehiculo(nextTipo) {
    setMantenimiento((current) => ({ ...current, tipoVehiculo: nextTipo, placa: "" }));
    setMantenimientoVehiculos([]);
    if (!nextTipo) return;

    startLoading("Cargando placas disponibles...");
    try {
      const data = await api(`/api/vehiculos?tipo=${encodeURIComponent(nextTipo)}`);
      setMantenimientoVehiculos(data);
      if (!data.length) show("No hay vehiculos activos para el tipo seleccionado.", "info");
    } catch (error) {
      show(error.message);
    } finally {
      stopLoading();
    }
  }

  async function guardarNovedad() {
    if (!novedad.nombreConductor.trim()) return show("Ingrese el nombre del conductor.");
    if (!/^[0-9]{6,12}$/.test(novedad.documentoConductor)) return show("El documento debe tener entre 6 y 12 dígitos.");
    if (!novedad.tipoVehiculo) return show("Seleccione el tipo de vehiculo.");
    if (!novedad.placa) return show("Seleccione la placa del vehiculo.");
    if (novedad.tipoNovedad === "OTRO" && !novedad.otroTipo.trim()) return show("Especifique el tipo de novedad.");
    if (!novedad.lugar.trim()) return show("Ingrese el lugar o sitio de la novedad.");
    if (!novedad.observaciones.trim()) return show("Ingrese las observaciones generales.");
    if (!Object.keys(novedadFotos).length) return show("Suba al menos una foto de la novedad.");

    startLoading("Guardando reporte de novedad...");
    try {
      const saved = await api("/api/novedades", {
        method: "POST",
        body: JSON.stringify({ ...novedad, fotos: Object.values(novedadFotos) })
      });
      setNovedadSaved(saved);
      show(`Reporte de novedad ${saved.codigo} guardado correctamente.`, "success");
    } catch (error) {
      show(error.message);
    } finally {
      stopLoading();
    }
  }

  function reiniciarNovedad() {
    setNovedad(emptyNovedad);
    setNovedadConductorSugerencias([]);
    setNovedadVehiculos([]);
    setNovedadFotos({});
    setNovedadSaved(null);
  }

  async function guardarMantenimiento() {
    if (!mantenimiento.nombreResponsable.trim()) return show("Ingrese el responsable del mantenimiento.");
    if (!/^[0-9]{6,12}$/.test(mantenimiento.documentoResponsable)) return show("El documento debe tener entre 6 y 12 digitos.");
    if (!mantenimiento.tipoVehiculo) return show("Seleccione el tipo de vehiculo.");
    if (!mantenimiento.placa) return show("Seleccione la placa del vehiculo.");
    if (mantenimiento.tipoMantenimiento === "OTRO" && !mantenimiento.otroTipo.trim()) return show("Especifique el tipo de mantenimiento.");
    if (mantenimiento.kilometraje && !/^[0-9]+$/.test(String(mantenimiento.kilometraje))) return show("Kilometraje no valido.");
    if (mantenimiento.costo && Number(mantenimiento.costo) < 0) return show("Costo no valido.");
    if (!mantenimiento.lugar.trim()) return show("Ingrese el taller, lugar o sitio.");
    if (!mantenimiento.observaciones.trim()) return show("Ingrese las observaciones del mantenimiento.");
    if (!Object.keys(mantenimientoFotos).length) return show("Suba al menos una foto de evidencia.");

    startLoading("Guardando mantenimiento...");
    try {
      const saved = await api("/api/mantenimientos", {
        method: "POST",
        body: JSON.stringify({ ...mantenimiento, fotos: Object.values(mantenimientoFotos) })
      });
      setMantenimientoSaved(saved);
      show(`Mantenimiento ${saved.codigo} guardado correctamente.`, "success");
    } catch (error) {
      show(error.message);
    } finally {
      stopLoading();
    }
  }

  function reiniciarMantenimiento() {
    setMantenimiento(emptyMantenimiento);
    setMantenimientoResponsableSugerencias([]);
    setMantenimientoVehiculos([]);
    setMantenimientoFotos({});
    setMantenimientoSaved(null);
  }

  async function validarUsuario() {
    const documento = usuario.documento.trim();
    if (!usuario.nombre.trim()) return show("Ingrese el nombre completo.");
    if (!/^[0-9]{6,12}$/.test(documento)) return show("El documento debe tener entre 6 y 12 dígitos.");

    startLoading("Validando usuario...");
    try {
      const result = await api("/api/usuarios/validar", {
        method: "POST",
        body: JSON.stringify({ documento })
      });
      if (!result.autorizado) return show(result.mensaje || "Usuario no autorizado.");
      if (result.nombre && !usuario.nombre) setUsuario((current) => ({ ...current, nombre: result.nombre }));
      show("Usuario validado correctamente.", "success");
      setStep(2);
    } catch (error) {
      show(error.message);
    } finally {
      stopLoading();
    }
  }

  async function elegirTipo(nextTipo) {
    setTipo(nextTipo);
    setVehiculo(null);
    setChecklist({});
    setFotos({});
    startLoading(`Cargando vehículos ${nextTipo.toLowerCase()}...`);
    try {
      const data = await api(`/api/vehiculos?tipo=${nextTipo}`);
      setVehiculos(data);
      show(data.length ? `${data.length} vehículos disponibles.` : "No hay vehículos activos para este tipo.", data.length ? "success" : "info");
      setStep(3);
    } catch (error) {
      show(error.message);
    } finally {
      stopLoading();
    }
  }

  async function desbloquear(item) {
    if (!window.confirm(`¿Liberar el vehículo ${item.placa}?`)) return;
    startLoading(`Liberando vehículo ${item.placa}...`);
    try {
      await api("/api/vehiculos/desbloquear", {
        method: "POST",
        body: JSON.stringify({ placa: item.placa, tipo: item.tipo })
      });
      await elegirTipo(item.tipo);
      show("Vehículo disponible nuevamente.", "success");
    } catch (error) {
      show(error.message);
    } finally {
      stopLoading();
    }
  }

  async function guardar() {
    if (!form.sitioDestino.trim()) return show("Ingrese el sitio de destino.");
    if (!Number.isInteger(Number(form.kilometraje)) || Number(form.kilometraje) < 0) return show("Ingrese un kilometraje válido.");

    const missingItem = findMissingChecklistItem();
    if (missingItem) return show(`Falta diligenciar: ${missingItem}.`);

    const missingPhoto = findMissingPhoto();
    if (missingPhoto) return show(`Falta subir evidencia fotográfica: ${missingPhoto}.`);

    startLoading("Guardando preoperacional...");
    try {
      const saved = await api("/api/preoperacionales", {
        method: "POST",
        body: JSON.stringify({
          nombreUsuario: usuario.nombre,
          documentoUsuario: usuario.documento,
          placa: vehiculo.placa,
          tipoVehiculo: vehiculo.tipo,
          modelo: [vehiculo.marca, vehiculo.linea, vehiculo.modelo].filter(Boolean).join(" "),
          ...form,
          ...checklist,
          fotos: Object.values(fotos)
        })
      });
      setLastAnalysis(inspectionAnalysis);
      setLastPreoperacional(saved);
      show(`Preoperacional ${saved.codigo} guardado correctamente.`, "success");
      setStep(5);
    } catch (error) {
      show(error.message);
    } finally {
      stopLoading();
    }
  }

  function reiniciar() {
    setStep(1);
    setUsuario({ nombre: "", documento: "" });
    setUsuarioSugerencias([]);
    setTipo("");
    setVehiculos([]);
    setVehiculo(null);
    setForm({ sitioDestino: "", kilometraje: "", observaciones: "" });
    setChecklist({});
    setFotos({});
    setLastAnalysis(null);
    setLastPreoperacional(null);
  }

  return (
    <main className="app-shell">
      <section className="phone-frame">
        <header className="app-header">
          <div className="brand-heading">
            <Image className="brand-logo" src="/logo-aya-header.png" alt="A&A Comunicaciones" width={108} height={46} priority />
            <div>
              <p className="eyebrow">A&A Comunicaciones</p>
              <h1>
                {appMode === "novedad" ? <AlertTriangle size={26} aria-hidden="true" /> : appMode === "mantenimiento" ? <Wrench size={26} aria-hidden="true" /> : <ClipboardCheck size={26} aria-hidden="true" />}
                {appMode === "novedad" ? "Novedad" : appMode === "mantenimiento" ? "Mantenimiento" : "Preoperacional"}
              </h1>
            </div>
          </div>
        </header>

        {appMode === "preoperacional" ? <div className="app-progress-block">
          <div className="progress-label">Paso {step} de 5 · {steps[step - 1]}</div>
          <div className="progress"><span style={{ width: `${pct}%` }} /></div>
        </div> : null}

        {alert ? (
          <div className="alert-modal-backdrop" role="presentation">
            <section className={`alert-modal alert-${alert.type}`} role="alertdialog" aria-modal="true">
              <button className="alert-close" type="button" onClick={() => setAlert(null)} aria-label="Cerrar alerta">
                <X size={18} aria-hidden="true" />
              </button>
              <div className="alert-modal-icon">
                <AlertIcon size={30} aria-hidden="true" />
              </div>
              <h2>{alert.type === "success" ? "Proceso exitoso" : alert.type === "info" ? "Información" : "Revisa este dato"}</h2>
              <p>{alert.message}</p>
              <button className="primary" type="button" onClick={() => setAlert(null)}>Entendido</button>
            </section>
          </div>
        ) : null}

        {loading ? (
          <div className="loading loading-card">
            <span className="spinner" aria-hidden="true" />
            <span>{loadingMessage || "Procesando..."}</span>
          </div>
        ) : null}

        <section className="content app-content-with-nav">
          {appMode === "mantenimiento" ? (
            <div className="novelty-form">
              {mantenimientoSaved ? (
                <div className="success">
                  <CheckCircle2 size={54} aria-hidden="true" />
                  <h2>Mantenimiento registrado</h2>
                  <strong className="novelty-code">{mantenimientoSaved.codigo}</strong>
                  <p>El mantenimiento fue almacenado correctamente para seguimiento administrativo.</p>
                  <button className="primary app-button" onClick={reiniciarMantenimiento}><RefreshCw size={18} aria-hidden="true" /><span>Registrar otro</span></button>
                </div>
              ) : (
                <>
                  <div className="mobile-card step-card">
                    <div className="step-heading">
                      <span><Wrench size={24} aria-hidden="true" /></span>
                      <div>
                        <h2>Registro de mantenimiento</h2>
                        <p>Registre mantenimientos preventivos, correctivos, cambios de aceite u otros servicios.</p>
                      </div>
                    </div>
                    <label className="input-with-icon">
                      <UserRound size={18} aria-hidden="true" />
                      <input list="conductores-mantenimiento" value={mantenimiento.nombreResponsable} onChange={(event) => handleMantenimientoResponsableNombre(event.target.value)} placeholder="Responsable del registro" />
                    </label>
                    <datalist id="conductores-mantenimiento">
                      {mantenimientoResponsableSugerencias.map((item) => (
                        <option key={item.id} value={item.nombre}>{item.documento}</option>
                      ))}
                    </datalist>
                    <label className="input-with-icon">
                      <IdCard size={18} aria-hidden="true" />
                      <input inputMode="numeric" value={mantenimiento.documentoResponsable} onChange={(event) => setMantenimiento({ ...mantenimiento, documentoResponsable: event.target.value.replace(/\D/g, "") })} placeholder="Numero de documento" />
                    </label>
                    <select value={mantenimiento.tipoVehiculo} onChange={(event) => elegirTipoMantenimientoVehiculo(event.target.value)}>
                      <option value="">Tipo de vehiculo</option>
                      <option value="MOTO">Moto</option>
                      <option value="CARRO">Carro</option>
                      <option value="GRUA">Grua</option>
                    </select>
                    <select disabled={!mantenimiento.tipoVehiculo || loading} value={mantenimiento.placa} onChange={(event) => setMantenimiento({ ...mantenimiento, placa: event.target.value })}>
                      <option value="">{mantenimiento.tipoVehiculo ? "Seleccione placa" : "Seleccione primero el tipo"}</option>
                      {mantenimientoVehiculos.map((item) => (
                        <option key={`${item.tipo}-${item.placa}`} value={item.placa}>
                          {item.placa} - {[item.marca, item.linea, item.modelo].filter(Boolean).join(" ")}
                        </option>
                      ))}
                    </select>
                    <select value={mantenimiento.tipoMantenimiento} onChange={(event) => setMantenimiento({ ...mantenimiento, tipoMantenimiento: event.target.value })}>
                      {maintenanceTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                    {mantenimiento.tipoMantenimiento === "OTRO" ? (
                      <input value={mantenimiento.otroTipo} onChange={(event) => setMantenimiento({ ...mantenimiento, otroTipo: event.target.value.toUpperCase() })} placeholder="Especifique el mantenimiento" />
                    ) : null}
                    <label className="input-with-icon">
                      <Gauge size={18} aria-hidden="true" />
                      <input inputMode="numeric" value={mantenimiento.kilometraje} onChange={(event) => setMantenimiento({ ...mantenimiento, kilometraje: event.target.value.replace(/\D/g, "") })} placeholder="Kilometraje del vehiculo" />
                    </label>
                    <label className="input-with-icon">
                      <MapPin size={18} aria-hidden="true" />
                      <input value={mantenimiento.lugar} onChange={(event) => setMantenimiento({ ...mantenimiento, lugar: event.target.value.toUpperCase() })} placeholder="Taller, lugar o sitio" />
                    </label>
                    <input value={mantenimiento.proveedor} onChange={(event) => setMantenimiento({ ...mantenimiento, proveedor: event.target.value.toUpperCase() })} placeholder="Proveedor o tecnico" />
                    <input inputMode="decimal" value={mantenimiento.costo} onChange={(event) => setMantenimiento({ ...mantenimiento, costo: event.target.value.replace(/[^\d.]/g, "") })} placeholder="Costo aproximado" />
                    <label className="textarea-label"><FileText size={18} aria-hidden="true" /> Observaciones del mantenimiento</label>
                    <textarea value={mantenimiento.observaciones} onChange={(event) => setMantenimiento({ ...mantenimiento, observaciones: event.target.value })} placeholder="Detalle del servicio realizado, repuestos usados y recomendaciones" />
                  </div>

                  <section className="photo-section mobile-card">
                    <h2>Fotos de evidencia</h2>
                    <p>Suba una o varias fotos del servicio, repuestos o soporte recibido.</p>
                    <label className="novelty-upload">
                      <Camera size={24} aria-hidden="true" />
                      <span>Seleccionar fotos</span>
                      <input accept="image/*" capture="environment" multiple type="file" onChange={(event) => handleMantenimientoPhotos(event.target.files)} />
                    </label>
                    {!!Object.values(mantenimientoFotos).length && (
                      <div className="photo-grid">
                        {Object.values(mantenimientoFotos).map((foto) => (
                          <figure className="novelty-photo" key={foto.id}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={foto.dataUrl} alt={foto.etiqueta} />
                            <figcaption>
                              <span>{foto.etiqueta}</span>
                              <button className="secondary compact" type="button" onClick={() => removeMantenimientoPhoto(foto.id)}>Quitar</button>
                            </figcaption>
                          </figure>
                        ))}
                      </div>
                    )}
                  </section>

                  <button className="primary app-button" disabled={loading} onClick={guardarMantenimiento}>
                    <span>{loading ? "Guardando..." : "Guardar mantenimiento"}</span>
                    <CheckCircle2 size={18} aria-hidden="true" />
                  </button>
                </>
              )}
            </div>
          ) : appMode === "novedad" ? (
            <div className="novelty-form">
              {novedadSaved ? (
                <div className="success">
                  <CheckCircle2 size={54} aria-hidden="true" />
                  <h2>Novedad reportada</h2>
                  <strong className="novelty-code">{novedadSaved.codigo}</strong>
                  <p>El reporte fue almacenado correctamente para revisión administrativa.</p>
                  <button className="primary app-button" onClick={reiniciarNovedad}><RefreshCw size={18} aria-hidden="true" /><span>Reportar otra</span></button>
                </div>
              ) : (
                <>
                  <div className="mobile-card step-card">
                    <div className="step-heading">
                      <span><AlertTriangle size={24} aria-hidden="true" /></span>
                      <div>
                        <h2>Reporte de novedad</h2>
                        <p>Registre daños o eventos ocurridos durante el recorrido.</p>
                      </div>
                    </div>
                    <label className="input-with-icon">
                      <UserRound size={18} aria-hidden="true" />
                      <input list="conductores-novedad" value={novedad.nombreConductor} onChange={(event) => handleNovedadConductorNombre(event.target.value)} placeholder="Nombre del conductor" />
                    </label>
                    <datalist id="conductores-novedad">
                      {novedadConductorSugerencias.map((item) => (
                        <option key={item.id} value={item.nombre}>{item.documento}</option>
                      ))}
                    </datalist>
                    <label className="input-with-icon">
                      <IdCard size={18} aria-hidden="true" />
                      <input inputMode="numeric" value={novedad.documentoConductor} onChange={(event) => setNovedad({ ...novedad, documentoConductor: event.target.value.replace(/\D/g, "") })} placeholder="Número de documento" />
                    </label>
                    <select value={novedad.tipoVehiculo} onChange={(event) => elegirTipoNovedadVehiculo(event.target.value)}>
                      <option value="">Tipo de vehiculo</option>
                      <option value="MOTO">Moto</option>
                      <option value="CARRO">Carro</option>
                      <option value="GRUA">Grua</option>
                    </select>
                    <select disabled={!novedad.tipoVehiculo || loading} value={novedad.placa} onChange={(event) => setNovedad({ ...novedad, placa: event.target.value })}>
                      <option value="">{novedad.tipoVehiculo ? "Seleccione placa" : "Seleccione primero el tipo"}</option>
                      {novedadVehiculos.map((item) => (
                        <option key={`${item.tipo}-${item.placa}`} value={item.placa}>
                          {item.placa} - {[item.marca, item.linea, item.modelo].filter(Boolean).join(" ")}
                        </option>
                      ))}
                    </select>
                    <select value={novedad.tipoNovedad} onChange={(event) => setNovedad({ ...novedad, tipoNovedad: event.target.value })}>
                      {noveltyTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                    {novedad.tipoNovedad === "OTRO" ? (
                      <input value={novedad.otroTipo} onChange={(event) => setNovedad({ ...novedad, otroTipo: event.target.value.toUpperCase() })} placeholder="Especifique la novedad" />
                    ) : null}
                    <label className="input-with-icon">
                      <MapPin size={18} aria-hidden="true" />
                      <input value={novedad.lugar} onChange={(event) => setNovedad({ ...novedad, lugar: event.target.value.toUpperCase() })} placeholder="Lugar o sitio" />
                    </label>
                    <button className="secondary app-button" disabled={loading} type="button" onClick={geolocalizarNovedad}>
                      <Navigation size={18} aria-hidden="true" />
                      <span>{novedad.latitud && novedad.longitud ? "Ubicación registrada" : "Usar mi ubicación"}</span>
                    </button>
                    {novedad.latitud && novedad.longitud ? (
                      <p className="geo-chip">Lat: {novedad.latitud} · Lng: {novedad.longitud}</p>
                    ) : null}
                    <label className="textarea-label"><FileText size={18} aria-hidden="true" /> Observaciones generales</label>
                    <textarea value={novedad.observaciones} onChange={(event) => setNovedad({ ...novedad, observaciones: event.target.value })} placeholder="Describa lo ocurrido, daños visibles y acciones tomadas" />
                  </div>

                  <section className="photo-section mobile-card">
                    <h2>Fotos de la novedad</h2>
                    <p>Suba una o varias fotos del daño o evento reportado.</p>
                    <label className="novelty-upload">
                      <Camera size={24} aria-hidden="true" />
                      <span>Seleccionar fotos</span>
                      <input accept="image/*" capture="environment" multiple type="file" onChange={(event) => handleNovedadPhotos(event.target.files)} />
                    </label>
                    {!!Object.values(novedadFotos).length && (
                      <div className="photo-grid">
                        {Object.values(novedadFotos).map((foto) => (
                          <figure className="novelty-photo" key={foto.id}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={foto.dataUrl} alt={foto.etiqueta} />
                            <figcaption>
                              <span>{foto.etiqueta}</span>
                              <button className="secondary compact" type="button" onClick={() => removeNovedadPhoto(foto.id)}>Quitar</button>
                            </figcaption>
                          </figure>
                        ))}
                      </div>
                    )}
                  </section>

                  <button className="primary app-button" disabled={loading} onClick={guardarNovedad}>
                    <span>{loading ? "Guardando..." : "Guardar novedad"}</span>
                    <CheckCircle2 size={18} aria-hidden="true" />
                  </button>
                </>
              )}
            </div>
          ) : (
          <>
          {step === 1 && (
            <div className="mobile-card step-card">
              <div className="step-heading">
                <span><UserRound size={24} aria-hidden="true" /></span>
                <div>
                  <h2>Datos del conductor</h2>
                  <p>Identifique quién realizará el preoperacional.</p>
                </div>
              </div>
              <label className="input-with-icon">
                <UserRound size={18} aria-hidden="true" />
                <input list="conductores-preoperacional" value={usuario.nombre} onChange={(event) => handleUsuarioNombre(event.target.value)} placeholder="Nombre completo" />
              </label>
              <datalist id="conductores-preoperacional">
                {usuarioSugerencias.map((item) => (
                  <option key={item.id} value={item.nombre}>{item.documento}</option>
                ))}
              </datalist>
              <label className="input-with-icon">
                <IdCard size={18} aria-hidden="true" />
                <input inputMode="numeric" value={usuario.documento} onChange={(event) => setUsuario({ ...usuario, documento: event.target.value.replace(/\D/g, "") })} placeholder="Número de documento" />
              </label>
              <button className="primary app-button" disabled={loading} onClick={validarUsuario}>
                <span>{loading ? "Validando..." : "Continuar"}</span>
                <ArrowRight size={18} aria-hidden="true" />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="mobile-card step-card">
              <div className="step-heading">
                <span><ShieldCheck size={24} aria-hidden="true" /></span>
                <div>
                  <h2>Tipo de vehículo</h2>
                  <p>Seleccione la categoría para cargar su checklist.</p>
                </div>
              </div>
              {Object.entries(vehicleTypeMeta).map(([value, meta]) => {
                return (
                  <button className={`vehicle-type ${tipo === value ? "selected" : ""}`} disabled={loading} key={value} onClick={() => elegirTipo(value)}>
                    <span className="vehicle-type-emoji" aria-hidden="true">{meta.emoji}</span>
                    <span>{meta.label}</span>
                  </button>
                );
              })}
              <button className="secondary app-button" onClick={() => setStep(1)}>
                <ArrowLeft size={18} aria-hidden="true" />
                <span>Volver</span>
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="vehicle-list">
              {vehiculos.map((item) => (
                <article key={item.placa} className={`vehicle ${vehiculo?.placa === item.placa ? "selected" : ""} ${item.ocupado ? "busy" : ""}`}>
                  <button className="vehicle-main" disabled={item.ocupado} onClick={() => setVehiculo(item)}>
                    <strong><VehicleIcon tipo={item.tipo} /> {item.placa}</strong>
                    <span>{item.marca} {item.linea || ""} {item.modelo}</span>
                    <small>SOAT: {item.fechaInicioSOAT || "-"} a {item.fechaVencimientoSOAT || "-"}</small>
                    <small>Tecnomecánica: {item.fechaInicioTecnomecanica || "-"} a {item.fechaVencimientoTecnomecanica || "-"}</small>
                    {item.ocupado ? <small>Ocupado por {item.usuarioOcupado} · {item.horaRegistro}</small> : null}
                  </button>
                  {item.ocupado ? <button className="secondary compact" disabled={loading} onClick={() => desbloquear(item)}>Liberar</button> : null}
                </article>
              ))}
              {!vehiculos.length ? <p className="empty">No hay vehículos registrados para este tipo.</p> : null}
              <div className="actions">
                <button className="secondary app-button" onClick={() => setStep(2)}><ArrowLeft size={18} aria-hidden="true" /><span>Volver</span></button>
                <button className="primary app-button" disabled={!vehiculo || loading} onClick={() => setStep(4)}><span>Continuar</span><ArrowRight size={18} aria-hidden="true" /></button>
              </div>
            </div>
          )}

          {step === 4 && vehiculo && (
            <div className="checklist-form">
              <div className="summary">
                <strong><ClipboardCheck size={18} aria-hidden="true" /> {vehiculo.tipo} · {vehiculo.placa}</strong>
                <span>{usuario.nombre} · {usuario.documento}</span>
              </div>
              <section className={`inspection-analysis analysis-${inspectionAnalysis.estado.toLowerCase().replaceAll(" ", "-")}`}>
                <div>
                  <span>Dictamen preventivo</span>
                  <strong>{inspectionAnalysis.estado}</strong>
                </div>
                <p>{inspectionAnalysis.conclusion}</p>
                {!!inspectionAnalysis.criticalBadItems.length && (
                  <ul>
                    {inspectionAnalysis.criticalBadItems.slice(0, 4).map((item) => (
                      <li key={item.key}>{item.criticalGroup}: {item.section} - {item.label}</li>
                    ))}
                  </ul>
                )}
                {!inspectionAnalysis.criticalBadItems.length && !!inspectionAnalysis.badItems.length && (
                  <ul>
                    {inspectionAnalysis.badItems.slice(0, 4).map((item) => (
                      <li key={item.key}>{item.section} - {item.label}</li>
                    ))}
                  </ul>
                )}
              </section>
              <label className="input-with-icon">
                <MapPin size={18} aria-hidden="true" />
                <input value={form.sitioDestino} onChange={(event) => setForm({ ...form, sitioDestino: event.target.value.toUpperCase() })} placeholder="Sitio de destino" />
              </label>
              <label className="input-with-icon">
                <Gauge size={18} aria-hidden="true" />
                <input type="number" min="0" value={form.kilometraje} onChange={(event) => setForm({ ...form, kilometraje: event.target.value })} placeholder="Kilometraje actual" />
              </label>

              {sections.map((section) => (
                <section className="check-section" key={section.section}>
                  <h2>{section.section}</h2>
                  {section.items.map(([key, label]) => (
                    <div className="check-row" key={key}>
                      <strong>{label}</strong>
                      <div className="segmented">
                        {statusOptions.map((value) => (
                          <button
                            key={value}
                            className={checklist[key] === value ? "active" : ""}
                            onClick={() => setChecklist({ ...checklist, [key]: value })}
                            type="button"
                          >
                            {value}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </section>
              ))}

              {!!requiredPhotos.length && (
                <section className="photo-section">
                  <h2>Evidencia fotográfica</h2>
                  <p>Suba las fotos del estado del vehículo antes de guardar.</p>
                  <div className="photo-grid">
                    {requiredPhotos.map(([codigo, etiqueta]) => (
                      <label className={`photo-field ${fotos[codigo]?.dataUrl ? "loaded" : ""}`} key={codigo}>
                        <span><Camera size={15} aria-hidden="true" /> {etiqueta}</span>
                        {fotos[codigo]?.dataUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={fotos[codigo].dataUrl} alt={etiqueta} />
                        ) : <strong><Camera size={22} aria-hidden="true" /> Seleccionar foto</strong>}
                        <input
                          accept="image/*"
                          capture="environment"
                          type="file"
                          onChange={(event) => handlePhotoChange(codigo, etiqueta, event.target.files?.[0])}
                        />
                      </label>
                    ))}
                  </div>
                </section>
              )}

              <label className="textarea-label"><FileText size={18} aria-hidden="true" /> Observaciones</label>
              <textarea value={form.observaciones} onChange={(event) => setForm({ ...form, observaciones: event.target.value })} placeholder="Observaciones adicionales" />
              <div className="actions">
                <button className="secondary app-button" onClick={() => setStep(3)}><ArrowLeft size={18} aria-hidden="true" /><span>Volver</span></button>
                <button className="primary app-button" disabled={loading} onClick={guardar}>
                  <span>{loading ? "Guardando..." : "Guardar"}</span>
                  <CheckCircle2 size={18} aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="success">
              <CheckCircle2 size={54} aria-hidden="true" />
              <h2>Registro guardado</h2>
              {lastPreoperacional?.codigo ? <strong className="novelty-code">{lastPreoperacional.codigo}</strong> : null}
              <p>El preoperacional fue almacenado correctamente.</p>
              {lastAnalysis ? (
                <section className={`final-verdict analysis-${lastAnalysis.estado.toLowerCase().replaceAll(" ", "-")}`}>
                  <strong>{lastAnalysis.estado === "No apto" ? "No apto para movilizarse" : "Apto para movilizarse"}</strong>
                  <span>{lastAnalysis.conclusion}</span>
                </section>
              ) : null}
              <button className="primary app-button" onClick={reiniciar}><RefreshCw size={18} aria-hidden="true" /><span>Realizar otro</span></button>
            </div>
          )}
          </>
          )}
        </section>
        <nav className="bottom-nav" aria-label="Menú principal">
          <button className={appMode === "preoperacional" ? "active" : ""} type="button" onClick={() => setAppMode("preoperacional")}>
            <ClipboardCheck size={20} aria-hidden="true" />
            <span>Preoperacional</span>
          </button>
          <button className={appMode === "novedad" ? "active" : ""} type="button" onClick={() => setAppMode("novedad")}>
            <AlertTriangle size={20} aria-hidden="true" />
            <span>Novedad</span>
          </button>
          <button className={appMode === "mantenimiento" ? "active" : ""} type="button" onClick={() => setAppMode("mantenimiento")}>
            <Wrench size={20} aria-hidden="true" />
            <span>Mantto.</span>
          </button>
        </nav>
      </section>
    </main>
  );
}
