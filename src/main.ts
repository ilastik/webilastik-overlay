import { vec3 } from 'gl-matrix'
import { BrushingOverlay, BrushingWidget } from './brushing_overlay'
import { VoxelShape } from './brush_stroke'
import { createElement } from './utils'

let dummy_viewer = createElement({tagName: "div", parentElement: document.body, inlineCss: {
    width: "400px",
    height: "300px",
    border: "solid 5px purple",
}})

new BrushingWidget({
    container: document.body,
    overlay: new BrushingOverlay({
        trackedElement: dummy_viewer,
        voxelShape: new VoxelShape({proportions: vec3.fromValues(1,1,1)}),
        pixelsPerVoxel: 50,
    })
})
