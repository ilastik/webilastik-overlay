import { mat4, vec3 } from 'gl-matrix'
import { BrushingOverlay } from './brushing_overlay'
import { BrushingWidget } from './brushing_widget'
import { CameraControls } from './controls'
import { createElement } from './utils'

let dummy_viewer = createElement({tagName: "div", parentElement: document.body, inlineCss: {
    width: "400px",
    height: "300px",
    border: "solid 5px purple",
    backgroundColor: "black",
}})

let voxelToWorld = mat4.fromScaling(mat4.create(), vec3.fromValues(1, 1, 1))

let overlay = new BrushingOverlay({
    trackedElement: dummy_viewer,
    voxelToWorld: voxelToWorld,
    pixelsPerVoxel: 10,
})

new BrushingWidget({
    parentElement: document.body,
    overlay
})

const camera_controls = new CameraControls()
const do_update = () => {
    camera_controls.updateCamera(overlay.camera)
    window.requestAnimationFrame(do_update)
}
do_update()
