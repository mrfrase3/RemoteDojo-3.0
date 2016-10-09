$(function() {

	$('.chat-btn-start').click(function(){ // add even to the 'request a mentor' button
		console.log('sending mentor request');
		socket.emit('ninja.requestMentor');
		$('.chat-body-request').hide();
		$('.chat-body-start').show();
	});

	$('.chat-btn-cancel').click(function(){ // add even to the 'leave' button
		console.log('canceling mentor request');
		socket.emit('ninja.cancelRequest');
		$('.chat-body-request').show();
		$('.chat-body-start').hide();
	});

});

startChat = function(){
	peerconn.createOffer(offerOptions).then(function(desc){
		peerconn.setLocalDescription(desc).then(function() {
			socket.emit("rtc.offer", desc);
		}, function(){
			alert("Could not set local desc, contact an admin.");
			socket.emit("general.stopChat");
		});
	}, function(){
		alert("Could not create an offer, contact an admin.");
		socket.emit("general.stopChat");
	});
};
