class RDEditor {
    constructor (text="", id, dataid) {
    	if(!id){
        	id = newTab('<i class="fa fa-i-cursor"></i> Text Editor', 'rd-editor');
        	dataid = "editor."+id+"-"+Date.now()+".";
        	RTC_Data.emit("editor.new", text, id, dataid);
        }
    	$('#'+id).append('<div class="form-group form-horizontal"><label class="col-md-2 control-label">Language:</label><div class="col-md-4"><select class="form-control"></select></div><div class="col-md-12"><br></div><div class="col-md-12" id="'+id+'-editor"></div>');
    	$('#'+id+'-editor').text(text);
    	this.id = id;
    	this.dataid = dataid;
    	this.buffer_dumped = false;
    	this.last_applied_change = null;
        this.just_cleared_buffer = false;
    	this.mode = "text";
    	this.options = [{value:"abap",name:"ABAP"},{value:"abc",name:"ABC"},{value:"actionscript",name:"ActionScript"},{value:"ada",name:"ADA"},{value:"apache_conf",name:"Apache Conf"},{value:"asciidoc",name:"AsciiDoc"},{value:"assembly_x86",name:"Assembly x86"},{value:"autohotkey",name:"AutoHotKey"},{value:"batchfile",name:"BatchFile"},{value:"bro",name:"Bro"},{value:"c_cpp",name:"C and C++"},{value:"c9search",name:"C9Search"},{value:"cirru",name:"Cirru"},{value:"clojure",name:"Clojure"},{value:"cobol",name:"Cobol"},{value:"coffee",name:"CoffeeScript"},{value:"coldfusion",name:"ColdFusion"},{value:"csharp",name:"C#"},{value:"css",name:"CSS"},{value:"curly",name:"Curly"},{value:"d",name:"D"},{value:"dart",name:"Dart"},{value:"diff",name:"Diff"},{value:"dockerfile",name:"Dockerfile"},{value:"dot",name:"Dot"},{value:"drools",name:"Drools"},{value:"dummy",name:"Dummy"},{value:"dummysyntax",name:"DummySyntax"},{value:"eiffel",name:"Eiffel"},{value:"ejs",name:"EJS"},{value:"elixir",name:"Elixir"},{value:"elm",name:"Elm"},{value:"erlang",name:"Erlang"},{value:"forth",name:"Forth"},{value:"fortran",name:"Fortran"},{value:"ftl",name:"FreeMarker"},{value:"gcode",name:"Gcode"},{value:"gherkin",name:"Gherkin"},{value:"gitignore",name:"Gitignore"},{value:"glsl",name:"Glsl"},{value:"gobstones",name:"Gobstones"},{value:"golang",name:"Go"},{value:"graphqlschema",name:"GraphQLSchema"},{value:"groovy",name:"Groovy"},{value:"haml",name:"HAML"},{value:"handlebars",name:"Handlebars"},{value:"haskell",name:"Haskell"},{value:"haskell_cabal",name:"Haskell Cabal"},{value:"haxe",name:"haXe"},{value:"hjson",name:"Hjson"},{value:"html",name:"HTML"},{value:"html_elixir",name:"HTML (Elixir)"},{value:"html_ruby",name:"HTML (Ruby)"},{value:"ini",name:"INI"},{value:"io",name:"Io"},{value:"jack",name:"Jack"},{value:"jade",name:"Jade"},{value:"java",name:"Java"},{value:"javascript",name:"JavaScript"},{value:"json",name:"JSON"},{value:"jsoniq",name:"JSONiq"},{value:"jsp",name:"JSP"},{value:"jsx",name:"JSX"},{value:"julia",name:"Julia"},{value:"kotlin",name:"Kotlin"},{value:"latex",name:"LaTeX"},{value:"less",name:"LESS"},{value:"liquid",name:"Liquid"},{value:"lisp",name:"Lisp"},{value:"livescript",name:"LiveScript"},{value:"logiql",name:"LogiQL"},{value:"lsl",name:"LSL"},{value:"lua",name:"Lua"},{value:"luapage",name:"LuaPage"},{value:"lucene",name:"Lucene"},{value:"makefile",name:"Makefile"},{value:"markdown",name:"Markdown"},{value:"mask",name:"Mask"},{value:"matlab",name:"MATLAB"},{value:"maze",name:"Maze"},{value:"mel",name:"MEL"},{value:"mushcode",name:"MUSHCode"},{value:"mysql",name:"MySQL"},{value:"nix",name:"Nix"},{value:"nsis",name:"NSIS"},{value:"objectivec",name:"Objective-C"},{value:"ocaml",name:"OCaml"},{value:"pascal",name:"Pascal"},{value:"perl",name:"Perl"},{value:"pgsql",name:"pgSQL"},{value:"php",name:"PHP"},{value:"pig",name:"Pig"},{value:"powershell",name:"Powershell"},{value:"praat",name:"Praat"},{value:"prolog",name:"Prolog"},{value:"properties",name:"Properties"},{value:"protobuf",name:"Protobuf"},{value:"python",name:"Python"},{value:"r",name:"R"},{value:"razor",name:"Razor"},{value:"rdoc",name:"RDoc"},{value:"rhtml",name:"RHTML"},{value:"rst",name:"RST"},{value:"ruby",name:"Ruby"},{value:"rust",name:"Rust"},{value:"sass",name:"SASS"},{value:"scad",name:"SCAD"},{value:"scala",name:"Scala"},{value:"scheme",name:"Scheme"},{value:"scss",name:"SCSS"},{value:"sh",name:"SH"},{value:"sjs",name:"SJS"},{value:"smarty",name:"Smarty"},{value:"snippets",name:"snippets"},{value:"soy_template",name:"Soy Template"},{value:"space",name:"Space"},{value:"sql",name:"SQL"},{value:"sqlserver",name:"SQLServer"},{value:"stylus",name:"Stylus"},{value:"svg",name:"SVG"},{value:"swift",name:"Swift"},{value:"tcl",name:"Tcl"},{value:"tex",name:"Tex"},{value:"text",name:"Text"},{value:"textile",name:"Textile"},{value:"toml",name:"Toml"},{value:"tsx",name:"TSX"},{value:"twig",name:"Twig"},{value:"typescript",name:"Typescript"},{value:"vala",name:"Vala"},{value:"vbscript",name:"VBScript"},{value:"velocity",name:"Velocity"},{value:"verilog",name:"Verilog"},{value:"vhdl",name:"VHDL"},{value:"wollok",name:"Wollok"},{value:"xml",name:"XML"},{value:"xquery",name:"XQuery"},{value:"yaml",name:"YAML"},{value:"django",name:"Django"}];
    	this.options.sort((a, b) =>{
  			let nameA = a.name.toUpperCase(); // ignore upper and lowercase
  			let nameB = b.name.toUpperCase(); // ignore upper and lowercase
  			if (nameA < nameB) return -1;
 			if (nameA > nameB) return 1;
  			return 0;
		});
    	let options = '';
    	for(let i in this.options) options += '<option value="'+this.options[i].value+'">'+this.options[i].name+'</option>';
    	$('#'+id+' select').html(options);
    	$('#'+id+' select').val('text');
    	$('#'+id+' select').change(e=>{
        	if(this.mode === $('#'+id+' select').val()) return;
        	this.mode = $('#'+id+' select').val()
        	this.editor.getSession().setMode("ace/mode/"+this.mode);
        	RTC_Data.emit(dataid+"mode", this.mode);
        });
    
    	this.editor = ace.edit(id+'-editor');
    	this.editor.setTheme( "ace/theme/monokai");
    	this.editor.getSession().setMode("ace/mode/text");
        this.editor.$blockScrolling = Infinity;
    
    	this.editor.on( "change", delta => {
			if(this.last_applied_change != delta && !this.just_cleared_buffer ) {
				RTC_Data.emit(dataid+"change", delta);
			}
			this.just_cleared_buffer = false ;
		}, false );
    
    	RTC_Data.on(dataid+"change", delta =>{
        	this.last_applied_change = delta ;
        	this.editor.getSession().getDocument().applyDeltas([delta]);
        });
    
    	RTC_Data.on(dataid+"mode", mode =>{
        	this.mode = mode;
        	$('#'+id+' select').val(this.mode);
        	this.editor.getSession().setMode("ace/mode/"+this.mode);
        });
    
    	RTC_Data.on("disconnect", ()=>{
        	destroyTab(id, true);
        });
    
    	if($(".user-info-panel").data("type") == "mentor"){
        	$('.workarea .nav-tabs .tab-'+id).dblclick(dblfocus);
        }
    }
}







$(()=>{

	RTC_Data.on("editor.new", (text, id, dataid) => new RDEditor(text, id, dataid));

	$(".new-editor").click(e => new RDEditor());

});