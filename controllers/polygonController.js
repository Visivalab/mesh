const Polygon = require('../models/Polygon')
const Project = require('../models/Project')

exports.savePolygon = async function(req,res){
  // Guarda el poligono Y LO AÑADE AL PROYECTO
  let idProject = req.body.project
  const newPolygon = new Polygon({
    name: req.body.name,
    color: req.body.color,
    link: req.body.link,
    points: req.body.points
  })
  newPolygon.save()

  let project = await Project.findById(idProject)
  project.polygons.push(newPolygon._id)
  project.save()

  res.send(newPolygon)
}

exports.updatePolygon = async function(req,res){
  // Agarra el poligono en questión y cambia cosas
  let updatePolygon = await Polygon.findById(req.body.id)
  updatePolygon.name = req.body.name
  updatePolygon.link = req.body.link
  updatePolygon.save()

  res.send(updatePolygon)
}

exports.deletePolygon = async function(req,res){
  // Borra el poligono Y LO QUITA DEL PROYECTO
  let idProject = req.body.idProject
  let idPolygon = req.body.id

  let deletePolygon = await Polygon.findByIdAndDelete(idPolygon)

  let project = await Project.findById(idProject)
  
  let index = project.polygons.indexOf(idPolygon)
  if(index > -1) project.polygons.splice(index, 1)

  project.save()
  
  console.log("Polygon deleted")
  res.send(deletePolygon)
}