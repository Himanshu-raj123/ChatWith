const jwt = require('jsonwebtoken');

function isloggedin(req, res, next) {
   const token = req.cookies.jwt;

   if (!token) {
      return next();
   }
   
   try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'HEllODEVELOPER');
      req.user = decoded;
      return res.status(200).redirect('/user/dashboard');
   } catch (err) {
      res.clearCookie('jwt');
      return next();
   }
}

module.exports = isloggedin;
