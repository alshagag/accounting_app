import { getAllTransactions } from "@/data/db/db.js";
import { normalizeTransactionType } from "@/services/lib/helpers.js";

/**
 * Calculates the current stock for each product.
 * @returns {Promise<Map<string, number>>} A map of product names to their stock quantity.
 */
export async function getInventoryMap() {
  let transactions;
  try {
    transactions = await getAllTransactions();
  } catch (error) {
    console.error("getInventoryMap error:", error);
    return new Map();
  }
  const inventory = new Map();

  transactions.forEach(transaction => {
    const product = String(transaction.product || "").trim();
    if (!product) return;

    const quantity = Number(transaction.quantity ?? transaction.qty ?? 0) || 0;
    const type = normalizeTransactionType(transaction.type);
    const current = Number(inventory.get(product) || 0);

    if (type === "شراء" || type === "استلام بضائع") {
      inventory.set(product, current + quantity);
    } else if (type === "بيع") {
      inventory.set(product, current - quantity);
    }
  });

  return inventory;
}
