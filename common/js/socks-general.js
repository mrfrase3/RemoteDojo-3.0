var socket = io.connect('/main');
var chats = null;
var joinDelay = 0;

$('.hidden').hide(); //I'm lazy
$('.hidden').removeClass('hidden');

//Helper Function to authenticate the connection
// socket and callback are passed, callback is called if the socket is authenticated
var authSock = function(sock, cb){
	sock.on('sockauth.request', function(){ //when the server requests authentication
		$.get('/sockauth', function(res){ //get the user session token to prove identity
			if(res.err){
				sock.close();
				alert('Authentication with server failed, please log back in.');
				console.log('Failed to authorise socket connection: ' + res.err);
			} else sock.emit('sockauth.validate', res); //send the token to the server
		});
	});
	
	sock.on('sockauth.valid', function(){ //server says the token is valid
		console.log('socket connection authorised');
    	if(cb) cb();
	});

	sock.on('sockauth.invalid', function(){ //server says the token is not valid
		sock.close();
		alert('Authentication with server failed, please log back in.');
		console.log('Failed to authorise socket connection: Token was not valid.');
	});
}


// RTC connection startup
// Work in progress, more info at: http://www.rtcmulticonnection.org/
var Mediaconn = new RTCMultiConnection();
// Set the RTC socket server URL
Mediaconn.socketURL = 'https://3mr.fr:4001/'; //this needs to be dynamic

Mediaconn.sdpConstraints.mandatory = {
	OfferToReceiveAudio: true,
	OfferToReceiveVideo: true
};

Mediaconn.dontCaptureUserMedia = true;

Mediaconn.onstream = function(e){
	console.log(e.type +' Audio:'+ e.isAudio+' Video:'+e.isVideo+' '+JSON.stringify(e));
	if(e.type == 'local'){
    	document.querySelector('.dump video.dump-local').src = e.blobURL;
    	document.querySelector('.dump video.dump-local').play();
    	$('.screen-local-box').show();
    } else if(e.type == 'remote'){
    	//document.querySelector('.dump video.dump-foreign').src = e.blobURL;
    	//document.querySelector('.dump video.dump-foreign').play();
    	document.querySelector('.dump').appendChild(e.mediaElement);
    	e.mediaElement.media.play();
    }
};

Mediaconn.onMediaError = function() {
    console.log(JSON.stringify(arguments, null, '\t'));
};

//callback for when the RTC joins or opens a room.
var onJoin = function(exists, roomid){
	console.log(JSON.stringify([exists, roomid]));
	Mediaconn.addStream({audio:true, video:false});
}

// End of RTC connection startup

//Helper Function for when the chat needs to stop
var stopChat = function(){
	if (!chats) return;
    try{
    	Mediaconn.leave(); //try to leave the RTC room
    } catch(e){}
	chats = null;
	$('.screen-foreign-box').hide();
	$('.presentations-panel').show();
	$('.chat-body-stop').hide();
	$('.chat-body-request').show();
}

// Socket Processing

socket.on('connect', function(){
	console.log('socket connection made.');
	authSock(socket, function(){
    	socket.auth = true;
    });
});

socket.on('reconnect', function(){
	console.log('socket connection made.');
});

socket.on('disconnect', function(){
	console.log('socket connection made.');
	stopChat();
});

socket.on('general.mentorStatus',function(data){ // change a mentors status if theres a list
	labels = {offline: 'default', available: 'success', busy: 'warning'};
	currstat = $('#mentor-'+data.username + ' .label').html();
	$('#mentor-'+data.username + ' .label').removeClass('label-' + labels[currstat]);
	$('#mentor-'+data.username + ' .label').addClass('label-' + labels[data.status]);
	$('#mentor-'+data.username + ' .label').html(data.status);
});

socket.on('general.startChat',function(data){ //start a chat session when the server's made one
	if (chats) return;
	chats = data;
	console.log(data.ninja +' ');
	setTimeout(Mediaconn.openOrJoin,joinDelay,data.ninja, onJoin); // the ninja and mentor cannot connect at the same time, so one is delayed (look in their socks files)
	$('.screen-foreign-box').show();
	$('.presentations-panel').hide();
	$('.chat-body-stop').show();
	$('.chat-body-start').hide();
});

socket.on('general.stopChat',stopChat); //stop a current chat if the server says to

$(function(){
	$('.chat-btn-stop').click(function(){ //allow the leave chat button to request the server to stop the chat
		socket.emit('general.stopChat');
	});

});



