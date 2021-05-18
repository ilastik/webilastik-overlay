// import { BrushingWidget } from '.'
// import { DummyViewer, getDummyViewerDriver } from './drivers/dummy'

import { DummyViewer, getDummyViewerDriver } from "./drivers/dummy";
import { SessionManagerWidget } from "./gui/widgets/session_manager";

const viewer = new DummyViewer()
const viewer_driver = getDummyViewerDriver(viewer)

new SessionManagerWidget({
    parentElement: document.body,
    ilastik_url: new URL("http://localhost:5000"),
    viewer_driver
})
