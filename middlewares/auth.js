const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
   const token = req.cookies.jwt;
   if (!token){
      return res.redirect('/user/login');
   }
   try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'HEllODEVELOPER');
      req.user = decoded; 
      next();
   } catch (err) {
      res.clearCookie('jwt');
      return res.redirect('/user/login');
   }
}

function requireGuest(req, res, next) {
   const token = req.cookies.jwt;

   if (!token) {
      return next();
   }
   
   try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'HEllODEVELOPER');
      req.user = decoded;
      return res.redirect('/user/dashboard');
   } catch (err) {
      res.clearCookie('jwt');
      return next();
   }
}

// Authorization middleware
function authorizeRoles(...allowedRoles) {
   return (req, res, next) => {
      if (!req.user || !req.user.role) {
         return res.status(403).send("Forbidden: User role not found");
      }
      
      if (!allowedRoles.includes(req.user.role)) {
         return res.status(403).send("Forbidden: You don't have permission to perform this action");
      }
      
      next();
   };
}

module.exports = {
   requireAuth,
   requireGuest,
   authorizeRoles
};
