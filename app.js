'use strict'

// C library API
const ffi = require('ffi-napi');

// Express App (Routes)
const express = require("express");
const app     = express();
const path    = require("path");
const fileUpload = require('express-fileupload');

app.use(fileUpload());
app.use(express.static(path.join(__dirname+'/uploads')));
var libm = ffi.Library('libm', {
  'ceil': [ 'double', [ 'double' ] ]
});


// Minimization
const fs = require('fs');
const JavaScriptObfuscator = require('javascript-obfuscator');

// Important, pass in port as in `npm run dev 1234`, do not change
const portNum = process.argv[2];

// Send HTML at root, do not change
app.get('/',function(req,res){
  res.sendFile(path.join(__dirname+'/public/index.html'));
});

// Send Style, do not change
app.get('/style.css',function(req,res){
  //Feel free to change the contents of style.css to prettify your Web app
  res.sendFile(path.join(__dirname+'/public/style.css'));
});

// Send obfuscated JS, do not change
app.get('/index.js',function(req,res){
  fs.readFile(path.join(__dirname+'/public/index.js'), 'utf8', function(err, contents) {
    const minimizedContents = JavaScriptObfuscator.obfuscate(contents, {compact: true, controlFlowFlattening: true});
    res.contentType('application/javascript');
    res.send(minimizedContents._obfuscatedCode);
  });
});

//Respond to POST requests that upload files to uploads/ directory
app.post('/upload', function(req, res) {
  if(!req.files) {
    return res.status(400).send('No files were uploaded.');
  }
 
  let uploadFile = req.files.uploadFile;
  if(uploadFile.name.includes('.svg')){
    uploadFile.mv('uploads/' + uploadFile.name, function(err) {
      if(err) {
        return res.status(500).send(err);
      }

      res.redirect('/');
    });
  }else{
    return res.status(500).send('failed');
  }
 
});



//Respond to GET requests for files in the uploads/ directory
app.get('/uploads/:name', function(req , res){
  fs.stat('uploads/' + req.params.name, function(err, stat) {
    if(err == null) {
      res.sendFile(path.join(__dirname+'/uploads/' + req.params.name));
    } else {
      console.log('Error in file downloading route: '+err);
      res.send('');
    }
  });
});

let libsvgparse = ffi.Library('./libsvgparse.so', {
  'createToJSON': [ 'string', ['string','string'] ],  
  'createValidSVGimage': ['pointer', ['string', 'string']], 
  'JSONRects': ['string', ['pointer']],
  'JSONAttrs': ['string', ['pointer']],
  'validateFile': ['int', ['string','string']],

  'numRects':['int', ['pointer']],
  'getMainRects' :['pointer', ['pointer']],
  'getMainCircles' :['pointer', ['pointer']],
  'getMainPaths' :['pointer', ['pointer']],
  'getMainGroups' :['pointer', ['pointer']],

  'rectListToJSON': ['string', ['pointer']], 
  'circListToJSON': ['string', ['pointer']], 
  'pathListToJSON': ['string', ['pointer']], 
  'groupListToJSON': ['string', ['pointer']], 
  'attrListToJSON': ['string', ['pointer']], 
  'showAttrs': ['string', ['pointer', 'int']],
  'showAttrsShape': ['string', ['int','pointer', 'int']],


  'circleToJSON': ['string', ['pointer']], 
  'rectToJSON': ['string', ['pointer']], 
  'pathToJSON': ['string', ['pointer']], 
  'groupToJSON': ['string', ['pointer']], 
  'SVGtoJSONwithAttrs': ['string', ['pointer']],

  'changeTitle' : ['int', ['string', 'string', 'string']],
  'changeDesc' : ['int', ['string', 'string', 'string']],
  'changeAttr' : ['int', ['string', 'string', 'string', 'string', 'int', 'int']],
  'setRectangleList' : ['int', ['float', 'string', 'string']],
  'setCircleList' : ['int', ['float', 'string', 'string']],
  'createNewSVG' : ['int', ['string', 'string']],
  'makeShape' : ['pointer', ['float', 'float', 'float', 'float', 'string', 'string', 'int']],
  'addShape' : ['int', ['string', 'string', 'pointer', 'int']],
  'title': ['string', ['pointer']],
  'description': ['string', ['pointer']],

});

app.get('/showAttributes', function(req,res){
  let index = req.query.element;
  let cast = req.query.case;
  let ret = '';

  let myFile = './uploads/'+ req.query.file;

  let img = libsvgparse.createValidSVGimage(myFile, './parser/svg.xsd');
  if(cast == 0){
    ret = libsvgparse.showAttrsShape(cast, libsvgparse.getMainRects(img), index);
  }else if(cast == 1){
    ret = libsvgparse.showAttrsShape(cast, libsvgparse.getMainCircles(img), index);

  }else if(cast == 2){
    ret = libsvgparse.showAttrsShape(cast, libsvgparse.getMainPaths(img), index);

  }else if(cast == 3){
    ret = libsvgparse.showAttrsShape(cast, libsvgparse.getMainGroups(img), index);

  }
  res.send({
    elem: index,
    attrs: ret
  });
});

app.get('/someendpoint', function(req , res){
  var uploadPath = './uploads/';

	let jsonArr = [];
	let nameArr = [];
	let sizeArr = [];
	fs.readdir(uploadPath, function(err, files){
		if(files.length == 0){
			jsonArr.push("No Files");
		}else{
			for(var i = 0; i < files.length; i++){
        if(libsvgparse.validateFile(uploadPath + files[i], './parser/svg.xsd') == 1){
          i++;
        }
				nameArr.push(files[i]);
				let fileStats = fs.statSync(uploadPath + files[i]);
				let size = fileStats["size"];
				sizeArr.push(Math.round(size/1000));

				let myFile = './uploads/'+ files[i];
				let str = libsvgparse.createToJSON(myFile, './parser/svg.xsd');
				jsonArr.push(str);
			}
		}
		res.send({
			stats: jsonArr,
			names: nameArr,
			sizes: sizeArr
		});
	});

});

app.get('/changeTitleInfo', function(req, res){
  let title = req.query.title;
  let myFile = './uploads/'+ req.query.file;
  let worked = libsvgparse.changeTitle(myFile, title, './parser/svg.xsd');
  
  res.send({
    valid: worked,
  });
});

app.get('/changeDescInfo', function(req, res){
  let desc = req.query.desc;
  let myFile = './uploads/'+ req.query.file;
  let worked = libsvgparse.changeDesc(myFile, desc, './parser/svg.xsd');
  
  res.send({
    valid: worked,
  });
});
app.get('/addShape', function(req, res){
  let shape = req.query.shape;
  let stats = req.query.numerical;
  let units = req.query.measure;
  let fill = req.query.color;
  let myFile = './uploads/'+ req.query.file;

  let worked = 2;

  if(shape == 'rectangle' || shape == 'Rectangle'){
    let myRect = libsvgparse.makeShape(stats[0], stats[1], stats[2], stats[3], units, fill, 0);
    worked = libsvgparse.addShape(myFile, './parser/svg.xsd', myRect, 0); 
  }else if(shape == 'circle' || shape == 'Circle'){
    let myCirc = libsvgparse.makeShape(stats[0], stats[1], stats[2], stats[3], units, fill, 1);
    worked = libsvgparse.addShape(myFile, './parser/svg.xsd', myCirc, 1); 
  }else{
    worked = 1;
  }
  res.send({
    valid: worked,
  });
});

app.get('/createNew', function(req, res){
  let fileName = './uploads/' + req.query.name;

  let worked = libsvgparse.createNewSVG(fileName, './parser/svg.xsd');

  res.send({
    valid: worked,
  });

});

app.get('/scaling', function(req, res){
  let shape = req.query.shape;
  let size = req.query.size;
  let myFile = './uploads/'+ req.query.file;
  let worked = 2;
  if(shape == 'rectangle' || shape == 'Rectangle'){
    worked = libsvgparse.setRectangleList(size, myFile, './parser/svg.xsd'); 
  }else if(shape == 'circle' || shape == 'Circle'){
    worked = libsvgparse.setCircleList(size, myFile, './parser/svg.xsd'); 
  }else{
    worked = 1;
  }
  if(req.query.file == '...'){
    worked = 1;
  }
  
  res.send({
    valid: worked,
  });
});

app.get('/changeAttrInfo', function(req, res){
  let name = req.query.attrName;
  let value = req.query.attrVal;
  let type = req.query.cast;
  let index = req.query.index;
  let myFile = './uploads/'+ req.query.file;

  
  let worked = libsvgparse.changeAttr(myFile,'./parser/svg.xsd', name, value, type, index);

  res.send({
    valid: worked,
  });
});



app.get('/changeSVGPanel', function(req , res){
	var uploadPath = './uploads/';
  let titleDesc = [];
	let myFile = './uploads/'+ req.query.file;
  let flag = req.query.case;

	let img = libsvgparse.createValidSVGimage(myFile, './parser/svg.xsd');
  let attrs = libsvgparse.JSONAttrs(img);
  titleDesc.push(libsvgparse.title(img));
  titleDesc.push(libsvgparse.description(img));

  let struct = [];
  struct.push(libsvgparse.SVGtoJSONwithAttrs(img));
  struct.push(libsvgparse.showAttrs(img, 0));


  let rectList = libsvgparse.getMainRects(img);
  let rects = [];
  rects.push(libsvgparse.rectListToJSON(rectList));

  let circList = libsvgparse.getMainCircles(img);
  let circs = libsvgparse.circListToJSON(circList);

  let pathList = libsvgparse.getMainPaths(img);
  let path = libsvgparse.pathListToJSON(pathList);

  let groupList = libsvgparse.getMainGroups(img);
  let group = libsvgparse.groupListToJSON(groupList);

	res.send({
    svg: struct,
		info: titleDesc,
    rectangles: rects,
    circles: circs,
    paths: path,
    groups: group
	});
});

app.listen(portNum);
console.log('Running app at localhost: ' + portNum);
