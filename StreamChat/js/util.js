// js/util.js
'use strict';

var PREFIX = "_system_";

//key use to connect to peerJS server for peer creation
var KEY = "v5tb57g3sp3tbj4i";

//variable use for communication between peers
var QUIT = 100;
var CONNECT = 101;
var BANISH = 102;
//variable use for communication between peer and directory
var NEW_USER = 200;
var USERS_LIST = 201;
var FIRST_USER = 202;
var ADD_USER = 203;
var REMOVE_USER = 204;
var BANISHED_USER = 205;
var HIDDEN = 206;
var DIRECTORY_DISCONNECTED = 207;
var DIRECTORY_ID = "userDirectory";

var DISCONNECTED = 300;


//kind of enum for object Message
var MESSAGE = "message";
var TEXT = "text";
var VIDEO = "video";
var PHOTO = "photo";
var SYSTEM = "system";
var OWN_MESSAGE = "own";


if (typeof String.prototype.startsWith != 'function') {
	String.prototype.startsWith = function (str){
    	return this.slice(0, str.length) == str;
  	};
};

if(typeof Array.prototype.remove != 'function') {
	Array.prototype.remove =function(val){
		var index = this.indexOf(val)
		if(index > -1){
			this.splice(index,1);
		};
	};
};

