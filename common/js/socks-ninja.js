$(function() {

	var callingTimeout = function(totaltime, lapse, waited){
    	if(!$('.chat-body-start').data("calling")) return;
    	if(waited < totaltime){
        	$(".chat-body-start .progress-bar").width(((waited/totaltime)*100) + "%");
        	setTimeout(callingTimeout, lapse, totaltime, lapse, waited + lapse);
        } else {
        	$('.chat-btn-cancel').click();
        }
    }

	$('.chat-btn-start').click(function(){ // add even to the 'request a mentor' button
		console.log('sending mentor request');
		socket.emit('ninja.requestMentor');
		$('.chat-body-request').hide();
		$('.chat-body-start').show();
    	$('.chat-body-start').data("calling", true);
    	callingTimeout(120000, 200, 0);
	});

	$('.chat-btn-cancel').click(function(){ // add even to the 'leave' button
		console.log('canceling mentor request');
		socket.emit('ninja.cancelRequest');
		$('.chat-body-request').show();
		$('.chat-body-start').hide();
    	$('.chat-body-start').data("calling", false);
	});

});
