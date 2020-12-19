require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const shortid = require('shortid')
const { URL } = require('url');
const mongo = require('mongodb')
const mongoose = require('mongoose')
const dns = require('dns');
app.use(express.urlencoded({ extended: true }));

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
let ShortURL = mongoose.model('ShortURL', new mongoose.Schema({
  short_url: String, original_url: String }))

const validateUrl = (url, callback)=>{
  let longUrl = null, err = null;
  try {longUrl = new URL(url) } 
  catch (err) { return callback(err, null) }
  dns.lookup(longUrl.hostname, (err, address, family) => {
    if (err) { return callback(err, null) }
    return callback(null, longUrl.origin);
  }); 
};

// Basic Configuration
const port = process.env.PORT || 3000;
app.use(cors());
app.use('/public', express.static(`${process.cwd()}/public`));
app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});
// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

app.post('/api/shorturl/new', (req, res)=>{
  validateUrl(req.body.url, (err, url)=>{
    if (err) { res.json({error:'invalid url'}) } 
    else if (/^http(s)*\:\/\/.+/.test(req.body.url)){
      ShortURL.find({ original_url: req.body.url})
        .then(url=> res.json({error: url[0].original_url}) )
        .catch( ()=>{
          let hash = shortid.generate()
          let newURL = new ShortURL({
            short_url: hash, original_url: req.body.url
          })
          newURL.save((err,doc)=>{
            if (err) {console.log(err)}
            else{
              res.json({
                "short_url": newURL.short_url,
                "original_url": newURL.original_url
              })
            }
          })
        })
    } else { res.json({error:'invalid url'})}
  })
})

app.get("/api/shorturl/:short_url", (req,res)=>{
  ShortURL.find({ short_url: req.params.short_url})
    .then(url=> res.redirect(url[0].original_url))
    .catch(err=> res.json({error: 'invalid URL'}))
})

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
