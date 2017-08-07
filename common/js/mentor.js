$(()=>{
	
	var dblfocus = function(){
    	let tabs = $(this).get(0).className.match(/tab-\S*/g);
    	if(tabs.length < 1) return;
    	let tab = tabs[0];
    	if(tab.indexOf('remote') !== -1) tab = tab.replace(/remote/g, 'local');
    	else if(tab.indexOf('local') !== -1) tab = tab.replace(/local/g, 'remote');
    	tab = tab.replace(/tab-/, '');
    	RTCData.emit('tabs.focus', tab);
    };

	$('.workarea .nav-tabs li').dblclick(dblfocus);

	RTCData.on('tabs.new', (title, id)=>{
    	$('.workarea .nav-tabs .tab-'+id).dblclick(dblfocus);
    });

});
