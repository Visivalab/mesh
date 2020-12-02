const mongoose = require('mongoose')

const polygonSchema = new mongoose.Schema({
  name: String,
  date: Date,
  link: String,
  points: [{ x:Number, y:Number, z:Number}],
  color: String
})

module.exports = mongoose.model('Polygon', polygonSchema, 'polygons')