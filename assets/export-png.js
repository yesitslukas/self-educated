/* ------------------------------------------------------------------
   PNG export.

   This produces the object that reaches strangers, so it has to leave
   the page cleanly, look identical to what was on screen, and fail
   loudly rather than silently doing nothing.
------------------------------------------------------------------ */
import { radarCss } from './radar.js'

const SIZE = 1240

/**
 * @param {SVGElement} svg   the on-screen chart
 * @param {(msg: string, ok: boolean) => void} report  surfaces the outcome to the user
 */
export function downloadChart (svg, report) {
  if (!svg) return report('There is no chart to download.', false)

  const style = getComputedStyle(document.documentElement)
  // getPropertyValue returns the declaration verbatim, leading whitespace
  // included, which is invalid inside a shorthand `font:` value.
  const v = name => style.getPropertyValue(name).trim()

  const clone = svg.cloneNode(true)
  const box = svg.viewBox.baseVal
  const height = Math.round(SIZE * (box.height / box.width))
  clone.setAttribute('width', SIZE)
  clone.setAttribute('height', height)

  // The exporter and the page consume the same stylesheet, so the
  // downloaded image cannot drift from the one the user just looked at.
  clone.insertAdjacentHTML('afterbegin',
    `<style>${radarCss(v)}</style><rect width="100%" height="100%" fill="${v('--bg')}"/>`)

  const url = URL.createObjectURL(new Blob([clone.outerHTML], { type: 'image/svg+xml;charset=utf-8' }))
  const img = new Image()

  const fail = () => {
    URL.revokeObjectURL(url)
    report('The image could not be generated in this browser. A screenshot works just as well.', false)
  }

  img.onerror = fail
  img.onload = () => {
    URL.revokeObjectURL(url)
    try {
      const canvas = document.createElement('canvas')
      canvas.width = SIZE
      canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0)
      canvas.toBlob(png => {
        if (!png) return fail()
        const href = URL.createObjectURL(png)
        const a = Object.assign(document.createElement('a'), { href, download: 'self-educated-profile.png' })
        document.body.appendChild(a)
        a.click()
        a.remove()
        setTimeout(() => URL.revokeObjectURL(href), 10000)
        report('Downloaded.', true)
      }, 'image/png')
    } catch {
      fail()
    }
  }
  img.src = url
}
