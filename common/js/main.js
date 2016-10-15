// work in progress
$(function(){

	$(".user-info-panel .panel-heading").dblclick(function(){
		$(".dump").show();
	});

	$("[data-toggle=\"popover\"]").popover();
    $("[data-toggle=\"tooltip\"]").tooltip();

	//var audioCtx = new (window.AudioContext || window.webkitAudioContext)();

	var elem = {local: {}, remote: {}};

    elem.local.v = $('.dump video.dump-local').get(0);
	elem.local.a = $('.dump audio.dump-local').get(0);
    elem.local.c = $('.screen-local-canvas').get(0);
    elem.local.context = elem.local.c.getContext('2d');

	elem.remote.v = $('.dump video.dump-remote').get(0);
	elem.remote.a = $('.dump audio.dump-remote').get(0);
    elem.remote.c = $('.screen-remote-canvas').get(0);
    elem.remote.context = elem.remote.c.getContext('2d');

    var cw = 1280;
    var ch = 720;
    elem.local.c.width = cw;
    elem.local.c.height = ch;
	elem.remote.c.width = cw;
    elem.remote.c.height = ch;

    elem.local.v.addEventListener('play', function(){
        draw(this,elem.local.context,cw,ch);

    },false);
	elem.remote.v.addEventListener('play', function(){
        draw(this,elem.remote.context,cw,ch);
    },false);

	function draw(v,c,w,h) {
	    if(v.paused || v.ended) return false;
	    c.drawImage(v,0,0,w,h);
	    setTimeout(draw,20,v,c,w,h);
	}

	/*function audiovis(v, b){
		var analyser = audioCtx.createAnalyser();

    	source = audioCtx.createMediaElementSource(v);
		source.connect(analyser);
    	analyser.connect(audioCtx.destination);

    	analyser.fftSize = 1024;
		var bufferLength = analyser.frequencyBinCount;
		console.log(bufferLength);
		var dataArray = new Uint8Array(bufferLength);
    	analyser.getByteFrequencyData(dataArray);

    	function drawvis(v,b) {
        	//if(v.paused || v.ended) return false;
        	setTimeout(drawvis,40,v,b);
			analyser.getByteFrequencyData(dataArray);
        	var c = 0, t = 0;
        	for(var i=0; i<bufferLength; i++){
            	if(dataArray[i] > 5){
                	t += dataArray[i];
                	c++;
                }
            }
        	p = 0;
        	if(c > 0) p = ((t/c)/255)*100;
        	$(b).css('width',p+'%');
        	console.log(p +' '+ b +' '+c+' '+t+' '+bufferLength);
        }
    	drawvis(v,b);


    }
	audiovis(elem.local.v, '.levels-local .progress-bar');
    audiovis(elem.remote.v, '.levels-remote .progress-bar');*/



var audio_vis = function(au, qu){

var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
if(!au){
  var myAudio = document.querySelector('audio');
} else {
  var myAudio = au;
}
var source;
var stream;

var analyser = audioCtx.createAnalyser();
//analyser.minDecibels = -90;
//analyser.maxDecibels = -10;
//analyser.smoothingTimeConstant = 0.85;

var drawVisual;

source = audioCtx.createMediaElementSource(myAudio);
source.connect(analyser);
analyser.connect(audioCtx.destination);

function visualize() {

  //if(visualSetting == "sinewave") {
    analyser.fftSize = 512;
    var bufferLength = analyser.fftSize;
    console.log(bufferLength);


    function drawv() {

		setTimeout(drawv,40,au,qu);
		var dataArray = new Uint8Array(bufferLength);
		analyser.getByteTimeDomainData(dataArray);

		var c = 0, t = 0;
		for(var i=0; i<bufferLength; i++){
			if(dataArray[i] > 5){
				t += dataArray[i];
				c++;
			}
        }
        var p = 0;
        if(c > 0) p = ((t/c))*100;
        $(qu).width(p+'%');
        //console.log(p +' '+ qu +' '+c+' '+t+' '+bufferLength);
    };

    drawv();

}
visualize();
}
audio_vis(elem.local.a, '.levels-local .progress-bar');


	if($(".user-info-panel").data("demo-mode")){
    	if($(".user-info-panel").data("expire")){
    		var expire = $(".user-info-panel").data("expire");
    		var expireTimer = function(){
        		var timeleft = Math.floor(( expire - Date.now() ) / 1000);
        		if(timeleft < 0) timeleft = 0;
        		var seconds = timeleft % 60;
            	if(seconds < 10) seconds = "0"+seconds;
        		var minutes = Math.floor(timeleft / 60);
            	if(minutes < 10) minutes = "0"+minutes;
        		$(".button-menu-buttons .expiry-count-down").text(minutes + ":" + seconds);
        		if(timeleft > 0) setTimeout(expireTimer, 1000);
        	}
        	expireTimer();
    		$(".button-menu-buttons .expiry-wrap").show();
        }
    	$(".button-menu-buttons").prepend(
        	"<div class=\"btn btn-danger demo-warning\" data-toggle=\"tooltip\" data-placement=\"top\" title=\"\" data-original-title=\"If a stranger gave you this link, leave now\">"+
        	"! You are currently using the demo version of Remote Dojo !</div>"
        );
    	$(".button-menu-buttons .demo-warning").tooltip();
    }
	$(".button-menu-buttons .chat-open").click(function(){
    	$(".button-menu .chat-list-wrap").toggle();
    });

	fancyLoading();
});

var fancyLoading = function(){
	var w = $(".fancy-loading .loading-block-half").width()
	$(".fancy-loading .loading-block.lb1 .loading-block-divide").animate({width: w+"px"}, 300, function(){
  	$(".fancy-loading .loading-block.lb2 .loading-block-divide").animate({width: w+"px"}, 300, function(){
  		$(".fancy-loading .loading-block.lb3 .loading-block-divide").animate({width: w+"px"}, 300, function(){
  			$(".fancy-loading .loading-block.lb4 .loading-block-divide").animate({width: w+"px"}, 300, function(){
  				$(".fancy-loading .loading-block.lb1 .loading-block-divide").animate({width: "0px"}, 500, function(){
  					$(".fancy-loading .loading-block.lb2 .loading-block-divide").animate({width: "0px"}, 500, function(){
  						$(".fancy-loading .loading-block.lb3 .loading-block-divide").animate({width: "0px"}, 500, function(){
  							$(".fancy-loading .loading-block.lb4 .loading-block-divide").animate({width: "0px"}, 500, function(){
  								fancyLoading();
  							});
  						});
  					});
  				});
  			});
  		});
  	});
  });
};

// generates a html/bootstrap alert to display to the user
var genalert = function(type, havediss, msg, timeout){
	var diss = "'";
	var eid = "alert-" + Math.random().toString(36).substr(2);
	while($("#"+eid).length) eid = "alert-" + Math.random().toString(36).substr(2);
	if(timeout && timeout > 0) setTimeout(function(){$("#"+eid).remove();}, timeout);
	if(havediss) diss = "alert-dismissable'><button type='button' class='close' data-dismiss='alert' aria-hidden='true'>×</button";
	return "<div id='"+eid+"' class='alert alert-"+type+" "+diss+">"+msg+"</div>";
}






