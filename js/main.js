/* global anchors */
/*
 * Footnotes
 */
const footnotes = {}
footnotes.place = function () {
  const firstHeader = document.querySelector('article>div.content>p')
  const gutter = firstHeader.offsetWidth
  const footnotes = document.querySelectorAll('.footnotes>ol>li')
  for (const note of footnotes) {
    const article = note.closest('article')
    const superscript = article.querySelector(
      note
        .querySelector('.reversefootnote')
        .getAttribute('href')
        .replace('fnref:', 'fnref\\:')
    )
    note.style.top = `${superscript.offsetTop}px`
    note.style.left = `${gutter}px`
  }
}

footnotes.init = function () {
  const imgs = document.querySelectorAll('img')
  const iframes = document.querySelectorAll('iframe')
  for (const img of imgs) { img.addEventListener('load', footnotes.place) }
  for (const iframe of iframes) { iframe.addEventListener('load', footnotes.place) }
  window.addEventListener('resize', footnotes.place)
  footnotes.place()
}

async function addBulmaImages () {
  const articles = document.getElementsByTagName('article')
  for (const article of articles) {
    const imgs = article.getElementsByTagName('img')
    for (const img of imgs) {
      const figure = document.createElement('figure')
      figure.appendChild(img.cloneNode(true))
      const parent = img.parentElement
      figure.classList.add('image')
      if (parent.tagName === 'P') {
        parent.replaceWith(figure)
      } else {
        img.replaceWith(figure)
      }
    }

    const iframes = article.getElementsByTagName('iframe')
    for (const iframe of iframes) {
      const figure = document.createElement('figure')
      const iframeClone = iframe.cloneNode(true)
      iframeClone.classList.add('has-ratio')
      figure.appendChild(iframeClone)
      const parent = iframe.parentElement
      figure.classList.add('image')
      figure.classList.add('is-16by9')
      if (parent.tagName === 'P') {
        parent.replaceWith(figure)
      } else {
        iframe.replaceWith(figure)
      }
    }
  }
}

/*
 * Main Init
 */
async function mainInit () {
  footnotes.init()
  document.querySelector('.navbar-burger').addEventListener('click', () => document.querySelector('.navbar-menu').classList.toggle('is-active'))
  addBulmaImages()
  anchors.options = {
    placement: 'left'
  }
  anchors.add('.prose h2,h3,h4,h5,h6')
}

document.addEventListener('DOMContentLoaded', mainInit)
