const Mesh = require('../models/Mesh')

exports.upload = function(req,res){
    const newMesh = new Mesh({
        name: 'Mesh uploaded',
        date: Date.now(),
        url: 'la url',
        layers: []
    })
    // Hemos creado una mesh que podemos guardar en mongodb
    // El primer argumento del callback es el error
    newMesh.save(function (err, mesh) {
        if (err) return console.error(err);
        console.log(mesh);
    });
    
    res.send('Uploaded')
}

exports.getMesh = function(req,res){
    Mesh.find(
      {}, // Todo 
      null, // Sin cosas especificas
      {sort: {date: 1}}, // Opciones
      function(err,finded){ // Callback
        if(err) console.log(err)
        console.log(finded)
        res.json(finded)
    })
}