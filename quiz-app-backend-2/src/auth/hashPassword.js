const bcrypt = require("bcryptjs");

const hashPassword = async (req, res, next) => {
  if (!req.body.password) return next();

  //maintaining and checking my password
    password = req.body.password.trim();
   // console.log(password);
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if(!passwordRegex.test(password)){
        res.json({
            message:'Password must contain atleast 1 uppercase, 1 lowercase, 1 number, and 1 special character'
        })
    }
  const salt = await bcrypt.genSalt(5);
  //console.log("old: " + req.body.password);
  const hashedPassword = await bcrypt.hash(req.body.password, salt);

  // the password you passed when signing up will be our placeholder for the hashpassword, dont be confused!
  req.body.password = hashedPassword;
  //console.log("new: " + req.body.password);
  next();
};

module.exports = hashPassword;