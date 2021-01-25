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

exports.renderProject = function(req,res){
  let id = req.params.id

  // Tendrá que buscar de una forma u otra dependiendo de si se le ha pasado un easyId o un id normal de mongodb
  let searchQuery = id.match(/^[0-9a-fA-F]{24}$/) ?  {_id: id} : {easyId: id}

  Project
  .find(searchQuery)
  .populate('meshes')
  .populate('polygons')
  .populate('rulers')
  .exec(function(err,finded){
    if(err) return console.log(err)
    res.render('index', { 
      title: finded[0].title,
      id: finded[0]._id,
      easyId: finded[0].easyId,
      date: finded[0].date
    })
  })
}