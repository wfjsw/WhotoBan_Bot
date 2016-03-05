#!/usr/bin/env node

'use strict';

var confreader = require('jsonfile');
var Telegram = require('node-telegram-bot-api');

var blfile = './blacklist.json';
var blacklist = confreader.readFileSync(blfile);
var config = require('./config.json');
var tg = new Telegram(config.tg_bot_api_key, { polling: true });

var tgid, tgusername, errcount;
var inittime = Math.round(new Date().getTime() / 1000);
errcount = 0

process.on('SIGINT', function (code) {
    console.log('About to exit with code:', code);
    process.exit();
});
process.on('SIGTERM', function (code) {
    console.log('About to exit with code:', code);
    process.exit();
});


function processAdmin(msg){
    if (msg.text && msg.text.slice(0, 1) == '/') {
        var cmd = msg.text.split(' ');
        switch (cmd[0]) {
            case '/badd':
            case '/badd@' + tgusername:
                if (cmd[1]) {
                    blacklist[parseInt(cmd[1])] = cmd[2];
                    confreader.writeFileSync(blfile, blacklist);
                    tg.sendMessage(msg.chat.id, 'Successfully add ' + cmd[1] + ' with evtid ' + cmd[2]);
                }
                break;
            case '/bdel':
            case '/bdel@' + tgusername:
                if (cmd[1] && blacklist[parseInt(cmd[1])] != undefined) {
                    delete blacklist[parseInt(cmd[1])];
                    confreader.writeFileSync(blfile, blacklist);
                    tg.sendMessage(msg.chat.id, 'Successfully removed ' + cmd[1]);
                }
                break;
            case '/bsync':
            case '/bsync@' + tgusername:
                blacklist = confreader.readFileSync(blfile);
                tg.sendMessage(msg.chat.id, 'Successfully synced.');
                break;
        }
    }
}

function processPrivate(msg){
    if (msg.forward_from === undefined) 
        if (blacklist[msg.from.id]) {
            var message = 'You are in the blacklist!\n';
            message += 'Details goes here: ';
            message += 'https://telegram.me/' + config.chan_name + '/' + blacklist[msg.from.id];
            tg.sendMessage(msg.chat.id, message);
        } else {
            var message = 'You are not in the blacklist.\n';
            tg.sendMessage(msg.chat.id, message);
        }
    else {
        if (blacklist[msg.forward_from.id]) {
            var message = 'This guy is in the blacklist!\n';
            message += 'Details goes here: ';
            message += 'https://telegram.me/' + config.chan_name + '/' + blacklist[msg.forward_from.id];
            tg.sendMessage(msg.chat.id, message);
        } else {
            var message = 'This guy is not in the blacklist.\n';
            tg.sendMessage(msg.chat.id, message);
        }
    }
}

function processInGroup(msg){
    if (msg.new_chat_participant) 
        if (blacklist[msg.new_chat_participant.id]) {
            var message = 'WARNING!\n';
            message += 'This guy is in the blacklist of Project Who-to-Ban';
            message += 'Details goes here: ';
            message += 'https://telegram.me/' + config.chan_name + '/' + blacklist[msg.new_chat_participant.id];
            tg.sendMessage(msg.chat.id, message, {reply_to_message_id: msg.message_id});
        } 
}

// Universal Message Handler
tg.on('message', function (msg) {
    if (msg.date < inittime) return;
    if (config.admins.indexOf(msg.from.id) > -1)
        processAdmin(msg);
    if (msg.chat.type == 'private')
        processPrivate(msg);
    else if ((msg.chat.type == 'group') || (msg.chat.type == 'supergroup'))
        processInGroup(msg);
});

tg.getMe().then(function (ret) {
    tgid = ret.id;
    tgusername = ret.username;
    console.log('PROJECT WTB INITATED');
});

tg.on('error', function (msg) {
    console.log('Error occured.');
    errcount += 1;
    if (errcount > 5) process.exit();
});