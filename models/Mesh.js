const mongoose = require('mongoose')

//Creamos un schema - La representación de lo que tiene este tipo de elemento
const meshSchema = new mongoose.Schema({
    name: String,
    date: Date,
    url: String,
    layers: [ mongoose.ObjectId ]
})
// A patir del schema, creamos un modelo.
module.exports = mongoose.model('Mesh', meshSchema, 'meshes')
// Con este modelo ya podemos crear tantos elementos como queramos que van a seguir el patrón del schema