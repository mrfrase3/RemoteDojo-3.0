var socket = io.connect('/main');
var chats = null;
var live = false;

$('.hidden').hide(); //I'm lazy
$('.hidden').removeClass('hidden');

//Helper Function to authenticate the connection
// socket and callback are passed, callback is called if the socket is authenticated
var authSock = function(sock, cb){
	sock.on('sockauth.request', function(){ //when the server requests authentication
		$.get('/sockauth'+window.location.search, function(res){ //get the user session token to prove identity
			if(res.err){
				sock.close();
				alert('Authentication with server failed, please log back in.');
				console.log('Failed to authorise socket connection: ' + res.err);
			} else sock.emit('sockauth.validate', res); //send the token to the server
		});
	});

	sock.on('sockauth.dupeConflict', function(){ //server says the token is valid
		socket.emit('sockauth.dupeResolution', confirm("You currently have another active session in another window/tab.\nForce the other to disconnect?"));
	});

	sock.on('sockauth.valid', function(){ //server says the token is valid
		console.log('socket connection authorised');
    	if(cb) cb();
	});

	sock.on('sockauth.invalid', function(){ //server says the token is not valid
		sock.close();
		//alert('Authentication with server failed, please log back in.');
    	$(".alert-wrapper").prepend(genalert("danger", false, "Authentication with server failed, please log back in."));
		console.log('Failed to authorise socket connection: Token was not valid.');
	});
}



//Helper Function for when the chat needs to stop
var stopChat = function(){
	if (!live) return;
	stopRTC();
	live = false;
	chats = null;
	$('.screen-remote-box').hide();
	$(".button-menu .chat-list-wrap").hide();
	$(".button-menu-buttons .chat-open").hide();
	$('.presentations-panel').show();
	$('.chat-body-stop').hide();
	// TODO Show for ninja
	var isNinja = $(".user-info-panel").data("type") == "ninja";
	if (isNinja) {
		$('.chat-body-request').show();
	} else {
		$(".chat-btn-start").removeClass("disabled");
	}
	$(".chat-list-wrap .chat-list").empty(); // TODO Only the mentor forgets the chat, ninja sends on connection to a mentor.
	if(videosOutOfPosition) switchVideoPositions();
}

// Socket Processing

socket.on('connect', function(){
	console.log('socket connection made.');
	authSock(socket, function(){
    	socket.auth = true;
    	$(".loading-overlay").hide(200);
    });
});

socket.on('reconnect', function(){
	console.log('socket connection made.');
});

socket.on('disconnect', function(){
	console.log('socket disconnected.');
	stopChat();
});

socket.on('general.disconnect', function(m){
	$(".alert-wrapper").prepend(genalert("danger", false, "You were disconected from the server!<br>Because " + m));
});

socket.on('general.mentorStatus',function(data){ // change a mentors status if theres a list
	labels = {offline: 'default', available: 'success', busy: 'warning'};
	currstat = $('#mentor-'+data.username + ' .label').html();
	$('#mentor-'+data.username + ' .label').removeClass('label-' + labels[currstat]);
	$('#mentor-'+data.username + ' .label').addClass('label-' + labels[data.status]);
	$('#mentor-'+data.username + ' .label').html(data.status);
});

socket.on('general.startChat',function(data){ //start a chat session when the server's made one
	console.log("starting call");
	if (chats) return;
	chats = data;
	console.log(data.ninja +" ");
	var isNinja = $(".user-info-panel").data("type") == "ninja";
	startRTC(isNinja);
	//setTimeout(Mediaconn.openOrJoin,joinDelay,data.ninja, onJoin); // the ninja and mentor cannot connect at the same time, so one is delayed (look in their socks files)
	$('.chat-body-start').data("calling", false);
	$(".button-menu-buttons .chat-open").show();
	$('.screen-remote-box').show();
	$('.presentations-panel').hide();
	$('.chat-body-stop').show();
	// TODO Hide for ninja
	if (isNinja) $('.chat-body-start').hide();
	else $(".chat-btn-start").addClass("disabled");
});

socket.on('general.stopChat',stopChat); //stop a current chat if the server says to

$(function(){
	$('.chat-btn-stop').click(function(){ //allow the leave chat button to request the server to stop the chat
		socket.emit('general.stopChat');
	});

});
