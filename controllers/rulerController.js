const Ruler = require('../models/Ruler')
const Project = require('../models/Project')

exports.saveRuler = async function(req,res){
  // Guarda el ruler Y LO AÑADE AL PROYECTO
  let idProject = req.body.idProject
  const newRuler = new Ruler({
    name: req.body.name,
    color: req.body.color,
    points: req.body.points
  })
  newRuler.save()

  let project = await Project.findById(idProject)
  project.polygons.push(newRuler._id)
  project.save()

  res.send(newRuler)
}

exports.deleteRuler = async function(req,res){
  let deleteRuler = await Ruler.findByIdAndDelete(req.body.id)
  res.send(deleteRuler)
}