import { mat4, quat, vec3 } from 'gl-matrix'
import { BrushingWidget } from './brushing_widget'
import { FirstPersonCamera } from './controls'
import { createElement } from './utils'
import { IViewerDriver } from './viewer_driver'

class DummyViewer{
    camera: FirstPersonCamera
    element: HTMLElement
    voxel_to_world: mat4
    zoom_in_pixels_per_voxel: number = 10
    constructor(){
        this.camera = new FirstPersonCamera({
            left: -1, right: 1, near: 0, far: 1, bottom: -1, top:  1
        })
        this.element = createElement({tagName: "div", parentElement: document.body, inlineCss: {
            width: "400px",
            height: "300px",
            border: "solid 5px purple",
            backgroundColor: "black",
        }})
        this.voxel_to_world = mat4.fromScaling(mat4.create(), vec3.fromValues(1, 1, 1))
    }
}

const viewer = new DummyViewer();
const dummy_viewer_driver : IViewerDriver = {
    getCameraPositionInVoxelSpace: () => {
        return vec3.transformMat4(vec3.create(), viewer.camera.position_w, viewer.voxel_to_world)
    },
    getCameraOrientation: () => viewer.camera.orientation,
    getVoxelToWorldMatrix: () => viewer.voxel_to_world,
    getZoomInPixelsPerVoxel: () => viewer.zoom_in_pixels_per_voxel,
    snapCameraTo: (voxel_position: vec3, orientation: quat) => {
        let position_w = vec3.transformMat4(vec3.create(), voxel_position, viewer.voxel_to_world)
        viewer.camera.snapTo(position_w, orientation)
    }
}


new BrushingWidget({
    parentElement: document.body,
    tracked_element: viewer.element,
    viewer_driver: dummy_viewer_driver,
})
