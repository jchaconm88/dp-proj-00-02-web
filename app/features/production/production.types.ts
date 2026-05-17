export type RecipeStatus = "active" | "inactive";
export type OrderStatus = "borrador" | "planificada" | "en_proceso" | "completada" | "cancelada";
export type OrderPriority = "alta" | "media" | "baja";
export type CostAllocationMethod = "percentage" | "fixed" | "proration";
export type ResultLineType = "finished_good" | "by_product" | "waste";

export interface RecipeRecord {
  id: string;
  code: string;
  name: string;
  description: string;
  status: RecipeStatus;
  version: number;
  previousVersionId: string | null;
  baseQuantity: number;
  baseUnitOfMeasureCode: string;
  baseUnitOfMeasureName: string;
  baseUnitOfMeasureAbbreviation: string;
  companyId: string;
  accountId: string;
  createAt: string;
  createBy: string;
  updateAt: string;
  updateBy: string;
}

export interface RecipeAddInput {
  code: string;
  name: string;
  description?: string;
  baseQuantity: number;
  baseUnitOfMeasureCode: string;
  baseUnitOfMeasureName?: string;
  baseUnitOfMeasureAbbreviation?: string;
}

export type RecipeEditInput = Partial<Omit<RecipeRecord, "id" | "companyId" | "accountId" | "createAt" | "createBy" | "updateAt" | "updateBy">>;

export interface RecipeMaterialRecord {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  quantity: number;
  unitOfMeasureId: string;
  unitOfMeasureCode: string;
  unitOfMeasureName: string;
  unitOfMeasureAbbreviation: string;
  unitOfMeasureSunatCode: string;
  unitOfMeasureSunatName: string;
  createAt: string;
  createBy: string;
  updateAt?: string;
  updateBy?: string;
}

export interface RecipeMaterialAddInput {
  productId: string;
  productName: string;
  productCode?: string;
  quantity: number;
  unitOfMeasureCode: string;
  unitOfMeasureName?: string;
  unitOfMeasureAbbreviation?: string;
}

export type RecipeMaterialEditInput = Partial<Omit<RecipeMaterialRecord, "id" | "createAt" | "createBy">>;

export interface RecipeResultRecord {
  id: string;
  type: ResultLineType;
  productId: string;
  productName: string;
  productCode: string;
  description: string;
  quantity: number;
  unitOfMeasureId: string;
  unitOfMeasureCode: string;
  unitOfMeasureName: string;
  unitOfMeasureAbbreviation: string;
  unitOfMeasureSunatCode: string;
  unitOfMeasureSunatName: string;
  createAt: string;
  createBy: string;
  updateAt?: string;
  updateBy?: string;
}

export interface RecipeResultAddInput {
  type: ResultLineType;
  productId?: string;
  productName?: string;
  productCode?: string;
  description?: string;
  quantity: number;
  unitOfMeasureCode: string;
  unitOfMeasureName?: string;
  unitOfMeasureAbbreviation?: string;
}

export type RecipeResultEditInput = Partial<Omit<RecipeResultRecord, "id" | "createAt" | "createBy">>;

export interface ProductionOrderRecord {
  id: string;
  code: string;
  status: OrderStatus;
  priority: OrderPriority;
  recipeId: string;
  recipeName: string;
  recipeVersion: number;
  quantityToProduce: number;
  productionFactor: number;
  realQuantityProduced: number | null;
  finishedProductId: string;
  finishedProductName: string;
  sourceWarehouseId: string;
  sourceWarehouseName: string;
  destinationWarehouseId: string;
  destinationWarehouseName: string;
  plannedStartDate: string;
  plannedEndDate: string;
  actualStartDate: string | null;
  actualEndDate: string | null;
  yieldPercentage: number | null;
  wastePercentage: number | null;
  materialCost: number | null;
  totalCost: number | null;
  unitCost: number | null;
  currency: string;
  companyId: string;
  accountId: string;
  locationId: string;
  locationName?: string;
  createAt: string;
  createBy: string;
  updateAt: string;
  updateBy: string;
}

export interface OrderAddInput {
  code: string;
  recipeId: string;
  quantityToProduce: number;
  priority?: OrderPriority;
  plannedStartDate: string;
  plannedEndDate: string;
  sourceWarehouseId: string;
  sourceWarehouseName?: string;
  destinationWarehouseId: string;
  destinationWarehouseName?: string;
  locationId?: string;
  locationName?: string;
  currency?: string;
}

export type OrderEditInput = Partial<Omit<ProductionOrderRecord, "id" | "code" | "companyId" | "accountId" | "createAt" | "createBy" | "updateAt" | "updateBy" | "productionFactor" | "finishedProductId" | "finishedProductName" | "recipeId" | "recipeName" | "recipeVersion">>;

export interface OrderMaterialRecord {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  requiredQuantity: number;
  unitOfMeasureId: string;
  unitOfMeasureCode: string;
  unitOfMeasureName: string;
  unitOfMeasureAbbreviation: string;
  unitOfMeasureSunatCode: string;
  unitOfMeasureSunatName: string;
  unitCostAtCreation: number | null;
  createAt: string;
  createBy: string;
}

export interface OrderResultRecord {
  id: string;
  type: ResultLineType;
  productId: string;
  productName: string;
  productCode: string;
  description: string;
  plannedQuantity: number;
  actualQuantity: number;
  unitOfMeasureId: string;
  unitOfMeasureCode: string;
  unitOfMeasureName: string;
  unitOfMeasureAbbreviation: string;
  unitOfMeasureSunatCode: string;
  unitOfMeasureSunatName: string;
  monetaryValue: number | null;
  createAt: string;
  createBy: string;
  updateAt?: string;
  updateBy?: string;
}

export interface OrderResultEditInput {
  actualQuantity?: number;
  monetaryValue?: number;
}

export interface ProductionCostRecord {
  id: string;
  type: "direct_labor" | "indirect";
  concept: string;
  amount: number;
  hours: number | null;
  hourlyRate: number | null;
  allocationMethod: CostAllocationMethod | null;
  percentage: number | null;
  fixedAmount: number | null;
  totalAmountForProration: number | null;
  createAt: string;
  createBy: string;
  updateAt?: string;
  updateBy?: string;
}

export interface CostAddInput {
  type: "direct_labor" | "indirect";
  concept: string;
  amount: number;
  hours?: number;
  hourlyRate?: number;
  allocationMethod?: CostAllocationMethod;
  percentage?: number;
  fixedAmount?: number;
  totalAmountForProration?: number;
}

export type CostEditInput = Partial<Omit<ProductionCostRecord, "id" | "createAt" | "createBy" | "type">>;

export interface MaterialSummaryRecord {
  productId: string;
  productName: string;
  productCode: string;
  totalQuantity: number;
  unitOfMeasureCode: string;
  unitOfMeasureName: string;
  unitOfMeasureAbbreviation: string;
  orders: string[];
}

export interface TransitionPayload {
  targetStatus: string;
  realQuantityProduced?: number;
}
