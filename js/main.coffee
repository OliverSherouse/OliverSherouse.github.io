---
---
footnotes = 
    place_footnotes: () ->
        $("article").each ->
            refs = $(@).find(".footnote")
            notes = $(@).find(".footnotes ol li")
            for note, i in notes
                $(note).css {top: $(refs[i]).parent().position().top} 

pageinit = () ->
    footnotes.place_footnotes()
    $(window).resize footnotes.place_footnotes 

$(document).ready pageinit 
