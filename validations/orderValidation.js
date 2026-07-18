const validateCreateOrder = (body) => {
  const errors = [];
  const { deliveryAddress, paymentMethod } = body;

  if (!deliveryAddress || typeof deliveryAddress !== 'object') {
    errors.push('Delivery address is required');
  } else {
    const { line1, city, state, pincode } = deliveryAddress;
    if (!line1 || !line1.trim()) errors.push('Delivery address line1 is required');
    if (!city || !city.trim()) errors.push('Delivery address city is required');
    if (!state || !state.trim()) errors.push('Delivery address state is required');
    if (!pincode || !/^[0-9]{4,10}$/.test(pincode)) errors.push('A valid pincode is required');
  }

  if (paymentMethod && !['Razorpay', 'COD'].includes(paymentMethod)) {
    errors.push('Payment method must be Razorpay or COD');
  }

  return errors;
};

const mongoose = require('mongoose');

const validateAssignDeliveryStaff = (body) => {
  const errors = [];
  const { deliveryStaffId } = body;

  if (!deliveryStaffId || !mongoose.Types.ObjectId.isValid(deliveryStaffId)) {
    errors.push('A valid deliveryStaffId is required');
  }

  return errors;
};

module.exports = { validateCreateOrder, validateAssignDeliveryStaff };
