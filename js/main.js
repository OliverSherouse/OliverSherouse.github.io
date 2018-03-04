/*
 * Footnotes
 */
let footnotes = {};
footnotes.place = function() {
    const first_header = $('article>header').first()
    const gutter = first_header.position().left + first_header.width()

    $('.footnotes>ol>li').each(function() {
        const note = $(this);
        const superscript = note.closest('article').find(
            note
            .find('a.reversefootnote')
            .attr('href')
            .replace('fnref:', 'fnref\\:')
        );
        note.css({
            top: superscript.position().top,
            left: gutter,
        });
    });
};

footnotes.init = function() {
    $(window).resize(footnotes.place);
    footnotes.place();
};

/* 
 * Responsive YouTube Videos 
 */
let yt_resizer = {};
yt_resizer.get_videos = function() {
    return $("iframe[src^='https://www.youtube.com']");
};

yt_resizer.resize = function() {
    yt_resizer.get_videos().each(function() {
        const el = $(this);
        const newWidth = el.prev().width();
        el.width(newWidth).height(newWidth * el.data('aspectRatio'));
    });
};

yt_resizer.init = function() {
    yt_resizer.get_videos().each(function() {
        $(this)
            .data('aspectRatio', this.height / this.width)
            .removeAttr('height')
            .removeAttr('width');
    });
    $(window).resize(yt_resizer.resize);
    yt_resizer.resize();
};

/*
 * Main Init
 */
$(function() {
    yt_resizer.init();
    footnotes.init();
    $('.navbar-burger').click(function() {
        $(".navbar-menu").toggleClass("is-active")
    });
    anchors.options = {
        placement: 'left',
    };
    anchors.add('.prose h2,h3,h4,h5,h6');
});
