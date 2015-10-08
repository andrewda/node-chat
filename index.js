var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;
var fs = require('fs');

var messages = [];

var options = {};

try {
    options = JSON.parse(fs.readFileSync('options.json'));
} catch (err) {
    throw err;
}

server.listen(port, function() {
    console.log('Server listening at port %d', port);
});

String.prototype.trim = function() {
    return String(this).replace(/^\s+|\s+$/g, '');
};

app.use(express.static(__dirname + '/public'));
var router = express.Router();

var usernames = {};
var numUsers = 0;

function makeid() 
{
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890-_";

    for (var i = 0; i < 50; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }

    return text;
}

Object.prototype.getKeyByValue = function(value) {
    for (var prop in this) {
        if (this.hasOwnProperty(prop)) {
            if (this[prop] === value) {
                return prop;
            }
        }
    }
};

io.on('connection', function(socket) {
    var addedUser = false;

    router.post('/send', function(req, res) {
        var query = res.req.client._httpMessage.req.query; //get the query
        
        if (query.id === undefined || query.message === undefined || query.message === '' || query.id === '') {
            res.json({ success: false, error: options.errors.missing_params });
            return;
        }
        
        if (query.message.length > 124) {
            res.json({ success: false, error: options.errors.message_length });
            return;
        }
        
        var username = usernames.getKeyByValue(query.id);
        
        if (username !== undefined) {
            io.emit('new message', {
                username: username,
                message: query.message
            });
        } else {
            res.json({ success: false, error: options.errors.user_unknown });
            return;
        }
        
        res.json({ success: true, from: query.from, message: query.message });
    });
    
    router.post('/login', function(req, res) {
        var query = res.req.client._httpMessage.req.query; //get the query
        
        query.username = "[API] " + query.username;
        
        if (query.username === undefined || query.username === '') {
            res.json({ success: false, error: options.errors.missing_params });
            return;
        }
        
        if (query.username.length > 18) {
            res.json({ success: false, error: options.errors.username_length });
            return;
        }
        
        if (usernames[query.username] !== undefined || usernames[query.username.replace("[API] ", "")] !== undefined) {
            res.json({ success: false, error: options.errors.name_taken });
            return;
        }
        
        socket.username = query.username;
        usernames[query.username] = makeid();
        ++numUsers;
        io.emit('user joined', {
            username: socket.username,
            numUsers: numUsers
        });
        
        res.json({ success: true, username: query.username, id: usernames[query.username] });
    });
    
    router.post('/logout', function(req, res) {
        var query = res.req.client._httpMessage.req.query; //get the query
        
        if (query.id === undefined || query.id === '') {
            res.json({ success: false, error: options.errors.missing_params });
            return;
        }
        
        var username = usernames.getKeyByValue(query.id);
        
        if (username !== undefined) {
            delete usernames[username];
            --numUsers;
            io.emit('user left', {
                username: username,
                numUsers: numUsers
            });
        } else {
            res.json({ success: false, error: options.errors.invalid_id });
            return;
        }
        
        res.json({ success: true, username: query.username });
    });
    
    router.post('/typing', function(req, res) {
        var query = res.req.client._httpMessage.req.query; //get the query
        
        if (query.id === undefined || query.id === '' || query.isTyping === undefined || query.isTyping === '') {
            res.json({ success: false, error: options.errors.missing_params });
            return;
        }
        
        var username = usernames.getKeyByValue(query.id);
        
        if (username !== undefined) {
            if (query.isTyping.toLowerCase() === 'true' || query.isTyping === '1') {
                io.emit('typing', {
                    username: username
                });
            } else if (query.isTyping.toLowerCase() === 'false' || query.isTyping === '0') {
                io.emit('stop typing', {
                    username: username
                });
            } else {
                res.json({ success: false, error: options.errors.invalid_status });
                return;
            }
        } else {
            res.json({ success: false, error: options.errors.invalid_id });
            return;
        }
        
        res.json({ success: true });
    });

    socket.on('new message', function(data) {
        if (data.trim() !== undefined && data.trim() !== '') {
            messages.push({
                username: socket.username,
                message: data
            });
            socket.broadcast.emit('new message', {
                username: socket.username,
                message: data
            });
        }
    });

    socket.on('add user', function(username, userid) {
        var userHandler = 1;
        var initUser = username;
        
        while (usernames[username] !== undefined) {
            username = initUser + userHandler.toString();
            userHandler++;
        }
        
        socket.username = username;
        usernames[username] = userid;
        ++numUsers;
        addedUser = true;
        socket.emit('login', {
            numUsers: numUsers
        });
        
        console.log(userid);
        
        socket.broadcast.emit('user joined', {
            username: socket.username,
            numUsers: numUsers
        });
    });

    socket.on('typing', function() {
        socket.broadcast.emit('typing', {
            username: socket.username
        });
    });

    socket.on('stop typing', function() {
        socket.broadcast.emit('stop typing', {
            username: socket.username
        });
    });

    socket.on('disconnect', function() {
        if (addedUser) {
            delete usernames[socket.username];
            --numUsers;
            socket.broadcast.emit('user left', {
                username: socket.username,
                numUsers: numUsers
            });
        }
    });
    
    setInterval(function() {
        socket.broadcast.emit('username update', {
            usernames: usernames
        });
    }, 1000);
});

app.use('/api', router);