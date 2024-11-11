// src/middleware/validateServer.js
const Joi = require('joi');

const serverSchema = Joi.object({
  hostname: Joi.string().required(),
  ip: Joi.string().ip().required(),
  country: Joi.string().required(),
  city: Joi.string().required(),
  username: Joi.string().required(),
  password: Joi.string().required()
});

const validateServer = (req, res, next) => {
  const { error } = serverSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  next();
};

module.exports = validateServer;