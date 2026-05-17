import menuData from "~/data/menu.json";
import type { SearchEntry, EntitySearchConfig, SearchRegistry } from "./global-search.types";

interface MenuItem {
  title?: string;
  icon?: string;
  link?: string;
  permission?: [string, string];
  group?: boolean;
  children?: MenuItem[];
}

function flattenMenu(items: MenuItem[], parentCategory?: string): SearchEntry[] {
  const result: SearchEntry[] = [];

  for (const item of items) {
    if (item.group) {
      if (item.children) {
        result.push(...flattenMenu(item.children, item.title));
      }
      continue;
    }

    if (item.link && item.link !== "#" && item.permission) {
      result.push({
        id: `nav-${item.link.replace(/\//g, "-").replace(/^-/, "") || "home"}`,
        title: item.title ?? "",
        keywords: [],
        path: item.link,
        icon: item.icon ?? "circle",
        category: parentCategory ?? "General",
        permission: { action: item.permission[0], module: item.permission[1] },
        type: "navigation",
      });
    }
  }

  return result;
}

const MANUAL_ENTRIES: SearchEntry[] = [
  {
    id: "qa-create-client",
    title: "Crear cliente",
    keywords: ["nuevo cliente", "agregar cliente", "registrar cliente"],
    path: "/master/clients/add",
    icon: "user-plus",
    category: "Maestros",
    permission: { action: "create", module: "client" },
    type: "quick-action",
  },
  {
    id: "qa-create-employee",
    title: "Crear empleado",
    keywords: ["nuevo empleado", "agregar empleado", "registrar empleado"],
    path: "/human-resource/employees/add",
    icon: "id-card",
    category: "RRHH",
    permission: { action: "create", module: "employee" },
    type: "quick-action",
  },
  {
    id: "qa-create-trip",
    title: "Crear viaje",
    keywords: ["nuevo viaje", "agregar viaje", "registrar viaje"],
    path: "/transport/trips/add",
    icon: "truck",
    category: "Transporte",
    permission: { action: "create", module: "trip" },
    type: "quick-action",
  },
  {
    id: "qa-create-purchase-order",
    title: "Crear orden de compra",
    keywords: ["nueva orden", "agregar compra"],
    path: "/purchasing/purchase-orders/add",
    icon: "shopping-cart",
    category: "Compras",
    permission: { action: "create", module: "purchase-order" },
    type: "quick-action",
  },
  {
    id: "qa-create-sale-order",
    title: "Crear orden de venta",
    keywords: ["nueva venta", "agregar venta"],
    path: "/sales/sale-orders/add",
    icon: "tag",
    category: "Ventas",
    permission: { action: "create", module: "sale-order" },
    type: "quick-action",
  },
  {
    id: "qa-create-recipe",
    title: "Crear receta",
    keywords: ["nueva receta", "agregar receta", "registrar receta", "bom", "formula"],
    path: "/production/recipes/add",
    icon: "book",
    category: "Producción",
    permission: { action: "create", module: "recipe" },
    type: "quick-action",
  },
  {
    id: "qa-create-production-order",
    title: "Crear orden de producción",
    keywords: ["nueva orden produccion", "agregar orden", "registrar orden produccion"],
    path: "/production/orders/add",
    icon: "cog",
    category: "Producción",
    permission: { action: "create", module: "production-order" },
    type: "quick-action",
  },
];

const ENTITY_CONFIGS: EntitySearchConfig[] = [
  {
    id: "entity-trip",
    entityId: "trip",
    fields: ["code", "origin", "destination"],
    detailPath: "/transport/trips/:id",
    icon: "truck",
    permission: { action: "view", module: "trip" },
    collection: "trips",
  },
  {
    id: "entity-client",
    entityId: "client",
    fields: ["code", "businessName", "documentNumber"],
    detailPath: "/master/clients/edit/:id",
    icon: "user",
    permission: { action: "view", module: "client" },
    collection: "clients",
  },
  {
    id: "entity-employee",
    entityId: "employee",
    fields: ["code", "fullName", "documentNumber"],
    detailPath: "/human-resource/employees/edit/:id",
    icon: "id-card",
    permission: { action: "view", module: "employee" },
    collection: "employees",
  },
  {
    id: "entity-purchase-order",
    entityId: "purchase-order",
    fields: ["code", "providerName", "status"],
    detailPath: "/purchasing/purchase-orders/edit/:id",
    icon: "shopping-cart",
    permission: { action: "view", module: "purchase-order" },
    collection: "purchase-orders",
  },
  {
    id: "entity-sale-order",
    entityId: "sale-order",
    fields: ["code", "clientName", "status"],
    detailPath: "/sales/sale-orders/edit/:id",
    icon: "tag",
    permission: { action: "view", module: "sale-order" },
    collection: "sale-orders",
  },
  {
    id: "entity-quotation",
    entityId: "quotation",
    fields: ["code", "clientName", "status"],
    detailPath: "/sales/quotations/edit/:id",
    icon: "file-invoice",
    permission: { action: "view", module: "quotation" },
    collection: "quotations",
  },
  {
    id: "entity-product",
    entityId: "product",
    fields: ["code", "name", "status"],
    detailPath: "/inventory/products/edit/:id",
    icon: "box",
    permission: { action: "view", module: "product" },
    collection: "products",
  },
  {
    id: "entity-production-order",
    entityId: "production-order",
    fields: ["code", "finishedProductName", "status"],
    detailPath: "/production/orders/edit/:id",
    icon: "cog",
    permission: { action: "view", module: "production-order" },
    collection: "production-orders",
  },
];

export function buildSearchRegistry(): SearchRegistry {
  const menuEntries = flattenMenu(menuData as MenuItem[]);
  const allEntries = [...menuEntries, ...MANUAL_ENTRIES];

  const seen = new Map<string, SearchEntry>();
  for (const entry of allEntries) {
    if (!entry.id || !entry.title || !entry.path) {
      console.warn("[global-search] invalid entry excluded:", entry.id ?? "(no id)");
      continue;
    }
    seen.set(entry.id, entry);
  }

  return {
    entries: Array.from(seen.values()),
    entityConfigs: ENTITY_CONFIGS,
  };
}
