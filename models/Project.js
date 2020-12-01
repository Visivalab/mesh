const mongoose = require('mongoose')

const projectSchema = new mongoose.Schema({
  title: String,
  date: Date,
  meshes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Mesh' }],
  polygons: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Polygon' }]
})

module.exports = mongoose.model('Project', projectSchema, 'projects')