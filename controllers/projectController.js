const Project = require('../models/Project')

exports.allProjects = function(req,res){
  Project
  .find({})
  .populate('meshes')
  .populate('polygons')
  .populate('rulers')
  .exec(function(err,finded){
    if(err) console.log(err)
    //console.log(finded)
    res.json(finded)
  })
}

exports.project = function(req,res){
  let id = req.params.id
  Project
  .findById(id)
  .populate('meshes')
  .populate('polygons')
  .populate('rulers')
  .exec(function(err,finded){
    if(err) return console.log(err)
    //console.log(finded)
    res.json(finded)
  })
}