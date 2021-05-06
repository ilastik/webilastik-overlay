import { BrushingWidget } from '.'
import { DummyViewer, getDummyViewerDriver } from './drivers/dummy'

const viewer = new DummyViewer()
const viewer_driver = getDummyViewerDriver(viewer)

new BrushingWidget({
    parentElement: document.body,
    viewer_driver: viewer_driver,
})
