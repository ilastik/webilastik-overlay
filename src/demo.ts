import { HtmlImgDriver, OverlayControls } from ".";
import { createElement } from "./util/misc"

const img = createElement({tagName: "img", parentElement: document.body}) as HTMLImageElement
img.src = "/images/c_cells_1.png"

const viewer_driver = new HtmlImgDriver({img});

let controls = new OverlayControls({
    parentElement: document.body,
    ilastik_url: new URL("http://localhost:5000"),
    viewer_driver
})

controls.element.style.zIndex = "999"
