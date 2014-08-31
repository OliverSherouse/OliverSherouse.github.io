$(document).ready(pageinit);

function pageinit(){
    footnotes();
}

function footnotes(){
    $("article").each(function(i){
        var refs = $(this).find(".footnote")
        var notes = $(this).find(".footnotes ol li")
        for (var i=0; i < refs.length; i++){
            $(notes[i]).css({top: $(refs[i]).parent().position().top})
        }
    })
}
