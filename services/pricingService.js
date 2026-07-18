/**
 * Centralizes pricing logic so it's consistent between cart preview and final checkout.
 * Keeping this in a service (rather than inline in controllers) makes it easy to unit test
 * and to adjust business rules (tax %, delivery fee bands) in one place.
 */

const TAX_RATE = 0.05; // 5% GST-style flat tax, adjust as needed
const FREE_DELIVERY_THRESHOLD = 500; // orders above this amount get free delivery
const STANDARD_DELIVERY_FEE = 40;

/**
 * @param {Array<{price:number, quantity:number}>} items
 * @returns {{itemsTotal:number, deliveryFee:number, taxAmount:number, totalAmount:number}}
 */
const calculateOrderPricing = (items) => {
  const itemsTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = itemsTotal >= FREE_DELIVERY_THRESHOLD ? 0 : STANDARD_DELIVERY_FEE;
  const taxAmount = Math.round(itemsTotal * TAX_RATE * 100) / 100;
  const totalAmount = Math.round((itemsTotal + deliveryFee + taxAmount) * 100) / 100;

  return {
    itemsTotal: Math.round(itemsTotal * 100) / 100,
    deliveryFee,
    taxAmount,
    totalAmount,
  };
};

/**
 * Generates a human-readable, reasonably unique order number.
 * Format: ORD-YYYYMMDD-XXXXXX (random 6-digit suffix)
 */
const generateOrderNumber = () => {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate()
  ).padStart(2, '0')}`;
  const randomPart = Math.floor(100000 + Math.random() * 900000);
  return `ORD-${datePart}-${randomPart}`;
};

module.exports = { calculateOrderPricing, generateOrderNumber, TAX_RATE, FREE_DELIVERY_THRESHOLD };
