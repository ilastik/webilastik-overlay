// import { BrushingWidget } from '.'
// import { DummyViewer, getDummyViewerDriver } from './drivers/dummy'

import { DummyViewer, getDummyViewerDriver } from "./drivers/dummy";
import { OverlayControls } from "./gui/widgets/overlay_controls";

const viewer = new DummyViewer()
const viewer_driver = getDummyViewerDriver(viewer)

new OverlayControls({
    parentElement: document.body,
    ilastik_url: new URL("http://localhost:5000"),
    viewer_driver
})
