const { STATUS_TRANSITION_RULES } = require('../config/constants');

/**
 * Validates whether a status transition is permitted for the given role.
 * Enforces both (a) that the transition itself is a legal step in the workflow,
 * and (b) that the requesting role is authorized to perform that specific step.
 *
 * @param {string} fromStatus current order status
 * @param {string} toStatus desired next status
 * @param {string} role requesting user's role
 * @returns {{allowed: boolean, reason?: string}}
 */
const canTransition = (fromStatus, toStatus, role) => {
  const key = `${fromStatus}->${toStatus}`;
  const permittedRoles = STATUS_TRANSITION_RULES[key];

  if (!permittedRoles) {
    return { allowed: false, reason: `Cannot transition order from '${fromStatus}' to '${toStatus}'.` };
  }

  if (!permittedRoles.includes(role)) {
    return {
      allowed: false,
      reason: `Role '${role}' is not permitted to change order status from '${fromStatus}' to '${toStatus}'.`,
    };
  }

  return { allowed: true };
};

module.exports = { canTransition };
