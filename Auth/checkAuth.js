const jwt = require('jsonwebtoken');

function checkAuth(req, res, next) {
   const token = req.cookies.jwt;

   if (!token) {
      return res.status(401).redirect('/user/login');
   }

   try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'HEllODEVELOPER');
      req.user = decoded; 
      next();
   } catch (err) {
      res.clearCookie('jwt');
      return res.status(401).redirect('/user/login');
   }
}

module.exports = checkAuth;
