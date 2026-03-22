import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  index("routes/Home.tsx"),
  route("login", "routes/Login.tsx"),
  route("registro", "routes/Registro.tsx"),
  layout("routes/Dashboard.tsx", [
    route("home", "routes/DashboardHome.tsx"),
    route("system/users", "routes/system/users/UsersPage.tsx"),
    route("system/roles", "routes/system/roles/RolesPage.tsx"),
    route("system/roles/:id", "routes/system/roles/RolesDetail.tsx"),
    route("system/modules", "routes/system/modules/ModulesPage.tsx"),
    route("system/modules/:id", "routes/system/modules/ModulesDetail.tsx"),
    route("system/sequences", "routes/system/sequences/SequencesPage.tsx", [
      route("add", "routes/system/sequences/SequenceAdd.tsx"),
      route("edit/:id", "routes/system/sequences/SequenceEdit.tsx"),
    ]),
    route("system/counters", "routes/system/counters/CountersPage.tsx", [
      route("add", "routes/system/counters/CounterAdd.tsx"),
      route("edit/:id", "routes/system/counters/CounterEdit.tsx"),
    ]),
    route("master/document-types", "routes/master/document-types/DocumentTypesPage.tsx", [
      route("add", "routes/master/document-types/DocumentTypeAdd.tsx"),
      route("edit/:id", "routes/master/document-types/DocumentTypeEdit.tsx"),
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
  ]),
] satisfies RouteConfig;
