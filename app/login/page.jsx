"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { LockKeyhole, LogIn, UserPlus } from "lucide-react";

async function parseResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.mensaje || "No se pudo completar la operación.");
  return data;
}

export default function LoginPage() {
  const [needsSetup, setNeedsSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [form, setForm] = useState({ nombre: "", email: "", password: "" });

  useEffect(() => {
    fetch("/api/auth/setup-status")
      .then(parseResponse)
      .then((data) => setNeedsSetup(Boolean(data.needsSetup)))
      .catch((error) => setMessage({ type: "error", text: error.message }))
      .finally(() => setLoading(false));
  }, []);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      await parseResponse(await fetch(needsSetup ? "/api/auth/setup" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      }));
      const nextUrl = new URLSearchParams(window.location.search).get("next") || "/panel";
      window.location.href = nextUrl.startsWith("/") ? nextUrl : "/panel";
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand">
          <Image src="/logo-aya-header.png" alt="A&A Comunicaciones" width={150} height={62} priority />
          <div>
            <span>{needsSetup ? "Configuración inicial" : "Panel administrativo"}</span>
            <h1>{needsSetup ? "Crear primer administrador" : "Iniciar sesión"}</h1>
          </div>
        </div>

        <form className="login-form" onSubmit={submit}>
          {needsSetup ? (
            <label>
              Nombre completo
              <input required value={form.nombre} onChange={(event) => update("nombre", event.target.value.toUpperCase())} placeholder="NOMBRE DEL ADMINISTRADOR" />
            </label>
          ) : null}
          <label>
            Correo electrónico
            <input required type="email" value={form.email} onChange={(event) => update("email", event.target.value.toLowerCase())} placeholder="admin@empresa.com" />
          </label>
          <label>
            Contraseña
            <input required type="password" minLength={8} value={form.password} onChange={(event) => update("password", event.target.value)} placeholder="Mínimo 8 caracteres" />
          </label>

          {message ? <p className={`panel-message alert-${message.type}`}>{message.text}</p> : null}

          <button className="primary app-button" disabled={loading} type="submit">
            <span>{loading ? "Procesando..." : needsSetup ? "Crear administrador" : "Entrar al panel"}</span>
            {needsSetup ? <UserPlus size={18} aria-hidden="true" /> : <LogIn size={18} aria-hidden="true" />}
          </button>
        </form>

        <p className="login-note">
          <LockKeyhole size={16} aria-hidden="true" />
          Acceso reservado para personal administrativo autorizado.
        </p>
      </section>
    </main>
  );
}
