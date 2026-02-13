const express = require("express");
const router = express.Router();
const upload = require("../middlewares/upload");
const genz = require("../models/primary/User");
const Post = require("../models/primary/Post");
const cloudinary = require("../utils/cloudinary");
const fs = require("fs");

router.post("/updateProfile", upload.single("picture"), async (req,res)=>{

  if (!req.session.userId)
    return res.status(401).json({ error:"Not logged in" });

  try {

    const userId = req.session.userId;
    let data = req.body;
    let pictureUrl = null;

    if (data.username) {
      data.username = data.username.toLowerCase().trim();

      const exists = await genz.findOne({
        username:data.username,
        _id:{ $ne:userId }
      });

      if (exists)
        return res.status(400).json({ error:"Username already taken" });
    }

    if (req.file) {
      const uploaded = await cloudnZ.cloudinary.uploader.upload(req.file.path);
      pictureUrl = uploaded.secure_url;
      fs.unlinkSync(req.file.path);
    }

    if (pictureUrl) data.picture = pictureUrl;

    Object.keys(data).forEach(k =>
      data[k] === undefined && delete data[k]
    );

    const user = await genz.findByIdAndUpdate(userId,data,{new:true});

    await Post.updateMany(
      { userId },
      {
        username:user.username,
        college:user.college,
        picture:user.picture
      }
    );

    res.json({ success:true, message:"Profile updated" });

  } catch(err){
    console.error(err);
    res.status(500).json({ error:"Server error" });
  }
});

module.exports = router;
