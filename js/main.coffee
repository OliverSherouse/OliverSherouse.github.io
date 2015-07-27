---
---
place_footnotes = () ->
    $("article").each ->
        refs = $(@).find(".footnote")
        notes = $(@).find(".footnotes ol li")
        gutter = $(@).offset().left + $(@).width()
        for note, i in notes
            top = $(refs[i]).parent().offset().top
            $(note).css({top: top, left: gutter})


resize_youtube = () ->
    $("iframe").each ->
        $(@).height($(@).width() * 3 / 4)

toggle_menu = () ->
    $(".fullnav").each ->
        $(@).toggleClass("fullnavtoggle")

pageinit = () ->
    $(window).resize(place_footnotes)
    $(window).resize(resize_youtube)
    $("#smallnav").click(toggle_menu)
    $("img").load(place_footnotes)
    place_footnotes()
    resize_youtube()

$(document).ready pageinit 
