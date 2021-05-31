import { NeuroglancerDriver, OverlayControls } from "..";

//You can bundle the entire project using this as the main script. Then, inject it
//onto a page with neuroglancer (via a bookmarklet, for example) to have a working
//overlay

(function start_ilastik(){
    let viewer : any = (<any>window)["viewer"];

    const overlay_controls = new OverlayControls({
        parentElement: document.body,
        viewer_driver: new NeuroglancerDriver(viewer),
        ilastik_url: new URL("http://localhost:5000"),
        css: new URL("http://localhost:9123/css/main.css")
    })
    overlay_controls.element.style.zIndex = "999"
})()
