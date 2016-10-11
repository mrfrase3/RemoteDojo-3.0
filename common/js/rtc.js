var peerconn;
var rtcStreams = {local: {a:null,v:null}, remote:{a:null,v:null}};
var isofferer = false;
var iceservers = [{
    url: 'turn:turn.anyfirewall.com:443?transport=tcp',
    credential: 'webrtc',
    username: 'webrtc'
}];
var negotiating; // Chrome workaround

var offerOptions = {
	offerToReceiveAudio: 1,
	offerToReceiveVideo: 1,
	voiceActivityDetection: false
};

var iceCallback = function(event) {
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
	if(e.stream.getAudioTracks().length > 0){
		rtcStreams.remote.a = e.stream;
		$('.dump audio.dump-remote').get(0).srcObject = e.stream;
	} else if(e.stream.getVideoTracks().length > 0){
		rtcStreams.remote.v = e.stream;
		$('.dump video.dump-remote').get(0).srcObject = e.stream;
	}
	//$('.dump video.dump-remote').get(0).play();
};

var onRemoteTrack = function(e){
	console.log(e);
	$('.dump '+e.track.kind+'.dump-remote').get(0).srcObject = e.streams[0];
	rtcStreams.remote.push(e.streams[0]);
	//$('.dump video.dump-remote').get(0).play();
};

var replaceLocalTracks = function(oldtracks, newtracks){
	if(newtracks.length > 0){
		for(var i = 0; i < oldtracks.length; i++){
			rtcStreams.local.removeTrack(oldtracks[i]);
			oldtracks[i].stop();
		}
		for(var i = 0; i < newtracks.length; i++){
			rtcStreams.local.addTrack(newtracks[i]);
		}
	}
};

var onLocalTrack = function(type){
	return function(stream){
		console.log(stream);
		if(!rtcStreams.local) rtcStreams.local = stream;
		else {
			replaceLocalTracks(rtcStreams.local.getAudioTracks(), stream.getAudioTracks());
			replaceLocalTracks(rtcStreams.local.getVideoTracks(), stream.getVideoTracks());
		}
		$(".dump "+type+".dump-local").get(0).srcObject = stream;
		//$(".dump video.dump-local").get(0).play();
		$(".screen-local-box").show();
	}
};

var onLocalStream = function(stream){
	if(stream.getAudioTracks().length > 0){
		if(rtcStreams.local.a) peerconn.removeStream(rtcStreams.local.a);
		rtcStreams.local.a = stream;
		$('.dump audio.dump-local').get(0).srcObject = stream;
	} else if(stream.getVideoTracks().length > 0){
		if(rtcStreams.local.v) peerconn.removeStream(rtcStreams.local.v);
		rtcStreams.local.v = stream;
		$('.dump video.dump-local').get(0).srcObject = stream;
	} else return;
	peerconn.addStream(stream);
	$(".screen-local-box").show();
};

var negotiateRTC = function(){
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

socket.on("rtc.offer", function(desc){
	//desc.sdp = forceChosenAudioCodec(desc.sdp);
	peerconn.setRemoteDescription(desc).then( function() {
		peerconn.createAnswer().then(function(desc2){
			peerconn.setLocalDescription(desc2).then( function() {
				//desc2.sdp = forceChosenAudioCodec(desc2.sdp);
				socket.emit("rtc.answer", desc2);
			}, function(e){
                console.error(e);
				alert("Could not set local desc, contact an admin.o");
				socket.emit("general.stopChat");
			});
		}, function(e){
            console.error(e);
			alert("Could not create an answer, contact an admin");
			socket.emit("general.stopChat");
		});
	}, function(e){
        console.error(e);
		alert("Could not set the remote description, contact an admin.o");
		socket.emit("general.stopChat");
	});
});

socket.on("rtc.answer", function(desc2){
	peerconn.setRemoteDescription(desc2).then( function() {
		socket.emit("rtc.connected");
	}, function(e){
        console.error(e);
		alert("Could not set the remote description, contact an admin.");
		socket.emit("general.stopChat");
	});
});

socket.on("rtc.connected", function(){
	if(negotiating) negotiating = false;
	console.log("RTC Signaling Completed!");
    if(!live) setTimeout( function(){
        navigator.mediaDevices.getUserMedia({
            audio: true,
    		video: false
    	}).then(onLocalStream).catch(console.error);
    }, 2000);
    live = true;
});

socket.on("rtc.negotiate", function(){
	if (!live || negotiating) return;
	console.log("negotiating");
	negotiating = true;
    if(isofferer) negotiateRTC();
    else socket.emit("rtc.negotiate");
});

$(function(){
	$(".screen-local-start").click(function(){
		getScreenId(function (error, sourceId, screen_constraints) {
			// error    == null || 'permission-denied' || 'not-installed' || 'installed-disabled' || 'not-chrome'
			// sourceId == null || 'string' || 'firefox'

			//if(!navigator.getUserMedia) navigator.getUserMedia = navigator.mozGetUserMedia || navigator.webkitGetUserMedia;
			navigator.mediaDevices.getUserMedia(screen_constraints)
			.then(onLocalStream)
			.catch(console.error);
		});
	});

	$(".webcam-local-start").click(function(){
		navigator.mediaDevices.getUserMedia({
			audio: false,
			video: true
		}).then(onLocalStream).catch(console.error);
	});

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

var stopStream = function(stream, element){
	if(stream){
		stream.getTracks().forEach(function(track) {
			track.stop();
		});
        if(element && element.srcObject) element.srcObject = null;
	}
};

//Helper Function for when the chat needs to stop
var stopRTC = function(){
	if (!live) return;
	stopStream(rtcStreams.local.a, $(".dump audio.dump-local").get(0));
	stopStream(rtcStreams.local.v, $(".dump video.dump-local").get(0));
	stopStream(rtcStreams.remote.a, $(".dump audio.dump-remote").get(0));
	stopStream(rtcStreams.remote.v, $(".dump video.dump-remote").get(0));
	rtcStreams = {local: {a:null,v:null}, remote:{a:null,v:null}};
	live = false;
	negotiating = null;
	peerconn.close();
	peerconn = null;
}

var startRTC = function(offer){
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
	};
	peerconn.onnegotiationneeded = function(){
		if (!live || negotiating) return;
		console.log("negotiating");
		negotiating = true;
        if(isofferer) negotiateRTC();
        else socket.emit("rtc.negotiate");
	};
    isofferer = offer;
    if(isofferer) negotiateRTC();
}
