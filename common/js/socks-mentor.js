//load the template to render ninja help requests with
var request_source   = $(".req-list-item-template").html();
var request_template = Handlebars.compile(request_source);

joinDelay = 1000; //delay for joining the RTC room

socket.on('mentor.requestMentor', function(data){ // when a ninja has requested for a mentor
	console.log('recieved mentor request. ' + JSON.stringify(data));
	if (!chats){ // dont show or hide anything if in the middle of a chat session already
		$('.chat-body-request').hide();
		$('.chat-body-start').show();
    }
	data.cleanstok = JSON.stringify(data.sessiontoken).replace(/\W/g, ''); //make sure the username is classname friendly
	$('.req-list').append(request_template(data));
	$('#req-btn-'+data.cleanstok).click(function(){ //add click event to the 'Answer' button
    	socket.emit('mentor.acceptRequest', data.sessiontoken);
    });
	$('#req-ignore-btn-'+data.cleanstok).click(function(){ //add click event to the 'Answer' button
    	$('#req-'+data.cleanstok).remove();
    	request_checkEmpty();
    });
});

// Helper function, that really shouldn't exist
var request_checkEmpty = function(){
	if($('.req-list-item').length < 1){ //make sure there are no other requests active
    	if (!chats){
    		$('.chat-body-request').show();
			$('.chat-body-start').hide();
        }
    }
}

socket.on('mentor.cancelRequest', function(stok){ // when a ninja cancels a request 
	console.log('#req-' + JSON.stringify(stok).replace(/\W/g, ''));
	$('#req-' + JSON.stringify(stok).replace(/\W/g, '')).remove();
	request_checkEmpty();
});




