$(function() {
    //OPTIONS
    var FADE_TIME = 175;
    var TYPING_TIMER_LENGTH = 2500;
    var COLORS = [
        '#e21400', '#91580f', '#f8a700', '#f78b00',
        '#58dc00', '#287b00', '#663300', '#4ae8c4',
        '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
    ];

    var $window = $(window);
    var $usernameInput = $('.usernameInput');
    var $messages = $('.messages');
    var $inputMessage = $('.inputMessage');
    var $users = $('.users');

    var $loginPage = $('.login.page');
    var $chatPage = $('.chat.page');

    var username;
    var connected = false;
    var typing = false;
    var blur = false;
    var lastTypingTime;
    var $currentInput = $usernameInput.focus();
    var userid = '';

    var socket = io();
    
    String.prototype.trim = function() {
        return String(this).replace(/^\s+|\s+$/g, '');
    };
    
    //Make an ID for each unique visitor (50 chars long)
    function makeid() {
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_!@#$%^&*";
    
        for (var i = 0; i < 50; i++)
            text += possible.charAt(Math.floor(Math.random() * possible.length));
    
        return text;
    }
    
    //When window is not in focus
    window.onblur = function() {
        blur = true;
    };

    //When window is in focus
    window.onfocus = function() {
        document.title = "SimpleMessages";
        blur = false;
    };

    //Tell us how many users are online
    function addParticipantsMessage(data) {
        var message = '';
        if (data.numUsers === 1) {
            message += "There is currently 1 user online";
        } else {
            message += "There are currently " + data.numUsers + " users online";
        }
        log(message);
    }

    //Set the user's username
    function setUsername() {
        username = cleanInput($usernameInput.val().trim());

        if (username) {
            $loginPage.fadeOut();
            $chatPage.show();
            $loginPage.off('click');
            $currentInput = $inputMessage.focus();
            
            userid = makeid();
            
            console.log("My ID: " + userid);
            
            socket.emit('add user', username, userid);
        }
    }

    //Send a message via Socket.IO
    function sendMessage() {
        var message = $inputMessage.val();

        message = cleanInput(message).replace(/\<3/g, "❤").replace(/\:lenny\:/g, "( ͡° ͜ʖ ͡°)");
        
        if (message && connected) {
            $inputMessage.val('');
            addChatMessage({
                username: username,
                message: message
            });

            socket.emit('new message', message);
        }
    }

    //Send a log/console message
    function log(message, options) {
        var $el = $('<li>').addClass('log').text(message);
        addMessageElement($el, options);
    }
    
    //Add a chat message to the screen
    function addChatMessage(data, options) {
        var $typingMessages = getTypingMessages(data);
        options = options || {};
        if ($typingMessages.length !== 0) {
            options.fade = false;
            $typingMessages.remove();
        }
        
        if (data.message.trim() !== undefined && data.message.trim() !== '') {
            var $usernameDiv = $('<span class="username"/>')
                .text(data.username)
                .css('color', getUsernameColor(data.username));
            var $messageBodyDiv = $('<span class="messageBody">')
                .text(data.message);
    
            var typingClass = data.typing ? 'typing' : '';
            var $messageDiv = $('<li class="message"/>')
                .data('username', data.username)
                .addClass(typingClass)
                .append($usernameDiv, $messageBodyDiv);
                
            if (blur && typingClass == '') {
                document.title = "Message From: " + data.username;
            }
    
            addMessageElement($messageDiv, options);
        }
    }

    //Add the "X is typing..." message
    function addChatTyping(data) {
        data.typing = true;
        data.message = 'is typing';
        addChatMessage(data);
    }

    //Remove the "X is typing..." message
    function removeChatTyping(data) {
        getTypingMessages(data).fadeOut(function() {
            $(this).remove();
        });
    }

    //Create a message element in the messages div
    function addMessageElement(el, options) {
        var $el = $(el);

        if (!options) {
            options = {};
        }
        if (typeof options.fade === 'undefined') {
            options.fade = true;
        }
        if (typeof options.prepend === 'undefined') {
            options.prepend = false;
        }
        if (options.fade) {
            $el.hide().fadeIn(FADE_TIME);
        }
        if (options.prepend) {
            $messages.prepend($el);
        } else {
            $messages.append($el);
        }
        $messages[0].scrollTop = $messages[0].scrollHeight;
    }

    //Clear the input text area
    function cleanInput(input) {
        return $('<div/>').text(input).text();
    }

    //Tell the server that we are typing a message
    function updateTyping() {
        if (connected) {
            if (!typing) {
                typing = true;
                socket.emit('typing');
            }
            lastTypingTime = (new Date()).getTime();

            setTimeout(function() {
                var typingTimer = (new Date()).getTime();
                var timeDiff = typingTimer - lastTypingTime;
                if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
                    socket.emit('stop typing');
                    typing = false;
                }
            }, TYPING_TIMER_LENGTH);
        }
    }

    //Check who is typing a message
    function getTypingMessages(data) {
        return $('.typing.message').filter(function(i) {
            return $(this).data('username') === data.username;
        });
    }

    //Get the color of someone's username
    function getUsernameColor(username) {
        var hash = 7;
        for (var i = 0; i < username.length; i++) {
            hash = username.charCodeAt(i) + (hash << 5) - hash;
        }
        var index = Math.abs(hash % COLORS.length);
        return COLORS[index];
    }

    //Update the "USERS ONLINE" area
    function updateUsernames(usernames) {
        var users = [];
    
        for (var key in usernames) {
            if (Object.prototype.hasOwnProperty.call(usernames, key)) {
                users.push(key);
            }
        }
        
        $users.empty();
        $users.append("USERS ONLINE:<br>");
        users.forEach(function(name) {
            $users.append("<span style='color:" + getUsernameColor(name) + "'>" + name + "</span><br>");
        });
    }

    $window.keydown(function(event) {
        if (!(event.ctrlKey || event.metaKey || event.altKey)) {
            $currentInput.focus();
        }

        if (event.which === 13) {
            if (username) {
                sendMessage();
                socket.emit('stop typing');
                typing = false;
            } else {
                setUsername();
            }
        }
    });

    $inputMessage.on('input', function() {
        updateTyping();
    });

    $loginPage.click(function() {
        $currentInput.focus();
    });

    $inputMessage.click(function() {
        $inputMessage.focus();
    });

    //When the server succesfully logs us in
    socket.on('login', function(data) {
        connected = true;
        var message = "Welcome to SimpleMessages!";
        log(message, {
            prepend: true
        });
        addParticipantsMessage(data);
    });

    //When someone sends a message
    socket.on('new message', function(data) {
        addChatMessage(data);
    });

    //When a new user joins
    socket.on('user joined', function(data) {
        log(data.username + ' joined');
    });
    
    //When a username update event is sent to us (every second)
    socket.on('username update', function(data) {
        for (var key in data.usernames) {
            if (Object.prototype.hasOwnProperty.call(data.usernames, key)) {
                var val = data.usernames[key];
                
                if (val === userid) {
                    username = key;
                }
            }
        }
        
        updateUsernames(data.usernames);
    });

    //When a user leaves
    socket.on('user left', function(data) {
        log(data.username + ' left');
        removeChatTyping(data);
    });

    //When a user is typing
    socket.on('typing', function(data) {
        addChatTyping(data);
    });

    //When a user stops typing
    socket.on('stop typing', function(data) {
        removeChatTyping(data);
    });
});