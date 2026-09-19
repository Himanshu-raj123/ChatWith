const dns = require('dns');
// Set public DNS servers to resolve MongoDB Atlas SRV records reliably in cloud environments like Railway
dns.setServers(['8.8.8.8', '1.1.1.1']);

const mg = require('mongoose');

async function connectMongodb(url){
   return mg.connect(url);
}

module.exports = connectMongodb;