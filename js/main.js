var site = {}
$(function(){
    site.place_footnotes = function(){
        $('article').each(function(){
            var refs = $(this).find('.footnote');
            var notes = $(this).find('.footnotes ol li');
            var gutter = $(this).offset().left + $(this).width();
            for (var i = 0; i < notes.length; i++){
                $(notes[i]).css({
                    top: $(refs[i]).parent().position().top,
                    left: gutter,
                });
            }
        });
    }

    site.toggle_menu = function(){
        $('#fullnav').toggle(400);
    }

    site.place_footnotes();
    $('#navexpand').click(site.toggle_menu);
});
