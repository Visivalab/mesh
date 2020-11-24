const Project = require('../models/Project')

exports.allProjects = function(req,res){
  Project
  .find({})
  .populate('meshes')
  .exec(function(err,finded){
    if(err) console.log(err)
    console.log(finded)
    res.json(finded)
  })
}

exports.project = function(req,res){
  let id = req.params.id
  Project
  .findById(id)
  .populate('meshes')
  .exec(function(err,finded){
    if(err) console.log(err)
    console.log(finded)
    res.json(finded)
  })
}