//js/directory.js
'use strict';


/*
 * 
 * the directory keep update the list of all user connected
 * 
 */

/*
 * object that represent a user connected
 */
function User(userName,connection){
	this.userName = userName;
	this.connection = connection;
	this.peerId=connection.peer;
	this.toString=function(){
		return this.userName+"/"+this.peerId;
	}
};




var streamServer=angular.module('streamServer',['directory', 'ngRoute']);

var directory = angular.module('directory',[]);

directory.controller('directoryController',['$scope', '$route',
	
function($scope,$route){
	$scope.users = [];
	
	
	try{
		console.log("Start");
		$scope.peer = new Peer(DIRECTORY_ID, {key: KEY});
		$scope.peer.on('open', function(){
			console.log("My peer ID = " + $scope.peer.id);
		});		
	}catch(error){
		console.log(error);
	}
	
	
	$scope.peer.on('connection', function(connection) {
		connection.on('data', function(message){
			
			//the function that managed messages received
			if(message.startsWith(PREFIX)){
				var code = parseInt(message.substr(PREFIX.length,3));
				console.log("Message system : " + code);
				var data = message.substr(PREFIX.length+3,message.length);
				switch (code){
				case NEW_USER:
					//a new user say hello
					//data = user name
					console.log("New user " + data);
					try{
						var con = $scope.peer.connect(connection.peer);
						con.on('open', function(){
							
							var user = new User(data, con);
							var usersList = getUsersList();
							if(usersList==null){
								//it's the first user
								user.connection.send(PREFIX+FIRST_USER);
							}else{
								user.connection.send(PREFIX+USERS_LIST+usersList);
							}
							
							send(PREFIX+ADD_USER+user.toString());
			
							$scope.users.push(user);
						});
					}catch(error){
						console.log(error);
					}
					break;
				case DISCONNECTED:
				//a user warn the directory he is disconnecting
				//data = username
					var user = findUserById(connection.peer)
					$scope.users.remove(user);
					user.connection.close();
					connection.close();
					send(PREFIX+REMOVE_USER+user.peerId);
					break;
				case HIDDEN:
				//a user want to be suppress from the directory
				//we delete from directory user but we don't warn current user that he is disconnect
				//new user won't see him but current user still see him
					connection.close();
					var user = findUserById(data);
					alert(user.userName);
					user.connection.close();
					$scope.users.remove(user);
					break;
				};
			};
		$route.reload();
		});	
		$route.reload();
	
	});
	
	window.onbeforeunload = function () {

		if($scope.userName!=null){//i.e. if we are connected
			//we warn our contact the directory is not any more connected
			sendData(PREFIX+DIRECTORY_DISCONNECTED);
		}
	}
	
	//send a message to all the users
	function send(message){
		for(var i=0;i<$scope.users.length;i++){
			$scope.users[i].connection.send(message);
		}
		$route.reload();
	}
	
	//return a string with the list of all the user to send it to users
	function getUsersList(){
		var usersList = null;
		if($scope.users.length!=0){
			usersList ="";
			for(var i =0;i<$scope.users.length;i++){
				var user = $scope.users[i];
				if(i > 0){
					usersList = usersList+",";
				}
				usersList = usersList + user.toString();	
			}
		}
		console.log(usersList);
		return usersList;
	}
	
	$scope.banish = function(user){
		send(PREFIX+BANISHED_USER+user.peerId);	
		//user.connection.close();
		$scope.users.remove(user);
	};
	
	function findUserByName(name){
		for(var i in $scope.users){
			var user = $scope.users[i];
			if(user.userName==name){
				return user;
			}
		}
		return null;
	}
	
	function findUserById(id){
		for(var i in $scope.users){
			var user = $scope.users[i];
			if(user.peerId==id){
				return user;
			}
		}
		return null;
	}


}]);