// import { BrushingWidget } from '.'
// import { DummyViewer, getDummyViewerDriver } from './drivers/dummy'

import { IlastikLauncherWidget } from "./gui/reference_pixel_classification_workflow";

// const viewer = new DummyViewer()
// const viewer_driver = getDummyViewerDriver(viewer)



// new BrushingWidget({
//     parentElement: document.body,
//     viewer_driver: viewer_driver,
// })

new IlastikLauncherWidget({
    parentElement: document.body,
    ilastik_url: new URL("http://localhost:5000")
})
