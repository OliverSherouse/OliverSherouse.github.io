var site = {}
$(function() {
    site.place_footnotes = function() {
        $('article').each(function() {
            var refs = $(this).find('.footnote');
            var notes = $(this).find('.footnotes ol li');
            var gutter = $(this).offset().left + $(this).width();
            for (var i = 0; i < notes.length; i++) {
                $(notes[i]).css({
                    top: $(refs[i]).parent().position()
                        .top,
                    left: gutter,
                });
            }
        });
    }

    site.resize_videos = function() {
        site.allVideos.each(function() {
            var el = $(this);
            var newWidth = el.parent().width();
            el
                .width(newWidth)
                .height(newWidth * el.data('aspectRatio'));
        });
    }

    site.toggle_menu = function() {
        $('#fullnav').toggle(400);
    }

    site.allVideos = $("iframe[src^='https://www.youtube.com']");
    site.allVideos.each(function() {
        $(this)
            .data('aspectRatio', this.height / this.width)
            .removeAttr('height')
            .removeAttr('width');
    });
    site.resize_videos();
    site.place_footnotes();
    $('#navexpand').click(site.toggle_menu);
});

anchors.options = {
    placement: 'left',
};
anchors.add('.prose h2,h3,h4,h5,h6');
