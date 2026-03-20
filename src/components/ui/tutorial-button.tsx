"use client";

import { useEffect, useCallback } from "react";
import type { DriveStep } from "driver.js";

// ─── Tutorial configs ──────────────────────────────────────────────────────────

export type TutorialId =
  | "dashboard"
  | "trip-home"
  | "trip-actividades"
  | "trip-itinerario"
  | "trip-gastos";

const TUTORIALS: Record<TutorialId, { title: string; steps: DriveStep[] }> = {
  dashboard: {
    title: "Dashboard",
    steps: [
      {
        popover: {
          title: "👋 Bienvenido a UnkoApp",
          description:
            "Esta es tu página principal. Desde aquí gestionas tus viajes y gastos compartidos.",
          side: "over",
          align: "center",
        },
      },
      {
        element: "#tutorial-metrics",
        popover: {
          title: "📊 Resumen rápido",
          description:
            "Acá ves cuántos viajes tienes, lo que te deben en gastos independientes y lo que gastaste este mes.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#tutorial-trips",
        popover: {
          title: "✈️ Mis viajes",
          description:
            "Aquí aparecen todos tus viajes. El más próximo se destaca arriba. Haz clic en uno para entrar.",
          side: "top",
          align: "start",
        },
      },
      {
        element: "#tutorial-new-trip",
        popover: {
          title: "➕ Nuevo viaje",
          description: "Crea un nuevo viaje con fechas, destino y participantes.",
          side: "bottom",
          align: "end",
        },
      },
      {
        element: "#tutorial-standalone",
        popover: {
          title: "💸 Gastos independientes",
          description:
            "¿Gastaste algo fuera de un viaje? Acá puedes dividirlo con amigos y llevar la cuenta sin crear un viaje.",
          side: "top",
          align: "start",
        },
      },
    ],
  },

  "trip-home": {
    title: "Inicio del viaje",
    steps: [
      {
        popover: {
          title: "✈️ Inicio del viaje",
          description:
            "Esta es la pantalla principal del viaje. Desde aquí tienes un resumen de todo lo importante de un vistazo.",
          side: "over",
          align: "center",
        },
      },
      {
        element: "#tutorial-trip-hero",
        popover: {
          title: "🖼️ Portada del viaje",
          description:
            "Muestra el nombre, destino, fechas y estado del viaje (próximo, en curso o terminado). Los avatares de los participantes también aparecen aquí.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#tutorial-trip-stats",
        popover: {
          title: "📊 Resumen rápido",
          description:
            "3 chips con info clave: días restantes (o cuánto falta para empezar), tu saldo de gastos (si debes o te deben), y cuántas actividades hay en el itinerario.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#tutorial-trip-participants",
        popover: {
          title: "👥 Participantes",
          description:
            "Muestra quiénes son parte del viaje y su rol (Admin / Editor / Invitado).",
          side: "top",
          align: "start",
        },
      },
      {
        element: "#tutorial-trip-admin-menu",
        popover: {
          title: "⚙️ Gestionar participantes",
          description:
            "Si eres administrador, desde este menú puedes editar el viaje, agregar o quitar participantes. Haz clic en '⚙️' → 'Participantes' para invitar a alguien por email o agregar un participante fantasma para dividir gastos.",
          side: "bottom",
          align: "end",
        },
      },
      {
        element: "#tutorial-trip-upcoming",
        popover: {
          title: "📅 Próximos días",
          description:
            "Vista previa de los días más cercanos del itinerario: actividades programadas, hotel del día y si hay días libres.",
          side: "top",
          align: "start",
        },
      },
      {
        element: "#tutorial-trip-my-settlement",
        popover: {
          title: "⚖️ Mi liquidación",
          description:
            "Resumen de tus deudas en el viaje: a quién le debes y cuánto, o quién te debe a ti. Haz clic en 'Ver gastos →' para el detalle completo.",
          side: "top",
          align: "start",
        },
      },
      {
        element: "#tutorial-trip-tabs",
        popover: {
          title: "🗂️ Menús del viaje",
          description: "El viaje tiene 4 secciones principales accesibles desde estas pestañas.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#tutorial-tab-actividades",
        popover: {
          title: "💡 Actividades",
          description:
            "Propón lugares y restaurantes para visitar. El grupo puede votar los favoritos y registrar visitas cuando los visiten.",
          side: "bottom",
        },
      },
      {
        element: "#tutorial-tab-itinerario",
        popover: {
          title: "📅 Itinerario",
          description:
            "Planifica el día a día: agrega actividades con hora, ubicación y notas. También gestiona el alojamiento del viaje.",
          side: "bottom",
        },
      },
      {
        element: "#tutorial-tab-gastos",
        popover: {
          title: "💰 Gastos",
          description:
            "Registra todos los gastos compartidos del grupo. Divide equitativamente o por ítems, escanea boletas con IA y lleva la liquidación de quién debe a quién.",
          side: "bottom",
        },
      },
      {
        element: "#tutorial-tab-galería",
        popover: {
          title: "📸 Galería",
          description:
            "Todas las fotos del viaje en un solo lugar: fotos de check-ins, boletas y recuerdos del grupo.",
          side: "bottom",
        },
      },
    ],
  },

  "trip-actividades": {
    title: "Actividades",
    steps: [
      {
        popover: {
          title: "🗺️ Actividades",
          description:
            "Acá el grupo puede proponer lugares para visitar: restaurantes, atracciones, museos, etc.",
          side: "over",
          align: "center",
        },
      },
      {
        element: "#tutorial-item-filters",
        popover: {
          title: "🔍 Buscar y filtrar",
          description: "Filtra actividades por nombre o tipo (Lugar / Comida).",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#tutorial-item-list",
        popover: {
          title: "🃏 Cards de actividades",
          description:
            "Cada card muestra el nombre, tipo, votos y visitas. Haz clic para ver el detalle, votar o registrar tu visita.",
          side: "top",
          align: "start",
        },
      },
      {
        element: "#tutorial-nearby",
        popover: {
          title: "📍 Cerca de ti",
          description:
            "Si activas tu ubicación, verás qué actividades del viaje están cerca.",
          side: "left",
          align: "start",
        },
      },
    ],
  },

  "trip-itinerario": {
    title: "Itinerario",
    steps: [
      {
        popover: {
          title: "📅 Itinerario del viaje",
          description:
            "Planifica qué van a hacer cada día. Las actividades se agrupan por fecha y también puedes gestionar el alojamiento del grupo.",
          side: "over",
          align: "center",
        },
      },
      {
        element: "#tutorial-hotel-section",
        popover: {
          title: "🏨 Alojamiento",
          description:
            "Registra los hoteles o alojamientos del viaje con fechas y precio. Puedes agregar varios si el grupo se mueve de ciudad.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#tutorial-activity-list",
        popover: {
          title: "🗓️ Días del itinerario",
          description:
            "Cada bloque es un día. Agrega actividades con hora, ubicación y notas usando el botón '+ Nueva actividad' arriba a la derecha.",
          side: "top",
          align: "start",
        },
      },
    ],
  },

  "trip-gastos": {
    title: "Gastos del viaje",
    steps: [
      {
        popover: {
          title: "💸 Gastos del viaje",
          description:
            "Registra todos los gastos compartidos del grupo y lleva la cuenta de quién debe a quién.",
          side: "over",
          align: "center",
        },
      },
      {
        element: "#tutorial-settlement",
        popover: {
          title: "⚖️ Liquidación",
          description:
            "Acá ves el resumen de quién le debe a quién. Un gasto se marca como 'Liquidado' cuando todos pagan su parte.",
          side: "top",
          align: "start",
        },
      },
      {
        element: "#tutorial-expense-list",
        popover: {
          title: "🧾 Lista de gastos",
          description:
            "Cada gasto muestra quién pagó, cuánto debe cada uno y si ya está liquidado.",
          side: "top",
          align: "start",
        },
      },
      {
        element: "#tutorial-create-expense",
        popover: {
          title: "➕ Nuevo gasto",
          description:
            "Crea un gasto: descripción, monto, moneda, quién pagó y cómo se divide. También puedes escanear una boleta con IA.",
          side: "bottom",
          align: "end",
        },
      },
    ],
  },
};

const STORAGE_KEY = (id: TutorialId) => `tutorial:${id}:done`;

// ─── Component ─────────────────────────────────────────────────────────────────

type Props = {
  tutorialId: TutorialId;
  autoStart?: boolean;
};

export function TutorialButton({ tutorialId, autoStart = true }: Props) {
  const config = TUTORIALS[tutorialId];

  const runTutorial = useCallback(async () => {
    // Inyectar CSS de driver.js solo la primera vez que se ejecuta
    if (!document.getElementById("driver-js-css")) {
      const link = document.createElement("link");
      link.id = "driver-js-css";
      link.rel = "stylesheet";
      link.href = "/driver.css";
      document.head.appendChild(link);
      // Esperar que cargue antes de iniciar
      await new Promise((resolve) => { link.onload = resolve; setTimeout(resolve, 500); });
    }
    const { driver } = await import("driver.js");
    const driverObj = driver({
      showProgress: true,
      progressText: "{{current}} / {{total}}",
      nextBtnText: "Siguiente →",
      prevBtnText: "← Anterior",
      doneBtnText: "¡Entendido!",
      overlayOpacity: 0.6,
      smoothScroll: true,
      onDestroyStarted: () => {
        localStorage.setItem(STORAGE_KEY(tutorialId), "true");
        driverObj.destroy();
      },
      steps: config.steps,
    });
    driverObj.drive();
  }, [tutorialId, config.steps]);

  useEffect(() => {
    if (!autoStart) return;
    // No auto-iniciar en mobile (tablets/desktop only)
    if (window.innerWidth < 768) return;
    const done = localStorage.getItem(STORAGE_KEY(tutorialId));
    if (done) return;
    const t = setTimeout(runTutorial, 900);
    return () => clearTimeout(t);
  }, [autoStart, tutorialId, runTutorial]);

  return (
    <button
      onClick={runTutorial}
      aria-label={`Guía: ${config.title}`}
      title={`Guía: ${config.title}`}
      className="hidden md:flex items-center justify-center w-8 h-8 rounded-full text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors shrink-0"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    </button>
  );
}
