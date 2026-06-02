import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  index("routes/Home.tsx"),
  route("login", "routes/Login.tsx"),
  layout("routes/Dashboard.tsx", [
    route("home", "routes/DashboardHome.tsx"),
    route("reports", "routes/reports/ReportDefinitionsPage.tsx"),
    route("reports/:definitionId/runs", "routes/reports/ReportRunsPage.tsx"),
    route("system/billing", "routes/system/billing/BillingPage.tsx"),
    route("system/dashboard-metrics", "routes/system/dashboard-metrics/DashboardMetricsPage.tsx"),
    route("system/companies/:id/company-users", "routes/system/company-users/CompanyUsersPage.tsx", [
      route("add", "routes/system/company-users/CompanyUserAdd.tsx"),
      route("edit/:companyUserDocId", "routes/system/company-users/CompanyUserEdit.tsx"),
    ]),
    route("system/users", "routes/system/users/UsersPage.tsx"),
    route("system/roles", "routes/system/roles/RolesPage.tsx"),
    route("system/roles/:id", "routes/system/roles/RolesDetail.tsx"),
    route("system/modules", "routes/system/modules/ModulesPage.tsx"),
    route("system/modules/:id", "routes/system/modules/ModulesDetail.tsx"),
    route("system/dashboard-config", "routes/system/dashboard-config/DashboardConfigPage.tsx"),
    route("system/dashboard-overrides", "routes/system/dashboard-overrides/DashboardOverridesPage.tsx"),
    route("system/sequences", "routes/system/sequences/SequencesPage.tsx", [
      route("add", "routes/system/sequences/SequenceAdd.tsx"),
      route("edit/:id", "routes/system/sequences/SequenceEdit.tsx"),
    ]),
    route("system/counters", "routes/system/counters/CountersPage.tsx", [
      route("add", "routes/system/counters/CounterAdd.tsx"),
      route("edit/:id", "routes/system/counters/CounterEdit.tsx"),
    ]),
    route("master/document-sequences", "routes/master/document-sequences/DocumentSequencesPage.tsx", [
      route("add", "routes/master/document-sequences/DocumentSequenceAdd.tsx"),
      route("edit/:id", "routes/master/document-sequences/DocumentSequenceEdit.tsx"),
    ]),
    route("master/documents", "routes/placeholder/master-documents.tsx"),
    route("master/clients", "routes/master/clients/ClientsPage.tsx", [
      route("add", "routes/master/clients/ClientAdd.tsx"),
      route("edit/:id", "routes/master/clients/ClientEdit.tsx"),
    ]),
    route("master/clients/:id/locations", "routes/master/clients/LocationsPage.tsx", [
      route("add", "routes/master/clients/LocationAdd.tsx"),
      route("edit/:locationId", "routes/master/clients/LocationEdit.tsx"),
    ]),
    route("human-resource/employees", "routes/human-resource/employees/EmployeesPage.tsx", [
      route("add", "routes/human-resource/employees/EmployeeAdd.tsx"),
      route("edit/:id", "routes/human-resource/employees/EmployeeEdit.tsx"),
    ]),
    route("human-resource/contracts", "routes/placeholder/hr-contracts.tsx"),
    route("human-resource/positions", "routes/human-resource/positions/PositionsPage.tsx", [
      route("add", "routes/human-resource/positions/PositionAdd.tsx"),
      route("edit/:id", "routes/human-resource/positions/PositionEdit.tsx"),
    ]),
    route("human-resource/resources", "routes/human-resource/resources/ResourcesPage.tsx", [
      route("add", "routes/human-resource/resources/ResourceAdd.tsx"),
      route("edit/:id", "routes/human-resource/resources/ResourceEdit.tsx"),
    ]),
    route("human-resource/resources/:id/costs", "routes/human-resource/resources/CostsPage.tsx", [
      route("add", "routes/human-resource/resources/CostAdd.tsx"),
      route("edit/:costId", "routes/human-resource/resources/CostEdit.tsx"),
    ]),
    route("logistic/orders", "routes/logistic/orders/OrdersPage.tsx", [
      route("add", "routes/logistic/orders/OrderAdd.tsx"),
      route("edit/:id", "routes/logistic/orders/OrderEdit.tsx"),
    ]),
    route("transport/transport-services", "routes/transport/transport-services/TransportServicesPage.tsx", [
      route("add", "routes/transport/transport-services/TransportServiceAdd.tsx"),
      route("edit/:id", "routes/transport/transport-services/TransportServiceEdit.tsx"),
    ]),
    route("transport/charge-types", "routes/transport/charge-types/ChargeTypesPage.tsx", [
      route("add", "routes/transport/charge-types/ChargeTypeAdd.tsx"),
      route("edit/:id", "routes/transport/charge-types/ChargeTypeEdit.tsx"),
    ]),
    route("transport/transport-contracts", "routes/transport/transport-contracts/TransportContractsPage.tsx", [
      route("add",      "routes/transport/transport-contracts/TransportContractAdd.tsx"),
      route("edit/:id", "routes/transport/transport-contracts/TransportContractEdit.tsx"),
    ]),
    route("transport/transport-contracts/:id/transport-rate-rules", "routes/transport/transport-contracts/TransportRateRulesPage.tsx", [
      route("add",           "routes/transport/transport-contracts/TransportRateRuleAdd.tsx"),
      route("edit/:ruleId",  "routes/transport/transport-contracts/TransportRateRuleEdit.tsx"),
    ]),
    route("transport/vehicles", "routes/transport/vehicles/VehiclesPage.tsx", [
      route("add", "routes/transport/vehicles/VehicleAdd.tsx"),
      route("edit/:id", "routes/transport/vehicles/VehicleEdit.tsx"),
    ]),
    route("transport/drivers", "routes/transport/drivers/DriversPage.tsx", [
      route("add", "routes/transport/drivers/DriverAdd.tsx"),
      route("edit/:id", "routes/transport/drivers/DriverEdit.tsx"),
    ]),
    route("transport/plans", "routes/transport/plans/PlansPage.tsx", [
      route("add", "routes/transport/plans/PlanAdd.tsx"),
      route("edit/:id", "routes/transport/plans/PlanEdit.tsx"),
    ]),
    route("transport/routes", "routes/transport/routes/RoutesPage.tsx", [
      route("add", "routes/transport/routes/RouteAdd.tsx"),
      route("edit/:id", "routes/transport/routes/RouteEdit.tsx"),
    ]),
    route("transport/routes/:id/stops", "routes/transport/routes/StopsPage.tsx", [
      route("add", "routes/transport/routes/StopAdd.tsx"),
      route("edit/:stopId", "routes/transport/routes/StopEdit.tsx"),
    ]),
    route("transport/trips", "routes/transport/trips/TripsPage.tsx", [
      route("add", "routes/transport/trips/TripAdd.tsx"),
      route("edit/:id", "routes/transport/trips/TripEdit.tsx"),
    ]),
    route("transport/trips/:id/trip-stops", "routes/transport/trips/TripStopsPage.tsx", [
      route("add", "routes/transport/trips/TripStopAdd.tsx"),
      route("edit/:stopId", "routes/transport/trips/TripStopEdit.tsx"),
    ]),
    route("transport/trips/:id/trip-costs", "routes/transport/trips/TripCostsPage.tsx", [
      route("add", "routes/transport/trips/TripCostAdd.tsx"),
      route("edit/:costId", "routes/transport/trips/TripCostEdit.tsx"),
    ]),
    route("transport/trips/:id/trip-charges", "routes/transport/trips/TripChargesPage.tsx", [
      route("add", "routes/transport/trips/TripChargeAdd.tsx"),
      route("edit/:chargeId", "routes/transport/trips/TripChargeEdit.tsx"),
    ]),
    route("transport/trips/:id/trip-assignments", "routes/transport/trips/TripAssignmentsPage.tsx", [
      route("add", "routes/transport/trips/TripAssignmentAdd.tsx"),
      route("edit/:assignmentId", "routes/transport/trips/TripAssignmentEdit.tsx"),
    ]),
    route("transport/settlements", "routes/transport/settlements/SettlementsPage.tsx", [
      route("add", "routes/transport/settlements/SettlementAdd.tsx"),
      route("edit/:id", "routes/transport/settlements/SettlementEdit.tsx"),
    ]),
    route("transport/settlements/:id/items", "routes/transport/settlements/SettlementItemsPage.tsx", [
      route("add", "routes/transport/settlements/SettlementItemAdd.tsx"),
      route("edit/:itemId", "routes/transport/settlements/SettlementItemEdit.tsx"),
    ]),
    route("billing/sunat-config", "routes/billing/sunat-config/SunatConfigPage.tsx", [
      route("add", "routes/billing/sunat-config/SunatConfigAdd.tsx"),
      route("edit/:id", "routes/billing/sunat-config/SunatConfigEdit.tsx"),
    ]),
    route("billing/sunat-monitor", "routes/billing/sunat-monitor/SunatMonitorPage.tsx"),
    route("billing/invoices", "routes/billing/invoice/InvoicesPage.tsx", [
      route("add",      "routes/billing/invoice/InvoiceAdd.tsx"),
      route("edit/:id", "routes/billing/invoice/InvoiceEdit.tsx"),
    ]),
    route("billing/invoices/:id/items", "routes/billing/invoice/InvoiceItemsPage.tsx", [
      route("add",           "routes/billing/invoice/InvoiceItemAdd.tsx"),
      route("edit/:itemId",  "routes/billing/invoice/InvoiceItemEdit.tsx"),
    ]),
    route("billing/invoices/:id/credits", "routes/billing/invoice/InvoiceCreditsPage.tsx", [
      route("add", "routes/billing/invoice/InvoiceCreditAdd.tsx"),
      route("edit/:creditId", "routes/billing/invoice/InvoiceCreditEdit.tsx"),
    ]),

    // Purchasing
    route("purchasing/suppliers", "routes/purchasing/suppliers/SuppliersPage.tsx", [
      route("add", "routes/purchasing/suppliers/SupplierAdd.tsx"),
      route("edit/:id", "routes/purchasing/suppliers/SupplierEdit.tsx"),
    ]),
    route("purchasing/purchase-orders", "routes/purchasing/purchase-orders/PurchaseOrdersPage.tsx", [
      route("add", "routes/purchasing/purchase-orders/PurchaseOrderAdd.tsx"),
      route("edit/:id", "routes/purchasing/purchase-orders/PurchaseOrderEdit.tsx"),
    ]),
    route("purchasing/purchase-orders/:id/items", "routes/purchasing/purchase-orders/PurchaseOrderItemsPage.tsx", [
      route("add", "routes/purchasing/purchase-orders/PurchaseOrderItemAdd.tsx"),
      route("edit/:itemId", "routes/purchasing/purchase-orders/PurchaseOrderItemEdit.tsx"),
    ]),

    // Sales
    route("sales/quotations", "routes/sales/quotations/QuotationsPage.tsx", [
      route("add", "routes/sales/quotations/QuotationAdd.tsx"),
      route("edit/:id", "routes/sales/quotations/QuotationEdit.tsx"),
    ]),
    route("sales/quotations/:id/items", "routes/sales/quotations/QuotationItemsPage.tsx", [
      route("add", "routes/sales/quotations/QuotationItemAdd.tsx"),
      route("edit/:itemId", "routes/sales/quotations/QuotationItemEdit.tsx"),
    ]),
    route("sales/sale-orders", "routes/sales/sale-orders/SaleOrdersPage.tsx", [
      route("add", "routes/sales/sale-orders/SaleOrderAdd.tsx"),
      route("edit/:id", "routes/sales/sale-orders/SaleOrderEdit.tsx"),
    ]),
    route("sales/ecommerce-orders", "routes/sales/ecommerce-orders/EcommerceOrdersPage.tsx"),
    route("sales/sale-orders/:id/items", "routes/sales/sale-orders/SaleOrderItemsPage.tsx", [
      route("add", "routes/sales/sale-orders/SaleOrderItemAdd.tsx"),
      route("edit/:itemId", "routes/sales/sale-orders/SaleOrderItemEdit.tsx"),
    ]),

    // Production
    route("production/recipes", "routes/production/recipes/RecipesPage.tsx", [
      route("add", "routes/production/recipes/RecipeAdd.tsx"),
      route("edit/:id", "routes/production/recipes/RecipeEdit.tsx"),
    ]),
    route("production/recipes/:id/materials", "routes/production/recipes/RecipeMaterialsPage.tsx", [
      route("add", "routes/production/recipes/RecipeMaterialAdd.tsx"),
      route("edit/:materialId", "routes/production/recipes/RecipeMaterialEdit.tsx"),
    ]),
    route("production/recipes/:id/results", "routes/production/recipes/RecipeResultsPage.tsx", [
      route("add", "routes/production/recipes/RecipeResultAdd.tsx"),
      route("edit/:resultId", "routes/production/recipes/RecipeResultEdit.tsx"),
    ]),
    route("production/orders", "routes/production/orders/OrdersPage.tsx", [
      route("add", "routes/production/orders/OrderAdd.tsx"),
      route("edit/:id", "routes/production/orders/OrderEdit.tsx"),
    ]),
    route("production/orders/:id", "routes/production/orders/OrderDetailPage.tsx"),
    route("production/orders/:id/materials", "routes/production/orders/OrderMaterialsPage.tsx"),
    route("production/orders/:id/results", "routes/production/orders/OrderResultsPage.tsx", [
      route("edit/:resultId", "routes/production/orders/OrderResultEdit.tsx"),
    ]),
    route("production/orders/:id/costs", "routes/production/orders/OrderCostsPage.tsx", [
      route("add", "routes/production/orders/OrderCostAdd.tsx"),
      route("edit/:costId", "routes/production/orders/OrderCostEdit.tsx"),
    ]),
    route("production/planning", "routes/production/planning/PlanningPage.tsx"),

    // Inventory
    route("inventory/product-categories", "routes/inventory/product-categories/ProductCategoriesPage.tsx", [
      route("add", "routes/inventory/product-categories/ProductCategoryAdd.tsx"),
      route("edit/:id", "routes/inventory/product-categories/ProductCategoryEdit.tsx"),
    ]),
    route("inventory/variant-attribute-types", "routes/inventory/variant-attribute-types/VariantAttributeTypesPage.tsx", [
      route("add", "routes/inventory/variant-attribute-types/VariantAttributeTypeAdd.tsx"),
      route("edit/:id", "routes/inventory/variant-attribute-types/VariantAttributeTypeEdit.tsx"),
    ]),
    route("inventory/filterable-attribute-types", "routes/inventory/filterable-attribute-types/FilterableAttributeTypesPage.tsx", [
      route("add", "routes/inventory/filterable-attribute-types/FilterableAttributeTypeAdd.tsx"),
      route("edit/:id", "routes/inventory/filterable-attribute-types/FilterableAttributeTypeEdit.tsx"),
    ]),
    route("inventory/products", "routes/inventory/products/ProductsPage.tsx", [
      route("add", "routes/inventory/products/ProductAdd.tsx"),
      route("edit/:id", "routes/inventory/products/ProductEdit.tsx"),
    ]),
    route("inventory/products/:id/variants", "routes/inventory/products/ProductVariantsPage.tsx", [
      route("add", "routes/inventory/products/ProductVariantAdd.tsx"),
      route("edit/:variantId", "routes/inventory/products/ProductVariantEdit.tsx"),
    ]),
    route("inventory/warehouses", "routes/inventory/warehouses/WarehousesPage.tsx", [
      route("add", "routes/inventory/warehouses/WarehouseAdd.tsx"),
      route("edit/:id", "routes/inventory/warehouses/WarehouseEdit.tsx"),
    ]),
    route("inventory/movements", "routes/inventory/movements/MovementsPage.tsx", [
      route("add", "routes/inventory/movements/MovementAdd.tsx"),
      route("edit/:id", "routes/inventory/movements/MovementEdit.tsx"),
    ]),
    route("inventory/stock", "routes/inventory/stock/StockPage.tsx"),
  ]),
] satisfies RouteConfig;
