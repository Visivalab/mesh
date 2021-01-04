const mongoose = require('mongoose')

const rulerSchema = new mongoose.Schema({
  name: String,
  date: Date,
  points: Array,
  color: String
})

module.exports = mongoose.model('Ruler', rulerSchema, 'rulers')