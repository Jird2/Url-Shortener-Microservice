require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const dns = require("dns").promises;
const bodyparse = require("body-parser");
const mongoose = require("mongoose");
const port = process.env.PORT || 3000;
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
const schema = new mongoose.Schema({
  original_url: {type: String, unique: true},
  short_url: Number
});
let Url = mongoose.model("Url", schema);
app.use(cors());
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});
app.use('/public', express.static(`${process.cwd()}/public`));
app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});
app.use(bodyparse.urlencoded({extended:false}));
app.post('/api/shorturl', async function(req, res) {
  var rawurl = req.body.url.trim();
  if (rawurl.endsWith("/")) {
    rawurl = rawurl.slice(0,-1);
  }
  let host;
  try {
    host = new URL(rawurl).hostname;
  } 
  catch (err) {
    return res.json({error: 'Invalid Url' });
  }
  try {
    await dns.lookup(host);
  } 
  catch {
    return res.json({error: 'Invalid Url' });
  }
  try {
    let seen = await Url.findOne({original_url: rawurl });
    if (seen) {
      return res.json({
        original_url: seen.original_url, short_url: seen.short_url});
    }  
    var count = await Url.countDocuments({});
    var plusone = new Url({
      original_url: rawurl, short_url: count+1
    });
    const saved = await plusone.save();
    return res.json({
      original_url: saved.original_url, short_url: saved.short_url
    });
  } 
  catch (err) {
    console.error(err);
    return res.json({error: 'Server error' });
  }
});
app.get('/api/shorturl/:num', async function(req, res) {
  const val = parseInt(req.params.num);
  try {
    const doc = await Url.findOne({short_url: val });
    if (!doc) {
      return res.json({error: 'No short URL found' });
    }
    return res.redirect(doc.original_url);
  } 
  catch (err) {
    console.error(err);
    return res.json({error: 'Server error' });
  }
});
app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
