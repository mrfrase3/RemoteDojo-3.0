// work in progress
$(function(){

	//var audioCtx = new (window.AudioContext || window.webkitAudioContext)();

	var elem = {local: {}, foreign: {}};

    elem.local.v = $('.dump video.dump-video-local').get(0);
	elem.local.a = $('.dump audio.dump-audio-local').get(0);
    elem.local.c = $('.screen-local-canvas').get(0);
    elem.local.context = elem.local.c.getContext('2d');

	elem.foreign.v = $('.dump video.dump-video-foreign').get(0);
	elem.foreign.a = $('.dump audio.dump-audio-foreign').get(0);
    elem.foreign.c = $('.screen-foreign-canvas').get(0);
    elem.foreign.context = elem.foreign.c.getContext('2d');

    var cw = 1280;
    var ch = 720;
    elem.local.c.width = cw;
    elem.local.c.height = ch;
	elem.foreign.c.width = cw;
    elem.foreign.c.height = ch;

    elem.local.v.addEventListener('play', function(){
        draw(this,elem.local.context,cw,ch);

    },false);
	elem.foreign.v.addEventListener('play', function(){
        draw(this,elem.foreign.context,cw,ch);
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
    audiovis(elem.foreign.v, '.levels-foreign .progress-bar');*/



var audio_vis = function(au, qu){

var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
if(au == null){
  var myAudio = document.querySelector('audio');
} else {
  var myAudio = au;
}
var source;
var stream;

var analyser = audioCtx.createAnalyser();
analyser.minDecibels = -90;
analyser.maxDecibels = -10;
analyser.smoothingTimeConstant = 0.85;

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
        if(c > 0) p = ((t/c)/255)*100;
        $(qu).css('width',p+'%');
        //console.log(p +' '+ qu +' '+c+' '+t+' '+bufferLength);
    };

    drawv();

}
visualize();
}
audio_vis(elem.local.a, '.levels-local .progress-bar');
audio_vis(elem.foreign.a, '.levels-foreign .progress-bar');






});

window.getExternalIceServers = true;
