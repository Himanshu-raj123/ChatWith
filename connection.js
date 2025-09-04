const mg = require('mongoose')

async function connectMongodb(url){
   return mg.connect(url)
}

module.exports = connectMongodb;