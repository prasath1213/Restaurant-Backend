/**
 * Centralized application constants.
 * Keeping these in one place avoids magic strings scattered across the codebase.
 */

const ROLES = Object.freeze({
  CUSTOMER: 'customer',
  STAFF: 'staff',
  DELIVERY_STAFF: 'deliveryStaff',
  OWNER: 'owner',
});

const ALL_ROLES = Object.values(ROLES);

// Valid forward-moving order status pipeline as per the required workflow.
const ORDER_STATUS = Object.freeze({
  PLACED: 'Placed',
  ACCEPTED: 'Accepted',
  PREPARING: 'Preparing',
  READY_FOR_DELIVERY: 'ReadyForDelivery',
  OUT_FOR_DELIVERY: 'OutForDelivery',
  DELIVERED: 'Delivered',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
});

const ORDER_STATUS_FLOW = Object.freeze([
  ORDER_STATUS.PLACED,
  ORDER_STATUS.ACCEPTED,
  ORDER_STATUS.PREPARING,
  ORDER_STATUS.READY_FOR_DELIVERY,
  ORDER_STATUS.OUT_FOR_DELIVERY,
  ORDER_STATUS.DELIVERED,
  ORDER_STATUS.COMPLETED,
]);

// Defines which role is allowed to perform which status transition.
// Key = "fromStatus->toStatus", Value = array of permitted roles.
const STATUS_TRANSITION_RULES = Object.freeze({
  [`${ORDER_STATUS.PLACED}->${ORDER_STATUS.ACCEPTED}`]: [ROLES.STAFF, ROLES.OWNER],
  [`${ORDER_STATUS.ACCEPTED}->${ORDER_STATUS.PREPARING}`]: [ROLES.STAFF, ROLES.OWNER],
  [`${ORDER_STATUS.PREPARING}->${ORDER_STATUS.READY_FOR_DELIVERY}`]: [ROLES.STAFF, ROLES.OWNER],
  [`${ORDER_STATUS.READY_FOR_DELIVERY}->${ORDER_STATUS.OUT_FOR_DELIVERY}`]: [ROLES.DELIVERY_STAFF, ROLES.OWNER],
  [`${ORDER_STATUS.OUT_FOR_DELIVERY}->${ORDER_STATUS.DELIVERED}`]: [ROLES.DELIVERY_STAFF, ROLES.OWNER],
  [`${ORDER_STATUS.DELIVERED}->${ORDER_STATUS.COMPLETED}`]: [ROLES.CUSTOMER, ROLES.OWNER, ROLES.STAFF],
  // Cancellation allowed only while order hasn't left the kitchen.
  [`${ORDER_STATUS.PLACED}->${ORDER_STATUS.CANCELLED}`]: [ROLES.CUSTOMER, ROLES.STAFF, ROLES.OWNER],
  [`${ORDER_STATUS.ACCEPTED}->${ORDER_STATUS.CANCELLED}`]: [ROLES.STAFF, ROLES.OWNER],
});

const PAYMENT_STATUS = Object.freeze({
  PENDING: 'Pending',
  PAID: 'Paid',
  FAILED: 'Failed',
  REFUNDED: 'Refunded',
});

const PAYMENT_METHOD = Object.freeze({
  RAZORPAY: 'Razorpay',
  COD: 'COD',
});

module.exports = {
  ROLES,
  ALL_ROLES,
  ORDER_STATUS,
  ORDER_STATUS_FLOW,
  STATUS_TRANSITION_RULES,
  PAYMENT_STATUS,
  PAYMENT_METHOD,
};
