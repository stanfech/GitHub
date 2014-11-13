// js/main.js

/*
 * My chat is using peer to peer connection, i.e. there is not any central server that distributed message to other contacts
 * Each peer manages its own connection and own contact
 * I have also created a directory (directory.js) that keeps update the list of connected users
 * 
 * I used the framework angular js and the API PeerJS http://peerjs.com/
 * PeerJS is an API that provide tool for peer to peer connection
 * Basically, a peer is created for each user and each peer is identify by a unique peer ID
 * The connection of peer need an external server, but when peer are created, the communicate together alone
 * So when a peer is created it connects to the directory to say hello and get the list of connected user
 * The directory also send a message to all connected user to warn the a new user is connected
 * 
 * At first peerJS provide us with a cloud server that help us to creat are new peer
 * I thought I would have time to create my own server in peer js but it was bit optimistic
 * So my chat is still using peerJS for created the peer, but once they are connected, the server is no more used!
 * 
 * 
 * 
 */

'use strict';

//you will find many useful function or variable I use in the file util.js

//angularjs module for the application
var streamChat=angular.module('streamChat',['chat','ngRoute']);


var chat = angular.module('chat',[]);



//an object for a contact a person we are talking to
function Contact(connection, userName){
	this.userName = userName;
	this.connection = connection;
	this.peerId = connection.peer;
};

//an object that define a user personn that is connected but we are not talking to
function User(userName, peerId){
	this.userName = userName;
	this.peerId = peerId;
	//the main differnce between user a contact object is the attribute connection
}

//an object that define a message that is display on the screen
function Message(sender, type, data){
	this.sender = sender;
	this.data = data;
	this.type = type;
	/*
	 * type can take for value : 
	 * "system"
	 * "video"
	 * "own" (if it is our own message)
	 * "text"
	 * "photo"
	 */
};

//I created a new directive to execute a function when the user press the key "enter"
chat.directive('ngEnter', function () {
    return function (scope, element, attrs) {
        element.bind("keydown keypress", function (event) {
            if(event.which === 13) {
                scope.$apply(function (){
                    scope.$eval(attrs.ngEnter);
                });

                event.preventDefault();
            }
        });
    };
});

//controller for the whole page
chat.controller('chatController',['$scope', '$route',

function($scope,$route){
//$route is use to reload the page	

	/*
	 * contacts is the list of people we are talking with
	 * users it the list of people connected but who are not talking with us
	 * messages is the list of message that will be display on the screen
	 * userDirectory is the connection with the directory that regroup all the user connected
	 * peer is the object that represent the peer connection
	 */
	$scope.contacts = [];
	$scope.peer = null;
	$scope.messages = [];
	$scope.users = [];
	var userDirectory = null;
	$scope.directoryConnected = false;
	$scope.isConnected = false;//means that the user has chosen a username and his is ready to talk
	$scope.userName = null;//userName that see other users
	$scope.welcomeMessage="";//a message that can be displayed on the welcome page (where we chose our username)
	var userName = "";
	$scope.newDiscussion = function(){
		window.open(document.location.href);
	};
	
	var conversation = document.getElementById("conversation");

	/*
	 * function called when user click on the button to connect or disconnect to the directory
	 * even if he is disconnected, he can still talk with people that are in his users and contacts list
	 * how ever he can't see new people connected and the can't see him
	 */
	$scope.directoryConnection = function(){
		if($scope.directoryConnected){//if he is connected, then we disconnect him
			$scope.directoryConnected=false;
			userDirectory.send(PREFIX+HIDDEN+$scope.peer.id);		
		}else{//if disconnected we connect him to the directory
			userDirectory = $scope.peer.connect(DIRECTORY_ID);
			console.log("Try to connect to user directory");
			userDirectory.on('open', function(){
				//event trigger when directory connection is opened
				console.log("Connected to directory");
				var message = PREFIX+NEW_USER+userName;
				userDirectory.send(message);
				$scope.directoryConnected=true;

			});
			userDirectory.on('error', function(err){
				console.log("Not connected to directory : " + err);
				$scope.directoryConnected=true;
				userDirectory=null;
			});
			
		}		
	};

	$scope.quitDiscussion = function(){
		/* 
		 * user want to quit the current conversation
		 * we need to remove all its contacts from contacts list and to put the in the users list
		 */
		if($scope.contacts.length){
			//we warn other user we are quitting the conversation
			sendData(PREFIX+QUIT+$scope.userName);
			for(var i = 0; i < $scope.contacts.length;i++){
				var contact = $scope.contacts[i];
				$scope.users.push(new User(contact.userName, contact.peerId));			
			};
			$scope.contacts=[];
			displayText("You quitted the conversation");
		};
	}

	/*
	 * function call when the user click on the "Get started on the welcome page
	 * basically this function inits the whole chat and then 
	 * connects to the directory to get the list of people connected and say hello
	 *  
	 */
	$scope.connect = function(){
		if($scope.userName!=null&$scope.userName!=""){
			$scope.isConnected=true;
			$scope.peerOrName="Connected as " + $scope.userName;
			userName = $scope.userName;
			try{
				//we create the peer that will handle all connectin
				$scope.peer = new Peer({key: KEY});
				$scope.peer.on('connection', function(connection) {
					//event trigger when another peer try to connect to us
					console.log("New connection from " + connection.peer);
					connection.on('data', function(data){
							//event trigger when data are received
							messageReceived(connection, data);
					});
					if(connection.peer==DIRECTORY_ID){
						//if the connection come from the directory
						console.log("Connected to user directory");
					}else{
						//when someone try to connect with us, we connect to him

						if(!isConnectedTo(connection.peer)){
							sendData(PREFIX+CONNECT+connection.peer);
							connectTo(connection.peer);
						}	
				}
				});
				
				$scope.peer.on('open', function(id) {
						//event trigger when the peer is ready to use
						console.log('My peer ID is: ' + id);
						
						//connection to the user directory
						try{
							userDirectory = $scope.peer.connect(DIRECTORY_ID);
							console.log("Try to connect to user directory");
							userDirectory.on('open', function(){
								console.log("Connected to directory");
								var message = PREFIX + NEW_USER+userName;
								userDirectory.send(message);
								$scope.directoryConnected=true;
							});

						}catch(error){
							console.log("No connection with user directory");
							userDirectory = null;
							//TODO launch the user directory
						}	
				});
			}
			catch(error){
				console.log(error);
			}
	
		}
	}
	//function called when the user click on the send button
	$scope.send = function () {
	if($scope.message!=null&$scope.message!=""){
		sendData($scope.message);
		var message = new Message(userName, OWN_MESSAGE, $scope.message);
		//we had our message to the conversation
		$scope.messages.push(message);
		//we clear the input field
		$scope.message="";
		}
	};
	
	//send a message to all contacts in the discussion
	function sendData(data){
		for(var i=0;i<$scope.contacts.length;i++){
			var connection = $scope.contacts[i].connection;
			connection.send(data);
			console.log("sending message to " + connection.peer);
		}		
	}
	
	//function to send a photo
	var photo = document.getElementById("photo");
	
	photo.onchange = function(event){
		for(var i = 0;i<photo.files.length;i++){
			var file = photo.files[i];		
			var reader = new FileReader();
						
			reader.onerror = function(event) {
				console.error("File could not be read! Code " + event.target.error.code);
			};			
			reader.onload = function(event) {
				var contents = event.target.result;
				console.log(contents);
				var photoMessage = new Message($scope.userName, PHOTO, contents);
				$scope.messages.push(photoMessage);
				sendData(PHOTO+contents);
				$route.reload();
			};
			reader.readAsDataURL(file);	
			//the photo is send as a data URL
			//I wanted to use Blob object but there is a problem while sending it to other users;
			
			}
			photo.value = "";
			conversation.scrollTop(0);

	};
	
	//function to send a video
	//Not yet implemented
	var video = document.getElementById("video");
	video.onchange = function(event){
		for(var i = 0;i<video.files.length;i++){
			var file = video.files[i];		
			var reader = new FileReader();
						
			reader.onerror = function(event) {
				console.error("File could not be read! Code " + event.target.error.code);
			};			
			reader.onload = function(event) {
				var contents = event.target.result;
				console.log(contents);
				var videoMessage = new Message($scope.userName, VIDEO, contents);
				
				var videoMessage = new Message($scope.userName, OWN_MESSAGE, "Trying to send a video, not yet implemented");
				$scope.messages.push(videoMessage);
				
				
				sendData(VIDEO+contents);
				$route.reload();
			};
			var videoMessage = new Message($scope.userName, OWN_MESSAGE, "Trying to send a video, not yet implemented");
			$scope.messages.push(videoMessage);
			$route.reload();
			sendData(VIDEO+"notimplemented");
			//reader.readAsDataURL(file);
			//not yet implemented
			
		};
		video.value = "";

	};
	
	
	//function called before we leave the page
	//we need to close our connection
	//and to warn directory and our contacts we are disconnected
	window.onbeforeunload = function () {

		if($scope.userName!=null){//i.e. if we are connected
			//we warn our contact we are not any more connected
			sendData(PREFIX+QUIT+$scope.userName);
			//we warn our directory we are not any more connected
			if(userDirectory!=null){
			userDirectory.send(PREFIX+DISCONNECTED+$scope.userName);
			}
			//we close each connection one by one
			for(var i = 0; i<$scope.contacts.lengthComponents;i++){
				var contact = $scope.contacts[i];
				contact.connection.close();
				
			}
		}
		
	}
	
	//function to connect our peer to an other peer given its peer id
	function connectTo(id){
		if(id != $scope.peer.id && !isConnectedTo(id)){
			//if we are not yet connected to this peer
			try{
				var connection = $scope.peer.connect(id);
				console.log("connection " + connection.peer);
				connection.on('open', function(){
					//event trigger when the connection is open and ready to use
					console.log("Connected to peer " + id);
					
				});	
				var user = findUserById(connection.peer);
				if(user==null){
					user = new User(id, id);
				}else{
					$scope.users.remove(user);
				}
				$scope.contacts.push(new Contact(connection, user.userName));
				displayText(user.userName + " is online");
				$route.reload();
			}
			catch(error){
				console.log(error);
			}
		}
		
		
		//TODO : if isConectedTo(id) try to reconnect maybe
		
		
		
	};
	/*
	 * they are to kind of message : system message (starts with PREFIX)
	 * and other message that should be displayed on the screen
	 * system message are message send and received by the application but they are not displayed to the user
	 * ex : message to warn us there is a new user, a user is disconnected, is banished... 
	 */
//this function handle received message
function messageReceived(connection, message){
		console.log("Message received " + typeof(message));
		switch (typeof(message)){
		case 'string':
			//system message
			if(message.startsWith(PREFIX)){
				//this message will not be displayd on the chat
				var code = parseInt(message.substr(PREFIX.length,3));
				console.log("Message system : " + code);
				var data = message.substr(PREFIX.length+3,message.length);
				switch (code){
				case CONNECT:
					//connect this user
					//data = peer id
					connectTo(data);
					break;
				case BANISH:
					//banished a user
					//data = peer id to banished
					var contactBanished = findContactById(data);
					var contactBanishing = findContactById(connection.peer);
					if(data == $scope.peer.id){
						//if the banished peer is our peer (if we are banished)
						displayText("You have been banished by " + contactBanishing.userName);
						for(var i = 0;i<$scope.contacts.length;i++){

							console.log(i+ "   " +$scope.contacts.length );
							var contact = $scope.contacts[i];
							console.log(i+ "   " +$scope.contacts.length );
							//removeContact(contact);
							console.log($scope.contacts[i].userName);
							contact.connection.close();
							var user = new User(contact.userName, contact.peerId);
							$scope.users.push(user);
							
							
						};
						connection.close();
						$scope.contacts = [];					
					}else{
						//if the banished peer is another peer

						displayText(contactBanishing.userName + " has banished " + contactBanished.userName);
						removeContact(contactBanished);
						contactBanished.connection.close();
						$scope.users.push(new User(contactBanished.userName, contactBanished.peerId));					
					};
					
					break;

				case USERS_LIST:
					//we receive the user list from user directory peer
					//data = userName1/peerId1,userName2/peerId2,...
					if(data!=null){
						$scope.users = [];
						var temp = data.split(",");
						for(var i=0;i<temp.length;i++){
							var tempUser = temp[i].split("/");
							var contact = findContactById(tempUser[1]); 
							var user = findUserById(tempUser[1]);
							if(contact==null&user==null){
							//if the user is not already in our contact and user list we add it to the users lists
								$scope.users.push(new User(tempUser[0], tempUser[1]));
							}else if(contact!=null){
								contact.userName=tempUser[0];
							}else if(user!=null){
								user.userName=tempUser[0];
							}				
						}
					}
					break;
				case FIRST_USER:
					//directory warn us we are the first user
					break;
				case ADD_USER:
					//a new user is connected
					//data = userName/peerId
					var temp = data.split("/");
					var contact = findContactById(temp[1]); 
					var user = findUserById(temp[1]);
					if(contact==null&user==null){
					//if the user is not already in our contact and user list we add it to the users lists
						$scope.users.push(new User(temp[0], temp[1]));
					}else if(contact!=null){
						contact.userName=temp[0];
					}else if(user!=null){
						user.userName=temp[0];
					}
					break;
				case QUIT:
				//a contact warn us he quit the conversation (he is still connected but not in the conversation)
				//data = the name of the quitting contact
					var contact = findContactById(connection.peer);
					displayText(contact.userName + " quitted the conversation");
					removeContact(contact);
					contact.connection.close();
					$scope.users.push(new User(contact.userName, contact.peerId));	
					break;
				case DISCONNECTED:
				//a contact warn us he is not any more connected
				//data = the name ot the disconnected contact
					var contact = findContactById(connection.peer);
					displayText(contact.userName + " quitted the conversation");
					removeContact(contact);
				case REMOVE_USER:
				//directory warn us a user is not anymore connected
				//data = the peer id of the quitting user
					var user = findUserById(data);
					var contact = findContactById(connection.peer);
					$scope.contacts.remove(contact);
					$scope.users.remove(user);	
					break;
				case DIRECTORY_DISCONNECTED:
					directoryConnection();
					break;
				case BANISHED_USER:
				//a user has been banished from directory
				//data = banished user peer id
					if(data==$scope.peer.id){
						
						for(var i = 0; i <$scope.contacts[i];i++){
							$scope.contacts[i].connection.close();
						}
						$scope.contacts = [];
						$scope.users = [];
						

						userDirectory.close();

						$scope.isConnected=false;
						$scope.userName=null;
						$scope.welcomeMessage="You have been banished by admin";
					}else{
						var contact = findContactById(data);
						if(contact==null){
							var user = findUserById(data);
							$scope.users.remove(user);
						}else{							
							displayText(contact.userName + " has been banished by admin");
							contact.connection.close();
							$scope.contacts.remove(contact);
						}		
					}
					break;
				}
			}else{
				var userName = findContactById(connection.peer).userName;
				if(message.startsWith(PHOTO)){
					message = message.substr(PHOTO.length, message.length);
					var photo = new Message(userName, PHOTO, message);
		    		$scope.messages.push(photo);
		    		$route.reload();
				}else if(message.startsWith(VIDEO)){
					//not yet implemented
					$scope.messages.push(new Message(userName, MESSAGE, "Trying to send a video, not yet impelemented"));
				}else{
					displayMessage(new Message(userName, MESSAGE, message));
				}
			};
			break;	
		};
		//we reload the page
		$route.reload();
	};
	
	
	
	//function call from the GUI when use click on the add button next to a user
	//we add this user to our contact
	$scope.add=function(user){
		sendData(PREFIX + CONNECT+user.peerId);
		connectTo(user.peerId);
	};

	//function to check if we are connected to a specific peer
	function isConnectedTo(peerId){
		var output = false;
		for(var i = 0; i<$scope.contacts.length;i++){
			var connection = $scope.contacts[i].connection;
			if(connection.peer == peerId){
				output = true;
			}					
		}
		return output;
	};
		
	//function call from the GUI when use click on the remove button next to a contact to banish him from the conversation
	//we remove this from our contact and warn other contacts he has been banished
	$scope.banish = function(contact){
		sendData(PREFIX+BANISH+contact.peerId);
		$scope.users.push(new User(contact.userName, contact.peerId));
		displayText("You have banished " + contact.userName);
		removeContact(contact);
	};
	
	function removeContact(contact){
		$scope.contacts.remove(contact);	
	}
	
	//to display a Message on the chat
	function displayMessage(message){
		$scope.messages.push(message);
	};
	
	//to display text a the chat (i.e. not a message from an other user, but a message from the application)
	//(ex : someone is online, someone is disconnected...)
	function displayText(text){
		var message = new Message("", TEXT, text);
		$scope.messages.push(message);
	}
	
	$scope.connectNewPeer = function(){
		
		var peer = $scope.peerToConnect;
		console.log(peer);
		if(peer!=null&peer!=""){
			connectTo(peer);
			sendData(PREFIX+CONNECT+peer);
		}
	}
	
	$scope.showPeerId = function(){
		
		if($scope.peerOrName.startsWith("Connected")){
			$scope.peerOrName = "Your peer ID is " + $scope.peer.id;
		}else{
			$scope.peerOrName = "Connected as " + $scope.userName;
		}
	}

	function findContactById(id){
		for(var i in $scope.contacts){
			var contact = $scope.contacts[i];
			if(contact.peerId == id){
				return contact;
			};
		};
		return null;
	};
	
	function findUserById(id){
		var output = null;
		for(var i =0;i<$scope.users.length;i++){
			var user = $scope.users[i];
			console.log(user.peerId);
			if(user.peerId == id){
				
				output= user;
			};
		};
		return output;
	};
	
	//function called when user want to clear the chat from the existing messages
	$scope.clear = function(){
		$scope.messages = [];
	};
}

]);