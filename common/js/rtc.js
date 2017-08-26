var peerconn;
var rtcStreams = {local: {a:null,v:null}, remote:{a:null,v:null}};
var isofferer = false;
var iceservers = [{
	urls: ['turn:numb.viagenie.ca'],
	credential: 'muazkh',
	username: 'webrtc@live.com'
}];
var negotiating; // Chrome workaround

var offerOptions = {
	offerToReceiveAudio: 1,
	offerToReceiveVideo: 1,
	voiceActivityDetection: false
};

class RTCDataEventHandler {
    constructor () {
        this.datachan = null;
        this.events = {};
    	socket.on("rtc.datafallback", (e,a) => this.trigger.call(this,e,a));
    }

	init (datachan) {
    	this.datachan = datachan;
    	this.datachan.onmessage = e => {
        	var msg = JSON.parse(e.data);
        	this.trigger(msg.e, msg.a);
        };
        console.log("datachannel setup init");
		this.datachan.onopen = () => {
        	console.log("datachannel opened");
			this.trigger('connect');
		};
    	this.datachan.onerror = (e) => {
			console.error(e);
		};
		this.datachan.onclose = () => {
        	console.log("datachannel closed");
			this.trigger('disconnect');
			this.datachan = null; // TODO This may be unnecessary.
		};
    }
	
    trigger (event, args=[]) {
        if(!this.events[event] || this.events[event].length < 1) return;
    	let toremove = [];
    	for(let i in this.events[event]){
        	this.events[event][i].cb.apply(this, args);
        	if(this.events[event][i].once) toremove.unshift(i);
        }
    	for(let i in toremove) this.events[event].splice(i, 1);
    }

	on(event, cb){
    	var id = Date.now();
    	if(!this.events[event]) this.events[event] = [];
    	this.events[event].push({cb, id, once: false});
    	return id;
    }

	once(event, cb){
    	var id = Date.now();
    	if(!this.events[event]) this.events[event] = [];
    	this.events[event].push({cb, id, once: true});
    	return id;
    }

	unregister(id){
    	let b = false;
    	for(let i in this.events){
        	for(let j in this.events[i]){
            	if(this.events[i][j].id == id){
                	this.events[i].splice(j, 1);
                	b = true;
                	break;
                }
            }
        	if(b) break;
        }
    }

	emit(){
    	var a = Array.from(arguments);
    	var e = a.shift();
    	if(this.datachan && this.datachan.readyState != "closed") this.datachan.send(JSON.stringify({e, a}));
    	else socket.emit("rtc.datafallback", e, a);
    }
}

var RTC_Data = new RTCDataEventHandler();

var rtcCursorRX;
var rtcCursorRY;
var lastCursorUpdate;
var lastCursorInCanvas;
var cursorUpdateInterval = 33; // TODO find suitable update rate.


var iceCallback = function(event) {
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
    	if(remoteVis) remoteVis.start(e.stream);
		$('.dump audio.dump-remote').get(0).srcObject = e.stream;
	} else if(e.stream.getVideoTracks().length > 0){
		rtcStreams.remote.v = e.stream;
		$('.dump video.dump-remote').get(0).srcObject = e.stream;
	}
	//$('.dump video.dump-remote').get(0).play();
};

var onRemoteTrack = function(e){
	console.log(e);
	let stream = e.streams[0];
	if(rtcStreams.local.a == stream || rtcStreams.local.v == stream) return;
	onRemoteStream({stream});
	/*$('.dump '+e.track.kind+'.dump-remote').get(0).srcObject = e.streams[0];
	rtcStreams.remote.push(e.streams[0]);
	//$('.dump video.dump-remote').get(0).play();*/
};

/*var replaceLocalTracks = function(oldtracks, newtracks){
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
};*/

var onLocalStream = function(stream, type){
	let ats = stream.getAudioTracks();
	let vts = stream.getVideoTracks();
	if(ats.length > 0){
		if(rtcStreams.local.a_sender) peerconn.removeTrack(rtcStreams.local.a_sender);
    	rtcStreams.local.a = stream;
    	rtcStreams.local.a_sender = peerconn.addTrack(ats[0], stream);
    	if(localVis) localVis.start(stream);
		$('.dump audio.dump-local').get(0).srcObject = stream;
	} else if(vts.length > 0){
		if(rtcStreams.local.v_sender) peerconn.removeTrack(rtcStreams.local.v_sender);
		rtcStreams.local.v = stream;
    	rtcStreams.local.v_sender = peerconn.addTrack(vts[0], stream);
		$('.dump video.dump-local').get(0).srcObject = stream;
	} else return;
	//peerconn.addStream(stream);
	$(".screen-local-box").show();
	if(type){
    	$('.workarea .nav-tabs .tab-local-screen, .workarea .nav-tabs .tab-local-webcam').hide();
    	$('.workarea .nav-tabs .tab-local-'+type).show();
    	$('.workarea .nav-tabs .tab-local-'+type+' a').click();
    	RTC_Data.emit('tabs.show', 'remote-'+type);
    }
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

var updateCoords = function(msg) {
	rtcCursorRX = msg.rx;
	rtcCursorRY = msg.ry;

	// If using electron move remoteCursor
	if (typeof remoteCursor !== 'undefined') {
		if (cursorShowing) { // declared in main.js
			remoteCursor.show();
			remoteCursor.setpos(rtcCursorRX*100, rtcCursorRY*100);
		} else {
			remoteCursor.hide();
		}
	}
};

socket.on("rtc.offer", function(desc){
	//desc.sdp = forceChosenAudioCodec(desc.sdp);
	peerconn.setRemoteDescription(desc).then(function() {
		peerconn.createAnswer().then(function(desc2){
			peerconn.setLocalDescription(desc2).then(function() {
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
	peerconn.setRemoteDescription(desc2).then(function() {
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
	if(!live){
		navigator.mediaDevices.getUserMedia({
			audio: true,
			video: false
		}).then(onLocalStream).catch(console.error);
		$(".loading-overlay").hide(200);
		$(".loading-overlay h3").text("Loading...");
	}
	live = true;
});

socket.on("rtc.negotiate", function(){
	if (!live || negotiating) return;
	console.log("negotiating");
	negotiating = true;
	if(isofferer) negotiateRTC();
	else socket.emit("rtc.negotiate");
});

var newTab = (title, id, focus=true, closable=true, remote=false) => {
	if(!remote){
		let i = 1;
		while($('#'+id+'-'+i).length > 0) i++;
    	id = id+'-'+i;
    	title = title + ' ' + i;
    	RTC_Data.emit('tabs.new', title, id, focus, closable, true);
    }
	if(closable) closable = ' <i class="fa fa-times"></i>'
	$('.workarea .nav-tabs .dropdown').before('<li class="tab-'+id+' titlecaps"><a href="#'+id+'" data-toggle="tab">'+title+closable+'</a></li>');
	$('.workarea .tab-content').append('<div class="tab-pane fade" id="'+id+'"></div>');
	if(closable) $('.workarea .nav-tabs .tab-'+id+' .fa-times').click(e => {
    	destroyTab(id);
    });
	if(focus) setTimeout(()=>$('.workarea .nav-tabs .tab-'+id+' a').click(), 100);
	return id;
}

var destroyTab = (id, remote=false) => {
	if($('.workarea .nav-tabs .tab-'+id).hasClass('active')){
    	setTimeout(()=>$('.workarea .nav-tabs .tab-chat a').click(), 100);
    }
	$('.workarea .nav-tabs .tab-'+id).remove();
	$('.workarea .tab-content #'+id).remove();
	if(!remote) RTC_Data.emit('tabs.destroy', id, true);
}

$(function(){

	
	RTC_Data.on('cursor.coords', updateCoords);
	RTC_Data.on('tabs.show', tab => {
		if(tab === "remote-screen" || tab === "remote-webcam") $('.workarea .nav-tabs .tab-remote-screen, .workarea .nav-tabs .tab-remote-webcam').hide();
		$('.workarea .nav-tabs .tab-'+tab).show();
		$('.workarea .nav-tabs .tab-'+tab+' a').click();
	});
	RTC_Data.on('tabs.hide', tab => {
		if($('.workarea .nav-tabs .tab-'+tab).hasClass('active')){
        	$('.workarea .nav-tabs .tab-chat a').click();
        }
		$('.workarea .nav-tabs .tab-'+tab).hide();
	});

	RTC_Data.on('tabs.focus', tab => {
        $('.workarea .nav-tabs .tab-'+tab+' a').click();
	});
	RTC_Data.on('tabs.new', newTab);
	RTC_Data.on('tabs.destroy', destroyTab);

	RTC_Data.on("name.change", name => $(".remote-name").text(name));

	RTC_Data.on("connect", ()=>{
    	RTC_Data.emit("name.change", $(".user-info-panel .info-fullname").text());
    });

	$(".screen-local-start").click(function(){
		getScreenId(function (error, sourceId, screen_constraints) {
			// error	== null || 'permission-denied' || 'not-installed' || 'installed-disabled' || 'not-chrome'
			// sourceId == null || 'string' || 'firefox'

			//if(!navigator.getUserMedia) navigator.getUserMedia = navigator.mozGetUserMedia || navigator.webkitGetUserMedia;
			navigator.mediaDevices.getUserMedia(screen_constraints)
			.then(s => onLocalStream(s, 'screen'))
			.catch(console.error);
		});
	});

	$(".screen-local-stop").click((e)=>{
    	e.preventDefault();
    	if($('.workarea .nav-tabs .tab-local-screen').hasClass('active') || $('.workarea .nav-tabs .tab-local-webcam').hasClass('active')){
        	setTimeout(()=>$('.workarea .nav-tabs .tab-chat a').click(), 100);
        }
    	$('.workarea .nav-tabs .tab-local-screen, .workarea .nav-tabs .tab-local-webcam').hide();
    	RTC_Data.emit('tabs.hide', 'remote-screen');
    	RTC_Data.emit('tabs.hide', 'remote-webcam');
    	stopStream(rtcStreams.local.v, $(".dump video.dump-local").get(0));
    });

	$(".webcam-local-start").click(function(){
		navigator.mediaDevices.getUserMedia({
			audio: false,
			video: true
		}).then(s => onLocalStream(s, 'webcam')).catch(console.error);
	});

	$.get("./common/stun.json", function(data){
		var servers = [];
		try{
			if(data instanceof Array) servers = data;
			else servers = JSON.parse(data);
		} catch(e){
			alert("Cannot get ice server list: not json, contact an admin.");
		}
    	iceservers.push({urls:["stun:"+servers[0]]});
		//for(var i = 0; i < servers.length && i < 1; i++){
		//	iceservers.push({url:"stun:"+servers[i]});
		//}
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
	$(".loading-overlay").hide(200);
	$(".loading-overlay h3").text("Loading...");
	if (!live) return;
	stopStream(rtcStreams.local.a, $(".dump audio.dump-local").get(0));
	stopStream(rtcStreams.local.v, $(".dump video.dump-local").get(0));
	stopStream(rtcStreams.remote.a, $(".dump audio.dump-remote").get(0));
	stopStream(rtcStreams.remote.v, $(".dump video.dump-remote").get(0));
	if(RTC_Data.datachan){
		//RTC_Data.trigger("disconnect");
    	RTC_Data.datachan.close();
    }
	//dataChannel = null;
	rtcStreams = {local: {a:null,v:null}, remote:{a:null,v:null}};
	live = false;
	negotiating = null;
	peerconn.close();
	peerconn = null;
	$('.mentor-list-panel').show();
}

var startRTC = function(offer){
	$(".loading-overlay h3").text("Connecting Call...");
	$(".loading-overlay").show(200);
	var pcConfig = null;
	if(iceservers.length > 0) pcConfig = {iceServers: iceservers};
	var pcConstraints = {
		optional: []
	};
	peerconn = new RTCPeerConnection(pcConfig, pcConstraints);
	peerconn.onicecandidate = iceCallback;
	//peerconn.onaddstream = onRemoteStream;
	peerconn.ontrack = onRemoteTrack;
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
	if(isofferer) {
		
		var dataConstraints = {
			ordered: false, // TODO consider two channels for TCP/UDP
			maxPacketLifeTime: 1000 // milliseconds TODO find a suitable limit, if any at all is required.
		};
		//dataChannel = peerconn.createDataChannel('dataChannel', dataConstraints);
		//setDataChannelListeners();
    	RTC_Data.init(peerconn.createDataChannel('dataChannel', dataConstraints));
    	negotiateRTC();
	} else {
		//peerconn.ondatachannel = onRemoteDataChannel;
    	peerconn.ondatachannel = e => {
        	if(e.channel) RTC_Data.init(e.channel);
        }
	}
}

// Send coordinates of the user's cursor if within the remote canvas element
$(document).mousemove(function(event) {
	if (!RTC_Data.datachan || !rtcStreams.remote.v) return;
	// Send coord update if enough time has passed
	var currTime = Date.now();
	if (lastCursorUpdate &&  currTime - lastCursorUpdate < cursorUpdateInterval) return;
	lastCursorUpdate = currTime;
	// Find ratio of cursor position along canvas
	var c = $('.screen-remote-canvas');
	var pos = c.offset();
	var rx = (event.pageX - pos.left) / c.width();
	var ry = (event.pageY - pos.top) / c.height();
	// Send null coordinates once the cursor leaves the canvas
	if (rx < 0 || rx > 1 || ry < 0 || ry > 1) {
		if (lastCursorInCanvas) {
			lastCursorInCanvas = false;
			rx = null;
			ry = null;
		} else {
			return;
		}
	} else {
		lastCursorInCanvas = true;
	}
	// Create message
	RTC_Data.emit('cursor.coords', {rx,ry});
	//e = JSON.stringify(e);
	//console.log("sending message: " + e);
	//dataChannel.send(e);
});

