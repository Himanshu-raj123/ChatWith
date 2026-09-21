const mg = require('mongoose');
const dns = require('dns');

// Prefer IPv4 first for faster, more reliable DNS resolution
if (dns.setDefaultResultOrder) {
   dns.setDefaultResultOrder('ipv4first');
}

async function connectMongodb(url) {
   try {
      // 1. First attempt: Connect using the default OS DNS resolver
      return await mg.connect(url);
   } catch (err) {
      // Check if the failure was specifically caused by SRV / DNS issues on local network
      const isDnsError = err && (
         err.message?.includes('querySrv') ||
         err.code === 'ECONNREFUSED' ||
         err.code === 'ENOTFOUND' ||
         err.code === 'ESERVFAIL'
      );

      if (isDnsError && url.startsWith('mongodb+srv://')) {
         console.warn("Default OS DNS could not resolve MongoDB SRV. Applying in-memory Node fallback resolver...");
         try {
            // Apply fallback DNS ONLY to this Node.js process (does NOT change OS settings)
            dns.setServers(['1.1.1.1', '8.8.8.8']);
            return await mg.connect(url);
         } catch (fallbackErr) {
            throw fallbackErr;
         }
      }
      throw err;
   }
}

module.exports = connectMongodb;