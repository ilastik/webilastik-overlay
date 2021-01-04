import { BrushingOverlay, BrushingWidget } from './brushing_overlay'
import { createElement } from './utils'

let dummy_viewer = createElement({tagName: "div", parentElement: document.body, inlineCss: {
    width: "400px",
    height: "300px",
    border: "solid 5px purple",
}})

new BrushingWidget({
    container: document.body,
    overlay: new BrushingOverlay({
        trackedElement: dummy_viewer
    })
})
