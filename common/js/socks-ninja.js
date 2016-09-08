
$(function() {

$('.chat-btn-start').click(function(){
	console.log('sending mentor request');
	socket.emit('ninja.requestMentor');
	$('.chat-body-request').hide();
	$('.chat-body-start').show();
});

$('.chat-btn-cancel').click(function(){
	console.log('canceling mentor request');
	socket.emit('ninja.cancelRequest');
	$('.chat-body-request').show();
	$('.chat-body-start').hide();
});

});


