import { TreeSelect, type TreeSelectSelectionKeysType, type TreeSelectChangeEvent } from "primereact/treeselect";
import type { CategoryTreeNode } from "~/features/inventory/product-categories";
import { computePrimaryCategoryPath } from "~/features/inventory/product-categories";

interface TreeNode {
  key: string;
  label: string;
  data: string;
  children?: TreeNode[];
  selectable: boolean;
}

function buildTreeSelectNodes(nodes: CategoryTreeNode[]): TreeNode[] {
  return nodes.map((n) => ({
    key: n.id,
    label: `${n.code} - ${n.name}`,
    data: n.id,
    children: n.children.length > 0 ? buildTreeSelectNodes(n.children) : undefined,
    selectable: true,
  }));
}

export interface CategorySelectorProps {
  value: string[];
  onChange: (categoryIds: string[], primaryCategoryPath: string[]) => void;
  categories: CategoryTreeNode[];
  disabled?: boolean;
}

export default function CategorySelector({
  value,
  onChange,
  categories,
  disabled,
}: CategorySelectorProps) {
  const nodes = buildTreeSelectNodes(categories);

  const handleChange = (e: TreeSelectChangeEvent) => {
    const selected = e.value;
    const ids: string[] = [];
    if (selected) {
      if (typeof selected === "object" && !Array.isArray(selected) && selected !== null) {
        for (const [key, val] of Object.entries(selected)) {
          if (val === true || (typeof val === "object" && val !== null && (val as { checked?: boolean }).checked)) {
            ids.push(key);
          }
        }
      }
    }
    const primaryPath = ids.length > 0 ? computePrimaryCategoryPath(categories, ids) : [];
    onChange(ids, primaryPath);
  };

  const selectionKeys: TreeSelectSelectionKeysType = {};
  for (const id of value) {
    selectionKeys[id] = { checked: true, partialChecked: false };
  }

  return (
    <TreeSelect
      value={selectionKeys}
      options={nodes}
      onChange={handleChange}
      selectionMode="checkbox"
      placeholder="Seleccione categorías..."
      className="w-full"
      disabled={disabled}
    />
  );
}
