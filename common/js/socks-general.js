const socket = io.connect('/main');
let live = false;
let initAuth = false;
let answeredRequest = false; // answeredRequest is distinct from 'live' in that it occurs before rtc connection.

$('.hidden').hide().removeClass('hidden');

//Helper Function to authenticate the connection
// socket and callback are passed, callback is called if the socket is authenticated
let authSock = function(sock, cb){
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
	initAuth = true;
};



//Helper Function for when the chat needs to stop
let stopChat = function(){
	if (!live) return;
	stopRTC();
	live = false;
	answeredRequest = false;
	$('.workarea .nav-tabs .tab-remote-screen, .workarea .nav-tabs .tab-remote-webcam').hide();
	$('.workarea .nav-tabs .tab-local-screen, .workarea .nav-tabs .tab-local-webcam').hide();
	$('.workarea .nav-tabs .tab-chat a').click();
	$('#wa-chat').addClass("active in");
	$('.screen-remote-box').hide();
	$(".button-menu .chat-list-wrap").hide();
	$(".button-menu-buttons .chat-open").hide();
	$('.presentations-panel').show();
	$('.chat-body-stop').hide();
	// TODO Show for ninja
	let isNinja = $(".user-info-panel").data("type") === "ninja";
	if (isNinja) $('.chat-body-request').show();
	else { 
    	$('.chat-panel').hide();
		$(".chat-btn-start").removeClass("disabled");
    }
	$(".chat-list-wrap .chat-list").empty(); // TODO Only the mentor forgets the chat, ninja sends on connection to a mentor.
	//if(videosOutOfPosition) switchVideoPositions();
};

// Socket Processing

socket.on('connect', function(){
	console.log('socket connection made.');
	if(!initAuth) authSock(socket, function(){
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

socket.on('general.disconnect', function(m, r){
	m = $('<div/>').text(m).html();
	if(r) m += "<a class='btn btn-success' href='/' style='position:absolute;top:10px;right:25px;'><i class='fa fa-refresh'></i></a>";
	$(".alert-wrapper").prepend(genalert("danger", false, "You were disconnected from the server!<br>Because " + m));
});

socket.on('general.genalert', function(level, diss, msg, timeout=4000){
	$(".alert-wrapper").prepend(genalert(level, diss, msg, timeout));
});

socket.on('general.mentorStatus',function(data){ // change a mentors status if theres a list
	labels = {offline: 'default', available: 'success', busy: 'warning'};
	let mentorlabel = $('#mentor-'+data.username + ' .label');
	currstat = mentorlabel.html();
    mentorlabel.removeClass('label-' + labels[currstat]);
    mentorlabel.addClass('label-' + labels[data.status]);
    mentorlabel.html(data.status);
});

socket.on('general.startChat',function(){ //start a chat session when the server's made one
	console.log("starting call");
	$(".remote-name").text("...");
	answeredRequest = true;
	if (live) return;
	let isNinja = $(".user-info-panel").data("type") === "ninja";
	if (isNinja) $('.mentor-list-panel').hide();
	startRTC(isNinja);
	//setTimeout(Mediaconn.openOrJoin,joinDelay,data.ninja, onJoin); // the ninja and mentor cannot connect at the same time, so one is delayed (look in their socks files)
	$('.chat-body-start').data("calling", false);
	$(".button-menu-buttons .chat-open").show();
	$('.screen-remote-box').show();
	$('.presentations-panel').hide();
	$('.chat-body-stop').show();
	if (isNinja) $('.chat-body-start').hide();
	else {
    	$(".chat-btn-start").addClass("disabled");
		$('.chat-panel').show();
    }
	// For the tutorial. The popover won't exist if not in tutorial mode, so in that case will do nothing
	$(".screen-local-start").popover("show");
	$(".webcam-controls").popover("show");
	setTimeout(function() {
		$(".screen-local-start").popover("hide");
		$(".webcam-controls").popover("hide");
	}, 4000);
});

socket.on('general.stopChat',stopChat); //stop a current chat if the server says to

$(function(){
	$('.chat-btn-stop').click(function(){ //allow the leave chat button to request the server to stop the chat
		socket.emit('general.stopChat');
		$(".chat-btn-stop").popover("hide"); //for tutorial, hide leave chat popup if it's still showing
	});
});
