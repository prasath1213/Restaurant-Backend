/**
 * Standardized success response shape across the entire API, so frontend
 * clients can rely on a consistent envelope: { success, message, data, meta }
 */
const sendResponse = (res, statusCode, message, data = null, meta = null) => {
  const payload = {
    success: true,
    message,
  };

  if (data !== null) payload.data = data;
  if (meta !== null) payload.meta = meta;

  return res.status(statusCode).json(payload);
};

module.exports = sendResponse;
