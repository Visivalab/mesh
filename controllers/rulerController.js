const Ruler = require('../models/Ruler')
const Project = require('../models/Project')

exports.saveRuler = async function(req,res){
  // Guarda el ruler Y LO AÑADE AL PROYECTO
  let idProject = req.body.idProject

  console.log(idProject)
  const newRuler = new Ruler({
    name: req.body.name,
    color: req.body.color,
    points: req.body.points
  })
  newRuler.save()

  let project = await Project.findById(idProject)
  project.rulers.push(newRuler._id)
  project.save()

  res.send(newRuler)
}

exports.updateRuler = async function(req,res){
  let updateRuler = await Ruler.findById(req.body.id)
  updateRuler.name = req.body.name
  updateRuler.save()

  res.send(updateRuler)
}

exports.deleteRuler = async function(req,res){
  // Borra el ruler Y LO QUITA DEL PROYECTO
  let idProject = req.body.idProject
  let idRuler = req.body.id

  let deleteRuler = await Ruler.findByIdAndDelete(idRuler)

  let project = await Project.findById(idProject)
  
  let index = project.rulers.indexOf(idRuler)
  if(index > 0) project.rulers.splice(index, 1)

  project.save()

  res.send(deleteRuler)
}