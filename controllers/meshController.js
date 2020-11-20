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
