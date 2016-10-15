//load the template to render ninja help requests with
var request_source   = $(".req-list-item-template").html();
var request_template = Handlebars.compile(request_source);

joinDelay = 1000; //delay for joining the RTC room

socket.on('mentor.requestMentor', function(data){ // when a ninja has requested for a mentor
	console.log('recieved mentor request. ' + JSON.stringify(data));
	/* TODO queue now visible during chat
	if (!chats){ // dont show or hide anything if in the middle of a chat session already
    }
    */
	$('.chat-body-request').hide();
	$('.chat-body-start').show();
	data.cleanstok = JSON.stringify(data.sessiontoken).replace(/\W/g, ''); //make sure the username is classname friendly
	$('.req-list').append(request_template(data));
	$('#req-btn-'+data.cleanstok).click(function(){ //add click event to the 'Answer' button
		// Only answer a request if not currently in chat
		if (!chats) socket.emit('mentor.acceptRequest', data.sessiontoken);
    });
    var answerbtn = $('#req-btn-'+data.cleanstok);
    if (chats) answerbtn.addClass("disabled");
	$('#req-ignore-btn-'+data.cleanstok).click(function(){ //add click event to the 'Answer' button
    	$('#req-'+data.cleanstok).remove();
    	request_checkEmpty();
    });
});

// Helper function, that really shouldn't exist
var request_checkEmpty = function(){
	if($('.req-list-item').length < 1){ //make sure there are no other requests active
    	/* TODO queue now visible during chat
		if (!chats){ // dont show or hide anything if in the middle of a chat session already
	    }
	    */
    	$('.chat-body-request').show();
		$('.chat-body-start').hide();
    }
}

socket.on('mentor.cancelRequest', function(stok){ // when a ninja cancels a request 
	console.log('#req-' + JSON.stringify(stok).replace(/\W/g, ''));
	$('#req-' + JSON.stringify(stok).replace(/\W/g, '')).remove();
	request_checkEmpty();
});




