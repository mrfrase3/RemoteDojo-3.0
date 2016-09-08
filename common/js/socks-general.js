var socket = io.connect('/main');
var chats = null;
var joinDelay = 0;

$('.hidden').hide();
$('.hidden').removeClass('hidden');

var checksock = function() {
	if(!sockconn.conn || !sockconn.auth){
		if(!sockconn.conn) alert('Error: Cannot perform action because there is not connection established. please wait or refreash the page.');
		else alert('Error: Cannot perform action because you are not authenticated, please wait or log back in.');
		return false;
	}
	return true;
}

var authSock = function(sock, cb){
	sock.on('sockauth.request', function(){
		$.get('/sockauth', function(res){
			if(res.err){
				sock.close();
				alert('Authentication with server failed, please log back in.');
				console.log('Failed to authorise socket connection: ' + res.err);
			} else sock.emit('sockauth.validate', res);
		});
	});
	
	sock.on('sockauth.valid', function(){
		console.log('socket connection authorised');
    	if(cb) cb();
	});

	sock.on('sockauth.invalid', function(){
		sock.close();
		alert('Authentication with server failed, please log back in.');
		console.log('Failed to authorise socket connection: Token was not valid.');
	});
}

socket.on('general.mentorStatus',function(data){
	labels = {offline: 'default', available: 'success', busy: 'warning'};
	currstat = $('#mentor-'+data.username + ' .label').html();
	$('#mentor-'+data.username + ' .label').removeClass('label-' + labels[currstat]);
	$('#mentor-'+data.username + ' .label').addClass('label-' + labels[data.status]);
	$('#mentor-'+data.username + ' .label').html(data.status);
});



var Mediaconn = new RTCMultiConnection();
Mediaconn.socketURL = 'https://3mr.fr:4001/';

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

var onJoin = function(exists, roomid){
	console.log(JSON.stringify([exists, roomid]));
	Mediaconn.addStream({audio:true, video:false});
}


var stopChat = function(){
	if (!chats) return;
    try{
    	Mediaconn.leave();
    } catch(e){}
	chats = null;
	$('.screen-foreign-box').hide();
	$('.presentations-panel').show();
	$('.chat-body-stop').hide();
	$('.chat-body-request').show();
}

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

socket.on('general.mentorStatus',function(data){
	labels = {offline: 'default', available: 'success', busy: 'warning'};
	currstat = $('#mentor-'+data.username + ' .label').html();
	$('#mentor-'+data.username + ' .label').removeClass('label-' + labels[currstat]);
	$('#mentor-'+data.username + ' .label').addClass('label-' + labels[data.status]);
	$('#mentor-'+data.username + ' .label').html(data.status);
});

socket.on('general.startChat',function(data){
	if (chats) return;
	chats = data;
	console.log(data.ninja +' ');
	setTimeout(Mediaconn.openOrJoin,joinDelay,data.ninja, onJoin);
	$('.screen-foreign-box').show();
	$('.presentations-panel').hide();
	$('.chat-body-stop').show();
	$('.chat-body-start').hide();
});

socket.on('general.stopChat',stopChat);

$(function(){
	$('.chat-btn-stop').click(function(){
		socket.emit('general.stopChat');
	});

});



