import { HtmlImgDriver, OverlayControls } from "..";

(function inject_img_overlay(){
    document.addEventListener("dblclick", (ev: MouseEvent) => {
        const clicked_element = ev.target as HTMLElement
        if(clicked_element.tagName != "IMG"){
            return
        }
        let controls = new OverlayControls({
            parentElement: document.body,
            viewer_driver: new HtmlImgDriver({img: clicked_element as HTMLImageElement}),
            ilastik_url: new URL("http://localhost:5000"),
            css: new URL("http://localhost:9123/css/main.css"),
        })
        controls.element.style.zIndex = "999"
    })
})()
