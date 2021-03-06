# node-chat API

## POST /api/login
### ARGUMENTS
#### username
a name that the client will recognize you as
### RESULT
#### success
whether the request was successfull or not
#### username
the username the client will recognize you as
#### id
your id, used for sending messages and logging out
#### error (?)
if success = false, the error that occurred

```json
{
    "success": true,
    "username": "[API] Bill",
    "id": "Pr10iF6D5M30xp0IWmNObSVkVNWILOCpIUyBK0-_7dLtBBExRt"
}
```

## POST /api/send
### ARGUMENTS
#### id
a name that the client will recognize you as
#### message
the message to be sent
### RESULT
#### success
whether the request was successfull or not
#### message
the message that was sent
#### error (?)
if success = false, the error that occurred

```json
{
    "success": true,
    "message": "hello world!"
}
```

## POST /api/typing
### ARGUMENTS
#### id
a name that the client will recognize you as
#### isTyping
whether or not the "USERNAME is typing..." message should be displayed, acceptable values: `true`, `false`, `1`, `0`
### RESULT
#### success
whether the request was successfull or not
#### error (?)
if success = false, the error that occurred

```json
{
    "success": true,
}
```

## POST /api/logout
### ARGUMENTS
#### id
the id received from /api/login
### RESULT
#### success
whether the request was successfull or not
#### error (?)
if success = false, the error that occurred

```json
{
    "success": true,
}
```
