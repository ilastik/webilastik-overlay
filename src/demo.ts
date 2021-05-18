// import { BrushingWidget } from '.'
// import { DummyViewer, getDummyViewerDriver } from './drivers/dummy'

import { DummyViewer, getDummyViewerDriver } from "./drivers/dummy";
import { IlastikLauncherWidget } from "./gui/reference_pixel_classification_workflow";

const viewer = new DummyViewer()
const viewer_driver = getDummyViewerDriver(viewer)

new IlastikLauncherWidget({
    parentElement: document.body,
    ilastik_url: new URL("http://localhost:5000"),
    viewer_driver
})
