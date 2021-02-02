import { mat4, vec3 } from 'gl-matrix'
import { BrushingOverlay } from './brushing_overlay'
import { BrushingWidget } from './brushing_widget'
import { createElement } from './utils'

let dummy_viewer = createElement({tagName: "div", parentElement: document.body, inlineCss: {
    width: "400px",
    height: "300px",
    border: "solid 5px purple",
    backgroundColor: "black",
}})

let voxelToWorld = mat4.fromScaling(mat4.create(), vec3.fromValues(1, 1, 1))

new BrushingWidget({
    parentElement: document.body,
    overlay: new BrushingOverlay({
        trackedElement: dummy_viewer,
        voxelToWorld: voxelToWorld,
        pixelsPerVoxel: 50,
    })
})
