var socket = io.connect('/main');
var chats = null;
var rtcStreams = {local:[], remote:[]};
var startChat;
var iceservers = [{
    url: 'turn:turn.anyfirewall.com:443?transport=tcp',
    credential: 'webrtc',
    username: 'webrtc'
}];

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

var peerconn;

var offerOptions = {
	offerToReceiveAudio: 1,
	offerToReceiveVideo: 1,
	voiceActivityDetection: false
};

function iceCallback(event) {
	console.log(event);
	if (event.candidate) {
		socket.emit("rtc.iceCandidate", event.candidate.toJSON());
	}
}

socket.on("rtc.iceCandidate", function(candidate){
	peerconn.addIceCandidate(
		new RTCIceCandidate(candidate)
	);
});

var onRemoteStream = function(e){
	console.log(e);
	$('.dump audio.dump-remote').get(0).srcObject = e.stream;
	//$('.dump video.dump-remote').get(0).play();
};

var onLocalStream = function(stream){
	console.log(stream);
	$(".dump video.dump-local").get(0).srcObject = stream;
	//$(".dump video.dump-local").get(0).play();
	$(".screen-local-box").show();
};

socket.on("rtc.offer", function(desc){
	//desc.sdp = forceChosenAudioCodec(desc.sdp);
	peerconn.setRemoteDescription(desc).then( function() {
		peerconn.createAnswer().then(function(desc2){
			peerconn.setLocalDescription(desc2).then( function() {
				//desc2.sdp = forceChosenAudioCodec(desc2.sdp);
				socket.emit("rtc.answer", desc2);
			}, function(){
				alert("Could not set local desc, contact an admin.");
				socket.emit("general.stopChat");
			});
		}, function(){
			alert("Could not create an answer, contact an admin");
			socket.emit("general.stopChat");
		});
	}, function(){
		alert("Could not set the remote description, contact an admin.");
		socket.emit("general.stopChat");
	});
});

socket.on("rtc.answer", function(desc2){
	peerconn.setRemoteDescription(desc2).then( function() {
		socket.emit("rtc.connected");
	}, function(){
		alert("Could not set the remote description, contact an admin.");
		socket.emit("general.stopChat");
	});
});

socket.on("rtc.connected", function(){
	console.log("RTC Signaling Completed!");
});

$(function(){
	$.get("https://raw.githubusercontent.com/DamonOehlman/freeice/master/stun.json", function(data){
		var servers = [];
		try{
			if(data instanceof Array) servers = data;
			else servers = JSON.parse(data);
		} catch(e){
			alert("Cannot get ice server list: not json, contact an admin.");
		}
		for(var i = 0; i < servers.length; i++){
			iceservers.push({url:"stun:"+servers[i]});
		}
	}).fail(function(){
		alert("Cannot get ice server list: invalid link, contact an admin.");
	});
});

// End of RTC connection startup

//Helper Function for when the chat needs to stop
var stopChat = function(){
	if (!chats) return;
	try{
		Mediaconn.leave(); //try to leave the RTC room
	} catch(e){}
	chats = null;
	$('.screen-remote-box').hide();
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
	console.log(data.ninja +" ");
	var pcConfig = null;
	if(iceservers.length > 0) pcConfig = {iceServers: iceservers};
	var pcConstraints = {
		optional: []
	};
	peerconn = new RTCPeerConnection(pcConfig, pcConstraints);
	peerconn.onicecandidate = iceCallback;
	peerconn.onaddstream = onRemoteStream;
	peerconn.onconnectionstatechange = function(){
		console.log("New RTC connection state: " + peerconn.connectionState);
	}
	navigator.mediaDevices.getUserMedia({
		audio: true,
		video: false
	}).then(function(stream){
		onLocalStream(stream);
		peerconn.addStream(stream);
		if(startChat) startChat();
	}).catch(function(e) {
		alert("getUserMedia() error: " + e.name);
	});
	//setTimeout(Mediaconn.openOrJoin,joinDelay,data.ninja, onJoin); // the ninja and mentor cannot connect at the same time, so one is delayed (look in their socks files)
	$('.screen-remote-box').show();
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
