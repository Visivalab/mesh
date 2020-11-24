const mongoose = require('mongoose')

const projectSchema = new mongoose.Schema({
  title: String,
  date: Date,
  meshes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Mesh' }]
})

module.exports = mongoose.model('Project', projectSchema, 'projects')