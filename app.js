'use strict';
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const APP_URL = process.env.APP_URL;

//new text

// Imports dependencies and set up http server
const 
  { uuid } = require('uuidv4'),
  {format} = require('util'),
  request = require('request'),
  express = require('express'),
  body_parser = require('body-parser'),
  firebase = require("firebase-admin"),
  ejs = require("ejs"),  
  fs = require('fs'),
  multer  = require('multer'),  
  app = express(); 

const uuidv4 = uuid();
const session = require('express-session');

let sess;

app.use(body_parser.json());
app.use(body_parser.urlencoded());

app.set('trust proxy', 1);
app.use(session({secret: 'effystonem'}));

const bot_questions = {
  "q1": "how many would you like? (number)",
  "q2": "please enter full name",
  "q3": "what is delivery address",
  "q4": "Please share your phone number",
  "q5": "Please share your email address",
  "q6": "please enter your order reference number",
  
}

let current_question = '';

let user_id = ''; 

let userInputs = [];

let books = [
  {
    id: "001",
    name: "မြေစာပင်",
    price: 3000,
  },

  {
    id: "002",
    name: "စိတ္တဇ",
    price: 4000,
  },

  {
    id: "003",
    name: "စမ်းရေကြည်နု",
    price: 3500,
  },

  {
    id: "004",
    name: "ငါပြောချင်သမျှ ငါ့အကြောင်းi",
    price: 2000,
  },

  {
    id: "005",
    name: "စာပေလောက",
    price: 3500,
  },

  {
   id: "006",
    name: "ပုဂံမှာ ကျန်စစ်သား",
    price: 3000,
  },

  {
    id: "007",
    name: "အိပ်နေရင်ညနိုးနေရင်နေ့",
    price: 3500,
  },

  {
    id: "008",
    name: "သူလိုလူ",
    price: 6500,
  },

  {
    id: "009",
    name: "သူငယ်ချင်းလို့ပဲဆက်၍ခေါ်မည်ခိုင်",
    price: 7000,
  },

  {
    id: "010",
    name: "ဘုံဘဝကြုံတွေ့ရ ဇာတ်လမ်းမျာ",
    price: 7000,
  },

  {
    id: "011",
    name: "ရန်ကုန်မြို့ပေါ်က သူပုန်",
    price: 6000,
  },

  {
    id: "012",
    name: "ရူးသွပ်ခြင်းကိုကုန်ကူးကြသူများ",
    price: 2500,
  }
]

let coffees = [
  {
    id: "101",
    name: "Cappuccino",
    price: 2000,
  },

  {
    id: "102",
    name: "Espresso",
    price: 1800,
  },

  {
    id: "103",
    name: "Latte",
    price: 2200,
  },

  {
    id: "104",
    name: "Americano",
    price: 1800,
  },

  {
    id: "105",
    name: "Mocha",
    price: 2200,
  }
]
/*
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
})*/

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits :{
    fileSize: 50 * 1024 * 1024  //no larger than 5mb
  }

});

// parse application/x-www-form-urlencoded


app.set('view engine', 'ejs');
app.set('views', __dirname+'/views');


var firebaseConfig = {
     credential: firebase.credential.cert({
    "private_key": process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    "client_email": process.env.FIREBASE_CLIENT_EMAIL,
    "project_id": process.env.FIREBASE_PROJECT_ID,    
    }),
    databaseURL: process.env.FIREBASE_DB_URL,   
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
  };



firebase.initializeApp(firebaseConfig);

let db = firebase.firestore(); 
let bucket = firebase.storage().bucket();

// Sets server port and logs message on success
app.listen(process.env.PORT || 1337, () => console.log('webhook is listening'));

// Accepts POST requests at /webhook endpoint
app.post('/webhook', (req, res) => {  

  // Parse the request body from the POST
  let body = req.body;

  

  // Check the webhook event is from a Page subscription
  if (body.object === 'page') {
    body.entry.forEach(function(entry) {

      let webhook_event = entry.messaging[0];
      let sender_psid = webhook_event.sender.id; 

      user_id = sender_psid; 

      if(!userInputs[user_id]){
        userInputs[user_id] = {};
      }    


      if (webhook_event.message) {
        if(webhook_event.message.quick_reply){
            handleQuickReply(sender_psid, webhook_event.message.quick_reply.payload);
          }else{
            handleMessage(sender_psid, webhook_event.message);                       
          }                
      } else if (webhook_event.postback) {        
        handlePostback(sender_psid, webhook_event.postback);
      }
      
    });
    // Return a '200 OK' response to all events
    res.status(200).send('EVENT_RECEIVED');

  } else {
    // Return a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404);
  }

});


app.use('/uploads', express.static('uploads'));


app.get('/',function(req,res){    
    res.send('your app is up and running');
});

app.get('/login',function(req,res){    
    sess = req.session;

    if(sess.login){
       res.send('You are already login. <a href="logout">logout</a>');
    }else{
      res.render('login.ejs');
    } 
    
});


app.get('/logout',function(req,res){ 
    //sess = req.session;   
    req.session.destroy(null);  
    res.redirect('login');
});

app.post('/login',function(req,res){    
    sess = req.session;

    let username = req.body.username;
    let password = req.body.password;

    if(username == process.env.ADMIN_UN && password == process.env.ADMIN_PW){
      sess.username = process.env.ADMIN_UN;
      sess.login = true;
      res.redirect('/admin/orders');
    }else{
      res.send('login failed');
    }   
});

app.get('/publicpage',function(req,res){    
    res.render('publicpage.ejs');
});


app.get('/test',function(req,res){    
    res.render('test.ejs');
});

app.post('/test',function(req,res){
    const sender_psid = req.body.sender_id;     
    let response = {"text": "You  click delete button"};
    callSend(sender_psid, response);
});

app.get('/admin/orders', async function(req,res){

  sess = req.session;
    console.log('SESS:', sess); 
    if(sess.login){

      const ordersRef = db.collection('orders');
      const snapshot = await ordersRef.get();

    if (snapshot.empty) {
      res.send('no data');
    } 

    let data = []; 

    snapshot.forEach(doc => {
      let order = {};
      order = doc.data();
      order.doc_id = doc.id;
      order.total = parseInt(doc.data().qty) * parseInt(doc.data().price) ;

      data.push(order);
      
    });

    

    res.render('orders.ejs', {data:data});
       


    }else{
      res.send('you are not authorized to view this page');
    }   
 
  
  
});

app.get('/admin/updateorder/:doc_id', async function(req,res){
  let doc_id = req.params.doc_id; 
  
  const orderRef = db.collection('orders').doc(doc_id);
  const doc = await orderRef.get();
  if (!doc.exists) {
    console.log('No such document!');
  } else {
    console.log('Document data:', doc.data());
    let data = doc.data();
    data.doc_id = doc.id;

    console.log('Document data:', data);
    res.render('editorder.ejs', {data:data});
  } 

});


app.post('/admin/updateorder', function(req,res){
  console.log('REQ:', req.body); 

  

  let data = {
    name:req.body.name,
    phone:req.body.phone,
    email:req.body.email,
    deliveryadd:req.body.deliveryadd,
    qty:req.body.qty,
    status:req.body.status,
    comment:req.body.comment,

    
    
  }

  db.collection('orders').doc(req.body.doc_id)
  .update(data).then(()=>{
      res.redirect('/admin/orders');
  }).catch((err)=>console.log('ERROR:', error)); 
 
});

/*********************************************
Gallery page
**********************************************/
app.get('/showimages/:sender_id/',function(req,res){
    const sender_id = req.params.sender_id;

    let data = [];

    db.collection("images").limit(20).get()
    .then(  function(querySnapshot) {
        querySnapshot.forEach(function(doc) {
            let img = {};
            img.id = doc.id;
            img.url = doc.data().url;         

            data.push(img);                      

        });
        console.log("DATA", data);
        res.render('gallery.ejs',{data:data, sender_id:sender_id, 'page-title':'welcome to my page'}); 

    }
    
    )
    .catch(function(error) {
        console.log("Error getting documents: ", error);
    });    
});


app.post('/imagepick',function(req,res){
      
  const sender_id = req.body.sender_id;
  const doc_id = req.body.doc_id;

  console.log('DOC ID:', doc_id); 

  db.collection('images').doc(doc_id).get()
  .then(doc => {
    if (!doc.exists) {
      console.log('No such document!');
    } else {
      const image_url = doc.data().url;

      console.log('IMG URL:', image_url);

      let response = {
      "attachment": {
        "type": "template",
        "payload": {
          "template_type": "generic",
          "elements": [{
            "title": "Is this the image you like?",
            "image_url":image_url,                       
            "buttons": [
                {
                  "type": "postback",
                  "title": "Yes!",
                  "payload": "yes",
                },
                {
                  "type": "postback",
                  "title": "No!",
                  "payload": "no",
                }
              ],
          }]
        }
      }
    }

  
    callSend(sender_id, response); 
    }
  })
  .catch(err => {
    console.log('Error getting document', err);
  });
      
});



/*********************************************
END Gallery Page
**********************************************/

//webview test
app.get('/webview/:sender_id',function(req,res){
    const sender_id = req.params.sender_id;
    res.render('webview.ejs',{title:"Hello!! from WebView", sender_id:sender_id});
});

app.post('/webview',upload.single('file'),function(req,res){
       
      let name  = req.body.name;
      let email = req.body.email;
      let img_url = "";
      let sender = req.body.sender;  

      console.log("REQ FILE:",req.file);



      let file = req.file;
      if (file) {
        uploadImageToStorage(file).then((img_url) => {
            db.collection('webview').add({
              name: name,
              email: email,
              image: img_url
              }).then(success => {   
                console.log("DATA SAVED")
                thankyouReply(sender, name, img_url);    
              }).catch(error => {
                console.log(error);
              }); 
        }).catch((error) => {
          console.error(error);
        });
      }



     
      
      
           
});

//Set up Get Started Button. To run one time
//eg https://fbstarter.herokuapp.com/setgsbutton
app.get('/setgsbutton',function(req,res){
    setupGetStartedButton(res);    
});

//Set up Persistent Menu. To run one time
//eg https://fbstarter.herokuapp.com/setpersistentmenu
app.get('/setpersistentmenu',function(req,res){
    setupPersistentMenu(res);    
});

//Remove Get Started and Persistent Menu. To run one time
//eg https://fbstarter.herokuapp.com/clear
app.get('/clear',function(req,res){    
    removePersistentMenu(res);
});

//whitelist domains
//eg https://fbstarter.herokuapp.com/whitelists
app.get('/whitelists',function(req,res){    
    whitelistDomains(res);
});


// Accepts GET requests at the /webhook endpoint
app.get('/webhook', (req, res) => {
  

  const VERIFY_TOKEN = process.env.VERIFY_TOKEN;  

  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];  
    
  // Check token and mode
  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      res.status(200).send(challenge);    
    } else {      
      res.sendStatus(403);      
    }
  }
});

/**********************************************
Function to Handle when user send quick reply message
***********************************************/

function handleQuickReply(sender_psid, received_message) {

  console.log('QUICK REPLY', received_message);

  received_message = received_message.toLowerCase();

  if(received_message.startsWith("drink:")){
    let drink = received_message.slice(6);
    userInputs[user_id].drink = drink;
    current_question = 'q1';
    botQuestions(current_question, sender_psid);
  }else if(received_message.startsWith("selec:")){
    let selec = received_message.slice(6);
    userInputs[user_id].selec = selec;
    showNonFictin(sender_psid);
  }else if(received_message.startsWith("selet:")){
    let selet = received_message.slice(6);
    userInputs[user_id].selet = selet;
    showPolitic(sender_psid);
  }else if(received_message.startsWith("sele:")){
    let sele = received_message.slice(5);
    userInputs[user_id].selet = sele;
    showNove(sender_psid);
  }else{

      switch(received_message) {
        case "start": 
          showMenu(sender_psid);
          break;

         

          case "fiction": 
            showFiction(sender_psid);
          break;

          case "non-fiction": 
            showNonFiction(sender_psid);
          break;


        case "politics": 
            showPolitics(sender_psid);
          break;

        case "novel": 
            showNovel(sender_psid);
          break;
        

        case "on":
            showQuickReplyOn(sender_psid);
          break;
        case "off":
            showQuickReplyOff(sender_psid);
          break; 
        case "confirm-order":
              saveOrder(userInputs[user_id], sender_psid);
          break; 

        case "track-my-order":
              current_question="q6";
              botQuestions(current_question,sender_psid);
          break;         

        default:
            defaultReply(sender_psid);
    } 

  }
  
  
 
}

/**********************************************
Function to Handle when user send text message
***********************************************/

const handleMessage = (sender_psid, received_message) => {

  console.log('TEXT REPLY', received_message);
  //let message;
  let response;

  if(received_message.attachments){
     handleAttachments(sender_psid, received_message.attachments);
  }else if(current_question == 'q1'){
     console.log('TOTAL NUMBER OF BOOKS ENTERED',received_message.text);
     userInputs[user_id].qty = received_message.text;
     current_question = 'q2';
     botQuestions(current_question, sender_psid);
  }else if(current_question == 'q2'){
     console.log('NAME ENTERED',received_message.text);
     userInputs[user_id].name = received_message.text;
     current_question = 'q3';
     botQuestions(current_question, sender_psid);
  }else if(current_question == 'q3'){
     console.log('DELIVERY ADDRESS ENTERED',received_message.text);
     userInputs[user_id].deliveryadd = received_message.text;
     current_question = 'q4';
     botQuestions(current_question, sender_psid);
  }else if(current_question == 'q4'){
     console.log('PHONE NO ENTERED',received_message.text);
     userInputs[user_id].phone = received_message.text;
     current_question = 'q5';
     botQuestions(current_question, sender_psid);
  }else if(current_question == 'q5'){
     console.log('EMAIl ENTERED',received_message.text);
     userInputs[user_id].email = received_message.text;
     current_question = '';
     botQuestions(current_question, sender_psid);
 
     
     confirmOrder(sender_psid);

  }
  else if(current_question == 'q6'){
     let order_ref = received_message.text; 

     console.log('order_ref: ', order_ref);    
     current_question = '';     
     showOrder(sender_psid, order_ref);
  }
  else {
      
      let user_message = received_message.text;      
     
      user_message = user_message.toLowerCase(); 

      switch(user_message) { 
      case "hi":
          botWelcome(sender_psid);
        break;
      case "znet":
      console.log("insideZnet");
          botWelcome(sender_psid);
        break;                
      case "text":
        textReply(sender_psid);
        break;
      case "quick":
        quickReply(sender_psid);
        break;
      case "button":                  
        buttonReply(sender_psid);
        break;
      case "webview":
        webviewTest(sender_psid);
        break;       
      case "show images":
        showImages(sender_psid)
        break;               
      default:
          defaultReply(sender_psid);
      }       
          
      
    }

}

/*********************************************
Function to handle when user send attachment
**********************************************/


const handleAttachments = (sender_psid, attachments) => {
  
  console.log('ATTACHMENT', attachments);


  let response; 
  let attachment_url = attachments[0].payload.url;
    response = {
      "attachment": {
        "type": "template",
        "payload": {
          "template_type": "generic",
          "elements": [{
            "title": "Is this the right picture?",
            "subtitle": "Tap a button to answer.",
            "image_url": attachment_url,
            "buttons": [
              {
                "type": "postback",
                "title": "Yes!",
                "payload": "yes-attachment",
              },
              {
                "type": "postback",
                "title": "No!",
                "payload": "no-attachment",
              }
            ],
          }]
        }
      }
    }
    callSend(sender_psid, response);
}


/*********************************************
Function to handle when user click button
**********************************************/
const handlePostback = (sender_psid, received_postback) => { 

  

  let payload = received_postback.payload;

  console.log('BUTTON PAYLOAD', payload);

  
   if(payload.startsWith("Or:0")){
    let or_name = payload.slice(3);
    console.log('SELECTED OR IS: ', or_name);
    userInputs[user_id].price = getBook(or_name).price;
    userInputs[user_id].or = getBook(or_name).name;
    current_question = 'q1';
    botQuestions(current_question, sender_psid);
  } else if(payload.startsWith("Or:1")){
    let or_name = payload.slice(3);
    console.log('SELECTED OR IS: ', or_name);
    userInputs[user_id].price = getCoffee(or_name).price;
    userInputs[user_id].or = getCoffee(or_name).name;
    current_question = 'q1';
    botQuestions(current_question, sender_psid);
  }

  else if(payload.startsWith("Coffee:")){
    let Coffee_name = payload.slice(7);
    console.log('SELECTED Coffee IS: ', Coffee_name);
    userInputs[user_id].Coffee = Coffee_name;
    console.log('TEST2', userInputs);
    drink(sender_psid);}
    else{
      switch(payload) {
      case "books-menu":
          bookCategory(sender_psid);
        break;   
    case "coffee-menu":
          showCoffee(sender_psid);
        break;
    case "yes":
          showButtonReplyYes(sender_psid);
        break;
      case "no":
          showButtonReplyNo(sender_psid);
        break;                      
      default:
          defaultReply(sender_psid);
    } 

  }


  
}


const generateRandom = (length) => {
   var result           = '';
   var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
   var charactersLength = characters.length;
   for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
   }
   return result;
}

/*********************************************
GALLERY SAMPLE
**********************************************/

const showImages = (sender_psid) => {
  let response;
  response = {
      "attachment": {
        "type": "template",
        "payload": {
          "template_type": "generic",
          "elements": [{
            "title": "show images",                       
            "buttons": [              
              {
                "type": "web_url",
                "title": "enter",
                "url":"https://fbstarter.herokuapp.com/showimages/"+sender_psid,
                 "webview_height_ratio": "full",
                "messenger_extensions": true,          
              },
              
            ],
          }]
        }
      }
    }
  callSendAPI(sender_psid, response);
}


/*********************************************
END GALLERY SAMPLE
**********************************************/


function webviewTest(sender_psid){
  let response;
  response = {
      "attachment": {
        "type": "template",
        "payload": {
          "template_type": "generic",
          "elements": [{
            "title": "Click to open webview?",                       
            "buttons": [              
              {
                "type": "web_url",
                "title": "webview",
                "url":APP_URL+"webview/"+sender_psid,
                 "webview_height_ratio": "full",
                "messenger_extensions": true,          
              },
              
            ],
          }]
        }
      }
    }
  callSendAPI(sender_psid, response);
}

/**************
start Znet
**************/
const botWelcome = (sender_psid) => {
  console.log("insidebotwelcome");
   let response1 = {"text": "Welcome to ZNET Coffee and Book shop"};
   let response2 = {"text": "Perfect time for a cup of coffee don't you think? ☕" };
   let response3= {"text": "How can we help you today? ",

    "quick_replies":[
            {
              "content_type":"text",
              "title":"click to view all 👈",
              "payload":"Start",              
            }, {
              "content_type":"text",
              "title":"Track my order",
              "payload":"track-my-order",             
            } 
            ] 
          };

 callSend(sender_psid, response1).then(()=>{
      return callSend(sender_psid, response2).then(()=>{
        return callSend(sender_psid, response3);
  });
      });
}


const getBook = (id) =>  books.filter((book)=> id == book.id )[0];
const getCoffee = (id) =>  coffees.filter((coffee)=> id == coffee.id )[0];


const showMenu = (sender_psid) => {
    let response = {
      "attachment": {
        "type": "template",
        "payload": {
          "template_type": "generic",
          "elements": [{
            "title": "Books",
            "subtitle": "Explore our collection of various category of books of your interest",
            "image_url":"https://media.wired.com/photos/5be4cd03db23f3775e466767/master/w_2560%2Cc_limit/books-521812297.jpg",                       
            "buttons": [
                {
                  "type": "postback",
                  "title": "Explore",
                  "payload": "books-menu",
                },               
              ],
          },{
            "title": "Check Our Coffee Menu",
            "subtitle": "Discover our various smell and taste of coffee what you desire.",
            "image_url":"https://img1.mashed.com/img/gallery/coffee-mistakes-youre-probably-making-at-home/intro-1594766282.jpg",                       
            "buttons": [
                {
                  "type": "postback",
                  "title": "View Menu ☕☕☕",
                  "payload": "coffee-menu",
                },               
              ],
          },{
            "title": "Our Story",
            "subtitle": "Read more about our ZNet coffee & book shop and our exceptional.",
            "image_url":"https://i.pinimg.com/736x/bc/10/7e/bc107e33de2c7704e4daac992ee5ca5f.jpgg",                       
            "buttons": [
                {
                  "type": "postback",
                  "title": "Learn More...",
                  "payload": "our-story",
                },               
              ],
          }

          ]
        }
      }
    }

  
  callSend(sender_psid, response);

}


const showFiction = (sender_psid) => {
    let response = {
      "attachment": {
        "type": "template",
        "payload": {
          "template_type": "generic",
          "elements": [{
            "title": "မြေစာပင်",
            "subtitle": "Author - ကိုစိုးထိုက် (ဖဒို),Price - 3000 MMK",
            "image_url":"https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1575876985l/49159359._SX318_.jpg",                       
            "buttons": [
                {
                  "type": "postback",
                  "title": "Order Now",
                  "payload": "Or:001",
                },               
              ],
          },{
            "title": "စိတ္တဇ",
            "subtitle": "Author - မောင်မိုးသူ,Price - 4000 MMK",
            "image_url":"https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1604923746l/55868945._SY475_.jpg",                       
            "buttons": [
                {
                  "type": "postback",
                  "title": "Order Now",
                  "payload": "Or:002",
                },               
              ],
          },{
            "title": "စမ်းရေကြည်နု",
            "subtitle": "Author - လင်းခါး,Price - 3500 MMK",
            "image_url":"https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1593078552l/54260715._SX318_.jpg",                       
            "buttons": [
                {
                  "type": "postback",
                  "title": "Order Now",
                  "payload": "Or:003",
                },               
              ],
          }

          ]
        }
      }
    }

  
  callSend(sender_psid, response);

}


const showNonFiction = (sender_psid) => {
    let response = {
      "attachment": {
        "type": "template",
        "payload": {
          "template_type": "generic",
          "elements": [{
            "title": "ငါပြောချင်သမျှ ငါ့အကြောင်း",
            "subtitle": "Author - ဒေါက်တာသန်းထွန်း,Price - 2000 MMK",
            "image_url":"https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1464929626l/30341358._SY475_.jpg",                       
            "buttons": [
                {
                  "type": "postback",
                  "title": "Order Now",
                  "payload": "Or:004",
                },               
              ],
          },{
            "title": "စာပေလောက",
            "subtitle": "Author - သော်တာဆွေ,Price - 3500 MMK",
            "image_url":"https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1361940186l/17448379.jpg",                       
            "buttons": [
                {
                  "type": "postback",
                  "title": "Order Now",
                  "payload": "Or:005",
                },               
              ],
          },{
            "title": "ပုဂံမှာ ကျန်စစ်သား",
            "subtitle": "Author -  တက္ကသိုလ်စိန်တင်,Price - 3000 MMK",
            "image_url":"https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1362031563l/17450340.jpg",                       
            "buttons": [
                {
                  "type": "postback",
                  "title": "Order Now",
                  "payload": "Or:006",
                },               
              ],
          }

          ]
        }
      }
    }

  
  callSend(sender_psid, response);

}

const showNovel = (sender_psid) => {
    let response = {
      "attachment": {
        "type": "template",
        "payload": {
          "template_type": "generic",
          "elements": [{
            "title": "အိပ်နေရင်ညနိုးနေရင်နေ့",
            "subtitle": "တာရာမင်းဝေ,Price - 3500 MMK",
            "image_url":"https://www.pannsattlann.com/wp-content/uploads/2020/07/eait-nay-yin-naye-300x300.png",                       
            "buttons": [
                {
                  "type": "postback",
                  "title": "Order Now",
                  "payload": "Or:007",
                },               
              ],
          },{
            "title": "သူလိုလူ",
            "subtitle": "Author - ဂျာနယ်ကျော်မမလေး,Price - 6500 MMK",
            "image_url":"https://www.pannsattlann.com/wp-content/uploads/2019/09/Thu-Lo-Lu-600x600.png",                       
            "buttons": [
                {
                  "type": "postback",
                  "title": "Order Now",
                  "payload": "Or:008",
                },               
              ],
          },{
            "title": "သူငယ်ချင်းလို့ပဲဆက်၍ခေါ်မည်ခိုင်",
            "subtitle": "Author - တက္ကသိုလ်ဘုန်းနိုင်,Price - 7000 MMK",
            "image_url":"https://www.pannsattlann.com/wp-content/uploads/2019/08/Khaing-600x600.png",                       
            "buttons": [
                {
                  "type": "postback",
                  "title": "Order Now",
                  "payload": "Or:009",
                },               
              ],
          }

          ]
        }
      }
    }

  
  callSend(sender_psid, response);

}

const showPolitics = (sender_psid) => {
    let response = {
      "attachment": {
        "type": "template",
        "payload": {
          "template_type": "generic",
          "elements": [{
            "title": "ဘုံဘဝကြုံတွေ့ရ ဇာတ်လမ်းမျာ",
            "subtitle": "Author - မှူးသမိန်,Price - 7000 MMK",
            "image_url":"https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1361847391l/17436911.jpg",                       
            "buttons": [
                {
                  "type": "postback",
                  "title": "Order Now",
                  "payload": "Or:010",
                },               
              ],
          },{
            "title": "ရန်ကုန်မြို့ပေါ်က သူပုန်",
            "subtitle": "Author - အောင်အေး(ရန်ကုန်တက္ကသိုလ်),Price - 6000 MMK",
            "image_url":"https://www.pannsattlann.com/wp-content/uploads/2020/05/Yangon-600x600.png",                       
            "buttons": [
                {
                  "type": "postback",
                  "title": "Order Now",
                  "payload": "Or:011"
                },               
              ],
          },{
            "title": "ရူးသွပ်ခြင်းကိုကုန်ကူးကြသူများ",
            "subtitle": "Author - ခွန်လှိုင်,Price - 2500 MMK",
            "image_url":"https://www.pannsattlann.com/wp-content/uploads/2019/08/Merchants-of-Madness-300x300.png",                       
            "buttons": [
                {
                  "type": "postback",
                  "title": "Order Now",
                  "payload": "Or:012",
                },               
              ],
          }

          ]
        }
      }
    }

  
  callSend(sender_psid, response);

}


const showCoffee = (sender_psid) => {
    let response = {
      "attachment": {
        "type": "template",
        "payload": {
          "template_type": "generic",
          "elements": [{
            "title": "Cappuccino",
            "subtitle": "Price - 2000 MMK",
            "image_url":"https://cdn.images.express.co.uk/img/dynamic/1/590x/Coffee-617852.jpg",                       
            "buttons": [
                {
                  "type": "postback",
                  "title": "Order Now",
                  "payload": "Or:101",
                },               
              ],
          },{
            "title": "Espresso",
            "subtitle": "Price - 1800 MMK",
            "image_url":"https://i2.wp.com/curlycoffee.nl/wp-content/uploads/2014/02/espresso-shot.jpg?resize=800%2C532",                       
            "buttons": [
                {
                  "type": "postback",
                  "title": "Order Now",
                  "payload": "Or:102",
                },               
              ],
            },{
            "title": "Latte",
            "subtitle": "Price - 2200 MMK",
            "image_url":"https://www.thecoffeepod.co.uk/contents/media/latte%20art.smljpg.jpg",                       
            "buttons": [
                {
                  "type": "postback",
                  "title": "Order Now",
                  "payload": "Or:103",
                },               
              ],
            }, {
            "title": "Americano",
            "subtitle": "Price - 1800 MMK",
            "image_url":"https://lh3.googleusercontent.com/proxy/S7kdSda2bQA9sB7vBcbP5wNEuchObmLOyWTvG-dMZjnzLljcALlWsxYqhGTIOqrdYsxeEXw1f04AQv4SgaIWDIPFrgkHQy9RT52jNhIe9OTfSWO3uRKRXUE2a80",                       
            "buttons": [
                {
                  "type": "postback",
                  "title": "Order Now",
                  "payload": "Or:104",
                },               
              ],
            },{
            "title": "Mocha",
            "subtitle": "Price - 2200 MMK",
            "image_url":"https://lifemadesweeter.com/wp-content/uploads/Peppermint-Latte-Photo-Recipe-Picture-3.jpg",                       
            "buttons": [
                {
                  "type": "postback",
                  "title": "Order Now",
                  "payload": "Or:105",
                },               
              ],
          }

          ]
        }
      }
    }

  
  callSend(sender_psid, response);

}

const bookCategory = (sender_psid) => {

  let response = {
    "text": "Select your favorite category of book below 👇",
    "quick_replies":[
            {
              "content_type":"text",
              "title":"Fiction",
              "payload":"Fiction",              
            },{
              "content_type":"text",
              "title":"Non-fiction",
              "payload":"Non-fiction",             
            },
            {
              "content_type":"text",
              "title":"Politics",
              "payload":"Politics",             
            },
            {
              "content_type":"text",
              "title":"Novel",
              "payload":"Novel",             
            }
    ]
  };
  callSend(sender_psid, response);

}


const drink = (sender_psid) => {

  let response = {
    "text": "drink",
    "quick_replies":[
            {
              "content_type":"text",
              "title":"First drink",
              "payload":"drink:first drink",              
            },{
              "content_type":"text",
              "title":"Follow drink",
              "payload":"drink:follow drink",             
            }
    ]
  };
  callSend(sender_psid, response);

}

const botQuestions = (current_question, sender_psid) => {
  if(current_question == 'q1'){
    let response = {"text": bot_questions.q1};
    callSend(sender_psid, response);
  }else if(current_question == 'q2'){
    let response = {"text": bot_questions.q2};
    callSend(sender_psid, response);
  }else if(current_question == 'q3'){
    let response = {"text": bot_questions.q3};
    callSend(sender_psid, response);
  }else if(current_question == 'q4'){
    let response = {"text": bot_questions.q4};
    callSend(sender_psid, response);
  }else if(current_question == 'q5'){
    let response = {"text": bot_questions.q5};
    callSend(sender_psid, response);
 
  }else if(current_question == 'q6'){
    let response = {"text": bot_questions.q6};
    callSend(sender_psid, response);
  }
}

const confirmOrder = (sender_psid) => {
  console.log('ORDER INFO', userInputs);
  let summery = "book:" + userInputs[user_id].or + "\u000A";
 
  summery += "deliveryadd:" + userInputs[user_id].deliveryadd + "\u000A";
  summery += "name:" + userInputs[user_id].name + "\u000A";
  summery += "qty:" + userInputs[user_id].qty + "\u000A";
  summery += "phone:" + userInputs[user_id].phone + "\u000A";
  summery += "email:" + userInputs[user_id].email + "\u000A";
  summery += "quantity:"+userInputs[user_id].qty + "\u000A";
  
  let total = parseInt(userInputs[user_id].qty) * userInputs[user_id].price;
  summery += "totalprice:" + total + "\u000A";


  let response1 = {"text": summery};

  let response2 = {
    "text": "Select your reply",
    "quick_replies":[
            {
              "content_type":"text",
              "title":"Confirm",
              "payload":"confirm-order",              
            },{
              "content_type":"text",
              "title":"Cancel",
              "payload":"off",             
            }
    ]
  };
  
  callSend(sender_psid, response1).then(()=>{
    return callSend(sender_psid, response2);
  });
}

const saveOrder = (arg, sender_psid) => {
  let data = arg;
  data.ref = generateRandom(6);
  data.status = "pending";
  data.comment = "";
  db.collection('orders').add(data).then((success)=>{
    console.log('SAVED', success);
    let text = "Thank you. We have received your order."+ "\u000A";
    text += " We wil call you to confirm soon"+ "\u000A";
    text += "Your order-reference number is:" + data.ref;
    let response = {"text": text};
    callSend(sender_psid, response);
  }).catch((err)=>{
     console.log('Error', err);
  });
}



const showOrder = async(sender_psid, order_ref) => {

  

    const ordersRef = db.collection('orders').where("ref", "==", order_ref).limit(1);
    const snapshot = await ordersRef.get();

    


    if (snapshot.empty) {
      let response = { "text": "Incorrect order number" };
      callSend(sender_psid, response).then(()=>{
        return startGreeting(sender_psid);
      });
    }else{
          let order = {}

          snapshot.forEach(doc => {      
              order.ref = doc.data().ref;
              order.status = doc.data().status;
              order.comment = doc.data().comment;  
          });


          let response1 = { "text": `Your order ${order.ref} is ${order.status}.` };
          let response2 = { "text": `Seller message: ${order.comment}.` };
          let response3 = { "text": `Thank You for your order.` };
            callSend(sender_psid, response1).then(()=>{
              return callSend(sender_psid, response2).then(()=>{
                return callSend(sender_psid, response3)
              });
          });

    }

    

}

/**************
end Znet
**************/




const hiReply =(sender_psid) => {
  let response = {"text": "You sent hi message"};
  callSend(sender_psid, response);
}


const greetInMyanmar =(sender_psid) => {
  let response = {"text": "Mingalarbar. How may I help"};
  callSend(sender_psid, response);
}

const textReply =(sender_psid) => {
  let response = {"text": "You sent text message"};
  callSend(sender_psid, response);
}


const quickReply =(sender_psid) => {
  let response = {
    "text": "Select your reply",
    "quick_replies":[
            {
              "content_type":"text",
              "title":"On",
              "payload":"on",              
            },{
              "content_type":"text",
              "title":"Off",
              "payload":"off",             
            }
    ]
  };
  callSend(sender_psid, response);
}

const showQuickReplyOn =(sender_psid) => {
  let response = { "text": "You sent quick reply ON" };
  callSend(sender_psid, response);
}

const showQuickReplyOff =(sender_psid) => {
  let response = { "text": "You sent quick reply OFF" };
  callSend(sender_psid, response);
}

const buttonReply =(sender_psid) => {

  let response = {
      "attachment": {
        "type": "template",
        "payload": {
          "template_type": "generic",
          "elements": [{
            "title": "Are you OK?",
            "image_url":"https://www.mindrops.com/images/nodejs-image.png",                       
            "buttons": [
                {
                  "type": "postback",
                  "title": "Yes!",
                  "payload": "yes",
                },
                {
                  "type": "postback",
                  "title": "No!",
                  "payload": "no",
                }
              ],
          }]
        }
      }
    }

  
  callSend(sender_psid, response);
}

const showButtonReplyYes =(sender_psid) => {
  let response = { "text": "You clicked YES" };
  callSend(sender_psid, response);
}

const showButtonReplyNo =(sender_psid) => {
  let response = { "text": "You clicked NO" };
  callSend(sender_psid, response);
}

const thankyouReply =(sender_psid, name, img_url) => {
  let response = {
      "attachment": {
        "type": "template",
        "payload": {
          "template_type": "generic",
          "elements": [{
            "title": "Thank you! " + name,
            "image_url":img_url,                       
            "buttons": [
                {
                  "type": "postback",
                  "title": "Yes!",
                  "payload": "yes",
                },
                {
                  "type": "postback",
                  "title": "No!",
                  "payload": "no",
                }
              ],
          }]
        }
      }
    }
  callSend(sender_psid, response);
}

function testDelete(sender_psid){
  let response;
  response = {
      "attachment": {
        "type": "template",
        "payload": {
          "template_type": "generic",
          "elements": [{
            "title": "Delete Button Test",                       
            "buttons": [              
              {
                "type": "web_url",
                "title": "enter",
                "url":"https://fbstarter.herokuapp.com/test/",
                 "webview_height_ratio": "full",
                "messenger_extensions": true,          
              },
              
            ],
          }]
        }
      }
    }
  callSendAPI(sender_psid, response);
}

const defaultReply = (sender_psid) => {
  let response1 = {"text": "To test text reply, type 'text'"};
  let response2 = {"text": "To test quick reply, type 'quick'"};
  let response3 = {"text": "To test button reply, type 'button'"};   
  let response4 = {"text": "To test webview, type 'webview'"};
    callSend(sender_psid, response1).then(()=>{
      return callSend(sender_psid, response2).then(()=>{
        return callSend(sender_psid, response3).then(()=>{
          return callSend(sender_psid, response4);
        });
      });
  });  
}

const callSendAPI = (sender_psid, response) => {   
  let request_body = {
    "recipient": {
      "id": sender_psid
    },
    "message": response
  }
  
  return new Promise(resolve => {
    request({
      "uri": "https://graph.facebook.com/v6.0/me/messages",
      "qs": { "access_token": PAGE_ACCESS_TOKEN },
      "method": "POST",
      "json": request_body
    }, (err, res, body) => {
      if (!err) {
        //console.log('RES', res);
        console.log('BODY', body);
        resolve('message sent!')
      } else {
        console.error("Unable to send message:" + err);
      }
    }); 
  });
}

async function callSend(sender_psid, response){
  let send = await callSendAPI(sender_psid, response);
  return 1;
}


const uploadImageToStorage = (file) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject('No image file');
    }
    let newFileName = `${Date.now()}_${file.originalname}`;

    let fileUpload = bucket.file(newFileName);

    const blobStream = fileUpload.createWriteStream({
      metadata: {
        contentType: file.mimetype,
         metadata: {
            firebaseStorageDownloadTokens: uuidv4
          }
      }
    });

    blobStream.on('error', (error) => {
      console.log('BLOB:', error);
      reject('Something is wrong! Unable to upload at the moment.');
    });

    blobStream.on('finish', () => {
      // The public URL can be used to directly access the file via HTTP.
      //const url = format(`https://storage.googleapis.com/${bucket.name}/${fileUpload.name}`);
      const url = format(`https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${fileUpload.name}?alt=media&token=${uuidv4}`);
      console.log("image url:", url);
      resolve(url);
    });

    blobStream.end(file.buffer);
  });
}




/*************************************
FUNCTION TO SET UP GET STARTED BUTTON
**************************************/

const setupGetStartedButton = (res) => {
  let messageData = {"get_started":{"payload":"get_started"}};

  request({
      url: 'https://graph.facebook.com/v2.6/me/messenger_profile?access_token='+ PAGE_ACCESS_TOKEN,
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      form: messageData
    },
    function (error, response, body) {
      if (!error && response.statusCode == 200) {        
        res.send(body);
      } else { 
        // TODO: Handle errors
        res.send(body);
      }
  });
} 

/**********************************
FUNCTION TO SET UP PERSISTENT MENU
***********************************/



const setupPersistentMenu = (res) => {
  var messageData = { 
      "persistent_menu":[
          {
            "locale":"default",
            "composer_input_disabled":false,
            "call_to_actions":[
                {
                  "type":"postback",
                  "title":"View My Tasks",
                  "payload":"view-tasks"
                },
                {
                  "type":"postback",
                  "title":"Add New Task",
                  "payload":"add-task"
                },
                {
                  "type":"postback",
                  "title":"Cancel",
                  "payload":"cancel"
                }
          ]
      },
      {
        "locale":"default",
        "composer_input_disabled":false
      }
    ]          
  };
        
  request({
      url: 'https://graph.facebook.com/v2.6/me/messenger_profile?access_token='+ PAGE_ACCESS_TOKEN,
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      form: messageData
  },
  function (error, response, body) {
      if (!error && response.statusCode == 200) {
          res.send(body);
      } else { 
          res.send(body);
      }
  });
} 

/***********************
FUNCTION TO REMOVE MENU
************************/

const removePersistentMenu = (res) => {
  var messageData = {
          "fields": [
             "persistent_menu" ,
             "get_started"                 
          ]               
  };  
  request({
      url: 'https://graph.facebook.com/v2.6/me/messenger_profile?access_token='+ PAGE_ACCESS_TOKEN,
      method: 'DELETE',
      headers: {'Content-Type': 'application/json'},
      form: messageData
  },
  function (error, response, body) {
      if (!error && response.statusCode == 200) {          
          res.send(body);
      } else {           
          res.send(body);
      }
  });
} 


/***********************************
FUNCTION TO ADD WHITELIST DOMAIN
************************************/

const whitelistDomains = (res) => {
  var messageData = {
          "whitelisted_domains": [
             APP_URL , 
             "https://herokuapp.com" ,                                   
          ]               
  };  
  request({
      url: 'https://graph.facebook.com/v2.6/me/messenger_profile?access_token='+ PAGE_ACCESS_TOKEN,
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      form: messageData
  },
  function (error, response, body) {
      if (!error && response.statusCode == 200) {          
          res.send(body);
      } else {           
          res.send(body);
      }
  });
} 