import mongoose from 'mongoose';

/**
 * Middleware to validate MongoDB ObjectId route parameters
 * @param {string} paramName - Name of the route parameter (default: 'id')
 */
export const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ${paramName} format. Must be a valid 24-character hexadecimal ObjectId.`
      });
    }
    next();
  };
};

export default validateObjectId;
