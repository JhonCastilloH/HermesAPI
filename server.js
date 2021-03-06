var express = require("express");
var path = require("path");
var bodyParser = require("body-parser");
var mongodb = require("mongodb");
var ObjectID = mongodb.ObjectID;

var CONTACTS_COLLECTION = "contacts";
var ACTUATORS_COLLECTION = "actuators";
var SPACES_COLLECTION = "spaces";

var app = express();
app.use(express.static(__dirname + "/public"));
app.use(bodyParser.json());

// Create a database variable outside of the database connection callback to reuse the connection pool in your app.
var db;

// Connect to the database before starting the application server.
mongodb.MongoClient.connect(process.env.MONGODB_URI, function(err, database) {
    if (err) {
        console.log(err);
        process.exit(1);
    }

    // Save database object from the callback for reuse.
    db = database;
    console.log("Database connection ready");

    // Initialize the app.
    var server = app.listen(process.env.PORT || 8080, function() {
        var port = server.address().port;
        console.log("App now running on port", port);
    });
});


// Generic error handler used by all endpoints.
function handleError(res, reason, message, code) {
    console.log("ERROR: " + reason);
    res.status(code || 500).json({ "error": message });
}

// mount middlewares
app.use(express.static('../www'));
app.use(bodyParser.json());
app.use(function(req, res, next) {
    console.log(req.method + ':' + req.url);
    if ((req.url === '/spaces'  && req.method === 'GET') || 
        (req.url === '/actuators' && req.method === 'GET') || (req.url === '/sessions') ||
        (req.url === '/contacts' && req.method === 'POST')) {
        next();
    } else if (!req.query.token) {
        handleError(res, "", "Token missing", 401);
    } else {
        db.collection('contacts').findOne({ _id: ObjectID.createFromHexString(req.query.token) },
            (err, doc) => {
                if (err) handleError(res, err.message, "Invalid request", 500);
                else if (!doc) handleError(res, err.message, "Invalid token", 401);
                else next();
            });
    }
});



// SESSION API ROUTES BELOW

app.post('/sessions', function(req, res) {
    //console.log('POST /myvideos/sessions');
    if (!req.body.email || !req.body.password) res.send(400, 'Missing data');
    else {
        db.collection('contacts').findOne({ email: req.body.email, password: req.body.password },
            (err, doc) => {
                //console.log('TOKEN: ' + doc._id.toHexString());
                if (err) handleError(res, err.message, "Invalid credentials", 500);
                else if (!doc) handleError(res, "", "An error on sessions", 401);
                else res.status(200).send({
                    userId: doc._id.toHexString(),
                    token: doc._id.toHexString()
                });
            });
    }
});

// CONTACTS API ROUTES BELOW

/*  "/contacts"
 *    GET: finds all contacts
 *    POST: creates a new contact
 */

app.get('/contacts', function(req, res) {
    db.collection(CONTACTS_COLLECTION).find().toArray((err, docs) => {
        if (err) handleError(res, err.message, "Failed to get contacts.");
        else res.status(200).send(docs.map((doc) => {
            var user = {
                id: doc._id.toHexString(),
                email: doc.email,
                name: doc.name,
                surname: doc.surname
            };
            res.status(200).json(user);
        }));
    });
});

app.post('/contacts', function(req, res) {
    if (!req.body.email || !req.body.password || !req.body.name ||
        !req.body.surname)
        handleError(res, "Invalid user input", "Must provide a first or last name.", 400);
    else {
        var user = {
            email: req.body.email,
            password: req.body.password,
            name: req.body.name,
            surname: req.body.surname
        };
        db.collection(CONTACTS_COLLECTION).insertOne(user, (err, result) => {
            if (err) handleError(res, err.message, "Failed to create new contact.");
            else res.status(201).json({
                id: result.insertedId.toHexString(),
                name: user.name,
                surname: user.surname,
                email: user.email
            });
        });
    }
});


/*  "/contacts/:id"
 *    GET: find contact by id
 *    PUT: update contact by id
 *    DELETE: deletes contact by id
 */

app.get("/contacts/:id", function(req, res) {
    db.collection(CONTACTS_COLLECTION).findOne({ _id: new ObjectID(req.params.id) }, function(err, doc) {
        if (err) {
            handleError(res, err.message, "Failed to get contact");
        } else {
            res.status(200).json(doc);
        }
    });
});

app.put("/contacts/:id", function(req, res) {
    var updateDoc = req.body;
    delete updateDoc._id;

    db.collection(CONTACTS_COLLECTION).updateOne({ _id: new ObjectID(req.params.id) }, updateDoc, function(err, doc) {
        if (err) {
            handleError(res, err.message, "Failed to update contact");
        } else {
            res.status(204).end();
        }
    });
});

app.delete("/contacts/:id", function(req, res) {
    db.collection(CONTACTS_COLLECTION).deleteOne({ _id: new ObjectID(req.params.id) }, function(err, result) {
        if (err) {
            handleError(res, err.message, "Failed to delete contact");
        } else {
            res.status(204).end();
        }
    });
});



// ACTUATORS API ROUTES BELOW


/*  "/actuators"
 *    GET: finds all actuators
 *    POST: creates a new actuator
 *    PUT: update actuator by id
 */

app.get("/actuators", function(req, res) {
    db.collection(ACTUATORS_COLLECTION).find({}).toArray(function(err, docs) {
        if (err) {
            handleError(res, err.message, "Failed to get actuators.");
        } else {
            res.status(200).json(docs);
        }
    });
});

app.post("/actuators", function(req, res) {
    var newContact = req.body;
    newContact.createDate = new Date();

    if (!(req.body.name)) {
        handleError(res, "Invalid user input", "Must provide a first or last name.", 400);
    }

    db.collection(ACTUATORS_COLLECTION).insertOne(newContact, function(err, doc) {
        if (err) {
            handleError(res, err.message, "Failed to create new actuator.");
        } else {
            res.status(201).json(doc.ops[0]);
        }
    });
});

app.put("/actuators/:id", function(req, res) {
    var updateDoc = req.body;

    db.collection(ACTUATORS_COLLECTION).updateOne({ id: { $eq: req.params.id } }, updateDoc, function(err, doc) {
        if (err) {
            handleError(res, err.message, "Failed to update actuator");
        } else {
            res.status(204).end();
        }
    });
});

// SPACES API ROUTES BELOW


/*  "/spaces"
 *    GET: finds all spaces
 *    POST: creates a new space
 *    PUT: update space by id
 */

app.get("/spaces", function(req, res) {
    db.collection(SPACES_COLLECTION).find({}).toArray(function(err, docs) {
        if (err) {
            handleError(res, err.message, "Failed to get spaces.");
        } else {
            res.status(200).json(docs);
        }
    });
});

app.post("/spaces", function(req, res) {
    var newContact = req.body;
    newContact.createDate = new Date();

    if (!(req.body.name)) {
        handleError(res, "Invalid user input", "Must provide a first or last name.", 400);
    }

    db.collection(SPACES_COLLECTION).insertOne(newContact, function(err, doc) {
        if (err) {
            handleError(res, err.message, "Failed to create new space.");
        } else {
            res.status(201).json(doc.ops[0]);
        }
    });
});

app.put("/spaces/:id", function(req, res) {
    var updateDoc = req.body;

    db.collection(SPACES_COLLECTION).updateOne({ id: { $eq: req.params.id } }, updateDoc, function(err, doc) {
        if (err) {
            handleError(res, err.message, "Failed to update space");
        } else {
            res.status(204).end();
        }
    });
});