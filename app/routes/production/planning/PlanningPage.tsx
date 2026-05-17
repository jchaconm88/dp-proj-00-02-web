import { useState, useMemo, useCallback } from "react";
import { useNavigate, useNavigation, useRevalidator } from "react-router";
import { Calendar, DateLocalizer } from "react-big-calendar";
import { format, startOfWeek, getDay } from "date-fns";
import { es } from "date-fns/locale/es";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { DpContent, DpContentHeader } from "~/components/ui";
import { getAuthUser } from "~/lib/get-auth-user";
import { getPlanningOrders, type ProductionOrderRecord } from "~/features/production";
import type { Route } from "./+types/PlanningPage";

const locales: Record<string, typeof es> = { es };

const localizer = new DateLocalizer({
  format: (value, formatStr, culture) => format(value as Date, formatStr, { locale: locales[culture ?? "es"] }),
  firstOfWeek: (culture) => getDay(startOfWeek(new Date(), { locale: locales[culture ?? "es"] })),
  formats: {
    dateFormat: "dd",
    dayFormat: "dd eee",
    weekdayFormat: "ccc",
    timeGutterFormat: "p",
    monthHeaderFormat: "MMMM yyyy",
    dayHeaderFormat: "cccc MMM dd",
    dayRangeHeaderFormat: ({ start, end }, culture, local) =>
      `${local!.format(start, "MMMM dd", culture)} - ${local!.format(end, start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear() ? "dd" : "MMMM dd", culture)}`,
    agendaHeaderFormat: ({ start, end }, culture, local) =>
      `${local!.format(start, "P", culture)} - ${local!.format(end, "P", culture)}`,
    agendaDateFormat: "ccc MMM dd",
    agendaTimeFormat: "p",
    agendaTimeRangeFormat: ({ start, end }, culture, local) =>
      `${local!.format(start, "p", culture)} - ${local!.format(end, "p", culture)}`,
    eventTimeRangeFormat: ({ start, end }, culture, local) =>
      `${local!.format(start, "p", culture)} - ${local!.format(end, "p", culture)}`,
    eventTimeRangeStartFormat: ({ start }, culture, local) =>
      `${local!.format(start, "h:mma", culture)} - `,
    eventTimeRangeEndFormat: ({ end }, culture, local) =>
      ` - ${local!.format(end, "h:mma", culture)}`,
    selectRangeFormat: ({ start, end }, culture, local) =>
      `${local!.format(start, "p", culture)} - ${local!.format(end, "p", culture)}`,
  },
});

const STATUS_COLORS: Record<string, string> = {
  borrador: "#9e9e9e",
  planificada: "#2196f3",
  en_proceso: "#ff9800",
  completada: "#4caf50",
  cancelada: "#f44336",
};

const PRIORITY_COLORS: Record<string, string> = {
  alta: "#f44336",
  media: "#ff9800",
  baja: "#4caf50",
};

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: ProductionOrderRecord;
}

export async function clientLoader() {
  await getAuthUser();
  const today = new Date();
  const dateFrom = format(today, "yyyy-MM-dd");
  const dateTo = format(new Date(today.getFullYear(), today.getMonth() + 2, 0), "yyyy-MM-dd");
  const { items } = await getPlanningOrders(dateFrom, dateTo);
  return { items, dateFrom, dateTo };
}

export default function PlanningPage({ loaderData }: Route.ComponentProps) {
  const { items: initialItems, dateFrom: initialDateFrom, dateTo: initialDateTo } = loaderData;
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const navigation = useNavigation();
  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";

  const [items, setItems] = useState(initialItems);
  const [dateFrom, setDateFrom] = useState(initialDateFrom);
  const [dateTo, setDateTo] = useState(initialDateTo);
  const [view, setView] = useState<"month" | "week" | "day">("month");

  const loadOrders = useCallback(async (df: string, dt: string) => {
    try {
      const { items: newItems } = await getPlanningOrders(df, dt);
      setItems(newItems);
    } catch {
      // ignore
    }
  }, []);

  const events: CalendarEvent[] = useMemo(() => {
    return items
      .filter((o) => o.plannedStartDate && o.plannedEndDate)
      .map((o) => ({
        id: o.id,
        title: `${o.code} - ${o.finishedProductName}`,
        start: new Date(o.plannedStartDate),
        end: new Date(o.plannedEndDate),
        resource: o,
      }));
  }, [items]);

  const eventStyleGetter = (event: CalendarEvent) => {
    const status = event.resource.status;
    const priority = event.resource.priority;
    const bg = STATUS_COLORS[status] ?? "#9e9e9e";
    const border = PRIORITY_COLORS[priority] ?? "#ff9800";
    return {
      style: {
        backgroundColor: bg,
        borderLeft: `5px solid ${border}`,
        borderRadius: "3px",
        opacity: 0.85,
        color: "white",
        fontSize: "0.8rem",
        cursor: "pointer",
      },
    };
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    navigate(`/production/orders/${encodeURIComponent(event.id)}`);
  };

  const handleRefresh = () => {
    revalidator.revalidate();
  };

  return (
    <DpContent title="Planificación" breadcrumbItems={["PRODUCCIÓN", "PLANIFICACIÓN"]}>
      <DpContentHeader onLoad={handleRefresh} loading={isLoading} />

      <div className="flex gap-2 mb-3 items-center">
        <label className="text-sm">Desde:</label>
        <input type="date" value={dateFrom} onChange={(e) => { const v = e.target.value; setDateFrom(v); loadOrders(v, dateTo); }} className="p-inputtext p-component p-inputtext-sm" />
        <label className="text-sm">Hasta:</label>
        <input type="date" value={dateTo} onChange={(e) => { const v = e.target.value; setDateTo(v); loadOrders(dateFrom, v); }} className="p-inputtext p-component p-inputtext-sm" />
        <div className="flex gap-2 ml-3">
          <button className="p-button p-button-sm p-button-text" onClick={() => setView("month")}>Mes</button>
          <button className="p-button p-button-sm p-button-text" onClick={() => setView("week")}>Semana</button>
          <button className="p-button p-button-sm p-button-text" onClick={() => setView("day")}>Día</button>
        </div>
      </div>

      <div style={{ height: "600px" }}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: "100%" }}
          view={view}
          onView={(v: string) => setView(v as typeof view)}
          onNavigate={(date: Date) => {
            const df = format(date, "yyyy-MM-dd");
            const dt = format(new Date(date.getFullYear(), date.getMonth() + 2, 0), "yyyy-MM-dd");
            setDateFrom(df);
            setDateTo(dt);
            loadOrders(df, dt);
          }}
          eventPropGetter={eventStyleGetter}
          onSelectEvent={handleSelectEvent}
          messages={{
            today: "Hoy",
            previous: "Anterior",
            next: "Siguiente",
            month: "Mes",
            week: "Semana",
            day: "Día",
            agenda: "Agenda",
            date: "Fecha",
            time: "Hora",
            event: "Evento",
            noEventsInRange: "No hay órdenes en este rango",
          }}
        />
      </div>
    </DpContent>
  );
}
